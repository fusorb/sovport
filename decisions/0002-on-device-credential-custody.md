# 0002 — Self-sovereign (on-device) credential custody

Status: Accepted (2026-11-11). Extended by [ADR 0003](./0003-credential-vault-encryption.md) — the vault is now encrypted at rest, and the SDK-types note below is resolved.

## Context

Presentation was impossible: `VcSdk.list()` returns credential *metadata* only,
and SovGrant's list route schema strips the raw signed credential, so the wallet
had no VC string to present. (The raw VC is returned once, at offer-accept time,
and is otherwise only stored server-side.)

A self-sovereign wallet must hold its own credentials.

## Decision

- On `acceptOffer`, persist the raw credential string on the device in an
  AsyncStorage-backed vault (`src/services/credential-vault.ts`), keyed by
  `credentialId`.
- Presentation reads the raw VC from the vault and signs it; the server metadata
  list is used only for display.
- Logout clears the vault and the DID registration.

## Consequences

- SovGrant does not need to expose raw credentials, and the wallet stays the
  holder of record (matches the product vision: "receive, store, and display").
- The `@fusorb/facet-sdk` types understate two endpoints the wallet relies on
  (`acceptOffer` is typed `void` though it returns `{ credentialId, credential }`;
  `registerWalletDid` is typed `void` though it returns the DID document). The
  wallet works around this with a documented cast; the SDK types should be
  widened (see `docs/archive/audits/2026-11-11-remediation.md`).
- Large credentials are stored in AsyncStorage, not SecureStore (which has a
  ~2 KB value limit); secrets (tokens, device key) remain in SecureStore.
