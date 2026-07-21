import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { GallerySticker } from '../../services/assets/types';
import { useAppTheme } from '../../theme';

export interface StickerCardProps {
  sticker: GallerySticker;
  onPress?: () => void;
  onDelete?: () => void;
}

export const StickerCard: React.FC<StickerCardProps> = ({ sticker, onPress, onDelete }) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: borderRadius.md,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.imageContainer, { backgroundColor: colors.surface }]}>
        <Image source={{ uri: sticker.localUri }} style={styles.image} resizeMode="contain" />
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>{sticker.stylePresetId.toUpperCase()}</Text>
        </View>
      </View>
      <View style={[styles.content, { padding: spacing.sm }]}>
        <Text
          style={[typography.caption, { color: colors.textPrimary, fontWeight: '600' }]}
          numberOfLines={2}
        >
          {sticker.prompt}
        </Text>
        <View style={styles.footer}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {new Date(sticker.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          {onDelete ? (
            <TouchableOpacity
              accessibilityLabel="Delete sticker"
              hitSlop={10}
              onPress={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              <Text style={{ color: colors.error, fontSize: 16 }}>Delete</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  imageContainer: {
    width: '100%',
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: { width: 132, height: 132 },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' },
  content: { minHeight: 76, justifyContent: 'space-between' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
});
