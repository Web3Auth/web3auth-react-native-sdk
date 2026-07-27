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

function createFakeWallet(addresses: string[]) {
  return {
    accounts: addresses.map((address) => ({ address })),
  };
}

describe("useSolanaWallet", () => {
  afterEach(() => {
    vi.clearAllMocks();
    useWeb3AuthMock.mockReset();
  });

  it("returns accounts and rpc for a connected Solana session", async () => {
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
          currentChainNamespace: CHAIN_NAMESPACES.SOLANA,
          currentChain: {
            chainNamespace: CHAIN_NAMESPACES.SOLANA,
            chainId: "0x67",
            rpcTarget: "https://api.devnet.solana.com",
          },
        } as never,
      })
    );

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
});
