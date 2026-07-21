import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppButton } from '@/components/common/AppButton';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { RetryAction } from '@/components/feedback/RetryAction';
import { LoadingProgress } from '@/components/sticker/LoadingProgress';
import { useStickerStore } from '@/store/useStickerStore';
import { useAppTheme } from '@/theme';

export default function GeneratingScreen() {
  const router = useRouter();
  const started = useRef(false);
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const draft = useStickerStore((state) => state.draft);
  const jobStatus = useStickerStore((state) => state.jobStatus);
  const progress = useStickerStore((state) => state.progress);
  const error = useStickerStore((state) => state.error);
  const runGeneration = useStickerStore((state) => state.runGeneration);
  const cancelGeneration = useStickerStore((state) => state.cancelGeneration);
  const editPrompt = useStickerStore((state) => state.editPrompt);

  const run = async () => {
    const result = await runGeneration();
    if (result) router.replace('/create/result');
  };

  useEffect(() => {
    if (!draft.prompt.trim()) {
      router.replace('/');
      return;
    }
    if (!started.current) {
      started.current = true;
      void run();
    }
  }, [draft.prompt]);

  const returnToPrompt = () => {
    editPrompt();
    router.replace('/');
  };

  return (
    <ScreenContainer scrollable={false} style={styles.centered}>
      {jobStatus === 'processing' ? (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.lg,
              padding: spacing.lg,
            },
          ]}
        >
          <LoadingProgress
            progress={
              progress ?? {
                requestId: 'pending',
                stage: 'preparing_model',
                progressPercent: 5,
              }
            }
          />
          <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
            Keep GenSticker open while the local pipeline runs.
          </Text>
          <AppButton title="Cancel" variant="outline" onPress={() => void cancelGeneration()} />
        </View>
      ) : (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.error,
              borderRadius: borderRadius.lg,
              padding: spacing.xl,
            },
          ]}
        >
          <Text style={styles.errorIcon}>{jobStatus === 'cancelled' ? '⏹️' : '⚠️'}</Text>
          <Text
            selectable
            style={[typography.h3, { color: colors.textPrimary, textAlign: 'center' }]}
          >
            {error?.title ?? 'Generation stopped'}
          </Text>
          <Text
            selectable
            style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}
          >
            {error?.message ?? 'No sticker was saved.'}
          </Text>
          {error?.retryable ? <RetryAction onRetry={() => void run()} /> : null}
          <AppButton title="Edit prompt" variant="secondary" onPress={returnToPrompt} />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', borderWidth: 1, gap: 16 },
  errorIcon: { fontSize: 46, textAlign: 'center' },
});
