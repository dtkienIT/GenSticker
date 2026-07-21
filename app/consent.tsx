import React, { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { AppButton } from '@/components/common/AppButton';
import { getStickerProductService } from '@/services/factory';
import { getApiErrorPresentation } from '@/services/errors';
import { useProductSessionStore } from '@/store/useProductSessionStore';
import { CURRENT_CONSENT_VERSION } from '@/store/useProductSessionStore';
import { useAppTheme } from '@/theme';

export default function ConsentScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useAppTheme();
  const [reuse, setReuse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const setConsent = useProductSessionStore((s) => s.setConsentState);
  const accept = async () => {
    const state = {
      consentVersion: CURRENT_CONSENT_VERSION,
      accepted: true,
      reuseOptIn: reuse,
      acceptedAt: new Date().toISOString(),
    };
    setSaving(true);
    setError(null);
    try {
      await getStickerProductService().updateConsent(state);
      setConsent(state);
      router.replace('/create/selfie');
    } catch (cause) {
      setError(getApiErrorPresentation(cause).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <ScreenContainer scrollable>
      <SectionHeader
        title="Đồng ý xử lý ảnh"
        subtitle="Bạn phải đồng ý trước khi ứng dụng kiểm tra ảnh."
      />
      <Text style={[typography.body, { color: colors.textPrimary }]}>
        Tôi xác nhận đây là ảnh của tôi hoặc tôi có quyền sử dụng ảnh. Không dùng ứng dụng để giả
        mạo người khác hoặc sao chép nhân vật được cấp phép.
      </Text>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: spacing.xl }}
      >
        <Switch value={reuse} onValueChange={setReuse} />
        <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>
          Ghi nhớ lựa chọn cho các phiên cục bộ sau
        </Text>
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[typography.body, { color: colors.error }]}>
          {error}
        </Text>
      ) : null}
      <AppButton title="Đồng ý và tiếp tục" loading={saving} onPress={accept} />
      <View style={{ marginTop: spacing.sm }}>
        <AppButton title="Từ chối" variant="outline" onPress={() => router.back()} />
      </View>
    </ScreenContainer>
  );
}
