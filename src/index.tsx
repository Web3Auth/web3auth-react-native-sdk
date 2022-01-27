import { NativeModules } from 'react-native';

export interface AuthState {
  privKey?: string;
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

type OpenloginReactNativeSdkType = {
  init(params: {
    clientId: string;
    network: OpenloginNetwork;
    redirectUrl: string;
  }): Promise<void>;
  login(params: { provider: LoginProvider }): Promise<AuthState>;
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
