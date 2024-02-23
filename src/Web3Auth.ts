import {
  BUILD_ENV,
  BaseLoginParams,
  MFA_LEVELS,
  OPENLOGIN_ACTIONS,
  OPENLOGIN_NETWORK,
  OpenloginSessionConfig,
  jsonToBase64,
} from "@toruslabs/openlogin-utils";
import {
  CUSTOM_LOGIN_PROVIDER_TYPE,
  IWeb3Auth,
  LOGIN_PROVIDER_TYPE,
  OpenloginSessionData,
  OpenloginUserInfo,
  SdkInitParams,
  SdkLoginParams,
  State,
  WalletLoginParams,
} from "./types/interface";
import { InitializationError, LoginError } from "./errors";
import { constructURL, extractHashValues } from "./utils";

import { EncryptedStorage } from "./types/IEncryptedStorage";
import { IWebBrowser } from "./types/IWebBrowser";
import KeyStore from "./session/KeyStore";
import { OpenloginSessionManager } from "@toruslabs/openlogin-session-manager";
import { SecureStore } from "./types/IExpoSecureStore";
import log from "loglevel";

class Web3Auth implements IWeb3Auth {
  public ready = false;

  private initParams: SdkInitParams;

  private webBrowser: IWebBrowser;

  private keyStore: KeyStore;

  private state: State;

  private sessionManager: OpenloginSessionManager<OpenloginSessionData>;

  constructor(webBrowser: IWebBrowser, storage: SecureStore | EncryptedStorage, initParams: SdkInitParams) {
    if (!initParams.clientId) throw InitializationError.invalidParams("clientId is required");
    if (!initParams.network) initParams.network = OPENLOGIN_NETWORK.SAPPHIRE_MAINNET;
    if (!initParams.buildEnv) initParams.buildEnv = BUILD_ENV.PRODUCTION;
    if (!initParams.sdkUrl) {
      if (initParams.buildEnv === BUILD_ENV.DEVELOPMENT) {
        initParams.sdkUrl = "http://localhost:3000";
      } else if (initParams.buildEnv === BUILD_ENV.STAGING) {
        initParams.sdkUrl = "https://staging-auth.web3auth.io";
      } else if (initParams.buildEnv === BUILD_ENV.TESTING) {
        initParams.sdkUrl = "https://develop-auth.web3auth.io";
      } else {
        initParams.sdkUrl = "https://auth.web3auth.io";
      }
    }
    if (!initParams.walletSdkURL) {
      if (initParams.buildEnv === BUILD_ENV.DEVELOPMENT) {
        initParams.walletSdkURL = "http://localhost:3000";
      } else if (initParams.buildEnv === BUILD_ENV.STAGING) {
        initParams.walletSdkURL = "https://staging-wallet.web3auth.io";
      } else if (initParams.buildEnv === BUILD_ENV.TESTING) {
        initParams.walletSdkURL = "https://develop-wallet.web3auth.io";
      } else {
        initParams.walletSdkURL = "https://wallet.web3auth.io";
      }
    }
    if (!initParams.whiteLabel) initParams.whiteLabel = {};
    if (!initParams.loginConfig) initParams.loginConfig = {};
    if (!initParams.mfaSettings) initParams.mfaSettings = {};
    if (!initParams.storageServerUrl) initParams.storageServerUrl = "https://broadcast-server.tor.us";
    if (!initParams.storageKey) initParams.storageKey = "local";
    if (!initParams.webauthnTransports) initParams.webauthnTransports = ["internal"];
    if (!initParams.sessionTime) initParams.sessionTime = 86400;
    if (typeof initParams.enableLogging === "undefined") initParams.enableLogging = false;
    if (initParams.enableLogging) {
      log.setLevel("debug");
    } else {
      log.setLevel("ERROR");
    }
    this.initParams = initParams;
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

  private get baseUrl(): string {
    // testing and develop don't have versioning
    if (this.initParams.buildEnv === BUILD_ENV.DEVELOPMENT || this.initParams.buildEnv === BUILD_ENV.TESTING) return `${this.initParams.sdkUrl}`;
    return `${this.initParams.sdkUrl}/v7`;
  }

  private get walletSdkUrl(): string {
    if (this.initParams.buildEnv === BUILD_ENV.DEVELOPMENT || this.initParams.buildEnv === BUILD_ENV.TESTING)
      return `${this.initParams.walletSdkURL}`;
    return `${this.initParams.walletSdkURL}/v1`;
  }

  async init(): Promise<void> {
    this.sessionManager = new OpenloginSessionManager<OpenloginSessionData>({
      sessionServerBaseUrl: this.initParams.storageServerUrl,
      sessionTime: this.initParams.sessionTime,
      sessionNamespace: this.initParams.sessionNamespace,
    });
    const sessionId = await this.keyStore.get("sessionId");
    if (sessionId) {
      this.sessionManager.sessionId = sessionId;
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
    this.ready = true;
  }

  async login(loginParams: SdkLoginParams): Promise<void> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!loginParams.redirectUrl && !this.initParams.redirectUrl) throw InitializationError.invalidParams("redirectUrl is required");
    if (!loginParams.loginProvider) throw InitializationError.invalidParams("loginProvider is required");

    // check for share
    if (this.initParams.loginConfig) {
      const loginConfigItem = Object.values(this.initParams.loginConfig)[0];
      if (loginConfigItem) {
        const share = await this.keyStore.get(loginConfigItem.verifier);
        if (share) {
          // eslint-disable-next-line require-atomic-updates
          loginParams.dappShare = share;
        }
      }
    }

    const dataObject: OpenloginSessionConfig = {
      actionType: OPENLOGIN_ACTIONS.LOGIN,
      options: this.initParams,
      params: {
        ...loginParams,
        redirectUrl: loginParams.redirectUrl || this.initParams.redirectUrl,
      },
    };

    this.initParams.redirectUrl = loginParams.redirectUrl;

    const result = await this.openloginHandler(`${this.baseUrl}/start`, dataObject);

    if (result.type !== "success" || !result.url) {
      log.error(`[Web3Auth] login flow failed with error type ${result.type}`);
      throw new Error(`login flow failed with error type ${result.type}`);
    }

    const { sessionId, sessionNamespace, error } = extractHashValues(result.url);
    if (error || !sessionId) {
      throw LoginError.loginFailed(error || "SessionId is missing");
    }

    if (sessionId) {
      await this.keyStore.set("sessionId", sessionId);
      this.sessionManager.sessionId = sessionId;
      this.sessionManager.sessionNamespace = sessionNamespace || "";
    }

    const sessionData = await this._authorizeSession();

    if (sessionData.userInfo?.dappShare.length > 0) {
      const verifier = sessionData.userInfo?.aggregateVerifier || sessionData.userInfo?.verifier;
      await this.keyStore.set(verifier, sessionData.userInfo?.dappShare);
    }

    this._syncState({
      privKey: sessionData.privKey,
      coreKitKey: sessionData.coreKitKey,
      coreKitEd25519PrivKey: sessionData.coreKitEd25519PrivKey,
      ed25519PrivKey: sessionData.ed25519PrivKey,
      sessionId: sessionData.sessionId,
      userInfo: sessionData.userInfo,
    });
  }

  async logout(): Promise<void> {
    if (!this.sessionManager.sessionId) {
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

  async launchWalletServices(loginParams: SdkLoginParams, path: string | null = "wallet"): Promise<void> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!this.sessionManager.sessionId) {
      throw new Error("user should be logged in.");
    }

    const dataObject: OpenloginSessionConfig = {
      actionType: OPENLOGIN_ACTIONS.LOGIN,
      options: this.initParams,
      params: {
        ...loginParams,
        redirectUrl: loginParams.redirectUrl || this.initParams.redirectUrl,
      },
    };

    const url = `${this.walletSdkUrl}/${path}`;
    log.debug("url => ", url);
    log.debug(`[Web3Auth] config passed: ${JSON.stringify(dataObject)}`);
    const loginId = await this.getLoginId(dataObject);

    const { sessionId } = this.sessionManager;
    const configParams: WalletLoginParams = {
      loginId,
      sessionId,
    };

    const loginUrl = constructURL({
      baseURL: url,
      hash: { b64Params: jsonToBase64(configParams) },
    });

    this.webBrowser.openAuthSessionAsync(loginUrl, dataObject.params.redirectUrl);
  }

  async enableMFA(): Promise<void> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!this.sessionManager.sessionId) {
      throw new Error("user should be logged in.");
    }

    const loginParams: SdkLoginParams = {
      loginProvider: this.state.userInfo?.typeOfLogin,
      mfaLevel: MFA_LEVELS.MANDATORY,
      extraLoginOptions: {
        login_hint: this.state.userInfo?.verifierId,
      },
      redirectUrl: this.initParams.redirectUrl,
    };

    const dataObject: OpenloginSessionConfig = {
      actionType: OPENLOGIN_ACTIONS.ENABLE_MFA,
      options: this.initParams,
      params: {
        ...loginParams,
        redirectUrl: loginParams.redirectUrl || this.initParams.redirectUrl,
      },
      sessionId: this.sessionManager.sessionId,
    };

    const result = await this.openloginHandler(`${this.baseUrl}/start`, dataObject);

    if (result.type !== "success" || !result.url) {
      log.error(`[Web3Auth] enableMFA flow failed with error type ${result.type}`);
      throw new Error(`enableMFA flow failed with error type ${result.type}`);
    }

    const { sessionId, sessionNamespace, error } = extractHashValues(result.url);
    if (error || !sessionId) {
      throw LoginError.loginFailed(error || "SessionId is missing");
    }

    if (sessionId) {
      await this.keyStore.set("sessionId", sessionId);
      this.sessionManager.sessionId = sessionId;
      this.sessionManager.sessionNamespace = sessionNamespace || "";
    }

    const sessionData = await this._authorizeSession();

    if (sessionData.userInfo?.dappShare.length > 0) {
      const verifier = sessionData.userInfo?.aggregateVerifier || sessionData.userInfo?.verifier;
      await this.keyStore.set(verifier, sessionData.userInfo?.dappShare);
    }

    this._syncState({
      privKey: sessionData.privKey,
      coreKitKey: sessionData.coreKitKey,
      coreKitEd25519PrivKey: sessionData.coreKitEd25519PrivKey,
      ed25519PrivKey: sessionData.ed25519PrivKey,
      sessionId: sessionData.sessionId,
      userInfo: sessionData.userInfo,
    });
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

  private async getLoginId(data: OpenloginSessionConfig): Promise<string> {
    if (!this.sessionManager) throw InitializationError.notInitialized();

    const loginId = OpenloginSessionManager.generateRandomSessionKey();
    const loginSessionMgr = new OpenloginSessionManager<OpenloginSessionConfig>({
      sessionServerBaseUrl: this.initParams.storageServerUrl,
      sessionNamespace: "",
      sessionTime: 600, // each login key must be used with 10 mins (might be used at the end of popup redirect)
      sessionId: loginId,
    });

    await loginSessionMgr.createSession(JSON.parse(JSON.stringify(data)));

    return loginId;
  }

  private async openloginHandler(url: string, dataObject: OpenloginSessionConfig) {
    log.debug(`[Web3Auth] config passed: ${JSON.stringify(dataObject)}`);
    const loginId = await this.getLoginId(dataObject);

    const configParams: BaseLoginParams = {
      loginId,
      sessionNamespace: "",
    };

    const loginUrl = constructURL({
      baseURL: url,
      hash: { b64Params: jsonToBase64(configParams) },
    });

    return this.webBrowser.openAuthSessionAsync(loginUrl, dataObject.params.redirectUrl);
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
