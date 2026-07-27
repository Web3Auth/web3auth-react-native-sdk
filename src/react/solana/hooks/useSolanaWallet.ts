import { createSolanaRpc, type Rpc, type SolanaRpcApi } from "@solana/kit";
import type { Wallet } from "@wallet-standard/base";
import { StandardEvents, type StandardEventsFeature } from "@wallet-standard/features";
import { CHAIN_NAMESPACES } from "@web3auth/no-modal";
import { useEffect, useMemo, useState } from "react";

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

function readAccounts(wallet: Wallet | null, chainNamespace: string | undefined): string[] | null {
  if (chainNamespace !== CHAIN_NAMESPACES.SOLANA || !wallet) return null;
  const accts = wallet.accounts.map((a) => a.address);
  return accts.length > 0 ? accts : null;
}

export const useSolanaWallet = (): IUseSolanaWallet => {
  const { connection, web3Auth } = useWeb3Auth();

  const solanaWallet = useMemo(() => {
    return connection?.solanaWallet ?? null;
  }, [connection]);

  const chainNamespace = web3Auth?.currentChainNamespace;

  const [accounts, setAccounts] = useState<string[] | null>(() => readAccounts(solanaWallet, chainNamespace));

  useEffect(() => {
    setAccounts(readAccounts(solanaWallet, chainNamespace));

    if (!solanaWallet || chainNamespace !== CHAIN_NAMESPACES.SOLANA) return;

    const events = solanaWallet.features?.[StandardEvents] as StandardEventsFeature[typeof StandardEvents] | undefined;
    if (!events?.on) return;

    return events.on("change", () => {
      setAccounts(readAccounts(solanaWallet, chainNamespace));
    });
  }, [solanaWallet, chainNamespace]);

  const rpc = useMemo(() => {
    if (!web3Auth || !solanaWallet || chainNamespace !== CHAIN_NAMESPACES.SOLANA) return null;
    const rpcTarget = web3Auth.currentChain?.rpcTarget;
    if (!rpcTarget) return null;
    return createSolanaRpc(rpcTarget);
  }, [web3Auth, solanaWallet, chainNamespace]);

  return { solanaWallet, accounts, rpc };
};
