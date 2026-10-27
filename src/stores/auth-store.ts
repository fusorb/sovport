import type { User } from "@fusorb/facet-sdk";
import type { AuthState } from "@fusorb/facet-store";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

export { type User };

export const TOKEN_STORAGE_KEY = "sovport-auth";

interface PersistedSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  sessionId?: string;
}

/**
 * sovport-auth store.
 *
 * Extends the facet-store {@link AuthState} shape with two React-Native-specific
 * concerns that the framework-agnostic store deliberately omits:
 *
 * - `sessionId` — needed to POST /auth/logout on sign-out.
 * - `persist` / `restore` — SecureStore hydration on launch (the facet-store
 *   has no platform storage; that's a consumer responsibility).
 *
 * The store's state exposes getState / setTokens / clearAuth; a thin adapter
 * adapts the zustand hook to `TokenStoreLike`, which feeds the sgClient 401
 * refresh / clear-auth bridge in `createZustandTokenStorage`.
 */
export interface sovportAuthState extends Omit<AuthState, "setAuth"> {
  sessionId: string | null;
  setAuth: (
    user: User,
    accessToken: string,
    refreshToken: string,
    sessionId?: string,
  ) => void;
  /** Persist the current session to the secure store. */
  persist: () => Promise<void>;
  /** Restore a persisted session on launch. Returns true if one was found. */
  restore: () => Promise<boolean>;
}

export const useAuthStore = create<sovportAuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  sessionId: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setAuth: (user, accessToken, refreshToken, sessionId) =>
    set({
      user,
      accessToken,
      refreshToken,
      sessionId: sessionId ?? null,
      isAuthenticated: true,
      isLoading: false,
    }),

  setUser: (user) => set({ user }),

  setTokens: (accessToken, refreshToken) =>
    set((state) => ({
      accessToken,
      ...(refreshToken ? { refreshToken } : {}),
      isAuthenticated: state.isAuthenticated || accessToken !== null,
    })),

  clearAuth: () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  persist: async () => {
    const { user, accessToken, refreshToken, sessionId } = get();
    if (!user || !accessToken || !refreshToken) return;
    const session: PersistedSession = {
      user,
      accessToken,
      refreshToken,
      sessionId: sessionId ?? undefined,
    };
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, JSON.stringify(session));
  },

  restore: async () => {
    try {
      const raw = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as PersistedSession;
      if (!parsed.accessToken || !parsed.user) return false;
      set({
        user: parsed.user,
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        sessionId: parsed.sessionId ?? null,
        isAuthenticated: true,
      });
      return true;
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY).catch(() => {});
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
}));
