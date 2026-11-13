/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createCredentialVault } from './credential-vault.ts';
import { createEncryptedStorage, type Cipher } from './encrypted-storage.ts';

const VAULT_KEY = 'sovport-credential-vault';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    get: async (key: string) => map.get(key) ?? null,
    set: async (key: string, value: string) => {
      map.set(key, value);
    },
    remove: async (key: string) => {
      map.delete(key);
    },
  };
}

/** Reversible stand-in for AES: a recognizable prefix + base64 body. */
const cipher: Cipher = {
  encrypt: async (plaintext) => `enc:${Buffer.from(plaintext, 'utf8').toString('base64')}`,
  decrypt: async (ciphertext) => {
    if (!ciphertext.startsWith('enc:')) throw new Error('unrecognized envelope');
    return Buffer.from(ciphertext.slice(4), 'base64').toString('utf8');
  },
};

describe('createEncryptedStorage', () => {
  it('writes ciphertext and reads back the plaintext', async () => {
    const inner = memoryStorage();
    const storage = createEncryptedStorage(inner, cipher);
    await storage.set('k', '{"a":1}');

    assert.match(inner.map.get('k')!, /^enc:/);
    assert.notEqual(inner.map.get('k'), '{"a":1}');
    assert.equal(await storage.get('k'), '{"a":1}');
  });

  it('returns null for a missing key', async () => {
    const storage = createEncryptedStorage(memoryStorage(), cipher);
    assert.equal(await storage.get('absent'), null);
  });

  it('adopts legacy plaintext JSON and re-encrypts it in place', async () => {
    const inner = memoryStorage();
    inner.map.set('k', '{"legacy":true}');
    const storage = createEncryptedStorage(inner, cipher);

    assert.equal(await storage.get('k'), '{"legacy":true}');
    assert.match(inner.map.get('k')!, /^enc:/);
  });

  it('reports undecryptable non-JSON values as absent', async () => {
    const inner = memoryStorage();
    inner.map.set('k', 'v1:not-really-ciphertext');
    const storage = createEncryptedStorage(inner, cipher);
    assert.equal(await storage.get('k'), null);
  });

  it('removes keys', async () => {
    const inner = memoryStorage();
    const storage = createEncryptedStorage(inner, cipher);
    await storage.set('k', 'value');
    await storage.remove('k');
    assert.equal(await storage.get('k'), null);
  });

  it('keeps the credential vault working over encrypted storage', async () => {
    const inner = memoryStorage();
    const vault = createCredentialVault(createEncryptedStorage(inner, cipher));

    await vault.save({ credentialId: 'vc-1', credential: 'jwt', savedAt: 'x' });
    assert.equal(await vault.get('vc-1'), 'jwt');
    assert.match(inner.map.get(VAULT_KEY)!, /^enc:/);
  });
});
