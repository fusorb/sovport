# 0004 — Device authentication and transport policy

Status: Accepted (2026-11-13). Extended by [ADR 0005](./0005-device-bound-secrets-and-session-durability.md) — every wallet secret is stored device-only, the decrypted device key is no longer held in memory (`releaseDeviceIdentity` is gone), and presentation signing is gated behind device authentication too.

## Context

`unlockWithBiometrics` gated on `hasHardwareAsync() && isEnrolledAsync()` — both
of which concern **biometrics only**. On a device with a passcode but no enrolled
biometrics the guard returned `true` before any prompt, so the wallet unlock
gate, device-key creation and challenge signing all proceeded with **no**
authentication. A device with no lock whatsoever behaved the same way.

Separately, the API base URL was accepted verbatim (defaulting to
`http://localhost:4000/api/v1`), so a release build could send bearer tokens and
credential presentations over cleartext.

## Decision

- Device authentication gates on the enrolled **security level**
  (`getEnrolledLevelAsync`), not on biometric enrolment:
  - any lock (biometrics *or* passcode) → the user must authenticate;
    `authenticateAsync({ disableDeviceFallback: false })` accepts the passcode;
  - `SecurityLevel.NONE` (no lock at all) → **refused** for wallet unlock,
    device-key creation and signing.
- The device key **persists across sign-out**: it backs paired-device sign-in
  approval and the wallet `did:key`, so deleting it would break approval and
  change the DID on every sign-in. Only the decrypted copy is dropped from memory
  (`releaseDeviceIdentity`).
- Release builds refuse to start against a non-HTTPS `EXPO_PUBLIC_API_URL`
  (`src/sdk/index.ts`).

## Consequences

- A user whose device has no lock must set one; the app surfaces "a device lock
  (passcode or biometrics) is required".
- **Accepted trade-off (linkability):** because the same device key is reused, a
  different account signing in on the same device registers the same `did:key`
  with SovGrant, which can correlate the two accounts to one device. Rotating the
  key on sign-out would remove that correlation at the cost of breaking
  paired-device approval; that trade is deferred and reviewed here.
- Cleartext origins are impossible in a release build, so a misconfigured
  `EXPO_PUBLIC_API_URL` fails loudly at startup instead of silently leaking.
- Web is out of scope for the same reason as ADR 0003 (`expo-secure-store`).
