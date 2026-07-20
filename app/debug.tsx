import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { AppButton } from '@/components/common/AppButton';
import { MOCK_SCENARIOS, type MockScenario } from '@/services/contracts';
import { getStickerProductService } from '@/services/factory';
import { useProductSessionStore } from '@/store/useProductSessionStore';
import { useAppTheme } from '@/theme';

export default function Debug() {
  const enabled = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DEV_TOOLS !== 'false';
  const qc = useQueryClient();
  const { colors, typography, spacing } = useAppTheme();
  const session = useProductSessionStore();
  const diagnostics = useQuery({
    queryKey: ['diagnostics'],
    queryFn: () => getStickerProductService().getDiagnostics(),
    enabled,
  });
  if (!enabled)
    return (
      <ScreenContainer>
        <Text style={[typography.body, { color: colors.textPrimary }]}>
          Công cụ phát triển đã tắt.
        </Text>
      </ScreenContainer>
    );
  const select = async (s: MockScenario) => {
    await getStickerProductService().setMockScenario(s);
    await diagnostics.refetch();
  };
  return (
    <ScreenContainer scrollable>
      <SectionHeader title="Chẩn đoán cục bộ" subtitle="Chỉ hiển thị metadata an toàn." />
      <Text style={[typography.body, { color: colors.textPrimary }]}>
        Chế độ: mock · Nhân vật: {session.activeCharacterId ?? '—'} · Job:{' '}
        {session.activeJobId ?? '—'} · Pack: {session.activePackId ?? '—'}
      </Text>
      <Text style={[typography.body, { color: colors.textPrimary, marginTop: spacing.md }]}>
        Bản ghi: {JSON.stringify(diagnostics.data?.counts ?? {})}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: spacing.lg }}>
        {MOCK_SCENARIOS.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => select(s)}
            style={{
              padding: 10,
              borderWidth: 1,
              borderColor: diagnostics.data?.scenario === s ? colors.primary : colors.border,
              borderRadius: 8,
            }}
          >
            <Text style={[typography.caption, { color: colors.textPrimary }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <AppButton
        title="Xóa dữ liệu mô phỏng"
        variant="danger"
        onPress={async () => {
          await getStickerProductService().clearLocalData();
          session.resetProductSession();
          qc.clear();
          await diagnostics.refetch();
        }}
      />
    </ScreenContainer>
  );
}
