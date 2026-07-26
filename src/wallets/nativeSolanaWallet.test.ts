import { createKeyPairFromBytes, signBytes } from "@solana/keys";
import {
  blockhash,
  compileTransaction,
  createTransactionMessage,
  getAddressFromPublicKey,
  getTransactionDecoder,
  getTransactionEncoder,
  partiallySignTransaction,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import { SolanaSignAndSendTransaction, SolanaSignMessage, SolanaSignTransaction } from "@solana/wallet-standard-features";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";
import { getED25519Key } from "@web3auth/auth";
import { CHAIN_NAMESPACES, type CustomChainConfig } from "@web3auth/no-modal";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createNativeSolanaWallet, NativeSolanaWallet } from "./nativeSolanaWallet";

const DETERMINISTIC_SEED = "0x1111111111111111111111111111111111111111111111111111111111111111";

const solanaMainnetConfig: CustomChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  chainId: "0x65",
  rpcTarget: "https://api.mainnet-beta.solana.com",
  displayName: "Solana Mainnet",
  ticker: "SOL",
  tickerName: "Solana",
  decimals: 9,
  blockExplorerUrl: "https://explorer.solana.com",
  logo: "https://images.web3auth.io/solana.svg",
};

async function buildUnsignedTransactionBytes(privateKey: string): Promise<Uint8Array> {
  const { sk } = getED25519Key(privateKey);
  const keyPair = await createKeyPairFromBytes(new Uint8Array(sk));
  const address = await getAddressFromPublicKey(keyPair.publicKey);
  const message = setTransactionMessageLifetimeUsingBlockhash(
    {
      blockhash: blockhash("EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N"),
      lastValidBlockHeight: 100n,
    },
    setTransactionMessageFeePayer(address, createTransactionMessage({ version: 0 }))
  );
  return new Uint8Array(getTransactionEncoder().encode(compileTransaction(message)));
}

describe("NativeSolanaWallet", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads a single account with the derived address and public key", async () => {
    const { sk, pk } = getED25519Key(DETERMINISTIC_SEED);
    const keyPair = await createKeyPairFromBytes(new Uint8Array(sk));
    const expectedAddress = await getAddressFromPublicKey(keyPair.publicKey);

    const wallet = await createNativeSolanaWallet({
      privateKey: DETERMINISTIC_SEED,
      solanaChainConfigs: [solanaMainnetConfig],
      getRpcUrl: () => solanaMainnetConfig.rpcTarget,
    });

    expect(wallet.accounts).toHaveLength(1);
    expect(wallet.accounts[0]?.address).toBe(expectedAddress);
    expect(wallet.accounts[0]?.publicKey).toEqual(new Uint8Array(pk));
    expect(wallet.chains).toContain("solana:mainnet");
  });

  it("signs messages with the local ed25519 key", async () => {
    const wallet = await createNativeSolanaWallet({
      privateKey: DETERMINISTIC_SEED,
      solanaChainConfigs: [solanaMainnetConfig],
      getRpcUrl: () => solanaMainnetConfig.rpcTarget,
    });

    const message = new TextEncoder().encode("hello web3auth");
    const [result] = await wallet.features[SolanaSignMessage].signMessage({
      account: wallet.accounts[0]!,
      message,
    });

    const { sk } = getED25519Key(DETERMINISTIC_SEED);
    const keyPair = await createKeyPairFromBytes(new Uint8Array(sk));
    const expected = await signBytes(keyPair.privateKey, message);

    expect(result.signedMessage).toEqual(message);
    expect(result.signature).toEqual(new Uint8Array(expected));
  });

  it("rejects signMessage for an unknown account", async () => {
    const wallet = await createNativeSolanaWallet({
      privateKey: DETERMINISTIC_SEED,
      solanaChainConfigs: [solanaMainnetConfig],
      getRpcUrl: () => solanaMainnetConfig.rpcTarget,
    });

    await expect(
      wallet.features[SolanaSignMessage].signMessage({
        account: {
          ...wallet.accounts[0]!,
          address: "DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy",
        },
        message: new Uint8Array([1, 2, 3]),
      })
    ).rejects.toThrow("Account not found in wallet.");
  });

  it("emits account changes on disconnect and requires reconnect", async () => {
    const wallet = new NativeSolanaWallet({
      privateKey: DETERMINISTIC_SEED,
      solanaChainConfigs: [solanaMainnetConfig],
      getRpcUrl: () => solanaMainnetConfig.rpcTarget,
    });

    const changes: number[] = [];
    wallet.features[StandardEvents].on("change", ({ accounts }) => {
      changes.push(accounts?.length ?? -1);
    });

    await wallet.features[StandardConnect].connect();
    expect(wallet.accounts).toHaveLength(1);

    await wallet.features[StandardDisconnect].disconnect();
    expect(wallet.accounts).toHaveLength(0);
    expect(changes).toEqual([1, 0]);
  });

  it("signs and sends transactions through the configured RPC URL", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ result: "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const wallet = await createNativeSolanaWallet({
      privateKey: DETERMINISTIC_SEED,
      solanaChainConfigs: [solanaMainnetConfig],
      getRpcUrl: () => "https://example-solana-rpc.test",
    });

    const unsignedBytes = await buildUnsignedTransactionBytes(DETERMINISTIC_SEED);

    const [sendResult] = await wallet.features[SolanaSignAndSendTransaction].signAndSendTransaction({
      account: wallet.accounts[0]!,
      transaction: unsignedBytes,
      chain: "solana:mainnet",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [fetchUrl] = fetchMock.mock.calls[0] as unknown as [string];
    expect(fetchUrl).toBe("https://example-solana-rpc.test");
    expect(sendResult.signature.byteLength).toBeGreaterThan(0);

    const [signResult] = await wallet.features[SolanaSignTransaction].signTransaction({
      account: wallet.accounts[0]!,
      transaction: unsignedBytes,
      chain: "solana:mainnet",
    });
    expect(signResult.signedTransaction.byteLength).toBeGreaterThan(0);

    const { sk } = getED25519Key(DETERMINISTIC_SEED);
    const keyPair = await createKeyPairFromBytes(new Uint8Array(sk));
    const address = await getAddressFromPublicKey(keyPair.publicKey);
    const decoded = getTransactionDecoder().decode(signResult.signedTransaction);
    const resign = await partiallySignTransaction([keyPair], decoded);
    expect(Object.keys(resign.signatures)).toContain(address);
  });

  it("throws when transaction bytes are empty", async () => {
    const wallet = await createNativeSolanaWallet({
      privateKey: DETERMINISTIC_SEED,
      solanaChainConfigs: [solanaMainnetConfig],
      getRpcUrl: () => solanaMainnetConfig.rpcTarget,
    });

    await expect(
      wallet.features[SolanaSignTransaction].signTransaction({
        account: wallet.accounts[0]!,
        transaction: new Uint8Array(),
        chain: "solana:mainnet",
      })
    ).rejects.toThrow("Transaction bytes are required.");
  });

  it("throws when RPC URL is missing for signAndSendTransaction", async () => {
    const wallet = await createNativeSolanaWallet({
      privateKey: DETERMINISTIC_SEED,
      solanaChainConfigs: [solanaMainnetConfig],
      getRpcUrl: () => undefined,
    });

    const unsignedBytes = await buildUnsignedTransactionBytes(DETERMINISTIC_SEED);

    await expect(
      wallet.features[SolanaSignAndSendTransaction].signAndSendTransaction({
        account: wallet.accounts[0]!,
        transaction: unsignedBytes,
        chain: "solana:mainnet",
      })
    ).rejects.toThrow("Solana RPC URL is not configured for the current chain.");
  });
});
