import type { SolanaClient } from "@solana/client";
import { createClient, createWalletStandardConnector } from "@solana/client";
import { SolanaProvider as SolanaProviderBase } from "@solana/react-hooks";
import type { CustomChainConfig } from "@web3auth/no-modal";
import { CHAIN_NAMESPACES, getSolanaChainByChainConfig, WALLET_CONNECTORS } from "@web3auth/no-modal";
import { type ComponentProps, createElement, type PropsWithChildren, useEffect, useRef, useState } from "react";

import { log } from "../../base/loglevel";
import { useWeb3Auth } from "../hooks/useWeb3Auth";

const DEVNET_ENDPOINT = "https://api.devnet.solana.com";

function placeholderRpc(
  isInitialized: boolean,
  web3Auth: ReturnType<typeof useWeb3Auth>["web3Auth"]
): Pick<CustomChainConfig, "rpcTarget" | "wsTarget"> {
  if (!isInitialized || !web3Auth?.configuredChains?.length) {
    return { rpcTarget: DEVNET_ENDPOINT };
  }
  const solanaChains = web3Auth.configuredChains.filter((c) => c.chainNamespace === CHAIN_NAMESPACES.SOLANA);
  const current = web3Auth.currentChain;
  const chain = current?.chainNamespace === CHAIN_NAMESPACES.SOLANA ? current : solanaChains[0];
  if (!chain) return { rpcTarget: DEVNET_ENDPOINT };
  return { rpcTarget: chain.rpcTarget, wsTarget: chain.wsTarget };
}

function makePlaceholder(rpc: Pick<CustomChainConfig, "rpcTarget" | "wsTarget">): SolanaClient {
  return createClient({
    endpoint: rpc.rpcTarget,
    websocketEndpoint: rpc.wsTarget,
    walletConnectors: [],
  });
}

/**
 * Builds the SolanaClient for Framework Kit React hooks.
 * Uses a placeholder client until a connected Auth Solana wallet is available.
 */
function useFrameworkKitSolanaClient(): SolanaClient {
  const { isConnected, connection, web3Auth, isInitialized } = useWeb3Auth();
  const solClientRef = useRef<SolanaClient | null>(null);
  const disposedClientsRef = useRef(new WeakSet<SolanaClient>());
  const disposeRef = useRef((client: SolanaClient | null | undefined) => {
    if (!client || disposedClientsRef.current.has(client)) return;
    disposedClientsRef.current.add(client);
    client.destroy();
  });

  const [client, setClient] = useState(() => {
    const c = makePlaceholder({ rpcTarget: DEVNET_ENDPOINT });
    solClientRef.current = c;
    return c;
  });

  useEffect(() => {
    if (isInitialized) web3Auth?.setAnalyticsProperties({ solana_framework_kit_enabled: true });
  }, [isInitialized, web3Auth]);

  useEffect(
    () => () => {
      disposeRef.current(solClientRef.current);
      solClientRef.current = null;
    },
    []
  );

  useEffect(() => {
    let stale = false;

    const dispose = disposeRef.current;
    const adopt = (nextClient: SolanaClient) => {
      if (stale) {
        dispose(nextClient);
        return;
      }
      const prevClient = solClientRef.current;
      if (prevClient === nextClient) return;
      dispose(prevClient);
      solClientRef.current = nextClient;
      setClient(nextClient);
    };

    void (async () => {
      const rpc = placeholderRpc(isInitialized, web3Auth);
      const chainNamespace = web3Auth?.currentChainNamespace;
      const currentChain = web3Auth?.currentChain;
      const solanaWallet = connection?.solanaWallet ?? null;

      const shouldBind =
        isConnected &&
        Boolean(solanaWallet) &&
        chainNamespace === CHAIN_NAMESPACES.SOLANA &&
        currentChain?.chainNamespace === CHAIN_NAMESPACES.SOLANA &&
        connection?.connectorName === WALLET_CONNECTORS.AUTH;

      if (!shouldBind) {
        adopt(makePlaceholder(rpc));
        return;
      }

      try {
        const connectorName = connection.connectorName;
        const solanaWalletId = `wallet-standard:${connectorName}`;
        const defaultChain = getSolanaChainByChainConfig(currentChain) ?? undefined;
        const connector = createWalletStandardConnector(solanaWallet, {
          id: solanaWalletId,
          name: connectorName,
          defaultChain,
        });
        const wired = createClient({
          endpoint: currentChain.rpcTarget,
          websocketEndpoint: currentChain.wsTarget,
          walletConnectors: [connector],
        });
        await wired.actions.connectWallet(solanaWalletId, { autoConnect: true });
        if (stale) {
          dispose(wired);
          return;
        }
        adopt(wired);
      } catch (e) {
        log.error("Failed to create or connect Solana client", e);
        adopt(makePlaceholder(rpc));
      }
    })();

    return () => {
      stale = true;
    };
  }, [
    isConnected,
    connection,
    connection?.solanaWallet,
    connection?.connectorName,
    web3Auth,
    web3Auth?.currentChainId,
    web3Auth?.currentChainNamespace,
    isInitialized,
  ]);

  return client;
}

type SolanaProviderProps = Omit<ComponentProps<typeof SolanaProviderBase>, "client" | "config" | "walletPersistence">;

export function SolanaProvider({ children, ...props }: PropsWithChildren<SolanaProviderProps>) {
  const client = useFrameworkKitSolanaClient();

  return createElement(SolanaProviderBase, {
    ...props,
    client,
    walletPersistence: false,
    children,
  });
}
