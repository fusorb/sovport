# sovport: Episodic Canon
## (what broke, how we fixed it, what survived) – local tracker

> Purpose: a living narrative of how this repo reached a working,
> automated state. Written in `.agent/` (gitignored, local-only) so
> the tracker reflects process without polluting the published tree.
> Canonical facts live in README/CLAUDE.md; this file lives in the
> head between sessions.
>
> Mantra: evolution is the only option.
> Rule chain: manual → semi-automated → automated. If a fix is
> still manual after a release, it is not done.

================================================================================

EP 01 -- The Expo Starter That Had To Become a Wallet
--------------------------------------------------------------------------------
What broke:
  The repo started as the stock Expo 57 / React Native 0.86 starter
  (`64fdbfd`, 2026-07-27): default index/explore tabs, no SDK client, no auth
  store, no session persistence -- the README literally called it a "blank
  Expo starter template." The wallet vision (login, credentials, DID) had
  nothing to talk to SovGrant with.

How we fixed it:
  Wired the app to the published, framework-agnostic `@fusorb/facet-sdk`
  (`c8f0997`, "wire arc-wallet to @arcevo/facet-sdk (auth foundation)"). The
  SDK is pure `fetch` -- no DOM, no React -- so it runs in React Native
  unchanged; only the token-storage adapter is swapped for `expo-secure-store`.
  The Expo 57 / SDK-aligned dependency set was pinned (`7041e79`, `9f15953`)
  and the status docs refreshed (`df1adb8`) so the README stopped claiming
  "blank starter" and described integration-in-progress.

What survived:
  The boundary that matters: the web-only Facet packages
  (`@fusorb/facet-components` / `-auth` / `-layout`) are DOM/Radix/Tailwind and
  do NOT run in React Native. SovPort owns its native screens and talks to
  SovGrant only through the SDK. That split is why the app never pulled in a
  web UI library.

State: semi-automated. SDK consumption + session persistence exist; every flow
  still needs a locally running SovGrant backend (`EXPO_PUBLIC_API_URL`).

Lesson: a shared client is only reusable across platforms when its core has no
  platform dependencies. Keeping the SDK pure-fetch is what let one client
  serve the web dashboard and the native wallet.

================================================================================

EP 02 -- The Rename That Was Really a Compile
--------------------------------------------------------------------------------
What broke:
  Two changes landed together (`02f3925` / `8a17fd5`, 2026-10-26): the product
  rename ArcWallet -> SovPort, and the Facet 2.0.0 API bump already pinned in
  the tree. `pnpm typecheck` was RED with 4 errors and the naming gate reported
  4 renamed tokens. (The audit lives in `docs/ecosystem-naming/`:
  `baseline.md`, `report.md`, `findings.md`.) The errors:
  (1) `src/app/_layout.tsx:7` imported `SovGrantClient`, which the SDK index
      never exported;
  (2) `src/sdk/index.ts:2` imported `ArcIdClient` -- facet-sdk 2.0.0 renamed it
      to `SgClient`;
  (3) passing the raw zustand hook as `authStore` failed the `TokenStoreLike`
      shape (facet-store 1.0.2);
  (4) the auth-store initializer lacked `error` / `setError` required by
      facet-store's `AuthState`.

How we fixed it:
  -- `ArcIdClient` -> `SgClient` at every site (import, comment, `new SgClient`).
  -- Wrapped the zustand hook in a `TokenStoreLike` adapter delegating to
     `useAuthStore.getState()` (a zustand v5 `UseBoundStore` does not expose
     `setTokens` / `clearAuth` as direct members).
  -- Kept the client export named `sgClient` and pointed `src/app/_layout.tsx`
     and `src/services/auth.ts` at it, ending the `SovGrantClient` vs `sgClient`
     mismatch.
  -- Added `error: null` + `setError` to the auth store.
  -- Renamed the UI label at `src/app/login.tsx:46` and `git mv`'d
     `docs/arcwallet-integration-planning.md` -> `docs/sovport-integration-planning.md`.

What survived:
  Lives that were deliberately NOT touched: the `sovport-auth` SecureStore key,
  `EXPO_PUBLIC_API_URL`, the `/auth/logout` route, the package name, and above
  all the live `arcevocirqle` brand/domain. sovport persists sessions under its
  OWN key, so the facet-auth `arcid_*` -> `sg_*` storage rename never applied
  here -- no forced re-auth.

State: automated. typecheck GREEN (0 errors); naming gate 0 renamed tokens
  outside the allowlist at the time.

Lesson: a product rename is not a find-and-replace -- it is a compile
  completion. The old name is welded into import specifiers and type exports, so
  the rename ends when `tsc` is green, not when the docs stop saying the old
  name.

================================================================================

EP 03 -- The 401 Bridge That Had To Go Around a Cycle
--------------------------------------------------------------------------------
What broke:
  The SDK client must refresh on a 401; the refresh needs `AuthSdk`; `AuthSdk`
  needs the client. Straight wiring is a cycle:
  `client.onTokenRefresh -> AuthSdk.refresh -> client`. Handing the zustand hook
  to the token-storage bridge on its own also failed -- `createZustandTokenStorage`
  wants a `TokenStoreLike` (getState / setTokens / clearAuth), which a hook does
  not expose directly.

How we fixed it:
  `src/sdk/index.ts` breaks the cycle with a lazily-assigned module-level
  `let authSdk;`. The `SgClient` is constructed with `onTokenRefresh` /
  `onAuthCleared` handlers that read `authSdk` only at call time; `authSdk =
  new AuthSdk(client)` is assigned after. `createZustandTokenStorage` receives a
  `TokenStoreLike` adapter that delegates to `useAuthStore.getState()`, so a 401
  refreshes the token bundle and clears auth on failure. (An earlier variant of
  the same bridge lives in `src/services/api-client.ts` -- `d07a7df`.)

What survived:
  One refresh path. `src/services/auth.ts` calls `sgClient.setAccessToken(...)`
  after login / MFA / refresh so the client's bearer token and the store never
  diverge.

State: semi-automated. The bridge is wired; exercising it end-to-end still
  requires a live SovGrant backend that returns 401s.

Lesson: when two modules need each other, don't import your way through the
  cycle -- defer one edge behind a lazily-assigned reference and break it at the
  seam.

================================================================================

EP 04 -- The Blank Web Render
--------------------------------------------------------------------------------
What broke:
  On web the app rendered nothing at all. The navigation gate returns `null`
  while the store is loading; on mobile a frozen native splash masked it, but web
  has no splash -- so a blank screen was the entire app. Root cause (`14aaa7b`,
  2026-10-27): `restore()` only set `isLoading: false` on the success path. When
  there was no persisted session it returned `false` early, leaving `isLoading`
  true forever and the gate returning `null` forever.

How we fixed it:
  Moved `set({ isLoading: false })` into a `finally` block so it runs on every
  exit -- success, early return, or throw. A two-line diff.

What survived:
  The gate logic itself was correct; the flag's lifecycle was not. One `finally`
  fixed both platforms at once.

State: automated. `restore()` always releases the loading gate.

Lesson: a loading flag set on only one branch is a deadlock on every other
  branch. Clear it unconditionally -- `finally` is the invariant.

================================================================================

EP 05 -- Baseline Files, And a Sync Note That Told Only Half the Story
--------------------------------------------------------------------------------
What broke:
  sovport predated the ecosystem's repo-structure baseline: it had a README and
  a `.gitignore`, but no `AGENTS.md`, no thin `CLAUDE.md`, no CI workflow, and no
  `.gitattributes`. It was not yet a first-class Fusorb repo.

How we fixed it:
  `36d99ff` ("chore: add agent rules, CLAUDE pointer, and CI baseline") added
  `AGENTS.md` (session rules + the read-only-siblings boundary), a thin
  `CLAUDE.md` pointing at it, and `.github/workflows/ci.yml` (checkout + pnpm +
  Node 22 + `pnpm install --frozen-lockfile` + `pnpm typecheck`). `b0451e5`
  added `SYNC.md` recording the ecosystem source of truth (naming ledger,
  standards, ecosystem facts). The repo also carries `pnpm-workspace.yaml`
  (a `minimumReleaseAgeExclude` allowlist for the freshly published
  `@fusorb/facet-sdk@2.1.x` / `facet-store@1.0.x`) and `.npmrc`
  (`node-linker=hoisted`, required by Metro's bundler).

What survived:
  The baseline files, once added, are cheap to keep current -- but `SYNC.md`
  claimed the baseline was "done" while a Windows repo still lacked the
  `.gitattributes` LF normalization the standard requires. A claim of "done"
  that omits a required file is exactly the drift the tracker is meant to catch.

State: semi-automated. CI runs `pnpm typecheck` on every push/PR to `main`.
  `pnpm lint` exists as a script but is NOT wired into CI and eslint is not a
  devDependency, so it would fail if run -- deliberately left out.

Lesson: a "done" marker is only as good as the checklist behind it. Add the
  baseline files, then re-read the standard and fix the file you forgot.

================================================================================

EP 06 -- Passwords Out, Pairing In, Devices Bound
--------------------------------------------------------------------------------
What broke:
  The first wallet shipped local auth screens -- a login form and a 132-line
  `register.tsx`. That duplicated work the ecosystem forbids: SovGrant is the
  single IdP, and a wallet that collects passwords is a credential store it must
  never be. Pairing then needed real device binding, and the first cut typed the
  paired-device methods with SDK module augmentation because `IdentitySdk` did
  not own them yet. Separately, the mobile typecheck broke on CSS-module imports
  and a missing `global.css`.

How we fixed it:
  -- `a51176c` (2026-10-31) switched to an account-pairing model:
     `login.tsx` -> `pair.tsx`, `register.tsx` deleted, and a biometric unlock
     gate added (`src/services/biometric.ts`, expo-local-authentication) wired
     into a gate in `src/app/_layout.tsx` that redirects unpaired users to
     `/pair` and requires biometric unlock once paired.
  -- `c0d94cb` added the device keypair service (`src/services/device.ts`,
     SecureStore-backed, biometric-gated); `924b28c` registered the keypair on
     pairing (best-effort -- pairing still succeeds if registration fails).
  -- `d24108c` typed the paired-device call via SDK augmentation; `7e4316b`
     removed that augmentation once `IdentitySdk` owned the methods.
  -- `2d28946` added the approve screen; `dac7e16` switched it to
     `identity.approveDeviceApproval`; `d09fe3c` / `25a8f22` were the follow-ups
     (approval fixes, DID-skip persistence, logout cleanup, `setAccessToken`
     sync in `services/auth.ts`).
  -- `9f4f7e1` added `src/types/css-modules.d.ts`, fixed the approve route, and
     ensured `global.css` imports so `tsc` was clean again.

What survived:
  The wallet holds no password. Identity lives in SovGrant; the device holds a
  paired-session token it unlocks behind biometrics, plus a device keypair whose
  public key is registered for approval -- and the approve screen calls the SDK
  method directly, re-implementing no part of the approval protocol.

State: semi-automated. Typecheck green after `9f4f7e1`; end-to-end device
  approval still needs a live backend challenge, and no automated tests cover
  the pairing / biometric gate yet.

Lesson: "the wallet authenticates" is not "the wallet stores credentials" --
  push identity to the IdP and let the device hold only an unlockable token. And
  don't augment a dependency to add a method it is about to own; the
  augmentation becomes dead weight the day the SDK catches up.

================================================================================
