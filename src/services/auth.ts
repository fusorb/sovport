import { auth, sgClient } from '@/sdk';
import { credentialVault } from '@/services/credential-vault';
import { releaseDeviceIdentity } from '@/services/device-identity';
import { walletDidService } from '@/services/wallet-did';
import { kv } from '@/lib/kv';
import { useAuthStore } from '@/stores/auth-store';
import * as SecureStore from 'expo-secure-store';

const TOKEN_STORAGE_KEY = 'sovport-auth';

/**
 * Auth service — thin wrapper over AuthSdk that keeps the Zustand auth
 * store and the sgClient bearer token in sync, and persists sessions
 * to the secure store.
 */
export const authService = {
  async login(email: string, password: string) {
    const result = await auth.login(email, password);
    if (result.data?.accessToken) {
      const { identity, accessToken, refreshToken, sessionId } = result.data;
      useAuthStore.getState().setAuth(identity, accessToken, refreshToken ?? '', sessionId);
      sgClient.setAccessToken(accessToken);
      await useAuthStore.getState().persist();
    }
    return result;
  },

  async register(name: string, email: string, password: string) {
    const result = await auth.register(name, email, password);
    if (result.data?.identity) {
      useAuthStore.getState().setUser(result.data.identity);
    }
    return result;
  },

  async verifyMfa(code: string, sessionId: string) {
    const result = await auth.verifyMfa(code, sessionId);
    if (result.data?.accessToken) {
      const { accessToken, refreshToken } = result.data;
      const me = await auth.me();
      if (me.data) {
        useAuthStore.getState().setAuth(me.data, accessToken, refreshToken, sessionId);
      } else {
        useAuthStore.getState().setTokens(accessToken, refreshToken);
      }
      sgClient.setAccessToken(accessToken);
      await useAuthStore.getState().persist();
    }
    return result;
  },

  async logout() {
    const { sessionId } = useAuthStore.getState();
    await auth.logout(sessionId ?? '').catch(() => {});
    sgClient.setAccessToken(null);
    useAuthStore.getState().clearAuth();
    try {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    } catch {}

    // Drop local wallet state so a new account starts clean. The device key
    // itself is kept (it is the device's identity across sign-ins); only the
    // in-memory copy of the secret is released.
    releaseDeviceIdentity();
    await credentialVault.clear().catch(() => {});
    await walletDidService.clearRegistration().catch(() => {});
    await kv.remove('sovport-did-skip').catch(() => {});
  },

  async refresh() {
    const state = useAuthStore.getState();
    if (!state.refreshToken) return null;
    const result = await auth.refresh(state.refreshToken);
    if (result.data?.accessToken) {
      useAuthStore.getState().setTokens(result.data.accessToken, result.data.refreshToken);
      sgClient.setAccessToken(result.data.accessToken);
      await useAuthStore.getState().persist();
    }
    return result;
  },
};
