import React from 'react';
import { Alert, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { StickerCard } from '@/components/sticker/StickerCard';
import { useStickerStore } from '@/store/useStickerStore';

export default function LibraryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const gallery = useStickerStore((state) => state.gallery);
  const deleteAsset = useStickerStore((state) => state.deleteAsset);
  const selectAsset = useStickerStore((state) => state.selectAsset);

  const confirmDelete = (assetId: string) => {
    Alert.alert('Delete sticker?', 'This removes the app-owned PNG and its local metadata.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteAsset(assetId) },
    ]);
  };

  return (
    <ScreenContainer scrollable>
      <SectionHeader
        title="My Stickers"
        subtitle={`${gallery.length} local sticker${gallery.length === 1 ? '' : 's'}`}
      />
      {gallery.length === 0 ? (
        <EmptyState
          icon="✨"
          title="Your gallery is empty"
          message="Successful transparent PNG generations appear here automatically."
          buttonTitle="Create a sticker"
          onButtonPress={() => router.replace('/')}
        />
      ) : (
        <View style={styles.grid}>
          {gallery.map((sticker) => (
            <View
              key={sticker.assetId}
              style={[styles.gridItem, { width: width >= 1024 ? '31.5%' : '48%' }]}
            >
              <StickerCard
                sticker={sticker}
                onDelete={() => confirmDelete(sticker.assetId)}
                onPress={() => {
                  void selectAsset(sticker.assetId).then(() => router.push('/create/result'));
                }}
              />
            </View>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  gridItem: {},
});
