import { type IProvider } from "@web3auth/no-modal";

export interface IBaseWeb3AuthHookContext {
  isInitialized: boolean;
  isInitializing: boolean;
  initError: unknown;
  isConnected: boolean;
  isMFAEnabled: boolean;
  provider: IProvider | null;
  setIsMFAEnabled(isMFAEnabled: boolean): void;
}
