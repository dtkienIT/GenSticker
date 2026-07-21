import React from 'react';
import { Stack, usePathname, useRouter, type Href } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useAppTheme } from '../src/theme';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useProductSessionStore } from '../src/store/useProductSessionStore';
import { getStickerProductService } from '../src/services/factory';

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

function BootstrapResume() {
  const router = useRouter();
  const pathname = usePathname();
  const hasHydrated = useProductSessionStore((state) => state.hasHydrated);
  const hasAttemptedResume = useProductSessionStore((state) => state.hasAttemptedResume);
  const activePackId = useProductSessionStore((state) => state.activePackId);
  const activeJobId = useProductSessionStore((state) => state.activeJobId);
  const beginResume = useProductSessionStore((state) => state.beginResume);
  const finishResume = useProductSessionStore((state) => state.finishResume);
  const clearActiveFlow = useProductSessionStore((state) => state.clearActiveFlow);

  useEffect(() => {
    if (!hasHydrated || hasAttemptedResume || pathname !== '/') return;
    beginResume();
    void (async () => {
      try {
        await getStickerProductService().getCurrentUser();
        if (activePackId) {
          await getStickerProductService().getStickerPack(activePackId);
          router.replace(`/pack/${activePackId}` as Href);
        } else if (activeJobId) {
          const job = await getStickerProductService().getGenerationJob(activeJobId);
          router.replace(
            (job.status === 'succeeded'
              ? `/canonical/candidates?characterId=${job.characterId}`
              : `/canonical/generating?jobId=${job.id}`) as Href,
          );
        }
      } catch {
        clearActiveFlow();
      } finally {
        finishResume();
      }
    })();
  }, [
    activeJobId,
    activePackId,
    beginResume,
    clearActiveFlow,
    finishResume,
    hasAttemptedResume,
    hasHydrated,
    pathname,
    router,
  ]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BootstrapResume />
          <NavigationStack />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
