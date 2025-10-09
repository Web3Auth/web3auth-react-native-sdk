// Learn more https://docs.expo.io/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const baseResolve = config.resolver.resolveRequest;

function isRelative(spec) {
  return spec.startsWith("./") || spec.startsWith("../");
}

function isFromPathResolveNeeded(context) {
  const p = context.originModulePath || "";
  // handles macOS/Linux/Windows path separators
  const packages = ["permissionless", "ox"];
  return packages.some((name) => p.includes(`${path.sep}node_modules${path.sep}${name}${path.sep}`));
}

// Metro (Expo’s bundler) resolves modules before transforming TS. When the specifier already includes “.js”, Metro treats “.js” as part of the filename and does not replace it with “.ts”
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Example: inside node_modules/permissionless/accounts/index.ts
  // moduleName is "./kernel/to7702KernelSmartAccount.js"
  if (isRelative(moduleName) && moduleName.endsWith(".js") && isFromPathResolveNeeded(context)) {
    const withoutExt = moduleName.slice(0, -3); // drop ".js"
    try {
      return (baseResolve || context.resolveRequest)(context, withoutExt, platform);
    } catch (e) {
      // fall through if that didn't resolve
    }
  }
  return (baseResolve || context.resolveRequest)(context, moduleName, platform);
};

config.resolver.extraNodeModules = {
  assert: require.resolve("empty-module"), // assert can be polyfilled here if needed
  http: require.resolve("empty-module"), // stream-http can be polyfilled here if needed
  https: require.resolve("empty-module"), // https-browserify can be polyfilled here if needed
  os: require.resolve("empty-module"), // os-browserify can be polyfilled here if needed
  url: require.resolve("empty-module"), // url can be polyfilled here if needed
  zlib: require.resolve("empty-module"), // browserify-zlib can be polyfilled here if needed
  path: require.resolve("empty-module"),
  crypto: require.resolve("crypto-browserify"),
  stream: require.resolve("readable-stream"),
  buffer: require.resolve("buffer"),
};

config.transformer.getTransformOptions = () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
