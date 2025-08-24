import { AuthUserInfo } from "@web3auth/auth";
import { useCallback, useEffect, useState } from "react";

import { Web3authRNError } from "../../errors";
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
      const userInfo = web3Auth.userInfo();
      setUserInfo(userInfo);
      return userInfo;
    } catch (error) {
      setError(error as Web3authRNError);
    } finally {
      setLoading(false);
    }
  }, [web3Auth]);

  useEffect(() => {
    const saveUserInfo = async () => {
      const userInfo = await getUserInfo();
      setUserInfo(userInfo);
      setIsMFAEnabled(userInfo?.isMfaEnabled || false);
    };

    if (isConnected && !userInfo) saveUserInfo();

    if (!isConnected && userInfo) {
      setUserInfo(null);
      setIsMFAEnabled(false);
    }
  }, [isConnected, userInfo, getUserInfo, setIsMFAEnabled]);

  return { loading, error, userInfo, isMFAEnabled, getUserInfo };
};
