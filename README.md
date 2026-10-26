# sovport

Self-sovereign identity wallet for the ArcevoCirqle ecosystem. Built with Expo 57 + React Native 0.86, sovport will connect to the [SovGrant](https://github.com/fusorb/sovgrant) identity and access management backend for decentralized identity, verifiable credentials, and secure authentication.

> **Status (2026-08-05): blank Expo starter.** The SovGrant integration has not been built yet. This repo currently ships the default Expo tabs template (`index` / `explore`). The architecture below is the target; see [docs/sovport-integration-planning.md](./docs/sovport-integration-planning.md) for the phased plan and current facts.

## Vision

- **Authenticate** — login, register, passkeys (WebAuthn), TOTP MFA, magic-link, social login
- **Hold credentials** — receive, store, and display SD-JWT Verifiable Credentials issued by trusted parties
- **Prove identity** — present credentials via QR-based challenge-response verification (W3C BitstringStatusList)
- **Manage DIDs** — self-owned `did:key` and `did:web` identifiers, registered through SovGrant's wallet DID flow
- **Onboard seamlessly** — step-by-step setup flow powered by SovGrant's built-in onboarding system (flow definitions + progress tracking on backend, wallet only renders the UI)
- **Stay secure** — biometric auth, session management, step-up authentication for sensitive operations

## Architecture (target)

```
┌─────────────────┐     HTTP      ┌──────────────────────┐
│   sovport     │ ──────────▶   │   SovGrant Backend      │
│   (React Native)│ ◀──────────   │   (Fastify + Prisma)  │
│   Expo 57       │   SDK/JSON    │   PostgreSQL + Redis  │
└─────────────────┘               └──────────────────────┘
```

sovport consumes **`@fusorb/facet-sdk`** — the published, framework-agnostic TypeScript fetch client that wraps the SovGrant API. It covers auth, credentials (VCs), DIDs, onboarding, passkeys, tenants, billing, webhooks, audit, and IdP. The SDK is pure fetch (no DOM / no React), so it runs in React Native unchanged; only the token-storage adapter is swapped for `expo-secure-store`.

**Important:** `@fusorb/facet-components` / `@fusorb/facet-auth` / `@fusorb/facet-layout` are **web-only** (Radix + DOM + Tailwind). They do **not** run in React Native. sovport owns its native screens and uses the SDK for all server communication.

## Prerequisites

- Node.js >= 22
- pnpm >= 9
- [SovGrant](https://github.com/fusorb/sovgrant) backend running locally (or a shared dev instance)

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the Expo dev server
pnpm start
```

The wallet expects the SovGrant API at `http://localhost:4000/api/v1` by default. Configure via `EXPO_PUBLIC_API_URL` environment variable for other environments.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Start Expo dev server |
| `pnpm android` | Start on Android emulator |
| `pnpm ios` | Start on iOS simulator |
| `pnpm web` | Start on web browser |
| `pnpm snapshot` | Generate codebase snapshot for AI agents |

## Project Structure

```
src/
├── app/           # expo-router screens (file-based routing)
│   └── (currently: index / explore tabs — SovGrant integration is next)
├── components/    # Reusable UI and wallet components
├── services/      # SovGrant SDK clients and business logic   (planned)
├── stores/        # Zustand state management               (planned)
├── hooks/         # Custom React hooks
├── constants/     # Theme, spacing, configuration
└── types/         # Shared TypeScript types                (planned)
```

## Related

- [SovGrant](https://github.com/fusorb/sovgrant) — Sovereign identity & access management backend
- [facet](https://github.com/fusorb/facet) — Auth-first component system + `@fusorb/facet-sdk`
