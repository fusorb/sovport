# SovPort — Repository Audit (2026-11-13)

Full-tree audit of the SovPort wallet: repo state, toolchain health, security and
correctness review of every tracked source file, and docs-vs-tree drift. Follows
[`2026-11-10-repo-audit.md`](./2026-11-10-repo-audit.md) and
[`2026-11-11-remediation.md`](./2026-11-11-remediation.md), whose findings are
re-checked below. Audit only — no code was changed by this pass.

> **Status (later on 2026-11-13):** F1–F5 are fixed and F11's ADR note is
> resolved — see [ADR 0005](../decisions/0005-device-bound-secrets-and-session-durability.md),
> [ADR 0006](../decisions/0006-relock-on-background.md) and the change set that
> carries them. Cleanup items F6–F10 remain open.

## Method

- Read every tracked `src/**` file, config, script, ADR and doc.
- Ran the full check suite: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`,
  `pnpm check:docs`, `pnpm test`.
- Verified the wallet's SDK call sites against the installed
  `@fusorb/facet-sdk@4.0.0` declarations (`dist/index.d.ts`) and the
  `@fusorb/facet-store@1.0.6` bridge implementation (`dist/index.js`).
- Verified git state, ignore rules, and tracked-file inventory via `git ls-files`.

## Repo state

| | |
| --- | --- |
| HEAD | `753d5ee` — *chore(ci): guard doc version claims against package.json* |
| Branch | `main`, **in sync with `origin/main`** |
| Working tree | clean; no untracked non-ignored files |
| Tracked files | 84 (~3.0k lines under `src/`; 325 lines of tests) |
| Toolchain | pnpm 12.18.0, Node 22, Expo 57 / RN 0.86.3, `facet-sdk@4.0.0`, `facet-store@1.0.6` |

> Note: at the start of this pass `main` was **22 commits ahead** of
> `origin/main`; those commits were pushed during the audit. Everything now
> described here is on the remote.

## Checks (verified this pass)

| check | result |
| --- | --- |
| `pnpm typecheck` | **GREEN** — 0 errors (exit 0) |
| `pnpm lint` | **clean** — `eslint .`, exit 0, no findings |
| `pnpm format:check` | **PASS** — all matched files use Prettier style |
| `pnpm check:docs` | **PASS** — 3 docs match `package.json` |
| `pnpm test` | **23/23 pass** (`did:key`, encrypted storage, present-link, vault) |
| SDK call sites vs `facet-sdk@4.0.0` d.ts | **match** — `approveDeviceApproval`, `registerPairedDevice`, `registerWalletDid`, `acceptOffer`, `presentForVerification` |

Local wall-clock was poor — `tsc` ≈ 12 min, `eslint` ≈ 30 min — but the machine
was saturated by other repos at the time (sovgrant vitest, facet eslint, relnex
tsc, three vite dev servers). CI on `ubuntu-latest` is unaffected; see F10.

---

## Findings

### F1 — Silent 401 refresh never persists the rotated tokens (medium-high)

`src/sdk/index.ts` builds the refresh bridge with `{ authStore, sdk }` only.
`facet-store`'s `createZustandTokenStorage` writes refreshed tokens through
`authStore.setTokens(...)`, and the store's `setTokens` mutates **memory only** —
nothing calls `persist()` on that path (`authService.refresh()` does, but the SDK
bridge does not go through it).

**Impact:** after a token expires mid-session and the bridge refreshes it, the
SecureStore blob (`sovport-auth`) still holds the pre-refresh refresh token. On
the next launch `restore()` rehydrates a stale token; if SovGrant rotates or
invalidates refresh tokens, the session fails and the user must re-pair.

**Fix:** pass facet-store's optional `persist` adapter
(`getAccessToken` / `setAccessToken`) and have `setAccessToken` write the session
through `useAuthStore.getState().persist()`, or make the bridge path persist.

### F2 — Only the vault key is device-bound; the device key and session are backup-restorable (medium)

`src/services/vault-crypto.ts` correctly sets
`keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`, but the other secrets use
SecureStore defaults:

| secret | file |
| --- | --- |
| Ed25519 device private key (`sovport-device-key`) | `src/services/device-identity.ts:73` |
| Session blob (`sovport-auth`) | `src/stores/auth-store.ts:91` |
| DID registration record | `src/services/wallet-did.ts:70` |

On iOS the default accessibility class is included in encrypted backups and is
restored onto a new device, so the key that signs device approvals and DID
registrations can travel to another device — which contradicts the device-bound
framing of ADR 0001 / ADR 0004 (both of which only discuss the vault key).

**Fix:** `WHEN_UNLOCKED_THIS_DEVICE_ONLY` for the device key (and a decision,
recorded in an ADR, for the session blob).

### F3 — `walletDidService.register()` discards the server's DID (low-medium)

`src/services/wallet-did.ts` stores the **locally derived** `did` and ignores
`result.data.did` from `registerWalletDid`. If SovGrant canonicalizes the
identifier differently, the DID shown on `/did` and sent as the presentation
`kid` diverges from the one actually registered.

### F4 — Approve flow races two device-authentication prompts (low)

`src/app/approve.tsx` runs `Promise.all([getDeviceId(), signWithDeviceKey(challenge)])`.
On a device with no key yet, `getDeviceId()` triggers key creation (its own
prompt) concurrently with the signing prompt.

### F5 — Materializing the device secret is not gated (low)

`getDeviceDid()` / `getDevicePublicJwk()` decode the private key into the module
cache with no prompt (`src/services/device-identity.ts`); only creation and
signing are gated. `src/app/present.tsx` calls `getDeviceDid()` on mount.
Consistent with ADR 0004 as written, but worth an explicit line there.

### F6 — Expo-template leftovers still tracked (low)

- `LICENSE` is the Expo starter's MIT text (*Copyright (c) 2015-present 650
  Industries, Inc. (aka Expo)*) — not this product's license.
- `scripts/reset-project.js` is unreferenced by any script.
- `.gitignore` carries a bare `example` line.
- Exported-but-unused: `BottomTabInset` / `MaxContentWidth`
  (`src/constants/theme.ts`), `biometricAvailable` / `biometricKind`
  (`src/services/biometric.ts`), `clearDeviceIdentity`
  (`src/services/device-identity.ts`), `credentialService.createVerificationSession`
  / `getStatusList` (`src/services/credentials.ts`).

### F7 — Generated artifact tracked (low)

`.expo/types/router.d.ts` is committed (by `784ae91`) while `.expo/` is
gitignored. It should be `git rm --cached` and left to `expo start` to generate.

### F8 — Dependencies and web remnants not matching reality (low)

Never imported anywhere in `src/`: `expo-constants`, `expo-linking`,
`expo-status-bar`, `expo-system-ui`, `react-native-gesture-handler`,
`react-native-web`. Some may be peer requirements of `expo-router` / `expo` —
verify before removal. Relatedly, `pnpm web`, `web.output: static` and the
`react-native-web` dependency remain although web is documented as unsupported
(`expo-secure-store` has no browser implementation).

### F9 — Tests remain lib-only (low)

23 tests cover four pure modules. No coverage for `services/**`, the screens, or
the SDK bridge — including F1's path. Open follow-up 4 from the remediation doc.

### F10 — Local check performance (low)

`tsc --noEmit` takes minutes on this machine (M7 from the 2026-11-10 audit was
never addressed: broad `**/*.ts` include, no `tsbuildinfo`). Measured this pass
under heavy cross-repo load; if it is also slow on an idle machine, scope the
include and enable incremental compilation.

### F11 — Doc nits (low)

- ADR 0001's header says ADR 0004 supersedes its "server-side verification" note,
  but ADR 0004 never states the new behaviour — the remediation doc records that
  SovGrant now *requires and verifies* `deviceId` + `signature`.
- `.agent/episodes.md`'s preamble still calls itself "gitignored, local-only"
  although it is tracked (AGENTS.md is correct).
- `CLAUDE.md`'s command list omits `format:check`, `test`, `check:docs`.
- README documents `pnpm web` while declaring web unsupported.
- `package.json` has no `engines` field for the documented Node >= 22.
- `node --test` emits `MODULE_TYPELESS_PACKAGE_JSON` warnings (cosmetic).

---

## Verified sound (re-checked, no action)

- **Crypto layer** — real Ed25519 (`@noble/curves`), spec-correct `did:key`
  (multicodec `0xed01` + base58btc), detached EdDSA JWS with
  `kid`/`nonce`/`credentialHash` matching SovGrant's contract; pure primitives
  isolated in `src/lib/did-key.ts` and covered by RFC 8032 vectors.
- **Vault** — AES-256-GCM with `v1:` envelope, key in SecureStore, legacy
  plaintext adopted and re-encrypted on first read; undecryptable non-JSON is
  reported absent, never as data.
- **Device policy** — `getEnrolledLevelAsync` gate (passcode-only devices are
  challenged, no-lock devices refused), in-memory key released on sign-out,
  release builds refuse non-HTTPS `EXPO_PUBLIC_API_URL`.
- **Routing** — every screen in the root stack (the `scan` registration fix
  holds); MFA branch reachable from pairing with `sessionId` + `next`.
- **Tooling** — CI runs install + typecheck + lint + format check + doc sync +
  tests; `check-doc-sync.mjs` guards the version claims in the three
  current-facing docs.

## Backlog (suggested order)

1. F1 — persist refreshed tokens from the 401 bridge.
2. F2 — `WHEN_UNLOCKED_THIS_DEVICE_ONLY` for the device key (+ ADR note).
3. F3 — store the DID the server returns.
4. F6/F7/F8 — leftover purge (license, template script, tracked `.expo`
   artifact, unused deps) and a `pnpm web` decision.
5. F9 — tests for the bridge (F1) and the services.
6. F10 — typecheck scoping if it is slow on an idle machine.
7. F11 — doc nits; close the two remaining remediation follow-ups (screen tests,
   EAS `projectId`).
