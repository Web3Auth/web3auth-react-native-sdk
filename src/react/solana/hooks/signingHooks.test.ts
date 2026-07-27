import {
  address,
  blockhash,
  compileTransaction,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import { SolanaSignAndSendTransaction } from "@solana/wallet-standard-features";
import { CHAIN_NAMESPACES, WalletInitializationError } from "@web3auth/no-modal";
import { createElement, useEffect } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { IUseWeb3Auth } from "../../hooks/useWeb3Auth";

const FEE_PAYER = address("So11111111111111111111111111111111111111112");

function buildCompiledTransaction() {
  const message = setTransactionMessageLifetimeUsingBlockhash(
    {
      blockhash: blockhash("EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N"),
      lastValidBlockHeight: 100n,
    },
    setTransactionMessageFeePayer(FEE_PAYER, createTransactionMessage({ version: 0 }))
  );
  return compileTransaction(message);
}

const useWeb3AuthMock = vi.hoisted(() => vi.fn());
const walletSignMessageMock = vi.hoisted(() => vi.fn());
const walletSignTransactionMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/useWeb3Auth", () => ({
  useWeb3Auth: () => useWeb3AuthMock(),
}));

vi.mock("@web3auth/no-modal", async () => {
  const actual = await vi.importActual<typeof import("@web3auth/no-modal")>("@web3auth/no-modal");
  return {
    ...actual,
    walletSignMessage: walletSignMessageMock,
    walletSignTransaction: walletSignTransactionMock,
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

function mockConnectedSolanaWallet(
  wallet: { accounts: { address: string }[]; chains?: string[]; features?: Record<string, unknown> } | null,
  currentChainId: "0x65" | "0x66" | "0x67" = "0x67"
) {
  const rpcByChainId = {
    "0x65": "https://api.mainnet-beta.solana.com",
    "0x66": "https://api.testnet.solana.com",
    "0x67": "https://api.devnet.solana.com",
  } as const;

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
          chainId: currentChainId,
          rpcTarget: rpcByChainId[currentChainId],
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

  it("signs and sends a transaction on the active chain, not wallet.chains[0]", async () => {
    const signAndSendTransactionMock = vi.fn().mockResolvedValue([
      {
        signature: new Uint8Array([1, 2, 3]),
      },
    ]);
    const account = { address: FEE_PAYER };
    const wallet = {
      accounts: [account],
      // mainnet is first; active chain below is deliberately devnet
      chains: ["solana:mainnet", "solana:devnet"],
      features: {
        [SolanaSignAndSendTransaction]: {
          version: "1.0.0",
          supportedTransactionVersions: ["legacy", 0],
          signAndSendTransaction: signAndSendTransactionMock,
        },
      },
    };
    mockConnectedSolanaWallet(wallet, "0x67");

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

    await act(async () => {
      await latest!.signAndSendTransaction(buildCompiledTransaction());
    });

    expect(signAndSendTransactionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        account,
        chain: "solana:devnet",
      })
    );
    expect(signAndSendTransactionMock.mock.calls[0]?.[0]?.chain).not.toBe("solana:mainnet");
    expect(latest!.error).toBeNull();
  });
});
