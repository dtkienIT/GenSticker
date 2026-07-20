import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { StickerSlot, StickerSlotStatus } from '../../services/contracts';
import { useAppTheme } from '../../theme';
import { AppButton } from '../common/AppButton';

export interface StickerSlotCardProps {
  slot: StickerSlot;
  emotionLabel?: string;
  onPress?: (slot: StickerSlot) => void;
  onRetry?: (slot: StickerSlot) => void;
  retrying?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const STATUS_LABELS: Record<StickerSlotStatus, string> = {
  pending: 'Chưa bắt đầu',
  queued: 'Đang chờ',
  generating: 'Đang tạo',
  completed: 'Hoàn tất',
  failed: 'Cần thử lại',
  cancelled: 'Đã hủy',
};

export const StickerSlotCard: React.FC<StickerSlotCardProps> = ({
  slot,
  emotionLabel = slot.emotionId,
  onPress,
  onRetry,
  retrying = false,
  disabled = false,
  style,
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const [currentImageFailed, setCurrentImageFailed] = useState(false);
  const [previousImageFailed, setPreviousImageFailed] = useState(false);
  const progress = Math.min(100, Math.max(0, Math.round(slot.progress)));

  useEffect(() => setCurrentImageFailed(false), [slot.imageUri]);
  useEffect(() => setPreviousImageFailed(false), [slot.previousImageUri]);

  const accentColor =
    slot.status === 'failed'
      ? colors.error
      : slot.status === 'completed'
        ? colors.success
        : slot.status === 'cancelled'
          ? colors.textMuted
          : colors.primary;
  const showComparison = Boolean(
    slot.status === 'completed' && slot.previousImageUri && slot.imageUri,
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: slot.status === 'failed' ? colors.error : colors.border,
          borderRadius: borderRadius.md,
          padding: spacing.sm,
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <Text
          numberOfLines={1}
          style={[typography.bodyBold, styles.emotion, { color: colors.textPrimary }]}
        >
          {emotionLabel}
        </Text>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: accentColor, borderRadius: borderRadius.full },
          ]}
        />
      </View>

      <Pressable
        accessibilityLabel={`${emotionLabel}, ${STATUS_LABELS[slot.status]}`}
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityState={{ disabled: disabled || !onPress }}
        disabled={disabled || !onPress}
        onPress={() => onPress?.(slot)}
        style={({ pressed }) => [
          styles.preview,
          {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.sm,
            marginTop: spacing.sm,
            opacity: pressed ? 0.82 : 1,
          },
        ]}
      >
        {showComparison ? (
          <View style={styles.comparisonRow}>
            <SlotImage
              failed={previousImageFailed}
              label="Trước"
              onError={() => setPreviousImageFailed(true)}
              uri={slot.previousImageUri}
            />
            <SlotImage
              failed={currentImageFailed}
              label="Mới"
              onError={() => setCurrentImageFailed(true)}
              uri={slot.imageUri}
            />
          </View>
        ) : slot.imageUri && !currentImageFailed ? (
          <Image
            onError={() => setCurrentImageFailed(true)}
            resizeMode="contain"
            source={{ uri: slot.imageUri }}
            style={styles.image}
          />
        ) : (
          <View style={[styles.placeholder, { padding: spacing.sm }]}>
            <Text style={styles.placeholderIcon}>
              {slot.status === 'failed' ? '!' : slot.status === 'completed' ? '🖼️' : '…'}
            </Text>
            <Text
              numberOfLines={2}
              style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}
            >
              {currentImageFailed ? 'Không thể hiển thị' : STATUS_LABELS[slot.status]}
            </Text>
          </View>
        )}
      </Pressable>

      <View style={[styles.statusRow, { marginTop: spacing.sm }]}>
        <Text style={[typography.caption, { color: accentColor }]}>
          {STATUS_LABELS[slot.status]}
        </Text>
        {(slot.status === 'queued' || slot.status === 'generating') && (
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{progress}%</Text>
        )}
      </View>

      {slot.status === 'queued' || slot.status === 'generating' ? (
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progress }}
          style={[
            styles.track,
            {
              backgroundColor: colors.border,
              borderRadius: borderRadius.full,
              marginTop: spacing.xs,
            },
          ]}
        >
          <View
            style={[
              styles.fill,
              {
                backgroundColor: accentColor,
                borderRadius: borderRadius.full,
                width: `${progress}%`,
              },
            ]}
          />
        </View>
      ) : null}

      {slot.retryCount > 0 ? (
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
          Đã thử lại {slot.retryCount} lần
        </Text>
      ) : null}

      {slot.status === 'failed' && onRetry ? (
        <AppButton
          accessibilityLabel={`Thử lại ${emotionLabel}`}
          disabled={disabled}
          loading={retrying}
          onPress={() => onRetry(slot)}
          size="sm"
          style={{ marginTop: spacing.sm, minHeight: 44 }}
          title="Thử lại mục này"
          variant="outline"
        />
      ) : null}
    </View>
  );
};

interface SlotImageProps {
  uri?: string;
  label: string;
  failed: boolean;
  onError: () => void;
}

const SlotImage: React.FC<SlotImageProps> = ({ uri, label, failed, onError }) => {
  const { colors, typography } = useAppTheme();
  return (
    <View style={styles.comparisonItem}>
      {uri && !failed ? (
        <Image
          onError={onError}
          resizeMode="contain"
          source={{ uri }}
          style={styles.comparisonImage}
        />
      ) : (
        <View style={styles.comparisonFallback}>
          <Text style={{ color: colors.textMuted }}>—</Text>
        </View>
      )}
      <Text
        style={[
          typography.caption,
          styles.comparisonLabel,
          { backgroundColor: colors.card, color: colors.textPrimary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    minWidth: 0,
  },
  comparisonFallback: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  comparisonImage: {
    flex: 1,
    width: '100%',
  },
  comparisonItem: {
    flex: 1,
    position: 'relative',
  },
  comparisonLabel: {
    borderRadius: 4,
    bottom: 4,
    fontWeight: '700',
    left: 4,
    paddingHorizontal: 4,
    position: 'absolute',
  },
  comparisonRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    width: '100%',
  },
  emotion: {
    flex: 1,
    paddingRight: 6,
  },
  fill: {
    height: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 4,
  },
  preview: {
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  statusDot: {
    height: 10,
    width: 10,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 6,
    overflow: 'hidden',
  },
});
