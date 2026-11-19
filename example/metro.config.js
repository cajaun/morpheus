const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const workspaceRoot = path.resolve(__dirname, "..");
const config = getDefaultConfig(__dirname);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  morpheus: workspaceRoot,
};

// The example depends on "react-native-morpheus": "file:..", so npm links
// node_modules/react-native-morpheus back to the repo root. Expo's Metro file
// map crashes ("Failed to collapse") when a lookup goes through a symlink to
// an ancestor of the project root, so resolve Morpheus straight to its source
// (the package's "react-native" export) instead of through that link.
const morpheusEntries = {
  "react-native-morpheus": path.join(workspaceRoot, "src/index.ts"),
  "react-native-morpheus/constants": path.join(workspaceRoot, "src/constants.ts"),
};
const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const morpheusEntry = morpheusEntries[moduleName];

  if (morpheusEntry) {
    return { type: "sourceFile", filePath: morpheusEntry };
  }

  return (upstreamResolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform,
  );
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-env.d.ts",
  polyfills: { rem: 14 },
});
