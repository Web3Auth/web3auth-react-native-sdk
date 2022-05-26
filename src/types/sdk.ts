import { BaseLogoutParams, BaseRedirectParams, LoginParams, OpenLoginOptions } from "./core";

type SdkSpecificInitParams = {
  sdkUrl?: string;
};

export type SdkInitParams = Omit<
  OpenLoginOptions & SdkSpecificInitParams,
  "no3PC" | "uxMode" | "replaceUrlOnRedirect" | "originData" | "_iframeUrl" | "_startUrl" | "_popupUrl"
>;

export type SdkLoginParams = Omit<LoginParams, "fastLogin" | "skipTKey" | "getWalletKey">;

export type SdkLogoutParams = Partial<BaseLogoutParams> & Partial<BaseRedirectParams>;
