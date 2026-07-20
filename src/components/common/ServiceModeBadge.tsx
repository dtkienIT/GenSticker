import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme';

export type ServiceMode = 'mock' | 'http';

export interface ServiceModeBadgeProps {
  mode: ServiceMode;
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ServiceModeBadge: React.FC<ServiceModeBadgeProps> = ({
  mode,
  label,
  style,
  testID,
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const isMock = mode === 'mock';
  const resolvedLabel = label ?? (isMock ? 'Chế độ mô phỏng' : 'Dịch vụ API');
  const accentColor = isMock ? colors.warning : colors.success;

  return (
    <View
      accessible
      accessibilityLabel={`Dịch vụ hiện tại: ${resolvedLabel}`}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: accentColor,
          borderRadius: borderRadius.full,
          paddingHorizontal: spacing.sm,
        },
        style,
      ]}
      testID={testID}
    >
      <View style={[styles.dot, { backgroundColor: accentColor }]} />
      <Text style={[typography.caption, styles.label, { color: colors.textPrimary }]}>
        {resolvedLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 32,
  },
  dot: {
    borderRadius: 5,
    height: 8,
    width: 8,
  },
  label: {
    fontWeight: '600',
    marginLeft: 6,
  },
});
