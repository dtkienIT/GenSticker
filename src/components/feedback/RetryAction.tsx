import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme';
import { AppButton } from '../common/AppButton';

export interface RetryActionProps {
  onRetry: () => void;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export const RetryAction: React.FC<RetryActionProps> = ({
  onRetry,
  loading = false,
  disabled = false,
  title = 'Try again',
  message,
  style,
}) => {
  const { colors, spacing, typography } = useAppTheme();
  return (
    <View style={[styles.container, style]}>
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          selectable
          style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.sm }]}
        >
          {message}
        </Text>
      ) : null}
      <AppButton
        accessibilityLabel={title}
        disabled={disabled}
        loading={loading}
        onPress={onRetry}
        style={styles.button}
        title={title}
        variant="outline"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  button: { minHeight: 48 },
  container: { width: '100%' },
});
