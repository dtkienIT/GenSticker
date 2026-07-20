import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, rightAction }) => {
  const { colors, typography, spacing } = useAppTheme();

  return (
    <View style={[styles.container, { marginBottom: spacing.md }]}>
      <View style={styles.textColumn}>
        <Text style={[typography.h2, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightAction ? <View style={styles.action}>{rightAction}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textColumn: {
    flex: 1,
  },
  action: {
    marginLeft: 12,
  },
});
