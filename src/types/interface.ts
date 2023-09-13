import type { LoginParams, OpenLoginOptions, OpenloginSessionData } from "@toruslabs/openlogin-utils";

type SdkSpecificInitParams = {
  enableLogging?: boolean;
  useCoreKitKey?: boolean;
};

export type SdkInitParams = Omit<
  OpenLoginOptions & SdkSpecificInitParams,
  "no3PC" | "uxMode" | "replaceUrlOnRedirect" | "originData"
>;

export type SdkLoginParams = Omit<LoginParams, "fastLogin" | "skipTKey" | "getWalletKey"> & Required<Pick<LoginParams, "loginProvider">>;

// export type SdkLogoutParams = Partial<BaseLogoutParams> & Partial<BaseRedirectParams>;

export const SUPPORTED_KEY_CURVES = {
  SECP256K1: "secp256k1",
  ED25519: "ed25519",
};

export const LOGIN_PROVIDER = {
  GOOGLE: "google",
  FACEBOOK: "facebook",
  REDDIT: "reddit",
  DISCORD: "discord",
  TWITCH: "twitch",
  APPLE: "apple",
  LINE: "line",
  GITHUB: "github",
  KAKAO: "kakao",
  LINKEDIN: "linkedin",
  TWITTER: "twitter",
  WEIBO: "weibo",
  WECHAT: "wechat",
  EMAIL_PASSWORDLESS: "email_passwordless",
  SMS_PASSWORDLESS: "sms_passwordless",
  JWT: "jwt",
} as const;

export const MFA_LEVELS = {
  DEFAULT: "default",
  OPTIONAL: "optional",
  MANDATORY: "mandatory",
  NONE: "none",
};

export type {
  LOGIN_PROVIDER_TYPE,
  OPENLOGIN_NETWORK_TYPE,
  SUPPORTED_KEY_CURVES_TYPE,
  MfaLevelType,
  LoginParams,
  OpenloginUserInfo,
  CUSTOM_LOGIN_PROVIDER_TYPE,
  ExtraLoginOptions,
  WhiteLabelData, TypeOfLogin,
} from "@toruslabs/openlogin-utils";

export type State = OpenloginSessionData;

export interface IWeb3Auth {
  privKey: string | undefined;
  ed25519Key: string | undefined;
  init: () => Promise<void>;
  login: (params: SdkLoginParams) => Promise<void>;
  logout: () => Promise<void>;
  userInfo: () => State["userInfo"];
}

export { OpenloginSessionData }