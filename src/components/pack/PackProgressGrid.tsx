import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StickerPack, StickerSlot } from '../../services/contracts';
import { useAppTheme } from '../../theme';
import { StickerSlotCard } from './StickerSlotCard';

export interface PackProgressGridProps {
  pack: Pick<StickerPack, 'status' | 'slots'>;
  emotionLabels?: Readonly<Record<string, string>>;
  onSlotPress?: (slot: StickerSlot) => void;
  onRetrySlot?: (slot: StickerSlot) => void;
  retryingSlotId?: string | null;
  disabled?: boolean;
  title?: string;
}

export const PackProgressGrid: React.FC<PackProgressGridProps> = ({
  pack,
  emotionLabels,
  onSlotPress,
  onRetrySlot,
  retryingSlotId,
  disabled = false,
  title = 'Bộ hình dán của bạn',
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const total = pack.slots.length;
  const completed = pack.slots.filter((slot) => slot.status === 'completed').length;
  const overallProgress =
    total === 0
      ? 0
      : Math.round(
          pack.slots.reduce((sum, slot) => sum + Math.min(100, Math.max(0, slot.progress)), 0) /
            total,
        );

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text accessibilityRole="header" style={[typography.h3, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text
            style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}
          >
            {completed}/{total} mục đã hoàn tất
          </Text>
        </View>
        <Text style={[typography.bodyBold, { color: colors.primary }]}>{overallProgress}%</Text>
      </View>

      <View
        accessibilityLabel={`Tiến trình bộ hình dán: ${overallProgress}%`}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: overallProgress }}
        style={[
          styles.track,
          {
            backgroundColor: colors.border,
            borderRadius: borderRadius.full,
            marginTop: spacing.sm,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              backgroundColor: colors.primary,
              borderRadius: borderRadius.full,
              width: `${overallProgress}%`,
            },
          ]}
        />
      </View>

      <View style={[styles.grid, { marginTop: spacing.md }]}>
        {pack.slots.map((slot) => (
          <StickerSlotCard
            disabled={disabled}
            emotionLabel={emotionLabels?.[slot.emotionId] ?? slot.emotionId}
            key={slot.id}
            onPress={onSlotPress}
            onRetry={onRetrySlot}
            retrying={retryingSlotId === slot.id}
            slot={slot}
            style={styles.cell}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cell: {
    flexBasis: '48%',
    flexGrow: 1,
    maxWidth: '50%',
  },
  container: {
    width: '100%',
  },
  fill: {
    height: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  headingCopy: {
    flex: 1,
    paddingRight: 12,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  track: {
    height: 10,
    overflow: 'hidden',
  },
});
