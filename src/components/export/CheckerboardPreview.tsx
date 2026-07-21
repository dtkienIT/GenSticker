import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme';

export interface CheckerboardPreviewProps {
  imageUri?: string | null;
  accessibilityLabel?: string;
  emptyMessage?: string;
}

const CELLS = Array.from({ length: 64 }, (_, index) => index);

export const CheckerboardPreview: React.FC<CheckerboardPreviewProps> = ({
  imageUri,
  accessibilityLabel = 'Sticker preview on a transparency checkerboard',
  emptyMessage = 'Generate a sticker to preview it here.',
}) => {
  const { colors, borderRadius, isDark, spacing, typography } = useAppTheme();
  const lightCell = isDark ? '#334155' : '#FFFFFF';
  const darkCell = isDark ? '#475569' : '#D1D5DB';

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, { borderColor: colors.border, borderRadius: borderRadius.lg }]}
    >
      <View pointerEvents="none" style={styles.checkerboard}>
        {CELLS.map((cell) => {
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
    </View>
  );
};

const styles = StyleSheet.create({
  cell: { aspectRatio: 1, width: '12.5%' },
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
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  image: {
    bottom: 0,
    height: '100%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    width: '100%',
  },
});
