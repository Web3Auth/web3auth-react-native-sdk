import { createSolanaRpc, type Rpc, type SolanaRpcApi } from "@solana/kit";
import type { Wallet } from "@wallet-standard/base";
import { CHAIN_NAMESPACES } from "@web3auth/no-modal";
import { useMemo } from "react";

import { useWeb3Auth } from "../../hooks/useWeb3Auth";

export type IUseSolanaWallet = {
  accounts: string[] | null;
  solanaWallet: Wallet | null;
  /**
   * Solana RPC client for making RPC calls.
   * @example
   * ```typescript
   * const { value: balance } = await rpc.getBalance(address("...")).send();
   * const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
   * ```
   */
  rpc: Rpc<SolanaRpcApi> | null;
};

export const useSolanaWallet = (): IUseSolanaWallet => {
  const { connection, web3Auth } = useWeb3Auth();

  const solanaWallet = useMemo(() => {
    return connection?.solanaWallet ?? null;
  }, [connection]);

  const chainNamespace = web3Auth?.currentChainNamespace;

  const accounts = useMemo((): string[] | null => {
    if (chainNamespace !== CHAIN_NAMESPACES.SOLANA || !solanaWallet) return null;
    const accts = solanaWallet.accounts.map((a) => a.address);
    return accts.length > 0 ? accts : null;
  }, [solanaWallet, chainNamespace]);

  const rpc = useMemo(() => {
    if (!web3Auth || !solanaWallet || chainNamespace !== CHAIN_NAMESPACES.SOLANA) return null;
    const rpcTarget = web3Auth.currentChain?.rpcTarget;
    if (!rpcTarget) return null;
    return createSolanaRpc(rpcTarget);
  }, [web3Auth, solanaWallet, chainNamespace]);

  return { solanaWallet, accounts, rpc };
};
