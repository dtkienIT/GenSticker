import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { deletePack, getPack } from '@/api/client';
import { safeErrorMessage } from '@/api/errors';
import { StickerGrid } from '@/components/sticker-grid';
import { Button, Pill, Screen, StateView } from '@/components/ui';
import { shareSticker } from '@/features/share';
import { colors, spacing } from '@/theme/tokens';

export default function PackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string>();
  const pack = useQuery({ queryKey: ['pack', id], queryFn: () => getPack(id), enabled: Boolean(id) });
  const remove = useMutation({
    mutationFn: () => deletePack(id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['pack', id], exact: true });
      await queryClient.invalidateQueries({ queryKey: ['packs'] });
      router.replace('/(tabs)/library');
    },
  });

  const share = async (stickerId: string) => {
    setSharingId(stickerId);
    setShareError(undefined);
    try {
      await shareSticker(stickerId);
    } catch (error) {
      setShareError(safeErrorMessage(error));
    } finally {
      setSharingId(null);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Gỡ khỏi thư viện?',
      'Liên kết bộ sticker đã lưu sẽ được gỡ. Ảnh nguồn và output demo vẫn tuân theo thời hạn lưu trữ chưa được chốt; đây chưa phải xóa dữ liệu toàn hệ thống.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Gỡ khỏi thư viện', style: 'destructive', onPress: () => remove.mutate() },
      ],
    );
  };

  if (pack.isLoading) {
    return <Screen scroll={false}><StateView body="Đang tải sticker đã lưu…" icon="albums-outline" loading title="Mở bộ sticker" /></Screen>;
  }
  if (pack.isError || !pack.data) {
    return <Screen scroll={false}><StateView action={<Button label="Quay lại thư viện" onPress={() => router.replace('/(tabs)/library')} />} body={pack.isError ? safeErrorMessage(pack.error) : 'Không tìm thấy bộ sticker.'} icon="alert-circle-outline" title="Chưa mở được bộ sticker" /></Screen>;
  }

  return (
    <Screen>
      <View style={styles.heading}>
        <Pill tone="green">RIÊNG TƯ · ĐÃ LƯU</Pill>
        <Text style={styles.title}>{pack.data.name}</Text>
        <Text style={styles.body}>Chạm biểu tượng chia sẻ trên từng sticker để mở bảng chia sẻ của điện thoại.</Text>
      </View>
      <StickerGrid
        onShare={(stickerId) => void share(stickerId)}
        sharingId={sharingId}
        stickers={pack.data.stickers.toSorted((a, b) => a.ordinal - b.ordinal)}
      />
      {shareError ? <Text style={styles.error}>{shareError}</Text> : null}
      {remove.isError ? <Text style={styles.error}>{safeErrorMessage(remove.error)}</Text> : null}
      <Button label="Gỡ khỏi thư viện" loading={remove.isPending} onPress={confirmDelete} variant="danger" />
      <Text style={styles.footnote}>
        Thao tác này chỉ gỡ saved-pack association. Bản đã chia sẻ ra ngoài không thể thu hồi;
        source/output demo còn theo retention chưa chốt.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.md },
  title: { color: colors.ink, fontSize: 29, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 22 },
  error: { color: colors.danger, textAlign: 'center' },
  footnote: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
