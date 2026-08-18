const { getDefaultConfig } = require("expo/metro-config");
const { withWeb3Auth } = require("@web3auth/react-native-sdk/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

config.transformer.getTransformOptions = () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = withWeb3Auth(config);
