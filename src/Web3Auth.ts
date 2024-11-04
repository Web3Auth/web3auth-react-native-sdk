import { SessionManager } from "@toruslabs/session-manager";
import {
  AUTH_ACTIONS,
  AuthSessionConfig,
  BaseLoginParams,
  BUILD_ENV,
  jsonToBase64,
  MFA_LEVELS,
  WEB3AUTH_NETWORK,
  WEB3AUTH_NETWORK_TYPE,
} from "@web3auth/auth";
import { type IProvider } from "@web3auth/base";
import clonedeep from "lodash.clonedeep";
import merge from "lodash.merge";
import log from "loglevel";
import URI from "urijs";

import { CHAIN_NAMESPACES } from "./constants";
import { InitializationError, LoginError, RequestError } from "./errors";
import KeyStore from "./session/KeyStore";
import { EncryptedStorage } from "./types/IEncryptedStorage";
import { SecureStore } from "./types/IExpoSecureStore";
import {
  AuthSessionData,
  ChainConfig,
  IWeb3Auth,
  ProjectConfigResponse,
  SdkInitParams,
  SdkLoginParams,
  State,
  WalletLoginParams,
} from "./types/interface";
import { IWebBrowser } from "./types/IWebBrowser";
import { constructURL, fetchProjectConfig, getHashQueryParams } from "./utils";

// import WebViewComponent from "./WebViewComponent";

class Web3Auth implements IWeb3Auth {
  public ready = false;

  private options: SdkInitParams;

  private webBrowser: IWebBrowser;

  private keyStore: KeyStore;

  private state: State;

  private sessionManager: SessionManager<AuthSessionData>;

  private addVersionInUrls = true;

  private privateKeyProvider: SdkInitParams["privateKeyProvider"];

  private accountAbstractionProvider?: SdkInitParams["accountAbstractionProvider"];

  constructor(webBrowser: IWebBrowser, storage: SecureStore | EncryptedStorage, options: SdkInitParams) {
    if (!options.clientId) throw InitializationError.invalidParams("clientId is required");
    if (!options.privateKeyProvider) {
      throw InitializationError.invalidParams("Please provide privateKeyProvider");
    }
    if (!options.network) options.network = WEB3AUTH_NETWORK.SAPPHIRE_MAINNET;
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
      if (Object.values(WEB3AUTH_NETWORK).includes(options.network as WEB3AUTH_NETWORK_TYPE))
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
    this.privateKeyProvider = options.privateKeyProvider;
    if (options.accountAbstractionProvider) {
      this.accountAbstractionProvider = options.accountAbstractionProvider;
    }
    this.state = {};
  }

  get connected(): boolean {
    return Boolean(this.sessionManager?.sessionId);
  }

  get provider(): IProvider | null {
    if (this.privateKeyProvider) {
      return this.accountAbstractionProvider ?? this.privateKeyProvider;
    }
    return null;
  }

  private get baseUrl(): string {
    // testing and develop don't have versioning
    if (!this.addVersionInUrls) return `${this.options.sdkUrl}`;
    return `${this.options.sdkUrl}/v9`;
  }

  private get walletSdkUrl(): string {
    if (!this.addVersionInUrls) return `${this.options.walletSdkURL}`;
    return `${this.options.walletSdkURL}/v3`;
  }

  set provider(_: IProvider | null) {
    throw new Error("Not implemented");
  }

  async init(): Promise<void> {
    if (
      !this.privateKeyProvider.currentChainConfig ||
      !this.privateKeyProvider.currentChainConfig.chainNamespace ||
      !this.privateKeyProvider.currentChainConfig.chainId
    ) {
      throw InitializationError.invalidParams("provider should have chainConfig and should be initialized with chainId and chainNamespace");
    }
    this.sessionManager = new SessionManager<AuthSessionData>({
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
    const { whitelabel, whitelist, key_export_enabled } = projectConfig;
    this.options.whiteLabel = merge(clonedeep(whitelabel), this.options.whiteLabel);
    this.options.originData = merge(clonedeep(whitelist.signed_urls), this.options.originData);
    //log.debug(`[Web3Auth] _config: ${JSON.stringify(this.options)}`);

    if (typeof key_export_enabled === "boolean") {
      this.privateKeyProvider.setKeyExportFlag(key_export_enabled);
    }

    const sessionId = await this.keyStore.get("sessionId");
    if (sessionId) {
      this.sessionManager.sessionId = sessionId;
      const data = await this.authorizeSession();
      if (Object.keys(data).length > 0) {
        this.updateState(data);
        const finalPrivKey = this.getFinalPrivKey();
        if (!finalPrivKey) return;
        await this.privateKeyProvider.setupProvider(finalPrivKey);
        // setup aa provider after private key provider is setup
        if (this.accountAbstractionProvider) {
          await this.accountAbstractionProvider.setupProvider(this.privateKeyProvider);
        }
      } else {
        await this.keyStore.remove("sessionId");
        this.updateState({});
      }
    }
    this.ready = true;
  }

  async login(loginParams: SdkLoginParams): Promise<IProvider | null> {
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

    const dataObject: AuthSessionConfig = {
      actionType: AUTH_ACTIONS.LOGIN,
      options: this.options,
      params: {
        ...loginParams,
        redirectUrl: loginParams.redirectUrl || this.options.redirectUrl,
      },
    };

    if (loginParams.redirectUrl) this.options.redirectUrl = loginParams.redirectUrl;
    const result = await this.authHandler(`${this.baseUrl}/start`, dataObject);

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

    if (!sessionData || Object.keys(sessionData).length === 0) {
      throw LoginError.loginFailed("Session data is missing");
    }

    if (sessionData.userInfo?.dappShare.length > 0) {
      const verifier = sessionData.userInfo?.aggregateVerifier || sessionData.userInfo?.verifier;
      await this.keyStore.set(verifier, sessionData.userInfo?.dappShare);
    }

    this.updateState(sessionData);

    const finalPrivKey = this.getFinalPrivKey();
    if (!finalPrivKey) throw LoginError.loginFailed("final private key not found");
    await this.privateKeyProvider.setupProvider(finalPrivKey);
    // setup aa provider after private key provider is setup
    if (this.accountAbstractionProvider) {
      await this.accountAbstractionProvider.setupProvider(this.privateKeyProvider);
    }

    return this.provider;
  }

  async logout(): Promise<void> {
    if (!this.sessionManager.sessionId) {
      throw LoginError.userNotLoggedIn();
    }
    const currentUserInfo = this.userInfo();

    await this.sessionManager.invalidateSession();
    await this.keyStore.remove("sessionId");

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

    const dataObject: Omit<AuthSessionConfig, "options"> & { options: SdkInitParams & { chainConfig: ChainConfig } } = {
      actionType: AUTH_ACTIONS.LOGIN,
      options: { ...this.options, chainConfig },
      params: {},
    };

    const url = `${this.walletSdkUrl}/${path}`;
    const loginId = SessionManager.generateRandomSessionKey();
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

    const dataObject: Omit<AuthSessionConfig, "options"> & { options: SdkInitParams & { chainConfig: ChainConfig } } = {
      actionType: AUTH_ACTIONS.LOGIN,
      options: { ...this.options, chainConfig },
      params: {},
    };

    const url = `${this.walletSdkUrl}/${path}`;
    const loginId = SessionManager.generateRandomSessionKey();
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

    const dataObject: AuthSessionConfig = {
      actionType: AUTH_ACTIONS.ENABLE_MFA,
      options: this.options,
      params: {
        ...loginParams,
        redirectUrl: loginParams.redirectUrl || this.options.redirectUrl,
        mfaLevel: "mandatory",
      },
      sessionId: this.sessionManager.sessionId,
    };

    const result = await this.authHandler(`${this.baseUrl}/start`, dataObject);

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
    if (this.connected) {
      return this.state.userInfo;
    }
    throw LoginError.userNotLoggedIn();
  }

  private updateState(newState: State) {
    this.state = { ...newState };
  }

  private async createLoginSession(loginId: string, data: AuthSessionConfig, timeout = 600): Promise<string> {
    if (!this.sessionManager) throw InitializationError.notInitialized();

    const loginSessionMgr = new SessionManager<AuthSessionConfig>({
      sessionServerBaseUrl: this.options.storageServerUrl,
      sessionNamespace: this.options.sessionNamespace,
      sessionTime: timeout, // each login key must be used with 10 mins (might be used at the end of popup redirect)
      sessionId: loginId,
    });

    await loginSessionMgr.createSession(JSON.parse(JSON.stringify(data)));

    return loginId;
  }

  private async authHandler(url: string, dataObject: AuthSessionConfig) {
    const loginId = SessionManager.generateRandomSessionKey();
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

  private async authorizeSession(): Promise<AuthSessionData> {
    try {
      const data = await this.sessionManager.authorizeSession({
        headers: {
          Origin: new URI(this.options.redirectUrl).origin(),
        },
      });
      return data;
    } catch (error: unknown) {
      return {};
    }
  }

  private getFinalPrivKey() {
    if (this.options.privateKeyProvider.currentChainConfig.chainNamespace === CHAIN_NAMESPACES.SOLANA) return this.getFinalEd25519PrivKey();
    return this.getFinalCommonPrivKey();
  }

  private getFinalCommonPrivKey() {
    let finalPrivKey = this.state.privKey;
    // coreKitKey is available only for custom verifiers by default
    if (this.options.useCoreKitKey) {
      // this is to check if the user has already logged in but coreKitKey is not available.
      // when useCoreKitKey is set to true.
      // This is to ensure that when there is no user session active, we don't throw an exception.
      if (this.state.privKey && !this.state.coreKitKey) {
        throw LoginError.coreKitKeyNotFound();
      }
      finalPrivKey = this.state.coreKitKey;
    }
    return finalPrivKey;
  }

  private getFinalEd25519PrivKey() {
    let finalPrivKey = this.state.ed25519PrivKey;
    // coreKitKey is available only for custom verifiers by default
    if (this.options.useCoreKitKey) {
      // this is to check if the user has already logged in but coreKitKey is not available.
      // when useCoreKitKey is set to true.
      // This is to ensure that when there is no user session active, we don't throw an exception.
      if (this.state.ed25519PrivKey && !this.state.coreKitEd25519PrivKey) {
        throw LoginError.coreKitKeyNotFound();
      }
      finalPrivKey = this.state.coreKitEd25519PrivKey;
    }
    return finalPrivKey;
  }
}

export default Web3Auth;
