import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { kv } from '@/lib/kv';
import { authService } from '@/services/auth';
import { credentialService } from '@/services/credentials';
import { credentialVault } from '@/services/credential-vault';
import { walletDidService } from '@/services/wallet-did';
import { useAuthStore } from '@/stores/auth-store';
import type { Credential } from '@fusorb/facet-sdk';

interface CredentialRow {
  credential: Credential;
  held: boolean;
}

export default function WalletHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [rows, setRows] = useState<CredentialRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [didRegistered, setDidRegistered] = useState<boolean | null>(null);

  const loadCredentials = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    const [result, held] = await Promise.all([credentialService.list(), credentialVault.list()]);
    setLoading(false);
    const heldIds = new Set(held.map((h) => h.credentialId));
    if (result.data) {
      setRows(result.data.map((credential) => ({ credential, held: heldIds.has(credential.id) })));
    }
  }, [accessToken]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  // First-launch DID registration: if signed in with no registered DID, route
  // to /did unless the user explicitly skipped it before.
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const registered = await walletDidService.hasRegisteredDid();
      setDidRegistered(registered);
      if (registered) return;
      if ((await kv.get('sovport-did-skip')) === '1') return;
      router.replace('/did');
    })();
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/pair');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">SovPort</ThemedText>
          <ThemedText themeColor="textSecondary">
            {isAuthenticated && user ? `Connected: ${user.name || user.email}` : 'Not connected'}
          </ThemedText>
        </ThemedView>

        {didRegistered === false && (
          <Pressable
            style={({ pressed }) => [styles.setupBanner, pressed && styles.pressed]}
            onPress={() => router.push('/did')}
          >
            <ThemedText type="smallBold">Set up your wallet identity</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Register a device did:key so you can present credentials.
            </ThemedText>
          </Pressable>
        )}

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Credentials</ThemedText>
          {loading ? (
            <ThemedText themeColor="textSecondary">Loading…</ThemedText>
          ) : !rows || rows.length === 0 ? (
            <ThemedText themeColor="textSecondary">
              No credentials yet. Accept an offer from a trusted issuer to hold it here.
            </ThemedText>
          ) : (
            rows.map(({ credential, held }) => (
              <ThemedView
                key={credential.id}
                type="backgroundElement"
                style={styles.credentialCard}
              >
                <ThemedText type="default" style={styles.credentialTitle}>
                  {credential.type}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Issued{' '}
                  {credential.issuedAt ? new Date(credential.issuedAt).toLocaleDateString() : '—'}
                  {credential.expiresAt
                    ? ` · expires ${new Date(credential.expiresAt).toLocaleDateString()}`
                    : ''}
                  {held ? ' · stored on this device' : ' · not stored'}
                </ThemedText>
              </ThemedView>
            ))
          )}
        </ThemedView>

        {isAuthenticated && (
          <Pressable
            style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
            onPress={handleLogout}
          >
            <ThemedText style={styles.logoutText}>Disconnect</ThemedText>
          </Pressable>
        )}
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
    gap: Spacing.four,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  setupBanner: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: '#4AD3F5',
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  credentialCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  credentialTitle: {
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: Spacing.four,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#FF453A',
  },
  logoutText: {
    color: '#FF453A',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
