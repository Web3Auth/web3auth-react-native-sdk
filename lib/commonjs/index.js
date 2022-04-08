"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Web3authNetwork = exports.LoginProvider = void 0;

var _reactNative = require("react-native");

let LoginProvider;
exports.LoginProvider = LoginProvider;

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
})(LoginProvider || (exports.LoginProvider = LoginProvider = {}));

let Web3authNetwork;
exports.Web3authNetwork = Web3authNetwork;

(function (Web3authNetwork) {
  Web3authNetwork["MAINNET"] = "mainnet";
  Web3authNetwork["TESTNET"] = "testnet";
  Web3authNetwork["DEVELOPMENT"] = "development";
})(Web3authNetwork || (exports.Web3authNetwork = Web3authNetwork = {}));

const {
  Web3authReactNativeSdk
} = _reactNative.NativeModules;
const sdk = Web3authReactNativeSdk;
var _default = { ...sdk
};
exports.default = _default;
//# sourceMappingURL=index.js.map