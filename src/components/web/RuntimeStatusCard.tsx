import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StickerRuntimeMode } from '@/services/runtimeMode';
import { useAppTheme } from '@/theme';
import { runtimeStatusCopy } from './runtimePresentation';

type CapabilityStatus = 'checking' | 'ready' | 'unsupported' | 'failed';

export function RuntimeStatusCard({
  mode,
  status,
  detail,
}: {
  mode: StickerRuntimeMode;
  status: CapabilityStatus;
  detail?: string | null;
}) {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: status === 'ready' ? colors.primaryLight : colors.surface,
          borderRadius: borderRadius.md,
          padding: spacing.md,
        },
      ]}
    >
      <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Runtime status</Text>
      <Text selectable style={[typography.caption, { color: colors.textSecondary }]}>
        {detail ?? runtimeStatusCopy(mode, status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
});
