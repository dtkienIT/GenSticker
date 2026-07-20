import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CandidateIndicator, CanonicalCandidate } from '../../services/contracts';
import { useAppTheme } from '../../theme';
import { AppButton } from '../common/AppButton';
import { RecommendationBadge } from './RecommendationBadge';

export interface CanonicalCandidateCardProps {
  candidate: CanonicalCandidate;
  selected: boolean;
  onSelect: (candidate: CanonicalCandidate) => void;
  onPreview?: (candidate: CanonicalCandidate) => void;
  onRetryImage?: (candidate: CanonicalCandidate) => void;
  disabled?: boolean;
  label?: string;
}

const INDICATOR_LABELS: Record<CandidateIndicator, string> = {
  excellent: 'Rất tốt',
  good: 'Tốt',
  fair: 'Ổn',
};

export const CanonicalCandidateCard: React.FC<CanonicalCandidateCardProps> = ({
  candidate,
  selected,
  onSelect,
  onPreview,
  onRetryImage,
  disabled = false,
  label = 'Mẫu nhân vật',
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [candidate.imageUri]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderRadius: borderRadius.lg,
          padding: spacing.sm,
        },
      ]}
    >
      <View style={styles.badgeRow}>
        {candidate.recommended ? <RecommendationBadge /> : <View />}
        {selected ? (
          <View
            accessible
            accessibilityLabel="Đã chọn"
            style={[
              styles.selectedBadge,
              { backgroundColor: colors.primary, borderRadius: borderRadius.full },
            ]}
          >
            <Text style={styles.selectedBadgeText}>✓</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityHint={onPreview ? 'Mở bản xem trước toàn màn hình' : undefined}
        accessibilityLabel={`${label}${candidate.recommended ? ', được đề xuất' : ''}`}
        accessibilityRole={onPreview ? 'button' : 'image'}
        disabled={!onPreview}
        onPress={() => onPreview?.(candidate)}
        style={({ pressed }) => [
          styles.preview,
          {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.md,
            opacity: pressed ? 0.82 : 1,
          },
        ]}
      >
        {!imageFailed ? (
          <Image
            onError={() => setImageFailed(true)}
            resizeMode="contain"
            source={{ uri: candidate.imageUri }}
            style={styles.image}
          />
        ) : (
          <View style={[styles.imageFallback, { padding: spacing.md }]}>
            <Text style={styles.imageFallbackIcon}>🖼️</Text>
            <Text
              style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}
            >
              Không thể hiển thị mẫu này.
            </Text>
            {onRetryImage ? (
              <AppButton
                onPress={() => {
                  setImageFailed(false);
                  onRetryImage(candidate);
                }}
                size="sm"
                style={{ marginTop: spacing.sm, minHeight: 44 }}
                title="Thử lại"
                variant="outline"
              />
            ) : null}
          </View>
        )}
      </Pressable>

      <View style={[styles.scores, { marginTop: spacing.sm }]}>
        <ScoreItem label="Nét giống" value={candidate.scoreSummary.likeness} />
        <ScoreItem label="Độ rõ" value={candidate.scoreSummary.clarity} />
        <ScoreItem label="Ổn định" value={candidate.scoreSummary.consistency} />
      </View>

      <AppButton
        accessibilityLabel={selected ? `${label} đang được chọn` : `Chọn ${label}`}
        disabled={disabled}
        onPress={() => onSelect(candidate)}
        style={{ marginTop: spacing.md, minHeight: 48 }}
        title={selected ? 'Đã chọn' : 'Chọn mẫu này'}
        variant={selected ? 'secondary' : 'outline'}
      />
    </View>
  );
};

interface ScoreItemProps {
  label: string;
  value: CandidateIndicator;
}

const ScoreItem: React.FC<ScoreItemProps> = ({ label, value }) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const indicatorColor = value === 'excellent' ? colors.success : colors.primary;
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${INDICATOR_LABELS[value]}`}
      style={[
        styles.score,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        },
      ]}
    >
      <Text numberOfLines={1} style={[typography.caption, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={[typography.caption, styles.scoreValue, { color: indicatorColor }]}
      >
        {INDICATOR_LABELS[value]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 34,
    paddingHorizontal: 2,
  },
  card: {
    borderWidth: 2,
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackIcon: {
    fontSize: 36,
    marginBottom: 6,
  },
  preview: {
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  score: {
    flex: 1,
    minWidth: 76,
  },
  scoreValue: {
    fontWeight: '700',
    marginTop: 1,
  },
  scores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedBadge: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
