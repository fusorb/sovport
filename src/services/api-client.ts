// SovPort — SovGrant SDK client singleton (mirrors sovgrant/src/sdk/index.ts).
// Uses expo-secure-store for token persistence.

import { SgClient, AuthSdk } from "@fusorb/facet-sdk";
import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "sg_access_token";
const REFRESH_KEY = "sg_refresh_token";

export async function getStoredAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEY);
}

export async function setStoredAccessToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(STORAGE_KEY, token);
  else await SecureStore.deleteItemAsync(STORAGE_KEY);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function setStoredRefreshToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(REFRESH_KEY, token);
  else await SecureStore.deleteItemAsync(REFRESH_KEY);
}

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

let authSdk: AuthSdk;

export const sgClient = new SgClient({
  baseUrl: BASE_URL,
  onTokenRefresh: async (): Promise<string | null> => {
    const refreshToken = await getStoredRefreshToken();
    if (!refreshToken) return null;
    try {
      const { data, error } = await authSdk.refresh(refreshToken);
      if (error || !data?.accessToken) return null;
      await setStoredAccessToken(data.accessToken);
      if (data.refreshToken) await setStoredRefreshToken(data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    }
  },
  onAuthCleared: async () => {
    await setStoredAccessToken(null);
    await setStoredRefreshToken(null);
  },
});

authSdk = new AuthSdk(sgClient);

export const auth = authSdk;
export { AuthSdk };
