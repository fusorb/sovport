// SovPort — storage decorator that encrypts values at rest.
//
// The credential vault persists signed VCs, which can carry personal data, in a
// plain key/value store. This wraps that store so every value is sealed by an
// injected cipher before it is written. Pure: the cipher is injected, so the
// logic unit-tests without any platform crypto (the AES-256-GCM implementation
// lives in src/services/vault-crypto).

import type { KeyValueStorage } from './credential-vault';

export interface Cipher {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}

function looksLikeJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wrap `inner` so values are encrypted. A value that fails to decrypt is treated
 * as pre-encryption legacy data when it parses as JSON: it is returned as-is and
 * re-encrypted in place. Anything else is reported as absent, so a corrupted or
 * foreign value never surfaces as if it were valid.
 */
export function createEncryptedStorage(inner: KeyValueStorage, cipher: Cipher): KeyValueStorage {
  async function set(key: string, value: string): Promise<void> {
    await inner.set(key, await cipher.encrypt(value));
  }

  return {
    async get(key: string): Promise<string | null> {
      const raw = await inner.get(key);
      if (raw === null) return null;
      try {
        return await cipher.decrypt(raw);
      } catch {
        if (!looksLikeJson(raw)) return null;
        try {
          await set(key, raw);
        } catch {
          // Migration is best-effort; the value stays readable either way.
        }
        return raw;
      }
    },

    set,

    remove(key: string): Promise<void> {
      return inner.remove(key);
    },
  };
}
