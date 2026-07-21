import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useAppTheme } from '@/theme';
import { useStickerStore } from '@/store/useStickerStore';

function AppBootstrap() {
  const hasHydrated = useStickerStore((state) => state.hasHydrated);
  const initialize = useStickerStore((state) => state.initialize);
  useEffect(() => {
    if (hasHydrated) void initialize();
  }, [hasHydrated, initialize]);
  return null;
}

function NavigationStack() {
  const { colors, isDark } = useAppTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'GenSticker' }} />
        <Stack.Screen
          name="create/generating"
          options={{ title: 'Creating sticker', headerBackVisible: false }}
        />
        <Stack.Screen name="create/result" options={{ title: 'Sticker ready' }} />
        <Stack.Screen name="library/index" options={{ title: 'My Stickers' }} />
        <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
        <Stack.Screen name="debug" options={{ title: 'Local diagnostics' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppBootstrap />
        <NavigationStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
