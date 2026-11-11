// SovPort — on-device credential vault (self-sovereign custody).
//
// When the wallet accepts a credential offer, SovGrant returns the signed VC
// string; the wallet stores it here and presents it straight from the device.
// SovGrant never needs to hand it back later.
//
// Thin wire-up of the pure vault (src/lib/credential-vault) onto AsyncStorage.

import { createCredentialVault } from '@/lib/credential-vault';
import { kv } from '@/lib/kv';

export type { HeldCredential } from '@/lib/credential-vault';

export const credentialVault = createCredentialVault(kv);
