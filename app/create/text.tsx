import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { textToStickerSchema, TextToStickerFormData } from '../../src/validation/stickerSchemas';
import { useStickerStore } from '../../src/store/useStickerStore';
import { useAppTheme } from '../../src/theme';
import { StickerStyle } from '../../src/types/sticker';

export default function TextToStickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ style?: string }>();
  const { colors, spacing, typography } = useAppTheme();
  const setDraft = useStickerStore((state) => state.setDraft);

  const initialStyle = (params.style as StickerStyle) || 'chibi';

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TextToStickerFormData>({
    resolver: zodResolver(textToStickerSchema),
    defaultValues: {
      prompt: '',
      style: initialStyle,
      emotion: 'happy',
      stickerText: '',
    },
  });

  useEffect(() => {
    if (params.style) {
      setValue('style', params.style as StickerStyle);
    }
  }, [params.style, setValue]);

  const onSubmit = (data: TextToStickerFormData) => {
    setDraft({
      mode: 'text',
      prompt: data.prompt,
      style: data.style,
      emotion: data.emotion,
      stickerText: data.stickerText,
    });
    router.push('/create/generating');
  };

  return (
    <ScreenContainer scrollable>
      <SectionHeader
        title="Text to Sticker"
        subtitle="Describe what sticker you want AI to generate"
      />

      {/* Prompt Input */}
      <Controller
        control={control}
        name="prompt"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppTextInput
            label="Sticker Prompt *"
            placeholder="e.g. A cute cat wearing astronaut helmet drinking boba"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.prompt?.message}
            multiline
            numberOfLines={3}
            style={{ height: 80, textAlignVertical: 'top' }}
          />
        )}
      />

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
            nestedScrollEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.styleList}
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
      {errors.style?.message ? (
        <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>
          {errors.style.message}
        </Text>
      ) : null}

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
      {errors.emotion?.message ? (
        <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>
          {errors.emotion.message}
        </Text>
      ) : null}

      {/* Optional Sticker Text */}
      <Controller
        control={control}
        name="stickerText"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppTextInput
            label="Sticker Overlay Text (Optional)"
            placeholder="e.g. COOL!, OK, LFG! (Max 40 chars)"
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
        title="Generate Sticker"
        variant="primary"
        size="lg"
        style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}
        onPress={handleSubmit(onSubmit)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  styleList: {
    width: '100%',
    flexGrow: 0,
  },
  emotionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
