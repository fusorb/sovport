// SovPort — the wallet's single device identity.
//
// One Ed25519 keypair + one device id, held in the secure store, backs BOTH:
//   - the paired device (public key registered for sign-in approval), and
//   - the wallet did:key (public JWK registered for credential presentation).
//
// The private key never leaves the device; only the public key is ever sent to
// SovGrant. It is decoded for the duration of a signing call and never cached,
// and every signing call is gated behind device authentication.

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

/**
 * The device key *is* this installation's identity, so it is stored device-only:
 * it never syncs to a backup and is never restored onto another device (ADR
 * 0005). iOS is the platform that distinguishes the two; Android keys are
 * Keystore-bound either way.
 */
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

interface StoredDeviceIdentity {
  secretKey: string;
  publicKey: string;
  deviceId: string;
}

/** The public half of the device identity — the only part held in memory. */
interface DevicePublicIdentity {
  publicKey: Uint8Array;
  deviceId: string;
}

let cache: DevicePublicIdentity | null = null;
let inFlight: Promise<DevicePublicIdentity> | null = null;

function parseRecord(raw: string): StoredDeviceIdentity | null {
  try {
    const record = JSON.parse(raw) as Partial<StoredDeviceIdentity>;
    if (!record.secretKey || !record.publicKey || !record.deviceId) return null;
    return { secretKey: record.secretKey, publicKey: record.publicKey, deviceId: record.deviceId };
  } catch {
    return null;
  }
}

/**
 * Rewrite a record so it carries the device-only keychain class. Keychain
 * accessibility cannot be changed by an update, so the item has to be replaced —
 * this runs at most once per launch, on the load path where the public identity
 * is cached. Best-effort: a failure leaves the record readable.
 */
async function hardenStoredRecord(raw: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORE_KEY, STORE_OPTIONS);
    await SecureStore.setItemAsync(STORE_KEY, raw, STORE_OPTIONS);
  } catch {
    // The record stays readable with its previous accessibility class.
  }
}

/**
 * Load the device identity, generating it on first use.
 *
 * Single-flight: callers ask for the device id and the public JWK together
 * (pairing, DID registration), and two concurrent generations would leave the
 * registration holding a key the store no longer contains.
 */
async function loadPublicIdentity(): Promise<DevicePublicIdentity> {
  if (cache) return cache;

  inFlight ??= createOrLoadIdentity().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

async function createOrLoadIdentity(): Promise<DevicePublicIdentity> {
  const raw = await SecureStore.getItemAsync(STORE_KEY, STORE_OPTIONS);
  if (raw) {
    const record = parseRecord(raw);
    if (record) {
      cache = { publicKey: fromBase64Url(record.publicKey), deviceId: record.deviceId };
      await hardenStoredRecord(raw);
      return cache;
    }
  }

  const unlocked = await unlockWithBiometrics('Create your SovPort device key');
  if (!unlocked) {
    throw new Error('A device lock (passcode or biometrics) is required to create your device key');
  }

  const secretKey = await randomBytes(32);
  const publicKey = ed25519PublicKey(secretKey);
  const deviceId = toBase64Url(await randomBytes(16));

  const stored: StoredDeviceIdentity = {
    secretKey: toBase64Url(secretKey),
    publicKey: toBase64Url(publicKey),
    deviceId,
  };
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(stored), STORE_OPTIONS);

  cache = { publicKey, deviceId };
  return cache;
}

/** Stable per-device id (opaque to SovGrant; used as the wallet's provider id). */
export async function getDeviceId(): Promise<string> {
  return (await loadPublicIdentity()).deviceId;
}

/** Public JWK for wallet-DID registration. */
export async function getDevicePublicJwk(): Promise<Ed25519PublicJwk> {
  return ed25519PublicJwk((await loadPublicIdentity()).publicKey);
}

/** The device's did:key — the identifier it presents credentials with. */
export async function getDeviceDid(): Promise<string> {
  return didKeyFromEd25519((await loadPublicIdentity()).publicKey);
}

/**
 * Sign a message with the device key, behind device authentication. The secret
 * is read from the secure store for this call only — never cached — so no
 * decrypted copy outlives the operation.
 */
async function signWithDeviceKeyBytes(message: Uint8Array, prompt: string): Promise<Uint8Array> {
  const unlocked = await unlockWithBiometrics(prompt);
  if (!unlocked) {
    throw new Error('A device lock (passcode or biometrics) is required to sign');
  }

  const raw = await SecureStore.getItemAsync(STORE_KEY, STORE_OPTIONS);
  const record = raw ? parseRecord(raw) : null;
  if (!record) {
    throw new Error('This device has no key yet — connect your account first');
  }

  return ed25519Sign(message, fromBase64Url(record.secretKey));
}

/** Ed25519-sign an approval challenge (base64url signature). */
export async function signWithDeviceKey(challenge: string): Promise<string> {
  return toBase64Url(
    await signWithDeviceKeyBytes(utf8ToBytes(challenge), 'Authenticate with your device key'),
  );
}

/** Sign an arbitrary JWS signing input with the device key (same gate). */
export function signWithDeviceKeyMessage(
  message: Uint8Array,
  prompt?: string,
): Promise<Uint8Array> {
  return signWithDeviceKeyBytes(message, prompt ?? 'Authenticate with your device key');
}
