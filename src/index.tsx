import { NativeModules } from 'react-native';

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
  network: OpenloginNetwork;
  redirectUrl?: string;
}

export interface LoginParams {
  provider?: LoginProvider;
  relogin?: boolean;
  dappShare?: string;
  redirectUrl?: string;
  appState?: string;
  extraLoginOptions?: { login_hint?: string };
}

type OpenloginReactNativeSdkType = {
  init(params: InitParams): Promise<void>;
  login(params: { provider?: LoginProvider }): Promise<AuthState>;
  logout(params: {}): Promise<void>;
};

export enum LoginProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  REDDIT = 'reddit',
  DISCORD = 'discord',
  TWITCH = 'twitch',
  APPLE = 'apple',
  LINE = 'line',
  GITHUB = 'github',
  KAKAO = 'kakao',
  LINKEDIN = 'linkedin',
  TWITTER = 'twitter',
  WEIBO = 'weibo',
  WECHAT = 'wechat',
  EMAIL_PASSWORDLESS = 'email_passwordless',
  WEBAUTHN = 'webauthn',
  JWT = 'jwt',
}

export enum OpenloginNetwork {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  DEVELOPMENT = 'development',
}

const { OpenloginReactNativeSdk } = NativeModules;

const sdk = OpenloginReactNativeSdk as OpenloginReactNativeSdkType;

export default { ...sdk };
