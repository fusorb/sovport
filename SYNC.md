# Fusorb sync — SovPort

Source of truth for the ecosystem: the Fusorb architecture repo
(`poetic-dev/fusorb`).

- Naming: `ecosystem/naming-ledger.json`
- Standards: `content/standards/` (repo structure, naming, UI invariant, agent protocol)
- Decided facts: `ecosystem/ecosystem.json`

Last checked: 2026-10-31, against fusorb `424e31c`.

## Outstanding for this repo

1. **Repo-structure baseline.** SovPort does not yet carry the files the Fusorb
   repo-structure standard expects of every product repo:
   - `AGENTS.md` (agent session rules)
   - `CLAUDE.md` (thin pointer to `AGENTS.md`)
   - a CI workflow under `.github/workflows/`
2. **Naming: nothing outstanding.** The `ArcWallet` -> `SovPort` and
   `ArcIdClient` -> `SgClient` passes are done and recorded in
   `docs/ecosystem-naming/`.

## Next step

Add the baseline files above (mirror the shape used by a sibling product repo),
then re-check the naming ledger before any further rename. Never rename the live
`arcevocirqle` brand, domain, or email addresses.
