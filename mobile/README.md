# Run It Back Picks · iPhone app

The Expo project for the Phase 2 iOS app. The website in the repo root is a
separate install with a separate `package.json` and lockfile — this folder
has its own.

## Stack

| | |
|---|---|
| Runtime | Expo SDK 58 (managed workflow), React Native 0.88, React 19 |
| Language | TypeScript strict, `noUncheckedIndexedAccess` |
| Routing | Expo Router (file-based under `app/`, typed routes on) |
| Data | TanStack Query 5 over a fetch wrapper (`lib/api.ts`); Zod for response validation |
| Shared types | Imported through `@shared/*` → `../lib/app-api/*` (Metro `watchFolders`) |
| Brand | Imported through `@brand/*` → `../public/runitback-brand/*` (same mechanism) |
| Session storage | `expo-secure-store` (iPhone Keychain) |
| Push | `expo-notifications` (wired in `app.json`, used starting Phase 3) |
| Fonts | `expo-font` loads Archivo 900 italic semi-expanded + 600 from `assets/fonts/` |
| Images | `expo-image` for the brand symbol SVG |
| Build & submit | EAS Build + EAS Submit (`eas.json`), bundle id `com.sobo.runitback` |
| Testing | Jest + jest-expo + `@testing-library/react-native` |

Why these:

- **Expo managed** over bare — the only phone build we care about is the
  iPhone one, Apple-signed. EAS Build does that in the cloud so nobody
  needs Xcode locally during the TestFlight loop.
- **Expo Router** over React Navigation calls — file-based routing mirrors
  the Next.js mental model Jaiye and Remi already use on the web, and the
  typed-routes experiment catches broken links at build time.
- **TanStack Query** over hand-rolled fetches — the spec calls for
  optimistic pick saves with retry and an offline banner; both land as a
  mutation and a query status subscription instead of custom plumbing.
- **StyleSheet** over NativeWind — one less thing to configure for a kid's
  side project; the brand tokens come straight from the shared JSON, so
  colors and radii don't drift. Swap to NativeWind later if the inline
  style blocks start to hurt.
- **expo-secure-store** over MMKV — Keychain-backed, matches the spec, and
  the one-token session doesn't need MMKV's throughput.

## Dev loop

```
cd mobile
npm install
# Points the fetch client at prod by default (app.json extra.apiBaseUrl).
# Override to the Vercel preview or your local Next.js dev server with:
#   EXPO_PUBLIC_API_BASE_URL=https://<preview>.vercel.app npm run start
npm run start                 # Metro + Expo dev client
npm run ios                   # build + launch on simulator (needs Xcode)
```

TypeScript and tests:

```
npm run typecheck
npm test
```

The website build at the repo root ignores this folder — `tsconfig.json`
excludes `mobile`, and `vercel.json` has an `ignoreCommand` that skips the
Next.js build when a commit only touches `mobile/`.

## Build + submit (EAS)

```
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production
```

Fill the submit creds in `eas.json` first (`appleTeamId`, `ascAppId`) and
make sure the Apple Developer account for SOBO Consulting is set up.

## Brand assets

The authoritative brand files live in `../public/runitback-brand/`.
Symbols load through the `@brand/*` alias (no copying). Fonts in
`assets/fonts/` and the app icon in `assets/icon.png` are copies because
Expo expects fonts and icons under the project root; keep them in sync
with the brand folder when the brand updates (there's no script for that
yet — it's two `cp` commands).

## Status

Phase 2 scaffold only. One starter screen that renders the lockup and
fetches `/api/app/v1/talk/lines` as a smoke test. Flows (Join, This Week,
Pick cards, Lock, Reveal, Trash talk, Leagues, Jaiye's Corner, Profile)
land in follow-up PRs, each replacing a slice of this screen.
