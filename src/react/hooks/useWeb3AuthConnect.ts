import { useCallback, useState } from "react";

import { Web3authRNError } from "../../errors";
import { SdkLoginParams, WalletResult } from "../../types/interface";
import { useWeb3AuthInner } from "../hooks/useWeb3AuthInner";

export interface IUseWeb3AuthConnect {
  isConnected: boolean;
  loading: boolean;
  error: Web3authRNError | null;
  connectTo: (params: SdkLoginParams) => Promise<WalletResult | null>;
}

export const useWeb3AuthConnect = (): IUseWeb3AuthConnect => {
  const { web3Auth, isConnected } = useWeb3AuthInner();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Web3authRNError | null>(null);

  const connectTo = useCallback(
    async (params: SdkLoginParams) => {
      setLoading(true);
      setError(null);
      try {
        const loginParams: SdkLoginParams = {
          ...params,
          loginSource: params.loginSource ?? "web3auth-react-native",
        };
        return await web3Auth.connectTo(loginParams);
      } catch (error) {
        setError(error as Web3authRNError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [web3Auth]
  );

  return {
    isConnected,
    loading,
    error,
    connectTo,
  };
};
