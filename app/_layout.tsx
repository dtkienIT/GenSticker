import React, { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useAppTheme } from '../src/theme';
import { StatusBar } from 'expo-status-bar';
import { useProductSessionStore } from '../src/store/useProductSessionStore';
import { getStickerProductService, getStickerServiceMode } from '../src/services/factory';

const queryClient = new QueryClient();

function NavigationStack() {
  const { colors, isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'GenSticker' }} />
        <Stack.Screen name="create/index" options={{ title: 'Create Sticker' }} />
        <Stack.Screen name="create/text" options={{ title: 'Text to Sticker' }} />
        <Stack.Screen name="create/selfie" options={{ title: 'Selfie to Sticker' }} />
        <Stack.Screen
          name="create/generating"
          options={{ title: 'Creating...', headerBackVisible: false }}
        />
        <Stack.Screen name="create/result" options={{ title: 'Sticker Ready!' }} />
        <Stack.Screen name="library/index" options={{ title: 'Sticker Library' }} />
        <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}

function BootstrapConsent() {
  const hasHydrated = useProductSessionStore((state) => state.hasHydrated);
  const clearConsent = useProductSessionStore((state) => state.clearConsent);
  const setConsentState = useProductSessionStore((state) => state.setConsentState);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!hasHydrated || hasStarted.current || getStickerServiceMode() !== 'http') return;
    hasStarted.current = true;
    clearConsent();
    void getStickerProductService().getConsentState().then(setConsentState).catch(clearConsent);
  }, [clearConsent, hasHydrated, setConsentState]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BootstrapConsent />
          <NavigationStack />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
