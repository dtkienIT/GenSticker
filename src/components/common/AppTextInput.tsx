import React from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme';

export interface AppTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export const AppTextInput: React.FC<AppTextInputProps> = ({
  label,
  error,
  helperText,
  style,
  ...props
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();

  return (
    <View style={styles.container}>
      {label ? (
        <Text
          style={[typography.bodyBold, { color: colors.textPrimary, marginBottom: spacing.xs }]}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          typography.body,
          {
            backgroundColor: colors.card,
            color: colors.textPrimary,
            borderColor: error ? colors.error : colors.border,
            borderRadius: borderRadius.md,
            padding: spacing.md,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 6,
  },
  input: {
    borderWidth: 1,
  },
});
