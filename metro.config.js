const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('db'); // Add any additional asset extensions if needed

module.exports = config;
// Import the Expo superclass which has support for PostCSS.



