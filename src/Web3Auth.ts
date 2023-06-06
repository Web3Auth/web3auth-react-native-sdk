import { OpenloginSessionManager } from "@toruslabs/openlogin-session-manager";
import base64url from "base64url";
import log from "loglevel";
import { URL } from "react-native-url-polyfill";

import KeyStore from "./session/KeyStore";
import { EncryptedStorage } from "./types/IEncryptedStorage";
import { SecureStore } from "./types/IExpoSecureStore";
import {
  CUSTOM_LOGIN_PROVIDER_TYPE,
  IWeb3Auth,
  LOGIN_PROVIDER_TYPE,
  OPENLOGIN_NETWORK,
  OpenloginSessionData,
  OpenloginUserInfo,
  SdkInitParams,
  SdkLoginParams,
  State,
} from "./types/interface";
import { IWebBrowser } from "./types/IWebBrowser";

class Web3Auth implements IWeb3Auth {
  private initParams: SdkInitParams;

  private webBrowser: IWebBrowser;

  private keyStore: KeyStore;

  private state: State;

  private sessionManager: OpenloginSessionManager<OpenloginSessionData>;

  constructor(webBrowser: IWebBrowser, storage: SecureStore | EncryptedStorage, initParams: SdkInitParams) {
    this.initParams = initParams;
    if (!this.initParams.sdkUrl) {
      const { network } = this.initParams;
      if (network === OPENLOGIN_NETWORK.TESTNET) {
        this.initParams.sdkUrl = "https://dev-sdk.openlogin.com";
      } else {
        this.initParams.sdkUrl = "https://sdk.openlogin.com";
      }
    }
    this.webBrowser = webBrowser;
    this.keyStore = new KeyStore(storage);
    this.state = {};
  }

  get privKey(): string {
    if (this.initParams.useCoreKitKey) {
      // only throw error if privKey is there, but coreKitKey is not available.
      if (this.state.privKey && !this.state.coreKitKey) throw new Error("useCoreKitKey flag is enabled but coreKitKey is not available.");
      return this.state.coreKitKey || "";
    }
    return this.state.privKey || "";
  }

  get ed25519Key(): string {
    if (this.initParams.useCoreKitKey) {
      // only throw error if ed25519PrivKey is there, but coreKitEd25519PrivKey is not available.
      if (this.state.ed25519PrivKey && !this.state.coreKitEd25519PrivKey)
        throw new Error("useCoreKitKey flag is enabled but coreKitEd25519PrivKey is not available.");
      return this.state.coreKitEd25519PrivKey || "";
    }
    return this.state.ed25519PrivKey || "";
  }

  async init(): Promise<void> {
    this.sessionManager = new OpenloginSessionManager<OpenloginSessionData>({
      sessionServerBaseUrl: this.initParams.storageServerUrl,
      sessionTime: this.initParams.sessionTime,
      sessionNamespace: this.initParams.sessionNamespace,
    });
    const sessionId = await this.keyStore.get("sessionId");
    if (sessionId) {
      this.sessionManager.sessionKey = sessionId;
      const data = await this._authorizeSession();
      if (Object.keys(data).length > 0) {
        this._syncState({
          privKey: data.privKey,
          coreKitKey: data.coreKitKey,
          coreKitEd25519PrivKey: data.coreKitEd25519PrivKey,
          ed25519PrivKey: data.ed25519PrivKey,
          sessionId: data.sessionId,
          userInfo: data.userInfo,
        });
      } else {
        await this.keyStore.remove("sessionId");
        this._syncState({});
      }
    }
  }

  async login(options: SdkLoginParams): Promise<void> {
    // check for share
    if (this.initParams.loginConfig) {
      const loginConfigItem = Object.values(this.initParams.loginConfig)[0];
      if (loginConfigItem) {
        const share = await this.keyStore.get(loginConfigItem.verifier);
        if (share) {
          options.dappShare = share;
        }
      }
    }

    const result = await this.request("login", options.redirectUrl, options);
    if (result.type !== "success" || !result.url) {
      log.error(`[Web3Auth] login flow failed with error type ${result.type}`);
      throw new Error(`login flow failed with error type ${result.type}`);
    }

    const fragment = new URL(result.url).hash;
    const decodedPayload = base64url.decode(fragment);
    const state = JSON.parse(decodedPayload) as State;

    if (state.sessionId) {
      await this.keyStore.set("sessionId", state.sessionId);
      this.sessionManager.sessionKey = state.sessionId;
    }

    if (state.userInfo?.dappShare.length > 0) {
      await this.keyStore.set(state.userInfo?.verifier, state.userInfo?.dappShare);
    }

    this._syncState({
      privKey: state.privKey,
      coreKitKey: state.coreKitKey,
      coreKitEd25519PrivKey: state.coreKitEd25519PrivKey,
      ed25519PrivKey: state.ed25519PrivKey,
      sessionId: state.sessionId,
      userInfo: state.userInfo,
    });
  }

  async logout(): Promise<void> {
    if (!this.sessionManager.sessionKey) {
      throw new Error("user should be logged in.");
    }
    await this.sessionManager.invalidateSession();
    await this.keyStore.remove("sessionId");
    const currentUserInfo = this.userInfo();

    if (currentUserInfo.verifier && currentUserInfo.dappShare.length > 0) {
      await this.keyStore.remove(currentUserInfo.verifier);
    }

    this._syncState({});
  }

  public userInfo(): State["userInfo"] {
    if (this.privKey) {
      const storeData = this.state.userInfo;
      const userInfo: OpenloginUserInfo = {
        email: (storeData.email as string) || "",
        name: (storeData.name as string) || "",
        profileImage: (storeData.profileImage as string) || "",
        aggregateVerifier: (storeData.aggregateVerifier as string) || "",
        verifier: (storeData.verifier as string) || "",
        verifierId: (storeData.verifierId as string) || "",
        typeOfLogin: (storeData.typeOfLogin as LOGIN_PROVIDER_TYPE | CUSTOM_LOGIN_PROVIDER_TYPE) || "",
        dappShare: (storeData.dappShare as string) || "",
        idToken: (storeData.idToken as string) || "",
        oAuthIdToken: (storeData.oAuthIdToken as string) || "",
        oAuthAccessToken: (storeData.oAuthAccessToken as string) || "",
      };

      return userInfo;
    }
    throw new Error("user should be logged in to fetch userInfo");
  }

  private _syncState(newState: State) {
    this.state = newState;
  }

  private async request(path: string, redirectUrl: string, params: Record<string, unknown> = {}) {
    const initParams = {
      ...this.initParams,
      clientId: this.initParams.clientId,
      network: this.initParams.network,
      ...(!!this.initParams.redirectUrl && {
        redirectUrl: this.initParams.redirectUrl,
      }),
    };

    const mergedParams = {
      init: initParams,
      params: {
        ...params,
        ...(!params.redirectUrl && { redirectUrl }),
      },
    };

    log.debug(`[Web3Auth] params passed to Web3Auth: ${mergedParams}`);

    const hash = base64url.encode(JSON.stringify(mergedParams));

    const url = new URL(this.initParams.sdkUrl);
    url.pathname = `${url.pathname}${path}`;
    url.hash = hash;

    log.info(`[Web3Auth] opening login screen in browser at ${url.href}, will redirect to ${redirectUrl}`);

    return this.webBrowser.openAuthSessionAsync(url.href, redirectUrl);
  }

  private async _authorizeSession(): Promise<OpenloginSessionData> {
    try {
      const data = await this.sessionManager.authorizeSession();
      return data;
    } catch (error: unknown) {
      return {};
    }
  }
}

export default Web3Auth;
