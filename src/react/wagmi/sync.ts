import { type Config, connect, type Connector, disconnect, getConnections, getConnectors, watchConnections } from "@wagmi/core";
import type { EIP1193Provider } from "viem";

import { log } from "../../base/loglevel";
import { type DisconnectOrigin, WEB3AUTH_CONNECTOR_ID } from "./connector";
import { awaitWagmiStorageHydration } from "./storage";

export type BridgeBinding = {
  provider: EIP1193Provider | null;
  connectorName: string | null;
};

export type DisconnectOriginRef = {
  current: DisconnectOrigin;
};

export function getWeb3AuthConnector(config: Config): Connector | undefined {
  return getConnectors(config).find((connector) => connector.id === WEB3AUTH_CONNECTOR_ID);
}

export type WagmiBridgeController = {
  getDisconnectOrigin: () => DisconnectOrigin;
  setDisconnectOrigin: (origin: DisconnectOrigin) => void;
  sync: (params: { shouldBind: boolean; provider: EIP1193Provider | null; connectorName: string | null }) => Promise<void>;
  watchSpontaneousDisconnect: (onSpontaneousDisconnect: () => Promise<void>) => () => void;
  dispose: () => void;
};

export function createWagmiBridgeController(config: Config, originRef?: DisconnectOriginRef): WagmiBridgeController {
  const disconnectOriginRef: DisconnectOriginRef = originRef ?? { current: null };
  let disposed = false;
  let generation = 0;
  let queue: Promise<void> = Promise.resolve();
  let lastBinding: BridgeBinding = { provider: null, connectorName: null };

  const enqueue = (task: (token: number) => Promise<void>): Promise<void> => {
    const token = ++generation;
    queue = queue
      .catch((): undefined => undefined)
      .then(async (): Promise<undefined> => {
        if (disposed || token !== generation) return undefined;
        await task(token);
        return undefined;
      });
    return queue;
  };

  return {
    getDisconnectOrigin: () => disconnectOriginRef.current,
    setDisconnectOrigin: (origin) => {
      disconnectOriginRef.current = origin;
    },
    sync: ({ shouldBind, provider, connectorName }) =>
      enqueue(async (token) => {
        if (disposed || token !== generation) return;

        // Finish storage hydration before bind/disconnect so async RN storage
        // cannot install connector stubs mid-synchronization.
        await awaitWagmiStorageHydration(config);
        if (disposed || token !== generation) return;

        if (shouldBind && provider) {
          const connector = getWeb3AuthConnector(config);
          if (!connector) {
            log.error("Web3Auth wagmi connector was not registered on the config");
            return;
          }

          const connections = getConnections(config);
          const existing = connections.find((connection) => connection.connector.id === WEB3AUTH_CONNECTOR_ID);
          const hasSameBinding =
            lastBinding.provider === provider &&
            lastBinding.connectorName === connectorName &&
            Boolean(existing) &&
            config.state.status === "connected";

          if (hasSameBinding) return;

          if (existing) {
            disconnectOriginRef.current = "web3auth";
            try {
              await disconnect(config, { connector: existing.connector });
            } finally {
              disconnectOriginRef.current = null;
            }
            if (disposed || token !== generation) return;
          }

          lastBinding = { provider, connectorName };
          await connect(config, { connector });
          return;
        }

        lastBinding = { provider: null, connectorName: null };
        const connections = getConnections(config);
        const existing = connections.find((connection) => connection.connector.id === WEB3AUTH_CONNECTOR_ID);
        if (existing || config.state.status === "connected") {
          disconnectOriginRef.current = "web3auth";
          try {
            if (existing) {
              await disconnect(config, { connector: existing.connector });
            } else {
              await disconnect(config);
            }
          } finally {
            disconnectOriginRef.current = null;
          }
        }
      }),
    watchSpontaneousDisconnect: (onSpontaneousDisconnect) => {
      return watchConnections(config, {
        onChange: async (connections, previousConnections) => {
          if (disposed) return;
          // Connector-driven disconnects already handled logout (or intentionally skipped it).
          if (disconnectOriginRef.current) return;

          const hadWeb3Auth = previousConnections.some((connection) => connection.connector.id === WEB3AUTH_CONNECTOR_ID);
          const hasWeb3Auth = connections.some((connection) => connection.connector.id === WEB3AUTH_CONNECTOR_ID);
          if (hadWeb3Auth && !hasWeb3Auth) {
            disconnectOriginRef.current = "wagmi";
            try {
              await onSpontaneousDisconnect();
            } finally {
              disconnectOriginRef.current = null;
            }
          }
        },
      });
    },
    dispose: () => {
      disposed = true;
      generation += 1;
      lastBinding = { provider: null, connectorName: null };
      disconnectOriginRef.current = null;
    },
  };
}
