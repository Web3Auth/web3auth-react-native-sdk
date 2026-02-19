/**
 * Web3Auth React Native SDK - Metro Configuration Wrapper
 *
 * This module provides a wrapper function to configure Metro bundler
 * with all necessary polyfills and shims for Web3Auth to work in React Native.
 *
 * Usage:
 *   const { getDefaultConfig } = require('@react-native/metro-config');
 *   const { withWeb3Auth } = require('@web3auth/react-native-sdk/metro-config');
 *
 *   const config = getDefaultConfig(__dirname);
 *   module.exports = withWeb3Auth(config);
 */

const path = require("path");

/**
 * Wraps a Metro configuration with Web3Auth-specific settings
 * @param {import('metro-config').MetroConfig} userConfig - The user's existing Metro config
 * @param {object} options - Optional configuration options
 * @param {string[]} options.additionalPackagesForJsExtFix - Additional packages that need .js extension fix
 * @returns {import('metro-config').MetroConfig} - The merged Metro configuration
 */
function withWeb3Auth(userConfig, options = {}) {
  const { additionalPackagesForJsExtFix = [] } = options;

  // Packages that need .js extension resolution fix
  const packagesNeedingJsExtFix = ["permissionless", "ox", ...additionalPackagesForJsExtFix];

  // Resolve shim paths relative to this package
  const urlShimPath = require.resolve("./shims/url-shim.js");

  // Define Node.js module polyfills
  const extraNodeModules = {
    // Empty modules for unused Node.js modules
    assert: require.resolve("empty-module"),
    http: require.resolve("empty-module"),
    https: require.resolve("empty-module"),
    os: require.resolve("empty-module"),
    zlib: require.resolve("empty-module"),
    path: require.resolve("empty-module"),
    fs: require.resolve("empty-module"),
    net: require.resolve("empty-module"),
    tls: require.resolve("empty-module"),

    // Polyfilled modules
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("readable-stream"),
    url: urlShimPath,

    // Node.js protocol mappings (node: prefix)
    "node:crypto": require.resolve("react-native-quick-crypto"),
    "node:stream": require.resolve("readable-stream"),
    "node:buffer": require.resolve("buffer"),
    "node:events": require.resolve("events"),
    "node:url": urlShimPath,
  };

  // Merge with user's extraNodeModules if they exist
  const mergedExtraNodeModules = {
    ...extraNodeModules,
    ...(userConfig.resolver?.extraNodeModules || {}),
  };

  // Get original polyfills function
  const originalGetPolyfills =
    userConfig.serializer?.getPolyfills ||
    ((options) => {
      try {
        return require("@react-native/metro-config/src/defaults/defaults").getPolyfills(options);
      } catch {
        return [];
      }
    });

  // Store the base resolve request function
  const baseResolve = userConfig.resolver?.resolveRequest;

  // Helper to check if path is relative
  function isRelative(spec) {
    return spec.startsWith("./") || spec.startsWith("../");
  }

  // Helper to check if module needs .js extension fix
  function needsJsExtFix(context) {
    const p = context.originModulePath || "";
    return packagesNeedingJsExtFix.some((name) => p.includes(`${path.sep}node_modules${path.sep}${name}${path.sep}`));
  }

  // Custom resolve request to handle .js extension issues
  function customResolveRequest(context, moduleName, platform) {
    // Handle .js extension issue in some packages
    if (isRelative(moduleName) && moduleName.endsWith(".js") && needsJsExtFix(context)) {
      const withoutExt = moduleName.slice(0, -3);
      try {
        return (baseResolve || context.resolveRequest)(context, withoutExt, platform);
      } catch {
        // Fall through if that didn't resolve
      }
    }
    return (baseResolve || context.resolveRequest)(context, moduleName, platform);
  }

  // Build the Web3Auth-specific config
  const web3AuthConfig = {
    resolver: {
      extraNodeModules: mergedExtraNodeModules,
      sourceExts: [...(userConfig.resolver?.sourceExts || ["js", "jsx", "ts", "tsx", "json"]), "svg"].filter(
        (ext, index, arr) => arr.indexOf(ext) === index
      ),
      unstable_enablePackageExports: true,
      resolveRequest: customResolveRequest,
    },
    serializer: {
      getPolyfills: (options) => {
        return [require.resolve("./global-shim.js"), ...originalGetPolyfills(options)];
      },
    },
  };

  // Deep merge the configs
  return {
    ...userConfig,
    resolver: {
      ...userConfig.resolver,
      ...web3AuthConfig.resolver,
      extraNodeModules: mergedExtraNodeModules,
    },
    serializer: {
      ...userConfig.serializer,
      ...web3AuthConfig.serializer,
    },
  };
}

module.exports = { withWeb3Auth };
