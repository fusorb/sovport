// SovPort — pure credential-vault logic.
//
// No platform imports: the vault is backed by any key/value store, so the whole
// module is unit-testable in plain Node. The AsyncStorage wiring lives in
// src/services/credential-vault.ts.

export interface HeldCredential {
  credentialId: string;
  /** The signed credential string (JWT / SD-JWT) exactly as issued. */
  credential: string;
  savedAt: string;
}

export interface KeyValueStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

type VaultMap = Record<string, HeldCredential>;

const VAULT_KEY = 'sovport-credential-vault';

export function createCredentialVault(storage: KeyValueStorage) {
  async function readAll(): Promise<VaultMap> {
    const raw = await storage.get(VAULT_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as VaultMap;
    } catch {
      return {};
    }
  }

  async function writeAll(map: VaultMap): Promise<void> {
    await storage.set(VAULT_KEY, JSON.stringify(map));
  }

  return {
    async save(entry: HeldCredential): Promise<void> {
      const map = await readAll();
      map[entry.credentialId] = entry;
      await writeAll(map);
    },

    async get(credentialId: string): Promise<string | null> {
      return (await readAll())[credentialId]?.credential ?? null;
    },

    async has(credentialId: string): Promise<boolean> {
      return credentialId in (await readAll());
    },

    async list(): Promise<HeldCredential[]> {
      return Object.values(await readAll());
    },

    async remove(credentialId: string): Promise<void> {
      const map = await readAll();
      delete map[credentialId];
      await writeAll(map);
    },

    async clear(): Promise<void> {
      await storage.remove(VAULT_KEY);
    },
  };
}
