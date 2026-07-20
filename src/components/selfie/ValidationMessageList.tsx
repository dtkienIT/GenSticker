import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme';

export type ValidationMessageSeverity = 'error' | 'warning' | 'info';

export interface ValidationMessageItem {
  id: string;
  message: string;
  title?: string;
  severity?: ValidationMessageSeverity;
}

export interface ValidationMessageListProps {
  items: readonly ValidationMessageItem[];
  title?: string;
}

const iconForSeverity: Record<ValidationMessageSeverity, string> = {
  error: '!',
  warning: '!',
  info: 'i',
};

export const ValidationMessageList: React.FC<ValidationMessageListProps> = ({ items, title }) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  if (items.length === 0) return null;

  const colorForSeverity = (severity: ValidationMessageSeverity) => {
    if (severity === 'error') return colors.error;
    if (severity === 'warning') return colors.warning;
    return colors.primary;
  };

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.md,
          padding: spacing.md,
        },
      ]}
    >
      {title ? (
        <Text
          style={[typography.bodyBold, { color: colors.textPrimary, marginBottom: spacing.sm }]}
        >
          {title}
        </Text>
      ) : null}
      {items.map((item, index) => {
        const severity = item.severity ?? 'error';
        const accentColor = colorForSeverity(severity);
        return (
          <View key={item.id} style={[styles.item, { marginTop: index === 0 ? 0 : spacing.sm }]}>
            <View
              style={[
                styles.icon,
                { backgroundColor: accentColor, borderRadius: borderRadius.full },
              ]}
            >
              <Text style={styles.iconText}>{iconForSeverity[severity]}</Text>
            </View>
            <View style={styles.copy}>
              {item.title ? (
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>
              ) : null}
              <Text style={[typography.body, { color: colors.textSecondary }]}>{item.message}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    width: '100%',
  },
  copy: {
    flex: 1,
  },
  icon: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    width: 24,
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  item: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
});
