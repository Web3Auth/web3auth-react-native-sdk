import { useCallback, useState } from "react";

import { Web3authRNError } from "../../errors";
import { useWeb3AuthInner } from "./useWeb3AuthInner";

export interface IUseRefreshSession {
  loading: boolean;
  error: Web3authRNError | null;
  refreshSession: () => Promise<void>;
}

export const useRefreshSession = (): IUseRefreshSession => {
  const { web3Auth, syncSessionState } = useWeb3AuthInner();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Web3authRNError | null>(null);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await web3Auth.refreshSession();
      await syncSessionState();
    } catch (error) {
      // Core clears local session + emits disconnected on refresh failure.
      setError(error as Web3authRNError);
    } finally {
      setLoading(false);
    }
  }, [web3Auth, syncSessionState]);

  return { loading, error, refreshSession };
};
