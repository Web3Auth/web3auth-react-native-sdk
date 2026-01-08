global.Buffer = require("buffer").Buffer;

// Pure base64 implementation (no Buffer.from)
const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

global.btoa =
  global.btoa ||
  function (str) {
    let result = "";
    for (let i = 0; i < str.length; i += 3) {
      const a = str.charCodeAt(i);
      const b = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
      const c = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
      result += base64Chars[a >> 2];
      result += base64Chars[((a & 3) << 4) | (b >> 4)];
      result += i + 1 < str.length ? base64Chars[((b & 15) << 2) | (c >> 6)] : "=";
      result += i + 2 < str.length ? base64Chars[c & 63] : "=";
    }
    return result;
  };

global.atob =
  global.atob ||
  function (str) {
    str = str.replace(/=+$/, "");
    let result = "";
    for (let i = 0; i < str.length; i += 4) {
      const a = base64Chars.indexOf(str[i]);
      const b = base64Chars.indexOf(str[i + 1]);
      const c = base64Chars.indexOf(str[i + 2]);
      const d = base64Chars.indexOf(str[i + 3]);
      result += String.fromCharCode((a << 2) | (b >> 4));
      if (c !== -1) result += String.fromCharCode(((b & 15) << 4) | (c >> 2));
      if (d !== -1) result += String.fromCharCode(((c & 3) << 6) | d);
    }
    return result;
  };

global.base64FromArrayBuffer = function (buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return global.btoa(binary);
};

global.base64ToArrayBuffer = function (base64) {
  const binary = global.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

import { install } from "react-native-quick-crypto";

install();

global.location = { protocol: "file:" };
global.process.version = "v16.0.0";
process.browser = true;

// Node.js path globals - not available in React Native
global.__filename = "";
global.__dirname = "";
