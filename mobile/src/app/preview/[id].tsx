import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  getJob,
  getStickerSet,
  regenerateJob,
  saveStickerSet,
} from '@/api/client';
import { assertPublishablePack } from '@/api/contracts';
import { retrySafeMutation, safeErrorMessage } from '@/api/errors';
import { StickerGrid } from '@/components/sticker-grid';
import { Button, Card, Pill, Screen, StateView } from '@/components/ui';
import { IS_DEMO } from '@/config/env';
import { shareSticker } from '@/features/share';
import { useIdempotencyKey } from '@/features/use-idempotency-key';
import { useI18n } from '@/i18n';
import { useActiveJob } from '@/providers/active-job';
import { colors, spacing } from '@/theme/tokens';

export default function PreviewScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { setActiveJobId } = useActiveJob();
  const [selection, setSelection] = useState<{ setId: string; ids: Set<string> }>();
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string>();
  const saveIntent = useIdempotencyKey();
  const regenerateIntent = useIdempotencyKey();

  const job = useQuery({ queryKey: ['job', id], queryFn: () => getJob(id), enabled: Boolean(id) });
  const set = useQuery({
    queryKey: ['set', job.data?.setId],
    queryFn: async () => {
      const result = await getStickerSet(job.data!.setId!);
      assertPublishablePack(result.stickers);
      return result;
    },
    enabled: job.data?.status === 'succeeded' && Boolean(job.data.setId),
  });

  const save = useMutation({
    mutationFn: () => {
      const stickerIds = [...selected].sort();
      const fingerprint = `save:${set.data!.id}:${stickerIds.join(',')}`;
      return saveStickerSet(set.data!.id, stickerIds, saveIntent.keyFor(fingerprint));
    },
    retry: retrySafeMutation,
    onSuccess: async (pack) => {
      await setActiveJobId(null);
      await queryClient.invalidateQueries({ queryKey: ['packs'] });
      router.replace({ pathname: '/packs/[id]', params: { id: pack.id } });
    },
  });
  const regenerate = useMutation({
    mutationFn: () => regenerateJob(id, regenerateIntent.keyFor(`regenerate:${id}`)),
    retry: retrySafeMutation,
    onSuccess: async (next) => {
      await setActiveJobId(next.id);
      router.replace({ pathname: '/jobs/[id]', params: { id: next.id } });
    },
  });

  const sortedStickers = useMemo(
    () => set.data?.stickers.toSorted((a, b) => a.ordinal - b.ordinal) ?? [],
    [set.data],
  );
  const selected =
    selection && selection.setId === set.data?.id
      ? selection.ids
      : new Set(set.data?.stickers.map((sticker) => sticker.id) ?? []);
  const selectedCount = selected.size;

  const toggle = (stickerId: string) => {
    saveIntent.invalidate();
    save.reset();
    setSelection((currentSelection) => {
      const current =
        currentSelection && currentSelection.setId === set.data?.id
          ? currentSelection.ids
          : new Set(set.data?.stickers.map((sticker) => sticker.id) ?? []);
      const next = new Set(current);
      if (next.has(stickerId)) next.delete(stickerId);
      else next.add(stickerId);
      return { setId: set.data!.id, ids: next };
    });
  };

  const replaceSelection = (ids: Set<string>) => {
    saveIntent.invalidate();
    save.reset();
    setSelection({ setId: set.data!.id, ids });
  };

  const share = async (stickerId: string) => {
    setSharingId(stickerId);
    setShareError(undefined);
    try {
      await shareSticker(stickerId);
    } catch (error) {
      setShareError(safeErrorMessage(error));
    } finally {
      setSharingId(null);
    }
  };

  const confirmRegenerate = () => {
    Alert.alert(
      t('preview.confirmRegenerateTitle'),
      t('preview.confirmRegenerateBody'),
      [
        { text: t('preview.stay'), style: 'cancel' },
        { text: t('preview.regenerate'), onPress: () => regenerate.mutate() },
      ],
    );
  };

  if (job.isLoading || set.isLoading) {
    return (
      <Screen scroll={false}>
        <StateView body={t('preview.loadingBody')} icon="images-outline" loading title={t('preview.loadingTitle')} />
      </Screen>
    );
  }
  const error = job.error ?? set.error;
  if (error || !set.data) {
    return (
      <Screen scroll={false}>
        <StateView
          action={<Button label={t('preview.retryLoad')} onPress={() => void Promise.all([job.refetch(), set.refetch()])} />}
          body={error ? safeErrorMessage(error) : t('preview.errorBody')}
          icon="alert-circle-outline"
          title={t('preview.errorTitle')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.heading}>
        <Pill tone="green">
          {IS_DEMO
            ? t('preview.pillDemo', { count: sortedStickers.length })
            : t('preview.pillReal', { count: sortedStickers.length })}
        </Pill>
        <Text style={styles.title}>{t('preview.title')}</Text>
        <Text style={styles.body}>{t('preview.body')}</Text>
      </View>

      <Card style={styles.selectionCard}>
        <View>
          <Text style={styles.selectionNumber}>{selectedCount}/{sortedStickers.length}</Text>
          <Text style={styles.selectionLabel}>{t('preview.selectedLabel')}</Text>
        </View>
        <Button
          disabled={save.isPending}
          full={false}
          label={selectedCount === sortedStickers.length ? t('preview.deselectAll') : t('preview.selectAll')}
          onPress={() =>
            replaceSelection(
              selectedCount === sortedStickers.length ? new Set() : new Set(sortedStickers.map((item) => item.id)),
            )
          }
          variant="ghost"
        />
      </Card>

      <StickerGrid
        onShare={(stickerId) => void share(stickerId)}
        onToggle={save.isPending ? undefined : toggle}
        selectedIds={selected}
        sharingId={sharingId}
        stickers={sortedStickers}
      />
      {shareError ? <Text style={styles.error}>{shareError}</Text> : null}
      {save.isError ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorTitle}>{t('preview.saveErrorTitle')}</Text>
          <Text style={styles.errorBody}>{safeErrorMessage(save.error)} {t('preview.saveErrorBody')}</Text>
        </Card>
      ) : null}
      {regenerate.isError ? <Text style={styles.error}>{safeErrorMessage(regenerate.error)}</Text> : null}
      <View style={styles.actions}>
        <Button
          disabled={selectedCount === 0}
          icon="bookmark"
          label={t('preview.saveButton', { count: selectedCount })}
          loading={save.isPending}
          onPress={() => save.mutate()}
        />
        <Button
          disabled={save.isPending}
          icon="refresh"
          label={t('preview.regenerateButton')}
          loading={regenerate.isPending}
          onPress={confirmRegenerate}
          variant="ghost"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.md },
  title: { color: colors.ink, fontSize: 29, lineHeight: 36, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 22 },
  selectionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  selectionNumber: { color: colors.primary, fontSize: 23, fontWeight: '900' },
  selectionLabel: { color: colors.muted, fontSize: 12 },
  actions: { gap: spacing.md },
  error: { color: colors.danger, textAlign: 'center' },
  errorCard: { backgroundColor: colors.dangerSoft },
  errorTitle: { color: colors.danger, fontWeight: '900', marginBottom: spacing.xs },
  errorBody: { color: colors.ink, lineHeight: 20 },
});
