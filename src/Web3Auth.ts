import { createKeyPairFromBytes } from "@solana/keys";
import { createSignerFromKeyPair, type TransactionSigner } from "@solana/signers";
import { CITADEL_SERVER_MAP, STORAGE_SERVER_MAP, STORAGE_SERVER_SOCKET_URL_MAP } from "@toruslabs/constants";
import { NodeDetailManager } from "@toruslabs/fetch-node-details";
import { add0x, type Hex } from "@toruslabs/metadata-helpers";
import { AuthSessionManager, StorageManager } from "@toruslabs/session-manager";
import { keccak256, Torus, TorusKey, VerifierParams } from "@toruslabs/torus.js";
import {
  AUTH_ACTIONS,
  AUTH_CONNECTION,
  AuthConnectionConfig,
  type AuthRequestPayload,
  AuthUserInfo,
  type BaseLoginParams,
  BUILD_ENV,
  getED25519Key,
  jsonToBase64,
  MFA_LEVELS,
  serializeError,
  version,
  WEB3AUTH_NETWORK,
} from "@web3auth/auth";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import type {
  AccountAbstractionMultiChainConfig,
  AccountAbstractionProvider,
  ChainNamespaceType,
  IBaseProvider,
  IProvider,
  SmartAccountsConfig,
} from "@web3auth/no-modal";
import { accountAbstractionProvider, CommonJRPCProvider } from "@web3auth/no-modal";
import { WsEmbedParams } from "@web3auth/ws-embed";
import deepmerge from "deepmerge";
import { ethers, JsonRpcProvider, Wallet } from "ethers";
import { jwtDecode, JwtPayload } from "jwt-decode";
import clonedeep from "lodash.clonedeep";
import merge from "lodash.merge";
import unionBy from "lodash.unionby";
import URI from "urijs";

import { Analytics, ANALYTICS_EVENTS, ANALYTICS_INTEGRATION_TYPE, ANALYTICS_SDK_NAME, CHAIN_NAMESPACES, log, sdkVersion } from "./base";
import { InitializationError, LoginError, RequestError } from "./errors";
import KeyStore, { KEYSTORE_KEYS } from "./session/KeyStore";
import KeyStoreAdapter from "./session/KeyStoreAdapter";
import { EncryptedStorage } from "./types/IEncryptedStorage";
import { SecureStore } from "./types/IExpoSecureStore";
import {
  AggregateVerifierParams,
  AuthSessionData,
  type ChainsConfig,
  IWeb3Auth,
  type ProjectConfig,
  ProviderConfig,
  SdkInitParams,
  SdkLoginParams,
  State,
  SubVerifierInfo,
  WalletLoginParams,
  WalletResult,
} from "./types/interface";
import { IWebBrowser } from "./types/IWebBrowser";
import { constructURL, fetchProjectConfig, generateRecordId, getHashQueryParams } from "./utils";

// Inlined from @web3auth/no-modal/base/utils to avoid loading the barrel file
const isHexStrict = (hex: unknown): boolean => (typeof hex === "string" || typeof hex === "number") && /^(-)?0x[0-9a-f]*$/i.test(String(hex));

// import WebViewComponent from "./WebViewComponent";

class Web3Auth implements IWeb3Auth {
  public ready = false;

  public signer: Wallet | TransactionSigner | null = null;

  private options: SdkInitParams;

  private webBrowser: IWebBrowser;

  private keyStore: KeyStore;

  private state: State;

  // Citadel session manager for the main auth flow (v11). Tokens live in KeyStore via KeyStoreAdapter.
  private sessionManager!: AuthSessionManager<AuthSessionData>;

  // SFA still mints sessions client-side on session-service; citadel can only mint via auth-service.
  private sfaSessionManager?: StorageManager<AuthSessionData>;

  // AuthSessionManager has no sync sessionId getter — track connected state here.
  private currentSessionId: string | null = null;

  private addVersionInUrls = true;

  private commonJRPCProvider?: CommonJRPCProvider;

  private projectConfig?: ProjectConfig;

  private analytics: Analytics;

  private fetchNodeDetails: NodeDetailManager;

  private torusUtils: Torus;

  private _listeners: Map<string, Set<() => void>> = new Map();

  constructor(webBrowser: IWebBrowser, storage: SecureStore | EncryptedStorage, options: SdkInitParams) {
    if (!options.clientId) throw InitializationError.invalidParams("clientId is required");
    if (!options.network) options.network = WEB3AUTH_NETWORK.SAPPHIRE_MAINNET;
    if (!options.buildEnv) options.buildEnv = BUILD_ENV.PRODUCTION;
    if (options.buildEnv === BUILD_ENV.DEVELOPMENT || options.buildEnv === BUILD_ENV.TESTING || options.sdkUrl) this.addVersionInUrls = false;
    if (!options.sdkUrl) {
      if (options.buildEnv === BUILD_ENV.DEVELOPMENT) {
        options.sdkUrl = "http://localhost:3000";
        options.dashboardUrl = "http://localhost:5173";
      } else if (options.buildEnv === BUILD_ENV.STAGING) {
        options.sdkUrl = "https://staging-auth.web3auth.io";
        options.dashboardUrl = "https://staging-account.web3auth.io";
      } else if (options.buildEnv === BUILD_ENV.TESTING) {
        options.sdkUrl = "https://develop-auth.web3auth.io";
        options.dashboardUrl = "https://develop-account.web3auth.io";
      } else {
        options.sdkUrl = "https://auth.web3auth.io";
        options.dashboardUrl = "https://account.web3auth.io";
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
    // Env-specific defaults: citadel for auth sessions, storage for login staging + SFA, socket for web parity.
    if (!options.citadelServerUrl) options.citadelServerUrl = CITADEL_SERVER_MAP[options.buildEnv];
    if (!options.storageServerUrl) options.storageServerUrl = STORAGE_SERVER_MAP[options.buildEnv];
    if (!options.sessionSocketUrl) options.sessionSocketUrl = STORAGE_SERVER_SOCKET_URL_MAP[options.buildEnv];
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

    this.fetchNodeDetails = new NodeDetailManager({ network: this.options.network, buildEnv: this.options.buildEnv });
    this.torusUtils = new Torus({
      network: this.options.network,
      clientId: this.options.clientId,
      buildEnv: this.options.buildEnv,
      serverTimeOffset: 0,
      enableOneKey: true,
    });
    this.state = {};
  }

  get connected(): boolean {
    return Boolean(this.currentSessionId);
  }

  get provider(): IProvider | null {
    if (!this.ready) return null;
    return this.commonJRPCProvider ?? null;
  }

  get currentChainId(): string | undefined {
    return this.state.currentChainId;
  }

  get currentChain(): ProviderConfig | undefined {
    if (!this.currentChainId) return undefined;
    return this.options.chains?.find((chain) => chain.chainId === this.currentChainId);
  }

  get currentChainNamespace(): ChainNamespaceType {
    return this.currentChain?.chainNamespace || CHAIN_NAMESPACES.EIP155;
  }

  private get baseUrl(): string {
    // testing and develop don't have versioning; otherwise pin to auth major (v11) so redirects mint citadel tokens
    if (!this.addVersionInUrls) return `${this.options.sdkUrl}`;
    return `${this.options.sdkUrl}/v${version.split(".")[0]}`;
  }

  private get walletSdkUrl(): string {
    if (!this.addVersionInUrls) return `${this.options.walletSdkURL}`;
    return `${this.options.walletSdkURL}/v5`;
  }

  private get dashboardUrl(): string {
    if (!this.addVersionInUrls) return `${this.options.dashboardUrl}`;
    return `${this.options.dashboardUrl}/v${version.split(".")[0]}`;
  }

  set provider(_: IProvider | null) {
    throw new Error("Not implemented");
  }

  on(event: "connected" | "disconnected", listener: () => void): this {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(listener);
    return this;
  }

  removeListener(event: "connected" | "disconnected", listener: () => void): this {
    this._listeners.get(event)?.delete(listener);
    return this;
  }

  async init(): Promise<void> {
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
      // RN has no window.location; derive origin from the configured redirect URL.
      dapp_url: new URI(this.options.redirectUrl).origin(),
      sdk_name: ANALYTICS_SDK_NAME,
      sdk_version: sdkVersion,
      // Required for organization analytics
      web3auth_client_id: this.options.clientId,
      web3auth_network: this.options.network,
    });

    try {
      const isSFA = await this.checkIsSFAFromStorage();
      const adapter = new KeyStoreAdapter(this.keyStore);

      // Same adapter for all four slots so refreshToken uses KeyStore instead of web CookieStorage.
      this.sessionManager = new AuthSessionManager({
        storageKeyPrefix: "auth_store",
        apiClientConfig: { baseURL: this.options.citadelServerUrl },
        storage: {
          sessionId: adapter,
          accessToken: adapter,
          refreshToken: adapter,
          idToken: adapter,
        },
        accessTokenProvider: this.options.accessTokenProvider,
      });

      try {
        this.projectConfig = await fetchProjectConfig(this.options.clientId, this.options.network, this.options.buildEnv);
      } catch (e) {
        const error = await serializeError(e);
        log.error("Failed to fetch project configurations", error);
        throw InitializationError.notReady(`Failed to fetch project configurations: ${error.message}`);
      }
      this.options.whiteLabel = merge(clonedeep(this.projectConfig.whitelabel), this.options.whiteLabel);
      this.initAccountAbstractionConfig(this.projectConfig);
      this.initChainsConfig(this.projectConfig);
      this.initCachedChainId();
      this.initWalletServicesConfig(this.projectConfig);
      this.options.originData = merge(clonedeep(this.projectConfig.whitelist.signed_urls), this.options.originData);
      this.options.authConnectionConfig = unionBy(
        this.projectConfig.embeddedWalletAuth ?? [],
        this.options.authConnectionConfig ?? [],
        "authConnectionId"
      );

      await this.setupCommonJRPCProvider();

      this.analytics.setGlobalProperties({ team_id: this.projectConfig.teamId });

      // SFA: restore from legacy session-service KeyStore entry.
      // Citadel: restore from AuthSessionManager tokens.
      if (isSFA) {
        this.sfaSessionManager = new StorageManager<AuthSessionData>({
          sessionServerBaseUrl: this.options.storageServerUrl,
          sessionTime: this.options.sessionTime,
          sessionNamespace: "sfa",
        });
        const sessionId = await this.keyStore.get("sessionId");
        if (sessionId) {
          this.sfaSessionManager.setSessionId(add0x(sessionId));
          this.currentSessionId = sessionId;
          const data = await this.authorizeSession();
          if (Object.keys(data).length > 0) {
            this.updateState({
              ...data,
              currentChainId: this.currentChainId,
            });
            const finalPrivKey = this.getFinalPrivKey();
            if (!finalPrivKey) return;
            const result = await this.getWallet(finalPrivKey);
            this.commonJRPCProvider.updateProviderEngineProxy(result.provider);
            this.signer = result.signer;
          } else {
            try {
              await this.keyStore.remove("sessionId");
              await this.clearSFAFromStorage();
            } catch (e) {
              if (!(await this.handleKeyStoreCorruptedError(e))) {
                throw e;
              }
              this.analytics.track({
                event: ANALYTICS_EVENTS.SDK_INITIALIZATION_KEYSTORE_CORRUPTED,
                properties: {
                  error_message: `SDK initialization keystore corrupted. ${e instanceof Error ? e.message : e}`,
                },
              });
            }
            this.currentSessionId = null;
            this.updateState({
              currentChainId: this.currentChainId,
            });
            this.signer = null;
          }
        }
      } else {
        const sessionId = await this.sessionManager.getSessionId();
        if (sessionId) {
          this.currentSessionId = sessionId;
          const data = await this.authorizeSession();
          if (Object.keys(data).length > 0) {
            this.updateState({
              ...data,
              currentChainId: this.currentChainId,
            });
            const finalPrivKey = this.getFinalPrivKey();
            if (!finalPrivKey) return;
            const result = await this.getWallet(finalPrivKey);
            this.commonJRPCProvider.updateProviderEngineProxy(result.provider);
            this.signer = result.signer;
          } else {
            await this.sessionManager.clearSessionData();
            this.currentSessionId = null;
            this.updateState({
              currentChainId: this.currentChainId,
            });
            this.signer = null;
          }
        }
      }
      this.ready = true;
      if (this.connected) this.emit("connected");

      this.analytics.track({
        event: ANALYTICS_EVENTS.SDK_INITIALIZATION_COMPLETED,
        properties: {
          default_chain_id: this.options.defaultChainId,
          chain_ids: this.options.chains?.map((chain) => chain.chainId),
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
    if (!this.currentSessionId) {
      throw LoginError.userNotLoggedIn();
    }

    this.analytics.track({
      event: ANALYTICS_EVENTS.LOGOUT_STARTED,
    });

    try {
      const currentUserInfo = this.userInfo();
      const isSFA = await this.checkIsSFAFromStorage();

      // SFA: invalidate session-service entry + clear KeyStore flag.
      // Citadel: logout() POSTs /v1/auth/logout and clears all four stored tokens.
      if (isSFA) {
        await this.sfaSessionManager!.invalidateSession();
        try {
          await this.keyStore.remove("sessionId");
          await this.clearSFAFromStorage();
        } catch (e) {
          if (!(await this.handleKeyStoreCorruptedError(e))) {
            throw e;
          }
          this.analytics.track({
            event: ANALYTICS_EVENTS.LOGOUT_KEYSTORE_CORRUPTED,
            properties: {
              error_message: `Logout keystore corrupted. ${e instanceof Error ? e.message : e}`,
            },
          });
        }
      } else {
        await this.sessionManager.logout();
      }

      try {
        if (currentUserInfo.authConnectionId && currentUserInfo.dappShare && currentUserInfo.dappShare.length > 0) {
          const verifier = currentUserInfo.groupedAuthConnectionId || currentUserInfo.authConnectionId;
          await this.keyStore.remove(verifier);
        }
      } catch (e) {
        if (!(await this.handleKeyStoreCorruptedError(e))) {
          throw e;
        }
        this.analytics.track({
          event: ANALYTICS_EVENTS.LOGOUT_KEYSTORE_CORRUPTED,
          properties: {
            error_message: `Logout keystore corrupted. ${e instanceof Error ? e.message : e}`,
          },
        });
      }

      this.currentSessionId = null;

      // re-setup commonJRPCProvider
      this.commonJRPCProvider.removeAllListeners();
      this.setupCommonJRPCProvider();
      this.signer = null;

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
        signatures: [],
        currentChainId: this.currentChainId,
      });

      this.emit("disconnected");
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
    if (!this.currentSessionId) {
      throw LoginError.userNotLoggedIn();
    }

    if (!this.projectConfig?.chains) {
      throw InitializationError.invalidParams("Project config not found");
    }

    this.analytics.track({
      event: ANALYTICS_EVENTS.WALLET_UI_CLICKED,
    });

    try {
      const dataObject: Omit<AuthRequestPayload, "options"> & {
        options: SdkInitParams & {
          chains: ChainsConfig;
          chainId: string;
          embeddedWalletAuth?: AuthConnectionConfig;
          accountAbstractionConfig: AccountAbstractionMultiChainConfig;
        };
      } = {
        actionType: AUTH_ACTIONS.LOGIN,
        options: {
          ...this.options,
          chains: this.options.chains,
          defaultChainId: this.options.chains?.[0]?.chainId ?? this.options.defaultChainId ?? "0x1",
          chainId: this.options.chains?.[0]?.chainId ?? this.options.defaultChainId ?? "0x1",
          accountAbstractionConfig: this.options.accountAbstractionConfig ?? undefined,
          embeddedWalletAuth: this.projectConfig.embeddedWalletAuth ?? undefined,
        },
        params: {},
      };

      const url = `${this.walletSdkUrl}/${path}`;
      const loginId = StorageManager.generateRandomSessionKey();
      await this.createLoginSession(loginId, dataObject);

      const sessionId = this.currentSessionId;
      const isSFA = await this.checkIsSFAFromStorage();

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
    if (!this.currentSessionId) {
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
      const dataObject: Omit<AuthRequestPayload, "options"> & {
        options: SdkInitParams & {
          chains: ChainsConfig;
          chainId: string;
          accountAbstractionConfig: AccountAbstractionMultiChainConfig;
          embeddedWalletAuth: AuthConnectionConfig;
        };
      } = {
        actionType: AUTH_ACTIONS.LOGIN,
        options: {
          ...this.options,
          chains: this.options.chains,
          defaultChainId: this.options.chains?.[0]?.chainId ?? this.options.defaultChainId ?? "0x1",
          chainId: this.options.chains?.[0]?.chainId ?? this.options.defaultChainId ?? "0x1",
          accountAbstractionConfig: this.options.accountAbstractionConfig,
          embeddedWalletAuth: this.projectConfig.embeddedWalletAuth ?? undefined,
        },
        params: {},
      };

      const url = `${this.walletSdkUrl}/${path}`;
      const loginId = StorageManager.generateRandomSessionKey();
      await this.createLoginSession(loginId, dataObject);

      const sessionId = this.currentSessionId;
      const isSFA = await this.checkIsSFAFromStorage();
      const configParams: WalletLoginParams = {
        loginId,
        sessionId,
        request: {
          method,
          params,
        },
        platform: "react-native",
        sessionNamespace: isSFA ? "sfa" : undefined,
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
    if (!this.currentSessionId) {
      throw LoginError.userNotLoggedIn();
    }
    await this.refreshSession();
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

      const dataObject: AuthRequestPayload = {
        actionType: AUTH_ACTIONS.ENABLE_MFA,
        options: this.options,
        params: {
          ...loginParams,
          mfaLevel: "mandatory",
        },
        sessionId: this.currentSessionId,
        accessToken: (await this.sessionManager.getAccessToken()) ?? undefined,
      };

      const result = await this.authHandler(`${this.baseUrl}/start`, dataObject);

      if (result.type !== "success" || !result.url) {
        log.error(`[Web3Auth] enableMFA flow failed with error type ${result.type}`);
        throw LoginError.loginFailed(`enableMFA flow failed with error type ${result.type}`);
      }

      const { sessionId, accessToken, refreshToken, idToken, error } = getHashQueryParams(result.url);
      if (error || !sessionId) {
        throw LoginError.loginFailed(error || "SessionId is missing");
      }

      await this.sessionManager.setTokens({
        sessionId: add0x(sessionId),
        accessToken: accessToken || "",
        refreshToken: refreshToken || "",
        idToken: idToken || "",
      });
      this.currentSessionId = sessionId;

      await this.refreshSession();

      const { userInfo } = this.state;
      if (userInfo?.dappShare?.length > 0) {
        await this.keyStore.set(userInfo.groupedAuthConnectionId || userInfo.authConnectionId, userInfo.dappShare);
      }

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
    if (!this.currentSessionId) {
      throw LoginError.userNotLoggedIn();
    }
    await this.refreshSession();
    // manageMFA requires MFA already enabled; use enableMFA() first when it is not.
    if (!this.state.userInfo.isMfaEnabled) {
      throw LoginError.mfaNotEnabled();
    }

    this.analytics.track({
      event: ANALYTICS_EVENTS.MFA_MANAGEMENT_STARTED,
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
        dappUrl: this.options.redirectUrl,
      };

      // Pre-generate IDs so appState can embed them (authHandler generates IDs after the payload is built).
      const loginId = StorageManager.generateRandomSessionKey();
      const recordId = generateRecordId();

      // Dashboard is the MFA UI redirect; the browser session still returns to the dapp redirectUrl.
      const dataObject: AuthRequestPayload = {
        actionType: AUTH_ACTIONS.MANAGE_MFA,
        options: {
          ...this.options,
          redirectUrl: `${this.dashboardUrl}/wallet/account`,
        },
        params: {
          ...loginParams,
          mfaLevel: "mandatory",
          appState: jsonToBase64({ loginId, recordId }),
        },
        sessionId: this.currentSessionId,
        accessToken: (await this.sessionManager.getAccessToken()) ?? undefined,
      };

      const result = await this.openAuthSession(`${this.baseUrl}/start`, dataObject, {
        loginId,
        recordId,
        sessionTime: this.options.sessionTime,
      });

      if (result.type !== "success" || !result.url) {
        log.error(`[Web3Auth] manageMFA flow failed with error type ${result.type}`);
        throw LoginError.loginFailed(`manageMFA flow failed with error type ${result.type}`);
      }

      const { sessionId, accessToken, refreshToken, idToken, error } = getHashQueryParams(result.url);
      if (error) {
        throw LoginError.loginFailed(error);
      }
      if (sessionId) {
        await this.sessionManager.setTokens({
          sessionId: add0x(sessionId),
          accessToken: accessToken || "",
          refreshToken: refreshToken || "",
          idToken: idToken || "",
        });
        this.currentSessionId = sessionId;
        await this.refreshSession();
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

  public async connectTo(loginParams: SdkLoginParams): Promise<WalletResult | null> {
    const isSFA = !!loginParams.idToken;

    let walletResult: WalletResult | null = null;
    if (isSFA) {
      // Keep citadel sessionManager intact; SFA uses its own StorageManager on session-service.
      this.sfaSessionManager = new StorageManager<AuthSessionData>({
        sessionServerBaseUrl: this.options.storageServerUrl,
        sessionTime: this.options.sessionTime,
        sessionNamespace: "sfa",
      });
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
        walletResult = await this.connect(aggregateLoginParams, subVerifierInfoArray);
      } else {
        walletResult = await this.connect(loginParams);
      }
    } else {
      walletResult = await this.login(loginParams);
    }

    this.commonJRPCProvider.updateProviderEngineProxy(walletResult?.provider);
    this.signer = walletResult?.signer;
    if (this.connected) this.emit("connected");
    return walletResult;
  }

  public setAnalyticsProperties(properties: Record<string, unknown>) {
    this.analytics.setGlobalProperties(properties);
  }

  protected initCachedChainId() {
    // init chainId using cached chainId if it exists and is valid, otherwise use the defaultChainId or the first chain
    const cachedChainId = this.currentChainId;
    const isCachedChainIdValid = cachedChainId && this.options.chains.some((chain) => chain.chainId === cachedChainId);
    if (this.options.defaultChainId && !isHexStrict(this.options.defaultChainId))
      throw InitializationError.invalidParams("Please provide a valid defaultChainId in constructor");
    const currentChainId = isCachedChainIdValid ? cachedChainId : this.options.defaultChainId || this.options.chains[0].chainId;
    this.updateState({ ...this.state, currentChainId });
  }

  protected initChainsConfig(projectConfig: ProjectConfig) {
    // merge chains from project config with core options, core options chains will take precedence over project config chains
    const chainMap = new Map<string, ProviderConfig>();
    const allChains = [...(projectConfig.chains || []), ...(this.options.chains || [])];
    for (const chain of allChains) {
      const existingChain = chainMap.get(chain.chainId);
      if (!existingChain) chainMap.set(chain.chainId, chain);
      else chainMap.set(chain.chainId, { ...existingChain, ...chain });
    }
    this.options.chains = Array.from(chainMap.values());

    // validate chains and namespaces
    if (this.options.chains.length === 0) {
      log.error("chain info not found. Please configure chains on dashboard at https://dashboard.web3auth.io");
      throw InitializationError.invalidParams("Please configure chains on dashboard at https://dashboard.web3auth.io");
    }
    const validChainNamespaces = new Set(Object.values(CHAIN_NAMESPACES));
    for (const chain of this.options.chains) {
      if (!chain.chainNamespace || !validChainNamespaces.has(chain.chainNamespace)) {
        log.error(`Please provide a valid chainNamespace in chains for chain ${chain.chainId}`);
        throw InitializationError.invalidParams(`Please provide a valid chainNamespace in chains for chain ${chain.chainId}`);
      }
      if (chain.chainNamespace !== CHAIN_NAMESPACES.OTHER && !isHexStrict(chain.chainId)) {
        log.error(`Please provide a valid chainId in chains for chain ${chain.chainId}`);
        throw InitializationError.invalidParams(`Please provide a valid chainId as hex string in chains for chain ${chain.chainId}`);
      }
      if (chain.chainNamespace !== CHAIN_NAMESPACES.OTHER) {
        try {
          new URL(chain.rpcTarget);
        } catch (error) {
          // TODO: add support for chain.wsTarget
          log.error(`Please provide a valid rpcTarget in chains for chain ${chain.chainId}`, error);
          throw InitializationError.invalidParams(`Please provide a valid rpcTarget in chains for chain ${chain.chainId}`);
        }
      }
    }

    // if AA is enabled, filter out chains that are not AA-supported
    if (this.options.accountAbstractionConfig) {
      // write a for loop over accountAbstractionConfig.chains and check if the chainId is valid
      if (this.options.accountAbstractionConfig.chains.length === 0) {
        log.error("Please configure chains for smart accounts on dashboard at https://dashboard.web3auth.io");
        throw InitializationError.invalidParams("Please configure chains for smart accounts on dashboard at https://dashboard.web3auth.io");
      }
      for (const chain of this.options.accountAbstractionConfig.chains) {
        if (!isHexStrict(chain.chainId)) {
          log.error(`Please provide a valid chainId in accountAbstractionConfig.chains for chain ${chain.chainId}`);
          throw InitializationError.invalidParams(`Please provide a valid chainId in accountAbstractionConfig.chains for chain ${chain.chainId}`);
        }
        try {
          new URL(chain.bundlerConfig?.url);
        } catch (error) {
          log.error(`Please provide a valid bundlerConfig.url in accountAbstractionConfig.chains for chain ${chain.chainId}`, error);
          throw InitializationError.invalidParams(
            `Please provide a valid bundlerConfig.url in accountAbstractionConfig.chains for chain ${chain.chainId}`
          );
        }
        if (!chainMap.has(chain.chainId)) {
          log.error(`Please provide chain config for AA chain in accountAbstractionConfig.chains for chain ${chain.chainId}`);
          throw InitializationError.invalidParams(
            `Please provide chain config for AA chain in accountAbstractionConfig.chains for chain ${chain.chainId}`
          );
        }
      }
      // const aaSupportedChainIds = new Set(
      //   this.coreOptions.accountAbstractionConfig?.chains
      //     ?.filter((chain) => chain.chainId && chain.bundlerConfig?.url)
      //     .map((chain) => chain.chainId) || []
      // );
      // this.coreOptions.chains = this.coreOptions.chains.filter(
      //   (chain) => chain.chainNamespace !== CHAIN_NAMESPACES.EIP155 || aaSupportedChainIds.has(chain.chainId)
      // );
      // if (this.coreOptions.chains.length === 0) {
      //   log.error("Account Abstraction is enabled but no supported chains found");
      //   throw WalletInitializationError.invalidParams("Account Abstraction is enabled but no supported chains found");
      // }
    }
  }

  protected initAccountAbstractionConfig(projectConfig?: ProjectConfig) {
    const isAAEnabled = Boolean(this.options.accountAbstractionConfig || projectConfig?.smartAccounts);
    if (!isAAEnabled) return;

    // merge smart account config from project config with core options, core options will take precedence over project config
    const smartAccountsConfig = (projectConfig?.smartAccounts || {}) as SmartAccountsConfig;
    const aaChainMap = new Map<string, WsEmbedParams["accountAbstractionConfig"]["chains"][number]>();
    const allAaChains = [...(smartAccountsConfig?.chains || []), ...(this.options.accountAbstractionConfig?.chains || [])];
    for (const chain of allAaChains) {
      const existingChain = aaChainMap.get(chain.chainId);
      if (!existingChain) aaChainMap.set(chain.chainId, chain);
      else aaChainMap.set(chain.chainId, { ...existingChain, ...chain });
    }

    this.options.accountAbstractionConfig =
      this.options.accountAbstractionConfig === null
        ? undefined
        : {
            ...deepmerge(smartAccountsConfig || {}, this.options.accountAbstractionConfig || {}),
            chains: Array.from(aaChainMap.values()),
          };
  }

  protected async getWallet(privateKey: string): Promise<WalletResult> {
    const eoaProvider = new EthereumPrivateKeyProvider({
      config: {
        keyExportEnabled: this.projectConfig?.enableKeyExport,
        chainConfig: this.currentChain,
      },
    });
    await eoaProvider.setupProvider(privateKey);
    if (this.currentChainNamespace === CHAIN_NAMESPACES.SOLANA) {
      const ed25519Key = getED25519Key(privateKey).sk;
      const keyPair = await createKeyPairFromBytes(new Uint8Array(ed25519Key));
      const signer = await createSignerFromKeyPair(keyPair);
      return { chainNamespace: CHAIN_NAMESPACES.SOLANA, provider: eoaProvider, signer: signer };
    } else if (this.currentChainNamespace === CHAIN_NAMESPACES.EIP155) {
      const ethersWallet = new Wallet(privateKey);
      const signer = ethersWallet.connect(new JsonRpcProvider(this.currentChain.rpcTarget));

      let aaProvider: AccountAbstractionProvider | null = null;
      if (this.options.accountAbstractionConfig) {
        const aaChainIds = new Set(this.options.accountAbstractionConfig?.chains?.map((chain) => chain.chainId) || []);
        aaProvider = await accountAbstractionProvider({
          accountAbstractionConfig: this.options.accountAbstractionConfig,
          provider: eoaProvider,
          chain: this.currentChain,
          chains: this.options.chains.filter((chain) => aaChainIds.has(chain.chainId)),
          // useProviderAsTransport: data.connector === WALLET_CONNECTORS.AUTH,
        });
        const ethersProvider = new ethers.BrowserProvider(aaProvider);
        signer.connect(ethersProvider);
      }
      return { chainNamespace: CHAIN_NAMESPACES.EIP155, provider: (aaProvider as unknown as IBaseProvider<string>) ?? eoaProvider, signer: signer };
    } else {
      return { chainNamespace: CHAIN_NAMESPACES.OTHER, provider: eoaProvider, signer: null };
    }
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

  protected async setupCommonJRPCProvider() {
    this.commonJRPCProvider = await CommonJRPCProvider.getProviderInstance({
      chain: this.currentChain,
      chains: this.options.chains,
    });

    // sync chainId
    this.commonJRPCProvider.on("chainChanged", (chainId) => this.setCurrentChain(chainId));
  }

  private emit(event: "connected" | "disconnected"): void {
    this._listeners.get(event)?.forEach((l) => l());
  }

  private async login(loginParams: SdkLoginParams): Promise<WalletResult | null> {
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
      chains: this.options.chains?.map((chain) => chain.chainId),
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

    const dataObject: AuthRequestPayload = {
      actionType: AUTH_ACTIONS.LOGIN,
      options: this.options,
      params: loginParams,
    };

    const result = await this.authHandler(`${this.baseUrl}/start`, dataObject);

    if (result.type !== "success" || !result.url) {
      log.error(`[Web3Auth] login flow failed with error type ${result.type}`);
      throw LoginError.loginFailed(`login flow failed with error type ${result.type}`);
    }

    // Persist citadel tokens from the v11 redirect; do not write a legacy KeyStore "sessionId".
    const { sessionId, accessToken, refreshToken, idToken, error } = getHashQueryParams(result.url);
    if (error || !sessionId) {
      throw LoginError.loginFailed(error || "SessionId is missing");
    }

    await this.sessionManager.setTokens({
      sessionId: add0x(sessionId),
      accessToken: accessToken || "",
      refreshToken: refreshToken || "",
      idToken: idToken || "",
    });
    this.currentSessionId = sessionId;

    await this.refreshSession();

    const { userInfo } = this.state;
    if (userInfo?.dappShare?.length > 0) {
      await this.keyStore.set(userInfo.groupedAuthConnectionId || userInfo.authConnectionId, userInfo.dappShare);
    }

    const finalPrivKey = this.getFinalPrivKey();
    if (!finalPrivKey) throw LoginError.loginFailed("final private key not found");
    const walletResult = await this.getWallet(finalPrivKey);

    this.analytics.track({
      event: ANALYTICS_EVENTS.CONNECTION_COMPLETED,
      properties: analyticsProperties,
    });

    return walletResult;
  }

  /**
   * Handle user SFA login.
   * @param loginParams - The login parameters.
   * @param subVerifierInfoArray - The sub-verifier information array.
   * @returns The connected user information.
   */
  private async connect(loginParams: SdkLoginParams, subVerifierInfoArray?: SubVerifierInfo[]): Promise<WalletResult | null> {
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
    // SFA sessions are minted client-side on session-service and keyed in KeyStore for rehydrate.
    const sessionId = StorageManager.generateRandomSessionKey();
    this.sfaSessionManager!.setSessionId(add0x(sessionId));
    await this.sfaSessionManager!.createSession(authSessionData);
    await this.keyStore.set("sessionId", sessionId);
    this.currentSessionId = sessionId;

    this.updateState({
      ...authSessionData,
      currentChainId: this.currentChainId,
    });

    const result = await this.getWallet(privateKey);
    return result;
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

  private setCurrentChain(chainId: string) {
    if (chainId === this.currentChainId) return;
    const newChain = this.options.chains.find((chain) => chain.chainId === chainId);
    if (!newChain) throw InitializationError.invalidParams(`Invalid chainId: ${chainId}`);
    this.updateState({ ...this.state, currentChainId: chainId });
  }

  private updateState(newState: State) {
    this.state = { ...newState };
  }

  private async createLoginSession(loginId: Hex, data: AuthRequestPayload, timeout = 600): Promise<Hex> {
    if (!this.sessionManager) throw InitializationError.notInitialized();

    // Login payload staging still uses session-service until auth-service migrates that storage.
    const isSFA = await this.checkIsSFAFromStorage();
    const loginSessionMgr = new StorageManager<AuthRequestPayload>({
      sessionServerBaseUrl: this.options.storageServerUrl,
      sessionTime: timeout, // each login key must be used with 10 mins (might be used at the end of popup redirect)
      sessionId: loginId,
      sessionNamespace: isSFA ? "sfa" : undefined,
    });

    await loginSessionMgr.createSession(JSON.parse(JSON.stringify(data)));

    return loginId;
  }

  /**
   * Stage the auth payload on session-service and open the browser auth session.
   * Pass pre-generated loginId/recordId when the payload must embed them (manageMFA appState).
   */
  private async openAuthSession(url: string, dataObject: AuthRequestPayload, options?: { loginId?: Hex; recordId?: string; sessionTime?: number }) {
    const loginId = options?.loginId ?? StorageManager.generateRandomSessionKey();
    const recordId = options?.recordId ?? generateRecordId();
    await this.createLoginSession(loginId, dataObject, options?.sessionTime);

    const isSFA = await this.checkIsSFAFromStorage();
    const configParams: BaseLoginParams = {
      loginId,
      recordId,
      sessionNamespace: isSFA ? "sfa" : undefined,
      storageServerUrl: this.options.storageServerUrl,
      loginSource: "web3auth-react-native",
    };

    const loginUrl = constructURL({
      baseURL: url,
      hash: { b64Params: jsonToBase64(configParams) },
    });

    // Always return to the dapp redirectUrl; payload.options.redirectUrl may point elsewhere (e.g. dashboard).
    return this.webBrowser.openAuthSessionAsync(loginUrl, this.options.redirectUrl);
  }

  /** Shared path for login / enableMFA — generates loginId/recordId internally. */
  private async authHandler(url: string, dataObject: AuthRequestPayload) {
    return this.openAuthSession(url, dataObject);
  }

  private async checkIsSFAFromStorage(): Promise<boolean> {
    const isSFAValue = await this.keyStore.get(KEYSTORE_KEYS.IS_SFA);
    return isSFAValue === "true";
  }

  private async clearSFAFromStorage(): Promise<void> {
    const sfaValue = await this.keyStore.get(KEYSTORE_KEYS.IS_SFA);
    if (sfaValue) {
      await this.keyStore.remove(KEYSTORE_KEYS.IS_SFA);
    }
  }

  /**
   * Handle key store corrupted error.
   * @param e - The error.
   * @returns True if the key store is corrupted, false otherwise.
   */
  private async handleKeyStoreCorruptedError(e: unknown): Promise<boolean> {
    if (e instanceof Error && e.message.includes("error occured while removing value")) {
      // keystore error might be corrupted, clean up and throw error
      await this.keyStore.clear();
      return true;
    }

    return false;
  }

  private async authorizeSession(): Promise<AuthSessionData> {
    try {
      const isSFA = await this.checkIsSFAFromStorage();
      if (isSFA) {
        // session-service authorize requires Origin; citadel authorize() uses stored tokens instead.
        const data = await this.sfaSessionManager!.authorizeSession({
          headers: {
            Origin: new URI(this.options.redirectUrl).origin(),
          },
        });
        return data;
      }

      const data = await this.sessionManager.authorize();
      return data ?? {};
    } catch {
      return {};
    }
  }

  private async refreshSession(): Promise<void> {
    const data = await this.authorizeSession();
    if (!data || Object.keys(data).length === 0) {
      try {
        await this.sessionManager.logout();
      } catch (e) {
        // session may already be invalid on the server
        log.error("Error during session refresh: ", e);
      }
      this.currentSessionId = null;
      this.updateState({ currentChainId: this.currentChainId });
      throw LoginError.userNotLoggedIn();
    }
    this.updateState({ ...data, currentChainId: this.currentChainId });
  }

  private getFinalPrivKey() {
    if (this.currentChainNamespace === CHAIN_NAMESPACES.SOLANA) return this.getFinalEd25519PrivKey();
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
