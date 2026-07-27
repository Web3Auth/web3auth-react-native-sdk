import { CHAIN_NAMESPACES, WalletInitializationError } from "@web3auth/no-modal";
import { createElement, useEffect } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { IUseWeb3Auth } from "../../hooks/useWeb3Auth";

const useWeb3AuthMock = vi.hoisted(() => vi.fn());
const walletSignMessageMock = vi.hoisted(() => vi.fn());
const walletSignTransactionMock = vi.hoisted(() => vi.fn());
const walletSignAndSendTransactionMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/useWeb3Auth", () => ({
  useWeb3Auth: () => useWeb3AuthMock(),
}));

vi.mock("@web3auth/no-modal", async () => {
  const actual = await vi.importActual<typeof import("@web3auth/no-modal")>("@web3auth/no-modal");
  return {
    ...actual,
    walletSignMessage: walletSignMessageMock,
    walletSignTransaction: walletSignTransactionMock,
    walletSignAndSendTransaction: walletSignAndSendTransactionMock,
  };
});

import { useSignAndSendTransaction } from "./useSignAndSendTransaction";
import { useSignMessage } from "./useSignMessage";
import { useSignTransaction } from "./useSignTransaction";

type SignMessageState = ReturnType<typeof useSignMessage>;
type SignTransactionState = ReturnType<typeof useSignTransaction>;
type SignAndSendState = ReturnType<typeof useSignAndSendTransaction>;

function SignMessageProbe({ onState }: { onState: (state: SignMessageState) => void }): null {
  const state = useSignMessage();
  useEffect(() => {
    onState(state);
  }, [state, onState]);
  return null;
}

function SignTransactionProbe({ onState }: { onState: (state: SignTransactionState) => void }): null {
  const state = useSignTransaction();
  useEffect(() => {
    onState(state);
  }, [state, onState]);
  return null;
}

function SignAndSendProbe({ onState }: { onState: (state: SignAndSendState) => void }): null {
  const state = useSignAndSendTransaction();
  useEffect(() => {
    onState(state);
  }, [state, onState]);
  return null;
}

function mockConnectedSolanaWallet(wallet: { accounts: { address: string }[] } | null) {
  useWeb3AuthMock.mockImplementation(
    (): Partial<IUseWeb3Auth> => ({
      connection: wallet
        ? ({
            solanaWallet: wallet as never,
            ethereumProvider: null,
            connectorName: "auth",
            connectorNamespace: CHAIN_NAMESPACES.SOLANA,
          } as never)
        : null,
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

describe("Solana signing hooks", () => {
  afterEach(() => {
    vi.clearAllMocks();
    useWeb3AuthMock.mockReset();
    walletSignMessageMock.mockReset();
    walletSignTransactionMock.mockReset();
    walletSignAndSendTransactionMock.mockReset();
  });

  it("signs a message and updates loading/data state", async () => {
    const wallet = { accounts: [{ address: "So11111111111111111111111111111111111111112" }] };
    mockConnectedSolanaWallet(wallet);
    walletSignMessageMock.mockResolvedValue("sig-message");

    let latest: SignMessageState | null = null;
    await act(async () => {
      TestRenderer.create(
        createElement(SignMessageProbe, {
          onState: (state) => {
            latest = state;
          },
        })
      );
    });

    let result = "";
    await act(async () => {
      result = await latest!.signMessage("hello");
    });

    expect(result).toBe("sig-message");
    expect(walletSignMessageMock).toHaveBeenCalledWith(wallet, "hello", wallet.accounts[0].address);
    expect(latest!.loading).toBe(false);
    expect(latest!.error).toBeNull();
    expect(latest!.data).toBe("sig-message");
  });

  it("rejects when wallet is unavailable and sets error", async () => {
    mockConnectedSolanaWallet(null);

    let latest: SignMessageState | null = null;
    await act(async () => {
      TestRenderer.create(
        createElement(SignMessageProbe, {
          onState: (state) => {
            latest = state;
          },
        })
      );
    });

    await act(async () => {
      await expect(latest!.signMessage("hello")).rejects.toThrow(/not ready/i);
    });

    expect(latest!.loading).toBe(false);
    expect(latest!.error).toBeInstanceOf(WalletInitializationError);
    expect(latest!.data).toBeNull();
  });

  it("signs a transaction and rethrows helper failures", async () => {
    const wallet = { accounts: [{ address: "So11111111111111111111111111111111111111112" }] };
    mockConnectedSolanaWallet(wallet);
    walletSignTransactionMock.mockResolvedValue("sig-tx");

    let latest: SignTransactionState | null = null;
    await act(async () => {
      TestRenderer.create(
        createElement(SignTransactionProbe, {
          onState: (state) => {
            latest = state;
          },
        })
      );
    });

    const fakeTx = { messageBytes: new Uint8Array([1]) } as never;
    let result = "";
    await act(async () => {
      result = await latest!.signTransaction(fakeTx);
    });
    expect(result).toBe("sig-tx");
    expect(latest!.data).toBe("sig-tx");

    const failure = new Error("sign failed");
    walletSignTransactionMock.mockRejectedValue(failure);
    await act(async () => {
      await expect(latest!.signTransaction(fakeTx)).rejects.toThrow("sign failed");
    });
    expect(latest!.error).toBe(failure);
    expect(latest!.loading).toBe(false);
  });

  it("signs and sends a transaction", async () => {
    const wallet = { accounts: [{ address: "So11111111111111111111111111111111111111112" }] };
    mockConnectedSolanaWallet(wallet);
    walletSignAndSendTransactionMock.mockResolvedValue("sig-send");

    let latest: SignAndSendState | null = null;
    await act(async () => {
      TestRenderer.create(
        createElement(SignAndSendProbe, {
          onState: (state) => {
            latest = state;
          },
        })
      );
    });

    const fakeTx = { messageBytes: new Uint8Array([1]) } as never;
    let result = "";
    await act(async () => {
      result = await latest!.signAndSendTransaction(fakeTx);
    });

    expect(result).toBe("sig-send");
    expect(walletSignAndSendTransactionMock).toHaveBeenCalledWith(wallet, fakeTx);
    expect(latest!.data).toBe("sig-send");
    expect(latest!.error).toBeNull();
  });
});
