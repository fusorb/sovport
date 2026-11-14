import * as SecureStore from 'expo-secure-store';
import type { User } from '@fusorb/facet-sdk';
import { createSecureAuthStore, type SecureAuthState } from '@fusorb/facet-store/native';

export { type User };

export const TOKEN_STORAGE_KEY = 'sovport-auth';
export type SovportAuthState = SecureAuthState;

/**
 * sovport-auth store.
 *
 * The SecureStore-backed session store lives in `@fusorb/facet-store/native`
 * (`createSecureAuthStore`). This module keeps the `@/stores/auth-store` import
 * path stable for the rest of the app and supplies the platform-specific secure
 * backend and device-only keychain policy (ADR 0005).
 */
export const useAuthStore = createSecureAuthStore({
  storageKey: TOKEN_STORAGE_KEY,
  backend: SecureStore,
  storageOptions: {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  },
});
