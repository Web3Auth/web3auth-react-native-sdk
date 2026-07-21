import { useCallback, useState } from "react";

import { Web3authRNError } from "../../errors";
import { useWeb3AuthInner } from "./useWeb3AuthInner";

export interface IUseAccessToken {
  loading: boolean;
  error: Web3authRNError | null;
  accessToken: string | null;
  /** @deprecated Use {@link accessToken} instead. */
  token: string | null;
  getAccessToken: () => Promise<string | null>;
}

export const useAccessToken = (): IUseAccessToken => {
  const { web3Auth, accessToken, setAccessTokenState } = useWeb3AuthInner();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Web3authRNError | null>(null);

  const getAccessToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextAccessToken = await web3Auth.getAccessToken();
      setAccessTokenState(nextAccessToken);
      return nextAccessToken;
    } catch (error) {
      setError(error as Web3authRNError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [web3Auth, setAccessTokenState]);

  return { loading, error, accessToken, token: accessToken, getAccessToken };
};
