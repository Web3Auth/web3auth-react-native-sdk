import type { TransactionSigner } from "@solana/signers";
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
import type {
  AccountAbstractionMultiChainConfig,
  CHAIN_NAMESPACES,
  CustomChainConfig,
  IProvider,
  ModalSignInMethodType,
  SmartAccountsConfig,
  WhitelistResponse,
  WidgetType,
} from "@web3auth/no-modal";
import { WsEmbedParams } from "@web3auth/ws-embed";
import type { Wallet } from "ethers";

import type { BUTTON_POSITION_TYPE, ChainNamespaceType } from "../base";
import { SMART_ACCOUNT } from "../base";

type SdkSpecificInitParams = {
  enableLogging?: boolean;
  useCoreKitKey?: boolean;
  walletSdkURL?: string;
  /**
   * Disable all Segment analytics (identify/track).
   * When enabled, analytics use the production Segment write key unless
   * {@link buildEnv} is `BUILD_ENV.DEVELOPMENT`, which uses the development key.
   */
  disableAnalytics?: boolean;
};

type SdkInitParamsBase = Omit<AuthOptions & SdkSpecificInitParams, "uxMode" | "replaceUrlOnRedirect" | "storageKey" | "sessionNamespace"> &
  Required<Pick<AuthOptions, "redirectUrl">>;

// Using interface extends instead of type intersection so TypeScript's excess
// property checks on object literals correctly recognise all members.
export interface SdkInitParams extends SdkInitParamsBase {
  accountAbstractionConfig?: AccountAbstractionMultiChainConfig | null;
  /**
   * Whether to use AA with external wallet.
   * When unset, derived from dashboard smartAccounts.walletScope (`all` becomes true).
   */
  useAAWithExternalWallet?: boolean;
  chains?: ChainsConfig;
  defaultChainId?: string;
  walletServicesConfig?: WalletServicesConfig;
}

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

export type State = AuthSessionData & {
  currentChainId?: string;
};

export type AuthTokenInfo = {
  idToken: string | null;
};

export interface IWeb3Auth {
  provider: IProvider | null;
  signer: Wallet | TransactionSigner | null;
  connected: boolean;
  init: () => Promise<void>;
  connectTo: (params: SdkLoginParams) => Promise<WalletResult | null>;
  logout: () => Promise<void>;
  userInfo: () => State["userInfo"];
  getAccessToken: () => Promise<string>;
  getAuthTokenInfo: () => Promise<AuthTokenInfo>;
  /** @deprecated Use {@link getAuthTokenInfo} instead. */
  getIdentityToken: () => Promise<string | null>;
  refreshSession: () => Promise<void>;
  enableMFA: () => Promise<boolean>;
  manageMFA: () => Promise<void>;
  launchWalletServices: (path?: string) => Promise<void>;
  request(method: string, params: unknown[], path?: string): Promise<string>;
}

export type WalletLoginParams = {
  loginId: string;
  sessionId: string;
  accessToken?: string; // citadel session auth; absent for SFA (session-service)
  request?: {
    method: string;
    params: unknown[];
  };
  platform: string;
  sessionNamespace?: string;
  recordId?: string;
  loginSource?: string;
};

export type SmartAccountType = (typeof SMART_ACCOUNT)[keyof typeof SMART_ACCOUNT];

export type AccountAbstractionConfig = AccountAbstractionMultiChainConfig;

export type ProviderConfig = CustomChainConfig;

export type ChainsConfig = ProviderConfig[];

// Discriminated union for wallet results
export type WalletResult =
  | { chainNamespace: typeof CHAIN_NAMESPACES.SOLANA; provider: IProvider; signer: TransactionSigner }
  | { chainNamespace: typeof CHAIN_NAMESPACES.EIP155; provider: IProvider; signer: Wallet }
  | { chainNamespace: typeof CHAIN_NAMESPACES.OTHER; provider: IProvider; signer: null };

export interface ExternalWalletsConfig {
  disableAllRecommendedWallets?: boolean;
  disableAllOtherWallets?: boolean;
  disabledWallets?: string[];
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
  enableDefiPositionsDisplay?: boolean;
  portfolioWidgetPosition?: BUTTON_POSITION_TYPE;
  defaultPortfolio?: "token" | "nft" | "defi";
}

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

export { AUTH_CONNECTION, BUILD_ENV, LANGUAGES, MFA_FACTOR, MFA_LEVELS, SUPPORTED_KEY_CURVES, THEME_MODES, WEB3AUTH_NETWORK };
