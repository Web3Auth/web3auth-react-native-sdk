import { IBaseWeb3AuthHookContext } from "../base/hooks";
import { EncryptedStorage } from "../types/IEncryptedStorage";
import { SecureStore } from "../types/IExpoSecureStore";
import type { SdkInitParams } from "../types/interface";
import { IWebBrowser } from "../types/IWebBrowser";
import Web3Auth from "../Web3Auth";

export type Web3AuthContextConfig = {
  web3AuthOptions: SdkInitParams;
};

export interface Web3AuthProviderProps {
  webBrowser: IWebBrowser;
  storage: SecureStore | EncryptedStorage;
  config: Web3AuthContextConfig;
}

export interface IWeb3AuthInnerContext extends IBaseWeb3AuthHookContext {
  web3Auth: Web3Auth | null;
}

export type IWeb3AuthContext = IWeb3AuthInnerContext;
