/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createCredentialVault, type HeldCredential } from './credential-vault.ts';

const VAULT_KEY = 'sovport-credential-vault';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    get: async (key: string) => map.get(key) ?? null,
    set: async (key: string, value: string) => {
      map.set(key, value);
    },
    remove: async (key: string) => {
      map.delete(key);
    },
  };
}

function entry(credentialId: string, credential: string): HeldCredential {
  return { credentialId, credential, savedAt: '2026-01-01T00:00:00.000Z' };
}

describe('credentialVault', () => {
  it('saves, reads and lists credentials keyed by id', async () => {
    const vault = createCredentialVault(memoryStorage());
    await vault.save(entry('vc-1', 'jwt-one'));
    await vault.save(entry('vc-2', 'jwt-two'));

    assert.equal(await vault.get('vc-1'), 'jwt-one');
    assert.equal(await vault.has('vc-2'), true);
    assert.deepEqual((await vault.list()).map((h) => h.credentialId).sort(), ['vc-1', 'vc-2']);
  });

  it('returns null / false for unknown ids', async () => {
    const vault = createCredentialVault(memoryStorage());
    assert.equal(await vault.get('missing'), null);
    assert.equal(await vault.has('missing'), false);
  });

  it('removes a credential and clears the whole vault', async () => {
    const vault = createCredentialVault(memoryStorage());
    await vault.save(entry('vc-1', 'jwt-one'));
    await vault.remove('vc-1');
    assert.equal(await vault.has('vc-1'), false);

    await vault.save(entry('vc-2', 'jwt-two'));
    await vault.clear();
    assert.deepEqual(await vault.list(), []);
  });

  it('overwrites an existing credential (re-accept)', async () => {
    const vault = createCredentialVault(memoryStorage());
    await vault.save(entry('vc-1', 'old'));
    await vault.save(entry('vc-1', 'new'));
    assert.equal(await vault.get('vc-1'), 'new');
    assert.equal((await vault.list()).length, 1);
  });

  it('treats a corrupt store as empty', async () => {
    const storage = memoryStorage();
    await storage.set(VAULT_KEY, 'not json');
    const vault = createCredentialVault(storage);
    assert.deepEqual(await vault.list(), []);
  });
});
