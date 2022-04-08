import { NativeModules } from 'react-native';
export let LoginProvider;

(function (LoginProvider) {
  LoginProvider["GOOGLE"] = "google";
  LoginProvider["FACEBOOK"] = "facebook";
  LoginProvider["REDDIT"] = "reddit";
  LoginProvider["DISCORD"] = "discord";
  LoginProvider["TWITCH"] = "twitch";
  LoginProvider["APPLE"] = "apple";
  LoginProvider["LINE"] = "line";
  LoginProvider["GITHUB"] = "github";
  LoginProvider["KAKAO"] = "kakao";
  LoginProvider["LINKEDIN"] = "linkedin";
  LoginProvider["TWITTER"] = "twitter";
  LoginProvider["WEIBO"] = "weibo";
  LoginProvider["WECHAT"] = "wechat";
  LoginProvider["EMAIL_PASSWORDLESS"] = "email_passwordless";
  LoginProvider["WEBAUTHN"] = "webauthn";
  LoginProvider["JWT"] = "jwt";
})(LoginProvider || (LoginProvider = {}));

export let Web3authNetwork;

(function (Web3authNetwork) {
  Web3authNetwork["MAINNET"] = "mainnet";
  Web3authNetwork["TESTNET"] = "testnet";
  Web3authNetwork["DEVELOPMENT"] = "development";
})(Web3authNetwork || (Web3authNetwork = {}));

const {
  Web3authReactNativeSdk
} = NativeModules;
const sdk = Web3authReactNativeSdk;
export default { ...sdk
};
//# sourceMappingURL=index.js.map