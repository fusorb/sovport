# Ecosystem Naming — Baseline (sovport)

Captured at the start of the Facet 2.0.0 + SovPort naming migration pass.

## Repository state
- Branch: `main`
- sovport HEAD: `9f1595324ec074ac11366eb0d0ddc66fb2bd63e0`
  ("fix: align RN deps to expo SDK 57 expected versions")
- `git status --porcelain` was NOT empty at start: the working tree already held a
  pre-existing, uncommitted partial migration (Phase 2/3 feature work + facet
  packages already bumped to 2.0.0 / 1.0.2 + partial `arc→sg`/`SovGrant` naming
  edits). This deviation from the "clean main" precondition is recorded here; the
  baseline below is that pre-existing working-tree state.

## FUSORB (read-only tooling repo)
- Root: `C:/Users/HP/Desktop/poetic-dev/fusorb`
- HEAD: `1c8213f10381894e63bfbd7939a9dc360c02e76d`
- Naming ledger: `ecosystem/naming-ledger.json`
  Self-test (`check-legacy-names.mjs selfTest`): PASSED (no live token matches a
  renamed/pending pattern; the Sg rename entries carry `availableIn`).

## Scripts run from `package.json`
| script | command | result |
| --- | --- | --- |
| install | `pnpm install` (node_modules present) | satisfied — `@fusorb/facet-sdk@2.0.0`, `@fusorb/facet-store@1.0.2` (exact pins) |
| build | — | N/A — no `build` script in package.json |
| typecheck | `tsc --noEmit` (`pnpm typecheck`) | RED — 4 errors (see below) |
| lint | `eslint . --ext .ts,.tsx` (`pnpm lint`) | N/A — eslint not installed (not a devDependency); script present but non-functional in this env |
| test | — | N/A — no `test` script in package.json |

## Baseline typecheck errors (4)
1. `src/app/_layout.tsx:7` — `SovGrantClient` not exported from `@/sdk`.
2. `src/sdk/index.ts:2` — `ArcIdClient` not exported from `@fusorb/facet-sdk` (2.0.0
   renamed it to `SgClient`).
3. `src/sdk/index.ts:31` — `authStore: useAuthStore` not assignable to `TokenStoreLike`
   (facet-store 1.0.2).
4. `src/stores/auth-store.ts:45` — store initializer missing `error` / `setError`
   required by `AuthState`.

## Baseline naming gate (`check-legacy-names`)
4 renamed tokens outside the allowlist:
- `src/app/login.tsx:46` — `ArcWallet` -> `SovPort`
- `src/sdk/index.ts:2` — `ArcIdClient` -> `SgClient` (import)
- `src/sdk/index.ts:27` — `ArcIdClient` -> `SgClient` (comment)
- `src/sdk/index.ts:35` — `new ArcIdClient(...)` -> `new SgClient(...)` (constructor)

## Baseline live-token counts (must stay identical before/after)
- `ArcevoCirqle`: 1  (README.md:3)
- `arcevocirqle`:   0
- `arcevocirqle.com.ng`: 0
- `@fusorb_hq`:     0
(No live tokens appear in `src/`; README line 3 is the only occurrence.)
