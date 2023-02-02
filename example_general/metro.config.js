/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
      extraNodeModules: {
        ... {
          stream: path.join(__dirname, "node_modules", 'stream-browserify'),
          crypto: path.join(__dirname, "node_modules", 'crypto-browserify')
        }
      },
    }),
  },
};
