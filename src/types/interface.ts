import {
  type LoginParams,
  type AuthOptions,
  type AuthSessionData,
  type WhiteLabelData,
  BUILD_ENV,
  LANGUAGES,
  LOGIN_PROVIDER,
  SUPPORTED_KEY_CURVES,
  MFA_FACTOR,
  MFA_LEVELS,
  WEB3AUTH_NETWORK,
  THEME_MODES,
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
  Required<Pick<AuthOptions, "redirectUrl">>;

export type SdkLoginParams = Omit<LoginParams, "getWalletKey">;

// export type SdkLogoutParams = Partial<BaseLogoutParams> & Partial<BaseRedirectParams>;

export type {
  LOGIN_PROVIDER_TYPE,
  WEB3AUTH_NETWORK_TYPE,
  SUPPORTED_KEY_CURVES_TYPE,
  MfaLevelType,
  LoginParams,
  AuthUserInfo,
  CUSTOM_LOGIN_PROVIDER_TYPE,
  ExtraLoginOptions,
  WhiteLabelData,
  TypeOfLogin,
  BUILD_ENV_TYPE,
  LANGUAGE_TYPE,
  MFA_FACTOR_TYPE,
  MFA_SETTINGS,
  MfaSettings,
  SocialMfaModParams,
  THEME_MODE_TYPE,
  AuthSessionData,
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
  launchWalletServices: (chainConfig: ChainConfig, path?: string) => Promise<void>;
  request(chainConfig: ChainConfig, method: string, params: unknown[], path?: string): Promise<string>;
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
  blockExplorerUrl?: String;
  chainId: String;
  displayName?: String;
  logo?: String;
  rpcTarget: String;
  ticker?: String;
  tickerName?: String;
};

export interface WhitelistResponse {
  urls: string[];
  signed_urls: Record<string, string>;
}

export interface ProjectConfigResponse {
  whitelabel?: WhiteLabelData;
  sms_otp_enabled: boolean;
  wallet_connect_enabled: boolean;
  wallet_connect_project_id?: string;
  whitelist?: WhitelistResponse;
  key_export_enabled?: boolean;
}

export { BUILD_ENV, WEB3AUTH_NETWORK, LANGUAGES, LOGIN_PROVIDER, SUPPORTED_KEY_CURVES, MFA_FACTOR, MFA_LEVELS, THEME_MODES };
