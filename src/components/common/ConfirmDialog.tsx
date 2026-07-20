import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme';
import { AppButton } from './AppButton';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Quay lại',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
      transparent
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        style={[styles.overlay, { backgroundColor: 'rgba(15, 23, 42, 0.56)' }]}
      >
        <View
          accessible
          accessibilityLabel={`${title}. ${message}`}
          style={[
            styles.dialog,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.lg,
              padding: spacing.lg,
            },
          ]}
        >
          <Text accessibilityRole="header" style={[typography.h3, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            {message}
          </Text>
          <View style={[styles.actions, { marginTop: spacing.lg }]}>
            <AppButton
              accessibilityLabel={cancelLabel}
              disabled={loading}
              onPress={onCancel}
              style={styles.action}
              title={cancelLabel}
              variant="outline"
            />
            <View style={{ width: spacing.sm }} />
            <AppButton
              accessibilityLabel={confirmLabel}
              loading={loading}
              onPress={onConfirm}
              style={styles.action}
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  action: {
    flex: 1,
    minHeight: 48,
  },
  actions: {
    flexDirection: 'row',
  },
  dialog: {
    borderWidth: 1,
    maxWidth: 440,
    width: '100%',
  },
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
});
