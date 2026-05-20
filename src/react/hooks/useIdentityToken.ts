import { useCallback, useEffect, useState } from "react";

import { Web3authRNError } from "../../errors";
import { useWeb3AuthInner } from "./useWeb3AuthInner";

export interface IUseIdentityToken {
  loading: boolean;
  error: Web3authRNError | null;
  token: string | null;
  getIdentityToken: () => Promise<string | null>;
}

export const useIdentityToken = () => {
  const { web3Auth, isConnected } = useWeb3AuthInner();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Web3authRNError | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const getIdentityToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userAuthInfo = web3Auth.userInfo();
      if (userAuthInfo?.idToken) {
        setToken(userAuthInfo.idToken);
      }
      return userAuthInfo?.idToken;
    } catch (error) {
      setError(error as Web3authRNError);
    } finally {
      setLoading(false);
    }
  }, [web3Auth]);

  useEffect(() => {
    if (!isConnected && token) {
      setToken(null);
    }
  }, [isConnected, token]);

  return { loading, error, token, getIdentityToken };
};
