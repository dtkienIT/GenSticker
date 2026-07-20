import React from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useAppTheme } from '../src/theme';
import { StatusBar } from 'expo-status-bar';

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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <NavigationStack />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
