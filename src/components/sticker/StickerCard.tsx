import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { GeneratedSticker } from '../../types/sticker';
import { useAppTheme } from '../../theme';

export interface StickerCardProps {
  sticker: GeneratedSticker;
  onPress?: () => void;
  onDelete?: () => void;
}

export const StickerCard: React.FC<StickerCardProps> = ({ sticker, onPress, onDelete }) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

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
      <View style={styles.imageContainer}>
        <Image source={{ uri: sticker.imageUri }} style={styles.image} resizeMode="contain" />
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>{sticker.style.toUpperCase()}</Text>
        </View>
      </View>
      <View style={[styles.content, { padding: spacing.sm }]}>
        <Text
          style={[typography.caption, { color: colors.textPrimary, fontWeight: '600' }]}
          numberOfLines={1}
        >
          {sticker.stickerText || sticker.prompt || `${sticker.emotion} sticker`}
        </Text>
        <View style={styles.footer}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {formatDate(sticker.createdAt)}
          </Text>
          {onDelete ? (
            <TouchableOpacity
              onPress={onDelete}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={{ color: colors.error, fontSize: 14 }}>🗑️</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    width: 120,
    height: 120,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  content: {
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});
