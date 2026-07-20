import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme';

export interface ProfilePresetOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface ProfilePresetPickerBaseProps<T extends string> {
  label: string;
  options: readonly ProfilePresetOption<T>[];
  helperText?: string;
  disabled?: boolean;
}

interface SingleProfilePresetPickerProps<T extends string> extends ProfilePresetPickerBaseProps<T> {
  multiple?: false;
  value: T;
  onChange: (value: T) => void;
}

interface MultiProfilePresetPickerProps<T extends string> extends ProfilePresetPickerBaseProps<T> {
  multiple: true;
  value: readonly T[];
  onChange: (value: T[]) => void;
}

export type ProfilePresetPickerProps<T extends string> =
  SingleProfilePresetPickerProps<T> | MultiProfilePresetPickerProps<T>;

export function ProfilePresetPicker<T extends string>(
  props: ProfilePresetPickerProps<T>,
): React.ReactElement {
  const { colors, borderRadius, spacing, typography } = useAppTheme();

  const isSelected = (value: T): boolean =>
    props.multiple === true ? props.value.includes(value) : props.value === value;

  const choose = (value: T) => {
    if (props.disabled) return;
    if (props.multiple === true) {
      const current = props.value;
      props.onChange(
        current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
      );
      return;
    }
    props.onChange(value);
  };

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.textPrimary }]}>
        {props.label}
      </Text>
      {props.helperText ? (
        <Text
          style={[
            typography.caption,
            { color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.xs },
          ]}
        >
          {props.helperText}
        </Text>
      ) : null}
      <View style={[styles.options, { marginTop: props.helperText ? 0 : spacing.sm }]}>
        {props.options.map((option) => {
          const selected = isSelected(option.value);
          const isDisabled = props.disabled || option.disabled;
          return (
            <Pressable
              accessibilityLabel={option.label}
              accessibilityRole={props.multiple === true ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: selected, disabled: isDisabled }}
              disabled={isDisabled}
              key={option.value}
              onPress={() => choose(option.value)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected ? colors.primaryLight : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: borderRadius.md,
                  opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                },
              ]}
            >
              <View style={styles.optionCopy}>
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                  {option.label}
                </Text>
                {option.description ? (
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                    {option.description}
                  </Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.selection,
                  {
                    backgroundColor: selected ? colors.primary : 'transparent',
                    borderColor: selected ? colors.primary : colors.border,
                    borderRadius: props.multiple === true ? borderRadius.xs : borderRadius.full,
                  },
                ]}
              >
                {selected ? <Text style={styles.check}>✓</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  check: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  container: {
    width: '100%',
  },
  option: {
    alignItems: 'center',
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 52,
  },
  optionCopy: {
    flex: 1,
    paddingRight: 12,
  },
  options: {
    gap: 8,
  },
  selection: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
});
