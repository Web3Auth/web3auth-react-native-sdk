import { type IProvider } from "@web3auth/base";
import { createContext, createElement, PropsWithChildren, useEffect, useMemo, useState } from "react";

import Web3Auth from "../../Web3Auth";
import { IWeb3AuthInnerContext, Web3AuthProviderProps } from "../interfaces";

export const Web3AuthInnerContext = createContext<IWeb3AuthInnerContext>(null);

export function Web3AuthInnerProvider(params: PropsWithChildren<Web3AuthProviderProps>) {
  const { children, config, webBrowser, storage } = params;
  const { web3AuthOptions } = config;

  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [initError, setInitError] = useState<Error | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isMFAEnabled, setIsMFAEnabled] = useState<boolean>(false);

  const web3Auth = useMemo(() => {
    setProvider(null);

    return new Web3Auth(webBrowser, storage, web3AuthOptions);
  }, [web3AuthOptions, webBrowser, storage]);

  const isConnected = web3Auth.connected;

  useEffect(() => {
    const controller = new AbortController();
    async function init() {
      try {
        setInitError(null);
        setIsInitializing(true);
        await web3Auth.init();
        setIsInitialized(true);
      } catch (error) {
        setInitError(error as Error);
      } finally {
        setIsInitializing(false);
      }
    }

    if (web3Auth) init();

    return () => {
      controller.abort();
    };
  }, [web3Auth, config]);

  useEffect(() => {
    if (isConnected) {
      setProvider(web3Auth.provider);
    }
  }, [isConnected]);

  const value = useMemo(() => {
    return {
      web3Auth,
      isConnected,
      isInitialized,
      provider,
      isInitializing,
      initError,
      isMFAEnabled,
      setIsMFAEnabled,
    };
  }, [web3Auth, isConnected, isMFAEnabled, setIsMFAEnabled, isInitialized, provider, isInitializing, initError]);

  return createElement(Web3AuthInnerContext.Provider, { value }, children);
}
