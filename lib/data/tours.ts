import type { PropertyTour } from '@/lib/types';

/**
 * Tour scene graphs.
 *
 * Each node is one captured 360° position. `hotspots` with `kind: 'nav'` are the
 * walk targets — that is what makes this a walkover rather than a slideshow: the
 * viewer moves between adjacent capture points the way a person would move
 * between rooms. Yaw is degrees clockwise from the panorama seam, pitch is
 * degrees above the horizon, so a hotspot at pitch -12 sits on the floor ahead.
 *
 * Nav hotspots are aimed at the doorway, arch or stair visible in the capture,
 * because walking to one moves the camera towards it: the transition reads as
 * stepping through that opening. A floor-level marker's pitch sets how far the
 * step is (see `hotspotDistance` in lib/tour-graph.ts).
 *
 * `plan` coordinates are normalised (0-1) positions on the floor plan; the
 * room outlines, minimap and 3D dollhouse are all derived from them. `room` is
 * the rough size of the captured space, which the walk engine projects the
 * panorama onto.
 *
 * Panoramas are CC0 equirectangular captures (4096x2048 with a 1024x512 preview
 * for progressive load) stored in /public/panoramas.
 */

/**
 * Optional Matterport space. Set NEXT_PUBLIC_MATTERPORT_MODEL_ID to a model you
 * control and the flagship listing gains a Matterport tab alongside the built-in
 * engine; leave it unset and the built-in engine is the only provider offered.
 */
export const MATTERPORT_MODEL_ID = process.env.NEXT_PUBLIC_MATTERPORT_MODEL_ID ?? '';

const telluride: PropertyTour = {
  provider: 'panorama',
  modelId: MATTERPORT_MODEL_ID,
  title: '542 Telluride Lodge',
  capturedBy: "LIV Sotheby's International Realty",
  scanDate: '2026-08-29',
  startNode: 'entry',
  floors: [
    { level: 1, name: 'Main Level', area: 860 },
    { level: 2, name: 'Upper Level', area: 390 },
  ],
  nodes: [
    {
      id: 'entry',
      name: 'Entrance Hall',
      pano: 'entrance_hall',
      floor: 1,
      plan: { x: 0.16, y: 0.74 },
      entryYaw: -45,
      room: { radius: 5, ceiling: 3.4 },
      hotspots: [
        { kind: 'nav', to: 'great', yaw: -45, pitch: -13, label: 'Great Room' },
        { kind: 'nav', to: 'primary', yaw: -150, pitch: 6, label: 'Upstairs — Primary Suite' },
        {
          kind: 'info',
          yaw: 100,
          pitch: -6,
          label: 'Heated ski locker',
          body: 'Boot dryers, a snowmelt entry slab and a dedicated gear wall sit immediately off the arrival vestibule.',
        },
      ],
    },
    {
      id: 'great',
      name: 'Great Room',
      pano: 'lythwood_lounge',
      floor: 1,
      plan: { x: 0.41, y: 0.56 },
      entryYaw: -36,
      room: { radius: 6, ceiling: 3 },
      hotspots: [
        { kind: 'nav', to: 'entry', yaw: 178, pitch: -12, label: 'Entrance Hall' },
        { kind: 'nav', to: 'hearth', yaw: -128, pitch: -11, label: 'Hearth Room' },
        { kind: 'nav', to: 'kitchen', yaw: 68, pitch: -12, label: 'Kitchen & Dining' },
        {
          kind: 'info',
          yaw: -36,
          pitch: 4,
          label: 'Floor-to-ceiling glazing',
          body: 'Triple-glazed, argon-filled window wall framing the box canyon and the ski area beyond.',
        },
      ],
    },
    {
      id: 'hearth',
      name: 'Hearth Room',
      pano: 'fireplace',
      floor: 1,
      plan: { x: 0.29, y: 0.34 },
      entryYaw: -65,
      room: { radius: 4, ceiling: 2.9 },
      hotspots: [
        { kind: 'nav', to: 'great', yaw: 176, pitch: -13, label: 'Great Room' },
        {
          kind: 'info',
          yaw: -65,
          pitch: -8,
          label: 'Board-formed concrete hearth',
          body: 'Cast on site with reclaimed fir formwork, paired with a sealed-combustion firebox.',
        },
      ],
    },
    {
      id: 'kitchen',
      name: 'Kitchen & Dining',
      pano: 'glasshouse_interior',
      floor: 1,
      plan: { x: 0.66, y: 0.46 },
      entryYaw: -62,
      room: { radius: 4.5, ceiling: 2.8 },
      hotspots: [
        { kind: 'nav', to: 'great', yaw: 101, pitch: -12, label: 'Great Room' },
        { kind: 'nav', to: 'deck', yaw: -62, pitch: -10, label: 'Mountain Deck' },
        {
          kind: 'info',
          yaw: 75,
          pitch: -8,
          label: 'Appliance package',
          body: 'Dishwasher, disposal, microwave oven, range/oven and refrigerator, with a butler pantry behind.',
        },
      ],
    },
    {
      id: 'deck',
      name: 'Mountain Deck',
      pano: 'treetop_balcony',
      floor: 1,
      plan: { x: 0.85, y: 0.62 },
      entryYaw: 12,
      room: { outdoor: true, radius: 10 },
      hotspots: [
        { kind: 'nav', to: 'kitchen', yaw: 125, pitch: -11, label: 'Kitchen & Dining' },
        { kind: 'nav', to: 'overlook', yaw: -142, pitch: -12, label: 'Box Canyon Overlook' },
        {
          kind: 'info',
          yaw: -40,
          pitch: 2,
          label: 'Hot tub terrace',
          body: 'South-facing deck with a recessed spa and a gas fire table, plumbed for an outdoor kitchen.',
        },
      ],
    },
    {
      id: 'overlook',
      name: 'Box Canyon Overlook',
      pano: 'sterkspruit_falls',
      floor: 1,
      plan: { x: 0.93, y: 0.24 },
      entryYaw: 12,
      room: { outdoor: true },
      hotspots: [
        { kind: 'nav', to: 'deck', yaw: 165, pitch: -12, label: 'Mountain Deck' },
        {
          kind: 'info',
          yaw: 20,
          pitch: 4,
          label: 'Coonskin Lift',
          body: 'The lift and River Trail are directly across the street — ski access without a shuttle.',
        },
      ],
    },
    {
      id: 'primary',
      name: 'Primary Suite',
      pano: 'lythwood_room',
      floor: 2,
      plan: { x: 0.35, y: 0.3 },
      entryYaw: -52,
      room: { radius: 5, ceiling: 2.8 },
      hotspots: [
        { kind: 'nav', to: 'bath', yaw: -173, pitch: -11, label: 'Primary Bath' },
        { kind: 'nav', to: 'entry', yaw: 157, pitch: -14, label: 'Downstairs — Entrance Hall' },
        {
          kind: 'info',
          yaw: -52,
          pitch: 4,
          label: 'Ski area aspect',
          body: 'The bed wall faces due south; the glazing opposite frames the upper mountain runs.',
        },
      ],
    },
    {
      id: 'bath',
      name: 'Primary Bath',
      pano: 'en_suite',
      floor: 2,
      plan: { x: 0.56, y: 0.22 },
      entryYaw: 20,
      room: { radius: 3.2, ceiling: 2.6 },
      hotspots: [
        { kind: 'nav', to: 'primary', yaw: -70, pitch: -11, label: 'Primary Suite' },
        {
          kind: 'info',
          yaw: -20,
          pitch: -32,
          label: 'Radiant stone floor',
          body: 'Honed limestone over hydronic radiant, with a steam shower and a freestanding soaking tub.',
        },
      ],
    },
  ],
};

const coastal: PropertyTour = {
  provider: 'panorama',
  title: 'Cala Vinyas Waterfront Villa',
  capturedBy: 'Eklund Stockholm New York',
  scanDate: '2026-09-02',
  startNode: 'courtyard',
  floors: [
    { level: 1, name: 'Garden Level', area: 1120 },
    { level: 2, name: 'Suite Level', area: 680 },
  ],
  nodes: [
    {
      id: 'courtyard',
      name: 'Arrival Courtyard',
      pano: 'qwantani_patio',
      floor: 1,
      plan: { x: 0.14, y: 0.7 },
      entryYaw: -70,
      room: { radius: 7, ceiling: 2.7 },
      hotspots: [
        { kind: 'nav', to: 'veranda', yaw: 80, pitch: -12, label: 'Veranda' },
        {
          kind: 'info',
          yaw: -70,
          pitch: -4,
          label: 'Gated motor court',
          body: 'Automated gate, four-car court and a covered porte-cochère shielding the entry.',
        },
      ],
    },
    {
      id: 'veranda',
      name: 'Veranda',
      pano: 'veranda',
      floor: 1,
      plan: { x: 0.34, y: 0.58 },
      entryYaw: -84,
      room: { radius: 5, ceiling: 2.6 },
      hotspots: [
        { kind: 'nav', to: 'courtyard', yaw: -84, pitch: -12, label: 'Arrival Courtyard' },
        { kind: 'nav', to: 'living', yaw: 62, pitch: -12, label: 'Living Pavilion' },
        { kind: 'nav', to: 'pool', yaw: -17, pitch: -11, label: 'Indoor Pool' },
      ],
    },
    {
      id: 'living',
      name: 'Living Pavilion',
      pano: 'wooden_lounge',
      floor: 1,
      plan: { x: 0.5, y: 0.48 },
      entryYaw: -8,
      room: { radius: 6.5, ceiling: 3.2 },
      hotspots: [
        { kind: 'nav', to: 'veranda', yaw: 111, pitch: -12, label: 'Veranda' },
        { kind: 'nav', to: 'terrace', yaw: 48, pitch: -12, label: 'Sunset Terrace' },
        { kind: 'nav', to: 'suite', yaw: 82, pitch: 5, label: 'Upstairs — Seaview Suite' },
        {
          kind: 'info',
          yaw: -10,
          pitch: 6,
          label: 'Double-height volume',
          body: 'Exposed glulam frame with a clerestory band that pulls light deep into the plan.',
        },
      ],
    },
    {
      id: 'pool',
      name: 'Indoor Pool',
      pano: 'indoor_pool',
      floor: 1,
      plan: { x: 0.3, y: 0.28 },
      entryYaw: 0,
      room: { radius: 7, ceiling: 3 },
      hotspots: [
        { kind: 'nav', to: 'veranda', yaw: 97, pitch: -12, label: 'Veranda' },
        { kind: 'nav', to: 'spa', yaw: 71, pitch: -12, label: 'Spa Bath' },
        {
          kind: 'info',
          yaw: -30,
          pitch: -2,
          label: 'Year-round lap pool',
          body: 'Dehumidified enclosure, 18 m lap lane, counter-current system and an adjoining sauna.',
        },
      ],
    },
    {
      id: 'spa',
      name: 'Spa Bath',
      pano: 'modern_bathroom',
      floor: 1,
      plan: { x: 0.62, y: 0.24 },
      entryYaw: -90,
      room: { radius: 3.5, ceiling: 2.6 },
      hotspots: [{ kind: 'nav', to: 'pool', yaw: 30, pitch: -12, label: 'Indoor Pool' }],
    },
    {
      id: 'suite',
      name: 'Seaview Suite',
      pano: 'relax_inn_seaview_suite',
      floor: 2,
      plan: { x: 0.74, y: 0.4 },
      entryYaw: -45,
      room: { radius: 5, ceiling: 2.7 },
      hotspots: [
        { kind: 'nav', to: 'balcony', yaw: -45, pitch: -11, label: 'Ocean Balcony' },
        { kind: 'nav', to: 'living', yaw: 93, pitch: -14, label: 'Downstairs — Living Pavilion' },
      ],
    },
    {
      id: 'terrace',
      name: 'Sunset Terrace',
      pano: 'sundowner_deck',
      floor: 1,
      plan: { x: 0.84, y: 0.64 },
      entryYaw: -60,
      room: { radius: 7, ceiling: 2.9 },
      hotspots: [
        { kind: 'nav', to: 'living', yaw: -165, pitch: -12, label: 'Living Pavilion' },
        {
          kind: 'info',
          yaw: 24,
          pitch: 2,
          label: 'Due-west aspect',
          body: 'Covered dining terrace with a retractable louvre roof and an outdoor kitchen behind.',
        },
      ],
    },
    {
      id: 'balcony',
      name: 'Ocean Balcony',
      pano: 'illovo_beach_balcony',
      floor: 2,
      plan: { x: 0.93, y: 0.3 },
      entryYaw: 0,
      room: { outdoor: true, radius: 8 },
      hotspots: [{ kind: 'nav', to: 'suite', yaw: -175, pitch: -12, label: 'Seaview Suite' }],
    },
  ],
};

const penthouse: PropertyTour = {
  provider: 'panorama',
  title: 'Skyline Penthouse Residence',
  capturedBy: 'Harvey Kalles Real Estate LTD',
  scanDate: '2026-09-06',
  startNode: 'library',
  floors: [
    { level: 1, name: 'Residence Level', area: 940 },
    { level: 2, name: 'Roof Level', area: 520 },
  ],
  nodes: [
    {
      id: 'library',
      name: 'Library',
      pano: 'reading_room',
      floor: 1,
      plan: { x: 0.2, y: 0.62 },
      entryYaw: -54,
      room: { radius: 6.5, ceiling: 3.2 },
      hotspots: [
        { kind: 'nav', to: 'lounge', yaw: -54, pitch: -9, label: 'Sky Lounge' },
        {
          kind: 'info',
          yaw: 159,
          pitch: -6,
          label: 'Millwork study',
          body: 'Full-height rift oak shelving with integrated lighting and a concealed service bar.',
        },
      ],
    },
    {
      id: 'lounge',
      name: 'Sky Lounge',
      pano: 'cayley_interior',
      floor: 1,
      plan: { x: 0.44, y: 0.5 },
      entryYaw: -100,
      room: { radius: 5, ceiling: 2.7 },
      hotspots: [
        { kind: 'nav', to: 'library', yaw: 122, pitch: -12, label: 'Library' },
        { kind: 'nav', to: 'guest', yaw: 85, pitch: -12, label: 'Guest Suite' },
        { kind: 'nav', to: 'club', yaw: 152, pitch: -10, label: 'Club Room' },
        { kind: 'nav', to: 'rooftop', yaw: -100, pitch: 5, label: 'Up — Rooftop Terrace' },
      ],
    },
    {
      id: 'guest',
      name: 'Guest Suite',
      pano: 'hotel_room',
      floor: 1,
      plan: { x: 0.3, y: 0.28 },
      entryYaw: 0,
      room: { radius: 3.8, ceiling: 2.7 },
      hotspots: [{ kind: 'nav', to: 'lounge', yaw: 137, pitch: -12, label: 'Sky Lounge' }],
    },
    {
      id: 'club',
      name: 'Club Room',
      pano: 'country_club',
      floor: 1,
      plan: { x: 0.62, y: 0.66 },
      entryYaw: 6,
      room: { radius: 8, ceiling: 4 },
      hotspots: [
        { kind: 'nav', to: 'lounge', yaw: 125, pitch: -10, label: 'Sky Lounge' },
        {
          kind: 'info',
          yaw: 40,
          pitch: -2,
          label: 'Resident amenity',
          body: 'Private club level with a chef kitchen, screening room and a 14-seat dining table.',
        },
      ],
    },
    {
      id: 'rooftop',
      name: 'Rooftop Terrace',
      pano: 'homecoming_center_rooftop',
      floor: 2,
      plan: { x: 0.78, y: 0.4 },
      entryYaw: 0,
      room: { outdoor: true },
      hotspots: [
        { kind: 'nav', to: 'lounge', yaw: -136, pitch: -8, label: 'Down — Sky Lounge' },
        { kind: 'nav', to: 'skyline', yaw: 30, pitch: -12, label: 'Skyline Balcony' },
      ],
    },
    {
      id: 'skyline',
      name: 'Skyline Balcony',
      pano: 'hotel_rooftop_balcony',
      floor: 2,
      plan: { x: 0.92, y: 0.62 },
      entryYaw: 0,
      room: { outdoor: true },
      hotspots: [{ kind: 'nav', to: 'rooftop', yaw: -165, pitch: -12, label: 'Rooftop Terrace' }],
    },
  ],
};

/**
 * Tours keyed by property slug. Listings without an entry here fall back to the
 * shared demo walkthrough so every `hasTour` card still opens something real.
 */
export const toursBySlug: Record<string, PropertyTour> = {
  '747-w-pacific-avenue-unit-540-telluride': telluride,
  'cala-vinyes-spain': coastal,
  '11966-rockview-point-street-las-vegas': penthouse,
};

export const fallbackTours = Object.values(toursBySlug);

export function getTour(slug: string, index = 0): PropertyTour {
  return toursBySlug[slug] ?? fallbackTours[index % fallbackTours.length];
}
