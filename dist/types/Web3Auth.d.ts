import { IWebBrowser } from "./types/IWebBrowser";
import { SdkInitParams, SdkLoginParams, SdkLogoutParams } from "./types/sdk";
import { State } from "./types/State";
import { SecureStore } from "./types/IExpoSecureStore";
import { EncryptedStorage } from "./types/IEncryptedStorage";
import KeyStore from "./session/KeyStore";
declare class Web3Auth {
    initParams: SdkInitParams;
    webBrowser: IWebBrowser;
    keyStore: KeyStore;
    constructor(webBrowser: IWebBrowser, storage: SecureStore | EncryptedStorage, initParams: SdkInitParams);
    init(): Promise<State>;
    login(options: SdkLoginParams): Promise<State>;
    logout(options: SdkLogoutParams): Promise<void>;
    private request;
    authorizeSession(): Promise<State>;
    sessionTimeout(): Promise<void>;
}
export default Web3Auth;
