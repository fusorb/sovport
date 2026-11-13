import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { parsePresentRequest } from '@/lib/present-link';
import { useAuthStore } from '@/stores/auth-store';

/**
 * In-app QR scanner — the alternative to the `sovport://present` deep link.
 * Reads the verifier's QR, extracts the session request, and hands off to the
 * presentation screen (replacing this route so Back doesn't reopen the camera).
 */
export default function ScanScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/pair');
  }, [isAuthenticated, router]);

  const handleScan = ({ data }: { data: string }) => {
    if (handled.current) return;
    const request = parsePresentRequest(data);
    if (!request) {
      setError('That QR code is not a SovPort presentation request.');
      return;
    }
    handled.current = true;
    router.replace({ pathname: '/present', params: request });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Scan to present</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.hint}>
          Point your camera at the verifier&apos;s QR code.
        </ThemedText>

        {permission === null ? (
          <ThemedText themeColor="textSecondary" style={styles.spacer}>
            Checking camera access…
          </ThemedText>
        ) : !permission.granted ? (
          <ThemedView style={styles.permissionBlock}>
            <ThemedText themeColor="textSecondary">
              SovPort needs camera access to scan presentation QR codes.
            </ThemedText>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              onPress={() =>
                permission.canAskAgain ? requestPermission() : Linking.openSettings()
              }
            >
              <ThemedText style={styles.buttonText}>
                {permission.canAskAgain ? 'Grant camera access' : 'Open settings'}
              </ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScan}
          />
        )}

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        <Pressable onPress={() => router.replace('/')}>
          <ThemedText type="link">Cancel</ThemedText>
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
    padding: Spacing.four,
    gap: Spacing.three,
  },
  hint: {
    textAlign: 'center',
  },
  spacer: {
    marginTop: Spacing.five,
  },
  camera: {
    flex: 1,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  permissionBlock: {
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  button: {
    backgroundColor: '#4AD3F5',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: '600',
  },
  error: {
    color: '#FF453A',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
