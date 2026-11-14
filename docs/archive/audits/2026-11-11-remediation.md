# SovPort remediation — 2026-11-11

Follows [`2026-11-10-repo-audit.md`](./2026-11-10-repo-audit.md). Every finding
from that audit is mapped to its resolution below, plus the remaining cross-repo
follow-ups.

## Verification

- `pnpm typecheck` — green (`tsc --noEmit`).
- `pnpm test` — 23/23 pass (Node's built-in runner): Ed25519 / `did:key` /
  detached-JWS (RFC 8032 vectors), the credential vault, the encrypted-storage
  wrapper, and the presentation link parser.
- Presentation proof re-checked against the live backend contract
  (`sovgrant/src/modules/credentials/routes/verify-present.route.ts` +
  `src/lib/security/jws-proof.ts`).

## Fixed in this repo

### Critical

| Finding | Resolution |
|---|---|
| Device "keypair" was fake (pub == priv); sign returned a hash | Real Ed25519 in `src/lib/did-key.ts`; single device key in `src/services/device-identity.ts`; `signWithDeviceKey` now returns a real base64url signature |
| Presentation/DID used `crypto.subtle` (absent on RN) | Replaced with `@noble/curves` Ed25519 + `expo-crypto` (randomness, SHA-256); pure primitives isolated in `src/lib/did-key.ts`, platform layer in `src/lib/crypto.ts` |
| MFA path orphaned (`requiresMfa` ignored; loop back to `/pair`) | `pair.tsx` routes to `/mfa` with `sessionId`+`next`; `_layout.tsx` gate allows `/mfa` while unauthenticated |
| Presentation `credentialHash` was hex; backend expects base64url | `sha256Base64Url` over the exact submitted credential string in `presentation.ts` |

### High

| Finding | Resolution |
|---|---|
| `localStorage` in native code (`did.tsx`, `index.tsx`) | Replaced with `@/lib/kv` (AsyncStorage-backed) |
| Dead duplicate client `src/services/api-client.ts` | Deleted |
| Two device-id/keypair systems | Unified into `src/services/device-identity.ts` |
| Unused starter components/assets | Deleted (`collapsible`, `hint-row`, `web-badge`, `external-link`, unused `AnimatedIcon`; `react-logo*`, `tutorial-web`, `expo-badge*`, `expo-logo`, `logo-glow`, `tabIcons/`) |
| Unused deps (`@expo/ui`, `expo-device`, `expo-font`, `expo-glass-effect`, `expo-symbols`, `expo-web-browser`, `jose`) | Removed from `package.json` |
| Present flow sent metadata, not a VC | Accepted credentials are stored on-device (`credential-vault.ts`) and presented from there |

### Medium

| Finding | Resolution |
|---|---|
| `pnpm lint` / `pnpm format` were non-functional | Scripts removed (see follow-up 3); README was updated so nothing advertises a broken command |
| CI typecheck-only; pnpm version drift | `packageManager: pnpm@12.18.0`; CI runs typecheck, lint, format check **and** tests |
| `tsconfig.check.json` referenced deleted files | Deleted |
| `app.json` placeholders | `name: SovPort`, iOS `bundleIdentifier` + Android `package` = `com.fusorb.sovport`, added `expo-local-authentication` plugin (Face ID permission) |
| `reactCompiler` experiment with no Babel plugin | Disabled |
| Missing `decisions/` ADR folder | Added (`decisions/0001`, `decisions/0002`) |
| Branding `sovport` vs `SovPort` | UI strings + README normalized to `SovPort` |

### Low

- Store type renamed `sovportAuthState` → `SovportAuthState`; `persist()` no
  longer drops sessions without a refresh token; screens use field selectors
  instead of the whole store.
- `registerPairedDevice` called directly (no optional chaining); `approve.tsx`
  no longer swallows signing errors; wallet-DID uses the typed JWK (no double cast).

## Non-issues (audit suspicions disproved)

- `src/components/animated-icon.module.css` did exist (the web variant was
  rebranded and simplified to a no-op overlay instead of the Expo starter demo).

## Cross-repo fixes (second pass)

- **sovgrant — device-approval signature verification: fixed.**
  `approveDeviceApprovalFlow` now requires `deviceId` + `signature`, resolves that
  device's registered `publicKey`, and verifies the Ed25519 signature over the
  challenge (`verifyEd25519Signature` in `src/lib/crypto/crypto.ts`). The route
  body schema requires both fields. This is a **breaking change** for the approve
  endpoint — proof-of-possession is now mandatory. Covered by
  `approve-device-approval.flow.test.ts` (6 cases, all passing).
- **facet-sdk — `approveDeviceApproval` contract: fixed at source and shipped.**
  The method now accepts and forwards `deviceId` (it previously dropped it). The
  fix was published as `@fusorb/facet-sdk` v3.0.0 (now v4.0.0), SovPort's pin is
  bumped, and `src/app/approve.tsx` calls the typed
  `identity.approveDeviceApproval({ challenge, deviceId, signature })` directly.

## Security hardening (2026-11-13)

| Change | Detail |
|---|---|
| Credential vault encrypted at rest | Held VCs were plaintext JSON in AsyncStorage; now sealed with AES-256-GCM under a key held in the keystore (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). `src/services/vault-crypto.ts`, `src/lib/encrypted-storage.ts`; legacy plaintext is adopted and re-encrypted on first read. ADR 0003. |
| Device lock required | `unlockWithBiometrics` gates on the enrolled security level, so passcode-only devices are challenged too, and a device with **no** lock is refused for unlock, key creation and signing. ADR 0004. |
| Sign-out key hygiene | The decrypted device key is released from memory on sign-out; the stored key is kept so device identity (and paired-device approval) survives. ADR 0004. |
| Transport | Release builds refuse to start against a non-HTTPS `EXPO_PUBLIC_API_URL`. ADR 0004. |
| In-app QR scanner | `src/app/scan.tsx` + `src/lib/present-link.ts`; accepts a `sovport://` deep link, an https URL, or raw JSON. |

## Open follow-ups

1. ~~**facet-sdk — publish + re-pin.**~~ **Done.** Published and pinned to 4.0.0;
   `src/app/approve.tsx` uses the typed `identity.approveDeviceApproval` call.
2. ~~**facet-sdk — widen return types.**~~ **Done.** The SDK now types both returns
   (`acceptOffer` → `{ credentialId, credential }`, `registerWalletDid` → the DID
   document) and the wallet's casts are gone.
3. ~~**Tooling.** Add `eslint` + `eslint-config-expo` + `prettier` and wire a lint
   step into CI.~~ **Done.** `eslint` 9 (+ `eslint-config-expo`) and `prettier` are
   installed and wired: `pnpm lint`, `pnpm format`, `pnpm format:check`. CI runs
   typecheck, lint, format check, and tests. Prettier is scoped to code — markdown
   is ignored — and the source tree is now formatted. (eslint 10 is incompatible
   with eslint-config-expo 57's react plugin, so eslint is pinned to 9.)
4. **Tests.** ~~vault~~ **Done** (credential-vault, encrypted-storage, present-link
   suites). **Open:** screen behaviour and the SDK adapters.
5. **EAS.** Add `extra.eas.projectId` once the project exists on EAS.
6. ~~**expo-crypto version.**~~ **Resolved.** The tree carries `expo-crypto ^57.0.4`
   and `npx expo install --check` reports all Expo packages up to date.
