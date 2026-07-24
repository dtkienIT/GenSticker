import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { useAppTheme } from '../../src/theme';

export default function CreateScreen() {
  const router = useRouter();
  const { colors, borderRadius, spacing, typography } = useAppTheme();

  return (
    <ScreenContainer scrollable>
      <SectionHeader
        title="Choose Generation Mode"
        subtitle="How would you like to create your AI sticker today?"
      />

      {/* Option 1: Text to Sticker */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.optionCard,
          {
            backgroundColor: colors.card,
            borderRadius: borderRadius.lg,
            borderColor: colors.border,
            padding: spacing.lg,
            marginBottom: spacing.md,
          },
        ]}
        onPress={() => router.push('/create/text')}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
          <Text style={styles.icon}>✍️</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>Text to Sticker</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
            Describe any character, scene, or concept in words and generate custom stickers.
          </Text>
        </View>
        <Text style={[styles.arrow, { color: colors.primary }]}>→</Text>
      </TouchableOpacity>

      {/* Option 2: Image to Sticker */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.optionCard,
          {
            backgroundColor: colors.card,
            borderRadius: borderRadius.lg,
            borderColor: colors.border,
            padding: spacing.lg,
            marginBottom: spacing.md,
          },
        ]}
        onPress={() => router.push('/create/selfie')}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
          <Text style={styles.icon}>🤳</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>Ảnh thành Sticker</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
            Upload your photo to turn your face into fun cartoon, chibi, or 3D stickers.
          </Text>
        </View>
        <Text style={[styles.arrow, { color: colors.primary }]}>→</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 28,
  },
  textContainer: {
    flex: 1,
  },
  arrow: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
