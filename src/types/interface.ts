import {
  AUTH_CONNECTION,
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
} from "@web3auth/auth";
import type { IBaseProvider, IProvider } from "@web3auth/base";
import { type WalletServicesConfig } from "@web3auth/no-modal";

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

export { AUTH_CONNECTION, BUILD_ENV, LANGUAGES, MFA_FACTOR, MFA_LEVELS, SUPPORTED_KEY_CURVES, THEME_MODES, WEB3AUTH_NETWORK };
