# Who's Who in Luxury Real Estate — Virtual Walkover Platform

A Next.js implementation of the LuxuryRealEstate.com design system, built around a
360° virtual walkover engine: every showcase listing can be walked room by room in
the browser, on any device, with no plugin and no third-party account.

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

### Why a custom engine

Matterport, Kuula, Pannellum and friends all solve the display problem, but they
own the chrome, need an account or a key, and cannot be styled to match a brand.
The engine here is ~600 lines of `three.js` in
[`components/tour/panorama-engine.ts`](components/tour/panorama-engine.ts) and it
is provider-agnostic: Matterport and Street View plug in beside it as adapters
rather than replacing it.

### How it works

- **Rendering.** An equirectangular panorama is drawn on the inside of a sphere
  with the camera at the centre. Walking to another capture point cross-fades a
  second sphere over the first while dollying the camera forward a little, which
  reads as stepping through a doorway rather than cutting to a new slide.
- **Scene graph.** A tour is a set of nodes (capture positions), each with
  hotspots. `kind: 'nav'` hotspots are the walk targets, so the floor plan, the
  dollhouse and the minimap all derive their edges from the same data the walk
  mode uses — the map can never disagree with where you can actually go.
- **Hotspots are DOM.** Spherical positions are projected into viewport pixels
  each frame and rendered as ordinary focusable `<button>` elements, so they are
  keyboard-operable and screen-reader legible rather than WebGL sprites.
- **No React in the render loop.** The engine owns its own state and only pushes
  projected hotspot positions back to React. Dragging the view never re-renders
  the 3D layer.
- **Progressive load.** A 1024×512 preview paints within a frame or two, then the
  4096×2048 capture swaps in behind it. Rooms one step away are prefetched.
- **Measurement.** View rays are intersected with a floor plane at a fixed eye
  height (1.6 m), which is how a single-camera panorama can produce usable ground
  distances without depth data. Readout toggles ft/m.

### What a visitor can do

| Control | Behaviour |
| --- | --- |
| Drag / swipe | Look around, with inertia |
| Scroll / pinch | Zoom (FOV 32°–100°) |
| Arrow keys | Look without a pointer |
| `1`–`9` | Jump straight to a room |
| `?` | Keyboard shortcut sheet |
| Click a ring | Walk to the next room |
| Walk / Dollhouse / Floor plan | Three views of the same graph |
| Measure | Two taps on the floor → distance |
| Auto-rotate, fullscreen, gyroscope | Standard viewer controls |

Visited rooms are remembered per listing, so the minimap shows progress and the
Saved board counts rooms walked.

### Panorama assets

22 CC0 equirectangular captures live in `public/panoramas/`, each stored twice —
`<name>.jpg` at 4096×2048 and `<name>-preview.jpg` at 1024×512. They are sourced
from [Poly Haven](https://polyhaven.com) (CC0) and tone-mapped down from the 8K
originals.

To swap in real captures, drop a 2:1 equirectangular JPEG pair into
`public/panoramas/` and reference the basename from a tour node's `pano` field.

### Adding or editing a tour

Tours are hand-authored in [`lib/data/tours.ts`](lib/data/tours.ts):

```ts
{
  id: 'great',
  name: 'Great Room',
  pano: 'lythwood_lounge',          // public/panoramas/lythwood_lounge.jpg
  floor: 1,
  plan: { x: 0.41, y: 0.56 },       // 0-1 position on the floor plan
  entryYaw: 20,                     // degrees the camera faces on entry
  hotspots: [
    { kind: 'nav', to: 'kitchen', yaw: 64, pitch: -13, label: 'Kitchen & Dining' },
    { kind: 'info', yaw: 12, pitch: 7, label: 'Glazing', body: '…' },
  ],
}
```

Yaw is degrees clockwise from the panorama seam; pitch is degrees above the
horizon, so a nav hotspot at `pitch: -13` sits on the floor ahead of you. Map the
tour to a listing in `toursBySlug`; listings without an entry fall back to one of
the three demo walkthroughs so no `hasTour` card ever opens an empty viewer.

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

- **Natural-language search.** "5 bed ski property in Colorado under $3m with a
  3d tour" parses into structured filters. One parser
  ([`lib/smart-search.ts`](lib/smart-search.ts)) serves the hero console, the
  command palette and both listing pages, and each surface shows how the query
  was read as chips before you commit to it.
- **Command palette** (`Ctrl`/`Cmd` + `K`) across listings, destinations and
  brokers.
- **URL-addressable filters.** Every filter, sort, view and page lives in the
  query string, so a filtered view is linkable and survives a refresh.
- **Map view.** Inline SVG plate-carrée world map with price markers — no tile
  provider, no key, no third-party request.
- **Currency switcher** with live conversion across every price on the page.
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
  tour/                   panorama-engine.ts, TourViewer, FloorPlan, adapters
  listing/                Cards, filter rail, results browser, map view
  home/                   Hero carousel, search console, tour showcase
  property/               Media stage, price header, location map, inquiry form
  layout/ ui/             Header, footer, palette, compare tray, currency
lib/
  data/                   Listings, agents, destinations, press, tours, nav
  smart-search.ts         Query parser + filter/sort engine
  format.ts               Currency conversion and display
  store.ts                Persisted session state (zustand)
public/panoramas/         22 equirectangular captures, full + preview
scripts/                  exFAT readlink shim + Next launcher (see below)
```

Content in `lib/data/` was transcribed from the reference mockups — titles,
locations, prices, bed/bath counts, agencies, Regents badges, press copy and the
About milestones are the source screens' own values.

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
- Listing, portrait and destination photography: the reference mockups
- Fonts: Playfair Display, Montserrat, Cinzel (Google Fonts, self-hosted via
  `next/font`)
- Icons: Font Awesome Free 6
#   r e a l s t a t e  
 