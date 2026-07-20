import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { EmptyState } from '../../src/components/common/EmptyState';
import { StickerCard } from '../../src/components/sticker/StickerCard';
import { useStickerStore } from '../../src/store/useStickerStore';
export default function LibraryScreen() {
  const router = useRouter();
  const savedStickers = useStickerStore((state) => state.savedStickers);
  const removeSticker = useStickerStore((state) => state.removeSticker);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Sticker', 'Are you sure you want to remove this sticker?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeSticker(id),
      },
    ]);
  };

  return (
    <ScreenContainer scrollable>
      <SectionHeader
        title="Sticker Library"
        subtitle={`${savedStickers.length} sticker${savedStickers.length === 1 ? '' : 's'} saved`}
      />

      {savedStickers.length === 0 ? (
        <EmptyState
          icon="📚"
          title="Your Library is Empty"
          message="Saved stickers will appear here. Start creating custom AI stickers now!"
          buttonTitle="Create Sticker"
          onButtonPress={() => router.push('/create')}
        />
      ) : (
        <View style={styles.gridContainer}>
          {savedStickers.map((sticker) => (
            <View key={sticker.id} style={styles.gridItem}>
              <StickerCard sticker={sticker} onDelete={() => handleDelete(sticker.id)} />
            </View>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  gridItem: {
    width: '48%',
  },
});
