import type { Credential } from "@fusorb/facet-sdk";

import { credentials, type ApiResponse } from "@/sdk";
import { credentialVault } from "@/services/credential-vault";
import { useAuthStore } from "@/stores/auth-store";

/**
 * What POST /credentials/offers/:token/accept actually returns. The SDK types
 * acceptOffer as ApiResponse<void>, but SovGrant returns the issued credential
 * (see sovgrant createAcceptFlow). We read the real payload so the wallet can
 * store the VC locally.
 */
interface AcceptOfferResult {
  credentialId: string;
  credential: string | Record<string, unknown>;
}

function unauthorized(): ApiResponse<never> {
  return {
    data: null,
    error: { statusCode: 401, error: "Unauthorized", message: "Not signed in" },
  };
}

/**
 * Credential service — thin wrapper over VcSdk for the wallet's credential
 * management. Accepted credentials are stored on-device (self-sovereign).
 */
export const credentialService = {
  async list(): Promise<ApiResponse<Credential[]>> {
    if (!useAuthStore.getState().accessToken) return unauthorized();
    return credentials.list();
  },

  /** Accept an offer and persist the issued credential to the local vault. */
  async acceptOffer(token: string): Promise<ApiResponse<AcceptOfferResult>> {
    if (!useAuthStore.getState().accessToken) return unauthorized();

    const result = (await credentials.acceptOffer(token)) as unknown as ApiResponse<AcceptOfferResult>;

    if (result.data?.credential) {
      const credential =
        typeof result.data.credential === "string"
          ? result.data.credential
          : JSON.stringify(result.data.credential);
      await credentialVault.save({
        credentialId: result.data.credentialId,
        credential,
        savedAt: new Date().toISOString(),
      });
    }

    return result;
  },

  async createVerificationSession(credentialRef?: string) {
    return credentials.createVerificationSession(credentialRef);
  },

  async presentForVerification(data: { sessionId: string; credential: string; proof: string }) {
    return credentials.presentForVerification(data);
  },

  async getStatusList(id: string) {
    return credentials.getStatusList(id);
  },
};
