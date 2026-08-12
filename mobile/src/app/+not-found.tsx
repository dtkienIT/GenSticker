import { router } from 'expo-router';

import { Button, Screen, StateView } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <Screen scroll={false}>
      <StateView
        action={<Button label="Về trang chủ" onPress={() => router.replace('/(tabs)')} />}
        body="Đường dẫn này không còn tồn tại hoặc đã hết hạn."
        icon="map-outline"
        title="Không tìm thấy màn hình"
      />
    </Screen>
  );
}
