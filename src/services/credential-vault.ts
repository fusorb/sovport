// SovPort — on-device credential vault (self-sovereign custody).
//
// When the wallet accepts a credential offer, SovGrant returns the signed VC
// string; the wallet stores it here and presents it straight from the device.
// SovGrant never needs to hand it back later.

import { kv } from "@/lib/kv";

const VAULT_KEY = "sovport-credential-vault";

export interface HeldCredential {
  credentialId: string;
  /** The signed credential string (JWT / SD-JWT) exactly as issued. */
  credential: string;
  savedAt: string;
}

type VaultMap = Record<string, HeldCredential>;

async function readAll(): Promise<VaultMap> {
  const raw = await kv.get(VAULT_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as VaultMap;
  } catch {
    return {};
  }
}

async function writeAll(map: VaultMap): Promise<void> {
  await kv.set(VAULT_KEY, JSON.stringify(map));
}

export const credentialVault = {
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
    await kv.remove(VAULT_KEY);
  },
};
