// SovPort — credential presentation (SovGrant verification protocol).
//
//   Verifier creates a session -> wallet signs a DETACHED JWS binding the
//   challenge (nonce) + credential hash with its on-device did:key -> POST
//   /credentials/verify/present.
//
// Proof shape SovGrant verifies (src/lib/security/jws-proof.ts +
// verify-present.route.ts):
//   Protected header: { alg: "EdDSA", kid: "<did:key>#key-1", nonce: "<challenge>" }
//   Payload:          { credentialHash: "<base64url(sha256(credential))>" }
//   Serialized:       "<b64u(header)>..<b64u(signature)>"  (payload detached)
//
// The hash is taken over the EXACT credential string submitted — SovGrant
// recomputes it over the request body's `credential` field.

import { credentials, type ApiResponse } from '@/sdk';
import { buildPresentationJws, sha256Base64Url } from '@/lib/crypto';
import { signWithDeviceKeyMessage } from '@/services/device-identity';
import { useAuthStore } from '@/stores/auth-store';

function unauthorized(): ApiResponse<never> {
  return {
    data: null,
    error: { statusCode: 401, error: 'Unauthorized', message: 'Not signed in' },
  };
}

/**
 * Sign the detached JWS proof for one credential presentation.
 *
 * A presentation discloses a credential, so — like device approval — the
 * signature is produced behind device authentication (ADR 0004/0005).
 */
export async function signPresentationProof(input: {
  challenge: string;
  credential: string;
  did: string;
}): Promise<string> {
  const credentialHash = await sha256Base64Url(input.credential);

  return buildPresentationJws({
    did: input.did,
    challenge: input.challenge,
    credentialHash,
    sign: (message) => signWithDeviceKeyMessage(message, 'Authenticate to present your credential'),
  });
}

/** Present a credential for verification. Returns the VerificationResult. */
export async function presentCredential(input: {
  sessionId: string;
  challenge: string;
  credential: string;
  did: string;
}) {
  if (!useAuthStore.getState().accessToken) return unauthorized();

  const proof = await signPresentationProof({
    challenge: input.challenge,
    credential: input.credential,
    did: input.did,
  });

  return credentials.presentForVerification({
    sessionId: input.sessionId,
    credential: input.credential,
    proof,
  });
}
