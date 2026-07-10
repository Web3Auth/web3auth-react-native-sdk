import { useCallback, useEffect, useState } from "react";

import { Web3authRNError } from "../../errors";
import { useWeb3AuthInner } from "./useWeb3AuthInner";

export interface IUseAccessToken {
  loading: boolean;
  error: Web3authRNError | null;
  token: string | null;
  getAccessToken: () => Promise<string | null>;
}

export const useAccessToken = () => {
  const { web3Auth, isConnected } = useWeb3AuthInner();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Web3authRNError | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const getAccessToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = await web3Auth.getAccessToken();
      setToken(accessToken);
      return accessToken;
    } catch (error) {
      setError(error as Web3authRNError);
    } finally {
      setLoading(false);
    }
    return null;
  }, [web3Auth]);

  useEffect(() => {
    if (!isConnected && token) {
      setToken(null);
    }
  }, [isConnected, token]);

  return { loading, error, token, getAccessToken };
};
