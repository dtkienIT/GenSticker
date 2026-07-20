import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { AppTextInput } from '../../src/components/common/AppTextInput';
import { AppButton } from '../../src/components/common/AppButton';
import { StyleCard } from '../../src/components/sticker/StyleCard';
import { EmotionChip } from '../../src/components/sticker/EmotionChip';
import { STICKER_STYLES } from '../../src/constants/styles';
import { STICKER_EMOTIONS } from '../../src/constants/emotions';
import {
  selfieToStickerSchema,
  SelfieToStickerFormData,
} from '../../src/validation/stickerSchemas';
import { useStickerStore } from '../../src/store/useStickerStore';
import { useAppTheme } from '../../src/theme';

export default function SelfieToStickerScreen() {
  const router = useRouter();
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const setDraft = useStickerStore((state) => state.setDraft);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SelfieToStickerFormData>({
    resolver: zodResolver(selfieToStickerSchema),
    defaultValues: {
      sourceImageUri: '',
      style: 'chibi',
      emotion: 'happy',
      stickerText: '',
    },
  });

  const sourceImageUri = watch('sourceImageUri');

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        alert('Permission to access media library is required to pick a selfie photo!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setValue('sourceImageUri', result.assets[0].uri, { shouldValidate: true });
      }
    } catch {
      alert('Error picking image. Please try again.');
    }
  };

  const removeImage = () => {
    setValue('sourceImageUri', '', { shouldValidate: true });
  };

  const onSubmit = (data: SelfieToStickerFormData) => {
    setDraft({
      mode: 'selfie',
      sourceImageUri: data.sourceImageUri,
      style: data.style,
      emotion: data.emotion,
      stickerText: data.stickerText,
    });
    router.push('/create/generating');
  };

  return (
    <ScreenContainer scrollable>
      <SectionHeader
        title="Selfie to Sticker"
        subtitle="Turn your selfie photo into a stylized AI sticker"
      />

      {/* Image Picker Section */}
      <Text style={[typography.bodyBold, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
        Upload Selfie Photo *
      </Text>

      {sourceImageUri ? (
        <View
          style={[
            styles.previewContainer,
            {
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              borderColor: colors.border,
              padding: spacing.md,
            },
          ]}
        >
          <Image source={{ uri: sourceImageUri }} style={styles.previewImage} />
          <View style={styles.previewActions}>
            <AppButton title="Reselect Photo" variant="secondary" size="sm" onPress={pickImage} />
            <AppButton title="Remove" variant="danger" size="sm" onPress={removeImage} />
          </View>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={pickImage}
          style={[
            styles.uploadPlaceholder,
            {
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              borderColor: errors.sourceImageUri ? colors.error : colors.border,
              padding: spacing.xl,
            },
          ]}
        >
          <Text style={styles.uploadIcon}>📷</Text>
          <Text style={[typography.bodyBold, { color: colors.primary, marginTop: spacing.xs }]}>
            Tap to choose photo from gallery
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            Clear front-facing selfie recommended
          </Text>
        </TouchableOpacity>
      )}

      {errors.sourceImageUri?.message ? (
        <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>
          {errors.sourceImageUri.message}
        </Text>
      ) : null}

      {/* Style Selection */}
      <Text
        style={[
          typography.bodyBold,
          { color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
        ]}
      >
        Select Style *
      </Text>
      <Controller
        control={control}
        name="style"
        render={({ field: { value, onChange } }) => (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: spacing.xs }}
          >
            {STICKER_STYLES.map((styleOpt) => (
              <StyleCard
                key={styleOpt.id}
                styleOption={styleOpt}
                selected={value === styleOpt.id}
                onSelect={() => onChange(styleOpt.id)}
              />
            ))}
          </ScrollView>
        )}
      />

      {/* Emotion Selection */}
      <Text
        style={[
          typography.bodyBold,
          { color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
        ]}
      >
        Select Emotion *
      </Text>
      <Controller
        control={control}
        name="emotion"
        render={({ field: { value, onChange } }) => (
          <View style={styles.emotionContainer}>
            {STICKER_EMOTIONS.map((emotionOpt) => (
              <EmotionChip
                key={emotionOpt.id}
                emotionOption={emotionOpt}
                selected={value === emotionOpt.id}
                onSelect={() => onChange(emotionOpt.id)}
              />
            ))}
          </View>
        )}
      />

      {/* Optional Sticker Text */}
      <Controller
        control={control}
        name="stickerText"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppTextInput
            label="Sticker Overlay Text (Optional)"
            placeholder="e.g. ME MOOD! (Max 40 chars)"
            value={value || ''}
            onChangeText={onChange}
            onBlur={onBlur}
            maxLength={40}
            error={errors.stickerText?.message}
          />
        )}
      />

      {/* Generate Button */}
      <AppButton
        title="Generate Selfie Sticker"
        variant="primary"
        size="lg"
        style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}
        onPress={handleSubmit(onSubmit)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  uploadPlaceholder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: 40,
  },
  previewContainer: {
    alignItems: 'center',
    borderWidth: 1,
  },
  previewImage: {
    width: 140,
    height: 140,
    borderRadius: 16,
    marginBottom: 12,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  emotionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
