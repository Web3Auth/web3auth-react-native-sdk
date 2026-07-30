import { createContext, createElement, Fragment, type PropsWithChildren, useContext, useEffect, useMemo, useRef } from "react";
import type { EIP1193Provider } from "viem";
import { useConfig as useWagmiConfig, WagmiProvider as WagmiProviderBase } from "wagmi";

import { log } from "../../base/loglevel";
import { useWeb3Auth } from "../hooks/useWeb3Auth";
import { createWeb3AuthWagmiConfig } from "./config";
import { defaultWagmiConfig, type DisconnectOrigin } from "./constants";
import type { WagmiProviderProps } from "./interface";
import { createWagmiBridgeController, type DisconnectOriginRef } from "./sync";

type WagmiBridgeContextValue = {
  originRef: DisconnectOriginRef;
  providerRef: { current: EIP1193Provider | null };
};

const WagmiBridgeContext = createContext<WagmiBridgeContextValue | null>(null);

function Web3AuthWagmiProvider({ children }: PropsWithChildren) {
  const { isConnected, connection, web3Auth } = useWeb3Auth();
  const wagmiConfig = useWagmiConfig();
  const bridgeContext = useContext(WagmiBridgeContext);
  const bridgeRef = useRef<ReturnType<typeof createWagmiBridgeController> | null>(null);
  const bridgeConfigRef = useRef(wagmiConfig);

  if (bridgeConfigRef.current !== wagmiConfig) {
    bridgeRef.current?.dispose();
    bridgeRef.current = null;
    bridgeConfigRef.current = wagmiConfig;
  }
  if (!bridgeRef.current && bridgeContext) {
    bridgeRef.current = createWagmiBridgeController(wagmiConfig, bridgeContext.originRef);
  }

  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge) return undefined;

    const unsubscribe = bridge.watchSpontaneousDisconnect(async () => {
      if (!web3Auth?.connected) return;
      await web3Auth.logout();
    });

    return () => {
      unsubscribe();
    };
  }, [web3Auth, wagmiConfig]);

  useEffect(() => {
    const bridge = bridgeRef.current;
    const bridgeContextValue = bridgeContext;
    if (!bridge || !bridgeContextValue) return undefined;

    const ethereumProvider = (connection?.ethereumProvider as EIP1193Provider | null) ?? null;
    bridgeContextValue.providerRef.current = ethereumProvider;
    const shouldBind = Boolean(isConnected && connection && ethereumProvider);

    bridge
      .sync({
        shouldBind,
        provider: ethereumProvider,
        connectorName: connection?.connectorName ?? null,
      })
      .catch((error) => {
        log.error("Failed to synchronize Web3Auth session with wagmi", error);
      });

    return undefined;
  }, [bridgeContext, connection, isConnected, wagmiConfig]);

  useEffect(() => {
    return () => {
      bridgeRef.current?.dispose();
      bridgeRef.current = null;
    };
  }, [wagmiConfig]);

  return createElement(Fragment, null, children);
}

export function WagmiProvider({ children, config, ...props }: PropsWithChildren<WagmiProviderProps>) {
  const { web3Auth, isInitialized, connection } = useWeb3Auth();
  const providerRef = useRef<EIP1193Provider | null>(null);
  const originRef = useRef<DisconnectOriginRef>({ current: null }).current;
  const logoutRef = useRef<() => Promise<void>>(async () => undefined);
  const configOverridesRef = useRef(config);
  configOverridesRef.current = config;

  logoutRef.current = async () => {
    if (!web3Auth) return;
    await web3Auth.logout();
  };

  providerRef.current = (connection?.ethereumProvider as EIP1193Provider | null) ?? null;

  const finalConfig = useMemo(() => {
    web3Auth?.setAnalyticsProperties({ wagmi_enabled: true });
    if (!isInitialized || !web3Auth) return defaultWagmiConfig;

    return createWeb3AuthWagmiConfig({
      chains: web3Auth.configuredChains,
      preferredChainId: web3Auth.currentChainId,
      // Captured at initialization; remount WagmiProvider to apply new overrides.
      configOverrides: configOverridesRef.current,
      getProvider: () => providerRef.current,
      getDisconnectOrigin: () => originRef.current,
      setDisconnectOrigin: (origin: DisconnectOrigin) => {
        originRef.current = origin;
      },
      onWagmiDisconnect: () => logoutRef.current(),
    });
  }, [originRef, web3Auth, isInitialized]);

  const bridgeContext = useMemo<WagmiBridgeContextValue>(
    () => ({
      originRef,
      providerRef,
    }),
    [originRef]
  );

  return createElement(
    WagmiBridgeContext.Provider,
    { value: bridgeContext },
    createElement(WagmiProviderBase, { ...props, config: finalConfig, reconnectOnMount: false }, createElement(Web3AuthWagmiProvider, null, children))
  );
}
