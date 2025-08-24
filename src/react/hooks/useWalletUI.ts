import { useCallback, useState } from "react";

import { InitializationError, Web3authRNError } from "../../errors";
import { useWeb3AuthInner } from "./useWeb3AuthInner";

export interface IUseWalletUI {
  loading: boolean;
  error: Web3authRNError | null;
  showWalletUI: (path?: string) => Promise<void>;
}

export const useWalletUI = (): IUseWalletUI => {
  const { web3Auth, isConnected } = useWeb3AuthInner();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Web3authRNError | null>(null);

  const showWalletUI = useCallback(
    async (path?: string) => {
      setLoading(true);
      setError(null);
      try {
        if (!isConnected) throw InitializationError.notInitialized();
        await web3Auth.launchWalletServices(path);
      } catch (error) {
        setError(error as Web3authRNError);
      } finally {
        setLoading(false);
      }
    },
    [isConnected, web3Auth]
  );

  return { loading, error, showWalletUI };
};
