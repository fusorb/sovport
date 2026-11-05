# Fusorb sync — SovPort

Source of truth for the ecosystem: the Fusorb architecture repo
(`poetic-dev/fusorb`).

- Naming: `ecosystem/naming-ledger.json`
- Standards: `content/standards/` (repo structure, naming, UI invariant, agent protocol)
- Decided facts: `ecosystem/ecosystem.json`

Last synced: 2026-11-05, against fusorb `634cef02`.

## Status: in sync

- **Repo-structure baseline: nearly complete.** This repo carries `AGENTS.md`,
  the thin `CLAUDE.md`, `.github/workflows/ci.yml`, `.gitignore`, and (Windows
  repo) `.gitattributes` with LF normalization. Still missing: a `decisions/`
  ADR folder.
- **Naming: in sync.** The `ArcWallet` -> `SovPort` and `ArcIdClient` ->
  `SgClient` passes are complete; re-verified against the `634cef02` ledger.

## Staying in sync

Re-read the naming ledger before any rename, and keep the baseline files above
current. Never rename the live `arcevocirqle` brand, domain, or email addresses.
