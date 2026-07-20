import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StickerPack } from '../../services/contracts';
import { useAppTheme } from '../../theme';
import { AppButton } from '../common/AppButton';

export interface PartialPackBannerProps {
  pack: Pick<StickerPack, 'status' | 'slots'>;
  onRetryFailed?: () => void;
  retrying?: boolean;
  title?: string;
}

export const PartialPackBanner: React.FC<PartialPackBannerProps> = ({
  pack,
  onRetryFailed,
  retrying = false,
  title = 'Bộ hình dán đã hoàn thành một phần',
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const failedCount = pack.slots.filter((slot) => slot.status === 'failed').length;
  const completedCount = pack.slots.filter((slot) => slot.status === 'completed').length;

  if (pack.status !== 'PARTIAL' && failedCount === 0) return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.warning,
          borderRadius: borderRadius.md,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.copyRow}>
        <View
          style={[
            styles.icon,
            { backgroundColor: colors.warning, borderRadius: borderRadius.full },
          ]}
        >
          <Text style={styles.iconText}>!</Text>
        </View>
        <View style={styles.copy}>
          <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {completedCount} mục đã sẵn sàng. {failedCount} mục cần thử lại; các mục thành công sẽ
            được giữ nguyên.
          </Text>
        </View>
      </View>
      {failedCount > 0 && onRetryFailed ? (
        <AppButton
          accessibilityLabel={`Thử lại ${failedCount} mục chưa thành công`}
          loading={retrying}
          onPress={onRetryFailed}
          style={{ marginTop: spacing.md, minHeight: 48 }}
          title={
            failedCount === 1 ? 'Thử lại mục chưa thành công' : `Xem ${failedCount} mục cần thử lại`
          }
          variant="outline"
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    width: '100%',
  },
  copy: {
    flex: 1,
  },
  copyRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  icon: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    marginRight: 10,
    width: 28,
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
