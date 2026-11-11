// SovPort — platform crypto layer.
//
// Randomness and SHA-256 come from expo-crypto (works in React Native and on
// web). The pure did:key / Ed25519 / JWS primitives live in ./did-key and are
// re-exported here so callers have a single import surface.

import * as Crypto from "expo-crypto";

export * from "./did-key";

export async function randomBytes(length: number): Promise<Uint8Array> {
  return new Uint8Array(await Crypto.getRandomBytesAsync(length));
}

/**
 * SHA-256 of a UTF-8 string, base64url-encoded.
 *
 * Must match SovGrant's `verify-present.route.ts`:
 *   createHash("sha256").update(credential).digest("base64url")
 * over the *raw credential string* the wallet submits.
 */
export async function sha256Base64Url(input: string): Promise<string> {
  const base64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
