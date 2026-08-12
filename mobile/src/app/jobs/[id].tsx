import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { createJob, getJob } from '@/api/client';
import { isTerminalJob } from '@/api/contracts';
import { messageForCode, retrySafeMutation, safeErrorMessage } from '@/api/errors';
import { Button, Card, Pill, Screen, StateView } from '@/components/ui';
import { IS_DEMO } from '@/config/env';
import { useIdempotencyKey } from '@/features/use-idempotency-key';
import { useActiveJob } from '@/providers/active-job';
import { colors, radii, spacing } from '@/theme/tokens';

const stageText: Record<string, string> = {
  queued: 'Đang xếp hàng an toàn',
  generating: 'Đang tạo 8 biến thể Chibi 3D',
  moderating: 'Đang kiểm tra an toàn đầu ra',
  moderating_outputs: 'Đang kiểm tra an toàn đầu ra',
  ready: 'Bộ sticker đã sẵn sàng',
};

export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { setActiveJobId } = useActiveJob();
  const retryIntent = useIdempotencyKey();
  const job = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && isTerminalJob(status) ? false : 2_000;
    },
  });
  const retry = useMutation({
    mutationFn: () =>
      createJob(job.data!.sourceImageId, retryIntent.keyFor(`retry-job:${job.data!.id}`)),
    retry: retrySafeMutation,
    onSuccess: async (next) => {
      await setActiveJobId(next.id);
      router.replace({ pathname: '/jobs/[id]', params: { id: next.id } });
    },
  });

  useEffect(() => {
    if (job.data?.status === 'succeeded' && job.data.setId) {
      router.replace({ pathname: '/preview/[id]', params: { id: job.data.id } });
    }
  }, [job.data]);

  if (job.isLoading) {
    return <Screen scroll={false}><StateView body="Đang khôi phục job đã gửi…" icon="cloud-download-outline" loading title="Đang kết nối" /></Screen>;
  }
  if (job.isError) {
    return (
      <Screen scroll={false}>
        <StateView
          action={<Button label="Thử kết nối lại" onPress={() => void job.refetch()} />}
          body={safeErrorMessage(job.error)}
          icon="cloud-offline-outline"
          title="Chưa tải được tiến trình"
        />
      </Screen>
    );
  }
  if (!job.data) return null;

  const failed = job.data.status === 'failed' || job.data.status === 'timed_out';
  if (failed) {
    return (
      <Screen scroll={false}>
        <StateView
          action={
            <View style={styles.actions}>
              {retry.isError ? <Text style={styles.error}>{safeErrorMessage(retry.error)}</Text> : null}
              <Button label="Thử tạo lại cả bộ" loading={retry.isPending} onPress={() => retry.mutate()} />
              <Button label="Chọn ảnh khác" onPress={() => router.replace('/create')} variant="ghost" />
            </View>
          }
          body={messageForCode(job.data.errorCode)}
          icon={job.data.errorCode === 'OUTPUT_BLOCKED' ? 'shield-outline' : 'refresh-circle-outline'}
          title={job.data.status === 'timed_out' ? 'Job đã quá giờ' : 'Chưa tạo được sticker'}
        />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screen} scroll={false}>
      <View style={styles.head}>
        <Pill>{IS_DEMO ? 'MOCK PIPELINE' : 'CHIBI 3D'}</Pill>
        <Text style={styles.title}>Phép màu đang{`\n`}được chuẩn bị ✨</Text>
        <Text style={styles.subtitle}>Bạn có thể rời màn hình. Job đã gửi vẫn được lưu và tiếp tục xử lý.</Text>
      </View>
      <Card style={styles.progressCard}>
        <View style={styles.rings}>
          <View style={styles.ringOne}><View style={styles.ringTwo}><Text style={styles.progressText}>{job.data.progress}%</Text></View></View>
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.stage}>
          {stageText[job.data.stage] ?? 'Đang xử lý bộ sticker'}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${job.data.progress}%` }]} />
        </View>
        <View style={styles.steps}>
          {[
            ['checkmark-circle', 'Đã kiểm tra ảnh', job.data.progress >= 10],
            ['color-wand', 'Tạo Chibi 3D', job.data.progress >= 15],
            ['shield-checkmark', 'Kiểm duyệt đầu ra', job.data.progress >= 65],
          ].map(([icon, label, active]) => (
            <View key={String(label)} style={styles.step}>
              <Ionicons color={active ? colors.primary : colors.line} name={icon as keyof typeof Ionicons.glyphMap} size={22} />
              <Text style={[styles.stepText, active && styles.stepActive]}>{label as string}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Button label="Về trang chủ" onPress={() => router.replace('/(tabs)')} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between', paddingTop: spacing.xl },
  head: { gap: spacing.md },
  title: { color: colors.ink, fontSize: 30, lineHeight: 37, fontWeight: '900' },
  subtitle: { color: colors.muted, lineHeight: 22 },
  progressCard: { alignItems: 'center', gap: spacing.xl },
  rings: { width: 170, height: 170, borderRadius: 85, backgroundColor: colors.surfaceWarm, alignItems: 'center', justifyContent: 'center' },
  ringOne: { width: 136, height: 136, borderRadius: 68, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  ringTwo: { width: 102, height: 102, borderRadius: 51, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  progressText: { color: colors.white, fontSize: 28, fontWeight: '900' },
  stage: { color: colors.ink, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  track: { width: '100%', height: 9, borderRadius: radii.pill, backgroundColor: colors.primarySoft, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },
  steps: { width: '100%', gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  stepText: { color: colors.muted },
  stepActive: { color: colors.ink, fontWeight: '700' },
  actions: { width: '100%', gap: spacing.md },
  error: { color: colors.danger, textAlign: 'center' },
});
