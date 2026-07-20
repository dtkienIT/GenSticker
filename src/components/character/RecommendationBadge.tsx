import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme';

export interface RecommendationBadgeProps {
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export const RecommendationBadge: React.FC<RecommendationBadgeProps> = ({
  label = 'Đề xuất',
  style,
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        styles.container,
        {
          backgroundColor: colors.primaryLight,
          borderColor: colors.primary,
          borderRadius: borderRadius.full,
          paddingHorizontal: spacing.sm,
        },
        style,
      ]}
    >
      <Text style={[styles.star, { color: colors.primary }]}>★</Text>
      <Text style={[typography.caption, styles.label, { color: colors.primary }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 30,
  },
  label: {
    fontWeight: '700',
    marginLeft: 4,
  },
  star: {
    fontSize: 13,
  },
});
