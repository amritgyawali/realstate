# Who's Who in Luxury Real Estate — Virtual Walkover Platform

A Next.js implementation of the LuxuryRealEstate.com design system, built around a
360° virtual walkover engine: every showcase listing can be walked step by step,
from the street through the front door and on through every room and up the
stairs, in the browser, on any device, with no plugin and no third-party account.

The portfolio is houses and villas in **Nepal and India**. Every listing has a
3D/360° walkover, and the flagship — the Phewa Lakeside Villa in Pokhara — is
ten 360° captures of one estate walked as a single house: lounge, dining hall,
lake veranda, jetty, lakeshore, billiard room, games room, fireside pavilion,
ridge lookout and squash court.

The UI is a faithful build of the eight reference screens in the repository root
(`luxury_real_estate_*/code.html` plus `sovereign_estate_system/DESIGN.md`) —
same layout, same type scale, same spacing, same colour values — with the static
mockups replaced by live data, working filters and a real 3D viewer.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build && npm start   # production
npm run typecheck            # tsc --noEmit
npm run lint
```

No environment variables are required. Copy `.env.example` to `.env.local` to
enable the optional Matterport and Street View providers.

---

## The walkover engine

This is the part that matters, so it is worth knowing how it is put together.

### A house you walk through, not a slideshow

Most 360° viewers jump from photo to photo. This one keeps the whole house in a
single 3D scene and moves the camera through it continuously, the way a person
walks it:

1. **The whole building first.** The tour opens outside, on a modelled house in
   its setting: Himalayan foothills (optionally on a lakeshore), tropical
   paddy country, coastline, desert or a snowy valley.
2. **Up to the entrance.** *Walk to the entrance* flies down to the pavement and
   walks up the garden path, step by step, to the porch. The front door swings
   open as you arrive.
3. **Through the door.** *Step inside* walks through the doorway into the hall.
4. **One floor, room by room.** Doorways carry labels (*Walk through · Great
   Room*). Choosing one walks up to that doorway, through it, and into the middle
   of the room, where the photo is exact. Walking back out works the same way.
5. **Up the stairs.** Stairs are real: the walk climbs the treads to the landing
   and carries on to the rooms upstairs.

The camera never cuts from one room to another. Choosing a room from the strip,
the minimap, the floor plan or a number key walks every step of the route between
here and there.

### How it works

- **Rooms are geometry, photos are projected onto them.** Every photographed
  room is a box built from its real footprint: floor, walls with door openings,
  and ceiling. Its panorama is projected onto that box from the point where it
  was captured (`components/tour/engine/materials.ts`). At the capture point the
  view is exactly the photograph. Anywhere else it shows true parallax, so
  stepping forward, or looking through a doorway into the next room, behaves like
  moving through a real space. Room sizes were measured off the photos
  themselves (the floor/wall line of a wall at distance *d* sits at
  `atan(1.6 / d)` below the horizon), and each photo is rotated so its own
  doorways land on the plan's doors.
- **Open-air spaces are domes.** Decks, terraces and trails are projected onto a
  large dome with a walkable floor. From indoors a dome may only be seen through
  its own doorway. Portal clipping cuts it (and everything else) to that opening,
  so the garden, the modelled house and the photographed view never bleed
  through each other.
- **Everything else is modelled.** Stair halls, door frames, the front door,
  facade, windows, roofs, porch, path, street, trees and sky are generated from
  the plan (`build-house.ts`, `environment.ts`). No extra assets are needed; the
  surface textures are drawn on canvas at load.
- **The walk graph.** `lib/tour/walk-graph.ts` turns the plan into places to
  stand, about a stride and a half (1.5 m) apart: a lattice across each space
  anchored on its capture point, a stop either side of every door, a stop every
  few treads, and the street-to-porch route. Walks are shortest paths on that
  graph, eased and gently rounded at the corners, with the head turning along the
  route and a slight step bob.
- **Four views of one model.** *Whole house* (exterior), *Walk* (eye height),
  *Dollhouse* (roof and ceilings lifted off, with any level isolated) and *Floor
  plan* (straight down). Switching views is always a camera flight.
- **Labels are DOM.** Door labels, info points and room names are projected into
  viewport pixels and rendered as ordinary focusable `<button>` elements, so they
  are keyboard-operable and screen-reader legible.
- **No React in the render loop.** The engine owns its own state and publishes
  labels and position through tiny external stores, so dragging the view never
  re-renders the viewer.
- **Progressive, budgeted textures.** Every room's 1024×512 preview loads up
  front, which is enough for the dollhouse and for views through windows. The
  4096×2048 capture loads for the room you are in and the rooms one door away,
  and a small LRU budget (four on desktop, two on touch devices) keeps GPU memory
  bounded.
- **Measurement.** Two taps anywhere on a wall or floor give a true 3D distance,
  because the rooms are real geometry. Readout toggles ft/m.

### What a visitor can do

| Control | Behaviour |
| --- | --- |
| Click / tap the floor | Walk to that spot, one step at a time |
| Click a doorway label | Walk through into the next room (or up/down the stairs) |
| `↑` / `W`, `↓` / `S` | Step forward / back; hold to keep walking |
| `←` `→` / `A` `D` | Turn |
| Drag / swipe | Look around |
| Scroll / pinch | Zoom |
| `1`–`9` | Walk to a room |
| `Esc` | Stop at the next step |
| `?` | Keyboard shortcut sheet |
| Whole house / Walk / Dollhouse / Floor plan | Four views of the same model |
| Guided tour | Street → front door → every room → stairs → every room upstairs |
| Measure | Two taps on any surface → distance |
| Auto-rotate, fullscreen, gyroscope | Standard viewer controls |

Visited rooms are remembered per listing, so the minimap shows progress and the
Saved board counts rooms walked.

### Panorama assets

31 CC0 equirectangular captures live in `public/panoramas/`, each stored twice:
`<name>.jpg` at 4096×2048 and `<name>-preview.jpg` at 1024×512. They are sourced
from [Poly Haven](https://polyhaven.com) (CC0) and downsized from Poly Haven's
tone-mapped 8K JPEGs.

Ten of them are one property, all shot within a few hundred metres of each
other, and make up the Phewa Lakeside Villa: `warm_bar`, `warm_restaurant`,
`qwantani_patio`, `small_harbour_morning`, `lakeside`, `billiard_hall`,
`empty_play_room`, `boma`, `qwantani_afternoon` and `squash_court`.

Listing galleries use flat views cut from the same panoramas
(`public/listings/views/`). Exterior photographs of the houses come from
Wikimedia Commons under CC BY / CC BY-SA and carry their attribution in each
listing's `credits`, shown under the property page.

To swap in real captures, drop a 2:1 equirectangular JPEG pair into
`public/panoramas/` and reference the basename from a space's `pano` field. The
more closely the room box matches the real room, the steadier the walk looks.

### Adding or editing a tour

Tours are small architectural models in [`lib/data/tours.ts`](lib/data/tours.ts).
Plan space is metres, with x east and z south:

```ts
nodes: [
  {
    id: 'great',
    name: 'Great Room',
    pano: 'lythwood_lounge',                   // public/panoramas/lythwood_lounge.jpg
    floor: 1,
    rect: { x: -5.6, z: -9.4, w: 10.1, d: 7.4 }, // footprint
    height: 3.2,                               // ceiling
    capture: { x: 0, z: -7.6 },                // where the photo was taken
    heading: -45,                              // compass bearing of the photo's yaw 0
    view: -90,                                 // face this way on arrival
    hotspots: [{ yaw: -40, pitch: 4, label: 'Glazing', body: '…' }],
  },
  { id: 'deck', kind: 'outdoor', pano: 'treetop_balcony', /* … */ },
  { id: 'stairs', kind: 'stair', name: 'Stair Hall', floor: 1, rect: { /* … */ } },
],
doors: [
  { a: 'entry', b: 'outside', x: 0, z: 5.0, width: 1.3, style: 'entrance' },
  { a: 'entry', b: 'great', x: 0, z: -2.0, width: 1.4 },
],
stairs: [{ from: 'stairs', to: 'landing', run: { x: -6.2, z: -1.0, w: 1.2, d: 3.6 }, ascent: 's' }],
site: { setting: 'himalayan', waterside: true, facade: 'stone', storey: 3.8, plinth: 0.45, approach: [/* street → porch */] },
```

Doors are the single source of truth for where a visitor can go. The walk
graph, floor plan, dollhouse and minimap all derive their routes from them.
Hotspot yaw/pitch are in the photo's own frame (degrees, clockwise from the
photo's forward). There are four models — the lakeside villa, a timber hill
house, a garden villa and a haveli. Map one to a listing in `toursBySlug`, via
`variant()` to retitle it and set its landscape; listings without an entry fall
back to one of the four, so no `hasTour` card ever opens an empty viewer.

### Other providers

- **Matterport** — set `NEXT_PUBLIC_MATTERPORT_MODEL_ID` (or a per-tour
  `modelId`) and a Matterport tab appears in the viewer. A dead or unauthorised
  model id degrades to a link rather than a black rectangle.
- **Street View** — set `NEXT_PUBLIC_GOOGLE_MAPS_KEY` to embed the street-level
  pano beside the interior walkover. Without a key the tab links out to Google
  Maps.

---

## Pages

| Route | Reference screen |
| --- | --- |
| `/` | `luxury_real_estate_exact_clone` + `luxury_real_estate_homepage` |
| `/homes-for-sale` | `luxury_real_estate_homes_for_sale_exact_clone` |
| `/tours` | `luxury_real_estate_3d_360_tours_exact_clone` |
| `/property/[slug]` | `luxury_real_estate_747_w_pacific_avenue_property_details_clone` |
| `/property/[slug]/tour` | Full-viewport immersive walkover (new) |
| `/professionals` | `luxury_real_estate_luxury_professionals_exact_clone` |
| `/destinations` | `luxury_real_estate_destinations_exact_clone` |
| `/press-releases` | `luxury_real_estate_press_releases_exact_clone` |
| `/about` | `luxury_real_estate_about_lre_exact_clone` |
| `/favorites`, `/account` | Personal board and sign-in (new) |

All 48 listing pages and 24 tour pages are statically generated at build time.

---

## Beyond the mockups

The reference screens are static. These were added to make the site work:

- **Natural-language search.** "lakeside villa in Pokhara with a 3d tour" parses
  into structured filters (province, state and district names resolve to a
  region). One parser
  ([`lib/smart-search.ts`](lib/smart-search.ts)) serves the hero console, the
  command palette and both listing pages, and each surface shows how the query
  was read as chips before you commit to it.
- **Command palette** (`Ctrl`/`Cmd` + `K`) across listings, destinations and
  brokers.
- **URL-addressable filters.** Every filter, sort, view and page lives in the
  query string, so a filtered view is linkable and survives a refresh.
- **Map view.** Inline SVG plate-carrée world map with price markers — no tile
  provider, no key, no third-party request.
- **Currency switcher.** Prices show in the listing's own currency (NPR or INR,
  grouped in lakhs and crores) until a display currency is chosen.
- **Favourites, compare tray and saved searches**, persisted locally.
- **Lead capture** posting to `/api/inquiries` with server-side validation.
- `sitemap.xml`, `robots.txt`, per-listing OpenGraph metadata, skip link,
  `prefers-reduced-motion` support.

---

## Project layout

```
app/                      Routes (App Router)
  api/inquiries/          Lead intake endpoint
  property/[slug]/        Detail page + /tour immersive walkover
components/
  tour/                   TourViewer, FloorPlan, Matterport / Street View adapters
    engine/               WalkEngine (three.js), house + site builders, shaders
  listing/                Cards, filter rail, results browser, map view
  home/                   Hero carousel, search console, tour showcase
  property/               Media stage, price header, location map, inquiry form
  layout/ ui/             Header, footer, palette, compare tray, currency
lib/
  data/                   Listings, agents, destinations, press, tours, nav
  tour/                   Plan geometry + walk graph shared by engine and floor plan
  smart-search.ts         Query parser + filter/sort engine
  format.ts               Currency conversion and display
  store.ts                Persisted session state (zustand)
public/panoramas/         31 equirectangular captures, full + preview
public/listings/          Listing exteriors (Commons) + views cut from the panoramas
scripts/                  exFAT readlink shim + Next launcher (see below)
```

Listings, agents and destinations in `lib/data/` are sample Nepal and India
content: towns and coordinates are real, while prices, agents (example.com
contacts, no portraits) and floor areas are illustrative. Press copy and the
About milestones are still the reference mockups' own values.

---

## Running from an exFAT drive

This project lives on an exFAT volume. exFAT has no symlink concept, so Windows
returns `EISDIR` from `readlink()` on a plain file where POSIX and NTFS return
`EINVAL`. Next.js and `enhanced-resolve` both probe route entry points with
`readlink` and treat anything other than `EINVAL`/`ENOENT` as fatal, which makes
`next build` fail with:

```
Error: EISDIR: illegal operation on a directory, readlink 'app/api/inquiries/route.ts'
```

`scripts/exfat-readlink-shim.cjs` normalises that one error code, and
`scripts/next.cjs` loads it before the Next CLI and republishes it through
`NODE_OPTIONS` so the build workers inherit it. That is why `npm run dev` and
`npm run build` go through `node scripts/next.cjs` rather than calling `next`
directly.

The shim is inert on NTFS, APFS and ext4, so it is safe to keep. If you move the
project to an NTFS drive you can revert the three scripts in `package.json` to
plain `next dev` / `next build` / `next start`.

---

## Credits

- Panoramas: [Poly Haven](https://polyhaven.com) (CC0)
- Listing exteriors: Wikimedia Commons contributors, CC BY / CC BY-SA, credited
  per listing (`credits` in `lib/data/properties.ts`, shown on the property page)
- Room views, hero and destination images: cut from the Poly Haven panoramas
- Fonts: Playfair Display, Montserrat, Cinzel (Google Fonts, self-hosted via
  `next/font`)
- Icons: Font Awesome Free 6
#   r e a l s t a t e  
 