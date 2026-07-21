import React, { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CanonicalCandidateCard } from '@/components/character/CanonicalCandidateCard';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { AppButton } from '@/components/common/AppButton';
import { DEFAULT_CHARACTER_PROFILE_CONFIG } from '@/constants/profilePresets';
import { queryInvalidation, queryKeys } from '@/query';
import { getStickerProductService } from '@/services/factory';
import { getApiErrorPresentation } from '@/services/errors';
import { useAppTheme } from '@/theme';

export default function Candidates() {
  const { characterId } = useLocalSearchParams<{ characterId?: string }>();
  const id = typeof characterId === 'string' ? characterId : '';
  const router = useRouter();
  const qc = useQueryClient();
  const { colors, typography, spacing } = useAppTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
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
      {candidates.isLoading ? (
        <Text style={[typography.body, { color: colors.textSecondary }]}>Đang tải các mẫu…</Text>
      ) : null}
      {candidates.data?.map((candidate) => (
        <View key={candidate.assetId} style={{ marginBottom: spacing.md }}>
          <CanonicalCandidateCard
            candidate={candidate}
            selected={selected === candidate.assetId}
            onSelect={() => setSelected(candidate.assetId)}
            onPreview={() => setPreviewUri(candidate.imageUri)}
            onRetryImage={() => void candidates.refetch()}
          />
        </View>
      ))}
      {candidates.isError ? (
        <View style={{ marginBottom: spacing.md }}>
          <Text
            accessibilityLiveRegion="polite"
            style={[typography.body, { color: colors.error, marginBottom: spacing.sm }]}
          >
            {getApiErrorPresentation(candidates.error).message}
          </Text>
          <AppButton title="Tải lại" onPress={() => candidates.refetch()} />
        </View>
      ) : null}
      {approve.isError ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[typography.body, { color: colors.error, marginBottom: spacing.sm }]}
        >
          {getApiErrorPresentation(approve.error).message}
        </Text>
      ) : null}
      <AppButton
        title="Xác nhận lựa chọn"
        disabled={!selected}
        loading={approve.isPending}
        onPress={() => approve.mutate()}
      />
      <Modal
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
        transparent
        visible={Boolean(previewUri)}
      >
        <View style={styles.previewOverlay}>
          <Pressable
            accessibilityLabel="Đóng bản xem trước"
            accessibilityRole="button"
            onPress={() => setPreviewUri(null)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.previewDialog, { backgroundColor: colors.card }]}>
            {previewUri ? (
              <Image
                accessibilityLabel="Bản xem trước mẫu nhân vật"
                resizeMode="contain"
                source={{ uri: previewUri }}
                style={styles.previewImage}
              />
            ) : null}
            <AppButton title="Đóng" variant="outline" onPress={() => setPreviewUri(null)} />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  previewDialog: {
    borderRadius: 16,
    maxWidth: 640,
    padding: 16,
    width: '92%',
  },
  previewImage: {
    aspectRatio: 1,
    marginBottom: 12,
    width: '100%',
  },
  previewOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    flex: 1,
    justifyContent: 'center',
  },
});
