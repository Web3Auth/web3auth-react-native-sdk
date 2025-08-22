import { NodeDetailManager } from "@toruslabs/fetch-node-details";
import { SessionManager } from "@toruslabs/session-manager";
import { keccak256, Torus, TorusKey, VerifierParams } from "@toruslabs/torus.js";
import {
  AUTH_ACTIONS,
  AUTH_CONNECTION,
  AuthConnectionConfig,
  type AuthSessionConfig,
  AuthUserInfo,
  type BaseLoginParams,
  BUILD_ENV,
  jsonToBase64,
  MFA_LEVELS,
  WEB3AUTH_NETWORK,
  type WEB3AUTH_NETWORK_TYPE,
} from "@web3auth/auth";
import { type IProvider } from "@web3auth/base";
import { jwtDecode, JwtPayload } from "jwt-decode";
import clonedeep from "lodash.clonedeep";
import merge from "lodash.merge";
import unionBy from "lodash.unionby";
import URI from "urijs";

import { Analytics, ANALYTICS_EVENTS, ANALYTICS_INTEGRATION_TYPE, ANALYTICS_SDK_NAME, CHAIN_NAMESPACES, log, sdkVersion } from "./base";
import { InitializationError, LoginError, RequestError } from "./errors";
import KeyStore, { KEYSTORE_KEYS } from "./session/KeyStore";
import { EncryptedStorage } from "./types/IEncryptedStorage";
import { SecureStore } from "./types/IExpoSecureStore";
import {
  AggregateVerifierParams,
  AuthSessionData,
  type ChainsConfig,
  IWeb3Auth,
  type ProjectConfig,
  SdkInitParams,
  SdkLoginParams,
  type SmartAccountsConfig,
  State,
  SubVerifierInfo,
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

  private projectConfig?: ProjectConfig;

  private analytics: Analytics;

  private fetchNodeDetails: NodeDetailManager;

  private torusUtils: Torus;

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

    this.analytics = new Analytics();
    this.analytics.setGlobalProperties({ integration_type: ANALYTICS_INTEGRATION_TYPE.NATIVE_SDK });

    this.privateKeyProvider = options.privateKeyProvider;
    this.fetchNodeDetails = new NodeDetailManager({ network: this.options.network });
    this.torusUtils = new Torus({
      network: this.options.network,
      clientId: this.options.clientId,
      serverTimeOffset: 0,
      enableOneKey: true,
    });
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
    // init analytics
    const startTime = Date.now();
    this.analytics.init();
    this.analytics.identify({
      userId: this.options.clientId,
      traits: {
        web3auth_client_id: this.options.clientId,
        web3auth_network: this.options.network,
      },
    });
    this.analytics.setGlobalProperties({
      dapp_url: window.location.origin,
      sdk_name: ANALYTICS_SDK_NAME,
      sdk_version: sdkVersion,
      // Required for organization analytics
      web3auth_client_id: this.options.clientId,
      web3auth_network: this.options.network,
    });

    try {
      const isSFAValue = await this.keyStore.get(KEYSTORE_KEYS.IS_SFA);
      const isSFA = isSFAValue === "true";

      this.sessionManager = new SessionManager<AuthSessionData>({
        sessionServerBaseUrl: this.options.storageServerUrl,
        sessionTime: this.options.sessionTime,
        sessionNamespace: isSFA ? "sfa" : undefined,
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
      this.analytics.setGlobalProperties({ team_id: this.projectConfig.teamId });
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
          await this.keyStore.remove(KEYSTORE_KEYS.IS_SFA);
          this.updateState({});
        }
      }
      this.ready = true;

      this.analytics.track({
        event: ANALYTICS_EVENTS.SDK_INITIALIZATION_COMPLETED,
        properties: {
          default_chain_id: this.options.defaultChainId,
          chain_ids: this.projectConfig.chains.map((chain) => chain.chainId),
          chain_nameSpaces: [CHAIN_NAMESPACES.EIP155, CHAIN_NAMESPACES.SOLANA, CHAIN_NAMESPACES.OTHER],
          logging_enabled: this.options.enableLogging,
          auth_build_env: this.options.buildEnv,
          auth_mfa_settings: this.options.mfaSettings,
          whitelabel_logo_light_enabled: this.options.whiteLabel.logoLight != null,
          whitelabel_logo_dark_enabled: this.options.whiteLabel.logoDark != null,
          whitelabel_theme_mode: this.options.whiteLabel.theme,
          duration: Date.now() - startTime,
        },
      });
    } catch (e) {
      this.analytics.track({
        event: ANALYTICS_EVENTS.SDK_INITIALIZATION_FAILED,
        properties: {
          duration: Date.now() - startTime,
          error_message: `Fetch project config API error. ${e instanceof Error ? e.message : e}`,
        },
      });
      throw e;
    }
  }

  async logout(): Promise<void> {
    if (!this.sessionManager.sessionId) {
      throw LoginError.userNotLoggedIn();
    }

    this.analytics.track({
      event: ANALYTICS_EVENTS.LOGOUT_STARTED,
    });

    try {
      const currentUserInfo = this.userInfo();

      await this.sessionManager.invalidateSession();
      await this.keyStore.remove("sessionId");
      await this.keyStore.remove(KEYSTORE_KEYS.IS_SFA);

      if (currentUserInfo.authConnectionId && currentUserInfo.dappShare.length > 0) {
        const verifier = currentUserInfo.groupedAuthConnectionId || currentUserInfo.authConnectionId;
        await this.keyStore.remove(verifier);
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

      this.analytics.track({
        event: ANALYTICS_EVENTS.LOGOUT_COMPLETED,
      });
    } catch (e) {
      this.analytics.track({
        event: ANALYTICS_EVENTS.LOGOUT_FAILED,
        properties: {
          error_message: `Logout failed. ${e instanceof Error ? e.message : e}`,
        },
      });
      throw e;
    }
  }

  async launchWalletServices(path: string | null = "wallet"): Promise<void> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!this.sessionManager.sessionId) {
      throw LoginError.userNotLoggedIn();
    }

    if (!this.projectConfig?.chains) {
      throw InitializationError.invalidParams("Project config not found");
    }

    this.analytics.track({
      event: ANALYTICS_EVENTS.WALLET_UI_CLICKED,
    });

    try {
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
      const isSFAValue = await this.keyStore.get(KEYSTORE_KEYS.IS_SFA);
      const isSFA = isSFAValue === "true";

      const configParams: WalletLoginParams = {
        loginId,
        sessionId,
        platform: "react-native",
        sessionNamespace: isSFA ? "sfa" : undefined,
      };

      const loginUrl = constructURL({
        baseURL: url,
        hash: { b64Params: jsonToBase64(configParams) },
      });

      this.webBrowser.openAuthSessionAsync(loginUrl, this.options.redirectUrl);
    } catch (e) {
      this.analytics.track({
        event: ANALYTICS_EVENTS.WALLET_SERVICES_FAILED,
        properties: {
          error_message: `Wallet services failed. ${e instanceof Error ? e.message : e}`,
        },
      });
      throw e;
    }
  }

  async request(method: string, params: unknown[], path: string = "wallet/request"): Promise<string> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!this.sessionManager.sessionId) {
      throw LoginError.userNotLoggedIn();
    }

    if (!this.projectConfig?.chains) {
      throw InitializationError.invalidParams("Project config not found");
    }

    this.analytics.track({
      event: ANALYTICS_EVENTS.REQUEST_FUNCTION_STARTED,
    });

    const startTime = Date.now();

    try {
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

      this.analytics.track({
        event: ANALYTICS_EVENTS.REQUEST_FUNCTION_COMPLETED,
        properties: {
          duration: Date.now() - startTime,
        },
      });

      return requestResult;
    } catch (e) {
      this.analytics.track({
        event: ANALYTICS_EVENTS.REQUEST_FUNCTION_FAILED,
        properties: {
          error_message: `Request function failed. ${e instanceof Error ? e.message : e}`,
          duration: Date.now() - startTime,
        },
      });
      throw e;
    }
  }

  async enableMFA(): Promise<boolean> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!this.sessionManager.sessionId) {
      throw LoginError.userNotLoggedIn();
    }
    if (this.state.userInfo.isMfaEnabled) {
      throw LoginError.mfaAlreadyEnabled();
    }

    this.analytics.track({
      event: ANALYTICS_EVENTS.MFA_ENABLEMENT_STARTED,
      properties: {
        connector: "auth",
      },
    });

    try {
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

      this.analytics.track({
        event: ANALYTICS_EVENTS.MFA_ENABLEMENT_COMPLETED,
        properties: {
          connector: "auth",
        },
      });

      return Boolean(this.state.userInfo.isMfaEnabled);
    } catch (e) {
      this.analytics.track({
        event: ANALYTICS_EVENTS.MFA_ENABLEMENT_FAILED,
        properties: {
          error_message: `MFA enablement failed. ${e instanceof Error ? e.message : e}`,
        },
      });
      throw e;
    }
  }

  async manageMFA(): Promise<void> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!this.sessionManager.sessionId) {
      throw LoginError.userNotLoggedIn();
    }
    if (this.state.userInfo.isMfaEnabled) {
      throw LoginError.mfaAlreadyEnabled();
    }

    this.analytics.track({
      event: ANALYTICS_EVENTS.MFA_MANAGEMENT_STARTED,
      properties: {
        connector: "auth",
      },
    });
    try {
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
    } catch (e) {
      this.analytics.track({
        event: ANALYTICS_EVENTS.MFA_MANAGEMENT_FAILED,
        properties: {
          error_message: `MFA management failed. ${e instanceof Error ? e.message : e}`,
        },
      });
      throw e;
    }
  }

  public userInfo(): State["userInfo"] {
    if (this.connected) {
      return this.state.userInfo;
    }
    throw LoginError.userNotLoggedIn();
  }

  public async connectTo(loginParams: SdkLoginParams): Promise<IProvider | null> {
    const isSFA = !!loginParams.idToken;

    // recreate session manager with sfa option
    this.sessionManager = new SessionManager<AuthSessionData>({
      sessionServerBaseUrl: this.options.storageServerUrl,
      sessionTime: this.options.sessionTime,
      sessionNamespace: isSFA ? "sfa" : undefined,
    });

    if (isSFA) {
      await this.keyStore.set(KEYSTORE_KEYS.IS_SFA, "true");
      if (loginParams.groupedAuthConnectionId) {
        const aggregateLoginParams: SdkLoginParams = {
          authConnection: AUTH_CONNECTION.CUSTOM,
          authConnectionId: loginParams.groupedAuthConnectionId,
          idToken: loginParams.idToken,
        };
        const subVerifierInfoArray: SubVerifierInfo[] = [
          {
            verifier: loginParams.authConnectionId,
            idToken: loginParams.idToken,
          },
        ];
        await this.connect(aggregateLoginParams, subVerifierInfoArray);
      } else {
        await this.connect(loginParams);
      }
    } else {
      await this.login(loginParams);
    }

    const finalPrivKey = this.getFinalPrivKey();
    if (!finalPrivKey) throw LoginError.loginFailed("final private key not found");
    await this.privateKeyProvider.setupProvider(finalPrivKey);
    // setup aa provider after private key provider is setup
    if (this.accountAbstractionProvider) {
      await this.accountAbstractionProvider.setupProvider(this.privateKeyProvider);
    }

    return this.provider;
  }

  public setAnalyticsProperties(properties: Record<string, unknown>) {
    this.analytics.setGlobalProperties(properties);
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

  private async login(loginParams: SdkLoginParams): Promise<IProvider | null> {
    if (!this.ready) throw InitializationError.notInitialized("Please call init first.");
    if (!this.options.redirectUrl) throw InitializationError.invalidParams("redirectUrl is required");
    if (!loginParams.authConnection) throw InitializationError.invalidParams("authConnection is required");

    const analyticsProperties = {
      connector: "auth",
      auth_connection: loginParams.authConnection,
      auth_connection_id: loginParams.authConnectionId,
      group_auth_connection_id: loginParams.groupedAuthConnectionId,
      chain_id: this.options.defaultChainId,
      dapp_url: loginParams.dappUrl,
      chains: this.projectConfig.chains.map((chain) => chain.chainId),
    };
    this.analytics.track({
      event: ANALYTICS_EVENTS.CONNECTION_STARTED,
      properties: analyticsProperties,
    });

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

    this.analytics.track({
      event: ANALYTICS_EVENTS.CONNECTION_COMPLETED,
      properties: analyticsProperties,
    });

    return this.provider;
  }

  /**
   * Handle user SFA login.
   * @param loginParams - The login parameters.
   * @param subVerifierInfoArray - The sub-verifier information array.
   * @returns The connected user information.
   */
  private async connect(loginParams: SdkLoginParams, subVerifierInfoArray?: SubVerifierInfo[]) {
    const torusKey = await this.getTorusKey(loginParams, subVerifierInfoArray);
    const privateKey = torusKey.finalKeyData?.privKey ?? torusKey.oAuthKeyData?.privKey;
    const decodedUserInfo = jwtDecode<JwtPayload & { email?: string; name?: string; nickname?: string; picture?: string; user_id?: string }>(
      loginParams.idToken
    );
    const userInfo: AuthUserInfo = {
      email: decodedUserInfo.email,
      name: decodedUserInfo.name ?? decodedUserInfo.nickname,
      profileImage: decodedUserInfo.picture,
      userId: decodedUserInfo.user_id,
      authConnectionId: loginParams.authConnectionId,
      authConnection: AUTH_CONNECTION.CUSTOM,
      groupedAuthConnectionId: loginParams.groupedAuthConnectionId,
      oAuthIdToken: loginParams.idToken,
    };

    const signatures = this.getSessionSignatures(torusKey.sessionData);

    const authSessionData: AuthSessionData = {
      privKey: privateKey,
      userInfo,
      signatures,
    };
    const sessionId = SessionManager.generateRandomSessionKey();
    this.sessionManager.sessionId = sessionId;
    await this.sessionManager.createSession(authSessionData);
    await this.keyStore.set("sessionId", sessionId);

    this.updateState(authSessionData);
  }

  private async getTorusKey(loginParams: SdkLoginParams, subVerifierInfoArray?: SubVerifierInfo[]) {
    const userId = this.getUserIdFromJWT(loginParams.idToken);
    const { torusNodeEndpoints, torusNodePub, torusIndexes } = await this.fetchNodeDetails.getNodeDetails({
      verifier: loginParams.authConnectionId,
      verifierId: userId,
    });

    let retrieveSharesResponse: TorusKey;

    if (subVerifierInfoArray && subVerifierInfoArray.length > 0) {
      const aggregateIdTokenSeeds: string[] = [];
      const subVerifierIds: string[] = [];
      const verifyParams: { verifier_id: string; idtoken: string }[] = [];

      for (const subVerifierInfo of subVerifierInfoArray) {
        const subVerifierId = this.getUserIdFromJWT(subVerifierInfo.idToken);
        subVerifierIds.push(subVerifierId);
        aggregateIdTokenSeeds.push(subVerifierInfo.idToken);
        verifyParams.push({ verifier_id: userId, idtoken: subVerifierInfo.idToken });
      }

      aggregateIdTokenSeeds.sort();

      const verifierParams: AggregateVerifierParams = {
        verifier_id: userId,
        verify_params: verifyParams,
        sub_verifier_ids: subVerifierIds,
      };

      const separator = String.fromCharCode(29);
      const joined = aggregateIdTokenSeeds.join(separator);
      const aggregateIdToken = keccak256(Buffer.from(joined, "utf8")).replace(/^0x/, "");

      retrieveSharesResponse = await this.torusUtils.retrieveShares({
        endpoints: torusNodeEndpoints,
        nodePubkeys: torusNodePub,
        indexes: torusIndexes,
        verifier: loginParams.authConnectionId,
        verifierParams: verifierParams,
        idToken: aggregateIdToken,
      });
    } else {
      const verifierParams: VerifierParams = {
        verifier_id: userId,
      };
      retrieveSharesResponse = await this.torusUtils.retrieveShares({
        endpoints: torusNodeEndpoints,
        nodePubkeys: torusNodePub,
        indexes: torusIndexes,
        verifier: loginParams.authConnectionId,
        verifierParams: verifierParams,
        idToken: loginParams.idToken,
      });
    }

    const isUpgraded = retrieveSharesResponse.metadata?.upgraded;
    if (isUpgraded) {
      throw LoginError.mfaAlreadyEnabled();
    }

    return retrieveSharesResponse;
  }

  private getSessionSignatures(sessionData: TorusKey["sessionData"]): string[] {
    return sessionData.sessionTokenData.filter((i) => Boolean(i)).map((session) => JSON.stringify({ data: session.token, sig: session.signature }));
  }

  private getUserIdFromJWT(token: string): string {
    const decoded = jwtDecode<JwtPayload & { user_id: string }>(token);
    return decoded["user_id"];
  }

  private updateState(newState: State) {
    this.state = { ...newState };
  }

  private async createLoginSession(loginId: string, data: AuthSessionConfig, timeout = 600): Promise<string> {
    if (!this.sessionManager) throw InitializationError.notInitialized();

    const loginSessionMgr = new SessionManager<AuthSessionConfig>({
      sessionServerBaseUrl: this.options.storageServerUrl,
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
