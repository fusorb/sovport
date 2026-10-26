# Ecosystem Naming — Report (sovport)

**Repo:** `sovport` — a SovGrant identity wallet (React Native / Expo) consuming
`@fusorb/facet-sdk` + `@fusorb/facet-store`. No `facet-auth` / `facet-layout`
dependency (RN app with its own `expo-router` layout).

## What changed (grouped)

### 1. Facet 2.0.0 compile completion (packages already bumped in tree)
`@fusorb/facet-sdk` (2.0.0) and `@fusorb/facet-store` (1.0.2) were already pinned
in the pre-existing working tree. The application code still referenced the 1.x API,
so the typecheck was red. Completed:
- `src/sdk/index.ts`: `ArcIdClient` -> `SgClient` (import, comment, `new SgClient({...})`).
  facet-sdk 2.0.0 no longer exports `ArcIdClient`; it exports `SgClient`.
- `src/stores/auth-store.ts`: added `error: null` + `setError` to the store
  initializer, required by facet-store 1.0.2 `AuthState` (which now defines `error`
  and `setError`).
- `src/sdk/index.ts`: added a `TokenStoreLike` adapter around `useAuthStore`.
  facet-store 1.0.2 `createZustandTokenStorage` requires `getState` / `setTokens` /
  `clearAuth` on the passed object; a zustand v5 `UseBoundStore`
  (`{ callable } & StoreApi`) does **not** expose the state methods (`setTokens` /
  `clearAuth`) as direct members, so passing the raw hook failed type-checking (and
  would fail at runtime). The adapter delegates to `useAuthStore.getState()`.
- `src/sdk/index.ts`: SDK client re-export kept as `sgClient` (mirrors facet's
  `SgClient`). `src/app/_layout.tsx` and `src/services/auth.ts` now both consume
  `sgClient`, resolving the pre-existing `SovGrantClient` vs `sgClient` mismatch that
  caused the `_layout.tsx:7` "no exported member 'SovGrantClient'" error.

### 2. SovPort labeling rename (naming gate)
- `src/app/login.tsx:46`: UI label `ArcWallet` -> `SovPort`.

### 3. Docs file rename
- `git mv docs/arcwallet-integration-planning.md docs/sovport-integration-planning.md`.
  README already linked to `./docs/sovport-integration-planning.md`, so the rename
  repairs a broken link. File content contained no legacy tokens.

## What was deliberately NOT changed (and why)
- **Token / storage**: sovport persists sessions under its OWN SecureStore key
  `TOKEN_STORAGE_KEY = "sovport-auth"` (JSON blob: user, accessToken, refreshToken,
  sessionId). It does NOT use `@fusorb/facet-auth`'s default `sg_access_token` /
  `sg_refresh_token` keys (sovport has no `facet-auth` dependency). The facet-auth
  2.0.0 storage-key rename therefore has no effect on sovport's device storage — no
  stored-token migration code was written.
- **Contract surfaces** left intact: `EXPO_PUBLIC_API_URL`, the `sovport-auth`
  SecureStore key, the `/auth/logout` route, the package name `sovport`, and all
  JWT/DID claims. None are renamed-token contract surfaces for this repo.
- **facet-layout / `useAuthSession()`**: sovport is RN with its own
  `expo-router` layout; it does not depend on `@fusorb/facet-layout`, so the
  layout-session gap does not apply.
- **`.agent/*`** scratch outputs removed from the repo (audit preserved in
  `docs/ecosystem-naming/`); **`.commandcode/*`** (agent runtime config, incl. the
  taste file) untracked + gitignored — left on disk, contents untouched.
- **`docs/sovport-integration-planning.md` content** left as-is (stale planning notes
  — see needs-owner decision).

## Before -> after verification
| check | baseline | after |
| --- | --- | --- |
| `pnpm typecheck` (`tsc --noEmit`) | RED — 4 errors | GREEN — 0 errors |
| naming gate (`check-legacy-names`) | 4 renamed tokens | 0 ("OK (self-test passed)") |
| live-token counts | `ArcevoCirqle`=1, rest 0 | identical |
| `@fusorb/facet-auth` in lockfile | 0 | 0 (no second copy) |
| `@fusorb/facet-store` versions | 1.0.2 only | 1.0.2 only |
| lint | N/A (eslint not installed) | N/A (unchanged) |
| test | N/A (no `test` script) | N/A |
| build | N/A (no `build` script) | N/A |

`git status` was non-empty at start (pre-existing uncommitted partial migration);
the deviation is recorded in `baseline.md`. Fixes were applied to the working tree
and captured in `chore/ecosystem-naming`.

## Re-authentication impact (sovport)
**None.** sovport stores sessions under its own SecureStore key (`sovport-auth`),
not under facet-auth's `arcid_access_token` / `arcid_refresh_token` keys. The 2.0.0
key rename (`arcid_*` -> `sg_*`; sessions under the old keys are not restored)
therefore has no effect on sovport's on-device storage and requires no re-sign-in
from this change. (Re-auth impact applies to `@fusorb/facet-auth` consumers such as
the SovGrant web dashboard — out of scope for this repo.)

## The `useAuthSession()` gap
`@fusorb/facet-layout`'s changelog directs consumers to `useAuthSession()`, but that
function is **not** exported by `@fusorb/facet-auth` 2.0.0 (it does not exist in the
published package). sovport does not use `facet-layout`, so no adapter was needed
here. For web `facet-layout` consumers (e.g. SovGrant), the documented path is to
build a local `LayoutSession` from `useOptionalAuth()` (exported by `@fusorb/facet-auth`).

## Needs owner decision
| item | consumed by | impact | recommendation |
| --- | --- | --- | --- |
| `docs/sovport-integration-planning.md` is stale | repo readers | references facet-sdk v1.0.1, deleted `src/services/api-client.ts`, PasskeySdk, unbuilt onboarding phases | refresh or archive; not a code/build issue |
| `.agent/` + `.commandcode/` git-tracking | — | were tracked + modified | Resolved in this task: `.agent/` removed as scratch (gitignored); `.commandcode/` untracked + gitignored; both now local/untracked |
| facet-auth 2.0.0 storage-key rename (`arcid_*` -> `sg_*`) | SovGrant web dashboard / facet-layout consumers | old-key sessions not restored; forced re-sign-in | decide whether to ship a one-time token-key migration for stored sessions (none written here; out of scope for sovport) |
| `useAuthSession()` missing from facet-auth | facet-layout consumers | layout consumers must hand-roll a LayoutSession adapter | add `useAuthSession` to `@fusorb/facet-auth`, or document the `useOptionalAuth` adapter in facet-layout |

## Branch & commit
- Branch: `chore/ecosystem-naming` (from `main` @ `9f15953`).
- Commit(s): migration completion + audit docs. **Not pushed.**
