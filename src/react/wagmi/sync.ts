import { type Config, connect, type Connector, disconnect, getConnections, getConnectors, watchConnections } from "@wagmi/core";
import type { EIP1193Provider } from "viem";

import { log } from "../../base/loglevel";
import { WEB3AUTH_CONNECTOR_ID } from "./connector";
import { DISCONNECT_ORIGIN, type DisconnectOrigin } from "./constants";
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
  dispose: () => Promise<void>;
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
            disconnectOriginRef.current = DISCONNECT_ORIGIN.WEB3AUTH;
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
          disconnectOriginRef.current = DISCONNECT_ORIGIN.WEB3AUTH;
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
        onChange: (connections, previousConnections) => {
          if (disposed) return;
          // Connector-driven disconnects already handled logout (or intentionally skipped it).
          if (disconnectOriginRef.current) return;

          const hadWeb3Auth = previousConnections.some((connection) => connection.connector.id === WEB3AUTH_CONNECTOR_ID);
          const hasWeb3Auth = connections.some((connection) => connection.connector.id === WEB3AUTH_CONNECTOR_ID);
          if (!(hadWeb3Auth && !hasWeb3Auth)) return;

          // watchConnections does not await onChange; keep the logout work
          // inside a voided task so rejections never become unhandled.
          void (async () => {
            disconnectOriginRef.current = DISCONNECT_ORIGIN.WAGMI;
            try {
              await onSpontaneousDisconnect();
            } catch (error) {
              // Wagmi already dropped the connection for accountsChanged:[] /
              // provider disconnect. If Web3Auth logout fails, re-adopt the
              // prior binding so both sides stay aligned.
              log.error("Failed to log out Web3Auth after spontaneous wagmi disconnect", error);
              if (!disposed && lastBinding.provider) {
                const connector = getWeb3AuthConnector(config);
                if (connector) {
                  try {
                    await connect(config, { connector });
                  } catch (reconnectError) {
                    log.error("Failed to restore wagmi connection after spontaneous logout failure", reconnectError);
                  }
                }
              }
            } finally {
              disconnectOriginRef.current = null;
            }
          })();
        },
      });
    },
    dispose: async () => {
      disposed = true;
      generation += 1;
      lastBinding = { provider: null, connectorName: null };

      // Detach EIP-1193 listeners and drop the wagmi connection without
      // logging out Web3Auth. Skipping this retains listeners on the shared
      // provider and keeps the detached config connected across remounts.
      const connections = getConnections(config);
      const existing = connections.find((connection) => connection.connector.id === WEB3AUTH_CONNECTOR_ID);
      if (!existing && config.state.status !== "connected") {
        disconnectOriginRef.current = null;
        return;
      }

      disconnectOriginRef.current = DISCONNECT_ORIGIN.WEB3AUTH;
      try {
        if (existing) {
          await disconnect(config, { connector: existing.connector });
        } else {
          await disconnect(config);
        }
      } catch (error) {
        log.error("Failed to disconnect wagmi on bridge dispose", error);
      } finally {
        if (disconnectOriginRef.current === DISCONNECT_ORIGIN.WEB3AUTH) {
          disconnectOriginRef.current = null;
        }
      }
    },
  };
}
