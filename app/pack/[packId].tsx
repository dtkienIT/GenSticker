import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { PackProgressGrid } from '@/components/pack/PackProgressGrid';
import { PartialPackBanner } from '@/components/pack/PartialPackBanner';
import { AppButton } from '@/components/common/AppButton';
import { useStickerPack } from '@/hooks';
import { queryInvalidation } from '@/query';
import { getStickerProductService } from '@/services/factory';
import { getApiErrorPresentation } from '@/services/errors';
import type { StickerSlot } from '@/services/contracts';
import { useAppTheme } from '@/theme';

export default function Pack() {
  const { packId } = useLocalSearchParams<{ packId?: string }>();
  const id = typeof packId === 'string' ? packId : '';
  const router = useRouter();
  const qc = useQueryClient();
  const { colors, typography, spacing } = useAppTheme();
  const pack = useStickerPack(id);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<unknown>(null);
  const retry = async (slot: StickerSlot) => {
    setRetrying(slot.id);
    setRetryError(null);
    try {
      await getStickerProductService().regenerateStickerSlot({ packId: id, slotId: slot.id });
      await queryInvalidation.stickerSlotRetried(qc, id);
    } catch (cause) {
      setRetryError(cause);
    } finally {
      setRetrying(null);
    }
  };
  if (!id || pack.isError)
    return (
      <ScreenContainer>
        <Text style={[typography.body, { color: colors.error }]}>Không tìm thấy bộ hình dán.</Text>
        <AppButton title="Về thư viện" onPress={() => router.replace('/library')} />
      </ScreenContainer>
    );
  return (
    <ScreenContainer scrollable>
      {pack.data?.status === 'PARTIAL' ? <PartialPackBanner pack={pack.data} /> : null}
      {retryError ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[typography.body, { color: colors.error, marginBottom: spacing.md }]}
        >
          {getApiErrorPresentation(retryError).message}
        </Text>
      ) : null}
      {pack.data ? (
        <PackProgressGrid
          pack={pack.data}
          onRetrySlot={retry}
          retryingSlotId={retrying}
          onSlotPress={(slot) =>
            slot.status === 'completed' &&
            router.push({
              pathname: '/sticker/[packId]/[slotId]',
              params: { packId: id, slotId: slot.id },
            })
          }
        />
      ) : (
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Đang khôi phục bộ hình dán…
        </Text>
      )}{' '}
      {pack.data && ['COMPLETED', 'PARTIAL'].includes(pack.data.status) ? (
        <View style={{ marginTop: spacing.xl }}>
          <AppButton
            title="Chỉnh chữ và xuất"
            onPress={() => {
              const slot = pack.data!.slots.find((s) => s.status === 'completed');
              if (slot)
                router.push({
                  pathname: '/sticker/[packId]/[slotId]',
                  params: { packId: id, slotId: slot.id },
                });
            }}
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}
