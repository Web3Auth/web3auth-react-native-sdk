import { createConfig, http } from "@wagmi/core";
import { mainnet } from "@wagmi/core/chains";
import { EventEmitter } from "events";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createWeb3AuthConnector, WEB3AUTH_CONNECTOR_ID } from "./connector";

class FakeProvider extends EventEmitter {
  accounts: string[];

  chainId: string;

  constructor(accounts: string[] = ["0x1111111111111111111111111111111111111111"], chainId = "0x1") {
    super();
    this.accounts = accounts;
    this.chainId = chainId;
  }

  async request({ method, params }: { method: string; params?: unknown[] }) {
    switch (method) {
      case "eth_accounts":
        return this.accounts;
      case "eth_requestAccounts":
        throw new Error("eth_requestAccounts should not be used");
      case "eth_chainId":
        return this.chainId;
      case "wallet_switchEthereumChain": {
        const [{ chainId }] = (params || []) as [{ chainId: string }];
        this.chainId = chainId;
        this.emit("chainChanged", chainId);
        return null;
      }
      default:
        throw new Error(`Unhandled method: ${method}`);
    }
  }
}

function createTestConfig(
  getProvider: () => FakeProvider | null,
  options?: {
    onWagmiDisconnect?: () => Promise<void>;
    getDisconnectOrigin?: () => "web3auth" | "wagmi" | null;
    setDisconnectOrigin?: (origin: "web3auth" | "wagmi" | null) => void;
  }
) {
  return createConfig({
    chains: [mainnet],
    connectors: [
      createWeb3AuthConnector({
        getProvider: () => getProvider() as never,
        onWagmiDisconnect: options?.onWagmiDisconnect,
        getDisconnectOrigin: options?.getDisconnectOrigin,
        setDisconnectOrigin: options?.setDisconnectOrigin,
      }),
    ],
    transports: {
      [mainnet.id]: http("https://rpc.ankr.com/eth"),
    },
    multiInjectedProviderDiscovery: false,
  });
}

describe("createWeb3AuthConnector", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Ensure React Native-style environments without window keep working.
    delete (globalThis as { window?: unknown }).window;
  });

  it("works without a browser window and uses eth_accounts", async () => {
    delete (globalThis as { window?: unknown }).window;
    const provider = new FakeProvider();
    const config = createTestConfig(() => provider);
    const connector = config.connectors[0];
    expect(connector?.id).toBe(WEB3AUTH_CONNECTOR_ID);

    const result = await connector!.connect({ withCapabilities: true });
    expect(result.chainId).toBe(1);
    expect(result.accounts).toEqual([{ address: "0x1111111111111111111111111111111111111111", capabilities: {} }]);
  });

  it("throws when no provider is available", async () => {
    const config = createTestConfig(() => null);
    await expect(config.connectors[0]!.getProvider()).rejects.toThrow(/Provider not found/i);
    await expect(config.connectors[0]!.connect()).rejects.toThrow(/Provider not found/i);
  });

  it("rejects empty and malformed accounts", async () => {
    const emptyProvider = new FakeProvider([]);
    const emptyConfig = createTestConfig(() => emptyProvider);
    await expect(emptyConfig.connectors[0]!.connect()).rejects.toThrow(/account/i);

    const badProvider = new FakeProvider(["not-an-address"]);
    const badConfig = createTestConfig(() => badProvider);
    await expect(badConfig.connectors[0]!.connect()).rejects.toThrow();
  });

  it("ignores non-EVM accountsChanged events and emits valid account updates", async () => {
    const provider = new FakeProvider();
    const config = createTestConfig(() => provider);
    const connector = config.connectors[0]!;
    await connector.connect();

    const changeSpy = vi.fn();
    const disconnectSpy = vi.fn();
    connector.emitter.on("change", changeSpy);
    connector.emitter.on("disconnect", disconnectSpy);

    provider.emit("accountsChanged", ["So11111111111111111111111111111111111111112"]);
    expect(changeSpy).not.toHaveBeenCalled();
    expect(disconnectSpy).not.toHaveBeenCalled();

    provider.emit("accountsChanged", ["0x2222222222222222222222222222222222222222"]);
    expect(changeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        accounts: ["0x2222222222222222222222222222222222222222"],
      })
    );

    provider.emit("accountsChanged", []);
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it("emits chain changes and supports switchChain", async () => {
    const provider = new FakeProvider();
    const config = createTestConfig(() => provider);
    const connector = config.connectors[0]!;
    await connector.connect();

    const changeSpy = vi.fn();
    connector.emitter.on("change", changeSpy);

    provider.emit("chainChanged", "0xaa36a7");
    expect(changeSpy).toHaveBeenCalledWith(expect.objectContaining({ chainId: 11_155_111 }));

    const switched = await connector.switchChain!({ chainId: 1 });
    expect(switched.id).toBe(1);
    expect(provider.chainId).toBe("0x1");
  });

  it("removes listeners from the previously bound provider on replacement", async () => {
    let current: FakeProvider | null = new FakeProvider();
    const first = current;
    const config = createTestConfig(() => current);
    const connector = config.connectors[0]!;
    await connector.connect();

    current = new FakeProvider(["0x3333333333333333333333333333333333333333"]);
    await connector.disconnect();
    await connector.connect();

    const changeSpy = vi.fn();
    connector.emitter.on("change", changeSpy);
    first!.emit("accountsChanged", ["0x4444444444444444444444444444444444444444"]);
    expect(changeSpy).not.toHaveBeenCalled();
  });

  it("skips Web3Auth logout when disconnect originates from Web3Auth", async () => {
    const onWagmiDisconnect = vi.fn(async () => undefined);
    const provider = new FakeProvider();
    const config = createTestConfig(() => provider, {
      onWagmiDisconnect,
      getDisconnectOrigin: () => "web3auth",
    });
    const connector = config.connectors[0]!;
    await connector.connect();
    await connector.disconnect();
    expect(onWagmiDisconnect).not.toHaveBeenCalled();
  });

  it("awaits Web3Auth logout for wagmi-originated disconnect", async () => {
    const onWagmiDisconnect = vi.fn(async () => undefined);
    const provider = new FakeProvider();
    const config = createTestConfig(() => provider, {
      onWagmiDisconnect,
      getDisconnectOrigin: () => null,
    });
    const connector = config.connectors[0]!;
    await connector.connect();
    await connector.disconnect();
    expect(onWagmiDisconnect).toHaveBeenCalledTimes(1);
  });

  it("reports unauthorized when provider is missing or empty", async () => {
    const missingConfig = createTestConfig(() => null);
    await expect(missingConfig.connectors[0]!.isAuthorized()).resolves.toBe(false);

    const emptyConfig = createTestConfig(() => new FakeProvider([]));
    await expect(emptyConfig.connectors[0]!.isAuthorized()).resolves.toBe(false);
  });
});
