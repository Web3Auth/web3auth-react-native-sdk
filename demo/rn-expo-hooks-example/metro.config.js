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
  const packages = ["permissionless", "ox"];
  return packages.some((name) => p.includes(`${path.sep}node_modules${path.sep}${name}${path.sep}`));
}

// Canonical paths for deduplication
const nobleHashesPath = require.resolve("@noble/hashes/package.json").replace(/package\.json$/, "");
const nobleCurvesPath = require.resolve("@noble/curves/package.json").replace(/package\.json$/, "");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Deduplicate nested copies of @noble/hashes and @noble/curves so only the
  // top-level copies are used, avoiding redundant crypto library initialisation.
  if (moduleName.startsWith("@noble/hashes/") || moduleName === "@noble/hashes") {
    const sub = moduleName.replace("@noble/hashes", "").replace(/^\//, "");
    const resolved = sub ? path.join(nobleHashesPath, sub) : nobleHashesPath;
    return { filePath: resolved, type: "sourceFile" };
  }
  if (moduleName.startsWith("@noble/curves/") || moduleName === "@noble/curves") {
    const sub = moduleName.replace("@noble/curves", "").replace(/^\//, "");
    const resolved = sub ? path.join(nobleCurvesPath, sub) : nobleCurvesPath;
    return { filePath: resolved, type: "sourceFile" };
  }

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

config.resolver.extraNodeModules = {
  assert: require.resolve("empty-module"),
  http: require.resolve("empty-module"),
  https: require.resolve("empty-module"),
  os: require.resolve("empty-module"),
  url: require.resolve("empty-module"),
  zlib: require.resolve("empty-module"),
  path: require.resolve("empty-module"),
  crypto: require.resolve("crypto-browserify"),
  stream: require.resolve("readable-stream"),
  buffer: require.resolve("buffer"),
};

config.resolver.unstable_enablePackageExports = true;

config.transformer.getTransformOptions = () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: false,
  },
});

module.exports = config;
