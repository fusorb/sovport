import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { credentialService } from '@/services/credentials';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Offer accept screen — reached via the deep link `sovport://offer?token=…`
 * (the token is the one-time offer token from the issuer).
 *
 * Storing a credential is a state change the holder has to consent to, and a
 * deep link is external input, so nothing is accepted until the user taps
 * accept; the screen never accepts on mount.
 */
export default function OfferScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [status, setStatus] = useState<'idle' | 'accepting' | 'accepted' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/pair');
  }, [isAuthenticated, router]);

  const accept = useCallback(async () => {
    if (!token) {
      setError('Missing offer token in the link.');
      setStatus('failed');
      return;
    }
    setStatus('accepting');
    setError(null);

    const result = await credentialService.acceptOffer(token);

    if (result.error) {
      setError(result.error.message ?? 'Failed to accept offer.');
      setStatus('failed');
      return;
    }
    setStatus('accepted');
  }, [token]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {status === 'accepted' ? (
          <>
            <ThemedText type="title">Offer accepted</ThemedText>
            <ThemedText themeColor="textSecondary">
              The credential has been added to your wallet.
            </ThemedText>
          </>
        ) : status === 'failed' ? (
          <>
            <ThemedText type="title">Could not accept offer</ThemedText>
            <ThemedText themeColor="textSecondary">{error}</ThemedText>
          </>
        ) : (
          <>
            <ThemedText type="title">Credential offer</ThemedText>
            <ThemedText themeColor="textSecondary">
              An issuer wants to put a credential in your wallet. It will be stored on this device
              only.
            </ThemedText>
            {status === 'accepting' && <ActivityIndicator style={styles.spinner} />}
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              onPress={accept}
              disabled={status === 'accepting'}
            >
              <ThemedText style={styles.buttonText}>Accept credential</ThemedText>
            </Pressable>
          </>
        )}

        <Pressable onPress={() => router.replace('/')}>
          <ThemedText type="link">
            {status === 'accepted' ? 'Back to wallet' : 'Decline'}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  spinner: {
    marginTop: Spacing.two,
  },
  button: {
    backgroundColor: '#4AD3F5',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  buttonText: {
    color: '#000',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
