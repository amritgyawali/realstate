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
The engine is plain `three.js` in
[`components/tour/panorama-engine.ts`](components/tour/panorama-engine.ts), with
the graph maths it shares with the floor plan and dollhouse in
[`lib/tour-graph.ts`](lib/tour-graph.ts). It is provider-agnostic: Matterport and
Street View plug in beside it as adapters rather than replacing it.

### How it works

- **Walking, not cutting.** Each panorama is projected onto a proxy of the room it
  was captured in — a floor 1.6 m below the lens, a ceiling and a round wall
  (`room` on the node) — instead of onto an infinitely distant sphere. The camera
  can therefore physically move: walking to the next room carries it through the
  proxy of the room it is leaving, so the floor streams past and the doorway
  grows, while the next room's panorama, projected from its own capture point,
  fades in around it. One full-screen shader pass ray-casts both proxies.
- **Door by door.** However a room is chosen — a floor ring, a click on the
  floor, the filmstrip, the floor plan, the dollhouse, a number key — the engine
  plans the shortest route through the nav graph (`findRoute`) and walks it one
  leg at a time. Gentle turns are taken at speed on a curved path; sharp ones
  slow to a stop and turn first. Arriving in a room re-bases the world on it, so
  the view heading carries across every doorway without a snap.
- **Continuous walking.** Holding `W`/`↑` keeps walking through whichever doorway
  lies ahead; `A`/`D` steer. A step with no doorway ahead leans in and back.
- **Guided tour.** A depth-first sweep that stands in every room once, pausing to
  look around each new one, and stops the moment the visitor takes the controls.
- **3D dollhouse.** Rooms are Voronoi outlines of the capture points, extruded
  into walls and stacked by floor, each textured by projecting its own panorama
  from its capture point. Near walls cull away as the camera orbits. Choosing a
  room flies the camera down to eye height, then hands over to the walk.
- **Scene graph.** A tour is a set of nodes (capture positions), each with
  hotspots. `kind: 'nav'` hotspots are the walk targets, so routes, the floor
  plan, the dollhouse and the minimap all derive from the same data the walk
  uses — the map can never disagree with where you can actually go.
- **Hotspots are DOM.** Floor markers are placed on the floor in 3D, projected
  into viewport pixels and rendered as ordinary focusable `<button>` elements,
  so they are keyboard-operable and screen-reader legible rather than sprites.
- **No React in the render loop.** The engine owns its own state. Hotspots go
  back to React only when the view changes; per-frame values (heading, leg
  progress, walking speed, pointer) are CSS custom properties on the viewer, which
  the compass, minimap marker and speed vignette read directly.
- **Progressive load.** A 1024×512 preview paints within a frame or two, then the
  4096×2048 capture swaps in behind it. Rooms one door away are prefetched, a
  route's rooms are prefetched when it starts, and only the six most recent
  full-resolution captures are kept on the GPU.
- **360° video.** A node may name an equirectangular `video`; it plays in place of
  the still (muted, looped) and the still stays the poster and fallback.
- **Measurement.** View rays are intersected with the floor plane at eye height,
  which is how a single-camera panorama can produce usable ground distances
  without depth data. Readout toggles ft/m.
- **Reduced motion.** With the OS setting (or the site toggle) on, legs become
  in-place cross-fades with no head bob, speed kick or orbiting.

### What a visitor can do

| Control | Behaviour |
| --- | --- |
| Click the floor / a ring | Walk through the doorway on that side |
| `W` `↑` (hold) · `S` `↓` | Walk forward room after room · step back |
| `A` `D` / `←` `→` · `R` `F` | Turn · look up and down |
| Drag / swipe | Look around, with inertia |
| Scroll / pinch / `+` `−` | Zoom (FOV 32°–100°) |
| `1`–`9`, filmstrip, floor plan | Walk to that room, door by door |
| `G` / play button | Guided tour of every room |
| `Esc` | Stop walking, close overlays |
| `?` | Keyboard shortcut sheet |
| 3D dollhouse / Floor plan | The house in 3D, and flat, with route previews |
| Measure | Two taps on the floor → distance |
| Auto-rotate, fullscreen, gyroscope | Standard viewer controls |

In the listing-page panel the keys only apply while the pointer is over the
viewer or focus is inside it; the full-viewport tour listens everywhere.

Visited rooms are remembered per listing, so the minimap shows progress and the
Saved board counts rooms walked — including rooms passed through on a route.

### Panorama assets

85 CC0 equirectangular captures live in `public/panoramas/`, each stored twice —
`<name>.jpg` at 4096×2048 and `<name>-preview.jpg` at 1024×512 (about 120 MB in
all). They are sourced from [Poly Haven](https://polyhaven.com) (CC0) and scaled
down from its 8K tone-mapped JPGs. They make up 20 houses of 3–8 rooms, one per
tour-enabled listing; each capture is used once. The dollhouse is built from the
same captures; there are no separate 3D models.

Poly Haven has only a few dozen captures that read as rooms of a home, and none
shows many rooms of the same house, so each house is assembled from captures of
matching style rather than surveyed from one building. Swap in real listing
captures as they become available.

To swap in real captures, drop a 2:1 equirectangular JPEG pair into
`public/panoramas/` and reference the basename from a tour node's `pano` field.

### Adding or editing a tour

Tours are hand-authored in [`lib/data/tours.ts`](lib/data/tours.ts):

```ts
{
  id: 'great',
  name: 'Great Room',
  pano: 'lythwood_lounge',          // public/panoramas/lythwood_lounge.jpg
  video: undefined,                 // optional equirect mp4/webm
  floor: 1,
  plan: { x: 0.41, y: 0.56 },       // 0-1 position on the floor plan
  entryYaw: -36,                    // degrees the camera faces on a direct load
  room: { radius: 6, ceiling: 3 },  // or { outdoor: true }
  hotspots: [
    { kind: 'nav', to: 'kitchen', yaw: 68, pitch: -12, label: 'Kitchen & Dining' },
    { kind: 'info', yaw: -36, pitch: 4, label: 'Glazing', body: '…' },
  ],
}
```

Yaw is degrees clockwise, and yaw 0 sits three-quarters of the way across the
image: a feature at pixel column `x` of a `W`-wide panorama has yaw
`x / W × 360 − 270` (wrapped to ±180). Pitch is degrees above the horizon, so a nav
hotspot at `pitch: -12` sits on the floor ahead of you.

Aim every nav hotspot at the doorway, arch or stair it leads through — walking
moves the camera towards it — and give the destination a hotspot back, since
that is what sets the direction you face on arrival. A floor marker's pitch sets
how far the step is; override it with `distance` (metres) if needed. Map the tour
to a listing in `toursBySlug`; listings without an entry fall back to one of the
other walkthroughs so no `hasTour` card ever opens an empty viewer.

The three original tours are written out in full in `lib/data/tours.ts`; the
other seventeen use the compact `house()` builder in
[`lib/data/estate-tours.ts`](lib/data/estate-tours.ts), which labels nav
hotspots from the rooms they lead to (adding "Upstairs —" / "Downstairs —" across
floors) and takes the title, agency, date, floor area and appliance note from the
listing record.

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
  tour/                   panorama-engine.ts, dollhouse-engine.ts, TourViewer,
                          Dollhouse, FloorPlan, adapters
  listing/                Cards, filter rail, results browser, map view
  home/                   Hero carousel, search console, tour showcase
  property/               Media stage, price header, location map, inquiry form
  layout/ ui/             Header, footer, palette, compare tray, currency
lib/
  data/                   Listings, agents, destinations, press, tours, nav
  smart-search.ts         Query parser + filter/sort engine
  tour-graph.ts           Walk routes, guided order, room outlines, headings
  format.ts               Currency conversion and display
  store.ts                Persisted session state (zustand)
public/panoramas/         85 equirectangular captures, full + preview
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
#   r e a l s t a t e 
 
 