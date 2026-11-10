// Dynamic Expo config. app.json holds everything static; this layer only
// adds what depends on how the app is being built.
//
// experiments.baseUrl must apply to the hosted web export alone
// (scripts/build-app.sh sets EXPO_WEB_BASE_URL=/runitback/app). Expo passes
// baseUrl to every platform's bundle, so leaving it in app.json also rewrote
// the iPhone dev bundle's asset URLs to a path the dev server never serves.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_WEB_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl } };
};
