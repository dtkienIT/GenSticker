import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { AppButton } from '@/components/common/AppButton';
import { SelfiePicker } from '@/components/selfie/SelfiePicker';
import { getStickerProductService } from '@/services/factory';
import { getApiErrorPresentation } from '@/services/errors';
import { useSelfieDraftStore } from '@/store/useSelfieDraftStore';
import { useProductSessionStore } from '@/store/useProductSessionStore';
import { queryInvalidation } from '@/query';
import { useAppTheme } from '@/theme';

export default function SelfieScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { typography, colors, spacing } = useAppTheme();
  const selected = useSelfieDraftStore((s) => s.selectedSelfie);
  const setSelected = useSelfieDraftStore((s) => s.setSelectedSelfie);
  const clear = useSelfieDraftStore((s) => s.clearSelectedSelfie);
  const consent = useProductSessionStore((s) => s.consentState);
  const setFlow = useProductSessionStore((s) => s.setActiveFlow);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Chưa chọn ảnh');
      const service = getStickerProductService();
      const upload = await service.validateAndUploadSelfie({
        uri: selected.uri,
        mimeType: selected.mimeType ?? undefined,
        fileName: selected.fileName ?? undefined,
        width: selected.width,
        height: selected.height,
        byteSize: selected.byteSize ?? undefined,
      });
      const character = await service.createCharacter({
        displayName: 'Nhân vật của tôi',
        selfieAssetId: upload.asset.id,
      });
      const job = await service.createCanonicalJob({
        characterId: character.id,
        preset: { outfit: 'casual', style: 'chibi' },
      });
      return { character, job };
    },
    onSuccess: async ({ character, job }) => {
      setFlow({ activeCharacterId: character.id, activeJobId: job.id, activePackId: null });
      await queryInvalidation.characterCreated(queryClient);
      router.replace({ pathname: '/canonical/generating', params: { jobId: job.id } });
    },
    onError: (cause) => setError(getApiErrorPresentation(cause).message),
  });
  return (
    <ScreenContainer scrollable>
      <SectionHeader
        title="Chọn ảnh chân dung"
        subtitle="Ảnh sẽ được tải lên dịch vụ GenSticker để tạo nhân vật và hình dán."
      />
      <SelfiePicker
        value={selected?.uri ?? null}
        onChange={(uri, metadata) => {
          if (uri && metadata) setSelected(metadata);
          else clear();
          setError(null);
        }}
      />
      {error ? (
        <Text style={[typography.body, { color: colors.error, marginTop: spacing.md }]}>
          {error}
        </Text>
      ) : null}
      <View style={{ marginTop: spacing.xl }}>
        <AppButton
          title={consent.accepted ? 'Tiếp tục' : 'Xem và đồng ý'}
          disabled={!selected}
          loading={mutation.isPending}
          onPress={() => (consent.accepted ? mutation.mutate() : router.push('/consent'))}
        />
      </View>
    </ScreenContainer>
  );
}
