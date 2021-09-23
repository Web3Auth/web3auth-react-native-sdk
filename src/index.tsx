import { NativeModules, NativeEventEmitter } from 'react-native';

export interface AuthState {
  privKey: string;
  oAuthPrivateKey?: string;
  tKey?: string;
  walletKey?: string;
}

type OpenloginReactNativeSdkType = {
  init(params: {
    clientId: string;
    network: OpenloginNetwork;
    redirectUrl: string;
  }): Promise<void>;
  login(params: { provider: LoginProvider }): Promise<void>;
  logout(params: {}): Promise<void>;
  getState(): Promise<AuthState>;
};

const OpenloginAuthStateChangedEvent = 'OpenloginAuthStateChangedEvent';

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

const eventEmitter = new NativeEventEmitter(OpenloginReactNativeSdk);

const extension = {
  addOpenloginAuthStateChangedEventListener: (
    listener: (state: AuthState) => void
  ) => {
    eventEmitter.addListener(OpenloginAuthStateChangedEvent, listener);
  },
};

const sdk = OpenloginReactNativeSdk as OpenloginReactNativeSdkType;

export default { ...sdk, ...extension };
