import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { StickerEmotionOption } from '../../types/sticker';
import { useAppTheme } from '../../theme';

export interface EmotionChipProps {
  emotionOption: StickerEmotionOption;
  selected?: boolean;
  onSelect?: () => void;
}

export const EmotionChip: React.FC<EmotionChipProps> = ({
  emotionOption,
  selected = false,
  onSelect,
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onSelect}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderRadius: borderRadius.full,
          borderColor: selected ? colors.primary : colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs + 2,
        },
      ]}
    >
      <Text style={styles.emoji}>{emotionOption.emoji}</Text>
      <Text
        style={[
          typography.bodyBold,
          {
            color: selected ? '#FFFFFF' : colors.textPrimary,
            marginLeft: spacing.xs,
          },
        ]}
      >
        {emotionOption.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  emoji: {
    fontSize: 16,
  },
});
