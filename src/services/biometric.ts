// SovPort — device authentication gate (expo-local-authentication).
//
// Gated operations: wallet unlock after pairing, device-key creation, and
// challenge signing. SovPort never stores the user's password; the paired
// device token is unlocked behind device authentication.
//
// Policy (ADR 0004): a device must have a lock — biometrics or passcode — to
// perform a sensitive operation. A device with no lock at all has nothing to
// authenticate against, so the operation is refused rather than allowed.

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
 * Uses the enrolled *security level* rather than `isEnrolledAsync` (which
 * reports only biometrics), so a passcode-only device is challenged too.
 * `disableDeviceFallback: false` accepts the device passcode. A device with no
 * lock at all has nothing to authenticate against and is refused.
 */
export async function unlockWithBiometrics(promptMessage = 'Unlock sovport'): Promise<boolean> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (level === LocalAuthentication.SecurityLevel.NONE) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
}
