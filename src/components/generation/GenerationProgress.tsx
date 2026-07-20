import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { GenerationJob, GenerationJobStatus, GenerationStage } from '../../services/contracts';
import { useAppTheme } from '../../theme';

export interface GenerationProgressProps {
  job: Pick<GenerationJob, 'status' | 'stage' | 'progress'>;
  title?: string;
  message?: string;
  showPercentage?: boolean;
}

export const GENERATION_STAGE_LABELS: Record<GenerationStage, string> = {
  validating: 'Đang kiểm tra ảnh',
  preparing: 'Đang chuẩn bị nhân vật',
  generating: 'Đang tạo hình dán',
  background_removal: 'Đang làm nền trong suốt',
  postprocessing: 'Đang hoàn thiện',
  exporting: 'Đang chuẩn bị tệp',
  completed: 'Đã hoàn tất',
};

const STATUS_LABELS: Record<GenerationJobStatus, string> = {
  queued: 'Đang chờ',
  running: 'Đang xử lý',
  succeeded: 'Hoàn tất',
  failed: 'Không thể hoàn tất',
  cancelled: 'Đã hủy',
};

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  job,
  title = 'Tiến trình tạo hình',
  message,
  showPercentage = true,
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const progress = Math.min(100, Math.max(0, Math.round(job.progress)));
  const isActive = job.status === 'queued' || job.status === 'running';
  const accentColor =
    job.status === 'failed'
      ? colors.error
      : job.status === 'cancelled'
        ? colors.textMuted
        : job.status === 'succeeded'
          ? colors.success
          : colors.primary;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
        },
      ]}
    >
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text accessibilityRole="header" style={[typography.h3, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[typography.body, { color: accentColor, marginTop: spacing.xs }]}>
            {GENERATION_STAGE_LABELS[job.stage]}
          </Text>
        </View>
        {isActive ? (
          <ActivityIndicator accessibilityLabel="Đang xử lý" color={accentColor} />
        ) : null}
      </View>

      {message ? (
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
          {message}
        </Text>
      ) : null}

      <View
        accessibilityLabel={`${STATUS_LABELS[job.status]}, ${progress}%`}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: progress }}
        style={[
          styles.track,
          {
            backgroundColor: colors.border,
            borderRadius: borderRadius.full,
            marginTop: spacing.md,
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
      <View style={[styles.footer, { marginTop: spacing.xs }]}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {STATUS_LABELS[job.status]}
        </Text>
        {showPercentage ? (
          <Text style={[typography.caption, styles.percentage, { color: colors.textPrimary }]}>
            {progress}%
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    width: '100%',
  },
  fill: {
    height: '100%',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headingCopy: {
    flex: 1,
    paddingRight: 12,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  percentage: {
    fontWeight: '700',
  },
  track: {
    height: 10,
    overflow: 'hidden',
    width: '100%',
  },
});
