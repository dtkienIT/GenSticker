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
  const session = useProductSessionStore();
  useEffect(() => {
    if (!session.hasHydrated || session.hasAttemptedResume || pathname !== '/') return;
    session.beginResume();
    void (async () => {
      try {
        await getStickerProductService().getCurrentUser();
        if (session.activePackId) {
          await getStickerProductService().getStickerPack(session.activePackId);
          router.replace(`/pack/${session.activePackId}` as Href);
        } else if (session.activeJobId) {
          const job = await getStickerProductService().getGenerationJob(session.activeJobId);
          router.replace(
            (job.status === 'succeeded'
              ? `/canonical/candidates?characterId=${job.characterId}`
              : `/canonical/generating?jobId=${job.id}`) as Href,
          );
        }
      } catch {
        session.clearActiveFlow();
      } finally {
        session.finishResume();
      }
    })();
  }, [pathname, router, session]);
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
