import type { Credential } from '@fusorb/facet-sdk';

import { credentials, type ApiResponse } from '@/sdk';
import { credentialVault } from '@/services/credential-vault';
import { useAuthStore } from '@/stores/auth-store';

/** The issued credential returned by POST /credentials/offers/:token/accept. */
type AcceptOfferResult = {
  credentialId: string;
  credential: string | Record<string, unknown>;
};

function unauthorized(): ApiResponse<never> {
  return {
    data: null,
    error: { statusCode: 401, error: 'Unauthorized', message: 'Not signed in' },
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

    const result = await credentials.acceptOffer(token);

    if (result.data?.credential) {
      const credential =
        typeof result.data.credential === 'string'
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
