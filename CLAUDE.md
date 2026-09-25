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

- Data lives in `lib/data/*.ts` as plain typed arrays. Listings are houses and
  villas in Nepal and India only: real towns and coordinates, illustrative
  prices and agents (example.com contacts, no portraits). Every listing has a
  tour. Exterior photos are Wikimedia Commons (CC BY / CC BY-SA) and must carry a
  `credits` entry; avoid photos that show identifiable people or a named real
  property. Anywhere without a visible credit (hero, destinations, cards on the
  homepage) uses views cut from the CC0 panoramas in `public/listings/views/`.
- Shared types are in `lib/types.ts`. Add to that file rather than declaring
  listing/agent/tour shapes locally.
- All filtering and sorting goes through `lib/smart-search.ts`. The hero console,
  command palette, Homes For Sale and 3D/360° Tours all narrow the same corpus
  through one `SearchQuery`, so a query means the same thing everywhere.
- Filter state belongs in the URL (`ListingBrowser` owns this), so views are
  linkable and survive a refresh.
- Prices render through `lib/format.ts` so the currency switcher affects every
  price at once. Listings are priced in NPR or INR and shown in their own
  currency (lakh/crore grouping) until a display currency is picked; the store's
  `currency` is `null` for that. `price: 0` means "Price Upon Request" — do not
  treat it as free.
- Persisted client state (favourites, compare, currency, visited rooms) lives in
  `lib/store.ts`. Components that read it must tolerate the pre-hydration render.

## The tour engine

The walkover is continuous: a tour opens on the whole house from outside, walks
up the path, through the front door and on through the house one step at a time
— through doorways, up the stairs. Never reintroduce a jump-cut between rooms;
every way of choosing a room (door label, room strip, minimap, floor plan,
number keys) walks the route there.

- `components/tour/engine/WalkEngine.ts` is plain `three.js`, deliberately not
  React-reconciled: the render loop owns its own state and publishes labels and
  position through the small stores in `engine-store.ts`. Do not move view state
  into React — dragging would then re-render the 3D layer every frame.
- `build-house.ts` builds the model from the plan: each photographed room is a
  box (real footprint, door openings) with its panorama projected from its
  capture point (`materials.ts`); decks and terraces are photo domes seen only
  through their doorways (portal clipping); stairs, door frames, facade, roofs,
  porch and grounds are modelled. `environment.ts` is the sky, ground, street and
  planting.
- `lib/tour/layout.ts` (plan geometry) and `lib/tour/walk-graph.ts` (stops and
  shortest paths) are pure TypeScript shared by the engine and `FloorPlan`.

Tours are small architectural models in `lib/data/tours.ts`. There are four —
the ten-capture Phewa Lakeside Villa (one real property, single level), a timber
hill house, a garden villa and a haveli — and each listing takes one through
`variant()`, which retitles it and sets its `site.setting` (`himalayan`,
`tropical`, `coastal`, `desert`, `alpine`; `waterside` adds a shoreline). Models
are spaces with `rect`,
`capture`, `heading`, plus `doors`, `stairs` and a `site` with the street-to-porch
`approach`. Doors are the single source of truth for the walk graph; the floor
plan, dollhouse and minimap all derive their routes from them, so adding a route
means adding a door, not editing a map. Room boxes were measured off the photos
(floor/wall line at `atan(1.6 / distance)` below the horizon) and `heading` turns
each photo so its own doorways land on the plan's doors — keep both when editing
a room, or the projection will drift.

Matterport and Street View are adapters (`MatterportEmbed`, `StreetViewEmbed`)
that sit beside the built-in engine, not replacements. Both degrade to a link
when unconfigured — keep that behaviour when touching them.

## Assets

`public/panoramas/` holds 31 CC0 equirectangular captures, each as
`<name>.jpg` (4096×2048) and `<name>-preview.jpg` (1024×512). The viewer loads
the preview first, so both files must exist for every `pano` referenced by a
tour space.
