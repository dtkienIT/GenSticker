import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { LoadingProgress } from '../../src/components/sticker/LoadingProgress';
import { AppButton } from '../../src/components/common/AppButton';
import { useStickerStore } from '../../src/store/useStickerStore';
import { mockStickerService } from '../../src/services/mock/mockStickerService';
import { useAppTheme } from '../../src/theme';

export default function GeneratingScreen() {
  const router = useRouter();
  const { colors, borderRadius, spacing, typography } = useAppTheme();

  const draftRequest = useStickerStore((state) => state.draftRequest);
  const progress = useStickerStore((state) => state.progress);
  const jobStatus = useStickerStore((state) => state.jobStatus);
  const errorMessage = useStickerStore((state) => state.errorMessage);

  const startGeneration = useStickerStore((state) => state.startGeneration);
  const updateProgress = useStickerStore((state) => state.updateProgress);
  const completeGeneration = useStickerStore((state) => state.completeGeneration);
  const failGeneration = useStickerStore((state) => state.failGeneration);

  useEffect(() => {
    if (!draftRequest) {
      router.replace('/create');
      return;
    }

    let isMounted = true;
    startGeneration();

    mockStickerService
      .generateSticker(draftRequest, (prog) => {
        if (isMounted) {
          updateProgress(prog);
        }
      })
      .then((result) => {
        if (isMounted) {
          completeGeneration(result);
          router.replace('/create/result');
        }
      })
      .catch((err) => {
        if (isMounted) {
          failGeneration(err instanceof Error ? err.message : 'Generation failed');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [draftRequest]);

  return (
    <ScreenContainer scrollable={false} style={styles.centerContainer}>
      {jobStatus === 'failed' ? (
        <View
          style={[
            styles.errorCard,
            {
              backgroundColor: colors.card,
              borderRadius: borderRadius.lg,
              padding: spacing.xl,
              borderColor: colors.error,
            },
          ]}
        >
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[typography.h3, { color: colors.error, marginTop: spacing.sm }]}>
            Generation Error
          </Text>
          <Text
            style={[
              typography.body,
              {
                color: colors.textSecondary,
                textAlign: 'center',
                marginTop: spacing.xs,
                marginBottom: spacing.lg,
              },
            ]}
          >
            {errorMessage || 'Something went wrong during generation.'}
          </Text>
          <AppButton
            title="Try Again"
            variant="primary"
            onPress={() => router.replace('/create/text')}
          />
        </View>
      ) : (
        <View
          style={[
            styles.loadingCard,
            {
              backgroundColor: colors.card,
              borderRadius: borderRadius.lg,
              borderColor: colors.border,
            },
          ]}
        >
          <LoadingProgress progress={progress} />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    width: '100%',
    borderWidth: 1,
  },
  errorCard: {
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
  },
  errorIcon: {
    fontSize: 48,
  },
});
