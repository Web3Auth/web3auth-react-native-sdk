/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 249:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Z": () => (/* binding */ src_Web3Auth)
});

;// CONCATENATED MODULE: external "@babel/runtime/helpers/asyncToGenerator"
const asyncToGenerator_namespaceObject = require("@babel/runtime/helpers/asyncToGenerator");
var asyncToGenerator_default = /*#__PURE__*/__webpack_require__.n(asyncToGenerator_namespaceObject);
;// CONCATENATED MODULE: external "@babel/runtime/helpers/classCallCheck"
const classCallCheck_namespaceObject = require("@babel/runtime/helpers/classCallCheck");
var classCallCheck_default = /*#__PURE__*/__webpack_require__.n(classCallCheck_namespaceObject);
;// CONCATENATED MODULE: external "@babel/runtime/helpers/createClass"
const createClass_namespaceObject = require("@babel/runtime/helpers/createClass");
var createClass_default = /*#__PURE__*/__webpack_require__.n(createClass_namespaceObject);
;// CONCATENATED MODULE: external "@babel/runtime/helpers/defineProperty"
const defineProperty_namespaceObject = require("@babel/runtime/helpers/defineProperty");
var defineProperty_default = /*#__PURE__*/__webpack_require__.n(defineProperty_namespaceObject);
;// CONCATENATED MODULE: external "@babel/runtime/regenerator"
const regenerator_namespaceObject = require("@babel/runtime/regenerator");
var regenerator_default = /*#__PURE__*/__webpack_require__.n(regenerator_namespaceObject);
;// CONCATENATED MODULE: external "base64url"
const external_base64url_namespaceObject = require("base64url");
var external_base64url_default = /*#__PURE__*/__webpack_require__.n(external_base64url_namespaceObject);
;// CONCATENATED MODULE: external "loglevel"
const external_loglevel_namespaceObject = require("loglevel");
var external_loglevel_default = /*#__PURE__*/__webpack_require__.n(external_loglevel_namespaceObject);
;// CONCATENATED MODULE: external "react-native-url-polyfill"
const external_react_native_url_polyfill_namespaceObject = require("react-native-url-polyfill");
;// CONCATENATED MODULE: external "@toruslabs/metadata-helpers"
const metadata_helpers_namespaceObject = require("@toruslabs/metadata-helpers");
;// CONCATENATED MODULE: external "@toruslabs/eccrypto"
const eccrypto_namespaceObject = require("@toruslabs/eccrypto");
;// CONCATENATED MODULE: ./src/api/Web3AuthApi.ts





var Web3AuthApi = /*#__PURE__*/function () {
  function Web3AuthApi() {
    classCallCheck_default()(this, Web3AuthApi);
  }
  createClass_default()(Web3AuthApi, null, [{
    key: "authorizeSession",
    value: function () {
      var _authorizeSession = asyncToGenerator_default()( /*#__PURE__*/regenerator_default().mark(function _callee(key) {
        var response;
        return regenerator_default().wrap(function _callee$(_context) {
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
      var _logout = asyncToGenerator_default()( /*#__PURE__*/regenerator_default().mark(function _callee2(logoutApiRequest) {
        var response;
        return regenerator_default().wrap(function _callee2$(_context2) {
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
defineProperty_default()(Web3AuthApi, "baseUrl", "https://broadcast-server.tor.us");
;// CONCATENATED MODULE: ./src/session/KeyStore.ts





var KeyStore = /*#__PURE__*/function () {
  function KeyStore(storage) {
    classCallCheck_default()(this, KeyStore);
    defineProperty_default()(this, "storage", void 0);
    this.storage = storage;
  }
  createClass_default()(KeyStore, [{
    key: "get",
    value: function () {
      var _get = asyncToGenerator_default()( /*#__PURE__*/regenerator_default().mark(function _callee(key) {
        return regenerator_default().wrap(function _callee$(_context) {
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
      var _set = asyncToGenerator_default()( /*#__PURE__*/regenerator_default().mark(function _callee2(key, value) {
        return regenerator_default().wrap(function _callee2$(_context2) {
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
      var _remove = asyncToGenerator_default()( /*#__PURE__*/regenerator_default().mark(function _callee3(key) {
        return regenerator_default().wrap(function _callee3$(_context3) {
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

;// CONCATENATED MODULE: ./src/Web3Auth.ts




function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { defineProperty_default()(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

process.browser = true;







var Web3Auth = /*#__PURE__*/function () {
  function Web3Auth(webBrowser, storage, initParams) {
    classCallCheck_default()(this, Web3Auth);
    defineProperty_default()(this, "initParams", void 0);
    defineProperty_default()(this, "webBrowser", void 0);
    defineProperty_default()(this, "keyStore", void 0);
    this.initParams = initParams;
    if (!this.initParams.sdkUrl) {
      this.initParams.sdkUrl = "https://sdk.openlogin.com";
    }
    this.webBrowser = webBrowser;
    this.keyStore = new KeyStore(storage);
  }
  createClass_default()(Web3Auth, [{
    key: "init",
    value: function () {
      var _init = asyncToGenerator_default()( /*#__PURE__*/regenerator_default().mark(function _callee() {
        return regenerator_default().wrap(function _callee$(_context) {
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
      var _login = asyncToGenerator_default()( /*#__PURE__*/regenerator_default().mark(function _callee2(options) {
        var _state$userInfo;
        var loginConfigItem, share, result, fragment, decodedPayload, state, _state$userInfo2, _state$userInfo3;
        return regenerator_default().wrap(function _callee2$(_context2) {
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
                external_loglevel_default().error("[Web3Auth] login flow failed with error type ".concat(result.type));
                throw new Error("login flow failed with error type ".concat(result.type));
              case 13:
                fragment = new external_react_native_url_polyfill_namespaceObject.URL(result.url).hash;
                decodedPayload = external_base64url_default().decode(fragment);
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
      var _logout = asyncToGenerator_default()( /*#__PURE__*/regenerator_default().mark(function _callee3(options) {
        var result;
        return regenerator_default().wrap(function _callee3$(_context3) {
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
                external_loglevel_default().error("[Web3Auth] logout flow failed with error type ".concat(result.type));
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
      var _request = asyncToGenerator_default()( /*#__PURE__*/regenerator_default().mark(function _callee4(path, redirectUrl) {
        var params,
          initParams,
          mergedParams,
          hash,
          url,
          _args4 = arguments;
        return regenerator_default().wrap(function _callee4$(_context4) {
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
                external_loglevel_default().debug("[Web3Auth] params passed to Web3Auth: ".concat(mergedParams));
                hash = external_base64url_default().encode(JSON.stringify(mergedParams));
                url = new external_react_native_url_polyfill_namespaceObject.URL(this.initParams.sdkUrl);
                url.pathname = "".concat(url.pathname).concat(path);
                url.hash = hash;
                external_loglevel_default().info("[Web3Auth] opening login screen in browser at ".concat(url.href, ", will redirect to ").concat(redirectUrl));
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
      var _authorizeSession = asyncToGenerator_default()( /*#__PURE__*/regenerator_default().mark(function _callee5() {
        var sessionId, pubKey, response, web3AuthResponse;
        return regenerator_default().wrap(function _callee5$(_context5) {
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
                pubKey = (0,eccrypto_namespaceObject.getPublic)(Buffer.from(sessionId, "hex")).toString("hex");
                _context5.next = 7;
                return Web3AuthApi.authorizeSession(pubKey);
              case 7:
                response = _context5.sent;
                _context5.next = 10;
                return (0,metadata_helpers_namespaceObject.decryptData)(sessionId, response.message);
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
      var _sessionTimeout = asyncToGenerator_default()( /*#__PURE__*/regenerator_default().mark(function _callee6() {
        var sessionId, pubKey, response, shareMetadata, encryptedData, encryptedMetadata, jsonData, hashData, loginConfigItem;
        return regenerator_default().wrap(function _callee6$(_context6) {
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
                pubKey = (0,eccrypto_namespaceObject.getPublic)(Buffer.from(sessionId, "hex")).toString("hex");
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
                return (0,metadata_helpers_namespaceObject.encryptData)(sessionId, "");
              case 13:
                encryptedData = _context6.sent;
                encryptedMetadata = _objectSpread(_objectSpread({}, shareMetadata), {}, {
                  ciphertext: encryptedData
                });
                jsonData = JSON.stringify(encryptedMetadata);
                hashData = (0,metadata_helpers_namespaceObject.keccak256)(jsonData);
                _context6.prev = 17;
                _context6.t0 = Web3AuthApi;
                _context6.t1 = (0,eccrypto_namespaceObject.getPublic)(Buffer.from(sessionId, "hex")).toString("hex");
                _context6.t2 = jsonData;
                _context6.next = 23;
                return (0,eccrypto_namespaceObject.sign)(Buffer.from(sessionId, "hex"), hashData);
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
                external_loglevel_default().error(_context6.t5);
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
/* harmony default export */ const src_Web3Auth = (Web3Auth);

/***/ }),

/***/ 288:
/***/ (() => {



/***/ }),

/***/ 270:
/***/ (() => {



/***/ }),

/***/ 284:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "M_": () => (/* binding */ MFA_LEVELS),
/* harmony export */   "dr": () => (/* binding */ OPENLOGIN_NETWORK),
/* harmony export */   "hG": () => (/* binding */ LOGIN_PROVIDER),
/* harmony export */   "x7": () => (/* binding */ SUPPORTED_KEY_CURVES)
/* harmony export */ });
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

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "LOGIN_PROVIDER": () => (/* reexport safe */ _types_sdk__WEBPACK_IMPORTED_MODULE_1__.hG),
/* harmony export */   "MFA_LEVELS": () => (/* reexport safe */ _types_sdk__WEBPACK_IMPORTED_MODULE_1__.M_),
/* harmony export */   "OPENLOGIN_NETWORK": () => (/* reexport safe */ _types_sdk__WEBPACK_IMPORTED_MODULE_1__.dr),
/* harmony export */   "SUPPORTED_KEY_CURVES": () => (/* reexport safe */ _types_sdk__WEBPACK_IMPORTED_MODULE_1__.x7),
/* harmony export */   "default": () => (/* reexport safe */ _Web3Auth__WEBPACK_IMPORTED_MODULE_3__.Z)
/* harmony export */ });
/* harmony import */ var _types_IWebBrowser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(288);
/* harmony import */ var _types_IWebBrowser__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_types_IWebBrowser__WEBPACK_IMPORTED_MODULE_0__);
/* harmony reexport (unknown) */ var __WEBPACK_REEXPORT_OBJECT__ = {};
/* harmony reexport (unknown) */ for(const __WEBPACK_IMPORT_KEY__ in _types_IWebBrowser__WEBPACK_IMPORTED_MODULE_0__) if(__WEBPACK_IMPORT_KEY__ !== "default") __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = () => _types_IWebBrowser__WEBPACK_IMPORTED_MODULE_0__[__WEBPACK_IMPORT_KEY__]
/* harmony reexport (unknown) */ __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
/* harmony import */ var _types_sdk__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(284);
/* harmony import */ var _types_State__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(270);
/* harmony import */ var _types_State__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_types_State__WEBPACK_IMPORTED_MODULE_2__);
/* harmony reexport (unknown) */ var __WEBPACK_REEXPORT_OBJECT__ = {};
/* harmony reexport (unknown) */ for(const __WEBPACK_IMPORT_KEY__ in _types_State__WEBPACK_IMPORTED_MODULE_2__) if(["default","LOGIN_PROVIDER","MFA_LEVELS","OPENLOGIN_NETWORK","SUPPORTED_KEY_CURVES"].indexOf(__WEBPACK_IMPORT_KEY__) < 0) __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = () => _types_State__WEBPACK_IMPORTED_MODULE_2__[__WEBPACK_IMPORT_KEY__]
/* harmony reexport (unknown) */ __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
/* harmony import */ var _Web3Auth__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(249);




})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=reactNativeSdk.cjs.js.map