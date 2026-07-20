import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { TextPlacement } from '../../services/contracts';
import { useAppTheme } from '../../theme';

export interface CheckerboardPreviewProps {
  imageUri?: string | null;
  text?: string;
  placement?: TextPlacement;
  fontSize?: number;
  textColor?: string;
  accessibilityLabel?: string;
  emptyMessage?: string;
}

const CHECKERBOARD_CELLS = Array.from({ length: 64 }, (_, index) => index);

const alignmentForPlacement: Record<TextPlacement, 'flex-start' | 'center' | 'flex-end'> = {
  top: 'flex-start',
  center: 'center',
  bottom: 'flex-end',
};

export const CheckerboardPreview: React.FC<CheckerboardPreviewProps> = ({
  imageUri,
  text = '',
  placement = 'bottom',
  fontSize = 32,
  textColor = '#FFFFFF',
  accessibilityLabel = 'Bản xem trước hình dán trên nền ô trong suốt',
  emptyMessage = 'Chọn một hình dán để xem trước.',
}) => {
  const { colors, borderRadius, isDark, spacing, typography } = useAppTheme();
  const lightCell = isDark ? '#334155' : '#FFFFFF';
  const darkCell = isDark ? '#475569' : '#D1D5DB';

  return (
    <View
      accessible
      accessibilityLabel={`${accessibilityLabel}${text ? `. Nội dung: ${text}` : ''}`}
      style={[
        styles.container,
        {
          borderColor: colors.border,
          borderRadius: borderRadius.lg,
        },
      ]}
    >
      <View pointerEvents="none" style={styles.checkerboard}>
        {CHECKERBOARD_CELLS.map((cell) => {
          const row = Math.floor(cell / 8);
          const column = cell % 8;
          return (
            <View
              key={cell}
              style={[
                styles.cell,
                { backgroundColor: (row + column) % 2 === 0 ? lightCell : darkCell },
              ]}
            />
          );
        })}
      </View>

      {imageUri ? (
        <Image resizeMode="contain" source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <View style={[styles.empty, { padding: spacing.lg }]}>
          <Text style={styles.emptyIcon}>🖼️</Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            {emptyMessage}
          </Text>
        </View>
      )}

      {text ? (
        <View
          pointerEvents="none"
          style={[
            styles.textOverlay,
            { justifyContent: alignmentForPlacement[placement], padding: spacing.md },
          ]}
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.55}
            numberOfLines={3}
            style={[
              styles.stickerText,
              {
                color: textColor,
                fontSize,
                lineHeight: Math.round(fontSize * 1.12),
              },
            ]}
          >
            {text}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  cell: {
    aspectRatio: 1,
    width: '12.5%',
  },
  checkerboard: {
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  container: {
    alignItems: 'center',
    aspectRatio: 1,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  image: {
    bottom: 0,
    height: '100%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    width: '100%',
  },
  stickerText: {
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.72)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
    width: '100%',
  },
  textOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
