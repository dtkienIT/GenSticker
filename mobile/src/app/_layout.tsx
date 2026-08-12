import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/providers/app-providers';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.canvas },
          headerStyle: { backgroundColor: colors.canvas },
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerBackButtonDisplayMode: 'minimal',
          headerTitleStyle: { fontWeight: '800' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create" options={{ title: 'Tạo bộ sticker' }} />
        <Stack.Screen name="jobs/[id]" options={{ title: 'Đang tạo sticker' }} />
        <Stack.Screen name="preview/[id]" options={{ title: 'Xem trước bộ sticker' }} />
        <Stack.Screen name="packs/[id]" options={{ title: 'Bộ sticker đã lưu' }} />
      </Stack>
    </AppProviders>
  );
}
