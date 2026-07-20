import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme';
import { AppButton } from './AppButton';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  buttonTitle?: string;
  onButtonPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '🖼️',
  title,
  message,
  buttonTitle,
  onButtonPress,
}) => {
  const { colors, typography, spacing, borderRadius } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
        },
      ]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.md }]}>
        {title}
      </Text>
      <Text
        style={[
          typography.body,
          {
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: spacing.xs,
            marginBottom: buttonTitle ? spacing.lg : 0,
          },
        ]}
      >
        {message}
      </Text>
      {buttonTitle && onButtonPress ? (
        <AppButton title={buttonTitle} onPress={onButtonPress} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  icon: {
    fontSize: 54,
  },
});
