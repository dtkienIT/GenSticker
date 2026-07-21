import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppButton } from '@/components/common/AppButton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { StickerCard } from '@/components/sticker/StickerCard';
import { queryInvalidation, queryKeys } from '@/query';
import { getApiErrorPresentation } from '@/services/errors';
import { getStickerProductService } from '@/services/factory';
import type { Character, GenerationJob, StickerPack } from '@/services/contracts';
import { useProductSessionStore } from '@/store/useProductSessionStore';
import { useStickerStore } from '@/store/useStickerStore';
import { useAppTheme } from '@/theme';

const CHARACTER_STATUS_LABELS: Record<Character['status'], string> = {
  DRAFT: 'Bản nháp',
  GENERATING_CANONICAL: 'Đang tạo mẫu',
  AWAITING_APPROVAL: 'Chờ chọn mẫu',
  APPROVED: 'Đã duyệt',
  DELETED: 'Đã xóa',
};

function newestByDate<T extends { createdAt: string }>(items: T[]): T | undefined {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
}

export default function LibraryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const savedStickers = useStickerStore((state) => state.savedStickers);
  const removeSticker = useStickerStore((state) => state.removeSticker);
  const activeCharacterId = useProductSessionStore((state) => state.activeCharacterId);
  const clearActiveFlow = useProductSessionStore((state) => state.clearActiveFlow);
  const [pendingDelete, setPendingDelete] = useState<Character | null>(null);
  const service = getStickerProductService();

  const characters = useQuery({
    queryKey: queryKeys.characters.list(),
    queryFn: () => service.listCharacters(),
  });
  const jobs = useQuery({
    queryKey: queryKeys.jobs.list(),
    queryFn: () => service.listGenerationJobs(),
  });
  const packs = useQuery({
    queryKey: queryKeys.packs.list(),
    queryFn: () => service.listStickerPacks(),
  });

  const productError = characters.error ?? jobs.error ?? packs.error;
  const productLoading = characters.isLoading || jobs.isLoading || packs.isLoading;
  const charactersById = useMemo(
    () =>
      (characters.data ?? []).map((character) => ({
        character,
        latestJob: newestByDate(
          (jobs.data ?? []).filter((job) => job.characterId === character.id),
        ),
        latestPack: newestByDate(
          (packs.data ?? []).filter((pack) => pack.characterId === character.id),
        ),
      })),
    [characters.data, jobs.data, packs.data],
  );

  const deletion = useMutation({
    mutationFn: (characterId: string) => service.deleteCharacter(characterId),
    onSuccess: async (_, characterId) => {
      await queryInvalidation.characterDeleted(queryClient, characterId);
      if (activeCharacterId === characterId) clearActiveFlow();
      setPendingDelete(null);
    },
  });

  const handleLegacyDelete = (id: string) => {
    Alert.alert('Xóa hình dán', 'Bạn có chắc muốn xóa hình dán này?', [
      { text: 'Quay lại', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => removeSticker(id) },
    ]);
  };

  const openCharacter = (
    character: Character,
    latestJob?: GenerationJob,
    latestPack?: StickerPack,
  ) => {
    if (latestPack) {
      router.push({ pathname: '/pack/[packId]', params: { packId: latestPack.id } });
      return;
    }
    if (character.status === 'AWAITING_APPROVAL' || latestJob?.status === 'succeeded') {
      router.push({ pathname: '/canonical/candidates', params: { characterId: character.id } });
      return;
    }
    if (latestJob && ['queued', 'running'].includes(latestJob.status)) {
      router.push({ pathname: '/canonical/generating', params: { jobId: latestJob.id } });
      return;
    }
    if (character.status === 'APPROVED') {
      router.push({ pathname: '/profile/[characterId]', params: { characterId: character.id } });
      return;
    }
    router.push('/create/selfie');
  };

  const isEmpty = !productLoading && charactersById.length === 0 && savedStickers.length === 0;

  return (
    <ScreenContainer scrollable>
      <SectionHeader
        title="Thư viện GenSticker"
        subtitle={`${charactersById.length} nhân vật · ${savedStickers.length} hình dán văn bản`}
      />

      {productError ? (
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            accessibilityLiveRegion="polite"
            style={[typography.body, { color: colors.error, marginBottom: spacing.sm }]}
          >
            {getApiErrorPresentation(productError).message}
          </Text>
          <AppButton
            title="Tải lại dữ liệu sản phẩm"
            variant="outline"
            onPress={() =>
              void Promise.all([characters.refetch(), jobs.refetch(), packs.refetch()])
            }
          />
        </View>
      ) : null}

      {productLoading ? (
        <Text style={[typography.body, { color: colors.textSecondary }]}>Đang tải thư viện…</Text>
      ) : null}

      {charactersById.length > 0 ? (
        <View style={{ marginBottom: spacing.xl }}>
          <SectionHeader title="Nhân vật và bộ hình dán" />
          {charactersById.map(({ character, latestJob, latestPack }) => (
            <View
              key={character.id}
              style={[
                styles.characterCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  marginBottom: spacing.sm,
                  padding: spacing.md,
                },
              ]}
            >
              <View style={styles.characterCopy}>
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                  {character.displayName}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {CHARACTER_STATUS_LABELS[character.status]}
                  {latestPack ? ` · Bộ ${latestPack.status}` : ''}
                </Text>
              </View>
              <View style={styles.characterActions}>
                <AppButton
                  size="sm"
                  title="Mở"
                  onPress={() => openCharacter(character, latestJob, latestPack)}
                />
                <AppButton
                  size="sm"
                  title="Xóa"
                  variant="danger"
                  onPress={() => {
                    deletion.reset();
                    setPendingDelete(character);
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {savedStickers.length > 0 ? (
        <View>
          <SectionHeader title="Hình dán từ văn bản" />
          <View style={styles.gridContainer}>
            {savedStickers.map((sticker) => (
              <View key={sticker.id} style={styles.gridItem}>
                <StickerCard sticker={sticker} onDelete={() => handleLegacyDelete(sticker.id)} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {isEmpty ? (
        <EmptyState
          icon="📚"
          title="Thư viện đang trống"
          message="Nhân vật, bộ hình dán và hình dán đã lưu sẽ xuất hiện tại đây."
          buttonTitle="Tạo hình dán"
          onButtonPress={() => router.push('/create')}
        />
      ) : null}

      {deletion.isError ? (
        <Text accessibilityLiveRegion="polite" style={[typography.body, { color: colors.error }]}>
          {getApiErrorPresentation(deletion.error).message}
        </Text>
      ) : null}

      <ConfirmDialog
        destructive
        loading={deletion.isPending}
        message="Ảnh selfie, mẫu nhân vật, job, bộ hình dán và bản xuất liên quan sẽ bị xóa."
        title={`Xóa ${pendingDelete?.displayName ?? 'nhân vật'}?`}
        visible={Boolean(pendingDelete)}
        confirmLabel="Xóa nhân vật"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deletion.mutate(pendingDelete.id)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  characterActions: {
    flexDirection: 'row',
    gap: 8,
  },
  characterCard: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
  },
  characterCopy: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  gridItem: {
    width: '48%',
  },
});
