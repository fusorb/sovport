import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreenExpo from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { sgClient } from '@/sdk';
import { unlockWithBiometrics } from '@/services/biometric';
import { useAuthStore } from '@/stores/auth-store';

SplashScreenExpo.preventAutoHideAsync();

/** Shown while a paired session is waiting for its owner to authenticate. */
function LockedView({ onUnlock }: { onUnlock: () => void }) {
  return (
    <ThemedView style={styles.locked}>
      <ThemedText type="title">SovPort</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.lockedHint}>
        Unlock to open your wallet.
      </ThemedText>
      <Pressable
        style={({ pressed }) => [styles.unlockButton, pressed && styles.pressed]}
        onPress={onUnlock}
      >
        <ThemedText style={styles.unlockText}>Unlock SovPort</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function PairingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [unlocked, setUnlocked] = useState(false);
  const [attemptFailed, setAttemptFailed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [suspended, setSuspended] = useState(false);
  // Identifies the current unlock attempt so a prompt the OS dismissed (because
  // the app went to the background) cannot report its result over a fresh one.
  const attempt = useRef(0);

  const unlock = useCallback(async () => {
    const id = ++attempt.current;
    let ok = false;
    try {
      ok = await unlockWithBiometrics('Unlock SovPort');
    } catch {
      // A prompt that fails to run is a failed unlock, not a stuck gate.
      ok = false;
    }
    if (attempt.current !== id) return;
    setUnlocked(ok);
    setAttemptFailed(!ok);
  }, []);

  // The wallet re-locks whenever the app leaves the foreground, so returning to
  // it always asks the device owner to authenticate again (ADR 0006). 'inactive'
  // is ignored on purpose: iOS reports it for the biometric prompt itself and
  // for transient overlays, so locking there would re-lock the instant the user
  // authenticates.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        attempt.current += 1;
        setSuspended(true);
        setUnlocked(false);
        setAttemptFailed(false);
      } else if (next === 'active') {
        setSuspended(false);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inPairing = segments[0] === 'pair' || segments[0] === 'approve' || segments[0] === 'mfa';

    if (!isAuthenticated) {
      // Not paired yet -> pairing is the only place to be, and nothing stays
      // unlocked without a session.
      setUnlocked(false);
      setAttemptFailed(false);
      if (!inPairing) router.replace('/pair');
      setChecking(false);
      return;
    }

    // Paired -> require device authentication before showing the wallet. The
    // prompt is raised once per lock; if it is cancelled the gate falls back to
    // an explicit unlock view rather than re-prompting on every navigation, and
    // a prompt is never raised while the app is in the background.
    if (!unlocked) {
      if (!suspended && !attemptFailed) {
        void unlock();
        return;
      }
      setChecking(false);
      return;
    }

    if (inPairing && segments[0] !== 'approve') router.replace('/');
    setChecking(false);
  }, [isAuthenticated, isLoading, segments, router, unlocked, attemptFailed, suspended, unlock]);

  if (isLoading || checking) return null;
  if (isAuthenticated && !unlocked) return <LockedView onUnlock={unlock} />;
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
      <AnimatedSplashOverlay />
      <PairingGate>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="pair" options={{ headerShown: false }} />
          <Stack.Screen name="approve" options={{ headerShown: false }} />
          <Stack.Screen name="mfa" options={{ headerShown: false }} />
          <Stack.Screen name="offer" options={{ title: 'Accept offer' }} />
          <Stack.Screen name="present" options={{ title: 'Present credential' }} />
          <Stack.Screen name="scan" options={{ title: 'Scan to present' }} />
          <Stack.Screen name="did" options={{ title: 'Wallet identity' }} />
        </Stack>
      </PairingGate>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  locked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  lockedHint: {
    textAlign: 'center',
  },
  unlockButton: {
    backgroundColor: '#4AD3F5',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  unlockText: {
    color: '#000',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
