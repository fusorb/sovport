# sovport x SovGrant Integration Plan

> **Last verified: 2026-08-05.** All claims below reflect the current sovgrant / facet / sovport state (verified against the tree and published npm packages).

## Overview

sovport is an Expo 57 + React Native 0.86 mobile wallet - currently a blank Expo starter template (default `index` / `explore` tabs, no SovGrant integration yet). SovGrant is a complete sovereign identity backend (Fastify + Prisma + PostgreSQL + Redis) that is ready to be consumed. All server communication goes through **`@fusorb/facet-sdk`** (published, framework-agnostic, pure fetch).

## What SovGrant Exposes (via @fusorb/facet-sdk)

The SDK is published on npm (`@fusorb/facet-sdk`, v1.0.1). It is pure TypeScript + fetch - no DOM, no React, no framework deps - so it runs unchanged in React Native. sovgrant's own `src/sdk/index.ts` is a singleton wrapper that re-exports the same classes; the wallet can depend on the npm package directly.

| SDK class | Key methods |
|-----------|-------------|
| **AuthSdk** | login, register, logout, me, refresh, sessions, MFA, magic-link, password reset, step-up, change-password |
| **PasskeySdk** | list, registrationOptions, register, authenticationOptions, authenticate, deregister (WebAuthn) |
| **VcSdk** | list (GET /credentials), verify, issue, offer, acceptOffer, revoke, createVerificationSession, presentForVerification, getStatusList, resolveTenantDidDoc |
| **IdentitySdk** | updateProfile, listDevices, external IDs, linked accounts, delegations, **startOnboarding / getOnboardingProgress / advanceOnboarding**, **registerWalletDid** |
| **OAuthSdk** | OAuth clients + tokens CRUD |
| **TenantSdk** | tenants CRUD, switch-context, members, policy, DID, signing keys, projects, onboarding flows |
| **BillingSdk** | getSubscription |
| **WebhooksSdk** | endpoint CRUD + test |
| **AuditSdk** | list audit logs |
| **IdpSdk** | IdP connection management |

> **Onboarding + wallet-DID are already in the SDK.** The old plan said the wallet must create its own onboarding wrapper - it does not. `IdentitySdk` already provides `startOnboarding(flowId)`, `getOnboardingProgress(progressId)`, `advanceOnboarding(progressId, stepId, data)` and `registerWalletDid({ publicKeyJwk, provider, providerWalletId })`.

## Onboarding System (SovGrant-built, wallet-consumed)

SovGrant already has a complete onboarding architecture - the wallet does **not** reimplement tracking logic, only renders the frontend steps.

**Backend owns:**
- `OnboardingFlow` model - belongs to a Project, stores ordered steps as JSON
- `OnboardingProgress` model - tracks user position: `currentStep`, `completedSteps[]`, `completedAt`, collected data
- Admin CRUD routes - define flows per project via admin dashboard
- User-facing routes - `POST /identity/onboarding/start`, `POST .../advance`, `GET .../:progressId`
- Idempotent start - calling twice returns same progress
- `completedAt` auto-sets when all steps are done

**Wallet owns:**
- `services/onboarding.ts` - thin wrapper over `IdentitySdk` onboarding methods
- `app/(onboarding)/` - stepper screens with step renderers
- Step types the wallet can render: WelcomeCard, FeatureHighlight, ActionPrompt, FormStep, BiometricSetup, CredentialIntro

## Build Phases

### Phase 1 - Auth, SDK Foundation & Onboarding

**Dependencies to add:**
- `zustand` (state - matches sovgrant pattern)
- `expo-secure-store` (token persistence - keychain/EncryptedSharedPreferences)
- `@fusorb/facet-sdk` (the published SDK client)

**Services (consume the SDK, don't port it):**
- `services/api-client.ts` - instantiate `sgClient` with `baseUrl` + wire `onTokenRefresh` / `onAuthCleared` to the auth store (mirror sovgrant's `src/sdk/index.ts`)
- `services/auth.ts` - wrap `AuthSdk` (login, register, logout, me, sessions, MFA, step-up)
- `services/passkey.ts` - wrap `PasskeySdk` + `expo-secure-store` for WebAuthn registration/authentication
- `services/onboarding.ts` - wrap `IdentitySdk` onboarding methods

**Stores:**
- `stores/auth-store.ts` - Zustand store (port sovgrant's `auth.store.ts` pattern)
- `stores/onboarding-store.ts` - local onboarding completion state

**Auth screens - `app/(auth)/`:**
- login, register, MFA verify, passkey, forgot-password, reset-password

**Onboarding screens - `app/(onboarding)/`:**
- Welcome - app overview card
- Features - highlight credentials, DID, security capabilities
- Biometric - passkey/biometric setup prompt
- Credential Intro - what are VCs and how they work
- Complete - transition into wallet dashboard
- Stepper layout with ProgressDots and SkipButton

**Logic:** After register or first launch - check onboarding progress -> show onboarding if no completed flow -> advance per step

### Phase 2 - Wallet Core (Credentials)
- Wallet dashboard with credential display (**`GET /credentials` is implemented in sovgrant** - `list()` on `VcSdk`)
- Credential issue/verify/offer flows
- QR scanning (expo-camera) for credential presentations
- SD-JWT VC display and verification

### Phase 3 - DID & Identity
- Register wallet DID on first launch (`IdentitySdk.registerWalletDid` - keypair generated on-device, only public key sent to SovGrant)
- Display did:key or did:web
- DID document retrieval and resolution

### Phase 4 - Full Integration
- Tenant context switching
- OAuth client management
- Webhook subscription management
- Audit log query
- Billing/subscription display

## Backend Status (verified 2026-08-05)

- **`GET /credentials`** - **IMPLEMENTED** (`VcSdk.list()`) - no longer a blocker
- **`registerWalletDid`** - **IMPLEMENTED** (`IdentitySdk.registerWalletDid`, POST /identity/wallet/did) - non-custodial, public key only
- **Dockerfile + docker-compose.yml** - **EXIST** in sovgrant (multi-stage node:22-alpine API image, Postgres 17 + Redis 7 compose) - no longer a blocker
- **Test suite** - 59 test files / 326 tests, all passing (sovgrant `.agent/output.txt`, 2026-08-05)

## Architecture
- Zustand stores (matches sovgrant pattern)
- Pure fetch SDK client with 401 auto-refresh (`@fusorb/facet-sdk` `sgClient.onTokenRefresh`)
- `expo-secure-store` for token persistence
- expo-router groups: `(auth)`, `(onboarding)`, `(app)`
- SovGrant backend owns flow definitions + progress - wallet only renders

## Web-Only Facet Packages (important)

`@fusorb/facet-components`, `@fusorb/facet-auth`, `@fusorb/facet-layout` are **web-only** (Radix + DOM + Tailwind). They do not run in React Native. The wallet's UI is React Native native components (StyleSheet, RN primitives, react-native-svg if needed for QR). If shared RN UI is later desired, a new `@fusorb/facet-rn` package would be required - it is NOT a fork of the web library.
