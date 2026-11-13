# 0001 — React-Native-safe Ed25519 and a single device key

Status: Accepted (2026-11-11). Extended by [ADR 0004](./0004-device-authentication-and-transport.md) — the server-side verification and device-authentication notes below are superseded there.

## Context

The initial wallet crypto used `crypto.subtle` (Web Crypto) for key generation
and signing. That API does not exist in React Native's Hermes runtime and no
polyfill was configured, so DID registration, credential presentation, and
device approval threw at runtime on device (they only worked on Expo web).

The device keypair was also a stub: the "public" and "private" keys were built
from the *same* random bytes, and `signWithDeviceKey` returned a SHA-256 hash of
`data || privateKey` — not a signature. The value registered as a public key was
therefore secret material.

## Decision

- Use **Ed25519** (`@noble/curves`, pure JS) for all key generation and signing,
  with randomness from `expo-crypto`. This runs unchanged on iOS, Android, and
  web with no native module.
- Keep the pure primitives (`base58btc`, `did:key`, JWK, detached-JWS) in
  `src/lib/did-key.ts` — no platform imports — so they are unit-testable.
  Platform concerns (random bytes, SHA-256) live in `src/lib/crypto.ts`.
- Use **one** device keypair per installation, stored in `expo-secure-store`,
  serving both the paired-device registration and the wallet DID. The device id
  is unified across both flows.

## Consequences

- Presentations are signed as a detached JWS `header..signature` (EdDSA), with
  `kid = <did:key>#key-1`, `nonce = challenge`, payload `{ credentialHash }`
  where `credentialHash = base64url(sha256(credential))` — matching SovGrant's
  `verify-present.route.ts` exactly.
- Changing key material rotates the `did:key`; server-side registrations must be
  refreshed. Acceptable pre-production.
- SovGrant currently accepts the approval `signature` but does not verify it
  (see `docs/audits/2026-11-11-remediation.md`); the wallet now sends a valid
  signature so enforcement can be enabled server-side without a client change.
