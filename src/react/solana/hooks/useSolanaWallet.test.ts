import { StandardEvents, type StandardEventsListeners } from "@wallet-standard/features";
import { CHAIN_NAMESPACES } from "@web3auth/no-modal";
import { createElement, useEffect } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { IUseWeb3Auth } from "../../hooks/useWeb3Auth";

const useWeb3AuthMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/useWeb3Auth", () => ({
  useWeb3Auth: () => useWeb3AuthMock(),
}));

import { useSolanaWallet } from "./useSolanaWallet";

type ProbeState = {
  accounts: string[] | null;
  hasWallet: boolean;
  hasRpc: boolean;
};

function Probe({ onState }: { onState: (state: ProbeState) => void }): null {
  const { accounts, solanaWallet, rpc } = useSolanaWallet();
  useEffect(() => {
    onState({
      accounts,
      hasWallet: Boolean(solanaWallet),
      hasRpc: Boolean(rpc),
    });
  }, [accounts, solanaWallet, rpc, onState]);
  return null;
}

type FakeWallet = {
  accounts: { address: string }[];
  features: {
    [StandardEvents]: {
      version: "1.0.0";
      on: <E extends keyof StandardEventsListeners>(event: E, listener: StandardEventsListeners[E]) => () => void;
    };
  };
  setAccounts: (addresses: string[]) => void;
};

function createFakeWallet(addresses: string[]): FakeWallet {
  const changeListeners = new Set<StandardEventsListeners["change"]>();
  const wallet: FakeWallet = {
    accounts: addresses.map((address) => ({ address })),
    features: {
      [StandardEvents]: {
        version: "1.0.0",
        on: (event, listener) => {
          if (event === "change") {
            changeListeners.add(listener as StandardEventsListeners["change"]);
          }
          return () => {
            changeListeners.delete(listener as StandardEventsListeners["change"]);
          };
        },
      },
    },
    setAccounts(nextAddresses) {
      wallet.accounts = nextAddresses.map((address) => ({ address }));
      changeListeners.forEach((listener) => {
        listener({ accounts: wallet.accounts as never });
      });
    },
  };
  return wallet;
}

function mockSolanaSession(wallet: FakeWallet | ReturnType<typeof createFakeWallet>) {
  useWeb3AuthMock.mockImplementation(
    (): Partial<IUseWeb3Auth> => ({
      connection: {
        solanaWallet: wallet as never,
        ethereumProvider: null,
        connectorName: "auth",
        connectorNamespace: CHAIN_NAMESPACES.SOLANA,
      } as never,
      web3Auth: {
        currentChainNamespace: CHAIN_NAMESPACES.SOLANA,
        currentChain: {
          chainNamespace: CHAIN_NAMESPACES.SOLANA,
          chainId: "0x67",
          rpcTarget: "https://api.devnet.solana.com",
        },
      } as never,
    })
  );
}

describe("useSolanaWallet", () => {
  afterEach(() => {
    vi.clearAllMocks();
    useWeb3AuthMock.mockReset();
  });

  it("returns accounts and rpc for a connected Solana session", async () => {
    const wallet = createFakeWallet(["So11111111111111111111111111111111111111112"]);
    mockSolanaSession(wallet);

    let latest: ProbeState = { accounts: null, hasWallet: false, hasRpc: false };
    await act(async () => {
      TestRenderer.create(
        createElement(Probe, {
          onState: (state) => {
            latest = state;
          },
        })
      );
    });

    expect(latest.accounts).toEqual(["So11111111111111111111111111111111111111112"]);
    expect(latest.hasWallet).toBe(true);
    expect(latest.hasRpc).toBe(true);
  });

  it("returns null accounts and rpc when not on Solana", async () => {
    const wallet = createFakeWallet(["So11111111111111111111111111111111111111112"]);
    useWeb3AuthMock.mockImplementation(
      (): Partial<IUseWeb3Auth> => ({
        connection: {
          solanaWallet: wallet as never,
          ethereumProvider: null,
          connectorName: "auth",
          connectorNamespace: CHAIN_NAMESPACES.SOLANA,
        } as never,
        web3Auth: {
          currentChainNamespace: CHAIN_NAMESPACES.EIP155,
          currentChain: {
            chainNamespace: CHAIN_NAMESPACES.EIP155,
            chainId: "0x1",
            rpcTarget: "https://rpc.ankr.com/eth",
          },
        } as never,
      })
    );

    let latest: ProbeState = { accounts: ["x"], hasWallet: false, hasRpc: true };
    await act(async () => {
      TestRenderer.create(
        createElement(Probe, {
          onState: (state) => {
            latest = state;
          },
        })
      );
    });

    expect(latest.accounts).toBeNull();
    expect(latest.hasWallet).toBe(true);
    expect(latest.hasRpc).toBe(false);
  });

  it("returns nulls when disconnected", async () => {
    useWeb3AuthMock.mockImplementation(
      (): Partial<IUseWeb3Auth> => ({
        connection: null,
        web3Auth: {
          currentChainNamespace: CHAIN_NAMESPACES.SOLANA,
          currentChain: {
            chainNamespace: CHAIN_NAMESPACES.SOLANA,
            chainId: "0x67",
            rpcTarget: "https://api.devnet.solana.com",
          },
        } as never,
      })
    );

    let latest: ProbeState = { accounts: ["x"], hasWallet: true, hasRpc: true };
    await act(async () => {
      TestRenderer.create(
        createElement(Probe, {
          onState: (state) => {
            latest = state;
          },
        })
      );
    });

    expect(latest.accounts).toBeNull();
    expect(latest.hasWallet).toBe(false);
    expect(latest.hasRpc).toBe(false);
  });

  it("updates accounts when the same wallet emits standard:events change", async () => {
    const wallet = createFakeWallet(["So11111111111111111111111111111111111111112"]);
    mockSolanaSession(wallet);

    let latest: ProbeState = { accounts: null, hasWallet: false, hasRpc: false };
    await act(async () => {
      TestRenderer.create(
        createElement(Probe, {
          onState: (state) => {
            latest = state;
          },
        })
      );
    });

    expect(latest.accounts).toEqual(["So11111111111111111111111111111111111111112"]);

    await act(async () => {
      wallet.setAccounts([]);
    });

    expect(latest.accounts).toBeNull();

    await act(async () => {
      wallet.setAccounts(["So22222222222222222222222222222222222222222"]);
    });

    expect(latest.accounts).toEqual(["So22222222222222222222222222222222222222222"]);
  });
});
