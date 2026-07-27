import { type Config, createConfig, type CreateConfigParameters } from "@wagmi/core";
import type { CustomChainConfig } from "@web3auth/no-modal";
import type { EIP1193Provider } from "viem";

import { buildEvmWagmiChains } from "./chains";
import { createWeb3AuthConnector } from "./connector";
import { type DisconnectOrigin } from "./constants";
import type { WagmiProviderProps } from "./interface";
import { createBridgeSafeStorage } from "./storage";

export type CreateWeb3AuthWagmiConfigParams = {
  chains: CustomChainConfig[];
  preferredChainId?: string | null;
  configOverrides?: WagmiProviderProps["config"];
  getProvider: () => EIP1193Provider | null | undefined;
  getDisconnectOrigin: () => DisconnectOrigin;
  setDisconnectOrigin: (origin: DisconnectOrigin) => void;
  onWagmiDisconnect: () => Promise<void>;
};

export function createWeb3AuthWagmiConfig(params: CreateWeb3AuthWagmiConfigParams): Config {
  const {
    chains: sourceChains,
    preferredChainId,
    configOverrides,
    getProvider,
    getDisconnectOrigin,
    setDisconnectOrigin,
    onWagmiDisconnect,
  } = params;
  const { chains, transports } = buildEvmWagmiChains(sourceChains, preferredChainId);
  const { storage: storageOverride, ...restOverrides } = configOverrides ?? {};

  const finalConfig: CreateConfigParameters = {
    ...restOverrides,
    ...(storageOverride !== undefined ? { storage: storageOverride === null ? null : createBridgeSafeStorage(storageOverride) } : {}),
    chains,
    transports,
    connectors: [
      createWeb3AuthConnector({
        getProvider,
        getDisconnectOrigin,
        setDisconnectOrigin,
        onWagmiDisconnect,
      }),
    ],
    multiInjectedProviderDiscovery: false,
  };

  return createConfig(finalConfig);
}
