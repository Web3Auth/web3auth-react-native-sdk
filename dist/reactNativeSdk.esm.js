import _asyncToGenerator from '@babel/runtime/helpers/asyncToGenerator';
import _classCallCheck from '@babel/runtime/helpers/classCallCheck';
import _createClass from '@babel/runtime/helpers/createClass';
import _defineProperty from '@babel/runtime/helpers/defineProperty';
import _regeneratorRuntime from '@babel/runtime/regenerator';
import base64url from 'base64url';
import log from 'loglevel';
import { URL } from 'react-native-url-polyfill';
import { decryptData, keccak256, encryptData } from '@toruslabs/metadata-helpers';
import { getPublic, sign } from '@toruslabs/eccrypto';

var OPENLOGIN_NETWORK = {
  MAINNET: "mainnet",
  TESTNET: "testnet",
  CYAN: "cyan",
  AQUA: "aqua",
  CELESTE: "celeste"
};
var SUPPORTED_KEY_CURVES = {
  SECP256K1: "secp256k1",
  ED25519: "ed25519"
};
var LOGIN_PROVIDER = {
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
  JWT: "jwt"
};
var MFA_LEVELS = {
  DEFAULT: "default",
  OPTIONAL: "optional",
  MANDATORY: "mandatory",
  NONE: "none"
};

var Web3AuthApi = /*#__PURE__*/function () {
  function Web3AuthApi() {
    _classCallCheck(this, Web3AuthApi);
  }
  _createClass(Web3AuthApi, null, [{
    key: "authorizeSession",
    value: function () {
      var _authorizeSession = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(key) {
        var response;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return fetch("".concat(this.baseUrl, "/store/get?key=") + key, {
                  method: 'GET'
                });
              case 2:
                response = _context.sent;
                _context.next = 5;
                return response.json();
              case 5:
                return _context.abrupt("return", _context.sent);
              case 6:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));
      function authorizeSession(_x) {
        return _authorizeSession.apply(this, arguments);
      }
      return authorizeSession;
    }()
  }, {
    key: "logout",
    value: function () {
      var _logout = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(logoutApiRequest) {
        var response;
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return fetch("".concat(this.baseUrl, "/store/set"), {
                  method: 'POST',
                  body: JSON.stringify({
                    logoutApiRequest: logoutApiRequest
                  })
                });
              case 2:
                response = _context2.sent;
                _context2.next = 5;
                return response.json();
              case 5:
                return _context2.abrupt("return", _context2.sent);
              case 6:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));
      function logout(_x2) {
        return _logout.apply(this, arguments);
      }
      return logout;
    }()
  }]);
  return Web3AuthApi;
}();
_defineProperty(Web3AuthApi, "baseUrl", "https://broadcast-server.tor.us");

var KeyStore = /*#__PURE__*/function () {
  function KeyStore(storage) {
    _classCallCheck(this, KeyStore);
    _defineProperty(this, "storage", void 0);
    this.storage = storage;
  }
  _createClass(KeyStore, [{
    key: "get",
    value: function () {
      var _get = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(key) {
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!('getItemAsync' in this.storage)) {
                  _context.next = 4;
                  break;
                }
                return _context.abrupt("return", this.storage.getItemAsync(key, {}));
              case 4:
                return _context.abrupt("return", this.storage.getItem(key));
              case 5:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));
      function get(_x) {
        return _get.apply(this, arguments);
      }
      return get;
    }()
  }, {
    key: "set",
    value: function () {
      var _set = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(key, value) {
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!('setItemAsync' in this.storage)) {
                  _context2.next = 4;
                  break;
                }
                return _context2.abrupt("return", this.storage.setItemAsync(key, value, {}));
              case 4:
                return _context2.abrupt("return", this.storage.setItem(key, value));
              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));
      function set(_x2, _x3) {
        return _set.apply(this, arguments);
      }
      return set;
    }()
  }, {
    key: "remove",
    value: function () {
      var _remove = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(key) {
        return _regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (!('deleteItemAsync' in this.storage)) {
                  _context3.next = 4;
                  break;
                }
                return _context3.abrupt("return", this.storage.deleteItemAsync(key, {}));
              case 4:
                return _context3.abrupt("return", this.storage.removeItem(key));
              case 5:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));
      function remove(_x4) {
        return _remove.apply(this, arguments);
      }
      return remove;
    }()
  }]);
  return KeyStore;
}();

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
process.browser = true;
var Web3Auth = /*#__PURE__*/function () {
  function Web3Auth(webBrowser, storage, initParams) {
    _classCallCheck(this, Web3Auth);
    _defineProperty(this, "initParams", void 0);
    _defineProperty(this, "webBrowser", void 0);
    _defineProperty(this, "keyStore", void 0);
    this.initParams = initParams;
    if (!this.initParams.sdkUrl) {
      this.initParams.sdkUrl = "https://sdk.openlogin.com";
    }
    this.webBrowser = webBrowser;
    this.keyStore = new KeyStore(storage);
  }
  _createClass(Web3Auth, [{
    key: "init",
    value: function () {
      var _init = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                return _context.abrupt("return", this.authorizeSession());
              case 1:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));
      function init() {
        return _init.apply(this, arguments);
      }
      return init;
    }()
  }, {
    key: "login",
    value: function () {
      var _login = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(options) {
        var _state$userInfo;
        var loginConfigItem, share, result, fragment, decodedPayload, state, _state$userInfo2, _state$userInfo3;
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!this.initParams.loginConfig) {
                  _context2.next = 7;
                  break;
                }
                loginConfigItem = Object.values(this.initParams.loginConfig)[0];
                if (!loginConfigItem) {
                  _context2.next = 7;
                  break;
                }
                _context2.next = 5;
                return this.keyStore.get(loginConfigItem.verifier);
              case 5:
                share = _context2.sent;
                if (share) {
                  options.dappShare = share;
                }
              case 7:
                _context2.next = 9;
                return this.request("login", options.redirectUrl, options);
              case 9:
                result = _context2.sent;
                if (!(result.type !== "success" || !result.url)) {
                  _context2.next = 13;
                  break;
                }
                log.error("[Web3Auth] login flow failed with error type ".concat(result.type));
                throw new Error("login flow failed with error type ".concat(result.type));
              case 13:
                fragment = new URL(result.url).hash;
                decodedPayload = base64url.decode(fragment);
                state = JSON.parse(decodedPayload);
                _context2.next = 18;
                return this.keyStore.set("sessionId", state === null || state === void 0 ? void 0 : state.sessionId);
              case 18:
                if (((_state$userInfo = state.userInfo) === null || _state$userInfo === void 0 ? void 0 : _state$userInfo.dappShare.length) > 0) {
                  this.keyStore.set((_state$userInfo2 = state.userInfo) === null || _state$userInfo2 === void 0 ? void 0 : _state$userInfo2.verifier, (_state$userInfo3 = state.userInfo) === null || _state$userInfo3 === void 0 ? void 0 : _state$userInfo3.dappShare);
                }
                return _context2.abrupt("return", state);
              case 20:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));
      function login(_x) {
        return _login.apply(this, arguments);
      }
      return login;
    }()
  }, {
    key: "logout",
    value: function () {
      var _logout = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(options) {
        var result;
        return _regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                this.sessionTimeout();
                _context3.next = 3;
                return this.request("logout", options.redirectUrl, options);
              case 3:
                result = _context3.sent;
                if (!(result.type !== "success" || !result.url)) {
                  _context3.next = 7;
                  break;
                }
                log.error("[Web3Auth] logout flow failed with error type ".concat(result.type));
                throw new Error("logout flow failed with error type ".concat(result.type));
              case 7:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));
      function logout(_x2) {
        return _logout.apply(this, arguments);
      }
      return logout;
    }()
  }, {
    key: "request",
    value: function () {
      var _request = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(path, redirectUrl) {
        var params,
          initParams,
          mergedParams,
          hash,
          url,
          _args4 = arguments;
        return _regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                params = _args4.length > 2 && _args4[2] !== undefined ? _args4[2] : {};
                initParams = _objectSpread(_objectSpread({}, this.initParams), {}, {
                  clientId: this.initParams.clientId,
                  network: this.initParams.network
                }, !!this.initParams.redirectUrl && {
                  redirectUrl: this.initParams.redirectUrl
                });
                mergedParams = {
                  init: initParams,
                  params: _objectSpread(_objectSpread({}, params), !params.redirectUrl && {
                    redirectUrl: redirectUrl
                  })
                };
                log.debug("[Web3Auth] params passed to Web3Auth: ".concat(mergedParams));
                hash = base64url.encode(JSON.stringify(mergedParams));
                url = new URL(this.initParams.sdkUrl);
                url.pathname = "".concat(url.pathname).concat(path);
                url.hash = hash;
                log.info("[Web3Auth] opening login screen in browser at ".concat(url.href, ", will redirect to ").concat(redirectUrl));
                return _context4.abrupt("return", this.webBrowser.openAuthSessionAsync(url.href, redirectUrl));
              case 10:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));
      function request(_x3, _x4) {
        return _request.apply(this, arguments);
      }
      return request;
    }()
  }, {
    key: "authorizeSession",
    value: function () {
      var _authorizeSession = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5() {
        var sessionId, pubKey, response, web3AuthResponse;
        return _regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this.keyStore.get("sessionId");
              case 2:
                sessionId = _context5.sent;
                if (!(sessionId && sessionId.length > 0)) {
                  _context5.next = 20;
                  break;
                }
                pubKey = getPublic(Buffer.from(sessionId, "hex")).toString("hex");
                _context5.next = 7;
                return Web3AuthApi.authorizeSession(pubKey);
              case 7:
                response = _context5.sent;
                _context5.next = 10;
                return decryptData(sessionId, response.message);
              case 10:
                web3AuthResponse = _context5.sent;
                web3AuthResponse["userInfo"] = web3AuthResponse["store"];
                delete web3AuthResponse['store'];
                if (web3AuthResponse.error) {
                  _context5.next = 19;
                  break;
                }
                web3AuthResponse = web3AuthResponse;
                if (!(web3AuthResponse.privKey && web3AuthResponse.privKey.trim('0').length > 0)) {
                  _context5.next = 17;
                  break;
                }
                return _context5.abrupt("return", Promise.resolve(web3AuthResponse));
              case 17:
                _context5.next = 20;
                break;
              case 19:
                throw new Error("session recovery failed with error ".concat(web3AuthResponse.error));
              case 20:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));
      function authorizeSession() {
        return _authorizeSession.apply(this, arguments);
      }
      return authorizeSession;
    }()
  }, {
    key: "sessionTimeout",
    value: function () {
      var _sessionTimeout = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6() {
        var sessionId, pubKey, response, shareMetadata, encryptedData, encryptedMetadata, jsonData, hashData, loginConfigItem;
        return _regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return this.keyStore.get("sessionId");
              case 2:
                sessionId = _context6.sent;
                if (!(sessionId && sessionId.length > 0)) {
                  _context6.next = 34;
                  break;
                }
                pubKey = getPublic(Buffer.from(sessionId, "hex")).toString("hex");
                _context6.next = 7;
                return Web3AuthApi.authorizeSession(pubKey);
              case 7:
                response = _context6.sent;
                if (response.success) {
                  _context6.next = 10;
                  break;
                }
                return _context6.abrupt("return");
              case 10:
                shareMetadata = JSON.parse(response.message);
                _context6.next = 13;
                return encryptData(sessionId, "");
              case 13:
                encryptedData = _context6.sent;
                encryptedMetadata = _objectSpread(_objectSpread({}, shareMetadata), {}, {
                  ciphertext: encryptedData
                });
                jsonData = JSON.stringify(encryptedMetadata);
                hashData = keccak256(jsonData);
                _context6.prev = 17;
                _context6.t0 = Web3AuthApi;
                _context6.t1 = getPublic(Buffer.from(sessionId, "hex")).toString("hex");
                _context6.t2 = jsonData;
                _context6.next = 23;
                return sign(Buffer.from(sessionId, "hex"), hashData);
              case 23:
                _context6.t3 = _context6.sent.toString("hex");
                _context6.t4 = {
                  key: _context6.t1,
                  data: _context6.t2,
                  signature: _context6.t3,
                  timeout: 1
                };
                _context6.next = 27;
                return _context6.t0.logout.call(_context6.t0, _context6.t4);
              case 27:
                this.keyStore.remove("sessionId");
                if (this.initParams.loginConfig) {
                  loginConfigItem = Object.values(this.initParams.loginConfig)[0];
                  if (loginConfigItem) {
                    this.keyStore.remove(loginConfigItem.verifier);
                  }
                }
                _context6.next = 34;
                break;
              case 31:
                _context6.prev = 31;
                _context6.t5 = _context6["catch"](17);
                log.error(_context6.t5);
              case 34:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this, [[17, 31]]);
      }));
      function sessionTimeout() {
        return _sessionTimeout.apply(this, arguments);
      }
      return sessionTimeout;
    }()
  }]);
  return Web3Auth;
}();

export { LOGIN_PROVIDER, MFA_LEVELS, OPENLOGIN_NETWORK, SUPPORTED_KEY_CURVES, Web3Auth as default };
//# sourceMappingURL=reactNativeSdk.esm.js.map
