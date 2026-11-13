// SovPort — device authentication gate (expo-local-authentication).
//
// Gated operations: wallet unlock after pairing, device-key creation, and
// challenge signing. SovPort never stores the user's password; the paired
// device token is unlocked behind device authentication.
//
// Threat model: an attacker holding an unlocked phone. If the device has any
// lock (biometrics or passcode), a sensitive operation must satisfy it first.
// A device with no lock at all has no secret to check against — that case is
// left permissive and can only be changed by enrolling a device lock.

import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricKind = 'fingerprint' | 'face' | 'iris' | 'none';

export async function biometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function biometricKind(): Promise<BiometricKind> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'face';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'iris';
  }
  return 'none';
}

/**
 * Require the device owner to authenticate before a sensitive operation.
 *
 * Uses the enrolled *security level*, not `isEnrolledAsync` (which reports only
 * biometrics): a passcode-only device previously slipped through and was allowed
 * with no prompt. `disableDeviceFallback: false` accepts the device passcode, so
 * every locked device is challenged. Only a device with no lock at all — nothing
 * to authenticate against — passes without a prompt.
 */
export async function unlockWithBiometrics(promptMessage = 'Unlock sovport'): Promise<boolean> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (level === LocalAuthentication.SecurityLevel.NONE) return true;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
}
