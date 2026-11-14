import {
  SgClient,
  AuthSdk,
  BillingSdk,
  IdentitySdk,
  OAuthSdk,
  TenantSdk,
  VcSdk,
  type ApiError,
  type ApiResponse,
  type User,
} from '@fusorb/facet-sdk';
import { createZustandTokenStorage } from '@fusorb/facet-store';
import { useAuthStore } from '@/stores/auth-store';

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'http://localhost:4000/api/v1';

/**
 * Access tokens and credential presentations travel over this origin, so a
 * release build must never point at a non-HTTPS URL. Failing fast at startup
 * beats silently sending bearer tokens over cleartext.
 */
function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL;
  if (!__DEV__ && !configured.startsWith('https://')) {
    throw new Error(`EXPO_PUBLIC_API_URL must use https in release builds (got "${configured}")`);
  }
  return configured;
}

export const BASE_URL = resolveBaseUrl();

// ── Client + refresh bridge (facet-store) ─────────────────────────────────────

// authSdk is assigned lazily below to break the circular dep:
//   client needs onTokenRefresh → onTokenRefresh needs AuthSdk → AuthSdk needs client
let authSdk: AuthSdk;

// createZustandTokenStorage wires the SgClient's 401 hook to the Zustand
// auth store: on a 401 it calls AuthSdk.refresh(), updates the store with the
// new token bundle, and clears auth on failure.
//
// Durable storage goes through the bridge's documented `persist` adapter, which
// is called with the access token every time the store's tokens change: a
// rotated bundle is written to SecureStore, a refused one drops the stored
// session, so the store's memory and the device's storage never disagree. The
// session is read back out of the store inside the adapter, so the refresh token
// is persisted without ever being passed *through* the adapter — SecureStore is
// this platform's secure medium (there is no cookie jar in React Native).
const tokenStorage = createZustandTokenStorage({
  authStore: {
    getState: () => ({
      accessToken: useAuthStore.getState().accessToken,
      refreshToken: useAuthStore.getState().refreshToken,
    }),
    setTokens: (accessToken, refreshToken) =>
      useAuthStore.getState().setTokens(accessToken, refreshToken),
    clearAuth: () => useAuthStore.getState().clearAuth(),
  },
  sdk: { refresh: (token: string) => authSdk!.refresh(token) },
  persist: {
    getAccessToken: () => useAuthStore.getState().accessToken,
    setAccessToken: (token) => {
      const store = useAuthStore.getState();
      if (token === null) {
        void store.forget().catch(() => {});
      } else {
        void store.persist().catch(() => {});
      }
    },
  },
});

const client = new SgClient({
  baseUrl: BASE_URL,
  onTokenRefresh: tokenStorage.onTokenRefresh,
  onAuthCleared: tokenStorage.clearTokens,
});

// ── Domain SDKs (facet-sdk classes) ───────────────────────────────────────────

authSdk = new AuthSdk(client);

export const auth = authSdk;
export const credentials = new VcSdk(client);
export const identity = new IdentitySdk(client);
export const tenants = new TenantSdk(client);
export const billing = new BillingSdk(client);
export const oauth = new OAuthSdk(client);

// Re-export the client so providers/services can push token updates.
export const sgClient = client;

// Re-export shared types for consumers.
export type { ApiError, ApiResponse, User };
