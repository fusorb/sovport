import * as SecureStore from "expo-secure-store";

import { identity } from "@/sdk";
import { getDeviceDid, getDeviceId, getDevicePublicJwk } from "@/services/device-identity";
import { useAuthStore } from "@/stores/auth-store";

const REGISTRATION_KEY = "sovport-did-registration";

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
    return (await SecureStore.getItemAsync(REGISTRATION_KEY)) !== null;
  },

  /** Forget the local registration (e.g. on disconnect). */
  async clearRegistration(): Promise<void> {
    await SecureStore.deleteItemAsync(REGISTRATION_KEY);
  },

  /** The full did:key this device presents with. */
  async getRegisteredDid(): Promise<string | null> {
    const stored = await SecureStore.getItemAsync(REGISTRATION_KEY);
    if (!stored) return null;
    try {
      return (JSON.parse(stored) as DidRegistration).did;
    } catch {
      return null;
    }
  },

  /**
   * Register the wallet DID with SovGrant: send the public JWK, remember the
   * resulting did:key locally so we don't re-register on every launch.
   */
  async register(): Promise<string> {
    if (!useAuthStore.getState().accessToken) {
      throw new Error("Not signed in — cannot register wallet DID");
    }

    const [publicKeyJwk, did, providerWalletId] = await Promise.all([
      getDevicePublicJwk(),
      getDeviceDid(),
      getDeviceId(),
    ]);

    const result = await identity.registerWalletDid({
      publicKeyJwk,
      provider: "sovport",
      providerWalletId,
    });

    if (result.error) {
      throw new Error(result.error.message ?? "Failed to register wallet DID");
    }

    const registration: DidRegistration = { providerWalletId, did };
    await SecureStore.setItemAsync(REGISTRATION_KEY, JSON.stringify(registration));

    return did;
  },
};
