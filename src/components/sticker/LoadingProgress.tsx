import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { GenerationProgressEvent } from '../../services/generation/types';
import { useAppTheme } from '../../theme';

export interface LoadingProgressProps {
  progress: GenerationProgressEvent;
}

const STAGE_LABELS: Record<GenerationProgressEvent['stage'], string> = {
  validating: 'Validating the local request…',
  preparing_model: 'Preparing the on-device runtime…',
  generating: 'Generating the image on this device…',
  removing_background: 'Removing the background…',
  encoding: 'Encoding a transparent PNG…',
  completed: 'Finishing the sticker…',
  saving: 'Saving to your local gallery…',
};

export const LoadingProgress: React.FC<LoadingProgressProps> = ({ progress }) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  return (
    <View style={[styles.container, { padding: spacing.lg }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[typography.h3, { color: colors.textPrimary, textAlign: 'center' }]}>
        Creating your sticker
      </Text>
      <Text style={[typography.body, { color: colors.primary, textAlign: 'center' }]}>
        {STAGE_LABELS[progress.stage]}
      </Text>
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: colors.border, borderRadius: borderRadius.full },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(100, Math.max(5, progress.progressPercent))}%`,
              backgroundColor: colors.primary,
              borderRadius: borderRadius.full,
            },
          ]}
        />
      </View>
      <Text
        style={[
          typography.caption,
          { color: colors.textMuted, textAlign: 'right', fontVariant: ['tabular-nums'] },
        ]}
      >
        {progress.progressPercent}%
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', gap: 12 },
  progressTrack: { height: 10, width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%' },
});
