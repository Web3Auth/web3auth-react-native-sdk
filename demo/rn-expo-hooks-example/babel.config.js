module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          // hermes-stable (default) assumes Hermes V1 private-field support, but the
          // runtime/hermesc in this Expo 54 / RN 0.81 app still rejects `#private`
          // (ethers, ox, and even RN DOMRect). hermes-v0 downlevels those features.
          unstable_transformProfile: "hermes-v0",
          // Needed so Wagmi/zustand `import.meta` works under Hermes.
          unstable_transformImportMeta: true,
        },
      ],
    ],
  };
};
