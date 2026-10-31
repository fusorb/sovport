import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { authService } from '@/services/auth';
import { ensureDeviceKeypair } from '@/services/device';
import { identity } from '@/sdk';

export default function PairScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePair = async () => {
    if (!email || !password) {
      setError('Enter your SovGrant account email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authService.login(email, password);
      if (result.error) {
        setError(result.error.message ?? 'Pairing failed.');
        setLoading(false);
        return;
      }

      // Register this device as a trusted paired device
      try {
        const kp = await ensureDeviceKeypair();
        if (kp.deviceId && kp.publicKey) {
          const { Platform } = await import('react-native');
          await identity.registerPairedDevice?.({
            deviceId: kp.deviceId,
            publicKey: kp.publicKey,
            platform: Platform.OS,
          });
        }
      } catch {
        // Device registration is best-effort; pairing still succeeds
      }

      router.replace('/' as Href);
    } catch (e: any) {
      setError(e?.message ?? 'Pairing failed.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">sovport</ThemedText>
        <ThemedText themeColor="textSecondary">
          Connect this device to your SovGrant account
        </ThemedText>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#8E8E93"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#8E8E93"
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={handlePair}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Connect account</ThemedText>
            )}
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            Don't have an account? Create one at your SovGrant console, then return here to connect this device.
          </ThemedText>
        </View>
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
  form: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  input: {
    borderWidth: 1,
    borderColor: '#3A3A3C',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#1C1C1E',
  },
  button: {
    backgroundColor: '#4AD3F5',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#000', fontWeight: '600' },
  pressed: { opacity: 0.7 },
  error: { color: '#FF453A' },
  hint: { textAlign: 'center', marginTop: Spacing.two },
});
