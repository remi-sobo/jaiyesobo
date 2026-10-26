// Metro bundler config for the Run It Back Picks iPhone app.
//
// Shared code lives OUTSIDE mobile/ — API types in ../lib/app-api/, brand
// tokens in ../public/runitback-brand/. Metro only follows watchFolders
// outside its project root, so we point it at both. Imports resolve via
// the `@shared/*` and `@brand/*` path aliases set in tsconfig.json.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  path.resolve(monorepoRoot, "lib", "app-api"),
  path.resolve(monorepoRoot, "public", "runitback-brand"),
];

// Only resolve from mobile/node_modules; the website's node_modules at the
// repo root is a different React/React Native and must not leak in.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
