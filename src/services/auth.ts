import { auth, sgClient } from "@/sdk";
import { useAuthStore } from "@/stores/auth-store";

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
      useAuthStore.getState().setAuth(identity, accessToken, refreshToken ?? "", sessionId);
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
    await auth.logout(sessionId ?? "").catch(() => {});
    sgClient.setAccessToken(null);
    useAuthStore.getState().clearAuth();
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
