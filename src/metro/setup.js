/**
 * Web3Auth React Native SDK - Setup Module
 *
 * This module should be imported at the top of your app's entry point (index.js)
 * BEFORE any other imports. It sets up the necessary polyfills that require
 * the module system to be available.
 *
 * Usage in index.js:
 *   import '@web3auth/react-native-sdk/setup';
 *   import { AppRegistry } from 'react-native';
 *   // ... rest of your imports
 */

// Buffer polyfill
if (typeof global.Buffer === "undefined") {
  global.Buffer = require("buffer").Buffer;
}

// Install react-native-quick-crypto for native crypto support
try {
  const { install } = require("react-native-quick-crypto");
  install();
} catch (e) {
  // react-native-quick-crypto not installed, crypto-browserify will be used instead
  // This is fine - the metro config will use crypto-browserify as fallback
}
