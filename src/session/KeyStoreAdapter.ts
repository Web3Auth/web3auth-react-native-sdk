import type { IStorageAdapter } from "@toruslabs/session-manager";

import KeyStore from "./KeyStore";

// Expo SecureStore only allows [A-Za-z0-9._-] in keys; AuthSessionManager
// builds keys like "auth_store:session_id", so sanitize the ":" separator.
const sanitizeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_");

export default class KeyStoreAdapter implements IStorageAdapter {
  constructor(private keyStore: KeyStore) {}

  async get(key: string): Promise<string | null> {
    return (await this.keyStore.get(sanitizeKey(key))) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.keyStore.set(sanitizeKey(key), value);
  }

  async remove(key: string): Promise<void> {
    await this.keyStore.remove(sanitizeKey(key));
  }
}
