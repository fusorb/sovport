# Ecosystem Naming — Findings (sovport)

All counts are over tracked, non-`node_modules` files (the naming-gate script
scans the working tree and skips `node_modules`/`.git`).

## Gate baseline (renamed tokens) — ALL FIXED
| file:line | from | to | class | status |
| --- | --- | --- | --- | --- |
| src/app/login.tsx:46 | ArcWallet | SovPort | renamed | fixed |
| src/sdk/index.ts:2 | ArcIdClient | SgClient | renamed (import) | fixed |
| src/sdk/index.ts:27 | ArcIdClient | SgClient | renamed (comment) | fixed |
| src/sdk/index.ts:35 | ArcIdClient | SgClient | renamed (constructor) | fixed |

Re-run after fixes: `check-legacy-names: OK (self-test passed)` — 0 renamed tokens.

## Non-gate consistency fixes (not legacy tokens, resolved during migration)
| file | change | reason |
| --- | --- | --- |
| src/sdk/index.ts | `ArcIdClient` -> `SgClient` | facet-sdk 2.0.0 export rename |
| src/sdk/index.ts | export kept as `sgClient` (not `SovGrantClient`) | mirrors facet `SgClient`; per repo convention |
| src/app/_layout.tsx:7,42 | `SovGrantClient` -> `sgClient` | consume the `sgClient` export (fixes Error 1) |
| src/services/auth.ts | `sgClient` consumers | use the `sgClient` export |
| src/sdk/index.ts | `authStore: useAuthStore` -> `TokenStoreLike` adapter | zustand `UseBoundStore` does not expose `setTokens`/`clearAuth` as direct members (facet-store 1.0.2) |
| src/stores/auth-store.ts | add `error` + `setError` | required by facet-store 1.0.2 `AuthState` |
| docs/* | `git mv arcwallet->sovport-integration-planning.md` | SovPort naming; README already links to the new path |

### Note on `sgClient` vs `SovGrantClient`
The repo had two names for the same client instance: `sgClient` (sdk export +
`services/auth.ts`) and `SovGrantClient` (`_layout.tsx`, analysis notes). Per the
recorded preference, the SDK re-export stays `sgClient` (mirroring facet's
`SgClient`), and `_layout.tsx` / `services/auth.ts` consume `sgClient`. `SovGrantClient`
remains only in local `.agent/*` planning notes (left untouched).

## Live tokens (untouched; counts identical before/after)
- `ArcevoCirqle`: 1  (README.md:3)
- `arcevocirqle`:   0
- `arcevocirqle.com.ng`: 0
- `@fusorb_hq`:     0

## Contract surfaces inspected (NOT changed)
- Env var `EXPO_PUBLIC_API_URL` (src/sdk/index.ts) — not renamed.
- SecureStore key `sovport-auth` (`TOKEN_STORAGE_KEY`, src/stores/auth-store.ts) —
  sovport's OWN key; NOT facet-auth's `sg_access_token` / `sg_refresh_token`.
- Route `/auth/logout` (referenced in auth-store comment; base path `/api/v1`).
- Package name `sovport`.
- No DB tables/columns, no JWT issuer claims, no cookie names renamed.

## Pending / not applicable
- `useAuthSession()` is missing from `@fusorb/facet-auth` 2.0.0 — N/A for sovport
  (see report). sovport does not use `@fusorb/facet-layout`.
