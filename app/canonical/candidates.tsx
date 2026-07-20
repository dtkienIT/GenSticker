import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CanonicalCandidateCard } from '@/components/character/CanonicalCandidateCard';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { AppButton } from '@/components/common/AppButton';
import { DEFAULT_CHARACTER_PROFILE_CONFIG } from '@/constants/profilePresets';
import { queryInvalidation, queryKeys } from '@/query';
import { getStickerProductService } from '@/services/factory';
import { useAppTheme } from '@/theme';

export default function Candidates() {
  const { characterId } = useLocalSearchParams<{ characterId?: string }>();
  const id = typeof characterId === 'string' ? characterId : '';
  const router = useRouter();
  const qc = useQueryClient();
  const { colors, typography, spacing } = useAppTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const candidates = useQuery({
    queryKey: queryKeys.canonicalCandidates(id),
    queryFn: () => getStickerProductService().getCanonicalCandidates(id),
    enabled: Boolean(id),
  });
  const approve = useMutation({
    mutationFn: () =>
      getStickerProductService().approveCanonical({
        characterId: id,
        canonicalAssetId: selected!,
        config: DEFAULT_CHARACTER_PROFILE_CONFIG,
      }),
    onSuccess: async (profile) => {
      await queryInvalidation.canonicalApproved(qc, id, profile.version);
      router.push({ pathname: '/profile/[characterId]', params: { characterId: id } });
    },
  });
  if (!id)
    return (
      <ScreenContainer>
        <Text style={[typography.body, { color: colors.error }]}>Không tìm thấy nhân vật.</Text>
      </ScreenContainer>
    );
  return (
    <ScreenContainer scrollable>
      <SectionHeader
        title="Chọn hình đại diện"
        subtitle="Đề xuất chỉ là gợi ý. Bạn phải tự chọn và xác nhận."
      />
      {candidates.data?.map((candidate) => (
        <View key={candidate.assetId} style={{ marginBottom: spacing.md }}>
          <CanonicalCandidateCard
            candidate={candidate}
            selected={selected === candidate.assetId}
            onSelect={() => setSelected(candidate.assetId)}
          />
        </View>
      ))}
      {candidates.isError ? (
        <AppButton title="Tải lại" onPress={() => candidates.refetch()} />
      ) : null}
      <AppButton
        title="Xác nhận lựa chọn"
        disabled={!selected}
        loading={approve.isPending}
        onPress={() => approve.mutate()}
      />
    </ScreenContainer>
  );
}
