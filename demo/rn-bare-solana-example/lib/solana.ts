import { address, type Rpc, type SolanaRpcApi } from "@solana/kit";

// IMP START - Blockchain Calls
/**
 * Returns the SOL balance for the given address using the Solana RPC client
 * from `useSolanaWallet()`.
 */
export async function getSolanaBalance(rpc: Rpc<SolanaRpcApi>, accountAddress: string): Promise<string> {
  const { value: lamports } = await rpc.getBalance(address(accountAddress)).send();
  return `${(Number(lamports) / 1_000_000_000).toFixed(4)} SOL`;
}
// IMP END - Blockchain Calls
