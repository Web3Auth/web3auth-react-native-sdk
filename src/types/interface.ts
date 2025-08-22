import {
  AUTH_CONNECTION,
  AuthConnectionConfigItem,
  type AuthOptions,
  type AuthSessionData,
  BUILD_ENV,
  LANGUAGES,
  type LoginParams,
  MFA_FACTOR,
  MFA_LEVELS,
  SUPPORTED_KEY_CURVES,
  THEME_MODES,
  WEB3AUTH_NETWORK,
  WhiteLabelData,
} from "@web3auth/auth";
import type { IBaseProvider, IProvider, WhitelistResponse } from "@web3auth/base";
import { WsEmbedParams } from "@web3auth/ws-embed";

import { BUTTON_POSITION, CHAIN_NAMESPACES, MODAL_SIGN_IN_METHODS, SMART_ACCOUNT, SMART_ACCOUNT_WALLET_SCOPE, WIDGET_TYPE } from "../base";

type SdkSpecificInitParams = {
  enableLogging?: boolean;
  useCoreKitKey?: boolean;
  walletSdkURL?: string;
  /**
   * Private key provider for your chain namespace
   */
  privateKeyProvider: IBaseProvider<string>;
  /**
   * Account abstraction provider for your chain namespace
   */
  accountAbstractionProvider?: IBaseProvider<IProvider>;
};

export type SdkInitParams = Omit<AuthOptions & SdkSpecificInitParams, "uxMode" | "replaceUrlOnRedirect" | "storageKey" | "sessionNamespace"> &
  Required<Pick<AuthOptions, "redirectUrl">> & {
    defaultChainId?: string;
    walletServicesConfig?: WalletServicesConfig;
  };

export type SdkLoginParams = Omit<LoginParams, "getWalletKey"> & {
  idToken?: string;
};

// export type SdkLogoutParams = Partial<BaseLogoutParams> & Partial<BaseRedirectParams>;

export type {
  AUTH_CONNECTION_TYPE,
  AuthSessionData,
  AuthUserInfo,
  BUILD_ENV_TYPE,
  CUSTOM_AUTH_CONNECTION_TYPE,
  ExtraLoginOptions,
  LANGUAGE_TYPE,
  LoginParams,
  MFA_FACTOR_TYPE,
  MFA_SETTINGS,
  MfaLevelType,
  MfaSettings,
  SocialMfaModParams,
  SUPPORTED_KEY_CURVES_TYPE,
  THEME_MODE_TYPE,
  WEB3AUTH_NETWORK_TYPE,
  WhiteLabelData,
} from "@web3auth/auth";

export type State = AuthSessionData;

export interface IWeb3Auth {
  provider: IProvider | null;
  connected: boolean;
  init: () => Promise<void>;
  connectTo: (params: SdkLoginParams) => Promise<IProvider | null>;
  logout: () => Promise<void>;
  userInfo: () => State["userInfo"];
  enableMFA: () => Promise<boolean>;
  manageMFA: () => Promise<void>;
  launchWalletServices: (path?: string) => Promise<void>;
  request(method: string, params: unknown[], path?: string): Promise<string>;
}

export type WalletLoginParams = {
  loginId: string;
  sessionId: string;
  request?: {
    method: string;
    params: unknown[];
  };
  platform: string;
  sessionNamespace?: string;
};

export type ChainNamespaceType = (typeof CHAIN_NAMESPACES)[keyof typeof CHAIN_NAMESPACES];

export type SmartAccountType = (typeof SMART_ACCOUNT)[keyof typeof SMART_ACCOUNT];

export type ButtonPositionType = (typeof BUTTON_POSITION)[keyof typeof BUTTON_POSITION];

export type ProviderConfig = {
  chainNamespace: ChainNamespaceType;
  /**
   * Block explorer url for the chain
   * @example https://ropsten.etherscan.io
   */
  blockExplorerUrl: string;
  /**
   * Logo url for the base token
   */
  logo: string;
  /**
   * Name for ticker
   * @example 'Binance Token', 'Ethereum', 'Polygon Ecosystem Token'
   */
  tickerName: string;
  /**
   * Symbol for ticker
   * @example BNB, ETH
   */
  ticker: string;
  /**
   * RPC target Url for the chain
   * @example https://ropsten.infura.io/v3/YOUR_API_KEY
   */
  rpcTarget: string;
  /**
   * websocket target Url for the chain
   */
  wsTarget?: string;
  /**
   * Chain Id parameter(hex with 0x prefix) for the network. Mandatory for all networks. (assign one with a map to network identifier for platforms)
   * @example 0x1 for mainnet, 'loading' if not connected to anything yet or connection fails
   * @defaultValue 'loading'
   */
  chainId: string;
  /**
   * Display name for the network
   */
  displayName: string;
  /**
   * Whether the network is testnet or not
   */
  isTestnet?: boolean;
  /**
   * Number of decimals for the currency ticker (e.g: 18)
   */
  decimals?: number;
};

export type CustomChainConfig = ProviderConfig;

export type ChainsConfig = CustomChainConfig[];

export interface ExternalWalletsConfig {
  disableAllRecommendedWallets?: boolean;
  disableAllOtherWallets?: boolean;
  disabledWallets?: string[];
}
export type SmartAccountWalletScope = (typeof SMART_ACCOUNT_WALLET_SCOPE)[keyof typeof SMART_ACCOUNT_WALLET_SCOPE];
export interface SmartAccountsConfig {
  smartAccountType: SmartAccountType;
  walletScope: SmartAccountWalletScope;
  chains: {
    chainId: string;
    bundlerConfig: {
      url: string;
    };
    paymasterConfig?: {
      url: string;
    };
  }[];
}
export interface WalletUiConfig {
  enablePortfolioWidget?: boolean;
  enableConfirmationModal?: boolean;
  enableWalletConnect?: boolean;
  enableTokenDisplay?: boolean;
  enableNftDisplay?: boolean;
  enableShowAllTokensButton?: boolean;
  enableBuyButton?: boolean;
  enableSendButton?: boolean;
  enableSwapButton?: boolean;
  enableReceiveButton?: boolean;
  portfolioWidgetPosition?: ButtonPositionType;
  defaultPortfolio?: "token" | "nft";
}
export type ModalSignInMethodType = (typeof MODAL_SIGN_IN_METHODS)[keyof typeof MODAL_SIGN_IN_METHODS];
export type WidgetType = (typeof WIDGET_TYPE)[keyof typeof WIDGET_TYPE];
export interface LoginModalConfig {
  widgetType?: WidgetType;
  logoAlignment?: "left" | "center";
  borderRadiusType?: "small" | "medium" | "large";
  buttonRadiusType?: "pill" | "rounded" | "square";
  signInMethods?: ModalSignInMethodType[];
  addPreviousLoginHint?: boolean;
  displayInstalledExternalWallets?: boolean;
  displayExternalWalletsCount?: boolean;
}
export interface ProjectConfig {
  teamId: number;
  userDataIncludedInToken?: boolean;
  sessionTime?: number;
  enableKeyExport?: boolean;
  walletConnectProjectId?: string;
  whitelist?: WhitelistResponse;
  chains?: ChainsConfig;
  smartAccounts?: SmartAccountsConfig;
  walletUi?: WalletUiConfig;
  externalWalletAuth?: ExternalWalletsConfig;
  embeddedWalletAuth?: (AuthConnectionConfigItem & {
    isDefault?: boolean;
  })[];
  whitelabel?: WhiteLabelData;
  loginModal?: LoginModalConfig;
}
export interface WalletRegistryItem {
  name: string;
  chains: string[];
  walletConnect?: {
    sdks: string[];
  };
  app?: {
    browser?: string;
    android?: string;
    ios?: string;
    chrome?: string;
    firefox?: string;
    edge?: string;
  };
  mobile?: {
    native?: string;
    universal?: string;
    inAppBrowser?: string;
  };
  primaryColor?: string;
  injected?: {
    namespace: ChainNamespaceType;
    injected_id: string;
  }[];
  imgExtension?: string;
}

export type WalletServicesConfig = Omit<
  WsEmbedParams,
  "buildEnv" | "enableLogging" | "chainId" | "chains" | "confirmationStrategy" | "accountAbstractionConfig"
> & {
  /**
   * Determines how to show confirmation screens
   * @defaultValue default
   *
   * default & auto-approve
   * - use auto-approve as default
   * - if wallet connect request use modal
   *
   * modal
   * - use modal always
   */
  confirmationStrategy?: Exclude<WsEmbedParams["confirmationStrategy"], "popup">;
  modalZIndex?: number;
};

export type SubVerifierInfo = {
  verifier: string;
  idToken: string;
};

export type AggregateVerifierParams = {
  verify_params: { verifier_id: string; idtoken: string }[];
  sub_verifier_ids: string[];
  verifier_id: string;
};

export type SubVerifierInfo = {
  verifier: string;
  idToken: string;
};

export type AggregateVerifierParams = {
  verify_params: { verifier_id: string; idtoken: string }[];
  sub_verifier_ids: string[];
  verifier_id: string;
};

export { AUTH_CONNECTION, BUILD_ENV, LANGUAGES, MFA_FACTOR, MFA_LEVELS, SUPPORTED_KEY_CURVES, THEME_MODES, WEB3AUTH_NETWORK };
