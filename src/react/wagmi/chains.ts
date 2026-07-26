import { CHAIN_NAMESPACES, type CustomChainConfig } from "@web3auth/no-modal";
import { type Chain, defineChain, fallback, http, type Transport, webSocket } from "viem";

import { InitializationError } from "../../errors";

const HEX_CHAIN_ID = /^0x[0-9a-fA-F]+$/;

function assertValidRpcTarget(chain: CustomChainConfig) {
  try {
    new URL(chain.rpcTarget);
  } catch {
    throw InitializationError.invalidParams(`Please provide a valid rpcTarget in chains for chain ${chain.chainId}`);
  }
}

export function getEvmChainTransport(chain: CustomChainConfig): Transport {
  const { wsTarget, rpcTarget, fallbackWsTargets = [], fallbackRpcTargets = [] } = chain;
  const transports: Transport[] = [];
  if (wsTarget) transports.push(webSocket(wsTarget));
  if (fallbackWsTargets.length > 0) transports.push(...fallbackWsTargets.map((target) => webSocket(target)));
  if (rpcTarget) transports.push(http(rpcTarget));
  if (fallbackRpcTargets.length > 0) transports.push(...fallbackRpcTargets.map((target) => http(target)));
  if (transports.length === 0) {
    throw InitializationError.invalidParams(`No RPC or WebSocket targets found for chain ${chain.chainId}`);
  }
  return fallback(transports);
}

export function buildEvmWagmiChains(
  chains: CustomChainConfig[] | undefined,
  preferredChainId?: string | null
): { chains: [Chain, ...Chain[]]; transports: Record<number, Transport> } {
  const evmChains = (chains || []).filter((chain) => chain.chainNamespace === CHAIN_NAMESPACES.EIP155);
  if (evmChains.length === 0) {
    throw InitializationError.invalidParams("No valid chains found in web3auth config for wagmi.");
  }

  const wagmiChains: Chain[] = [];
  const transports: Record<number, Transport> = {};

  for (const chain of evmChains) {
    if (!HEX_CHAIN_ID.test(chain.chainId)) {
      throw InitializationError.invalidParams(`Please provide a valid chainId as hex string in chains for chain ${chain.chainId}`);
    }
    assertValidRpcTarget(chain);

    const wagmiChain = defineChain({
      id: Number.parseInt(chain.chainId, 16),
      name: chain.displayName,
      rpcUrls: {
        default: {
          http: [chain.rpcTarget],
          ...(chain.wsTarget ? { webSocket: [chain.wsTarget] } : {}),
        },
      },
      blockExplorers: chain.blockExplorerUrl
        ? {
            default: {
              name: "explorer",
              url: chain.blockExplorerUrl,
            },
          }
        : undefined,
      nativeCurrency: {
        name: chain.tickerName,
        symbol: chain.ticker,
        decimals: typeof chain.decimals === "number" ? chain.decimals : 18,
      },
    });

    if (preferredChainId === chain.chainId) {
      wagmiChains.unshift(wagmiChain);
    } else {
      wagmiChains.push(wagmiChain);
    }
    transports[wagmiChain.id] = getEvmChainTransport(chain);
  }

  return {
    chains: [wagmiChains[0]!, ...wagmiChains.slice(1)],
    transports,
  };
}
