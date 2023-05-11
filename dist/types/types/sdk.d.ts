import type { BaseLogoutParams, BaseRedirectParams, LoginParams, OpenLoginOptions } from "@toruslabs/openlogin";
type SdkSpecificInitParams = {
    sdkUrl?: string;
};
export type SdkInitParams = Omit<OpenLoginOptions & SdkSpecificInitParams, "no3PC" | "uxMode" | "replaceUrlOnRedirect" | "originData" | "_iframeUrl" | "_startUrl" | "_popupUrl" | "_storageServerUrl">;
export type SdkLoginParams = Omit<LoginParams, "fastLogin" | "skipTKey" | "getWalletKey"> & Required<Pick<LoginParams, "loginProvider">>;
export type SdkLogoutParams = Partial<BaseLogoutParams> & Partial<BaseRedirectParams>;
export declare const OPENLOGIN_NETWORK: {
    readonly MAINNET: "mainnet";
    readonly TESTNET: "testnet";
    readonly CYAN: "cyan";
    readonly AQUA: "aqua";
    readonly CELESTE: "celeste";
};
export declare const SUPPORTED_KEY_CURVES: {
    SECP256K1: string;
    ED25519: string;
};
export declare const LOGIN_PROVIDER: {
    readonly GOOGLE: "google";
    readonly FACEBOOK: "facebook";
    readonly REDDIT: "reddit";
    readonly DISCORD: "discord";
    readonly TWITCH: "twitch";
    readonly APPLE: "apple";
    readonly LINE: "line";
    readonly GITHUB: "github";
    readonly KAKAO: "kakao";
    readonly LINKEDIN: "linkedin";
    readonly TWITTER: "twitter";
    readonly WEIBO: "weibo";
    readonly WECHAT: "wechat";
    readonly EMAIL_PASSWORDLESS: "email_passwordless";
    readonly SMS_PASSWORDLESS: "sms_passwordless";
    readonly JWT: "jwt";
};
export declare const MFA_LEVELS: {
    DEFAULT: string;
    OPTIONAL: string;
    MANDATORY: string;
    NONE: string;
};
export type { ALLOWED_INTERACTIONS_TYPE, LOGIN_PROVIDER_TYPE, OPENLOGIN_NETWORK_TYPE, SUPPORTED_KEY_CURVES_TYPE, MfaLevelType, LoginParams, OpenloginUserInfo, } from "@toruslabs/openlogin";
export type { ExtraLoginOptions } from "@toruslabs/openlogin-utils";
export type { WhiteLabelData, TypeOfLogin } from "@toruslabs/openlogin-jrpc";
