# SovPort

Self-sovereign identity wallet for the Fusorb ecosystem. Built with Expo 57 + React Native 0.86, SovPort connects to the [SovGrant](https://github.com/fusorb/sovgrant) identity and access management backend for decentralized identity, verifiable credentials, and secure authentication.

> **Status (2026-11-13): integration in progress.** Auth, MFA, credential offer/accept, presentation (deep link + in-app QR scanner), wallet DID, and device pairing/approval flows are wired against `@fusorb/facet-sdk@4.0.0`; screens live under `src/app/`. Accepted credentials are held on-device, encrypted at rest (see [`decisions/`](./decisions/)). See [docs/sovport-integration-planning.md](./docs/sovport-integration-planning.md) for the phased plan and [docs/audits/](./docs/audits/) for the audit + remediation history. Backend expected at `http://localhost:4000/api/v1` (or `EXPO_PUBLIC_API_URL`).

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
│   SovPort       │ ──────────▶   │   SovGrant Backend      │
│   (React Native)│ ◀──────────   │   (Fastify + Prisma)  │
│   Expo 57       │   SDK/JSON    │   PostgreSQL + Redis  │
└─────────────────┘               └──────────────────────┘
```

SovPort consumes **`@fusorb/facet-sdk`** — the published, framework-agnostic TypeScript fetch client that wraps the SovGrant API. It covers auth, credentials (VCs), DIDs, onboarding, passkeys, tenants, billing, webhooks, audit, and IdP. The SDK is pure fetch (no DOM / no React), so it runs in React Native unchanged; only the token-storage adapter is swapped for `expo-secure-store`.

**Important:** `@fusorb/facet-components` / `@fusorb/facet-auth` / `@fusorb/facet-layout` are **web-only** (Radix + DOM + Tailwind). They do **not** run in React Native. SovPort owns its native screens and uses the SDK for all server communication.

### Crypto & custody

All keys and signatures use **Ed25519** via `@noble/curves` (pure JS, no `crypto.subtle`) with randomness from `expo-crypto`. A single device keypair backs both the paired-device registration and the wallet `did:key`. Presentation proofs are detached EdDSA JWS. Accepted credentials are held on-device and **encrypted at rest** with AES-256-GCM, with the key held in the OS keystore/Keychain. Rationale: [ADR 0001](./decisions/0001-rn-safe-crypto-and-device-key.md), [ADR 0002](./decisions/0002-on-device-credential-custody.md), [ADR 0003](./decisions/0003-credential-vault-encryption.md), [ADR 0004](./decisions/0004-device-authentication-and-transport.md).

**Platforms:** iOS and Android. Sessions and the vault key use `expo-secure-store`, which has no browser implementation — so the web target cannot hold credentials or sessions and is **not supported**.

### Security

- **At rest** — VCs are AES-256-GCM sealed; the key never leaves the device and never syncs to a backup.
- **Device authentication** — key creation, signing and wallet unlock require the enrolled device lock (biometrics *or* passcode). A device with no lock at all is refused (`decisions/0004`).
- **Transport** — release builds refuse to start against a non-HTTPS `EXPO_PUBLIC_API_URL`.
- **Presentations** — the QR scanner accepts `sovport://present?sessionId=…&challenge=…`, an equivalent `https://` URL, or a raw JSON `{sessionId, challenge}` payload.

## Prerequisites

- Node.js >= 22
- pnpm 12 (`packageManager` pins `pnpm@12.18.0`)
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
| `pnpm typecheck` | TypeScript check (`tsc --noEmit`) |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier write |
| `pnpm format:check` | Prettier check (used by CI) |
| `pnpm test` | Unit tests (Node's built-in test runner) |
| `pnpm snapshot` | Generate codebase snapshot for AI agents |

## Project Structure

```
src/
├── app/           # expo-router screens (file-based routing):
│                  #   index (dashboard), mfa, pair, approve, offer,
│                  #   present, scan, did, _layout
├── components/    # Reusable UI and wallet components
├── services/      # SovGrant SDK clients and business logic
│                  #   (auth, biometric, credentials, credential-vault,
│                  #    device-identity, presentation, vault-crypto,
│                  #    wallet-did)
├── lib/           # Pure, testable primitives (did-key, credential-vault,
│                  #   encrypted-storage, kv, present-link) plus the thin
│                  #   platform crypto layer (crypto.ts)
├── stores/        # Zustand state management (auth-store)
├── hooks/         # Custom React hooks
├── constants/     # Theme, spacing, configuration
├── sdk/           # SovGrant client wiring
└── types/         # Shared TypeScript types
```

## Related

- [SovGrant](https://github.com/fusorb/sovgrant) — Sovereign identity & access management backend
- [facet](https://github.com/fusorb/facet) — Auth-first component system + `@fusorb/facet-sdk`
