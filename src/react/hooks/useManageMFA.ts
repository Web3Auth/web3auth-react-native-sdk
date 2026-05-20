import { useCallback, useState } from "react";

import { Web3authRNError } from "../../errors";
import { useWeb3AuthInner } from "./useWeb3AuthInner";

export interface IUseManageMFA {
  loading: boolean;
  error: Web3authRNError | null;
  manageMFA(): Promise<void>;
}

export const useManageMFA = (): IUseManageMFA => {
  const { web3Auth } = useWeb3AuthInner();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Web3authRNError | null>(null);

  const manageMFA = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await web3Auth.manageMFA();
    } catch (error) {
      setError(error as Web3authRNError);
    } finally {
      setLoading(false);
    }
  }, [web3Auth]);

  return { loading, error, manageMFA };
};
