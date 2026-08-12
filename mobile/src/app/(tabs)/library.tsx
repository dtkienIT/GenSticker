import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getPacks } from '@/api/client';
import { safeErrorMessage } from '@/api/errors';
import { Button, Card, Screen, StateView } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';

export default function LibraryScreen() {
  const packs = useQuery({ queryKey: ['packs'], queryFn: getPacks });
  const refetchPacks = packs.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetchPacks();
    }, [refetchPacks]),
  );

  if (packs.isLoading) {
    return <Screen scroll={false}><StateView body="Đang tải các bộ sticker riêng tư…" icon="albums-outline" loading title="Mở thư viện" /></Screen>;
  }
  if (packs.isError) {
    return <Screen scroll={false}><StateView action={<Button label="Thử lại" onPress={() => void packs.refetch()} />} body={safeErrorMessage(packs.error)} icon="cloud-offline-outline" title="Chưa tải được thư viện" /></Screen>;
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>KHÔNG GIAN RIÊNG TƯ</Text>
        <Text style={styles.title}>Thư viện của bạn</Text>
        <Text style={styles.body}>Chỉ các sticker bạn chủ động chọn mới xuất hiện tại đây.</Text>
      </View>
      {!packs.data?.length ? (
        <StateView
          action={<Button icon="sparkles" label="Tạo bộ đầu tiên" onPress={() => router.push('/create')} />}
          body="Tạo một bộ Chibi 3D rồi chọn sticker bạn muốn lưu nhé."
          icon="albums-outline"
          title="Chưa có bộ sticker nào"
        />
      ) : (
        <View style={styles.list}>
          {packs.data.map((pack) => (
            <Pressable
              accessibilityRole="button"
              key={pack.id}
              onPress={() => router.push({ pathname: '/packs/[id]', params: { id: pack.id } })}
            >
              <Card style={styles.pack}>
                <View style={styles.packIcon}>
                  <Ionicons color={colors.primary} name="happy" size={28} />
                </View>
                <View style={styles.packBody}>
                  <Text style={styles.packTitle}>{pack.name}</Text>
                  <Text style={styles.packMeta}>{pack.stickers.length} sticker · Riêng tư</Text>
                </View>
                <Ionicons color={colors.muted} name="chevron-forward" size={22} />
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 54, flexGrow: 1 },
  heading: { gap: spacing.sm, marginBottom: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: 11, letterSpacing: 1.8, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 21 },
  list: { gap: spacing.md },
  pack: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  packIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  packBody: { flex: 1, gap: spacing.xs },
  packTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  packMeta: { color: colors.muted, fontSize: 13 },
});
