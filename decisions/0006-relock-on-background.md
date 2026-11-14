# 0006 — The wallet re-locks when the app leaves the foreground

Status: Accepted (2026-11-13). Extends [ADR 0004](./0004-device-authentication-and-transport.md)
and [ADR 0005](./0005-device-bound-secrets-and-session-durability.md).

## Context

ADR 0004 requires the device owner to authenticate before the wallet opens, but
that unlock happened **once per process**: the gate held its `unlocked` state in
memory, and the OS keeps a backgrounded app alive — often for days — so a wallet
that was unlocked, backgrounded and reopened showed the wallet again with no
prompt. The 2026-11-13 audit recorded the missing re-lock policy as a decision for
the product owner rather than something to guess at.

The requirement, as finally stated: if the device has a lock (fingerprint, face
or passcode), prompt for it **on every close/reopen**.

## Decision

- The wallet locks on every transition to `background`. Returning to the
  foreground requires the device owner to authenticate again
  (`unlockWithBiometrics`), which prefers biometrics and accepts the device
  passcode — the same gate as launch, so the policy follows whatever the device
  has enrolled and never invents its own secret.
- **`inactive` does not lock.** iOS reports `inactive` for the biometric prompt
  itself and for transient overlays (control centre, notification shade, an
  incoming call), so locking there would re-lock the wallet the instant the user
  authenticates — an unlock loop.
- **No idle timeout is imposed.** The boundary is the app leaving the foreground,
  which needs no threshold; a timer would be a number picked out of the air, and a
  device sitting unlocked in the foreground is the OS lock's job to cover.
- A prompt is never raised while the app is in the background, and a result that
  arrives after the app was backgrounded (the OS dismisses the prompt) is
  discarded, so it cannot report over the fresh attempt raised on return.

## Consequences

- Every return to the wallet costs one device-authentication prompt. That is the
  point: the session stays on the device, but the wallet's contents are only
  readable while its owner is present.
- A cancelled prompt leaves the explicit unlock view rather than re-prompting on
  every navigation; returning from the background always starts a fresh attempt.
- Devices with no lock are unaffected — they are already refused (ADR 0004).
- Nothing about the flow changes while the app stays in the foreground: signing
  and presentation keep their own prompts (ADR 0004/0005).
