module.exports = {
  resolver: {
    extraNodeModules: {
      stream: require.resolve("readable-stream"),
      crypto: require.resolve("react-native-quick-crypto"),
    },
  },
};
