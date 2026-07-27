import { WalletOperationsError, Web3AuthError } from "@web3auth/no-modal";

/**
 * Coerce unknown signing failures into a real Web3AuthError with a numeric code.
 * Existing Web3AuthError instances (e.g. WalletInitializationError) are preserved.
 */
export function toWeb3AuthError(err: unknown): Web3AuthError {
  if (err instanceof Web3AuthError) return err;
  const message = err instanceof Error ? err.message : String(err);
  const cause = err instanceof Error ? err : undefined;
  return new WalletOperationsError(5000, message ? `Custom, ${message}` : "Custom", cause);
}
