import { getBase58Decoder, getBase64EncodedWireTransaction, getBase64Encoder, type Transaction } from "@solana/kit";
import { SolanaSignAndSendTransaction } from "@solana/wallet-standard-features";
import type { IdentifierString, Wallet } from "@wallet-standard/base";
import { getSolanaChainByChainConfig, WalletInitializationError, Web3AuthError } from "@web3auth/no-modal";
import { useCallback, useState } from "react";

import { useWeb3Auth } from "../../hooks/useWeb3Auth";
import { toWeb3AuthError } from "./toWeb3AuthError";
import { useSolanaWallet } from "./useSolanaWallet";

export type IUseSignAndSendTransaction = {
  loading: boolean;
  error: Web3AuthError | null;
  data: string | null;
  /**
   * Signs and sends a transaction to the network
   * @param transaction - Compiled transaction from \@solana/kit
   * @returns The signature of the transaction encoded in base58
   */
  signAndSendTransaction: (transaction: Transaction) => Promise<string>;
};

/**
 * Like no-modal's walletSignAndSendTransaction, but uses the active chain.
 * The shared helper always picks wallet.chains[0], which is wrong after a network switch.
 */
async function walletSignAndSendTransactionOnChain(wallet: Wallet, transaction: Transaction, chain: IdentifierString | undefined): Promise<string> {
  const feature = wallet.features[SolanaSignAndSendTransaction] as
    | {
        signAndSendTransaction: (input: {
          account: Wallet["accounts"][number];
          transaction: Uint8Array;
          chain?: IdentifierString;
        }) => Promise<readonly { signature: Uint8Array }[]>;
      }
    | undefined;
  if (!feature) throw new Error("Wallet does not support signAndSendTransaction");
  const account = wallet.accounts?.[0];
  if (!account) throw new Error("No account found");

  const serialized = new Uint8Array(getBase64Encoder().encode(getBase64EncodedWireTransaction(transaction)));
  const [output] = await feature.signAndSendTransaction({
    account,
    transaction: serialized,
    chain,
  });
  return getBase58Decoder().decode(new Uint8Array(output.signature));
}

export const useSignAndSendTransaction = (): IUseSignAndSendTransaction => {
  const { solanaWallet } = useSolanaWallet();
  const { web3Auth } = useWeb3Auth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Web3AuthError | null>(null);
  const [data, setData] = useState<string | null>(null);

  const signAndSendTransaction = useCallback(
    async (transaction: Transaction) => {
      setLoading(true);
      setError(null);
      try {
        if (!solanaWallet) throw WalletInitializationError.notReady();
        const chain = web3Auth?.currentChain ? (getSolanaChainByChainConfig(web3Auth.currentChain) ?? undefined) : undefined;
        const signature = await walletSignAndSendTransactionOnChain(solanaWallet, transaction, chain);
        setData(signature);
        return signature;
      } catch (err) {
        const web3AuthError = toWeb3AuthError(err);
        setError(web3AuthError);
        throw web3AuthError;
      } finally {
        setLoading(false);
      }
    },
    [solanaWallet, web3Auth]
  );

  return { loading, error, data, signAndSendTransaction };
};
