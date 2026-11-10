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

// The website's node_modules at the repo root is a different React and must
// never leak into the app, so that one directory is blocked outright: an
// import that would land there fails loudly instead of resolving the wrong
// copy. Everything else keeps Metro's normal lookup, walking up from the
// importing file. That matters because npm nests a package under the one
// that needs it whenever versions differ (expo/node_modules/@expo/metro-runtime,
// @expo/metro-runtime/node_modules/pretty-format, ...), and only the
// walk-up finds those copies. Turning hierarchical lookup off, as this file
// once did, made Metro pick the top-level pretty-format 30 for Expo's dev
// client, which needs 29, and the app died at startup in Expo Go.
const rootNodeModules = path.join(monorepoRoot, "node_modules");
config.resolver.blockList = [
  ...config.resolver.blockList,
  new RegExp(`^${rootNodeModules.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\\\/].*`),
];

// Files in the watch folders live outside mobile/, so walking up from them
// never reaches mobile/node_modules (an SVG in ../public/runitback-brand
// needs react-native's asset registry, for example). This is the extra
// place Metro looks after the walk-up; it does not disable the walk-up.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

module.exports = config;
