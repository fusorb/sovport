import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { credentialService } from '@/services/credentials';
import { credentialVault } from '@/services/credential-vault';
import { getDeviceDid } from '@/services/device-identity';
import { presentCredential } from '@/services/presentation';
import { useAuthStore } from '@/stores/auth-store';

interface PresentableCredential {
  id: string;
  label: string;
}

/**
 * Presentation screen — reached via the deep link
 * `sovport://present?sessionId=…&challenge=…` (from the verifier's QR code).
 * The holder picks a locally-held credential; the wallet signs a detached JWS
 * proof with its on-device did:key and SovGrant verifies it.
 */
export default function PresentScreen() {
  const router = useRouter();
  const { sessionId, challenge } = useLocalSearchParams<{ sessionId: string; challenge: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [items, setItems] = useState<PresentableCredential[] | null>(null);
  const [selected, setSelected] = useState<PresentableCredential | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [presenting, setPresenting] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; reason?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/pair');
      return;
    }
    (async () => {
      const [listRes, held, deviceDid] = await Promise.all([
        credentialService.list(),
        credentialVault.list(),
        getDeviceDid(),
      ]);
      // Only credentials held on this device can be presented.
      const metaById = new Map((listRes.data ?? []).map((c) => [c.id, c]));
      setItems(
        held.map((h) => ({
          id: h.credentialId,
          label: metaById.get(h.credentialId)?.type ?? 'Verifiable credential',
        })),
      );
      setDid(deviceDid);
      setLoading(false);
    })();
  }, [isAuthenticated, router]);

  const handlePresent = async () => {
    if (!selected || !did || !sessionId || !challenge) {
      setError('Missing credential, DID, or session details.');
      return;
    }
    setPresenting(true);
    setError(null);

    const credential = await credentialVault.get(selected.id);
    if (!credential) {
      setPresenting(false);
      setError('That credential is not stored on this device.');
      return;
    }

    const res = await presentCredential({ sessionId, challenge, credential, did });
    setPresenting(false);
    if (res.data) {
      setResult({ valid: res.data.valid, reason: res.data.reason });
    } else {
      setError(res.error?.message ?? 'Presentation failed.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title">Present credential</ThemedText>
        <ThemedText themeColor="textSecondary">
          A verifier is asking you to prove you hold a credential.
        </ThemedText>

        {loading ? (
          <ActivityIndicator style={styles.spacer} />
        ) : !items || items.length === 0 ? (
          <ThemedText themeColor="textSecondary">
            You have no credentials stored on this device to present.
          </ThemedText>
        ) : (
          <ThemedView style={styles.list}>
            {items.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setSelected(c)}
                style={({ pressed }) => [styles.credentialOption, pressed && styles.pressed]}
              >
                <ThemedView
                  type={selected?.id === c.id ? 'backgroundSelected' : 'backgroundElement'}
                  style={styles.credentialInner}
                >
                  <ThemedText type="default" style={styles.credentialTitle}>
                    {c.label}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          </ThemedView>
        )}

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        {result && (
          <ThemedText style={result.valid ? styles.success : styles.error}>
            {result.valid ? '✓ Verified' : `✗ Rejected: ${result.reason ?? 'unknown'}`}
          </ThemedText>
        )}

        {selected && did && !result && (
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={handlePresent}
            disabled={presenting}
          >
            {presenting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <ThemedText style={styles.buttonText}>Present {selected.label}</ThemedText>
            )}
          </Pressable>
        )}

        <Pressable onPress={() => router.replace('/')}>
          <ThemedText type="link">Back to wallet</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  spacer: {
    marginTop: Spacing.five,
  },
  list: {
    gap: Spacing.two,
  },
  credentialOption: {
    width: '100%',
  },
  credentialInner: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  credentialTitle: {
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#4AD3F5',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonText: {
    color: '#000',
    fontWeight: '600',
  },
  error: {
    color: '#FF453A',
  },
  success: {
    color: '#30D158',
  },
  pressed: {
    opacity: 0.7,
  },
});
