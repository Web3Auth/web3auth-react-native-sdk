/**
 * Web3Auth React Native SDK - Global Shim (Polyfill)
 *
 * This file is automatically injected by the Metro bundler when using withWeb3Auth.
 * IMPORTANT: This file runs BEFORE the module system is initialized, so it cannot
 * use require() or import. All code must be self-contained.
 */

// Base64 encoding/decoding (self-contained implementation)
(function () {
  var base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  if (typeof global.btoa === "undefined") {
    global.btoa = function (str) {
      var result = "";
      for (var i = 0; i < str.length; i += 3) {
        var a = str.charCodeAt(i);
        var b = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
        var c = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
        result += base64Chars[a >> 2];
        result += base64Chars[((a & 3) << 4) | (b >> 4)];
        result += i + 1 < str.length ? base64Chars[((b & 15) << 2) | (c >> 6)] : "=";
        result += i + 2 < str.length ? base64Chars[c & 63] : "=";
      }
      return result;
    };
  }

  if (typeof global.atob === "undefined") {
    global.atob = function (str) {
      str = str.replace(/=+$/, "");
      var result = "";
      for (var i = 0; i < str.length; i += 4) {
        var a = base64Chars.indexOf(str[i]);
        var b = base64Chars.indexOf(str[i + 1]);
        var c = base64Chars.indexOf(str[i + 2]);
        var d = base64Chars.indexOf(str[i + 3]);
        result += String.fromCharCode((a << 2) | (b >> 4));
        if (c !== -1) result += String.fromCharCode(((b & 15) << 4) | (c >> 2));
        if (d !== -1) result += String.fromCharCode(((c & 3) << 6) | d);
      }
      return result;
    };
  }

  // ArrayBuffer to/from Base64 helpers
  if (typeof global.base64FromArrayBuffer === "undefined") {
    global.base64FromArrayBuffer = function (buf) {
      var bytes = new Uint8Array(buf);
      var binary = "";
      for (var i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return global.btoa(binary);
    };
  }

  if (typeof global.base64ToArrayBuffer === "undefined") {
    global.base64ToArrayBuffer = function (base64) {
      var binary = global.atob(base64);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    };
  }

  // Location mock for packages that check window.location
  if (typeof global.location === "undefined") {
    global.location = { protocol: "file:" };
  }

  // Process polyfills
  if (typeof global.process === "undefined") {
    global.process = {};
  }
  if (typeof global.process.version === "undefined") {
    global.process.version = "v16.0.0";
  }
  if (typeof global.process.browser === "undefined") {
    global.process.browser = true;
  }

  // Node.js path globals - not available in React Native
  if (typeof global.__filename === "undefined") {
    global.__filename = "";
  }
  if (typeof global.__dirname === "undefined") {
    global.__dirname = "";
  }
})();
