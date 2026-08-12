import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '@/theme/tokens';

export function Screen({
  children,
  scroll = true,
  contentStyle,
}: PropsWithChildren<{ scroll?: boolean; contentStyle?: StyleProp<ViewStyle> }>) {
  if (!scroll) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

type ButtonProps = PressableProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  full?: boolean;
};

export function Button({
  label,
  icon,
  variant = 'primary',
  loading = false,
  disabled,
  full = true,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        full && styles.full,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              color={variant === 'primary' ? colors.white : variant === 'danger' ? colors.danger : colors.primary}
              name={icon}
              size={19}
            />
          ) : null}
          <Text style={[styles.buttonLabel, styles[`buttonLabel_${variant}`]]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Pill({ children, tone = 'warm' }: PropsWithChildren<{ tone?: 'warm' | 'green' }>) {
  return (
    <View style={[styles.pill, tone === 'green' && styles.pillGreen]}>
      <Text style={[styles.pillText, tone === 'green' && styles.pillTextGreen]}>{children}</Text>
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StateView({
  icon,
  title,
  body,
  action,
  loading = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: ReactNode;
  loading?: boolean;
}) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : (
          <Ionicons color={colors.primary} name={icon} size={34} />
        )}
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  button: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
  },
  full: { width: '100%' },
  button_primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  button_secondary: { backgroundColor: colors.surface, borderColor: colors.primary },
  button_ghost: { backgroundColor: 'transparent', borderColor: colors.line },
  button_danger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
  buttonLabel_primary: { color: colors.white },
  buttonLabel_secondary: { color: colors.primary },
  buttonLabel_ghost: { color: colors.ink },
  buttonLabel_danger: { color: colors.danger },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  pillGreen: { backgroundColor: colors.successSoft },
  pillText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 },
  pillTextGreen: { color: colors.success },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  stateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.lg,
  },
  stateTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  stateBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  stateAction: { width: '100%', marginTop: spacing.xl },
});
