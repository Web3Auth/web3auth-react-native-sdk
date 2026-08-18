import { createKeyPairFromBytes, signBytes } from "@solana/keys";
import {
  getAddressFromPublicKey,
  getBase58Encoder,
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  getTransactionDecoder,
  partiallySignTransaction,
} from "@solana/kit";
import {
  SolanaSignAndSendTransaction,
  type SolanaSignAndSendTransactionFeature,
  type SolanaSignAndSendTransactionOptions,
  SolanaSignMessage,
  type SolanaSignMessageFeature,
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
  type SolanaTransactionCommitment,
} from "@solana/wallet-standard-features";
import { type IdentifierArray, type Wallet, type WalletAccount, type WalletIcon, type WalletVersion } from "@wallet-standard/base";
import {
  StandardConnect,
  type StandardConnectFeature,
  StandardDisconnect,
  type StandardDisconnectFeature,
  StandardEvents,
  type StandardEventsChangeProperties,
  type StandardEventsFeature,
  type StandardEventsListeners,
} from "@wallet-standard/features";
import type { CustomChainConfig } from "@web3auth/no-modal";
import { getSolanaChainByChainConfig, WEB3AUTH_ICON } from "@web3auth/no-modal";

import { getED25519Key } from "./ed25519Key";

// In @solana/kit v6, encoders convert string -> bytes and decoders convert bytes -> string.
const base58Encoder = getBase58Encoder();
const base64Encoder = getBase64Encoder();
const transactionDecoder = getTransactionDecoder();

const ACCOUNT_FEATURES: IdentifierArray = [SolanaSignAndSendTransaction, SolanaSignMessage, SolanaSignTransaction] as IdentifierArray;

const COMMITMENT_RANK: Record<SolanaTransactionCommitment, number> = {
  processed: 0,
  confirmed: 1,
  finalized: 2,
};

function commitmentSatisfied(current: SolanaTransactionCommitment, required: SolanaTransactionCommitment): boolean {
  return COMMITMENT_RANK[current] >= COMMITMENT_RANK[required];
}

type NativeSolanaFeatures = StandardConnectFeature &
  StandardDisconnectFeature &
  StandardEventsFeature &
  SolanaSignAndSendTransactionFeature &
  SolanaSignMessageFeature &
  SolanaSignTransactionFeature;

function solanaWalletChainsFromConfigs(solanaChainConfigs: CustomChainConfig[]): IdentifierArray {
  const ids = solanaChainConfigs.map(getSolanaChainByChainConfig).filter((id): id is NonNullable<typeof id> => id != null);
  return [...new Set(ids)] as IdentifierArray;
}

export type NativeSolanaWalletOptions = {
  /** Hex-encoded ed25519 private key seed (or secp256k1-derived seed accepted by {@link getED25519Key}). */
  privateKey: string;
  solanaChainConfigs: CustomChainConfig[];
  /**
   * Fallback RPC when `signAndSendTransaction` omits `chain`
   * (typically the SDK's current chain `rpcTarget`).
   */
  getRpcUrl?: () => string | undefined;
};

/**
 * Wallet Standard adapter backed by a local ed25519 key for React Native.
 * Mirrors the web SDK `connection.solanaWallet` surface without requiring an embedded Solana JRPC provider.
 */
export class NativeSolanaWallet implements Wallet {
  readonly version: WalletVersion = "1.0.0";

  readonly name = "Web3Auth";

  readonly icon: WalletIcon = WEB3AUTH_ICON;

  readonly chains: IdentifierArray;

  readonly features: NativeSolanaFeatures;

  private _accounts: WalletAccount[] | null = null;

  private readonly _listeners: { [E in keyof StandardEventsListeners]?: Set<StandardEventsListeners[E]> } = {};

  private readonly keyPairPromise: Promise<CryptoKeyPair>;

  private readonly publicKeyBytes: Uint8Array;

  private readonly addressPromise: Promise<string>;

  private readonly solanaChainConfigs: CustomChainConfig[];

  private readonly getRpcUrl?: () => string | undefined;

  constructor(options: NativeSolanaWalletOptions) {
    const { privateKey, solanaChainConfigs, getRpcUrl } = options;
    this.solanaChainConfigs = solanaChainConfigs;
    this.getRpcUrl = getRpcUrl;
    this.chains = solanaWalletChainsFromConfigs(solanaChainConfigs);

    const { sk, pk } = getED25519Key(privateKey);
    this.publicKeyBytes = new Uint8Array(pk);
    this.keyPairPromise = createKeyPairFromBytes(new Uint8Array(sk));
    this.addressPromise = this.keyPairPromise.then((keyPair) => getAddressFromPublicKey(keyPair.publicKey));

    this.features = {
      [StandardConnect]: {
        version: "1.0.0",
        connect: async () => {
          await this.ensureAccountsLoaded();
          return { accounts: this.accounts };
        },
      },
      [StandardDisconnect]: {
        version: "1.0.0",
        disconnect: async () => {
          this._accounts = null;
          this.emitChange({ accounts: this.accounts });
        },
      },
      [StandardEvents]: {
        version: "1.0.0",
        on: <E extends keyof StandardEventsListeners>(event: E, listener: StandardEventsListeners[E]) => {
          (this._listeners[event] ??= new Set() as Set<StandardEventsListeners[E]>).add(listener);
          return () => (this._listeners[event] as Set<StandardEventsListeners[E]>).delete(listener);
        },
      },
      [SolanaSignAndSendTransaction]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signAndSendTransaction: async (...inputs) => {
          await this.ensureAccountsLoaded();
          const address = await this.addressPromise;
          return Promise.all(
            inputs.map(async (input) => {
              this.assertAccount(input.account.address, address);
              this.assertSupportedChain(input.chain);
              const { signedBase64 } = await this.signTransactionBytes(input.transaction);
              const rpcUrl = this.resolveRpcUrl(input.chain);
              const signatureBase58 = await this.sendRawTransaction(rpcUrl, signedBase64, input.options);
              if (input.options?.commitment) {
                await this.confirmSignature(rpcUrl, signatureBase58, input.options.commitment);
              }
              return { signature: new Uint8Array(base58Encoder.encode(signatureBase58)) };
            })
          );
        },
      },
      [SolanaSignMessage]: {
        version: "1.0.0",
        signMessage: async (...inputs) => {
          await this.ensureAccountsLoaded();
          const keyPair = await this.keyPairPromise;
          const address = await this.addressPromise;
          return Promise.all(
            inputs.map(async (input) => {
              this.assertAccount(input.account.address, address);
              const signature = await signBytes(keyPair.privateKey, input.message);
              return {
                signedMessage: new Uint8Array(input.message),
                signature: new Uint8Array(signature),
              };
            })
          );
        },
      },
      [SolanaSignTransaction]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signTransaction: async (...inputs) => {
          await this.ensureAccountsLoaded();
          const address = await this.addressPromise;
          return Promise.all(
            inputs.map(async (input) => {
              this.assertAccount(input.account.address, address);
              this.assertSupportedChain(input.chain);
              const { signedTransaction } = await this.signTransactionBytes(input.transaction);
              return { signedTransaction };
            })
          );
        },
      },
    };
  }

  /**
   * Wallet Standard requires a synchronous getter; accounts are empty until connect/sign loads them.
   */
  get accounts(): readonly WalletAccount[] {
    return this._accounts ?? [];
  }

  private async ensureAccountsLoaded(): Promise<void> {
    if (this.chains.length === 0) {
      throw new Error("Solana wallet operations require at least one configured Solana network.");
    }

    if (this._accounts !== null) return;

    const address = await this.addressPromise;
    const accountChains = this.chains;
    this._accounts = [
      {
        address,
        publicKey: this.publicKeyBytes,
        chains: accountChains,
        features: ACCOUNT_FEATURES,
      },
    ];
    this.emitChange({ accounts: this.accounts });
  }

  private assertAccount(accountAddress: string, walletAddress: string): void {
    if (accountAddress !== walletAddress) {
      throw new Error("Account not found in wallet.");
    }
  }

  private assertSupportedChain(chain: string | undefined): void {
    if (chain == null) return;
    if (!(this.chains as readonly string[]).includes(chain)) {
      throw new Error(`Solana chain ${chain} is not supported by this wallet.`);
    }
  }

  private resolveRpcUrl(chain: string | undefined): string {
    if (chain != null) {
      const config = this.solanaChainConfigs.find((entry) => getSolanaChainByChainConfig(entry) === chain);
      const rpcUrl = config?.rpcTarget;
      if (!rpcUrl) {
        throw new Error(`Solana RPC URL is not configured for chain ${chain}.`);
      }
      return rpcUrl;
    }

    const rpcUrl = this.getRpcUrl?.();
    if (!rpcUrl) {
      throw new Error("Solana RPC URL is not configured for the current chain.");
    }
    return rpcUrl;
  }

  private async signTransactionBytes(transactionBytes: Uint8Array): Promise<{ signedTransaction: Uint8Array; signedBase64: string }> {
    if (!(transactionBytes instanceof Uint8Array) || transactionBytes.byteLength === 0) {
      throw new Error("Transaction bytes are required.");
    }

    const keyPair = await this.keyPairPromise;
    const decodedTx = transactionDecoder.decode(transactionBytes);
    const partiallySigned = await partiallySignTransaction([keyPair], decodedTx);
    const signedBase64 = getBase64EncodedWireTransaction(partiallySigned);
    return {
      signedTransaction: new Uint8Array(base64Encoder.encode(signedBase64)),
      signedBase64,
    };
  }

  private async sendRawTransaction(rpcUrl: string, signedBase64: string, options?: SolanaSignAndSendTransactionOptions): Promise<string> {
    const config: Record<string, unknown> = {
      encoding: "base64",
      preflightCommitment: options?.preflightCommitment ?? "confirmed",
    };
    if (options?.skipPreflight != null) config.skipPreflight = options.skipPreflight;
    if (options?.maxRetries != null) config.maxRetries = options.maxRetries;
    if (options?.minContextSlot != null) config.minContextSlot = options.minContextSlot;

    const payload = await this.rpcRequest<{ result?: string; error?: { message?: string } }>(rpcUrl, "sendTransaction", [signedBase64, config]);

    if (payload.error?.message) {
      throw new Error(payload.error.message);
    }
    if (!payload.result || typeof payload.result !== "string") {
      throw new Error("Solana RPC did not return a transaction signature.");
    }

    // Validate base58 signature shape early.
    base58Encoder.encode(payload.result);
    return payload.result;
  }

  private async confirmSignature(rpcUrl: string, signature: string, commitment: SolanaTransactionCommitment): Promise<void> {
    const deadline = Date.now() + 30_000;

    while (Date.now() < deadline) {
      const payload = await this.rpcRequest<{
        result?: { value?: Array<{ confirmationStatus?: SolanaTransactionCommitment | null; err?: unknown } | null> };
        error?: { message?: string };
      }>(rpcUrl, "getSignatureStatuses", [[signature], { searchTransactionHistory: true }]);

      if (payload.error?.message) {
        throw new Error(payload.error.message);
      }

      const status = payload.result?.value?.[0];
      if (status?.err) {
        throw new Error(`Solana transaction failed confirmation: ${JSON.stringify(status.err)}`);
      }
      if (status?.confirmationStatus && commitmentSatisfied(status.confirmationStatus, commitment)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    throw new Error(`Solana transaction did not reach ${commitment} commitment.`);
  }

  private async rpcRequest<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`Solana RPC request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private emitChange(properties: StandardEventsChangeProperties): void {
    const listeners = this._listeners.change;
    if (!listeners) return;
    listeners.forEach((listener) => {
      listener(properties);
    });
  }
}

export async function createNativeSolanaWallet(options: NativeSolanaWalletOptions): Promise<NativeSolanaWallet> {
  const wallet = new NativeSolanaWallet(options);
  await wallet.features[StandardConnect].connect();
  return wallet;
}
