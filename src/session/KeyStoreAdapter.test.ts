import { describe, expect, it, vi } from "vitest";

import KeyStore from "./KeyStore";
import KeyStoreAdapter from "./KeyStoreAdapter";

const createKeyStore = () =>
  ({
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  }) as unknown as KeyStore;

describe("KeyStoreAdapter", () => {
  it("prefixes aliases before native-key sanitization", async () => {
    const keyStore = createKeyStore();
    const adapter = new KeyStoreAdapter(keyStore, "web3auth:app/project");

    await adapter.set("auth_store:session_id", "session");
    await adapter.get("auth_store:session_id");
    await adapter.remove("auth_store:session_id");

    const expectedKey = "web3auth_app_project_auth_store_session_id";
    expect(keyStore.set).toHaveBeenCalledWith(expectedKey, "session");
    expect(keyStore.get).toHaveBeenCalledWith(expectedKey);
    expect(keyStore.remove).toHaveBeenCalledWith(expectedKey);
  });

  it("isolates identical aliases in different namespaces", async () => {
    const keyStore = createKeyStore();
    const firstProject = new KeyStoreAdapter(keyStore, "web3auth_project_a");
    const secondProject = new KeyStoreAdapter(keyStore, "web3auth_project_b");

    await firstProject.set("auth_store:session_id", "a");
    await secondProject.set("auth_store:session_id", "b");

    expect(keyStore.set).toHaveBeenNthCalledWith(1, "web3auth_project_a_auth_store_session_id", "a");
    expect(keyStore.set).toHaveBeenNthCalledWith(2, "web3auth_project_b_auth_store_session_id", "b");
  });

  it("rejects an empty namespace", () => {
    expect(() => new KeyStoreAdapter(createKeyStore(), "")).toThrow("storageKeyPrefix is required");
  });
});
