# Repository guide

Next.js 15 (App Router) + TypeScript + Tailwind 3.4 implementation of the
LuxuryRealEstate.com design system, built around a custom 360° virtual walkover
engine. Full detail in [README.md](README.md).

## Commands

```bash
npm run dev         # node scripts/next.cjs dev
npm run build       # node scripts/next.cjs build
npm start           # node scripts/next.cjs start
npm run typecheck   # tsc --noEmit
npm run lint
```

`next` is always invoked through `scripts/next.cjs`. That launcher loads
`scripts/exfat-readlink-shim.cjs`, which normalises the `EISDIR` that exFAT
volumes return from `readlink()` on a plain file — without it `next build` fails
on `app/api/*/route.ts`, `app/sitemap.ts` and `app/robots.ts`. Do not replace
those scripts with bare `next …` while the project lives on drive E:.

## Source of truth for the UI

The UI is no longer a pixel clone of the reference screens. It runs on the
**Sovereign Estate** design system defined in `tailwind.config.ts` and the
`@layer components` block of `app/globals.css`. Build new UI out of those
primitives rather than hand-rolling colours, buttons or fields:

- **Ramps** — `ink.*` (chrome and type), `sand.*` (warm paper neutrals),
  `gold.*` (champagne accent, the only saturated colour). Do not reach for
  Tailwind's stock `gray`/`slate`/`neutral`; they are cold and clash with the
  paper tone.
- **Type** — Playfair for display (`.font-serif-title`, `.title-*`), Montserrat
  for UI, Cinzel for the crest and `.eyebrow`. Fluid display sizes are
  `text-display-sm|display|display-lg`.
- **Components** — `.btn-ink`, `.btn-gold`, `.btn-outline`, `.btn-ghost`,
  `.btn-white`, `.btn-link`; `.field`, `.field-sm`, `.field-label`; `.panel`,
  `.chip`, `.chip-gold`, `.badge-glass`, `.badge-tour`, `.scrim`, `.rule-gold`.
- **Shared chrome** — `SiteHeader`, `SiteFooter`, `PageHero` (the masthead every
  interior page opens with), `SectionHeading` and `Reveal` (scroll-in). Every
  page should use them rather than repeating the band by hand.

The original mockups still sit one level up and remain the source for *content*
and information architecture:

- `luxury_real_estate_*/code.html` — the eight screens, with `screen.png` beside
  each one
- `sovereign_estate_system/DESIGN.md` — the original colour and spacing notes

Take copy, fields and page structure from them; take visual treatment from the
system above. `tailwind.config.ts` still carries the `brand.*` / `luxury.*` /
`sovereign.*` keys so older class strings copied out of the mockups resolve.

## Conventions

- Data lives in `lib/data/*.ts` as plain typed arrays, transcribed from the
  mockups. Do not fabricate listing content; take it from the source screens.
- Shared types are in `lib/types.ts`. Add to that file rather than declaring
  listing/agent/tour shapes locally.
- All filtering and sorting goes through `lib/smart-search.ts`. The hero console,
  command palette, Homes For Sale and 3D/360° Tours all narrow the same corpus
  through one `SearchQuery`, so a query means the same thing everywhere.
- Filter state belongs in the URL (`ListingBrowser` owns this), so views are
  linkable and survive a refresh.
- Prices render through `lib/format.ts` so the currency switcher affects every
  price at once. `price: 0` means "Price Upon Request" — do not treat it as free.
- Persisted client state (favourites, compare, currency, visited rooms) lives in
  `lib/store.ts`. Components that read it must tolerate the pre-hydration render.

## The tour engine

`components/tour/panorama-engine.ts` is plain `three.js`, deliberately not
React-reconciled: the render loop owns its own state and only pushes projected
hotspot positions and walk events back to React. Per-frame values (heading, leg
progress, speed, pointer) reach the chrome as CSS custom properties on the
viewer (`--tour-yaw`, `--tour-leg`, `--tour-speed`, `--tour-px/py`). Do not move
view state into React — dragging or walking would then re-render every frame.

Moving between rooms is always a walk. Panoramas are projected onto a proxy of
their room (`room` on the node), which is what lets the camera travel through a
doorway; any room choice — hotspot, floor click, filmstrip, floor plan,
dollhouse, number key — goes through `engine.walkTo`, which routes along the nav
graph and walks it leg by leg. Do not add a path that swaps panoramas directly.

Tour scene graphs are hand-authored in `lib/data/tours.ts`. Nav hotspots are the
single source of truth for the walk graph; routes, the guided tour, room
outlines, the floor plan, the 3D dollhouse (`dollhouse-engine.ts`) and the
minimap all derive from them via `lib/tour-graph.ts`, so adding a route means
adding a hotspot, not editing a map. Aim nav hotspots at the doorway they lead
through and keep links two-way — the hotspot back sets the arrival heading.

Matterport and Street View are adapters (`MatterportEmbed`, `StreetViewEmbed`)
that sit beside the built-in engine, not replacements. Both degrade to a link
when unconfigured — keep that behaviour when touching them.

## Assets

`public/panoramas/` holds 85 CC0 equirectangular captures (20 houses, each
capture used once), each as
`<name>.jpg` (4096×2048) and `<name>-preview.jpg` (1024×512). The viewer loads
the preview first, so both files must exist for every `pano` referenced by a
tour node.
