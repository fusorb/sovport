# 0005 — Device-bound secrets, gated signing and session durability

Status: Accepted (2026-11-13). Extends [ADR 0001](./0001-rn-safe-crypto-and-device-key.md),
[ADR 0003](./0003-credential-vault-encryption.md) and
[ADR 0004](./0004-device-authentication-and-transport.md).

## Context

The 2026-11-13 audit (`docs/audits/2026-11-13-repo-audit.md`) found that the
device-bound story was only true of the vault key:

- ADR 0003 gave the **vault key** `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, but the
  **device private key**, the **session blob** and the **DID registration
  record** were written with `expo-secure-store` defaults. On iOS the default
  class is included in encrypted backups and is **restored onto another device**,
  so the key that signs device approvals and DID registrations could leave the
  device it is supposed to be bound to.
- The decoded device secret was cached in a module variable for the lifetime of
  the process, so it outlived the operation that needed it.
- The 401 refresh bridge updated tokens in memory only: a rotated bundle was
  never persisted (the next launch restored a token the server had retired), and
  a refused bundle never removed the stored session.
- Presentation signing produced a signature **without** device authentication,
  although ADR 0004 gates challenge signing. Only the approval path prompted.
- `pair.tsx` asks for the device id and the public JWK concurrently, so two
  concurrent generations could each create a key — leaving the registration
  holding a public key the device no longer stores.

## Decision

1. **Every wallet secret is device-only.** The session blob, the device key and
   the DID registration record are written with
   `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`, like the vault key.
   (iOS is the platform that distinguishes the classes; on Android the values
   are Keystore-bound already.)
   A record written before this decision is rewritten — delete + add, because
   Keychain accessibility cannot be changed by an update — once per launch, on
   the load path, best-effort.
2. **The device secret is never cached.** Only the public half (public key +
   device id) is held in memory. The secret is read from the secure store inside
   the signing call and goes out of scope with it; no decrypted copy survives the
   operation, so there is nothing to release on sign-out.
3. **Signing is gated behind device authentication** — both the approval
   challenge and the presentation proof. Presenting a credential now prompts, at
   the cost of one device-authentication prompt per disclosure.
4. **Token refreshes are mirrored into storage** through facet-store's documented
   `persist` adapter — the hook the bridge calls with the access token after every
   token write. The session is read back out of the store inside the adapter, so
   the refresh token reaches SecureStore (this platform's secure medium, in place
   of the web adapter's httpOnly cookie) without ever being passed *through* the
   adapter. A rotated bundle is persisted, a refused one drops the stored session,
   and the writes are serialized so a sign-out cannot be overtaken by a write
   already in flight.
5. **The registered identifier is the server's.** `registerWalletDid` stores the
   DID SovGrant returned, and a presentation proof names that DID when there is
   one (falling back to the DID derived from the device key).
6. **Device-identity generation is single-flight**, so the id and the JWK handed
   to a registration always belong to the same key.

## Consequences

- The wallet's secrets are now bound to the installation they were created on:
  restoring a backup on a second device yields no session, no usable device key
  and no readable vault.
- Installs that stored these values before this decision are migrated on the next
  launch (rewritten onto the device-only class); no re-pair is required.
- Presentation prompts for device authentication. That is a deliberate UX cost:
  disclosure of a credential is a sensitive operation, and the app-unlock
  boundary alone does not prove the owner is present at the moment of disclosure.
- The linkability trade-off recorded in ADR 0004 is **unchanged**: one device key
  is still reused across accounts on the same device.
- Web remains unsupported for the same reason as ADR 0003/0004
  (`expo-secure-store` has no browser implementation).
