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

const fs = require("fs");
const path = require("path");

/**
 * Resolve a module from this package first, then from the consuming app's
 * node_modules (process.cwd()). Peer deps like react-native-quick-crypto live
 * in the app, not in the SDK package.
 */
function resolveFromAppOrSelf(moduleName) {
  try {
    return require.resolve(moduleName);
  } catch {
    return require.resolve(moduleName, { paths: [process.cwd()] });
  }
}

/**
 * Same as resolveFromAppOrSelf, but returns fallback when the module is missing
 * (optional peer dependencies).
 */
function resolveOptional(moduleName, fallbackModuleName) {
  try {
    return resolveFromAppOrSelf(moduleName);
  } catch {
    return require.resolve(fallbackModuleName);
  }
}

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
  const cryptoBrowserifyPath = require.resolve("crypto-browserify");
  // Optional peer — fall back to crypto-browserify when not installed in the app
  const quickCryptoPath = resolveOptional("react-native-quick-crypto", "crypto-browserify");

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
    crypto: cryptoBrowserifyPath,
    stream: require.resolve("readable-stream"),
    url: urlShimPath,

    // Node.js protocol mappings (node: prefix)
    "node:crypto": quickCryptoPath,
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

  const nobleHashesSep = `${path.sep}@noble${path.sep}hashes`;

  // Given the path of the file that is doing the import, find the @noble/hashes
  // package root that Node resolution would select (i.e. the nearest nested copy).
  function resolveNobleHashesRoot(originModulePath) {
    // Fast-path: origin is already inside some copy of @noble/hashes.
    const marker = `${nobleHashesSep}${path.sep}`;
    const idx = originModulePath.lastIndexOf(marker);
    if (idx !== -1) {
      return originModulePath.substring(0, idx + nobleHashesSep.length);
    }
    // Walk up looking for the nearest node_modules/@noble/hashes directory.
    let dir = path.dirname(originModulePath);
    while (dir && dir !== path.dirname(dir)) {
      const candidate = path.join(dir, "node_modules", "@noble", "hashes");
      if (fs.existsSync(candidate)) return candidate;
      dir = path.dirname(dir);
    }
    return null;
  }

  // Custom resolve request to handle .js extension issues and known package-exports warnings
  function customResolveRequest(context, moduleName, platform) {
    const originModulePath = context.originModulePath || "";

    // Handle @noble/hashes/crypto (the canonical import used by @noble/hashes' own utils.js).
    // @noble/hashes exports "./crypto" (without .js) pointing to "./crypto.js". Metro resolves
    // the import correctly, then separately checks whether "./crypto.js" (the actual file on
    // disk) appears in the exports map — it doesn't (only "./crypto" does) — and warns.
    // By returning the absolute path ourselves we bypass that secondary exports check entirely.
    if (moduleName === "@noble/hashes/crypto" || moduleName === "@noble/hashes/crypto.js") {
      const pkgRoot = resolveNobleHashesRoot(originModulePath);
      if (pkgRoot) {
        return { type: "sourceFile", filePath: path.join(pkgRoot, "crypto.js") };
      }
    }

    // Resolve @web3auth/no-modal deep ESM dist paths directly. We import from these paths
    // intentionally (to avoid the barrel pulling in @metamask/sdk), but @web3auth/no-modal
    // does not list them in its exports field. Find the package root relative to the importer
    // (or the app cwd) and construct the absolute path ourselves.
    if (moduleName.startsWith("@web3auth/no-modal/dist/")) {
      const sep = `${path.sep}node_modules${path.sep}`;
      const nodeModulesIdx = originModulePath.lastIndexOf(sep);
      const candidates = [];
      if (nodeModulesIdx !== -1) {
        candidates.push(path.join(originModulePath.substring(0, nodeModulesIdx + sep.length - 1), moduleName));
      }
      candidates.push(path.join(process.cwd(), "node_modules", moduleName));
      for (const resolvedPath of candidates) {
        if (fs.existsSync(resolvedPath)) {
          return { type: "sourceFile", filePath: resolvedPath };
        }
      }
    }

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
