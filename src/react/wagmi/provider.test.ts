import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CHAIN_NAMESPACES, type CustomChainConfig } from "@web3auth/no-modal";
import { EventEmitter } from "events";
import { createElement, useEffect, useState } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAccount, useConfig } from "wagmi";

import type { IUseWeb3Auth } from "../hooks/useWeb3Auth";

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

const useWeb3AuthMock = vi.hoisted(() => vi.fn());

vi.mock("../hooks/useWeb3Auth", () => ({
  useWeb3Auth: () => useWeb3AuthMock(),
}));

import { WagmiProvider } from "./provider";

function createFakeWeb3Auth(provider: FakeProvider | null, connected: boolean) {
  return {
    configuredChains: [ethereum],
    currentChainId: "0x1",
    connected,
    setAnalyticsProperties: vi.fn(),
    logout: vi.fn(async () => undefined),
    connection: provider
      ? {
          ethereumProvider: provider,
          solanaWallet: null as null,
          connectorName: "auth",
          connectorNamespace: CHAIN_NAMESPACES.EIP155,
        }
      : null,
  };
}

type ProbeState = { address: string | undefined; status: string; connectorCount: number };

function AccountProbe({ onState }: { onState: (state: ProbeState) => void }): null {
  const account = useAccount();
  const config = useConfig();
  useEffect(() => {
    onState({
      address: account.address,
      status: account.status,
      connectorCount: config.connectors.length,
    });
  }, [account.address, account.status, config.connectors.length, onState]);
  return null;
}

describe("WagmiProvider", () => {
  afterEach(() => {
    vi.clearAllMocks();
    useWeb3AuthMock.mockReset();
  });

  it("binds a connected EVM Web3Auth session into wagmi", async () => {
    const provider = new FakeProvider();
    const web3Auth = createFakeWeb3Auth(provider, true);
    useWeb3AuthMock.mockImplementation(
      (): Partial<IUseWeb3Auth> => ({
        web3Auth: web3Auth as never,
        isInitialized: true,
        isConnected: true,
        connection: web3Auth.connection as never,
        isInitializing: false,
        initError: null,
        isAuthorized: true,
        accessToken: null,
      })
    );

    const queryClient = new QueryClient();
    let latest = { address: undefined as string | undefined, status: "", connectorCount: 0 };

    await act(async () => {
      TestRenderer.create(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(
            WagmiProvider,
            null,
            createElement(AccountProbe, {
              onState: (state) => {
                latest = state;
              },
            })
          )
        )
      );
    });

    await vi.waitFor(() => {
      expect(latest.status).toBe("connected");
      expect(latest.address).toBe("0x1111111111111111111111111111111111111111");
      expect(latest.connectorCount).toBe(1);
    });
    expect(web3Auth.setAnalyticsProperties).toHaveBeenCalledWith({ wagmi_enabled: true });
  });

  it("does not bind when there is no ethereum provider", async () => {
    const web3Auth = createFakeWeb3Auth(null, true);
    useWeb3AuthMock.mockImplementation(
      (): Partial<IUseWeb3Auth> => ({
        web3Auth: web3Auth as never,
        isInitialized: true,
        isConnected: true,
        connection: {
          ethereumProvider: null,
          solanaWallet: {} as never,
          connectorName: "auth",
          connectorNamespace: CHAIN_NAMESPACES.SOLANA,
        } as never,
        isInitializing: false,
        initError: null,
        isAuthorized: true,
        accessToken: null,
      })
    );

    const queryClient = new QueryClient();
    let latest = { address: undefined as string | undefined, status: "", connectorCount: 0 };

    await act(async () => {
      TestRenderer.create(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(
            WagmiProvider,
            null,
            createElement(AccountProbe, {
              onState: (state) => {
                latest = state;
              },
            })
          )
        )
      );
    });

    await vi.waitFor(() => {
      expect(latest.connectorCount).toBe(1);
    });
    expect(latest.status).not.toBe("connected");
  });

  it("uses a placeholder config before initialization", async () => {
    useWeb3AuthMock.mockImplementation(
      (): Partial<IUseWeb3Auth> => ({
        web3Auth: null,
        isInitialized: false,
        isConnected: false,
        connection: null,
        isInitializing: true,
        initError: null,
        isAuthorized: false,
        accessToken: null,
      })
    );

    const queryClient = new QueryClient();
    let connectorCount = -1;

    function Probe() {
      const config = useConfig();
      const [count, setCount] = useState(config.connectors.length);
      useEffect(() => {
        setCount(config.connectors.length);
        connectorCount = config.connectors.length;
      }, [config.connectors.length]);
      return createElement("span", null, String(count));
    }

    await act(async () => {
      TestRenderer.create(createElement(QueryClientProvider, { client: queryClient }, createElement(WagmiProvider, null, createElement(Probe))));
    });

    expect(connectorCount).toBe(0);
  });
});
