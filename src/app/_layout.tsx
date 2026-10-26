import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreenExpo from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { sgClient } from '@/sdk';
import { useAuthStore } from '@/stores/auth-store';

SplashScreenExpo.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (isLoading) return;
    SplashScreenExpo.hideAsync();

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'mfa';
    const isPublicRoute = inAuthGroup || segments[0] === 'offer' || segments[0] === 'present';
    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const restore = useAuthStore((s) => s.restore);

  useEffect(() => {
    restore().then((restored) => {
      if (restored) {
        sgClient.setAccessToken(useAuthStore.getState().accessToken);
      }
    });
  }, [restore]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthGate>
        <AnimatedSplashOverlay />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="mfa" options={{ headerShown: false }} />
          <Stack.Screen name="offer" options={{ title: "Accept offer" }} />
          <Stack.Screen name="present" options={{ title: "Present credential" }} />
          <Stack.Screen name="did" options={{ title: "Wallet identity" }} />
        </Stack>
      </AuthGate>
    </ThemeProvider>
  );
}
