import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { useAppTheme } from '../../src/theme';

export default function SettingsScreen() {
  const { colors, isDark, setMode, borderRadius, spacing, typography } = useAppTheme();

  const toggleDarkMode = (value: boolean) => {
    setMode(value ? 'dark' : 'light');
  };

  return (
    <ScreenContainer scrollable>
      <SectionHeader title="Settings" subtitle="Manage your app preferences and configuration" />

      {/* Appearance Section */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: colors.card,
            borderRadius: borderRadius.lg,
            borderColor: colors.border,
            padding: spacing.md,
            marginBottom: spacing.md,
          },
        ]}
      >
        <Text
          style={[typography.bodyBold, { color: colors.textPrimary, marginBottom: spacing.xs }]}
        >
          Appearance
        </Text>
        <View style={styles.row}>
          <Text style={[typography.body, { color: colors.textPrimary }]}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={toggleDarkMode}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      {/* Preferences Placeholders */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: colors.card,
            borderRadius: borderRadius.lg,
            borderColor: colors.border,
            padding: spacing.md,
            marginBottom: spacing.md,
          },
        ]}
      >
        <Text
          style={[typography.bodyBold, { color: colors.textPrimary, marginBottom: spacing.sm }]}
        >
          Preferences
        </Text>

        <TouchableOpacity style={styles.itemRow} activeOpacity={0.7}>
          <Text style={[typography.body, { color: colors.textPrimary }]}>
            Default Sticker Style
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Chibi ›</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.itemRow} activeOpacity={0.7}>
          <Text style={[typography.body, { color: colors.textPrimary }]}>Language</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>English ›</Text>
        </TouchableOpacity>
      </View>

      {/* Privacy & About Placeholders */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: colors.card,
            borderRadius: borderRadius.lg,
            borderColor: colors.border,
            padding: spacing.md,
            marginBottom: spacing.md,
          },
        ]}
      >
        <Text
          style={[typography.bodyBold, { color: colors.textPrimary, marginBottom: spacing.sm }]}
        >
          About & Privacy
        </Text>

        <TouchableOpacity style={styles.itemRow} activeOpacity={0.7}>
          <Text style={[typography.body, { color: colors.textPrimary }]}>Privacy Policy</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>›</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.itemRow} activeOpacity={0.7}>
          <Text style={[typography.body, { color: colors.textPrimary }]}>Terms of Service</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>›</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.itemRow}>
          <Text style={[typography.body, { color: colors.textPrimary }]}>About GenSticker</Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>v1.0.0 (Scaffold)</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    width: '100%',
  },
});
