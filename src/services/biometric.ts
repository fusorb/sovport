// SovPort — device biometric unlock (expo-local-authentication).
// Used to gate access to the wallet after the device has been paired with
// a SovGrant account. SovPort never stores the user's password; the paired
// device token is unlocked behind biometrics.

import * as LocalAuthentication from "expo-local-authentication";

export type BiometricKind = "fingerprint" | "face" | "iris" | "none";

export async function biometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function biometricKind(): Promise<BiometricKind> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return "face";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return "fingerprint";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return "iris";
  }
  return "none";
}

export async function unlockWithBiometrics(promptMessage = "Unlock sovport"): Promise<boolean> {
  const available = await biometricAvailable();
  if (!available) return true; // no biometrics enrolled -> allow (dev/fallback)
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });
  return result.success;
}
