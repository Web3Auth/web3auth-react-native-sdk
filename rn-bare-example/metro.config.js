const {getDefaultConfig} = require('metro-config');

module.exports = (async () => {
  const {
    resolver: {sourceExts, assetExts},
  } = await getDefaultConfig();

  const defaultSourceExts = [...sourceExts, 'svg', 'mjs', 'cjs'];

  return {
    resolver: {
      extraNodeModules: {
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        url: require.resolve('url/'),
      },

      assetExts: assetExts.filter(ext => ext !== 'svg'),

      sourceExts: process.env.TEST_REACT_NATIVE
        ? ['e2e.js'].concat(defaultSourceExts)
        : defaultSourceExts,
    },
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
  };
})();
