import { useCallback, useState } from "react";

import { InitializationError, Web3authRNError } from "../../errors";
import { useWeb3AuthInner } from "./useWeb3AuthInner";

export interface IUseSignatureRequest {
  loading: boolean;
  error: Web3authRNError | null;
  request(method: string, params: unknown[], path?: string): Promise<string | undefined>;
}

export const useSignatureRequest = (): IUseSignatureRequest => {
  const { web3Auth } = useWeb3AuthInner();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Web3authRNError | null>(null);

  const request = useCallback(
    async (method: string, params: unknown[], path?: string) => {
      setLoading(true);
      setError(null);
      try {
        if (!web3Auth) throw InitializationError.notInitialized();
        return await web3Auth.request(method, params, path);
      } catch (error) {
        setError(error as Web3authRNError);
      } finally {
        setLoading(false);
      }
    },
    [web3Auth]
  );

  return { loading, error, request };
};
