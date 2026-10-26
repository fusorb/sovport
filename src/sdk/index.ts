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
} from "@fusorb/facet-sdk";
import { createZustandTokenStorage } from "@fusorb/facet-store";
import { useAuthStore } from "@/stores/auth-store";

// ── Config ────────────────────────────────────────────────────────────────────

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// ── Client + refresh bridge (facet-store) ─────────────────────────────────────

// authSdk is assigned lazily below to break the circular dep:
//   client needs onTokenRefresh → onTokenRefresh needs AuthSdk → AuthSdk needs client
let authSdk: AuthSdk;

// createZustandTokenStorage wires the SgClient's 401 hook to the Zustand
// auth store: on a 401 it calls AuthSdk.refresh(), updates the store with the
// new token bundle, and clears auth on failure.
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
