import { CHAIN_NAMESPACES, WALLET_CONNECTORS } from "@web3auth/no-modal";
import { createElement, useEffect } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IUseWeb3Auth } from "../hooks/useWeb3Auth";

const useWeb3AuthMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());
const createWalletStandardConnectorMock = vi.hoisted(() => vi.fn());
const connectWalletMock = vi.hoisted(() => vi.fn());
const destroyMock = vi.hoisted(() => vi.fn());
const solanaProviderBaseMock = vi.hoisted(() => vi.fn(({ children }: { children?: unknown }) => children ?? null));

vi.mock("../hooks/useWeb3Auth", () => ({
  useWeb3Auth: () => useWeb3AuthMock(),
}));

vi.mock("@solana/client", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
  createWalletStandardConnector: (...args: unknown[]) => createWalletStandardConnectorMock(...args),
}));

vi.mock("@solana/react-hooks", () => ({
  SolanaProvider: (props: Record<string, unknown>) => solanaProviderBaseMock(props),
}));

import { SolanaProvider } from "./provider";

const solanaDevnet = {
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  chainId: "0x67",
  rpcTarget: "https://api.devnet.solana.com",
  wsTarget: "wss://api.devnet.solana.com",
  displayName: "Solana Devnet",
  ticker: "SOL",
  tickerName: "Solana",
  decimals: 9,
  blockExplorerUrl: "https://explorer.solana.com/?cluster=devnet",
  logo: "https://images.web3auth.io/solana.svg",
};

function createFakeClient(id: string) {
  return {
    id,
    destroy: () => destroyMock(id),
    actions: {
      connectWallet: connectWalletMock,
    },
  };
}

function createFakeWeb3Auth(overrides: {
  connected?: boolean;
  initialized?: boolean;
  solanaWallet?: object | null;
  currentChain?: typeof solanaDevnet | null;
  currentChainNamespace?: string;
}) {
  const solanaWallet =
    overrides.solanaWallet === undefined ? { accounts: [{ address: "So11111111111111111111111111111111111111112" }] } : overrides.solanaWallet;
  const currentChain = overrides.currentChain === undefined ? solanaDevnet : overrides.currentChain;
  const currentChainNamespace = overrides.currentChainNamespace ?? currentChain?.chainNamespace ?? CHAIN_NAMESPACES.SOLANA;
  return {
    configuredChains: [solanaDevnet],
    currentChain,
    currentChainId: currentChain?.chainId ?? null,
    currentChainNamespace,
    setAnalyticsProperties: vi.fn(),
    connection:
      overrides.connected === false || !solanaWallet
        ? null
        : {
            ethereumProvider: null,
            solanaWallet,
            connectorName: WALLET_CONNECTORS.AUTH,
            connectorNamespace: CHAIN_NAMESPACES.SOLANA,
          },
  };
}

type ProbeState = { walletPersistence: unknown; clientId: string | undefined };

function ClientProbe({ onState }: { onState: (state: ProbeState) => void }): null {
  useEffect(() => {
    const lastCall = solanaProviderBaseMock.mock.calls.at(-1)?.[0] as { walletPersistence?: unknown; client?: { id?: string } } | undefined;
    onState({
      walletPersistence: lastCall?.walletPersistence,
      clientId: lastCall?.client?.id,
    });
  });
  return null;
}

describe("SolanaProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWeb3AuthMock.mockReset();
    createClientMock.mockReset();
    createWalletStandardConnectorMock.mockReset();
    connectWalletMock.mockReset();
    destroyMock.mockReset();
    solanaProviderBaseMock.mockClear();

    let counter = 0;
    createClientMock.mockImplementation(() => createFakeClient(`client-${++counter}`));
    createWalletStandardConnectorMock.mockReturnValue({ id: "wallet-standard:auth" });
    connectWalletMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses a placeholder client before initialization", async () => {
    useWeb3AuthMock.mockImplementation(
      (): Partial<IUseWeb3Auth> => ({
        web3Auth: null,
        isInitialized: false,
        isConnected: false,
        connection: null,
      })
    );

    let latest: ProbeState = { walletPersistence: undefined, clientId: undefined };
    await act(async () => {
      TestRenderer.create(
        createElement(
          SolanaProvider,
          null,
          createElement(ClientProbe, {
            onState: (state) => {
              latest = state;
            },
          })
        )
      );
    });

    expect(createClientMock).toHaveBeenCalled();
    expect(createClientMock.mock.calls[0]?.[0]).toMatchObject({
      endpoint: "https://api.devnet.solana.com",
      walletConnectors: [],
    });
    expect(latest.walletPersistence).toBe(false);
    expect(latest.clientId).toBeDefined();
  });

  it("wires a connected Solana wallet and sets analytics", async () => {
    const web3Auth = createFakeWeb3Auth({});
    useWeb3AuthMock.mockImplementation(
      (): Partial<IUseWeb3Auth> => ({
        web3Auth: web3Auth as never,
        isInitialized: true,
        isConnected: true,
        connection: web3Auth.connection as never,
      })
    );

    await act(async () => {
      TestRenderer.create(createElement(SolanaProvider, null, createElement(ClientProbe, { onState: () => undefined })));
    });

    await vi.waitFor(() => {
      expect(createWalletStandardConnectorMock).toHaveBeenCalled();
      expect(connectWalletMock).toHaveBeenCalledWith("wallet-standard:auth", { autoConnect: true });
    });
    expect(createWalletStandardConnectorMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: "wallet-standard:auth",
        name: WALLET_CONNECTORS.AUTH,
        defaultChain: "solana:devnet",
      })
    );
    expect(web3Auth.setAnalyticsProperties).toHaveBeenCalledWith({ solana_framework_kit_enabled: true });
    expect(createClientMock.mock.calls.some((call) => (call[0] as { walletConnectors: unknown[] }).walletConnectors.length === 1)).toBe(true);
  });

  it("passes the current Solana CAIP chain as connector defaultChain", async () => {
    const solanaMainnet = {
      ...solanaDevnet,
      chainId: "0x65",
      rpcTarget: "https://api.mainnet-beta.solana.com",
      wsTarget: "wss://api.mainnet-beta.solana.com",
      displayName: "Solana Mainnet",
      blockExplorerUrl: "https://explorer.solana.com",
    };
    const web3Auth = createFakeWeb3Auth({ currentChain: solanaMainnet });
    web3Auth.configuredChains = [solanaDevnet, solanaMainnet];
    useWeb3AuthMock.mockImplementation(
      (): Partial<IUseWeb3Auth> => ({
        web3Auth: web3Auth as never,
        isInitialized: true,
        isConnected: true,
        connection: web3Auth.connection as never,
      })
    );

    await act(async () => {
      TestRenderer.create(createElement(SolanaProvider, null, null));
    });

    await vi.waitFor(() => {
      expect(createWalletStandardConnectorMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          defaultChain: "solana:mainnet",
        })
      );
    });
  });

  it("falls back to a placeholder when connectWallet fails", async () => {
    const web3Auth = createFakeWeb3Auth({});
    useWeb3AuthMock.mockImplementation(
      (): Partial<IUseWeb3Auth> => ({
        web3Auth: web3Auth as never,
        isInitialized: true,
        isConnected: true,
        connection: web3Auth.connection as never,
      })
    );
    connectWalletMock.mockRejectedValueOnce(new Error("connect failed"));

    await act(async () => {
      TestRenderer.create(createElement(SolanaProvider, null, createElement(ClientProbe, { onState: () => undefined })));
    });

    await vi.waitFor(() => {
      expect(createClientMock.mock.calls.length).toBeGreaterThan(1);
    });
    const lastConfig = createClientMock.mock.calls.at(-1)?.[0] as { walletConnectors: unknown[] };
    expect(lastConfig.walletConnectors).toEqual([]);
  });

  it("disposes the active client on unmount without double destroy", async () => {
    useWeb3AuthMock.mockImplementation(
      (): Partial<IUseWeb3Auth> => ({
        web3Auth: null,
        isInitialized: false,
        isConnected: false,
        connection: null,
      })
    );

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SolanaProvider, null, null));
    });

    const initialClientId = (createClientMock.mock.results[0]?.value as { id: string }).id;

    await act(async () => {
      renderer!.unmount();
    });

    expect(destroyMock).toHaveBeenCalledWith(initialClientId);
    expect(destroyMock.mock.calls.filter((call) => call[0] === initialClientId)).toHaveLength(1);
  });

  it("disposes superseded clients when reconnecting", async () => {
    const walletA = { accounts: [{ address: "A111111111111111111111111111111111111111111" }] };
    const walletB = { accounts: [{ address: "B111111111111111111111111111111111111111111" }] };
    const web3AuthA = createFakeWeb3Auth({ solanaWallet: walletA });
    useWeb3AuthMock.mockImplementation(
      (): Partial<IUseWeb3Auth> => ({
        web3Auth: web3AuthA as never,
        isInitialized: true,
        isConnected: true,
        connection: web3AuthA.connection as never,
      })
    );

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SolanaProvider, null, null));
    });

    await vi.waitFor(() => {
      expect(connectWalletMock).toHaveBeenCalled();
    });

    const wiredClientIds = createClientMock.mock.results
      .map((result) => (result.value as { id: string }).id)
      .filter((id, index) => {
        const config = createClientMock.mock.calls[index]?.[0] as { walletConnectors: unknown[] };
        return config.walletConnectors.length > 0;
      });
    expect(wiredClientIds.length).toBeGreaterThan(0);
    const firstWired = wiredClientIds[0]!;

    const web3AuthB = createFakeWeb3Auth({ solanaWallet: walletB });
    useWeb3AuthMock.mockImplementation(
      (): Partial<IUseWeb3Auth> => ({
        web3Auth: web3AuthB as never,
        isInitialized: true,
        isConnected: true,
        connection: web3AuthB.connection as never,
      })
    );

    await act(async () => {
      renderer!.update(createElement(SolanaProvider, null, null));
    });

    await vi.waitFor(() => {
      expect(destroyMock).toHaveBeenCalledWith(firstWired);
    });
  });
});
