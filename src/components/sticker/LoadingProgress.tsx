import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GenerationProgress } from '../../types/sticker';
import { useAppTheme } from '../../theme';

export interface LoadingProgressProps {
  progress: GenerationProgress;
}

export const LoadingProgress: React.FC<LoadingProgressProps> = ({ progress }) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();

  return (
    <View style={[styles.container, { padding: spacing.lg }]}>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: spacing.md }} />
      <Text
        style={[
          typography.h3,
          { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
        ]}
      >
        Generating Your Sticker
      </Text>
      <Text
        style={[
          typography.body,
          {
            color: colors.primary,
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: spacing.md,
          },
        ]}
      >
        {progress.step}
      </Text>

      {/* Progress Bar Track */}
      <View
        style={[
          styles.progressTrack,
          {
            backgroundColor: colors.border,
            borderRadius: borderRadius.full,
          },
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
          { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'right' },
        ]}
      >
        {progress.progressPercent}%
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'stretch',
  },
  progressTrack: {
    height: 10,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
});
