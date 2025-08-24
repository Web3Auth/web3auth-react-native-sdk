import { type IProvider } from "@web3auth/base";
import { useCallback, useState } from "react";

import { Web3authRNError } from "../../errors";
import { SdkLoginParams } from "../../types/interface";
import { useWeb3AuthInner } from "../hooks/useWeb3AuthInner";

export interface IUseWeb3AuthConnect {
  isConnected: boolean;
  loading: boolean;
  error: Web3authRNError | null;
  connectTo: (params: SdkLoginParams) => Promise<IProvider | null>;
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
        const provider = await web3Auth.connectTo(params);
        return provider;
      } catch (error) {
        setError(error as Web3authRNError);
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
