import { describe, expect, it } from "vitest";

import { deriveStorageNamespace, hasSessionClientIdMismatch, isStoredClientIdValid } from "./storageScope";

const baseConfig = {
  redirectUrl: "com.example.app://auth/callback?temporary=true#result",
  clientId: "client-a",
  network: "sapphire_mainnet",
  buildEnv: "production",
  sessionScope: "auth_store",
};

describe("deriveStorageNamespace", () => {
  it("is stable and strips transient redirect URL parameters", () => {
    const first = deriveStorageNamespace(baseConfig);
    const second = deriveStorageNamespace({
      ...baseConfig,
      redirectUrl: "com.example.app://auth/callback?another=value#different",
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^web3auth_[a-f0-9]{64}$/);
  });

  it.each([
    ["application identity", { redirectUrl: "com.other.app://auth/callback" }],
    ["client ID", { clientId: "client-b" }],
    ["network", { network: "sapphire_devnet" }],
    ["build environment", { buildEnv: "staging" }],
    ["session scope", { sessionScope: "account-b" }],
  ])("changes when %s changes", (_label, override) => {
    expect(deriveStorageNamespace({ ...baseConfig, ...override })).not.toBe(deriveStorageNamespace(baseConfig));
  });
});

describe("session client binding", () => {
  it("requires an exact locally stored client ID", () => {
    expect(isStoredClientIdValid("client-a", "client-a")).toBe(true);
    expect(isStoredClientIdValid("client-b", "client-a")).toBe(false);
    expect(isStoredClientIdValid(null, "client-a")).toBe(false);
  });

  it("rejects server session data explicitly bound to another client ID", () => {
    expect(hasSessionClientIdMismatch({ web3AuthClientId: "client-b" }, "client-a")).toBe(true);
    expect(hasSessionClientIdMismatch({ web3AuthClientId: "client-a" }, "client-a")).toBe(false);
    expect(hasSessionClientIdMismatch({}, "client-a")).toBe(false);
  });
});
