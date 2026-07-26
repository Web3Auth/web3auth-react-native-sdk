import { createConfig, http } from "@wagmi/core";
import { mainnet } from "@wagmi/core/chains";

/** Stable placeholder used before Web3Auth finishes initializing. */
export const defaultWagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [],
  multiInjectedProviderDiscovery: false,
  transports: {
    [mainnet.id]: http(mainnet.rpcUrls.default.http[0]),
  },
});
