import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../src/components/common/ScreenContainer';
import { AppButton } from '../src/components/common/AppButton';
import { SectionHeader } from '../src/components/common/SectionHeader';
import { StyleCard } from '../src/components/sticker/StyleCard';
import { StickerCard } from '../src/components/sticker/StickerCard';
import { STICKER_STYLES } from '../src/constants/styles';
import { useStickerStore } from '../src/store/useStickerStore';
import { useAppTheme } from '../src/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const savedStickers = useStickerStore((state) => state.savedStickers);

  return (
    <ScreenContainer scrollable>
      {/* Hero Header */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.card,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={styles.heroBadge}>✨ AI Powered</Text>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary }}>
            {process.env.EXPO_PUBLIC_USE_MOCK_SERVICE === 'true'
              ? '🟢 Mock Mode'
              : '🔵 Local API Mode'}
          </Text>
        </View>
        <Text style={[typography.h1, { color: colors.textPrimary, marginTop: spacing.xs }]}>
          Create stickers with AI
        </Text>
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md },
          ]}
        >
          Transform text prompts & selfies into personalized expressive stickers instantly.
        </Text>

        <View style={styles.ctaRow}>
          <AppButton
            title="Create from Text"
            variant="primary"
            style={styles.ctaButton}
            onPress={() => router.push('/create/text')}
          />
          <AppButton
            title="Create from Selfie"
            variant="secondary"
            style={styles.ctaButton}
            onPress={() => router.push('/create/selfie')}
          />
        </View>
      </View>

      {/* Navigation Quick Bar */}
      <View style={[styles.navQuickBar, { marginVertical: spacing.md }]}>
        <TouchableOpacity
          style={[
            styles.navChip,
            { backgroundColor: colors.primaryLight, borderRadius: borderRadius.full },
          ]}
          onPress={() => router.push('/create')}
        >
          <Text style={[typography.bodyBold, { color: colors.primary }]}>✨ Create</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navChip,
            {
              backgroundColor: colors.card,
              borderRadius: borderRadius.full,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
          onPress={() => router.push('/library')}
        >
          <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
            📚 Library ({savedStickers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navChip,
            {
              backgroundColor: colors.card,
              borderRadius: borderRadius.full,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
          onPress={() => router.push('/settings')}
        >
          <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Popular Styles Section */}
      <SectionHeader title="Popular Styles" subtitle="Explore AI aesthetics for your stickers" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: spacing.md, marginBottom: spacing.lg }}
      >
        {STICKER_STYLES.map((styleOpt) => (
          <StyleCard
            key={styleOpt.id}
            styleOption={styleOpt}
            onSelect={() =>
              router.push({ pathname: '/create/text', params: { style: styleOpt.id } })
            }
          />
        ))}
      </ScrollView>

      {/* Recent Stickers Section */}
      <SectionHeader
        title="Recent Stickers"
        subtitle="Your generated sticker collection"
        rightAction={
          savedStickers.length > 0 ? (
            <TouchableOpacity onPress={() => router.push('/library')}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>View All</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {savedStickers.length === 0 ? (
        <View
          style={[
            styles.emptyRecent,
            { backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.lg },
          ]}
        >
          <Text style={styles.emptyEmoji}>🎨</Text>
          <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: spacing.xs }]}>
            No stickers saved yet
          </Text>
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
            ]}
          >
            Tap "Create from Text" or "Create from Selfie" above to generate your first AI sticker!
          </Text>
        </View>
      ) : (
        <View style={styles.gridContainer}>
          {savedStickers.slice(0, 4).map((sticker) => (
            <View key={sticker.id} style={styles.gridItem}>
              <StickerCard sticker={sticker} onPress={() => router.push('/library')} />
            </View>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderWidth: 1,
    marginBottom: 16,
  },
  heroBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ctaRow: {
    flexDirection: 'column',
    gap: 10,
  },
  ctaButton: {
    width: '100%',
  },
  navQuickBar: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  navChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyRecent: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 8,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
  },
});
