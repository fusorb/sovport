# Fusorb sync — SovPort

Source of truth for the ecosystem: the Fusorb architecture repo
(`poetic-dev/fusorb`).

- Naming: `ecosystem/naming-ledger.json`
- Standards: `content/standards/` (repo structure, naming, UI invariant, agent protocol)
- Decided facts: `ecosystem/ecosystem.json`

Last synced: 2026-11-13, against fusorb `634cef02`.

## Status: in sync

- **Repo-structure baseline: complete.** This repo carries `AGENTS.md`, the thin
  `CLAUDE.md`, `.github/workflows/ci.yml` (install + typecheck + lint + format
  check + tests), `.gitignore`, `.gitattributes` (LF normalization for this
  Windows repo), and the `decisions/` ADR folder (0001–0004).
- **Naming: in sync.** The `ArcWallet` -> `SovPort` and `ArcIdClient` ->
  `SgClient` passes are complete; re-verified against the `634cef02` ledger.
- **Narrative docs: reconciled 2026-11-13.** README, the integration plan, the
  remediation tracker and the ADRs were re-checked against the tree — SDK pin
  (`facet-sdk@4.1.0`, `facet-store@1.1.0`), `pnpm@12.21.0`, CI contents, the
  route/service lists, and the security decisions (ADRs 0003/0004).
- **SovGrant contract: re-verified 2026-11-13** against sovgrant `dcda05b`. Every
  path the wallet calls exists under `/api/v1` (auth / identity / credentials),
  the paired-device public key and approval signature match
  `verifyEd25519Signature`, the wallet-DID JWK matches `JwkSchema`, and the
  presentation proof matches `verify-present.route.ts` — `credentialHash` over
  the exact submitted credential, `nonce` = the session challenge, and `kid` =
  the DID SovGrant registered. Re-checked at `0205185`: the four commits after
  that touch guards, not this surface, and both gaps raised with them (the stale
  Ed25519 TODO in their launch audit, and the misleading `Session.id` default)
  are fixed.

## Staying in sync

Re-read the naming ledger before any rename, and keep the baseline files above
current. Never rename the live `arcevocirqle` brand, domain, or email addresses.

`scripts/check-doc-sync.mjs` (CI: `pnpm check:docs`) asserts that the
`@fusorb/facet-sdk@x.y.z`, `@fusorb/facet-store@x.y.z` and `pnpm@x.y.z` claims in
README / the integration plan / this file match `package.json`, so a version bump
that forgets the docs fails CI instead of drifting silently.

See [docs/archive/](./docs/archive/) for the audit trail (dated audits and
remediation are completed records, kept for reference).
