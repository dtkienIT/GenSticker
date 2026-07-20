import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { JobEvent } from '../../services/contracts';
import { useAppTheme } from '../../theme';
import { GENERATION_STAGE_LABELS } from './GenerationProgress';

export interface JobTimelineProps {
  events: readonly JobEvent[];
  loading?: boolean;
  errorMessage?: string | null;
  title?: string;
  emptyMessage?: string;
}

const formatEventTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export const JobTimeline: React.FC<JobTimelineProps> = ({
  events,
  loading = false,
  errorMessage,
  title = 'Lịch sử tiến trình',
  emptyMessage = 'Chưa có cập nhật tiến trình.',
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();

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
        <Text accessibilityRole="header" style={[typography.h3, { color: colors.textPrimary }]}>
          {title}
        </Text>
        {loading ? (
          <ActivityIndicator
            accessibilityLabel="Đang tải lịch sử"
            color={colors.primary}
            size="small"
          />
        ) : null}
      </View>

      {events.length === 0 && !loading ? (
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
          {emptyMessage}
        </Text>
      ) : null}

      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const time = formatEventTime(event.createdAt);
        return (
          <View key={event.id} style={[styles.eventRow, { marginTop: spacing.md }]}>
            <View style={styles.markerColumn}>
              <View
                style={[
                  styles.marker,
                  {
                    backgroundColor: isLast ? colors.primary : colors.success,
                    borderRadius: borderRadius.full,
                  },
                ]}
              />
              {!isLast ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}
            </View>
            <View style={[styles.eventCopy, { paddingBottom: isLast ? 0 : spacing.sm }]}>
              <View style={styles.eventHeading}>
                <Text
                  style={[typography.bodyBold, styles.eventLabel, { color: colors.textPrimary }]}
                >
                  {GENERATION_STAGE_LABELS[event.stage]}
                </Text>
                {time ? (
                  <Text style={[typography.caption, { color: colors.textMuted }]}>{time}</Text>
                ) : null}
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {Math.min(100, Math.max(0, Math.round(event.progress)))}%
              </Text>
            </View>
          </View>
        );
      })}

      {errorMessage ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            typography.caption,
            {
              color: colors.warning,
              marginTop: spacing.md,
              paddingTop: spacing.sm,
              borderTopColor: colors.border,
              borderTopWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    width: '100%',
  },
  eventCopy: {
    flex: 1,
  },
  eventHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eventLabel: {
    flex: 1,
    paddingRight: 8,
  },
  eventRow: {
    flexDirection: 'row',
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  line: {
    flex: 1,
    marginVertical: 3,
    width: 2,
  },
  marker: {
    height: 12,
    width: 12,
  },
  markerColumn: {
    alignItems: 'center',
    marginRight: 12,
    width: 12,
  },
});
