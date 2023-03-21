import { getPublic, sign } from "@toruslabs/eccrypto";
import { decryptData, encryptData, keccak256 } from "@toruslabs/metadata-helpers";
import base64url from "base64url";
import log from "loglevel";
import { URL } from "react-native-url-polyfill";

import { ShareMetadata } from "./api/model";
import { Web3AuthApi } from "./api/Web3AuthApi";
import KeyStore from "./session/KeyStore";
import { EncryptedStorage } from "./types/IEncryptedStorage";
import { SecureStore } from "./types/IExpoSecureStore";
import { IWebBrowser } from "./types/IWebBrowser";
import {
  CUSTOM_LOGIN_PROVIDER_TYPE,
  IWeb3Auth,
  LOGIN_PROVIDER_TYPE,
  OPENLOGIN_NETWORK,
  OpenloginUserInfo,
  SdkInitParams,
  SdkLoginParams,
  SdkLogoutParams,
} from "./types/sdk";
import { SessionData, State } from "./types/State";

(process as any).browser = true;

class Web3Auth implements IWeb3Auth {
  private initParams: SdkInitParams;

  private webBrowser: IWebBrowser;

  private keyStore: KeyStore;

  private state: State;

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
      if (!this.state.coreKitKey) throw new Error("useCoreKitKey flag is enabled but coreKitKey is not available.");
      return this.state.coreKitKey;
    }
    return this.state.privKey;
  }

  get ed25519Key(): string {
    if (this.initParams.useCoreKitKey) {
      if (!this.state.coreKitEd25519PrivKey) throw new Error("useCoreKitKey flag is enabled but coreKitEd25519PrivKey is not available.");
      return this.state.coreKitEd25519PrivKey;
    }
    return this.state.ed25519PrivKey;
  }

  get userInfo(): State["userInfo"] {
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

  async init(): Promise<boolean> {
    return this.authorizeSession();
  }

  async login(options: SdkLoginParams): Promise<boolean> {
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

    await this.keyStore.set("sessionId", state?.sessionId);

    if (state.userInfo?.dappShare.length > 0) {
      this.keyStore.set(state.userInfo?.verifier, state.userInfo?.dappShare);
    }

    this._syncState(state);

    return true;
  }

  async logout(options: SdkLogoutParams): Promise<boolean> {
    this.sessionTimeout();
    const result = await this.request("logout", options.redirectUrl, options);
    if (result.type !== "success" || !result.url) {
      log.error(`[Web3Auth] logout flow failed with error type ${result.type}`);
      throw new Error(`logout flow failed with error type ${result.type}`);
    }
    this._syncState({
      privKey: "",
      coreKitKey: "",
      coreKitEd25519PrivKey: "",
      ed25519PrivKey: "",
      userInfo: {
        email: "",
        name: "",
        profileImage: "",
        dappShare: "",
        idToken: "",
        oAuthIdToken: "",
        oAuthAccessToken: "",
        aggregateVerifier: "",
        verifier: "",
        verifierId: "",
        typeOfLogin: "",
      },
    });
    return true;
  }

  private async authorizeSession(): Promise<boolean> {
    const sessionId = await this.keyStore.get("sessionId");
    if (sessionId && sessionId.length > 0) {
      const pubKey = getPublic(Buffer.from(sessionId, "hex")).toString("hex");
      const response = await Web3AuthApi.authorizeSession(pubKey);

      const web3AuthResponse = await decryptData<SessionData>(sessionId, response.message);
      web3AuthResponse.userInfo = web3AuthResponse.store;
      delete web3AuthResponse.store;
      if (!web3AuthResponse.error) {
        if (web3AuthResponse.privKey && web3AuthResponse.privKey.length > 0) {
          this._syncState(web3AuthResponse);
          return true;
        }
      } else {
        throw new Error(`session recovery failed with error ${web3AuthResponse.error}`);
      }
    }
  }

  private async sessionTimeout() {
    const sessionId = await this.keyStore.get("sessionId");
    if (sessionId && sessionId.length > 0) {
      const pubKey = getPublic(Buffer.from(sessionId, "hex")).toString("hex");
      const response = await Web3AuthApi.authorizeSession(pubKey);
      if (!response.success) {
        return;
      }
      const shareMetadata = JSON.parse(response.message) as ShareMetadata;
      const encryptedData = await encryptData(sessionId, "");
      const encryptedMetadata: ShareMetadata = {
        ...shareMetadata,
        ciphertext: encryptedData,
      };
      const jsonData = JSON.stringify(encryptedMetadata);
      const hashData = keccak256(jsonData);
      try {
        await Web3AuthApi.logout({
          key: getPublic(Buffer.from(sessionId, "hex")).toString("hex"),
          data: jsonData,
          signature: (await sign(Buffer.from(sessionId, "hex"), hashData)).toString("hex"),
          timeout: 1,
        });

        this.keyStore.remove("sessionId");

        if (this.initParams.loginConfig) {
          const loginConfigItem = Object.values(this.initParams.loginConfig)[0];
          if (loginConfigItem) {
            this.keyStore.remove(loginConfigItem.verifier);
          }
        }
      } catch (ex) {
        log.error(ex);
      }
    }
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
}

export default Web3Auth;
