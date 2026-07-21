import { type IProvider } from "@web3auth/no-modal";
import { createContext, createElement, PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";

import { ANALYTICS_INTEGRATION_TYPE } from "../../base";
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
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const web3Auth = useMemo(() => {
    setProvider(null);
    setIsConnected(false);
    setIsAuthorized(false);
    setAccessToken(null);
    setIsMFAEnabled(false);
    return new Web3Auth(webBrowser, storage, web3AuthOptions);
  }, [web3AuthOptions, webBrowser, storage]);

  const clearSessionSnapshot = useCallback(() => {
    setIsConnected(false);
    setIsAuthorized(false);
    setAccessToken(null);
    setIsMFAEnabled(false);
    setProvider(null);
  }, []);

  const setAccessTokenState = useCallback((token: string | null) => {
    setAccessToken(token);
    setIsAuthorized(Boolean(token));
  }, []);

  const syncSessionState = useCallback(async () => {
    if (!web3Auth?.connected) {
      clearSessionSnapshot();
      return;
    }

    setIsConnected(true);
    setProvider(web3Auth.provider);

    try {
      const userInfo = web3Auth.userInfo();
      setIsMFAEnabled(Boolean(userInfo?.isMfaEnabled));
    } catch {
      setIsMFAEnabled(false);
    }

    try {
      // Citadel sessions expose an access token; SFA sessions stay connected but not authorized.
      const token = await web3Auth.getAccessToken();
      setAccessTokenState(token);
    } catch {
      setAccessTokenState(null);
    }
  }, [web3Auth, clearSessionSnapshot, setAccessTokenState]);

  useEffect(() => {
    const connectedListener = () => {
      void syncSessionState();
    };
    const disconnectedListener = () => {
      clearSessionSnapshot();
    };

    web3Auth.on("connected", connectedListener);
    web3Auth.on("disconnected", disconnectedListener);

    return () => {
      web3Auth.removeListener("connected", connectedListener);
      web3Auth.removeListener("disconnected", disconnectedListener);
    };
  }, [web3Auth, syncSessionState, clearSessionSnapshot]);

  useEffect(() => {
    const controller = new AbortController();
    async function init() {
      try {
        setInitError(null);
        setIsInitializing(true);
        web3Auth.setAnalyticsProperties({
          integration_type: ANALYTICS_INTEGRATION_TYPE.REACT_HOOKS,
        });
        await web3Auth.init();
        setIsInitialized(true);
        // Rehydrate provider/token/MFA snapshot when a prior session was restored.
        await syncSessionState();
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
  }, [web3Auth, config, syncSessionState]);

  const value = useMemo(() => {
    return {
      web3Auth,
      isConnected,
      isAuthorized,
      accessToken,
      isInitialized,
      provider,
      isInitializing,
      initError,
      isMFAEnabled,
      setIsMFAEnabled,
      setAccessTokenState,
      syncSessionState,
    };
  }, [
    web3Auth,
    isConnected,
    isAuthorized,
    accessToken,
    isMFAEnabled,
    setIsMFAEnabled,
    setAccessTokenState,
    syncSessionState,
    isInitialized,
    provider,
    isInitializing,
    initError,
  ]);

  return createElement(Web3AuthInnerContext.Provider, { value }, children);
}
