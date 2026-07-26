import { type Connection } from "@web3auth/no-modal";

export interface IBaseWeb3AuthHookContext {
  isInitialized: boolean;
  isInitializing: boolean;
  initError: unknown;
  isConnected: boolean;
  isAuthorized: boolean;
  accessToken: string | null;
  isMFAEnabled: boolean;
  connection: Connection | null;
  setIsMFAEnabled(isMFAEnabled: boolean): void;
  /** Update citadel access token + authorization without a full session resync. */
  setAccessTokenState(token: string | null): void;
  /** Re-read citadel session fields from the core SDK into React context. */
  syncSessionState(): Promise<void>;
}
