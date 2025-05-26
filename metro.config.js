const { getDefaultConfig } = require("expo/metro-config");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  return {
    ...config,
    transformer: {
      ...config.transformer,
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
    resolver: {
      ...config.resolver,
      assetExts: [...config.resolver.assetExts, "png", "json"], // Add png and json
      sourceExts: [...config.resolver.sourceExts, "jsx", "ts", "tsx", "cjs"],
    },
  };
})();

