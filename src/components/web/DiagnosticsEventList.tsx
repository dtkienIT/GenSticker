import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LocalDiagnosticEvent } from '@/services/diagnostics/types';
import { useAppTheme } from '@/theme';

export function DiagnosticsEventList({ events }: { events: LocalDiagnosticEvent[] }) {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  if (events.length === 0) {
    return (
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        No local diagnostic events recorded.
      </Text>
    );
  }
  return (
    <View style={styles.list}>
      {events.slice(0, 50).map((event) => (
        <View
          key={event.id}
          style={[
            styles.event,
            {
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              padding: spacing.sm,
            },
          ]}
        >
          <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
            {event.kind} · {event.stage ?? event.detailCode ?? 'event'}
          </Text>
          <Text selectable style={[typography.caption, { color: colors.textMuted }]}>
            {event.recordedAt}
            {event.elapsedMs === undefined ? '' : ` · ${event.elapsedMs} ms`}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  event: { borderWidth: 1, gap: 2 },
});
