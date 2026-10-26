# Run It Back Picks: approved app design

`prototype.dc.html` is the approved Claude Design prototype (revised round, Oct 25 2026).
It is the source of truth for the iPhone app's screens, copy and states in Phase 2.

To view it: serve this folder (`npx serve mobile/design`) and open `prototype.dc.html`.
It loads React from unpkg, so it needs internet. The left panel jumps to every screen,
including GROWTH (invite landing, rivalries, head to head, commissioner, Season Pass,
Jaiye's dashboard) and MOMENTS (first week help, Lock sheet, reveal card, report or mute).

The brand system v1 lives in `public/runitback-brand/` — one source of truth
for web and mobile. Vector masters (symbol, wordmark, app icon, social
avatar), raster exports in `public/runitback-brand/png/`, color/type/radius
tokens in `public/runitback-brand/brand_tokens.json`, and placement rules
in `public/runitback-brand/BRAND_HANDOFF.md`. The outlined wordmarks
(`*_outlined.svg`) are the path-only versions for the iPhone app and
server-rendered images (OG, lock screen) where live fonts aren't
available. The prototype's logo marks are from the pre-handoff set; the
app's build step copies the authoritative masters out of
`public/runitback-brand/`.

Build rules that carry over from the spec (docs/RUN-IT-BACK-APP-SPEC.md):
- Copy and states come from the prototype; data comes from /api/app/v1 (lib/app-api/types.ts).
- No free text anywhere. Trash talk is the preset lines from GET /talk/lines.
- No betting words: bet, odds, wager, sportsbook, parlay, payout, pays, cash, juice.
- No live in-game scores in v1.
