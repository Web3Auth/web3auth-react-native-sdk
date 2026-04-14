const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    extraNodeModules: {
      assert: require.resolve("empty-module"),
      http: require.resolve("empty-module"),
      https: require.resolve("empty-module"),
      os: require.resolve("empty-module"),
      url: require.resolve("empty-module"),
      zlib: require.resolve("empty-module"),
      path: require.resolve("empty-module"),
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("readable-stream"),
    },
    sourceExts: [...defaultConfig.resolver.sourceExts, "svg"],
    unstable_enablePackageExports: true,
  },
};

const baseResolve = defaultConfig.resolver.resolveRequest;

function isRelative(spec) {
  return spec.startsWith("./") || spec.startsWith("../");
}

function isFromPathResolveNeeded(context) {
  const p = context.originModulePath || "";
  const packages = ["permissionless", "ox"];
  return packages.some((name) => p.includes(`${path.sep}node_modules${path.sep}${name}${path.sep}`));
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (isRelative(moduleName) && moduleName.endsWith(".js") && isFromPathResolveNeeded(context)) {
    const withoutExt = moduleName.slice(0, -3);
    try {
      return (baseResolve || context.resolveRequest)(context, withoutExt, platform);
    } catch (e) {
      // fall through if that didn't resolve
    }
  }
  return (baseResolve || context.resolveRequest)(context, moduleName, platform);
};

module.exports = mergeConfig(defaultConfig, config);
