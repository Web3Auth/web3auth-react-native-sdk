import { useCallback, useState } from "react";

import { Web3authRNError } from "../../errors";
import { useWeb3AuthInner } from "./useWeb3AuthInner";

export interface IUseEnableMFA {
  loading: boolean;
  error: Web3authRNError | null;
  enableMFA(): Promise<void>;
}

export const useEnableMFA = (): IUseEnableMFA => {
  const { web3Auth, setIsMFAEnabled, syncSessionState } = useWeb3AuthInner();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Web3authRNError | null>(null);

  const enableMFA = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const enabled = await web3Auth.enableMFA();
      if (enabled) {
        setIsMFAEnabled(true);
      }
      // Refresh rotated citadel tokens / MFA flags into the provider snapshot.
      await syncSessionState();
    } catch (error) {
      setError(error as Web3authRNError);
    } finally {
      setLoading(false);
    }
  }, [web3Auth, setIsMFAEnabled, syncSessionState]);

  return { loading, error, enableMFA };
};
