import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { AppButton } from '../../src/components/common/AppButton';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { useStickerStore } from '../../src/store/useStickerStore';
import { useAppTheme } from '../../src/theme';

export default function ResultScreen() {
  const router = useRouter();
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const [isSaved, setIsSaved] = useState(false);

  const currentResult = useStickerStore((state) => state.currentResult);
  const saveSticker = useStickerStore((state) => state.saveSticker);
  const resetGeneration = useStickerStore((state) => state.resetGeneration);

  if (!currentResult) {
    return (
      <ScreenContainer scrollable={false} style={styles.emptyContainer}>
        <Text style={styles.emojiIcon}>🤔</Text>
        <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.sm }]}>
          No Sticker Result Found
        </Text>
        <Text
          style={[
            typography.body,
            {
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: spacing.xs,
              marginBottom: spacing.lg,
            },
          ]}
        >
          Please generate a sticker first before viewing this screen.
        </Text>
        <AppButton title="Go to Create" onPress={() => router.replace('/create')} />
      </ScreenContainer>
    );
  }

  const handleSave = () => {
    saveSticker(currentResult);
    setIsSaved(true);
    Alert.alert('Saved!', 'Sticker has been added to your library.');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my new AI Sticker generated with GenSticker! Style: ${currentResult.style}`,
      });
    } catch {
      // Ignored
    }
  };

  const handleCreateAnother = () => {
    resetGeneration();
    router.replace('/create');
  };

  return (
    <ScreenContainer scrollable>
      <SectionHeader
        title="Your AI Sticker"
        subtitle="Here is your newly generated expressive sticker!"
      />

      {/* Main Sticker Preview Box */}
      <View
        style={[
          styles.stickerDisplay,
          {
            backgroundColor: colors.card,
            borderRadius: borderRadius.lg,
            borderColor: colors.border,
            padding: spacing.xl,
          },
        ]}
      >
        <Image
          source={{ uri: currentResult.imageUri }}
          style={styles.stickerImage}
          resizeMode="contain"
        />

        {/* Info Tags */}
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>
              {currentResult.style.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.surface }]}>
            <Text style={[styles.tagText, { color: colors.textPrimary }]}>
              {currentResult.emotion.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.surface }]}>
            <Text style={[styles.tagText, { color: colors.textPrimary }]}>
              {currentResult.mode.toUpperCase()} MODE
            </Text>
          </View>
        </View>

        {currentResult.prompt ? (
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
            ]}
          >
            "{currentResult.prompt}"
          </Text>
        ) : null}

        {currentResult.stickerText ? (
          <Text
            style={[
              typography.bodyBold,
              { color: colors.primary, marginTop: spacing.xs, textAlign: 'center' },
            ]}
          >
            Overlay: "{currentResult.stickerText}"
          </Text>
        ) : null}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <AppButton
          title={isSaved ? 'Saved in Library ✓' : 'Save to Library'}
          variant={isSaved ? 'secondary' : 'primary'}
          size="lg"
          disabled={isSaved}
          onPress={handleSave}
          style={styles.actionButton}
        />

        <View style={styles.rowButtons}>
          <AppButton
            title="Regenerate"
            variant="outline"
            style={styles.halfButton}
            onPress={() => router.push('/create/generating')}
          />
          <AppButton
            title="Share Sticker"
            variant="outline"
            style={styles.halfButton}
            onPress={handleShare}
          />
        </View>

        <AppButton
          title="Create Another Sticker"
          variant="secondary"
          onPress={handleCreateAnother}
          style={styles.actionButton}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiIcon: {
    fontSize: 54,
  },
  stickerDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 20,
  },
  stickerImage: {
    width: 220,
    height: 220,
    marginBottom: 16,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    width: '100%',
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
});
