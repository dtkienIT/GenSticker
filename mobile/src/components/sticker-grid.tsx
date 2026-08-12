import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getStickerAssetUrl } from '@/api/client';
import type { Sticker } from '@/api/contracts';
import { getAuthHeaders } from '@/auth/auth';
import { IS_DEMO } from '@/config/env';
import { colors, radii, spacing } from '@/theme/tokens';

type Props = {
  stickers: Sticker[];
  selectedIds?: Set<string>;
  onToggle?: ((stickerId: string) => void) | undefined;
  onShare?: (stickerId: string) => void;
  sharingId?: string | null;
};

export function StickerGrid({ stickers, selectedIds, onToggle, onShare, sharingId }: Props) {
  const [headers, setHeaders] = useState<Record<string, string>>();
  const [inspected, setInspected] = useState<Sticker | null>(null);

  useEffect(() => {
    let mounted = true;
    void getAuthHeaders().then((value) => {
      if (mounted) setHeaders(value);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.grid}>
      {stickers.map((sticker) => {
        const selected = selectedIds?.has(sticker.id) ?? false;
        return (
          <View key={sticker.id} style={[styles.card, selected && styles.cardSelected]}>
            <Pressable
              accessibilityLabel={`Sticker ${sticker.ordinal}`}
              accessibilityHint={onToggle ? 'Chạm để thay đổi lựa chọn' : 'Chạm để xem sticker toàn màn hình'}
              accessibilityRole={onToggle ? 'checkbox' : 'button'}
              accessibilityState={onToggle ? { checked: selected } : undefined}
              onPress={() => (onToggle ? onToggle(sticker.id) : setInspected(sticker))}
              style={styles.imageButton}
            >
              {headers ? (
                <Image
                  cachePolicy="memory"
                  contentFit="contain"
                  source={{
                    uri: getStickerAssetUrl(sticker.id),
                    headers,
                  }}
                  style={styles.image}
                  transition={180}
                />
              ) : (
                <ActivityIndicator color={colors.primary} />
              )}
              {onToggle ? (
                <View style={[styles.check, selected && styles.checkSelected]}>
                  {selected ? <Ionicons color={colors.white} name="checkmark" size={16} /> : null}
                </View>
              ) : null}
              {IS_DEMO ? (
                <View style={styles.demo}><Text style={styles.demoText}>MOCK</Text></View>
              ) : null}
            </Pressable>
            <View style={styles.footer}>
              <Text style={styles.number}>#{sticker.ordinal}</Text>
              <View style={styles.footerActions}>
                <Pressable
                  accessibilityHint="Mở bản xem lớn mà không thay đổi lựa chọn"
                  accessibilityLabel={`Xem lớn sticker ${sticker.ordinal}`}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setInspected(sticker)}
                >
                  <Ionicons color={colors.primary} name="expand-outline" size={20} />
                </Pressable>
                {onShare ? (
                  <Pressable
                    accessibilityLabel={`Chia sẻ sticker ${sticker.ordinal}`}
                    accessibilityRole="button"
                    disabled={sharingId === sticker.id}
                    hitSlop={8}
                    onPress={() => onShare(sticker.id)}
                  >
                    {sharingId === sticker.id ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <Ionicons color={colors.primary} name="share-outline" size={20} />
                    )}
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
      <Modal
        animationType="fade"
        onRequestClose={() => setInspected(null)}
        presentationStyle="fullScreen"
        visible={Boolean(inspected)}
      >
        <SafeAreaView accessibilityViewIsModal style={styles.modal}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>XEM CHI TIẾT</Text>
              <Text style={styles.modalTitle}>Sticker #{inspected?.ordinal}</Text>
            </View>
            <Pressable
              accessibilityLabel="Đóng xem chi tiết sticker"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setInspected(null)}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}
            >
              <Ionicons color={colors.ink} name="close" size={27} />
            </Pressable>
          </View>
          <View style={styles.modalImageFrame}>
            {inspected && headers ? (
              <Image
                accessibilityLabel={`Bản xem lớn sticker ${inspected.ordinal}`}
                cachePolicy="memory"
                contentFit="contain"
                source={{ uri: getStickerAssetUrl(inspected.id), headers }}
                style={styles.modalImage}
              />
            ) : (
              <ActivityIndicator color={colors.primary} size="large" />
            )}
            {IS_DEMO ? (
              <View style={styles.modalDemo}>
                <Text style={styles.modalDemoText}>OUTPUT MOCK</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.modalHelp}>
            Đóng để quay lại bộ sticker. Lựa chọn hiện tại của bạn vẫn được giữ nguyên.
          </Text>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  cardSelected: { borderColor: colors.primary },
  imageButton: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  image: { width: '100%', height: '100%' },
  check: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: '#FFFFFFB8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: { backgroundColor: colors.primary },
  demo: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: '#201A17CC',
  },
  demoText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  footer: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  number: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  modal: { flex: 1, backgroundColor: colors.canvas, padding: spacing.lg },
  modalHeader: {
    minHeight: 68,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
  },
  modalEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  modalTitle: { color: colors.ink, fontSize: 23, fontWeight: '900', marginTop: spacing.xs },
  closeButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: { opacity: 0.65 },
  modalImageFrame: {
    flex: 1,
    marginVertical: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: { width: '100%', height: '100%' },
  modalDemo: {
    position: 'absolute',
    left: spacing.lg,
    top: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: '#201A17D9',
  },
  modalDemoText: { color: colors.white, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  modalHelp: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
