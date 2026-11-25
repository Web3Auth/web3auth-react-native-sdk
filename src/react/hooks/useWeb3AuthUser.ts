import { AuthUserInfo } from "@web3auth/auth";
import { useCallback, useEffect, useState } from "react";

import { InitializationError, Web3authRNError } from "../../errors";
import { useWeb3AuthInner } from "./useWeb3AuthInner";

export interface IUseWeb3AuthUser {
  loading: boolean;
  error: Web3authRNError | null;
  userInfo: Partial<AuthUserInfo> | null;
  isMFAEnabled: boolean;
  getUserInfo: () => Promise<Partial<AuthUserInfo> | null>;
}

export const useWeb3AuthUser = (): IUseWeb3AuthUser => {
  const { web3Auth, isConnected, isMFAEnabled, setIsMFAEnabled } = useWeb3AuthInner();

  const [userInfo, setUserInfo] = useState<Partial<AuthUserInfo> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Web3authRNError | null>(null);

  const getUserInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!web3Auth) throw InitializationError.notInitialized();
      const nextUserInfo = web3Auth.userInfo();
      const userInfo = nextUserInfo !== undefined ? nextUserInfo : null;
      setUserInfo(userInfo);
      setIsMFAEnabled(Boolean(userInfo?.isMfaEnabled));
      return userInfo;
    } catch (error) {
      setError(error as Web3authRNError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [web3Auth, setIsMFAEnabled]);

  useEffect(() => {
    if (isConnected && !userInfo) {
      getUserInfo();
    }

    if (!isConnected && userInfo) {
      setUserInfo(null);
    }
  }, [isConnected, userInfo, getUserInfo]);

  return { loading, error, userInfo, isMFAEnabled, getUserInfo };
};
