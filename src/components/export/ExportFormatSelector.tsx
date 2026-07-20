import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ExportFormat } from '../../services/contracts';
import { useAppTheme } from '../../theme';

export interface ExportFormatSelectorProps {
  value: readonly ExportFormat[];
  onChange: (formats: ExportFormat[]) => void;
  availableFormats?: readonly ExportFormat[];
  disabled?: boolean;
  allowEmpty?: boolean;
  title?: string;
}

const FORMAT_COPY: Record<ExportFormat, { label: string; description: string }> = {
  png: { label: 'PNG', description: 'Nền trong suốt, tương thích rộng' },
  webp: { label: 'WebP', description: 'Tệp nhỏ gọn, chất lượng cao' },
  zip: { label: 'Gói ZIP', description: 'Tải toàn bộ bộ hình dán trong một gói' },
};

export const ExportFormatSelector: React.FC<ExportFormatSelectorProps> = ({
  value,
  onChange,
  availableFormats = ['png', 'webp', 'zip'],
  disabled = false,
  allowEmpty = false,
  title = 'Định dạng xuất',
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();

  const toggle = (format: ExportFormat) => {
    const selected = value.includes(format);
    if (selected && !allowEmpty && value.length === 1) return;
    onChange(selected ? value.filter((item) => item !== format) : [...value, format]);
  };

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={[typography.h3, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
        Chọn một hoặc nhiều định dạng phù hợp.
      </Text>
      <View style={[styles.options, { marginTop: spacing.md }]}>
        {availableFormats.map((format) => {
          const selected = value.includes(format);
          const isOnlySelected = selected && !allowEmpty && value.length === 1;
          return (
            <Pressable
              accessibilityHint={isOnlySelected ? 'Cần giữ lại ít nhất một định dạng' : undefined}
              accessibilityLabel={`${FORMAT_COPY[format].label}. ${FORMAT_COPY[format].description}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              key={format}
              onPress={() => toggle(format)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected ? colors.primaryLight : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: borderRadius.md,
                  opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
                  padding: spacing.md,
                },
              ]}
            >
              <View style={styles.copy}>
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                  {FORMAT_COPY[format].label}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  {FORMAT_COPY[format].description}
                </Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: selected ? colors.primary : 'transparent',
                    borderColor: selected ? colors.primary : colors.border,
                    borderRadius: borderRadius.xs,
                  },
                ]}
              >
                {selected ? <Text style={styles.check}>✓</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      {value.length === 0 ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[typography.caption, { color: colors.error, marginTop: spacing.sm }]}
        >
          Vui lòng chọn ít nhất một định dạng.
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  check: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  checkbox: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  container: {
    width: '100%',
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  option: {
    alignItems: 'center',
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 64,
  },
  options: {
    gap: 8,
  },
});
