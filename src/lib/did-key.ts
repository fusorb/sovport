// SovPort — pure, platform-safe did:key + Ed25519 + JWS primitives.
//
// No React Native / platform APIs here (only @noble/curves + the buffer
// polyfill), so the whole module is unit-testable in a plain Node/JS runtime.
// Platform concerns (randomness, SHA-256) live in ./crypto.

import { ed25519 } from "@noble/curves/ed25519.js";
import { Buffer } from "buffer";

// ── Encoding ──────────────────────────────────────────────────────────────────

export function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function fromBase64Url(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

export function utf8ToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "utf8"));
}

// ── Ed25519 ───────────────────────────────────────────────────────────────────

/** Public key (32 bytes) for a 32-byte Ed25519 secret seed. */
export function ed25519PublicKey(secretKey: Uint8Array): Uint8Array {
  return ed25519.getPublicKey(secretKey);
}

/** 64-byte Ed25519 signature (deterministic, RFC 8032). */
export function ed25519Sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return ed25519.sign(message, secretKey);
}

export function ed25519Verify(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  return ed25519.verify(signature, message, publicKey);
}

// ── did:key (Ed25519, multicodec + multibase base58btc) ───────────────────────

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Ed25519-public multicodec prefix, unsigned-varint encoded: [0xed, 0x01]. */
const ED25519_MULTICODEC_PREFIX = new Uint8Array([0xed, 0x01]);

export function base58btcEncode(bytes: Uint8Array): string {
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) leadingZeros++;

  const body = bytes.slice(leadingZeros);
  if (body.length === 0) return "1".repeat(leadingZeros);

  const digits: number[] = [0];
  for (const byte of body) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  const out: string[] = new Array(leadingZeros).fill("1");
  for (let i = digits.length - 1; i >= 0; i--) out.push(BASE58_ALPHABET[digits[i]]);
  return out.join("");
}

/**
 * Derive the spec-correct did:key for an Ed25519 public key:
 *   did:key:z<base58btc(0xed 0x01 || pubkey)>
 * Byte-for-byte identical to SovGrant's encodeDidKey().
 */
export function didKeyFromEd25519(publicKey: Uint8Array): string {
  const prefixed = new Uint8Array(ED25519_MULTICODEC_PREFIX.length + publicKey.length);
  prefixed.set(ED25519_MULTICODEC_PREFIX);
  prefixed.set(publicKey, ED25519_MULTICODEC_PREFIX.length);
  return `did:key:z${base58btcEncode(prefixed)}`;
}

export type Ed25519PublicJwk = {
  kty: "OKP";
  crv: "Ed25519";
  x: string;
};

/** The public JWK shape SovGrant's registerWalletDid accepts. */
export function ed25519PublicJwk(publicKey: Uint8Array): Ed25519PublicJwk {
  return { kty: "OKP", crv: "Ed25519", x: toBase64Url(publicKey) };
}

// ── Detached JWS (EdDSA) ──────────────────────────────────────────────────────

/**
 * Build a detached JWS in the exact shape SovGrant reconstructs:
 *   `${base64url(header)}..${base64url(signature)}`  (payload stripped)
 * with the signature over `${base64url(header)}.${base64url(payload)}`.
 */
export function buildDetachedEdDsaJws(input: {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  secretKey: Uint8Array;
}): string {
  const headerB64 = toBase64Url(utf8ToBytes(JSON.stringify(input.header)));
  const payloadB64 = toBase64Url(utf8ToBytes(JSON.stringify(input.payload)));
  const signingInput = utf8ToBytes(`${headerB64}.${payloadB64}`);
  const signature = ed25519Sign(signingInput, input.secretKey);
  return `${headerB64}..${toBase64Url(signature)}`;
}
