import { connect, disconnect, getConnections, getConnectors } from "@wagmi/core";
import { CHAIN_NAMESPACES, type CustomChainConfig } from "@web3auth/no-modal";
import { EventEmitter } from "events";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createWeb3AuthWagmiConfig } from "./config";
import { WEB3AUTH_CONNECTOR_ID } from "./connector";
import { createWagmiBridgeController, type DisconnectOriginRef } from "./sync";

class FakeProvider extends EventEmitter {
  accounts: string[];

  chainId: string;

  constructor(accounts: string[] = ["0x1111111111111111111111111111111111111111"], chainId = "0x1") {
    super();
    this.accounts = accounts;
    this.chainId = chainId;
  }

  async request({ method }: { method: string }) {
    if (method === "eth_accounts") return this.accounts;
    if (method === "eth_chainId") return this.chainId;
    if (method === "eth_requestAccounts") throw new Error("eth_requestAccounts should not be used");
    throw new Error(`Unhandled method: ${method}`);
  }
}

const ethereum: CustomChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1",
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  ticker: "ETH",
  tickerName: "Ethereum",
  decimals: 18,
  blockExplorerUrl: "https://etherscan.io",
  logo: "https://images.web3auth.io/eth.svg",
};

function createBridgeFixture(provider: FakeProvider | null) {
  const originRef: DisconnectOriginRef = { current: null };
  const providerRef = { current: provider as never };
  const logout = vi.fn(async () => undefined);

  const config = createWeb3AuthWagmiConfig({
    chains: [ethereum],
    preferredChainId: "0x1",
    getProvider: () => providerRef.current,
    getDisconnectOrigin: () => originRef.current,
    setDisconnectOrigin: (origin) => {
      originRef.current = origin;
    },
    onWagmiDisconnect: () => logout(),
  });

  const bridge = createWagmiBridgeController(config, originRef);
  return { config, bridge, originRef, providerRef, logout };
}

describe("createWagmiBridgeController", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers the web3auth connector through public APIs only", () => {
    const provider = new FakeProvider();
    const { config } = createBridgeFixture(provider);
    const connectors = getConnectors(config);
    expect(connectors.some((connector) => connector.id === WEB3AUTH_CONNECTOR_ID)).toBe(true);
  });

  it("adopts an existing Web3Auth session via connect", async () => {
    const provider = new FakeProvider();
    const { config, bridge } = createBridgeFixture(provider);

    await bridge.sync({
      shouldBind: true,
      provider: provider as never,
      connectorName: "auth",
    });

    const connections = getConnections(config);
    expect(connections).toHaveLength(1);
    expect(connections[0]?.connector.id).toBe(WEB3AUTH_CONNECTOR_ID);
    expect(connections[0]?.accounts[0]).toBe("0x1111111111111111111111111111111111111111");
    expect(config.state.status).toBe("connected");
  });

  it("disconnects wagmi without logging out when Web3Auth logs out", async () => {
    const provider = new FakeProvider();
    const { config, bridge, logout } = createBridgeFixture(provider);

    await bridge.sync({
      shouldBind: true,
      provider: provider as never,
      connectorName: "auth",
    });
    await bridge.sync({
      shouldBind: false,
      provider: null,
      connectorName: null,
    });

    expect(getConnections(config)).toHaveLength(0);
    expect(config.state.status).toBe("disconnected");
    expect(logout).not.toHaveBeenCalled();
  });

  it("logs out Web3Auth once for a wagmi-originated disconnect", async () => {
    const provider = new FakeProvider();
    const { config, bridge, logout } = createBridgeFixture(provider);

    await bridge.sync({
      shouldBind: true,
      provider: provider as never,
      connectorName: "auth",
    });

    const connector = getConnections(config)[0]!.connector;
    await disconnect(config, { connector });
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("logs out on spontaneous provider disconnect events", async () => {
    const provider = new FakeProvider();
    const { bridge, logout } = createBridgeFixture(provider);
    const spontaneousLogout = vi.fn(async () => undefined);

    await bridge.sync({
      shouldBind: true,
      provider: provider as never,
      connectorName: "auth",
    });

    const stop = bridge.watchSpontaneousDisconnect(spontaneousLogout);
    provider.emit("accountsChanged", []);
    await vi.waitFor(() => {
      expect(spontaneousLogout).toHaveBeenCalledTimes(1);
    });
    expect(logout).not.toHaveBeenCalled();
    stop();
  });

  it("restores wagmi when spontaneous logout after accountsChanged:[] fails", async () => {
    const provider = new FakeProvider();
    const { config, bridge } = createBridgeFixture(provider);
    const spontaneousLogout = vi.fn(async () => {
      throw new Error("logout failed");
    });

    await bridge.sync({
      shouldBind: true,
      provider: provider as never,
      connectorName: "auth",
    });

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);

    try {
      const stop = bridge.watchSpontaneousDisconnect(spontaneousLogout);
      provider.emit("accountsChanged", []);

      await vi.waitFor(() => {
        expect(spontaneousLogout).toHaveBeenCalledTimes(1);
      });
      await vi.waitFor(() => {
        expect(getConnections(config)).toHaveLength(1);
        expect(config.state.status).toBe("connected");
      });
      // Flush rejection microtasks that would otherwise surface as unhandled.
      await Promise.resolve();
      await Promise.resolve();
      expect(unhandled).toHaveLength(0);
      stop();
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("replaces the binding when the provider identity changes", async () => {
    const first = new FakeProvider(["0x1111111111111111111111111111111111111111"]);
    const second = new FakeProvider(["0x2222222222222222222222222222222222222222"]);
    const { config, bridge, providerRef } = createBridgeFixture(first);

    await bridge.sync({
      shouldBind: true,
      provider: first as never,
      connectorName: "auth",
    });

    providerRef.current = second as never;
    await bridge.sync({
      shouldBind: true,
      provider: second as never,
      connectorName: "auth",
    });

    const connections = getConnections(config);
    expect(connections[0]?.accounts[0]).toBe("0x2222222222222222222222222222222222222222");
  });

  it("ignores stale sync work after dispose", async () => {
    const provider = new FakeProvider();
    const { config, bridge } = createBridgeFixture(provider);

    const pending = bridge.sync({
      shouldBind: true,
      provider: provider as never,
      connectorName: "auth",
    });
    const disposed = bridge.dispose();
    await pending;
    await disposed;

    expect(getConnections(config)).toHaveLength(0);
  });

  it("disconnects when dispose races with an in-flight connect", async () => {
    let resolveAccounts!: () => void;
    const accountsGate = new Promise<void>((resolve) => {
      resolveAccounts = resolve;
    });
    class GatedProvider extends FakeProvider {
      async request({ method }: { method: string }) {
        if (method === "eth_accounts") await accountsGate;
        return super.request({ method });
      }
    }

    const provider = new GatedProvider();
    const { config, bridge } = createBridgeFixture(provider);

    const pendingSync = bridge.sync({
      shouldBind: true,
      provider: provider as never,
      connectorName: "auth",
    });

    await vi.waitFor(() => {
      expect(config.state.status).toBe("connecting");
    });

    const pendingDispose = bridge.dispose();
    resolveAccounts();
    await Promise.all([pendingSync, pendingDispose]);

    expect(getConnections(config)).toHaveLength(0);
    expect(config.state.status).toBe("disconnected");
    expect(provider.listenerCount("accountsChanged")).toBe(0);
    expect(provider.listenerCount("chainChanged")).toBe(0);
    expect(provider.listenerCount("disconnect")).toBe(0);
  });

  it("removes EIP-1193 listeners and disconnects wagmi on dispose without logging out", async () => {
    const provider = new FakeProvider();
    const { config, bridge, logout } = createBridgeFixture(provider);

    await bridge.sync({
      shouldBind: true,
      provider: provider as never,
      connectorName: "auth",
    });

    expect(provider.listenerCount("accountsChanged")).toBe(1);
    expect(provider.listenerCount("chainChanged")).toBe(1);
    expect(provider.listenerCount("disconnect")).toBe(1);

    await bridge.dispose();

    expect(provider.listenerCount("accountsChanged")).toBe(0);
    expect(provider.listenerCount("chainChanged")).toBe(0);
    expect(provider.listenerCount("disconnect")).toBe(0);
    expect(getConnections(config)).toHaveLength(0);
    expect(config.state.status).toBe("disconnected");
    expect(logout).not.toHaveBeenCalled();
  });

  it("does not accumulate EIP-1193 listeners across dispose and rebind", async () => {
    const provider = new FakeProvider();
    const first = createBridgeFixture(provider);

    await first.bridge.sync({
      shouldBind: true,
      provider: provider as never,
      connectorName: "auth",
    });
    await first.bridge.dispose();

    const second = createBridgeFixture(provider);
    await second.bridge.sync({
      shouldBind: true,
      provider: provider as never,
      connectorName: "auth",
    });

    expect(provider.listenerCount("accountsChanged")).toBe(1);
    expect(provider.listenerCount("chainChanged")).toBe(1);
    expect(provider.listenerCount("disconnect")).toBe(1);
  });

  it("rejects wagmi disconnect when Web3Auth logout fails", async () => {
    const provider = new FakeProvider();
    const originRef: DisconnectOriginRef = { current: null };
    const providerRef = { current: provider as never };
    const config = createWeb3AuthWagmiConfig({
      chains: [ethereum],
      getProvider: () => providerRef.current,
      getDisconnectOrigin: () => originRef.current,
      setDisconnectOrigin: (origin) => {
        originRef.current = origin;
      },
      onWagmiDisconnect: async () => {
        throw new Error("logout failed");
      },
    });
    const bridge = createWagmiBridgeController(config, originRef);
    await bridge.sync({
      shouldBind: true,
      provider: provider as never,
      connectorName: "auth",
    });

    await expect(disconnect(config, { connector: getConnections(config)[0]!.connector })).rejects.toThrow(/logout failed/);
  });

  it("does not use private wagmi internals when connecting", async () => {
    const provider = new FakeProvider();
    const { config } = createBridgeFixture(provider);
    const connector = getConnectors(config).find((item) => item.id === WEB3AUTH_CONNECTOR_ID)!;
    await connect(config, { connector });
    expect(getConnections(config)[0]?.connector.id).toBe(WEB3AUTH_CONNECTOR_ID);
  });
});
