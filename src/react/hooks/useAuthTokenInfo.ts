import { useCallback, useEffect, useState } from "react";

import { Web3authRNError } from "../../errors";
import { useWeb3AuthInner } from "./useWeb3AuthInner";

export interface IUseAuthTokenInfo {
  loading: boolean;
  error: Web3authRNError | null;
  token: string | null;
  getAuthTokenInfo: () => Promise<string | null>;
}

export const useAuthTokenInfo = (): IUseAuthTokenInfo => {
  const { web3Auth, isAuthorized } = useWeb3AuthInner();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Web3authRNError | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const getAuthTokenInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const authTokenInfo = await web3Auth.getAuthTokenInfo();
      if (authTokenInfo?.idToken) {
        setToken(authTokenInfo.idToken);
      }
      return authTokenInfo?.idToken ?? null;
    } catch (error) {
      setError(error as Web3authRNError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [web3Auth]);

  useEffect(() => {
    if (!web3Auth) return;
    if (!isAuthorized && token) {
      setToken(null);
    }
  }, [isAuthorized, token, web3Auth]);

  return { loading, error, token, getAuthTokenInfo };
};
