import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { GenerationProgress } from '@/components/generation/GenerationProgress';
import { JobTimeline } from '@/components/generation/JobTimeline';
import { AppButton } from '@/components/common/AppButton';
import { useGenerationJob } from '@/hooks';
import { queryKeys } from '@/query';
import { getStickerProductService } from '@/services/factory';
import { useProductSessionStore } from '@/store/useProductSessionStore';
import { useAppTheme } from '@/theme';

export default function CanonicalGenerating() {
  const params = useLocalSearchParams<{ jobId?: string }>();
  const jobId = typeof params.jobId === 'string' ? params.jobId : null;
  const router = useRouter();
  const { colors, typography, spacing } = useAppTheme();
  const clear = useProductSessionStore((s) => s.clearActiveFlow);
  const [canceling, setCanceling] = useState(false);
  const job = useGenerationJob(jobId);
  const events = useQuery({
    queryKey: queryKeys.jobs.events(jobId ?? 'missing'),
    queryFn: () => getStickerProductService().getJobEvents(jobId!),
    enabled: Boolean(jobId),
  });
  useEffect(() => {
    if (job.data?.status === 'succeeded')
      router.replace({
        pathname: '/canonical/candidates',
        params: { characterId: job.data.characterId },
      });
  }, [job.data?.status]);
  if (!jobId)
    return (
      <ScreenContainer>
        <Text style={[typography.body, { color: colors.error }]}>
          Liên kết tạo hình không hợp lệ.
        </Text>
        <AppButton title="Quay lại" onPress={() => router.replace('/create/selfie')} />
      </ScreenContainer>
    );
  if (job.isError)
    return (
      <ScreenContainer>
        <Text style={[typography.body, { color: colors.error }]}>
          Không thể khôi phục tiến trình.
        </Text>
        <AppButton title="Thử lại" onPress={() => job.refetch()} />
      </ScreenContainer>
    );
  return (
    <ScreenContainer scrollable>
      {job.data ? (
        <GenerationProgress job={job.data} message="Bạn có thể đóng ứng dụng và quay lại sau." />
      ) : (
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Đang khôi phục tiến trình…
        </Text>
      )}
      <View style={{ marginTop: spacing.lg }}>
        <JobTimeline
          events={events.data ?? []}
          loading={events.isLoading}
          errorMessage={
            events.isError
              ? 'Không tải được dòng thời gian. Tiến trình chính vẫn tiếp tục.'
              : undefined
          }
        />
      </View>
      {job.data && ['queued', 'running'].includes(job.data.status) ? (
        <View style={{ marginTop: spacing.xl }}>
          <AppButton
            title="Hủy"
            variant="outline"
            loading={canceling}
            onPress={() =>
              Alert.alert('Hủy tạo hình?', 'Tiến trình hiện tại sẽ dừng.', [
                { text: 'Tiếp tục', style: 'cancel' },
                {
                  text: 'Hủy tiến trình',
                  style: 'destructive',
                  onPress: async () => {
                    setCanceling(true);
                    await getStickerProductService().cancelGenerationJob(jobId);
                    clear();
                    setCanceling(false);
                    router.replace('/create/selfie');
                  },
                },
              ])
            }
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}
