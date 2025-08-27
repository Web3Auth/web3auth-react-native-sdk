import { SessionManager } from "@toruslabs/session-manager";
import {
  AUTH_ACTIONS,
  AuthConnectionConfig,
  type AuthSessionConfig,
  type BaseLoginParams,
  BUILD_ENV,
  jsonToBase64,
  MFA_LEVELS,
  WEB3AUTH_NETWORK,
  type WEB3AUTH_NETWORK_TYPE,
} from "@web3auth/auth";
import { CHAIN_NAMESPACES, type ChainsConfig, type IProvider, type ProjectConfig, type SmartAccountsConfig } from "@web3auth/no-modal";
import clonedeep from "lodash.clonedeep";
import merge from "lodash.merge";
import unionBy from "lodash.unionby";
import log from "loglevel";
import URI from "urijs";

import { InitializationError, LoginError, RequestError } from "./errors";
import KeyStore from "./session/KeyStore";
import { EncryptedStorage } from "./types/IEncryptedStorage";
import { SecureStore } from "./types/IExpoSecureStore";
import { AuthSessionData, IWeb3Auth, SdkInitParams, SdkLoginParams, State, WalletLoginParams } from "./types/interface";
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

  private projectConfig?: ProjectConfig;

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
    if (!options.authConnectionConfig) options.authConnectionConfig = [];
    if (!options.mfaSettings) options.mfaSettings = {};
    if (!options.storageServerUrl) options.storageServerUrl = "https://session.web3auth.io";
    if (!options.sessionTime) options.sessionTime = 86400;
    if (typeof options.enableLogging === "undefined") options.enableLogging = false;
    if (options.enableLogging) {
      log.setLevel("debug");
    } else {
      log.setLevel("ERROR");
    }
    if (typeof options.includeUserDataInToken === "boolean") options.includeUserDataInToken = true;

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
    return `${this.options.sdkUrl}/v10`;
  }

  private get walletSdkUrl(): string {
    if (!this.addVersionInUrls) return `${this.options.walletSdkURL}`;
    return `${this.options.walletSdkURL}/v5`;
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

    try {
      this.projectConfig = await fetchProjectConfig(this.options.clientId, this.options.network, this.options.buildEnv);
    } catch (e) {
      throw new Error(`Error getting project config options, reason: ${e || "unknown"}`);
    }
    this.options.whiteLabel = merge(clonedeep(this.projectConfig.whitelabel), this.options.whiteLabel);
    this.initWalletServicesConfig(this.projectConfig);
    this.options.originData = merge(clonedeep(this.projectConfig.whitelist.signed_urls), this.options.originData);
    this.options.authConnectionConfig = unionBy(
      this.projectConfig.embeddedWalletAuth ?? [],
      this.options.authConnectionConfig ?? [],
      "authConnectionId"
    );

    if (typeof this.projectConfig.enableKeyExport === "boolean") {
      this.privateKeyProvider.setKeyExportFlag(this.projectConfig.enableKeyExport);
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
    if (!this.options.redirectUrl) throw InitializationError.invalidParams("redirectUrl is required");
    if (!loginParams.authConnection) throw InitializationError.invalidParams("authConnection is required");

    // check for share
    if (this.options.authConnectionConfig) {
      const authConnectionConfigItem = this.options.authConnectionConfig[0];
      if (authConnectionConfigItem) {
        const share = await this.keyStore.get(authConnectionConfigItem.authConnectionId);
        if (share) {
          loginParams.dappShare = share;
        }
      }
    }

    const dataObject: AuthSessionConfig = {
      actionType: AUTH_ACTIONS.LOGIN,
      options: this.options,
      params: loginParams,
    };

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
      const verifier = sessionData.userInfo?.groupedAuthConnectionId || sessionData.userInfo?.authConnectionId;
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

    if (currentUserInfo.authConnectionId && currentUserInfo.dappShare.length > 0) {
      await this.keyStore.remove(currentUserInfo.authConnectionId);
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
        userId: "",
        authConnection: "",
        authConnectionId: "",
        groupedAuthConnectionId: "",
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

  async launchWalletServices(path: string | null = "wallet"): Promise<void> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!this.sessionManager.sessionId) {
      throw LoginError.userNotLoggedIn();
    }

    if (!this.projectConfig?.chains) {
      throw InitializationError.invalidParams("Project config not found");
    }

    const dataObject: Omit<AuthSessionConfig, "options"> & {
      options: SdkInitParams & {
        chains: ChainsConfig;
        chainId: string;
        embeddedWalletAuth?: AuthConnectionConfig;
        accountAbstractionConfig: SmartAccountsConfig;
      };
    } = {
      actionType: AUTH_ACTIONS.LOGIN,
      options: {
        ...this.options,
        chains: this.projectConfig.chains,
        defaultChainId: this.projectConfig.chains?.[0]?.chainId ?? this.options.defaultChainId ?? "0x1",
        chainId: this.projectConfig.chains?.[0]?.chainId ?? this.options.defaultChainId ?? "0x1",
        embeddedWalletAuth: this.projectConfig.embeddedWalletAuth ?? undefined,
        accountAbstractionConfig: this.projectConfig.smartAccounts ?? undefined,
      },
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

  async request(method: string, params: unknown[], path: string = "wallet/request"): Promise<string> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!this.sessionManager.sessionId) {
      throw LoginError.userNotLoggedIn();
    }

    if (!this.projectConfig?.chains) {
      throw InitializationError.invalidParams("Project config not found");
    }

    const dataObject: Omit<AuthSessionConfig, "options"> & {
      options: SdkInitParams & {
        chains: ChainsConfig;
        chainId: string;
        accountAbstractionConfig: SmartAccountsConfig;
        embeddedWalletAuth: AuthConnectionConfig;
      };
    } = {
      actionType: AUTH_ACTIONS.LOGIN,
      options: {
        ...this.options,
        chains: this.projectConfig.chains,
        defaultChainId: this.projectConfig.chains?.[0]?.chainId ?? this.options.defaultChainId ?? "0x1",
        chainId: this.projectConfig.chains?.[0]?.chainId ?? this.options.defaultChainId ?? "0x1",
        accountAbstractionConfig: this.projectConfig.smartAccounts ?? undefined,
        embeddedWalletAuth: this.projectConfig.embeddedWalletAuth ?? undefined,
      },
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
      authConnection: this.state.userInfo?.authConnection,
      mfaLevel: MFA_LEVELS.MANDATORY,
      extraLoginOptions: {
        login_hint: this.state.userInfo?.userId,
      },
    };

    const dataObject: AuthSessionConfig = {
      actionType: AUTH_ACTIONS.ENABLE_MFA,
      options: this.options,
      params: {
        ...loginParams,
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
      const verifier = sessionData.userInfo?.groupedAuthConnectionId || sessionData.userInfo?.authConnectionId;
      await this.keyStore.set(verifier, sessionData.userInfo?.dappShare);
    }

    this.updateState(sessionData);
    return Boolean(this.state.userInfo.isMfaEnabled);
  }

  async manageMFA(): Promise<void> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!this.sessionManager.sessionId) {
      throw LoginError.userNotLoggedIn();
    }
    if (this.state.userInfo.isMfaEnabled) {
      throw LoginError.mfaAlreadyEnabled();
    }
    const loginParams: SdkLoginParams & { redirectUrl: string } = {
      authConnection: this.state.userInfo?.authConnection,
      mfaLevel: MFA_LEVELS.MANDATORY,
      extraLoginOptions: {
        login_hint: this.state.userInfo?.userId,
      },
      dappUrl: this.options.redirectUrl,
      redirectUrl: this.options.dashboardUrl,
    };

    const dataObject: AuthSessionConfig = {
      actionType: AUTH_ACTIONS.MANAGE_MFA,
      options: this.options,
      params: {
        ...loginParams,
        mfaLevel: "mandatory",
      },
      sessionId: this.sessionManager.sessionId,
    };

    const result = await this.authHandler(`${this.baseUrl}/start`, dataObject);

    if (result.type !== "success" || !result.url) {
      log.error(`[Web3Auth] manageMFA flow failed with error type ${result.type}`);
      throw LoginError.loginFailed(`manageMFA flow failed with error type ${result.type}`);
    }
  }

  public userInfo(): State["userInfo"] {
    if (this.connected) {
      return this.state.userInfo;
    }
    throw LoginError.userNotLoggedIn();
  }

  protected initWalletServicesConfig(projectConfig: ProjectConfig) {
    const { enableKeyExport, walletUi } = projectConfig;
    const {
      enablePortfolioWidget = false,
      enableTokenDisplay = true,
      enableNftDisplay = true,
      enableWalletConnect = true,
      enableBuyButton = true,
      enableSendButton = true,
      enableSwapButton = true,
      enableReceiveButton = true,
      enableShowAllTokensButton = true,
      enableConfirmationModal = false,
      portfolioWidgetPosition = "bottom-left",
      defaultPortfolio = "token",
    } = walletUi || {};
    const projectConfigWhiteLabel = {
      showWidgetButton: enablePortfolioWidget,
      hideNftDisplay: !enableNftDisplay,
      hideTokenDisplay: !enableTokenDisplay,
      hideTransfers: !enableSendButton,
      hideTopup: !enableBuyButton,
      hideReceive: !enableReceiveButton,
      hideSwap: !enableSwapButton,
      hideShowAllTokens: !enableShowAllTokensButton,
      hideWalletConnect: !enableWalletConnect,
      buttonPosition: portfolioWidgetPosition,
      defaultPortfolio,
    };
    const whiteLabel = merge(projectConfigWhiteLabel, this.options.walletServicesConfig?.whiteLabel || {});
    const confirmationStrategy = this.options.walletServicesConfig?.confirmationStrategy ?? (enableConfirmationModal ? "modal" : "auto-approve");
    const isKeyExportEnabled = this.options.walletServicesConfig?.enableKeyExport ?? enableKeyExport ?? true;
    this.options.walletServicesConfig = {
      ...this.options.walletServicesConfig,
      confirmationStrategy,
      whiteLabel: {
        ...whiteLabel,
        logoLight: whiteLabel?.logoLight || "",
        logoDark: whiteLabel?.logoDark || "",
      },
      enableKeyExport: isKeyExportEnabled,
    };
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

    return this.webBrowser.openAuthSessionAsync(loginUrl, this.options.redirectUrl);
  }

  private async authorizeSession(): Promise<AuthSessionData> {
    try {
      const data = await this.sessionManager.authorizeSession({
        headers: {
          Origin: new URI(this.options.redirectUrl).origin(),
        },
      });
      return data;
    } catch {
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
