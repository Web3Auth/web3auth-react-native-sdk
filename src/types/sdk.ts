import type { BaseLogoutParams, BaseRedirectParams, LoginParams, OpenLoginOptions } from "@toruslabs/openlogin";

type SdkSpecificInitParams = {
  sdkUrl?: string;
};

export type SdkInitParams = Omit<
  OpenLoginOptions & SdkSpecificInitParams,
  "no3PC" | "uxMode" | "replaceUrlOnRedirect" | "originData" | "_iframeUrl" | "_startUrl" | "_popupUrl" | "_storageServerUrl"
>;

export type SdkLoginParams = Omit<LoginParams, "fastLogin" | "skipTKey" | "getWalletKey">;

export type SdkLogoutParams = Partial<BaseLogoutParams> & Partial<BaseRedirectParams>;

export const OPENLOGIN_NETWORK = {
  MAINNET: "mainnet",
  TESTNET: "testnet",
  CYAN: "cyan",
} as const;

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
  WEBAUTHN: "webauthn",
  JWT: "jwt",
} as const;

export type { ALLOWED_INTERACTIONS_TYPE, LOGIN_PROVIDER_TYPE, OPENLOGIN_NETWORK_TYPE, SUPPORTED_KEY_CURVES_TYPE } from "@toruslabs/openlogin";
export type { ExtraLoginOptions } from "@toruslabs/openlogin-utils";
export type { WhiteLabelData, TypeOfLogin } from "@toruslabs/openlogin-jrpc";
