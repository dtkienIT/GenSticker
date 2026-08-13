import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n, type Locale } from '@/i18n';
import { colors, radii, spacing } from '@/theme/tokens';

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  const toggleLanguage = (nextLocale: Locale) => {
    if (nextLocale !== locale) {
      void setLocale(nextLocale);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityHint="Switch to Vietnamese"
        accessibilityLabel="Tiếng Việt"
        accessibilityRole="button"
        accessibilityState={{ selected: locale === 'vi' }}
        onPress={() => toggleLanguage('vi')}
        style={[styles.badge, locale === 'vi' && styles.badgeActive]}
      >
        <Text style={[styles.text, locale === 'vi' && styles.textActive]}>🇻🇳 VI</Text>
      </Pressable>
      <Pressable
        accessibilityHint="Switch to English"
        accessibilityLabel="English"
        accessibilityRole="button"
        accessibilityState={{ selected: locale === 'en' }}
        onPress={() => toggleLanguage('en')}
        style={[styles.badge, locale === 'en' && styles.badgeActive]}
      >
        <Text style={[styles.text, locale === 'en' && styles.textActive]}>🇬🇧 EN</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceWarm,
    borderRadius: radii.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: '#F5D5C3',
    alignSelf: 'flex-start',
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  badgeActive: {
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
  },
  textActive: {
    color: colors.white,
  },
});
