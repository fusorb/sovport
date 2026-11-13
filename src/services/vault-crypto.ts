// SovPort — AES-256-GCM cipher for the on-device credential vault.
//
// The vault payload (signed VCs, which can carry personal data) is sealed with
// AES-256-GCM under a key that lives in the OS keychain/keystore. The key is
// device-only (never restored from a backup) and never leaves the device.

import {
  AESEncryptionKey,
  AESKeySize,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
} from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import type { Cipher } from '@/lib/encrypted-storage';
import { utf8FromBytes, utf8ToBytes } from '@/lib/crypto';

const KEY_STORE_KEY = 'sovport-vault-key';
const ENVELOPE_PREFIX = 'v1:';
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;

// The key never syncs to a backup or another device.
const KEY_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

let cachedKey: AESEncryptionKey | null = null;

async function loadKey(): Promise<AESEncryptionKey> {
  if (cachedKey) return cachedKey;

  const stored = await SecureStore.getItemAsync(KEY_STORE_KEY, KEY_STORE_OPTIONS);
  if (stored) {
    cachedKey = await AESEncryptionKey.import(stored, 'base64');
    return cachedKey;
  }

  const key = await AESEncryptionKey.generate(AESKeySize.AES256);
  await SecureStore.setItemAsync(KEY_STORE_KEY, await key.encoded('base64'), KEY_STORE_OPTIONS);
  cachedKey = key;
  return key;
}

/** AES-256-GCM cipher backing the credential vault. */
export const vaultCipher: Cipher = {
  async encrypt(plaintext: string): Promise<string> {
    const key = await loadKey();
    const sealed = await aesEncryptAsync(utf8ToBytes(plaintext), key);
    return ENVELOPE_PREFIX + (await sealed.combined('base64'));
  },

  async decrypt(ciphertext: string): Promise<string> {
    if (!ciphertext.startsWith(ENVELOPE_PREFIX)) {
      throw new Error('Unrecognized vault envelope');
    }
    const key = await loadKey();
    const sealed = AESSealedData.fromCombined(ciphertext.slice(ENVELOPE_PREFIX.length), {
      ivLength: GCM_IV_LENGTH,
      tagLength: GCM_TAG_LENGTH,
    });
    return utf8FromBytes(await aesDecryptAsync(sealed, key, { output: 'bytes' }));
  },
};
