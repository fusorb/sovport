# SovPort — Repository Audit (2026-11-10)

Full-tree audit of the SovPort wallet: what is broken, what is missing, what is
dead weight, and what needs to be put in place. Audit only — no code was changed
by this pass.

## Method

- Read every tracked source, config, and doc file (all of `src/**`, `app.json`,
  `package.json`, `tsconfig*.json`, `metro.config.js`, `gen-snapshot.js`,
  `scripts/`, `.github/`, `docs/`).
- Verified every SDK call against the installed
  `@fusorb/facet-sdk@2.1.1` type declarations (`dist/index.d.ts`).
- Ran `pnpm typecheck` (`tsc --noEmit`) → **GREEN, 0 errors** (took ~8 min on this
  machine — see M7).

## Verdict

Typecheck is green, but the tree is **not runtime-correct**. The signing /
device-identity layer is stubbed with non-cryptographic placeholders, the
presentation layer depends on Web Crypto that does not exist in React Native,
and the MFA branch of login is unreachable. A cluster of Expo-starter leftovers
(components, assets, dependencies) and advertised-but-nonexistent tooling
(`lint`, `format`, tests) round out the gaps.

---

## CRITICAL — correctness & security

### C1. Device "keypair" is fake and the "signature" is a hash

`src/services/device.ts`

```ts
const random = await Crypto.getRandomBytesAsync(32);
const pubKey  = Buffer.from(random).toString("base64url");
const privKey = Buffer.from(random).toString("base64url"); // identical bytes
```

- The public key and the private key are **the same bytes**. There is no
  asymmetric keypair.
- `signWithDeviceKey()` returns `SHA256(data + privKey)` — a digest, **not a
  signature**. It provides no authenticity.
- `pair.tsx` registers this `publicKey` with SovGrant; since it *is* the secret
  material, the device secret is effectively published to the server.

**Impact:** the trusted-device binding and approval signature are security
theater. Any client holding the "public" key can forge the "signature".

**Needed:** a real Ed25519 keypair (e.g. `@noble/ed25519` or `jose` EdDSA with a
CSPRNG from `expo-crypto`), sign with `EdDSA`, register only the public key.

### C2. Wallet presentation uses Web Crypto — unavailable in React Native

`src/services/presentation.ts` uses `crypto.subtle.generateKey / importKey /
sign`, plus `TextEncoder` and `atob`. None of these are present in Hermes /
React Native by default, and `metro.config.js` configures **no polyfills**.

**Impact:** `getDeviceDid()`, `getPublicKeyJwk()`, and `signPresentationProof()`
throw at runtime on device — so DID registration, credential presentation, and
the approve flow all fail on native (they only work on Expo web).

**Needed:** a crypto shim (`react-native-quick-crypto` + `@peculiar/webcrypto`,
or a `jose` + `@noble/ed25519` path with `expo-crypto` randomness) and
`TextEncoder`/`base64` polyfills wired through Metro.

### C3. Login MFA branch is unreachable / broken

`LoginResult.requiresMfa` is never read.

- `src/services/auth.ts` `login()` only acts when `result.data.accessToken`
  exists; when MFA is required there is no token and no error.
- `src/app/pair.tsx` treats "no `result.error`" as success: it registers the
  device, routes to `/`, but `isAuthenticated` is still false — so `PairingGate`
  bounces the user straight back to `/pair` (**redirect loop**).
- `src/app/mfa.tsx` exists but **nothing navigates to it**.

**Needed:** on `requiresMfa`, route to `/mfa` carrying `sessionId` (and a `next`
target); on verify success, continue to the wallet.

---

## HIGH — functional bugs

### H1. `localStorage` used in native code

`src/app/did.tsx:101` and `src/app/index.tsx:40` call `localStorage`
(web-only). On native the reference throws and is swallowed by `try/catch`, so
**"Skip for now" never persists** and the user is forced back to `/did` on every
launch.

**Needed:** store the skip flag in `expo-secure-store`/`AsyncStorage`.

### H2. Dead duplicate SDK client

`src/services/api-client.ts` builds its own `SgClient` + `AuthSdk` and uses
`sg_access_token` / `sg_refresh_token` keys. **Nothing imports it** — the live
client is `src/sdk/index.ts`. `docs/ecosystem-naming/report.md` already claims
this file was deleted, and README documents it as if live.

**Needed:** delete the file; update README.

### H3. Two divergent device-identity systems

- `src/services/device.ts` → keys `sg_device_{priv,pub}_key`, `sg_device_id`.
- `src/services/wallet-did.ts` `getOrCreateDeviceId()` → key
  `sovport-device-id`, id built from `Math.random()`.

The paired-device id and the wallet-DID `providerWalletId` are unrelated, and
there are two different "device id" concepts.

**Needed:** one device-identity service.

### H4. Expo-starter leftovers still shipped

Not referenced by any screen:

- Components: `src/components/ui/collapsible.tsx`, `hint-row.tsx`,
  `web-badge.tsx`, `external-link.tsx`, and the exported `AnimatedIcon`
  (only `AnimatedSplashOverlay` is used).
- Assets: `assets/images/tabIcons/*`, `react-logo*`, `tutorial-web.png`,
  `expo-badge*.png`.

### H5. Unused direct dependencies

Never imported anywhere in `src/`:

- `@expo/ui`, `expo-glass-effect`, `expo-device`, `expo-constants`, `expo-font`
- `expo-symbols` (used only by the dead `collapsible.tsx`)
- `expo-linking` (not imported directly)

**Needed:** remove after confirming no transitive requirement.

### H6. Presentation contract drift

- SDK `presentForVerification` expects `{ sessionId, credential, proof }`.
  `credentialService.presentForVerification` declares an extra `challenge` field
  (harmless but misleading) — `challenge` only rides inside the proof `nonce`.
- `signPresentationProof` hashes `JSON.stringify(credential)` — key-order
  dependent — while the backend may hash the raw VC string. Mismatch risk.

---

## MEDIUM — tooling & configuration

### M1. `pnpm lint` and `pnpm format` cannot run

No ESLint or Prettier is installed (devDependencies are only `typescript`,
`@types/node`, `@types/react`) and there are no configs. README, `AGENTS.md`,
and `CLAUDE.md` all advertise these scripts.

### M2. CI is typecheck-only and version-drifty

`.github/workflows/ci.yml` runs only `pnpm typecheck` (no lint, no tests).
`package.json` has **no `packageManager` field**, so CI (pnpm 12) and the
documented `pnpm >= 9` can drift.

### M3. `tsconfig.check.json` is stale

It includes `src/app/login.tsx` and `src/app/register.tsx`, which were deleted in
the pairing migration, and it is not referenced by any script.

### M4. `app.json` placeholders block real builds

- `android.package: "com.anonymous.sovport"` (placeholder)
- No `ios.bundleIdentifier`
- No `extra.eas.projectId`

### M5. React Compiler experiment without its Babel plugin

`app.json` sets `experiments.reactCompiler: true`, but
`babel-plugin-react-compiler` is not a devDependency.

### M6. Baseline gaps (self-identified in `SYNC.md`)

- `decisions/` ADR folder still missing.
- `expo-env.d.ts` is gitignored and untracked, yet referenced by
  `tsconfig.json` `include` (harmless, but a fresh clone lacks it until
  `expo start`).

### M7. Typecheck is very slow

`tsc --noEmit` took ~8 minutes here (broad `**/*.ts` include; likely
Windows/Defender FS overhead). A scoped `include` and/or incremental
`tsbuildinfo` would help.

### M8. Brand casing inconsistency

The product is "SovPort", but `app.json` (`name`/`slug`/`scheme`) and the README
title use lowercase "sovport". (Unrelated to the protected `arcevocirqle` brand,
which is untouched.)

---

## LOW — code quality

- `src/stores/auth-store.ts`: type `sovportAuthState` should be PascalCase.
- `src/app/index.tsx`: `useAuthStore()` subscribes to the whole store (needless
  re-renders).
- `auth-store.persist()` early-returns on falsy `refreshToken`; `login()` passes
  `refreshToken ?? ""`, so token-less sessions never persist.
- `pair.tsx`: `identity.registerPairedDevice?.(...)` optional-chains a method
  that always exists, and swallows its errors.
- `wallet-did.ts`: `as unknown as Parameters<...>[0]["publicKeyJwk"]` double
  cast.
- `approve.tsx`: `catch {}` swallows signing errors, then approves unsigned.
- Duplicate splash control (`preventAutoHideAsync` + two `hideAsync` callers).
- README project-structure diagram is out of date (lists `api-client`, omits
  `approve`/`ui`).

---

## What needs to be put in place (prioritized backlog)

1. **Crypto layer** — real Ed25519 device keys + RN-safe presentation signing
   and polyfills (C1, C2).
2. **MFA wiring** — route `requiresMfa` from pairing → `/mfa` → wallet (C3).
3. **Native-safe storage** for the DID-skip flag (H1).
4. **Dead-code purge** — `api-client.ts`, starter components/assets, unused
   deps (H2, H4, H5).
5. **Tooling** — ESLint + Prettier + configs; wire lint into CI (M1, M2).
6. **Tests** — none exist today; CI is typecheck-only (M2).
7. **Prod config** — bundle identifiers + EAS `projectId` (M4).
8. **ADR/`decisions/` folder** (M6).
9. **Remaining plan phases** — onboarding, passkey, QR scan (per
   `docs/sovport-integration-planning.md` Phase 1/2).

## Status of checks (verified this pass)

| check | result |
| --- | --- |
| `pnpm typecheck` (`tsc --noEmit`) | **GREEN** — 0 errors |
| `pnpm lint` | **N/A** — ESLint not installed |
| `pnpm format` | **N/A** — Prettier not installed |
| `pnpm test` | **N/A** — no test script |
| SDK call vs `facet-sdk@2.1.1` d.ts | matches (except H6 semantics) |
