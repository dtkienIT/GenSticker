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
  remainingAttempts?: number;
  style?: StyleProp<ViewStyle>;
}

export const RetryAction: React.FC<RetryActionProps> = ({
  onRetry,
  loading = false,
  disabled = false,
  title = 'Thử lại',
  message,
  remainingAttempts,
  style,
}) => {
  const { colors, spacing, typography } = useAppTheme();
  const noAttemptsLeft = remainingAttempts !== undefined && remainingAttempts <= 0;

  return (
    <View style={[styles.container, style]}>
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.sm }]}
        >
          {message}
        </Text>
      ) : null}
      {remainingAttempts !== undefined ? (
        <Text
          style={[
            typography.caption,
            { color: noAttemptsLeft ? colors.error : colors.textMuted, marginBottom: spacing.sm },
          ]}
        >
          {noAttemptsLeft ? 'Đã hết lượt thử lại.' : `Còn ${remainingAttempts} lượt thử lại.`}
        </Text>
      ) : null}
      <AppButton
        accessibilityLabel={title}
        disabled={disabled || noAttemptsLeft}
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
  button: {
    minHeight: 48,
  },
  container: {
    width: '100%',
  },
});
