const {getDefaultConfig} = require('metro-config');
const nodeLibs = require('node-libs-react-native');
module.exports = (async () => {
  const {
    resolver: {sourceExts, assetExts},
  } = await getDefaultConfig();

  const defaultSourceExts = [...sourceExts, 'svg', 'mjs', 'cjs'];
  // Reflect.deleteProperty(nodeLibs, 'buffer');
  return {
    resolver: {
      extraNodeModules: {
        // ...nodeLibs,
        buffer: require.resolve('buffer/'),
        stream: require.resolve('readable-stream'),
        assert: require.resolve('assert'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify'),
        url: require.resolve('url'),
        crypto: require.resolve('crypto-browserify'),
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
