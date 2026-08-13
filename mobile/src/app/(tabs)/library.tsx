import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getPacks } from '@/api/client';
import { safeErrorMessage } from '@/api/errors';
import { LanguageToggle } from '@/components/language-toggle';
import { Button, Card, Screen, StateView } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme/tokens';

export default function LibraryScreen() {
  const { t } = useI18n();
  const packs = useQuery({ queryKey: ['packs'], queryFn: getPacks });
  const refetchPacks = packs.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetchPacks();
    }, [refetchPacks]),
  );

  if (packs.isLoading) {
    return (
      <Screen scroll={false}>
        <StateView body={t('library.loadingBody')} icon="albums-outline" loading title={t('library.loadingTitle')} />
      </Screen>
    );
  }
  if (packs.isError) {
    return (
      <Screen scroll={false}>
        <StateView
          action={<Button label={t('common.retry')} onPress={() => void packs.refetch()} />}
          body={safeErrorMessage(packs.error)}
          icon="cloud-offline-outline"
          title={t('library.errorTitle')}
        />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.topRow}>
        <View style={styles.headingText}>
          <Text style={styles.eyebrow}>{t('library.eyebrow')}</Text>
          <Text style={styles.title}>{t('library.title')}</Text>
        </View>
        <LanguageToggle />
      </View>
      <Text style={styles.body}>{t('library.body')}</Text>

      {!packs.data?.length ? (
        <StateView
          action={<Button icon="sparkles" label={t('library.createFirst')} onPress={() => router.push('/create')} />}
          body={t('library.emptyBody')}
          icon="albums-outline"
          title={t('library.emptyTitle')}
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
                  <Text style={styles.packMeta}>
                    {t('library.packMeta', { count: pack.stickers.length })}
                  </Text>
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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  headingText: { gap: spacing.xs },
  eyebrow: { color: colors.primary, fontSize: 11, letterSpacing: 1.8, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 21, marginBottom: spacing.md },
  list: { gap: spacing.md },
  pack: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  packIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  packBody: { flex: 1, gap: spacing.xs },
  packTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  packMeta: { color: colors.muted, fontSize: 13 },
});
