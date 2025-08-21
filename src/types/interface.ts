import {
  AUTH_CONNECTION,
  AuthConnectionConfig,
  type AuthOptions,
  type AuthSessionData,
  BUILD_ENV,
  LANGUAGES,
  type LoginParams,
  MFA_FACTOR,
  MFA_LEVELS,
  MfaSettings,
  SUPPORTED_KEY_CURVES,
  THEME_MODES,
  WEB3AUTH_NETWORK,
  type WhiteLabelData,
} from "@web3auth/auth";
import type { IBaseProvider, IProvider } from "@web3auth/base";

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

export type SdkInitParams = Omit<AuthOptions & SdkSpecificInitParams, "uxMode" | "replaceUrlOnRedirect" | "storageKey"> &
  Required<Pick<AuthOptions, "redirectUrl">> & {
    defaultChainId?: string;
    walletServicesConfig?: WalletServicesConfig;
  };

export type SdkLoginParams = Omit<LoginParams, "getWalletKey">;

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
  login: (params: SdkLoginParams) => Promise<IProvider | null>;
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
};

export enum ChainNamespace {
  EIP155 = "eip155",
  SOLANA = "solana",
}

export type ChainConfig = {
  chainNamespace: ChainNamespace;
  decimals?: number;
  blockExplorerUrl?: string;
  chainId: string;
  displayName?: string;
  logo?: string;
  rpcTarget: string;
  ticker?: string;
  tickerName?: string;
};

export type WalletServicesConfig = {
  confirmationStrategy: ConfirmationStrategyType;
  whiteLabel?: WhiteLabelData;
};

export type ConfirmationStrategyType = "popup" | "modal" | "auto-approve" | "default";

export interface WhitelistResponse {
  urls: string[];
  signed_urls: Record<string, string>;
}

export interface ProjectConfigResponse {
  whitelabel?: WhiteLabelData;
  sms_otp_enabled: boolean;
  wallet_connect_enabled: boolean;
  walletConnectProjectId?: string;
  whitelist?: WhitelistResponse;
  key_export_enabled?: boolean;
  userDataInIdToken?: boolean;
  sessionTime?: number;
  chains?: ChainConfig[];
  smartAccounts?: SmartAccountConfig;
  walletUiConfig?: WalletUiConfig;
  embeddedWalletAuth?: AuthConnectionConfig;
  teamId?: number;
  mfaSettings?: MfaSettings;
}

export type SmartAccountType = "metamask" | "safe" | "kernel" | "biconomy" | "trust" | "light" | "simple" | "nexus";

export type SmartAccountConfig = {
  smartAccountType: SmartAccountType;
  chains: SmartAccountChainConfig[];
};

export type SmartAccountChainConfig = {
  chainId: string;
  bundler: BundlerConfig;
  paymaster?: PaymasterConfig;
};

export type BundlerConfig = {
  url: string;
};

export type PaymasterConfig = {
  url: string;
};

export type WalletUiConfig = {
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
  defaultPortfolio?: DefaultPortfolioType;
};

export type ButtonPositionType = "bottom-left" | "bottom-right" | "top-left" | "top-right";

export type DefaultPortfolioType = "token" | "nft";

export { AUTH_CONNECTION, BUILD_ENV, LANGUAGES, MFA_FACTOR, MFA_LEVELS, SUPPORTED_KEY_CURVES, THEME_MODES, WEB3AUTH_NETWORK };
