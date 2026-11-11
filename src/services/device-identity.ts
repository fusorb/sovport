// SovPort — the wallet's single device identity.
//
// One Ed25519 keypair + one device id, held in the secure store, backs BOTH:
//   - the paired device (public key registered for sign-in approval), and
//   - the wallet did:key (public JWK registered for credential presentation).
//
// The private key never leaves the device; only the public key is ever sent to
// SovGrant. Key creation and signing are gated behind device biometrics.

import * as SecureStore from 'expo-secure-store';

import { unlockWithBiometrics } from './biometric';
import {
  didKeyFromEd25519,
  ed25519PublicJwk,
  ed25519PublicKey,
  ed25519Sign,
  fromBase64Url,
  randomBytes,
  type Ed25519PublicJwk,
  toBase64Url,
  utf8ToBytes,
} from '@/lib/crypto';

const STORE_KEY = 'sovport-device-key';

interface StoredDeviceIdentity {
  secretKey: string;
  publicKey: string;
  deviceId: string;
}

export interface DeviceIdentity {
  secretKey: Uint8Array;
  publicKey: Uint8Array;
  deviceId: string;
}

let cache: DeviceIdentity | null = null;

function decode(stored: StoredDeviceIdentity): DeviceIdentity {
  return {
    secretKey: fromBase64Url(stored.secretKey),
    publicKey: fromBase64Url(stored.publicKey),
    deviceId: stored.deviceId,
  };
}

/** Load the device identity, generating it on first use. */
export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  if (cache) return cache;

  const raw = await SecureStore.getItemAsync(STORE_KEY);
  if (raw) {
    cache = decode(JSON.parse(raw) as StoredDeviceIdentity);
    return cache;
  }

  const unlocked = await unlockWithBiometrics('Create your SovPort device key');
  if (!unlocked) throw new Error('Biometric authentication required to create the device key');

  const secretKey = await randomBytes(32);
  const publicKey = ed25519PublicKey(secretKey);
  const deviceId = toBase64Url(await randomBytes(16));

  const stored: StoredDeviceIdentity = {
    secretKey: toBase64Url(secretKey),
    publicKey: toBase64Url(publicKey),
    deviceId,
  };
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(stored));

  cache = { secretKey, publicKey, deviceId };
  return cache;
}

/** Stable per-device id (opaque to SovGrant; used as the wallet's provider id). */
export async function getDeviceId(): Promise<string> {
  return (await getDeviceIdentity()).deviceId;
}

/** Public JWK for wallet-DID registration. */
export async function getDevicePublicJwk(): Promise<Ed25519PublicJwk> {
  return ed25519PublicJwk((await getDeviceIdentity()).publicKey);
}

/** The device's did:key — the identifier it presents credentials with. */
export async function getDeviceDid(): Promise<string> {
  return didKeyFromEd25519((await getDeviceIdentity()).publicKey);
}

/** Ed25519-sign a challenge (base64url signature), gated behind biometrics. */
export async function signWithDeviceKey(challenge: string): Promise<string> {
  const unlocked = await unlockWithBiometrics('Authenticate with your device key');
  if (!unlocked) throw new Error('Biometric authentication required');

  const { secretKey } = await getDeviceIdentity();
  return toBase64Url(ed25519Sign(utf8ToBytes(challenge), secretKey));
}

/** Drop the device identity (e.g. on disconnect). */
export async function clearDeviceIdentity(): Promise<void> {
  cache = null;
  await SecureStore.deleteItemAsync(STORE_KEY);
}
