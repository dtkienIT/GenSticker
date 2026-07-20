import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StickerTextConfig, TextPlacement } from '../../services/contracts';
import { useAppTheme } from '../../theme';
import { AppTextInput } from '../common/AppTextInput';

export interface StickerTextEditorProps {
  value: StickerTextConfig;
  onChange: (value: StickerTextConfig) => void;
  onValidityChange?: (valid: boolean) => void;
  disabled?: boolean;
  maxLength?: number;
  minFontSize?: number;
  maxFontSize?: number;
  fontSizeStep?: number;
  title?: string;
}

const PLACEMENT_OPTIONS: ReadonlyArray<{ value: TextPlacement; label: string }> = [
  { value: 'top', label: 'Phía trên' },
  { value: 'center', label: 'Ở giữa' },
  { value: 'bottom', label: 'Phía dưới' },
];

const characterCount = (value: string): number => Array.from(value).length;

export const StickerTextEditor: React.FC<StickerTextEditorProps> = ({
  value,
  onChange,
  onValidityChange,
  disabled = false,
  maxLength = 40,
  minFontSize = 18,
  maxFontSize = 56,
  fontSizeStep = 2,
  title = 'Thêm chữ vào hình dán',
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const count = characterCount(value.text);
  const hasOverflow = count > maxLength;
  const fontSizeInRange = value.fontSize >= minFontSize && value.fontSize <= maxFontSize;
  const isValid = !hasOverflow && fontSizeInRange;

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const setFontSize = (nextValue: number) =>
    onChange({ ...value, fontSize: Math.min(maxFontSize, Math.max(minFontSize, nextValue)) });

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={[typography.h3, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
        Chữ được đặt chính xác sau khi tạo ảnh và hỗ trợ đầy đủ tiếng Việt.
      </Text>

      <View style={{ marginTop: spacing.md }}>
        <AppTextInput
          accessibilityLabel="Nội dung trên hình dán"
          editable={!disabled}
          error={hasOverflow ? `Nội dung vượt quá ${maxLength} ký tự.` : undefined}
          helperText={`${count}/${maxLength} ký tự`}
          label="Nội dung"
          multiline
          onChangeText={(text) => onChange({ ...value, text })}
          placeholder="Ví dụ: Cố lên nhé!"
          style={styles.input}
          value={value.text}
        />
      </View>

      <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: spacing.md }]}>
        Vị trí chữ
      </Text>
      <View accessibilityRole="radiogroup" style={[styles.placements, { marginTop: spacing.sm }]}>
        {PLACEMENT_OPTIONS.map((option) => {
          const selected = value.placement === option.value;
          return (
            <Pressable
              accessibilityLabel={option.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              key={option.value}
              onPress={() => onChange({ ...value, placement: option.value })}
              style={({ pressed }) => [
                styles.placement,
                {
                  backgroundColor: selected ? colors.primaryLight : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: borderRadius.md,
                  opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
                  paddingHorizontal: spacing.sm,
                },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  styles.placementText,
                  { color: selected ? colors.primary : colors.textPrimary },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: spacing.lg }]}>
        Cỡ chữ
      </Text>
      <View style={[styles.fontControls, { marginTop: spacing.sm }]}>
        <Pressable
          accessibilityLabel="Giảm cỡ chữ"
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || value.fontSize <= minFontSize }}
          disabled={disabled || value.fontSize <= minFontSize}
          onPress={() => setFontSize(value.fontSize - fontSizeStep)}
          style={({ pressed }) => [
            styles.fontButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              opacity: disabled || value.fontSize <= minFontSize ? 0.45 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[typography.h3, { color: colors.textPrimary }]}>−</Text>
        </Pressable>
        <View
          accessible
          accessibilityLabel={`Cỡ chữ ${value.fontSize}`}
          style={[
            styles.fontValue,
            { backgroundColor: colors.surface, borderRadius: borderRadius.md },
          ]}
        >
          <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{value.fontSize}</Text>
        </View>
        <Pressable
          accessibilityLabel="Tăng cỡ chữ"
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || value.fontSize >= maxFontSize }}
          disabled={disabled || value.fontSize >= maxFontSize}
          onPress={() => setFontSize(value.fontSize + fontSizeStep)}
          style={({ pressed }) => [
            styles.fontButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              opacity: disabled || value.fontSize >= maxFontSize ? 0.45 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[typography.h3, { color: colors.textPrimary }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  fontButton: {
    alignItems: 'center',
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 56,
  },
  fontControls: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  fontValue: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    marginHorizontal: 8,
    minWidth: 72,
  },
  input: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  placement: {
    alignItems: 'center',
    borderWidth: 1.5,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 92,
  },
  placementText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  placements: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
