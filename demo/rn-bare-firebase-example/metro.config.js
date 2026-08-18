const { getDefaultConfig } = require("@react-native/metro-config");
const { withWeb3Auth } = require("@web3auth/react-native-sdk/metro-config");

module.exports = withWeb3Auth(getDefaultConfig(__dirname));
