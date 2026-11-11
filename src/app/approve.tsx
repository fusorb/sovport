import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getDeviceId, signWithDeviceKey } from '@/services/device-identity';
import { sgClient } from '@/sdk';

export default function ApproveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ challenge?: string }>();
  const challenge = params.challenge;
  const [status, setStatus] = useState<'loading' | 'ready' | 'approving' | 'approved' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!challenge) {
      setError('Missing approval challenge');
      setStatus('error');
      return;
    }
    setStatus('ready');
  }, [challenge]);

  const handleApprove = async () => {
    if (!challenge) return;
    setStatus('approving');
    setError(null);
    try {
      // Signing is biometric-gated inside signWithDeviceKey.
      let deviceId: string;
      let signature: string;
      try {
        [deviceId, signature] = await Promise.all([getDeviceId(), signWithDeviceKey(challenge)]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not sign the approval.');
        setStatus('ready');
        return;
      }

      // @fusorb/facet-sdk@2.1.1 drops `deviceId` from approveDeviceApproval's
      // request body, so POST the route directly. Revert to the SDK method once
      // the fixed SDK is published.
      await sgClient.post<{ success: boolean }>(`/identity/device-approvals/${challenge}/approve`, {
        deviceId,
        signature,
      });

      setStatus('approved');
      setTimeout(() => router.replace('/'), 1500);
    } catch (e: any) {
      setError(e?.message ?? 'Approval failed');
      setStatus('ready');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Approve Sign-in</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          A sign-in request is waiting for approval
        </ThemedText>

        {status === 'loading' && <ActivityIndicator style={styles.loader} />}
        {status === 'ready' && (
          <View style={styles.actions}>
            <Pressable style={styles.approveBtn} onPress={handleApprove}>
              <ThemedText style={styles.approveText}>Approve with biometrics</ThemedText>
            </Pressable>
            <Pressable style={styles.rejectBtn} onPress={() => router.replace('/')}>
              <ThemedText style={styles.rejectText}>Cancel</ThemedText>
            </Pressable>
          </View>
        )}
        {status === 'approving' && <ActivityIndicator style={styles.loader} />}
        {status === 'approved' && <ThemedText style={styles.success}>Approved</ThemedText>}
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  subtitle: { textAlign: 'center' },
  loader: { marginTop: Spacing.four },
  actions: { width: '100%', gap: Spacing.two, marginTop: Spacing.four },
  approveBtn: {
    backgroundColor: '#4AD3F5',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  approveText: { color: '#000', fontWeight: '600' },
  rejectBtn: {
    borderWidth: 1,
    borderColor: '#3A3A3C',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  rejectText: { fontWeight: '600' },
  success: { color: '#32D74B', marginTop: Spacing.four, fontWeight: '600' },
  error: { color: '#FF453A', marginTop: Spacing.two },
});
