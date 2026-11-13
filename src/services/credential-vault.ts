// SovPort — on-device credential vault (self-sovereign custody).
//
// When the wallet accepts a credential offer, SovGrant returns the signed VC
// string; the wallet stores it here and presents it straight from the device.
// SovGrant never needs to hand it back later.
//
// Thin wire-up of the pure vault (src/lib/credential-vault) onto AsyncStorage,
// with every value sealed at rest by AES-256-GCM (src/services/vault-crypto).

import { createCredentialVault } from '@/lib/credential-vault';
import { createEncryptedStorage } from '@/lib/encrypted-storage';
import { kv } from '@/lib/kv';
import { vaultCipher } from '@/services/vault-crypto';

export type { HeldCredential } from '@/lib/credential-vault';

export const credentialVault = createCredentialVault(createEncryptedStorage(kv, vaultCipher));
