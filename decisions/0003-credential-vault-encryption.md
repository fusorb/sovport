# 0003 — Credential vault encrypted at rest

Status: Accepted (2026-11-13)

## Context

Accepted credentials are the wallet's reason to exist, and a signed VC usually
carries personal data (name, date of birth, membership, and so on). ADR 0002 put
them in an AsyncStorage-backed vault, which is **not** encrypted: on Android it
is a plain file store, readable by anything that can read the app sandbox — a
rooted device, a device backup, or a debugging tool.

Tokens and the device key already live in `expo-secure-store` (Keychain /
Android Keystore). SecureStore has a small value limit, though, and VCs
(JWT / SD-JWT) routinely exceed it, so moving the vault there wholesale is not
viable.

## Decision

- Keep the vault's *storage* in AsyncStorage, but seal every value with
  **AES-256-GCM** before it is written:
  - `src/lib/encrypted-storage.ts` — a pure `KeyValueStorage` decorator taking an
    injected `Cipher`, so the logic is unit-testable with no platform crypto.
  - `src/services/vault-crypto.ts` — the AES-256-GCM implementation, built on
    `expo-crypto`'s AES module (no new dependency).
  - `src/services/credential-vault.ts` — wires the vault onto the encrypted
    storage.
- The AES key is generated once per installation and kept in SecureStore under
  `sovport-vault-key` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, so it never syncs to
  a backup and never migrates to another device.
- Values are written with a `v1:` envelope prefix so the format can be versioned.
- **Migration:** a value that fails to decrypt is treated as pre-encryption
  plaintext when it parses as JSON — returned as-is and re-encrypted in place on
  first read. Undecryptable non-JSON values are reported as absent, never as
  data.

## Consequences

- VCs are protected at rest against offline extraction. The honest limit: the
  key is only as strong as the device lock (see ADR 0004).
- The key is deliberately **not** biometric-gated — the vault is read on every
  dashboard load, and a per-read biometric prompt would make the wallet
  unusable. Device unlock is the boundary.
- `expo-secure-store` has no browser implementation, so the vault (like sessions)
  cannot work on web; web is not a supported platform.
- Rotating the key would orphan existing ciphertext, so the key is persistent and
  is only cleared by uninstalling the app.
