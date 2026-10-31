# SovPort — Agent Session Rules

Loaded at the start of every session.

## What this repo is

The self-sovereign identity wallet of the Fusorb ecosystem: an Expo / React
Native app that authenticates against SovGrant and holds Verifiable Credentials.
It consumes the framework-agnostic `@fusorb/facet-sdk` (and `@fusorb/facet-store`).

The Facet web packages (`@fusorb/facet-components`, `-auth`, `-layout`) are
DOM/Radix-based and do **not** run in React Native. SovPort owns its native
screens and uses the SDK for all server communication.

## Boundary

- Write only inside this repo. Sibling Fusorb repos are read-only unless the task
  is for that repo.
- Never rename the live `arcevocirqle` brand, domain, or email addresses.

## Naming

Before any rename, read the Fusorb naming ledger
(`poetic-dev/fusorb` -> `ecosystem/naming-ledger.json`). See `SYNC.md`.

## Commands

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm start   # expo start
```

## Local scratch

Use `.agent/` for local-only planning output; it is gitignored and never committed.
