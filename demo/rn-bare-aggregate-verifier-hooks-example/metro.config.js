const { getDefaultConfig } = require("@react-native/metro-config");
const { withWeb3Auth } = require("@web3auth/react-native-sdk/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

// Wrap the config with Web3Auth's Metro configuration
// This automatically sets up all necessary polyfills and shims
module.exports = withWeb3Auth(defaultConfig, {
  // Optional: Add additional packages that need .js extension fix
  // additionalPackagesForJsExtFix: ['some-other-package'],
});
