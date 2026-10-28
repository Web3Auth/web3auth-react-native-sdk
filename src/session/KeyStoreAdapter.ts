import type { IStorageAdapter } from "@toruslabs/session-manager";

import KeyStore from "./KeyStore";

// Expo SecureStore only allows [A-Za-z0-9._-] in keys; AuthSessionManager
// builds keys like "auth_store:session_id", so sanitize the ":" separator.
const sanitizeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_");

export default class KeyStoreAdapter implements IStorageAdapter {
  constructor(
    private keyStore: KeyStore,
    private storageKeyPrefix: string
  ) {
    if (!storageKeyPrefix) throw new Error("storageKeyPrefix is required");
  }

  async get(key: string): Promise<string | null> {
    return (await this.keyStore.get(this.getStorageKey(key))) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.keyStore.set(this.getStorageKey(key), value);
  }

  async remove(key: string): Promise<void> {
    await this.keyStore.remove(this.getStorageKey(key));
  }

  private getStorageKey(key: string): string {
    // Prefix before sanitizing so every native alias is scoped and the final
    // key remains valid for both Expo SecureStore and EncryptedStorage.
    return sanitizeKey(`${this.storageKeyPrefix}:${key}`);
  }
}
