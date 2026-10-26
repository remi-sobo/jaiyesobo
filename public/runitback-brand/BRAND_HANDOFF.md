# Run It Back Picks · brand handoff v1.0

These files are now the authoritative masters. They replace the starter SVGs in `Run_It_Back_Premium_Brand_Handoff/assets/`. Do not use the concept board image anywhere in the product.

## Masters (vector paths, no embedded images)
| File | Use |
|---|---|
| `symbol_color.svg` | Mark on light grounds (charcoal + red) |
| `symbol_reversed.svg` | Mark on dark grounds (off white + red). App headers, splash, share cards |
| `symbol_white.svg` / `symbol_black.svg` / `symbol_red.svg` | Single color uses: footers, on red, embossing, merch |
| `app_icon.svg` | iOS icon master. Full square, no corners, no words |
| `app_icon_small.svg` | 16 to 48px only. Mark scaled up for legibility |
| `social_avatar.svg` | Circle safe avatar |
| `wordmark_horizontal_light.svg` / `_dark.svg` | Primary lockup. Text is live Archivo: outline to paths before print |
| `wordmark_stacked_light.svg` / `_dark.svg` | Stacked lockup |
| `brand_tokens.json` | Colors, type, radius, motion, asset map |

## Raster exports (`png/`)
`app_icon_1024/512/180/167/152/120/60.png`, `favicon_48/32/16.png`, `social_avatar_400.png`, `symbol_color_transparent.png`, `symbol_reversed_transparent.png`.
Still to export from a desktop tool: `favicon.ico` (pack 16 + 32), WebP, PDF, the 1200×630 OG image (build it from `wordmark_horizontal_dark.svg` on #0B0B0C).

## Placement map
| Surface | Asset |
|---|---|
| iOS app icon (`app.json` icon) | `png/app_icon_1024.png` |
| Apple touch icon | `png/app_icon_180.png` |
| Web favicon | `png/favicon_32.png`, `png/favicon_16.png` (or `app_icon_small.svg` as SVG favicon) |
| Splash / loading | `symbol_reversed.svg` at 120pt + stacked text lockup |
| Onboarding welcome, invite landing | Horizontal dark lockup (mark + RUN IT BACK + PICKS) |
| This Week header | `app_icon.svg` 36pt, 9pt radius, next to league switcher |
| Results story header | `app_icon.svg` 28pt |
| Share cards (all 3 styles) | Compact dark lockup, top left, 18px+ margin, never over scores |
| Paywall, share sheet preview, lock screen alerts | `app_icon.svg` |
| Prototype side panel | Horizontal dark lockup |
| Website header / footer | Compact dark lockup / `symbol_white.svg` 18px |
| Social profiles | `png/social_avatar_400.png` |

## Differences from the prior brand
- Mark: the ring arrow + R + orange basketball is retired. New mark is an angular R whose stem is a red return arrow.
- Accent red: #E5312B to #E11D2E. Off white: #F4F1EA (cream) to #F7F7F8.
- Display type: Fraunces (serif) to Archivo 900, width 112 to 115. Wordmark and hero lines are italic, headings are upright.
- The cream tile behind the logo is gone. All marks sit straight on #0B0B0C.
- Orange is now only a result color (wrong pick). It is not in the logo.
- New splash and loading screen.
- Unchanged: Inter UI text, JetBrains Mono data labels (12px min), green/orange result colors, all layouts, scoring, picks, locks and flows.

## Rules
Clear space = height of the top bar. Minimum: mark 16px, compact lockup 120px wide. No gradients, glows, shadows, rotation, recoloring of the arrow, or placement next to any gambling cues. The logo has not been trademark checked.
