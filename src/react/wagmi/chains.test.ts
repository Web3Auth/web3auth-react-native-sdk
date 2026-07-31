import { CHAIN_NAMESPACES, type CustomChainConfig } from "@web3auth/no-modal";
import { describe, expect, it } from "vitest";

import { buildEvmWagmiChains, getEvmChainTransport } from "./chains";

const ethereum: CustomChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1",
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  ticker: "ETH",
  tickerName: "Ethereum",
  decimals: 18,
  blockExplorerUrl: "https://etherscan.io",
  logo: "https://images.web3auth.io/eth.svg",
};

const sepolia: CustomChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xaa36a7",
  rpcTarget: "https://rpc.ankr.com/eth_sepolia",
  wsTarget: "wss://rpc.ankr.com/eth_sepolia/ws",
  fallbackRpcTargets: ["https://1rpc.io/sepolia"],
  fallbackWsTargets: ["wss://fallback.example/ws"],
  displayName: "Sepolia",
  ticker: "ETH",
  tickerName: "Ethereum",
  decimals: 18,
  blockExplorerUrl: "https://sepolia.etherscan.io",
  logo: "https://images.web3auth.io/eth.svg",
};

const solana: CustomChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  chainId: "0x65",
  rpcTarget: "https://api.mainnet-beta.solana.com",
  displayName: "Solana Mainnet",
  ticker: "SOL",
  tickerName: "Solana",
  decimals: 9,
  blockExplorerUrl: "https://explorer.solana.com",
  logo: "https://images.web3auth.io/solana.svg",
};

describe("buildEvmWagmiChains", () => {
  it("filters non-EVM chains and maps hex chain ids to viem chains", () => {
    const { chains, transports } = buildEvmWagmiChains([solana, ethereum, sepolia], "0xaa36a7");

    expect(chains.map((chain) => chain.id)).toEqual([11_155_111, 1]);
    expect(chains[0]?.name).toBe("Sepolia");
    expect(chains[0]?.nativeCurrency.symbol).toBe("ETH");
    expect(chains[0]?.blockExplorers?.default.url).toBe("https://sepolia.etherscan.io");
    expect(
      Object.keys(transports)
        .map(Number)
        .sort((a, b) => a - b)
    ).toEqual([1, 11_155_111]);
  });

  it("throws when no EIP-155 chains are configured", () => {
    expect(() => buildEvmWagmiChains([solana])).toThrow(/No valid chains found/i);
  });

  it("rejects invalid hex chain ids", () => {
    expect(() =>
      buildEvmWagmiChains([
        {
          ...ethereum,
          chainId: "1",
        },
      ])
    ).toThrow(/valid chainId/i);
  });

  it("rejects chains without a valid rpc target", () => {
    expect(() =>
      buildEvmWagmiChains([
        {
          ...ethereum,
          rpcTarget: "not-a-url",
        },
      ])
    ).toThrow(/rpcTarget/i);
  });
});

describe("getEvmChainTransport", () => {
  it("orders websocket targets before http targets", () => {
    const transport = getEvmChainTransport(sepolia);
    expect(transport).toBeTypeOf("function");
  });
});
