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
  SolanaSignMessage,
  type SolanaSignMessageFeature,
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
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
import { getED25519Key } from "@web3auth/auth";
import type { CustomChainConfig } from "@web3auth/no-modal";
import { getSolanaChainByChainConfig, WEB3AUTH_ICON } from "@web3auth/no-modal";

// In @solana/kit v6, encoders convert string -> bytes and decoders convert bytes -> string.
const base58Encoder = getBase58Encoder();
const base64Encoder = getBase64Encoder();
const transactionDecoder = getTransactionDecoder();

const ACCOUNT_FEATURES: IdentifierArray = [SolanaSignAndSendTransaction, SolanaSignMessage, SolanaSignTransaction] as IdentifierArray;

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
  /** Resolves the RPC URL used by `signAndSendTransaction`. */
  getRpcUrl: () => string | undefined;
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

  private readonly getRpcUrl: () => string | undefined;

  constructor(options: NativeSolanaWalletOptions) {
    const { privateKey, solanaChainConfigs, getRpcUrl } = options;
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
          return Promise.all(
            inputs.map(async (input) => {
              const { signedBase64 } = await this.signTransactionBytes(input.transaction);
              const rpcUrl = this.getRpcUrl();
              if (!rpcUrl) {
                throw new Error("Solana RPC URL is not configured for the current chain.");
              }
              const signatureBase58 = await this.sendRawTransaction(rpcUrl, signedBase64);
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
              if (input.account.address !== address) {
                throw new Error("Account not found in wallet.");
              }
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
              if (input.account.address !== address) {
                throw new Error("Account not found in wallet.");
              }
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
    if (this._accounts !== null) return;

    const address = await this.addressPromise;
    const accountChains = this.chains;
    this._accounts = [
      {
        address,
        publicKey: this.publicKeyBytes,
        chains: accountChains.length ? accountChains : ([] as unknown as IdentifierArray),
        features: ACCOUNT_FEATURES,
      },
    ];
    this.emitChange({ accounts: this.accounts });
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

  private async sendRawTransaction(rpcUrl: string, signedBase64: string): Promise<string> {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sendTransaction",
        params: [signedBase64, { encoding: "base64", preflightCommitment: "confirmed" }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Solana RPC request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      result?: string;
      error?: { message?: string };
    };

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
