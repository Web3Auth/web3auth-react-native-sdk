import { WalletInitializationError, walletSignMessage, Web3AuthError } from "@web3auth/no-modal";
import { useCallback, useState } from "react";

import { useSolanaWallet } from "./useSolanaWallet";

export type IUseSignMessage = {
  loading: boolean;
  error: Web3AuthError | null;
  data: string | null;
  signMessage: (message: string) => Promise<string>;
};

export const useSignMessage = (): IUseSignMessage => {
  const { solanaWallet, accounts } = useSolanaWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Web3AuthError | null>(null);
  const [data, setData] = useState<string | null>(null);

  const signMessage = useCallback(
    async (message: string) => {
      setLoading(true);
      setError(null);
      try {
        if (!solanaWallet) throw WalletInitializationError.notReady();
        const signature = await walletSignMessage(solanaWallet, message, accounts?.[0]);
        setData(signature);
        return signature;
      } catch (err) {
        setError(err as Web3AuthError);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [solanaWallet, accounts]
  );

  return { loading, error, data, signMessage };
};
