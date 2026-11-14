import * as SecureStore from 'expo-secure-store';

import { identity } from '@/sdk';
import { getDeviceDid, getDeviceId, getDevicePublicJwk } from '@/services/device-identity';
import { useAuthStore } from '@/stores/auth-store';

const REGISTRATION_KEY = 'sovport-did-registration';

/**
 * A did:key belongs to the device key that backs it, so the registration record
 * is stored device-only: restoring it onto another device would claim an
 * identifier whose private key is not there (ADR 0005).
 */
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

interface DidRegistration {
  providerWalletId: string;
  did: string;
}

/**
 * Wallet DID service — registers the identity-owned did:key with SovGrant on
 * first launch (non-custodial: only the public JWK ever leaves the device).
 *
 * The did:key is derived locally from the device key with the same algorithm
 * SovGrant uses (multicodec + multibase), so the value SovGrant derives from
 * the submitted JWK is identical.
 */
export const walletDidService = {
  /** True if this device already registered a DID with SovGrant. */
  async hasRegisteredDid(): Promise<boolean> {
    return (await SecureStore.getItemAsync(REGISTRATION_KEY, STORE_OPTIONS)) !== null;
  },

  /** Forget the local registration (e.g. on disconnect). */
  async clearRegistration(): Promise<void> {
    await SecureStore.deleteItemAsync(REGISTRATION_KEY, STORE_OPTIONS);
  },

  /** The full did:key this device presents with. */
  async getRegisteredDid(): Promise<string | null> {
    const stored = await SecureStore.getItemAsync(REGISTRATION_KEY, STORE_OPTIONS);
    if (!stored) return null;
    try {
      return (JSON.parse(stored) as DidRegistration).did;
    } catch {
      return null;
    }
  },

  /**
   * The DID a presentation proof should name: the registered identifier when
   * there is one (SovGrant registered it, so a verifier can resolve it), else
   * the DID derived from this device's key.
   */
  async getPresentationDid(): Promise<string> {
    return (await walletDidService.getRegisteredDid()) ?? getDeviceDid();
  },

  /**
   * Register the wallet DID with SovGrant: send the public JWK, remember the
   * DID SovGrant registered locally so we don't re-register on every launch.
   */
  async register(): Promise<string> {
    if (!useAuthStore.getState().accessToken) {
      throw new Error('Not signed in — cannot register wallet DID');
    }

    const [publicKeyJwk, providerWalletId] = await Promise.all([
      getDevicePublicJwk(),
      getDeviceId(),
    ]);

    const result = await identity.registerWalletDid({
      publicKeyJwk,
      provider: 'sovport',
      providerWalletId,
    });

    if (result.error || !result.data) {
      throw new Error(result.error?.message ?? 'Failed to register wallet DID');
    }

    // The server is the authority on the identifier it registered — it is what
    // a verifier resolves, so it is what the proof's `kid` must name.
    const registration: DidRegistration = { providerWalletId, did: result.data.did };
    await SecureStore.setItemAsync(REGISTRATION_KEY, JSON.stringify(registration), STORE_OPTIONS);

    return registration.did;
  },
};
