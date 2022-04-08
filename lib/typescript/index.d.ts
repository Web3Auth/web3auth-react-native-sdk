export interface AuthState {
    privKey?: string;
    ed25519PrivKey?: string;
    userInfo?: UserInfo;
}
export interface UserInfo {
    email?: string;
    name?: string;
    profileImage?: string;
    aggregateVerifier?: string;
    verifier?: string;
    verifierId?: string;
    typeOfLogin?: string;
}
export interface InitParams {
    clientId: string;
    network: Web3authNetwork;
    redirectUrl?: string;
}
export interface LoginParams {
    provider?: LoginProvider;
    relogin?: boolean;
    dappShare?: string;
    redirectUrl?: string;
    appState?: string;
    extraLoginOptions?: {
        login_hint?: string;
    };
}
export declare enum LoginProvider {
    GOOGLE = "google",
    FACEBOOK = "facebook",
    REDDIT = "reddit",
    DISCORD = "discord",
    TWITCH = "twitch",
    APPLE = "apple",
    LINE = "line",
    GITHUB = "github",
    KAKAO = "kakao",
    LINKEDIN = "linkedin",
    TWITTER = "twitter",
    WEIBO = "weibo",
    WECHAT = "wechat",
    EMAIL_PASSWORDLESS = "email_passwordless",
    WEBAUTHN = "webauthn",
    JWT = "jwt"
}
export declare enum Web3authNetwork {
    MAINNET = "mainnet",
    TESTNET = "testnet",
    DEVELOPMENT = "development"
}
declare const _default: {
    init(params: InitParams): Promise<void>;
    login(params: {
        provider?: LoginProvider | undefined;
    }): Promise<AuthState>;
    logout(params: {}): Promise<void>;
};
export default _default;
