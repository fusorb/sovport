// SovPort — small async key/value store for non-secret wallet state.
//
// Tokens and keys live in expo-secure-store; bulk/non-secret data (credential
// vault, first-run flags) lives here. Backed by AsyncStorage, which works on
// iOS, Android, and web (localStorage).

import AsyncStorage from "@react-native-async-storage/async-storage";

export const kv = {
  get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },
  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};
