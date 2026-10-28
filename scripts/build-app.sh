#!/usr/bin/env bash
# Builds the Expo app for the web and drops it in public/runitback/app, which
# the site serves at /runitback/app (see the rewrite in next.config.ts).
# Vercel runs this through `npm run build`, so every deploy rebuilds the app.
# public/runitback/app is gitignored: the build is generated, never committed.
set -euo pipefail

cd "$(dirname "$0")/../mobile"
# Vercel builds with NODE_ENV=production, which would make npm ci skip
# devDependencies; babel-preset-expo is one, so force them in.
npm ci --include=dev --no-audit --no-fund
rm -rf ../public/runitback/app
CI=1 EXPO_OFFLINE=1 EXPO_WEB_BASE_URL=/runitback/app npx expo export --platform web --output-dir ../public/runitback/app
