import {
  BUILD_ENV,
  BaseLoginParams,
  MFA_LEVELS,
  OPENLOGIN_ACTIONS,
  OPENLOGIN_NETWORK,
  OpenloginSessionConfig,
  TORUS_LEGACY_NETWORK,
  TORUS_LEGACY_NETWORK_TYPE,
  jsonToBase64,
} from "@toruslabs/openlogin-utils";
import {
  ChainConfig,
  IWeb3Auth,
  OpenloginSessionData,
  ProjectConfigResponse,
  SdkInitParams,
  SdkLoginParams,
  State,
  WalletLoginParams,
} from "./types/interface";
import { InitializationError, LoginError, RequestError } from "./errors";
import { constructURL, fetchProjectConfig, getHashQueryParams } from "./utils";

import { EncryptedStorage } from "./types/IEncryptedStorage";
import { IWebBrowser } from "./types/IWebBrowser";
import KeyStore from "./session/KeyStore";
import { OpenloginSessionManager } from "@toruslabs/openlogin-session-manager";
import { SecureStore } from "./types/IExpoSecureStore";
import clonedeep from "lodash.clonedeep";
import log from "loglevel";
import merge from "lodash.merge";

// import WebViewComponent from "./WebViewComponent";

class Web3Auth implements IWeb3Auth {
  public ready = false;

  private options: SdkInitParams;

  private webBrowser: IWebBrowser;

  private keyStore: KeyStore;

  private state: State;

  private sessionManager: OpenloginSessionManager<OpenloginSessionData>;

  private addVersionInUrls = true;

  constructor(webBrowser: IWebBrowser, storage: SecureStore | EncryptedStorage, options: SdkInitParams) {
    if (!options.clientId) throw InitializationError.invalidParams("clientId is required");
    if (!options.network) options.network = OPENLOGIN_NETWORK.SAPPHIRE_MAINNET;
    if (!options.buildEnv) options.buildEnv = BUILD_ENV.PRODUCTION;
    if (options.buildEnv === BUILD_ENV.DEVELOPMENT || options.buildEnv === BUILD_ENV.TESTING || options.sdkUrl) this.addVersionInUrls = false;
    if (!options.sdkUrl && !options.useMpc) {
      if (options.buildEnv === BUILD_ENV.DEVELOPMENT) {
        options.sdkUrl = "http://localhost:3000";
        options.dashboardUrl = "http://localhost:5173/wallet/account";
      } else if (options.buildEnv === BUILD_ENV.STAGING) {
        options.sdkUrl = "https://staging-auth.web3auth.io";
        options.dashboardUrl = "https://staging-account.web3auth.io/wallet/account";
      } else if (options.buildEnv === BUILD_ENV.TESTING) {
        options.sdkUrl = "https://develop-auth.web3auth.io";
        options.dashboardUrl = "https://develop-account.web3auth.io/wallet/account";
      } else {
        options.sdkUrl = "https://auth.web3auth.io";
        options.dashboardUrl = "https://account.web3auth.io/wallet/account";
      }
    }

    if (options.useMpc && !options.sdkUrl) {
      if (Object.values(TORUS_LEGACY_NETWORK).includes(options.network as TORUS_LEGACY_NETWORK_TYPE))
        throw InitializationError.invalidParams("MPC is not supported on legacy networks, please use sapphire_devnet or sapphire_mainnet.");
      if (options.buildEnv === BUILD_ENV.DEVELOPMENT) {
        options.sdkUrl = "http://localhost:3000";
      } else if (options.buildEnv === BUILD_ENV.STAGING) {
        options.sdkUrl = "https://staging-mpc-auth.web3auth.io";
      } else if (options.buildEnv === BUILD_ENV.TESTING) {
        options.sdkUrl = "https://develop-mpc-auth.web3auth.io";
      } else {
        options.sdkUrl = "https://mpc-auth.web3auth.io";
      }
    }

    if (!options.walletSdkURL) {
      if (options.buildEnv === BUILD_ENV.DEVELOPMENT) {
        options.walletSdkURL = "http://localhost:4050";
      } else if (options.buildEnv === BUILD_ENV.STAGING) {
        options.walletSdkURL = "https://staging-wallet.web3auth.io";
      } else if (options.buildEnv === BUILD_ENV.TESTING) {
        options.walletSdkURL = "https://develop-wallet.web3auth.io";
      } else {
        options.walletSdkURL = "https://wallet.web3auth.io";
      }
    }
    if (!options.whiteLabel) options.whiteLabel = {};
    if (!options.loginConfig) options.loginConfig = {};
    if (!options.mfaSettings) options.mfaSettings = {};
    if (!options.storageServerUrl) options.storageServerUrl = "https://session.web3auth.io";
    if (!options.webauthnTransports) options.webauthnTransports = ["internal"];
    if (!options.sessionTime) options.sessionTime = 86400;
    if (typeof options.enableLogging === "undefined") options.enableLogging = false;
    if (options.enableLogging) {
      log.setLevel("debug");
    } else {
      log.setLevel("ERROR");
    }
    this.options = options;
    this.webBrowser = webBrowser;
    this.keyStore = new KeyStore(storage);
    this.state = {};
  }

  get privKey(): string {
    if (this.options.useMpc) return this.state.factorKey || "";
    if (this.options.useCoreKitKey) {
      // only throw error if privKey is there, but coreKitKey is not available.
      if (this.state.privKey && !this.state.coreKitKey)
        throw InitializationError.invalidParams("useCoreKitKey flag is enabled but coreKitKey is not available.");
      return this.state.coreKitKey || "";
    }
    return this.state.privKey || "";
  }

  get ed25519Key(): string {
    if (this.options.useCoreKitKey) {
      // only throw error if ed25519PrivKey is there, but coreKitEd25519PrivKey is not available.
      if (this.state.ed25519PrivKey && !this.state.coreKitEd25519PrivKey)
        throw LoginError.loginFailed("useCoreKitKey flag is enabled but coreKitEd25519PrivKey is not available.");
      return this.state.coreKitEd25519PrivKey || "";
    }
    return this.state.ed25519PrivKey || "";
  }

  private get baseUrl(): string {
    // testing and develop don't have versioning
    if (!this.addVersionInUrls) return `${this.options.sdkUrl}`;
    return `${this.options.sdkUrl}/v8`;
  }

  private get walletSdkUrl(): string {
    if (!this.addVersionInUrls) return `${this.options.walletSdkURL}`;
    return `${this.options.walletSdkURL}/v2`;
  }

  async init(): Promise<void> {
    this.sessionManager = new OpenloginSessionManager<OpenloginSessionData>({
      sessionServerBaseUrl: this.options.storageServerUrl,
      sessionTime: this.options.sessionTime,
      sessionNamespace: this.options.sessionNamespace,
    });

    let projectConfig: ProjectConfigResponse;
    try {
      projectConfig = await fetchProjectConfig(this.options.clientId, this.options.network);
    } catch (e) {
      throw new Error(`Error getting project config options, reason: ${e || "unknown"}`);
    }
    const { whitelabel, whitelist } = projectConfig;
    this.options.whiteLabel = merge(clonedeep(whitelabel), this.options.whiteLabel);
    this.options.originData = merge(clonedeep(whitelist.signed_urls), this.options.originData);
    //log.debug(`[Web3Auth] _config: ${JSON.stringify(this.options)}`);

    const sessionId = await this.keyStore.get("sessionId");
    if (sessionId) {
      this.sessionManager.sessionId = sessionId;
      const data = await this.authorizeSession();
      if (Object.keys(data).length > 0) {
        this.updateState({
          privKey: data.privKey,
          coreKitKey: data.coreKitKey,
          coreKitEd25519PrivKey: data.coreKitEd25519PrivKey,
          ed25519PrivKey: data.ed25519PrivKey,
          sessionId: data.sessionId,
          userInfo: data.userInfo,
        });
      } else {
        await this.keyStore.remove("sessionId");
        this.updateState({});
      }
    }
    this.ready = true;
  }

  async login(loginParams: SdkLoginParams): Promise<void> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!loginParams.redirectUrl && !this.options.redirectUrl) throw InitializationError.invalidParams("redirectUrl is required");
    if (!loginParams.loginProvider) throw InitializationError.invalidParams("loginProvider is required");

    // check for share
    if (this.options.loginConfig) {
      const loginConfigItem = Object.values(this.options.loginConfig)[0];
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
      options: this.options,
      params: {
        ...loginParams,
        redirectUrl: loginParams.redirectUrl || this.options.redirectUrl,
      },
    };

    this.options.redirectUrl = loginParams.redirectUrl;
    log.debug(`[Web3Auth] dataObject: ${JSON.stringify(dataObject)}`);
    const result = await this.openloginHandler(`${this.baseUrl}/start`, dataObject);

    if (result.type !== "success" || !result.url) {
      log.error(`[Web3Auth] login flow failed with error type ${result.type}`);
      throw LoginError.loginFailed(`login flow failed with error type ${result.type}`);
    }

    const { sessionId, sessionNamespace, error } = getHashQueryParams(result.url);
    if (error || !sessionId) {
      throw LoginError.loginFailed(error || "SessionId is missing");
    }

    if (sessionId) {
      await this.keyStore.set("sessionId", sessionId);
      this.sessionManager.sessionId = sessionId;
      this.sessionManager.sessionNamespace = sessionNamespace || "";
    }

    const sessionData = await this.authorizeSession();

    if (sessionData.userInfo?.dappShare.length > 0) {
      const verifier = sessionData.userInfo?.aggregateVerifier || sessionData.userInfo?.verifier;
      await this.keyStore.set(verifier, sessionData.userInfo?.dappShare);
    }

    this.updateState(sessionData);
  }

  async logout(): Promise<void> {
    if (!this.sessionManager.sessionId) {
      throw LoginError.userNotLoggedIn();
    }
    await this.sessionManager.invalidateSession();
    await this.keyStore.remove("sessionId");
    const currentUserInfo = this.userInfo();

    if (currentUserInfo.verifier && currentUserInfo.dappShare.length > 0) {
      await this.keyStore.remove(currentUserInfo.verifier);
    }

    this.updateState({
      privKey: "",
      coreKitKey: "",
      coreKitEd25519PrivKey: "",
      ed25519PrivKey: "",
      walletKey: "",
      oAuthPrivateKey: "",
      tKey: "",
      metadataNonce: "",
      keyMode: undefined,
      userInfo: {
        name: "",
        profileImage: "",
        dappShare: "",
        idToken: "",
        oAuthIdToken: "",
        oAuthAccessToken: "",
        appState: "",
        email: "",
        verifier: "",
        verifierId: "",
        aggregateVerifier: "",
        typeOfLogin: "",
        isMfaEnabled: false,
      },
      authToken: "",
      sessionId: "",
      factorKey: "",
      signatures: [],
      tssShareIndex: -1,
      tssPubKey: "",
      tssShare: "",
      tssNonce: -1,
    });
  }

  async launchWalletServices(chainConfig: ChainConfig, path: string | null = "wallet"): Promise<void> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!this.sessionManager.sessionId) {
      throw LoginError.userNotLoggedIn();
    }

    const dataObject: Omit<OpenloginSessionConfig, "options"> & { options: SdkInitParams & { chainConfig: ChainConfig } } = {
      actionType: OPENLOGIN_ACTIONS.LOGIN,
      options: { ...this.options, chainConfig },
      params: {},
    };

    const url = `${this.walletSdkUrl}/${path}`;
    const loginId = OpenloginSessionManager.generateRandomSessionKey();
    await this.createLoginSession(loginId, dataObject);

    const { sessionId } = this.sessionManager;
    const configParams: WalletLoginParams = {
      loginId,
      sessionId,
      platform: "react-native",
    };

    const loginUrl = constructURL({
      baseURL: url,
      hash: { b64Params: jsonToBase64(configParams) },
    });

    this.webBrowser.openAuthSessionAsync(loginUrl, this.options.redirectUrl);
  }

  async request(chainConfig: ChainConfig, method: string, params: unknown[], path: string = "wallet/request"): Promise<string> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!this.sessionManager.sessionId) {
      throw LoginError.userNotLoggedIn();
    }

    const dataObject: Omit<OpenloginSessionConfig, "options"> & { options: SdkInitParams & { chainConfig: ChainConfig } } = {
      actionType: OPENLOGIN_ACTIONS.LOGIN,
      options: { ...this.options, chainConfig },
      params: {},
    };

    const url = `${this.walletSdkUrl}/${path}`;
    const loginId = OpenloginSessionManager.generateRandomSessionKey();
    await this.createLoginSession(loginId, dataObject);

    const { sessionId } = this.sessionManager;
    const configParams: WalletLoginParams = {
      loginId,
      sessionId,
      request: {
        method,
        params,
      },
      platform: "react-native",
    };

    const loginUrl = constructURL({
      baseURL: url,
      hash: { b64Params: jsonToBase64(configParams) },
    });

    const result = await this.webBrowser.openAuthSessionAsync(loginUrl, this.options.redirectUrl);
    if (result.type !== "success" || !result.url) {
      log.error(`[Web3Auth] login flow failed with error type ${result.type}`);
      throw LoginError.loginFailed(`login flow failed with error type ${result.type}`);
    }

    const { success, result: requestResult, error } = getHashQueryParams(result.url);
    if (error || success === "false" || !success) {
      throw RequestError.fromCode(5000, error);
    }
    return requestResult;
  }

  async enableMFA(): Promise<boolean> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!this.sessionManager.sessionId) {
      throw LoginError.userNotLoggedIn();
    }
    if (this.state.userInfo.isMfaEnabled) {
      throw LoginError.mfaAlreadyEnabled();
    }
    const loginParams: SdkLoginParams = {
      loginProvider: this.state.userInfo?.typeOfLogin,
      mfaLevel: MFA_LEVELS.MANDATORY,
      extraLoginOptions: {
        login_hint: this.state.userInfo?.verifierId,
      },
      redirectUrl: this.options.redirectUrl,
    };

    const dataObject: OpenloginSessionConfig = {
      actionType: OPENLOGIN_ACTIONS.ENABLE_MFA,
      options: this.options,
      params: {
        ...loginParams,
        redirectUrl: loginParams.redirectUrl || this.options.redirectUrl,
        mfaLevel: "mandatory",
      },
      sessionId: this.sessionManager.sessionId,
    };

    const result = await this.openloginHandler(`${this.baseUrl}/start`, dataObject);

    if (result.type !== "success" || !result.url) {
      log.error(`[Web3Auth] enableMFA flow failed with error type ${result.type}`);
      throw LoginError.loginFailed(`enableMFA flow failed with error type ${result.type}`);
    }

    const { sessionId, sessionNamespace, error } = getHashQueryParams(result.url);
    if (error || !sessionId) {
      throw LoginError.loginFailed(error || "SessionId is missing");
    }

    if (sessionId) {
      await this.keyStore.set("sessionId", sessionId);
      this.sessionManager.sessionId = sessionId;
      this.sessionManager.sessionNamespace = sessionNamespace || "";
    }

    const sessionData = await this.authorizeSession();

    if (sessionData.userInfo?.dappShare.length > 0) {
      const verifier = sessionData.userInfo?.aggregateVerifier || sessionData.userInfo?.verifier;
      await this.keyStore.set(verifier, sessionData.userInfo?.dappShare);
    }

    this.updateState(sessionData);
    return Boolean(this.state.userInfo.isMfaEnabled);
  }

  public userInfo(): State["userInfo"] {
    if (this.privKey) {
      return this.state.userInfo;
    }
    throw LoginError.userNotLoggedIn();
  }

  private updateState(newState: State) {
    this.state = { ...newState };
  }

  private async createLoginSession(loginId: string, data: OpenloginSessionConfig, timeout = 600): Promise<string> {
    if (!this.sessionManager) throw InitializationError.notInitialized();

    const loginSessionMgr = new OpenloginSessionManager<OpenloginSessionConfig>({
      sessionServerBaseUrl: this.options.storageServerUrl,
      sessionNamespace: this.options.sessionNamespace,
      sessionTime: timeout, // each login key must be used with 10 mins (might be used at the end of popup redirect)
      sessionId: loginId,
    });

    await loginSessionMgr.createSession(JSON.parse(JSON.stringify(data)));

    return loginId;
  }

  private async openloginHandler(url: string, dataObject: OpenloginSessionConfig) {
    log.debug(`[Web3Auth] config passed: ${JSON.stringify(dataObject)}`);
    const loginId = OpenloginSessionManager.generateRandomSessionKey();
    await this.createLoginSession(loginId, dataObject);

    const configParams: BaseLoginParams = {
      loginId,
      sessionNamespace: this.options.sessionNamespace,
      storageServerUrl: this.options.storageServerUrl,
    };

    const loginUrl = constructURL({
      baseURL: url,
      hash: { b64Params: jsonToBase64(configParams) },
    });

    return this.webBrowser.openAuthSessionAsync(loginUrl, dataObject.params.redirectUrl);
  }

  private async authorizeSession(): Promise<OpenloginSessionData> {
    try {
      const data = await this.sessionManager.authorizeSession();
      return data;
    } catch (error: unknown) {
      return {};
    }
  }
}

export default Web3Auth;
