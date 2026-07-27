import { createStorage, disconnect, getConnections } from "@wagmi/core";
import { CHAIN_NAMESPACES, type CustomChainConfig } from "@web3auth/no-modal";
import { EventEmitter } from "events";
import { describe, expect, it, vi } from "vitest";

import { createWeb3AuthWagmiConfig } from "./config";
import { WEB3AUTH_CONNECTOR_ID } from "./connector";
import { type DisconnectOrigin, WEB3AUTH_CONNECTOR_NAME, WEB3AUTH_CONNECTOR_TYPE } from "./constants";
import { awaitWagmiStorageHydration } from "./storage";
import { createWagmiBridgeController } from "./sync";

class FakeProvider extends EventEmitter {
  accounts = ["0x1111111111111111111111111111111111111111"];

  chainId = "0x1";

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

describe("createWeb3AuthWagmiConfig storage hydration", () => {
  it("keeps the live connector after delayed AsyncStorage hydration", async () => {
    let resolveRead: (() => void) | undefined;
    const readBarrier = new Promise<void>((resolve) => {
      resolveRead = resolve;
    });

    const memory = new Map<string, string>();
    memory.set(
      "wagmi.store",
      JSON.stringify({
        state: {
          connections: {
            __type: "Map",
            value: [
              [
                "stub-uid",
                {
                  accounts: ["0x1111111111111111111111111111111111111111"],
                  chainId: 1,
                  connector: {
                    id: WEB3AUTH_CONNECTOR_ID,
                    name: WEB3AUTH_CONNECTOR_NAME,
                    type: WEB3AUTH_CONNECTOR_TYPE,
                    uid: "stub-uid",
                  },
                },
              ],
            ],
          },
          chainId: 1,
          current: "stub-uid",
        },
        version: 3,
      })
    );

    const storage = createStorage({
      storage: {
        getItem: async (key) => {
          await readBarrier;
          return memory.get(key) ?? null;
        },
        setItem: async (key, value) => {
          memory.set(key, value);
        },
        removeItem: async (key) => {
          memory.delete(key);
        },
      },
    });

    const provider = new FakeProvider();
    const providerRef = { current: provider as never };
    const originRef = { current: null as DisconnectOrigin };

    const config = createWeb3AuthWagmiConfig({
      chains: [ethereum],
      preferredChainId: "0x1",
      configOverrides: { storage },
      getProvider: () => providerRef.current,
      getDisconnectOrigin: () => originRef.current,
      setDisconnectOrigin: (origin) => {
        originRef.current = origin;
      },
      onWagmiDisconnect: async () => undefined,
    });

    // Mimic WagmiProvider hydrate with reconnectOnMount: false.
    config.setState((state) => ({
      ...state,
      connections: new Map(),
    }));

    const bridge = createWagmiBridgeController(config, originRef);
    const syncPromise = bridge.sync({
      shouldBind: true,
      provider: provider as never,
      connectorName: "auth",
    });

    // Release delayed storage while sync is waiting on hydration, then finish bind.
    await Promise.resolve();
    resolveRead?.();
    await syncPromise;

    await vi.waitFor(() => {
      expect((config._internal.store as { persist?: { hasHydrated: () => boolean } }).persist?.hasHydrated()).toBe(true);
    });

    const connection = getConnections(config)[0];
    expect(connection?.connector.id).toBe(WEB3AUTH_CONNECTOR_ID);
    expect(typeof connection?.connector.disconnect).toBe("function");

    await expect(disconnect(config, { connector: connection!.connector })).resolves.toBeUndefined();
    expect(getConnections(config)).toHaveLength(0);
  });

  it("strips serialized connector stubs from persisted wagmi store reads", async () => {
    const memory = new Map<string, string>();
    memory.set(
      "wagmi.store",
      JSON.stringify({
        state: {
          connections: {
            __type: "Map",
            value: [
              [
                "stub-uid",
                {
                  accounts: ["0x1111111111111111111111111111111111111111"],
                  chainId: 1,
                  connector: {
                    id: WEB3AUTH_CONNECTOR_ID,
                    name: WEB3AUTH_CONNECTOR_NAME,
                    type: WEB3AUTH_CONNECTOR_TYPE,
                    uid: "stub-uid",
                  },
                },
              ],
            ],
          },
          chainId: 1,
          current: "stub-uid",
        },
        version: 3,
      })
    );

    const storage = createStorage({
      storage: {
        getItem: async (key) => memory.get(key) ?? null,
        setItem: async (key, value) => {
          memory.set(key, value);
        },
        removeItem: async (key) => {
          memory.delete(key);
        },
      },
    });

    const provider = new FakeProvider();
    const config = createWeb3AuthWagmiConfig({
      chains: [ethereum],
      preferredChainId: "0x1",
      configOverrides: { storage },
      getProvider: () => provider as never,
      getDisconnectOrigin: () => null,
      setDisconnectOrigin: () => undefined,
      onWagmiDisconnect: async () => undefined,
    });

    const persisted = (await config.storage!.getItem("store" as never)) as {
      state?: { connections?: unknown; current?: unknown; chainId?: number };
      version?: number;
    };
    expect(persisted.state?.chainId).toBe(1);
    expect(persisted.state?.connections).toBeUndefined();
    expect(persisted.state?.current).toBeUndefined();

    await awaitWagmiStorageHydration(config);
    expect(getConnections(config)).toHaveLength(0);
  });
});
