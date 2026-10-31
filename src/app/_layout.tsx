import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreenExpo from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { sgClient } from '@/sdk';
import { unlockWithBiometrics } from '@/services/biometric';
import { useAuthStore } from '@/stores/auth-store';

SplashScreenExpo.preventAutoHideAsync();

function PairingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    SplashScreenExpo.hideAsync();

    const inPairing = segments[0] === 'pair';

    if (!isAuthenticated) {
      // Not paired yet -> send to pairing screen.
      if (!inPairing) router.replace('/pair');
      setChecking(false);
      return;
    }

    // Paired -> require biometric unlock before showing wallet.
    if (!unlocked) {
      unlockWithBiometrics('Unlock sovport').then((ok) => {
        if (ok) setUnlocked(true);
        else router.replace('/pair');
        setChecking(false);
      });
      return;
    }

      if (inPairing) router.replace('/');
    setChecking(false);
  }, [isAuthenticated, isLoading, segments, router, unlocked]);

  if (isLoading || checking) return null;
  if (isAuthenticated && !unlocked) return null;
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
      <PairingGate>
        <AnimatedSplashOverlay />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="pair" options={{ headerShown: false }} />
          <Stack.Screen name="offer" options={{ title: 'Accept offer' }} />
          <Stack.Screen name="present" options={{ title: 'Present credential' }} />
          <Stack.Screen name="did" options={{ title: 'Wallet identity' }} />
        </Stack>
      </PairingGate>
    </ThemeProvider>
  );
}
