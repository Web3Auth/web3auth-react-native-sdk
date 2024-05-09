import {
  type LoginParams,
  type OpenLoginOptions,
  type OpenloginSessionData,
  BUILD_ENV,
  LANGUAGES,
  LOGIN_PROVIDER,
  SUPPORTED_KEY_CURVES,
  MFA_FACTOR,
  MFA_LEVELS,
  OPENLOGIN_NETWORK,
  THEME_MODES,
} from "@toruslabs/openlogin-utils";

type SdkSpecificInitParams = {
  enableLogging?: boolean;
  useCoreKitKey?: boolean;
  walletSdkURL?: string;
};

export type SdkInitParams = Omit<OpenLoginOptions & SdkSpecificInitParams, "uxMode" | "replaceUrlOnRedirect" | "storageKey">;

export type SdkLoginParams = Omit<LoginParams, "getWalletKey">;

// export type SdkLogoutParams = Partial<BaseLogoutParams> & Partial<BaseRedirectParams>;

export type {
  LOGIN_PROVIDER_TYPE,
  OPENLOGIN_NETWORK_TYPE,
  SUPPORTED_KEY_CURVES_TYPE,
  MfaLevelType,
  LoginParams,
  OpenloginUserInfo,
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
  OpenloginSessionData,
} from "@toruslabs/openlogin-utils";

export type State = OpenloginSessionData;

export interface IWeb3Auth {
  privKey: string | undefined;
  ed25519Key: string | undefined;
  init: () => Promise<void>;
  login: (params: SdkLoginParams) => Promise<void>;
  logout: () => Promise<void>;
  userInfo: () => State["userInfo"];
  enableMFA: () => Promise<boolean>;
  launchWalletServices: (chainConfig: ChainConfig, path?: string) => Promise<void>;
}

export type WalletLoginParams = {
  loginId?: string;
  sessionId?: string;
  isReactNative: boolean;
};

export enum ChainNamespace {
  EIP155 = "eip155",
  SOLANA = "solana",
}

export type ChainConfig = {
  chainNamespace?: ChainNamespace;
  decimals: number;
  blockExplorerUrl?: String;
  chainId: String;
  displayName?: String;
  logo?: String;
  rpcTarget: String;
  ticker: String;
  tickerName?: String;
};

export { BUILD_ENV, OPENLOGIN_NETWORK, LANGUAGES, LOGIN_PROVIDER, SUPPORTED_KEY_CURVES, MFA_FACTOR, MFA_LEVELS, THEME_MODES };
