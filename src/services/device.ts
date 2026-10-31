// SovPort - Device keypair management for trusted device binding
// Keys stored in SecureStore, unlocked behind biometrics. Public key registered
// with SovGrant as a paired device.

import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { unlockWithBiometrics } from "./biometric";

const DEVICE_PRIV_KEY = "sg_device_priv_key";
const DEVICE_PUB_KEY = "sg_device_pub_key";
const DEVICE_ID_KEY = "sg_device_id";

export interface DeviceKeypair {
  deviceId: string | null;
  publicKey: string | null;
  hasKey: boolean;
}

// Simple key material generation using expo-crypto
// For production, would use expo-crypto's secure random + proper key derivation
export async function ensureDeviceKeypair(): Promise<DeviceKeypair> {
  const [pub, priv, devId] = await Promise.all([
    SecureStore.getItemAsync(DEVICE_PUB_KEY),
    SecureStore.getItemAsync(DEVICE_PRIV_KEY),
    SecureStore.getItemAsync(DEVICE_ID_KEY),
  ]);

  if (pub && priv) {
    return { deviceId: devId, publicKey: pub, hasKey: true };
  }

  // Generate new keypair
  const unlocked = await unlockWithBiometrics("Create device keypair");
  if (!unlocked) throw new Error("Biometric authentication required");

  const random = await Crypto.getRandomBytesAsync(32);
  const pubKey = Buffer.from(random).toString("base64url");
  const privKey = Buffer.from(random).toString("base64url");
  const deviceId = Buffer.from(await Crypto.getRandomBytesAsync(16)).toString("base64url");

  await Promise.all([
    SecureStore.setItemAsync(DEVICE_PUB_KEY, pubKey),
    SecureStore.setItemAsync(DEVICE_PRIV_KEY, privKey),
    SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId),
  ]);

  return { deviceId, publicKey: pubKey, hasKey: true };
}

export async function getDeviceId(): Promise<string | null> {
  return SecureStore.getItemAsync(DEVICE_ID_KEY);
}

export async function signWithDeviceKey(data: string): Promise<string> {
  const unlocked = await unlockWithBiometrics("Authenticate with device key");
  if (!unlocked) throw new Error("Biometric authentication required");
  
  const privKey = await SecureStore.getItemAsync(DEVICE_PRIV_KEY);
  if (!privKey) throw new Error("No device keypair");
  
  // In production, would use proper Ed25519 signing
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data + privKey
  );
  return hash;
}
