// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withWeb3Auth } = require("@web3auth/react-native-sdk/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

config.transformer.getTransformOptions = () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Wrap the config with Web3Auth's Metro configuration
// This automatically sets up all necessary polyfills and shims
module.exports = withWeb3Auth(config, {
  // Optional: Add additional packages that need .js extension fix
  // additionalPackagesForJsExtFix: ['some-other-package'],
});
