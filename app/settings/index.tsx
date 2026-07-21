import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { getStickerRuntimeMode } from '@/services/appServices';
import { useAppTheme } from '@/theme';

export default function SettingsScreen() {
  const { colors, isDark, setMode, borderRadius, spacing, typography } = useAppTheme();
  return (
    <ScreenContainer scrollable>
      <SectionHeader
        title="Settings"
        subtitle="Local appearance and feasibility-build information"
      />
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
          },
        ]}
      >
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Dark mode</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Override the current system appearance.
            </Text>
          </View>
          <Switch value={isDark} onValueChange={(value) => setMode(value ? 'dark' : 'light')} />
        </View>
      </View>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
          },
        ]}
      >
        <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Runtime</Text>
        <Text selectable style={[typography.body, { color: colors.textSecondary }]}>
          {getStickerRuntimeMode() === 'mock'
            ? 'Deterministic local mock adapter'
            : 'Android native adapter requested'}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Mock output verifies the app flow only. It is not production inference or model
          feasibility evidence.
        </Text>
      </View>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
          },
        ]}
      >
        <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Data handling</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Prompts and generated mock PNGs remain local to the app. Save and Share create or send an
          external copy without removing the gallery original.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, gap: 8, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  copy: { flex: 1, gap: 2 },
});
