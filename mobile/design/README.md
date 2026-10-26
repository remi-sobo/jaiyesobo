# Run It Back Picks: approved app design

`prototype.dc.html` is the approved Claude Design prototype (revised round, Oct 25 2026).
It is the source of truth for the iPhone app's screens, copy and states in Phase 2.

To view it: serve this folder (`npx serve mobile/design`) and open `prototype.dc.html`.
It loads React from unpkg, so it needs internet. The left panel jumps to every screen,
including GROWTH (invite landing, rivalries, head to head, commissioner, Season Pass,
Jaiye's dashboard) and MOMENTS (first week help, Lock sheet, reveal card, report or mute).

Not final yet: the logo and app icon. A new vector logo system replaces the old one
before Phase 2 starts; the prototype's logo marks are placeholders.

Build rules that carry over from the spec (docs/RUN-IT-BACK-APP-SPEC.md):
- Copy and states come from the prototype; data comes from /api/app/v1 (lib/app-api/types.ts).
- No free text anywhere. Trash talk is the preset lines from GET /talk/lines.
- No betting words: bet, odds, wager, sportsbook, parlay, payout, pays, cash, juice.
- No live in-game scores in v1.
