# Run It Back — mobile app

Expo (React Native) app for Run It Back Picks. Pairs with the Next.js
web app at `../` — same database, same `/api/app/v1` backend.

## Running it on your phone (quickest path)

No Mac needed, no Xcode. Takes about two minutes.

1. Install **Expo Go** from the App Store (iOS) or Google Play (Android).
2. On your laptop:

   ```bash
   cd mobile
   npm install
   npx expo start
   ```

3. A QR code prints in the terminal. Open the iPhone **Camera** app,
   point it at the QR code, tap the banner that appears — it hands off
   to Expo Go and the app loads. On Android, use the "Scan QR code"
   button inside Expo Go itself.
4. Shake the phone to open the dev menu (reload, element inspector,
   performance monitor).

Hot-reload is on — saving a file in `mobile/` reloads the phone within a
second or two.

## Running it on the iOS simulator

Requires Xcode and macOS.

```bash
cd mobile
npm run ios
```

First run compiles a native shell and is slow (~5 min). After that it's
fast. The simulator opens automatically.

## Browser

Not supported right now. We haven't installed `react-native-web` or
`@expo/metro-runtime`, so `expo start --web` won't work. If you want a
laptop fallback for quick UI tweaks, let us know and we'll add it in a
follow-up — it comes with its own quirks (SecureStore, keyboard
behavior, haptics all diverge from the phone, so you still need to test
on a device before shipping).

## Which backend does it talk to?

`app.json` → `expo.extra.apiBaseUrl` is set to `https://jaiyesobo.com`,
so by default the app hits **production**. Any pick you make with Expo
Go is a real pick on the real leaderboard. Options:

- **Just test with a throwaway account.** Join as "Phone test" or
  similar and ignore it. (We can delete test accounts server-side if
  they pile up.)
- **Point at a Vercel preview** when a PR touches the backend:

   ```bash
   EXPO_PUBLIC_API_BASE_URL=https://<preview-url>.vercel.app \
     npx expo start --clear
   ```

   `EXPO_PUBLIC_API_BASE_URL` overrides `app.json`'s `apiBaseUrl`.

## PR review loop

For a mobile-only PR:

1. `git fetch origin && git checkout <branch>`
2. `cd mobile && npm install` (installs any new deps the PR adds)
3. `npx expo start` → scan QR with Expo Go
4. Walk the flows the PR touches. Shake → "Reload" to restart cleanly.

Vercel preview URLs don't apply here: `vercel.json`'s `ignoreCommand`
skips the web build on mobile-only commits. Pure mobile PRs test
locally, not on a preview URL.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` / `npx expo start` | Dev server + QR code. |
| `npm run ios` | iOS simulator (Mac + Xcode only). |
| `npm run android` | Android emulator or attached device. |
| `npm run typecheck` | `tsc --noEmit`. Runs clean. |
| `npm test` | Jest. No specs yet; a passing suite will land with the integration slice. |
| `npm run lint` | `expo lint`. (Config is still a work-in-progress — ignore for now.) |

## Where things live

- `app/` — Expo Router screens. `app/index.tsx` is This Week.
- `lib/api.ts` — `fetch` wrapper, Keychain token storage, `ApiError`.
- `lib/routes.ts` — typed route helpers, one per `/api/app/v1` endpoint.
- `lib/brand.ts` — colors, fonts, radii.
- `components/` — shared pieces (e.g. `Lockup`).
- `assets/fonts/` — Archivo faces (loaded in `app/_layout.tsx`).

Server-side request and response shapes are reused through the
`@shared/*` alias (configured in `metro.config.js`), so a route's shape
is only written once — in `../lib/app-api/types.ts`.
