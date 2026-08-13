import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { getJob } from '@/api/client';
import { isTerminalJob } from '@/api/contracts';
import { LanguageToggle } from '@/components/language-toggle';
import { Card, Button, Pill, Screen } from '@/components/ui';
import { IS_DEMO } from '@/config/env';
import { useI18n } from '@/i18n';
import { useActiveJob } from '@/providers/active-job';
import { colors, radii, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const { t } = useI18n();
  const { activeJobId, hydrated } = useActiveJob();
  const activeJob = useQuery({
    queryKey: ['job', activeJobId],
    queryFn: () => getJob(activeJobId as string),
    enabled: hydrated && Boolean(activeJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && isTerminalJob(status) ? false : 2_500;
    },
  });

  const openActiveJob = () => {
    if (!activeJob.data) return;
    if (activeJob.data.status === 'succeeded' && activeJob.data.setId) {
      router.push({ pathname: '/preview/[id]', params: { id: activeJob.data.id } });
    } else {
      router.push({ pathname: '/jobs/[id]', params: { id: activeJob.data.id } });
    }
  };

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.top}>
        <View>
          <Text style={styles.eyebrow}>{t('home.eyebrow')}</Text>
          <Text style={styles.brand}>{t('home.brand')}</Text>
        </View>
        <View style={styles.topRight}>
          <LanguageToggle />
          <View style={styles.avatar}><Ionicons color={colors.plum} name="happy" size={24} /></View>
        </View>
      </View>

      {IS_DEMO ? (
        <View accessibilityRole="text" style={styles.demoBanner}>
          <Ionicons color={colors.warning} name="flask" size={18} />
          <Text style={styles.demoText}>{t('common.demoNotice')}</Text>
        </View>
      ) : null}

      {activeJob.data ? (
        <Card style={styles.activeCard}>
          <View style={styles.activeHeader}>
            <Pill tone={activeJob.data.status === 'succeeded' ? 'green' : 'warm'}>
              {activeJob.data.status === 'succeeded' ? t('home.activeJob.ready') : t('home.activeJob.inProgress')}
            </Pill>
            <Text style={styles.percent}>{activeJob.data.progress}%</Text>
          </View>
          <Text style={styles.cardTitle}>{t('home.activeJob.title')}</Text>
          <Text style={styles.body}>{t('home.activeJob.body')}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${activeJob.data.progress}%` }]} />
          </View>
          <Button label={t('home.activeJob.continue')} onPress={openActiveJob} variant="secondary" />
        </Card>
      ) : null}

      <View style={styles.hero}>
        <View style={styles.orbitOne} />
        <View style={styles.orbitTwo} />
        <View style={styles.heroIcon}><Text style={styles.heroEmoji}>✨</Text></View>
        <Text style={styles.heroTitle}>{t('home.hero.title')}</Text>
        <Text style={styles.heroBody}>{t('home.hero.body')}</Text>
        <Button icon="camera" label={t('home.hero.startButton')} onPress={() => router.push('/create')} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('home.tips.title')}</Text>
        {[
          ['person-outline', t('home.tips.tip1')],
          ['sunny-outline', t('home.tips.tip2')],
          ['shield-checkmark-outline', t('home.tips.tip3')],
        ].map(([icon, label]) => (
          <View key={label} style={styles.tip}>
            <View style={styles.tipIcon}>
              <Ionicons color={colors.primary} name={icon as keyof typeof Ionicons.glyphMap} size={20} />
            </View>
            <Text style={styles.tipText}>{label}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 54 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyebrow: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 2.2 },
  brand: { color: colors.ink, fontWeight: '900', fontSize: 28 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F2E4F6', alignItems: 'center', justifyContent: 'center' },
  demoBanner: { flexDirection: 'row', gap: spacing.sm, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.warningSoft, alignItems: 'center' },
  demoText: { color: colors.warning, fontWeight: '700', fontSize: 13, flex: 1 },
  hero: { overflow: 'hidden', backgroundColor: colors.surfaceWarm, borderRadius: 30, padding: spacing.xl, gap: spacing.lg, borderWidth: 1, borderColor: '#F5D5C3' },
  orbitOne: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#FFD8C4', right: -70, top: -80 },
  orbitTwo: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: '#EBD7F0', left: -60, bottom: -40 },
  heroIcon: { width: 70, height: 70, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  heroEmoji: { fontSize: 34 },
  heroTitle: { color: colors.ink, fontSize: 31, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8 },
  heroBody: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  activeCard: { gap: spacing.md },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 19, fontWeight: '800', color: colors.ink },
  body: { color: colors.muted, lineHeight: 21 },
  percent: { fontWeight: '900', color: colors.primary },
  progressTrack: { height: 8, backgroundColor: colors.primarySoft, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  section: { gap: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  tip: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  tipIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  tipText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
});
