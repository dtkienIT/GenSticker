import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import type { StickerStyleOption } from '../../constants/styles';
import { useAppTheme } from '../../theme';

export interface StyleCardProps {
  styleOption: StickerStyleOption;
  selected?: boolean;
  onSelect?: () => void;
}

export const StyleCard: React.FC<StyleCardProps> = ({
  styleOption,
  selected = false,
  onSelect,
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onSelect}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: borderRadius.md,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
          padding: spacing.md,
        },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: styleOption.previewColor + '20',
            borderRadius: borderRadius.sm,
          },
        ]}
      >
        <Text style={styles.emoji}>{styleOption.emoji}</Text>
      </View>
      <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: spacing.xs }]}>
        {styleOption.name}
      </Text>
      <Text
        style={[
          typography.caption,
          { color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
        ]}
        numberOfLines={2}
      >
        {styleOption.description}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainer: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
});
