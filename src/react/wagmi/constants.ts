import { createConfig, http } from "@wagmi/core";
import { mainnet } from "@wagmi/core/chains";

/** Who initiated a wagmi disconnect — drives whether Web3Auth logout runs. */
export const DISCONNECT_ORIGIN = {
  WEB3AUTH: "web3auth",
  WAGMI: "wagmi",
} as const;

export type DisconnectOriginValue = (typeof DISCONNECT_ORIGIN)[keyof typeof DISCONNECT_ORIGIN];
export type DisconnectOrigin = DisconnectOriginValue | null;

export const WEB3AUTH_CONNECTOR_NAME = "Web3Auth";
export const WEB3AUTH_CONNECTOR_TYPE = "web3auth";

/** Stable placeholder used before Web3Auth finishes initializing. */
export const defaultWagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [],
  multiInjectedProviderDiscovery: false,
  transports: {
    [mainnet.id]: http(mainnet.rpcUrls.default.http[0]),
  },
});
