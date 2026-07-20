import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  characterProfileConfigSchema,
  type CharacterProfileConfig,
  type FaceAccessoryPreset,
} from '../../services/contracts';
import {
  PROFILE_PRESET_PRESENTATION,
  type PresetPresentationOption,
} from '../../constants/profilePresets';
import { useAppTheme } from '../../theme';
import { AppButton } from '../common/AppButton';
import { ProfilePresetOption, ProfilePresetPicker } from './ProfilePresetPicker';

export interface CharacterProfileFormProps {
  value: CharacterProfileConfig;
  onChange: (value: CharacterProfileConfig) => void;
  onSubmit?: (value: CharacterProfileConfig) => void;
  onReset?: () => void;
  onValidityChange?: (valid: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  hasUnsavedChanges?: boolean;
  submitLabel?: string;
  version?: number;
}

const toOptions = <T extends string>(
  options: readonly PresetPresentationOption<T>[],
): ProfilePresetOption<T>[] =>
  options.map((option) => ({
    value: option.id,
    label: option.label.vi,
    description: option.description.vi,
  }));

const hairStyleOptions = toOptions(PROFILE_PRESET_PRESENTATION.hairStyles);
const hairColorOptions = toOptions(PROFILE_PRESET_PRESENTATION.hairColors);
const accessoryOptions = toOptions(PROFILE_PRESET_PRESENTATION.faceAccessories);
const outfitOptions = toOptions(PROFILE_PRESET_PRESENTATION.outfits);
const styleOptions = toOptions(PROFILE_PRESET_PRESENTATION.styles);

export const CharacterProfileForm: React.FC<CharacterProfileFormProps> = ({
  value,
  onChange,
  onSubmit,
  onReset,
  onValidityChange,
  disabled = false,
  loading = false,
  hasUnsavedChanges = false,
  submitLabel = 'Lưu hồ sơ',
  version,
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const [showValidationError, setShowValidationError] = useState(false);
  const isValid = characterProfileConfigSchema.safeParse(value).success;

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const updateHair = (hair: CharacterProfileConfig['hair']) => onChange({ ...value, hair });

  const updateAccessories = (nextAccessories: FaceAccessoryPreset[]) => {
    const selectedNoneNow =
      nextAccessories.includes('none') && !value.faceAccessories.includes('none');
    let normalized = nextAccessories;
    if (selectedNoneNow) normalized = ['none'];
    else if (nextAccessories.length > 1)
      normalized = nextAccessories.filter((item) => item !== 'none');
    if (normalized.length > PROFILE_PRESET_PRESENTATION.constraints.faceAccessories.maxSelections) {
      normalized = normalized.slice(
        normalized.length - PROFILE_PRESET_PRESENTATION.constraints.faceAccessories.maxSelections,
      );
    }
    if (normalized.length === 0) normalized = ['none'];
    onChange({ ...value, faceAccessories: normalized });
  };

  const submit = () => {
    const validation = characterProfileConfigSchema.safeParse(value);
    setShowValidationError(!validation.success);
    if (validation.success) onSubmit?.(value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text accessibilityRole="header" style={[typography.h2, { color: colors.textPrimary }]}>
          Tùy chỉnh nhân vật
        </Text>
        {version ? (
          <View
            style={[
              styles.versionBadge,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.full,
                paddingHorizontal: spacing.sm,
              },
            ]}
          >
            <Text style={[typography.caption, { color: colors.textSecondary }]}>v{version}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
        Chọn các đặc điểm sản phẩm. Mỗi lần lưu sẽ tạo một phiên bản hồ sơ mới.
      </Text>

      {hasUnsavedChanges ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.notice,
            {
              backgroundColor: colors.surface,
              borderColor: colors.warning,
              borderRadius: borderRadius.md,
              marginTop: spacing.md,
              padding: spacing.sm,
            },
          ]}
        >
          <Text style={[typography.caption, { color: colors.textPrimary }]}>
            Bạn có thay đổi chưa lưu.
          </Text>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.lg }}>
        <ProfilePresetPicker
          disabled={disabled || loading}
          label="Kiểu tóc"
          onChange={(style) => updateHair({ ...value.hair, style })}
          options={hairStyleOptions}
          value={value.hair.style}
        />
      </View>
      <View style={{ marginTop: spacing.lg }}>
        <ProfilePresetPicker
          disabled={disabled || loading}
          label="Màu tóc"
          onChange={(color) => updateHair({ ...value.hair, color })}
          options={hairColorOptions}
          value={value.hair.color}
        />
      </View>
      <View style={{ marginTop: spacing.lg }}>
        <ProfilePresetPicker<FaceAccessoryPreset>
          disabled={disabled || loading}
          helperText="Có thể chọn nhiều phụ kiện."
          label="Kính và phụ kiện"
          multiple
          onChange={updateAccessories}
          options={accessoryOptions}
          value={value.faceAccessories}
        />
      </View>
      <View style={{ marginTop: spacing.lg }}>
        <ProfilePresetPicker
          disabled={disabled || loading}
          label="Trang phục"
          onChange={(outfit) => onChange({ ...value, outfit })}
          options={outfitOptions}
          value={value.outfit}
        />
      </View>
      <View style={{ marginTop: spacing.lg }}>
        <ProfilePresetPicker
          disabled={disabled || loading}
          label="Phong cách hình dán"
          onChange={(style) => onChange({ ...value, style })}
          options={styleOptions}
          value={value.style}
        />
      </View>

      {showValidationError ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[typography.caption, { color: colors.error, marginTop: spacing.md }]}
        >
          Cấu hình chưa hợp lệ. Vui lòng kiểm tra lại các lựa chọn.
        </Text>
      ) : null}

      {onSubmit ? (
        <View style={[styles.actions, { marginTop: spacing.xl }]}>
          {onReset && hasUnsavedChanges ? (
            <AppButton
              disabled={disabled || loading}
              onPress={onReset}
              style={styles.action}
              title="Hoàn tác"
              variant="outline"
            />
          ) : null}
          <AppButton
            disabled={disabled || !isValid}
            loading={loading}
            onPress={submit}
            style={styles.action}
            title={submitLabel}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  action: {
    flexGrow: 1,
    minHeight: 48,
    minWidth: 140,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notice: {
    borderWidth: 1,
  },
  versionBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30,
  },
});
