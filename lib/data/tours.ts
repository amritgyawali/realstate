import type { PropertyTour } from '@/lib/types';

/**
 * Tour buildings.
 *
 * Each tour is a small architectural model: the spaces on each level with their
 * real footprints in metres, the doors between them, the stairs, and the route
 * from the street to the front door. The engine builds the house from this,
 * projects every room's 360° photograph onto that room's walls and floor, and
 * lets a visitor walk through it one step at a time — street, front path, porch,
 * front door, hall, doorway, room — instead of cutting between photographs.
 *
 * Room boxes were measured off the photographs themselves: the floor/wall line
 * of each wall sits at pitch atan(1.6 / distance) below the horizon, so a box
 * built from those distances around `capture` reproduces the photo exactly at
 * the capture point and holds together as you walk away from it. `heading`
 * turns each photo so its own doorways fall on the plan's doors — the hall's
 * double doors really do open into the great room, and the bedroom's two doors
 * really do lead to the landing and the en-suite.
 *
 * Conventions: x east, z south (down the plan), metres. Headings and view yaws
 * are compass degrees (0 = north, 90 = east). Hotspot yaw/pitch are in the
 * photo's own frame (0 = the photo's forward, clockwise), as captured.
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
  site: {
    setting: 'alpine',
    facade: 'timber',
    storey: 3.3,
    plinth: 0.6,
    approach: [
      { x: 3.5, z: 21, label: 'Street' },
      { x: 1.2, z: 15.5, label: 'Front walk' },
      { x: 0, z: 10.8, label: 'Front garden' },
      { x: 0, z: 8.4, label: 'Porch steps' },
    ],
  },
  nodes: [
    {
      id: 'entry',
      name: 'Entrance Hall',
      pano: 'entrance_hall',
      floor: 1,
      rect: { x: -2.2, z: -2.0, w: 4.4, d: 7.0 },
      height: 3.1,
      capture: { x: 0, z: 0 },
      heading: 45,
      view: 0,
      hotspots: [
        {
          yaw: -68,
          pitch: -4,
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
      rect: { x: -5.6, z: -9.4, w: 10.1, d: 7.4 },
      height: 3.2,
      capture: { x: 0, z: -7.6 },
      heading: -45,
      view: -90,
      hotspots: [
        {
          yaw: -40,
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
      rect: { x: 2.2, z: -2.0, w: 5.5, d: 4.9 },
      height: 2.9,
      capture: { x: 5.1, z: 0.4 },
      heading: 90,
      view: 0,
      hotspots: [
        {
          yaw: -84,
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
      rect: { x: 4.5, z: -11.3, w: 6.0, d: 9.3 },
      height: 3.0,
      capture: { x: 7.5, z: -7.3 },
      heading: 180,
      view: 90,
      hotspots: [
        {
          yaw: 80,
          pitch: -8,
          label: 'Appliance package',
          body: 'Dishwasher, disposal, microwave oven, range/oven and refrigerator, with a butler pantry behind.',
        },
      ],
    },
    {
      id: 'deck',
      name: 'Mountain Deck',
      kind: 'outdoor',
      pano: 'treetop_balcony',
      floor: 1,
      rect: { x: -11.6, z: -11.8, w: 6.0, d: 5.2 },
      capture: { x: -8.7, z: -7.6 },
      heading: -35,
      view: -90,
      hotspots: [
        {
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
      kind: 'outdoor',
      pano: 'sterkspruit_falls',
      floor: 1,
      rect: { x: -12.4, z: -18.8, w: 7.0, d: 7.0 },
      capture: { x: -8.9, z: -15.3 },
      heading: -5,
      view: 0,
      hotspots: [
        {
          yaw: 20,
          pitch: 4,
          label: 'Coonskin Lift',
          body: 'The lift and River Trail are directly across the street — ski access without a shuttle.',
        },
      ],
    },
    {
      id: 'stairs',
      name: 'Stair Hall',
      kind: 'stair',
      floor: 1,
      rect: { x: -6.2, z: -2.0, w: 4.0, d: 5.6 },
    },
    {
      id: 'landing',
      name: 'Upper Landing',
      kind: 'stair',
      floor: 2,
      rect: { x: -6.2, z: -2.0, w: 4.0, d: 5.6 },
    },
    {
      id: 'primary',
      name: 'Primary Suite',
      pano: 'lythwood_room',
      floor: 2,
      rect: { x: -7.6, z: -6.6, w: 7.5, d: 4.6 },
      height: 3.2,
      capture: { x: -4.5, z: -4.2 },
      heading: -30,
      view: -90,
      hotspots: [
        {
          yaw: -60,
          pitch: 2,
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
      rect: { x: -2.2, z: -2.0, w: 2.7, d: 2.7 },
      height: 2.6,
      capture: { x: -0.8, z: -0.5 },
      heading: 90,
      view: 180,
      hotspots: [
        {
          yaw: 30,
          pitch: -18,
          label: 'Radiant stone floor',
          body: 'Honed limestone over hydronic radiant, with a steam shower and a freestanding soaking tub.',
        },
      ],
    },
  ],
  doors: [
    { a: 'entry', b: 'outside', x: 0, z: 5.0, width: 1.3, style: 'entrance' },
    { a: 'entry', b: 'great', x: 0, z: -2.0, width: 1.4, height: 2.5 },
    { a: 'entry', b: 'hearth', x: 2.2, z: 0.5 },
    { a: 'entry', b: 'stairs', x: -2.2, z: 0.8, width: 1.2, style: 'arch', height: 2.4 },
    { a: 'great', b: 'kitchen', x: 4.5, z: -7.6, width: 2.2, style: 'arch' },
    { a: 'great', b: 'deck', x: -5.6, z: -7.6, width: 2.0, style: 'glass' },
    { a: 'deck', b: 'overlook', x: -8.7, z: -11.8, width: 2.4, style: 'open' },
    { a: 'landing', b: 'primary', x: -3.6, z: -2.0 },
    { a: 'primary', b: 'bath', x: -0.7, z: -2.0, width: 0.9 },
  ],
  stairs: [
    { from: 'stairs', to: 'landing', run: { x: -6.2, z: -1.0, w: 1.2, d: 3.6 }, ascent: 's' },
  ],
};

const coastal: PropertyTour = {
  provider: 'panorama',
  title: 'Cala Vinyas Waterfront Villa',
  capturedBy: 'Eklund Stockholm New York',
  scanDate: '2026-09-02',
  startNode: 'living',
  floors: [
    { level: 1, name: 'Garden Level', area: 1120 },
    { level: 2, name: 'Suite Level', area: 680 },
  ],
  site: {
    setting: 'coastal',
    facade: 'stucco',
    storey: 3.9,
    plinth: 0.45,
    approach: [
      { x: -4.5, z: 21, label: 'Street' },
      { x: -2.6, z: 15.5, label: 'Garden path' },
      { x: -1.5, z: 10.5, label: 'Front garden' },
      { x: -1.5, z: 7.9, label: 'Front steps' },
    ],
  },
  nodes: [
    {
      id: 'living',
      name: 'Living Pavilion',
      pano: 'wooden_lounge',
      floor: 1,
      rect: { x: -5.6, z: -5.2, w: 11.2, d: 10.1 },
      height: 3.6,
      capture: { x: 0, z: 0 },
      heading: 0,
      view: -30,
      hotspots: [
        {
          yaw: 130,
          pitch: 32,
          label: 'Double-height volume',
          body: 'Exposed glulam frame with a clerestory band that pulls light deep into the plan.',
        },
      ],
    },
    {
      id: 'veranda',
      name: 'Veranda',
      kind: 'outdoor',
      pano: 'veranda',
      floor: 1,
      rect: { x: -6.0, z: -11.0, w: 7.0, d: 5.8 },
      capture: { x: -2.5, z: -8.2 },
      heading: 60,
      view: 0,
    },
    {
      id: 'courtyard',
      name: 'Garden Courtyard',
      kind: 'outdoor',
      pano: 'qwantani_patio',
      floor: 1,
      rect: { x: -7.0, z: -17.4, w: 8.0, d: 6.4 },
      capture: { x: -2.8, z: -14.2 },
      heading: 135,
      view: 45,
      hotspots: [
        {
          yaw: -78,
          pitch: -6,
          label: 'Outdoor kitchen',
          body: 'Covered pergola terrace with a built-in brick grill, looking out over the lawn to the water.',
        },
      ],
    },
    {
      id: 'pool',
      name: 'Indoor Pool',
      pano: 'indoor_pool',
      floor: 1,
      rect: { x: 5.6, z: -4.5, w: 11.3, d: 8.0 },
      height: 3.2,
      capture: { x: 8.6, z: -1.0 },
      heading: 180,
      view: 90,
      hotspots: [
        {
          yaw: -30,
          pitch: -12,
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
      rect: { x: 8.6, z: 3.5, w: 5.0, d: 3.4 },
      height: 2.7,
      capture: { x: 12.0, z: 5.2 },
      heading: 0,
      view: 270,
    },
    {
      id: 'terrace',
      name: 'Sunset Terrace',
      kind: 'outdoor',
      pano: 'sundowner_deck',
      floor: 1,
      rect: { x: 1.0, z: -12.0, w: 8.0, d: 6.8 },
      capture: { x: 4.2, z: -8.6 },
      heading: 10,
      view: 0,
      hotspots: [
        {
          yaw: 24,
          pitch: 2,
          label: 'Due-west aspect',
          body: 'Covered dining terrace with a retractable louvre roof and an outdoor kitchen behind.',
        },
      ],
    },
    {
      id: 'stairs',
      name: 'Stair Hall',
      kind: 'stair',
      floor: 1,
      rect: { x: -9.6, z: -1.0, w: 4.0, d: 5.9 },
    },
    {
      id: 'landing',
      name: 'Upper Landing',
      kind: 'stair',
      floor: 2,
      rect: { x: -9.6, z: -1.0, w: 4.0, d: 5.9 },
    },
    {
      id: 'suite',
      name: 'Seaview Suite',
      pano: 'relax_inn_seaview_suite',
      floor: 2,
      rect: { x: -5.6, z: -1.9, w: 5.9, d: 6.3 },
      height: 2.9,
      capture: { x: -2.8, z: 1.0 },
      heading: 150,
      view: 90,
    },
    {
      id: 'balcony',
      name: 'Ocean Balcony',
      kind: 'outdoor',
      pano: 'illovo_beach_balcony',
      floor: 2,
      rect: { x: 0.3, z: -1.9, w: 5.3, d: 6.3 },
      capture: { x: 2.8, z: 1.0 },
      heading: 70,
      view: 90,
    },
  ],
  doors: [
    { a: 'living', b: 'outside', x: -1.5, z: 4.9, width: 1.2, style: 'entrance' },
    { a: 'living', b: 'veranda', x: -2.5, z: -5.2, width: 2.0, style: 'glass' },
    { a: 'veranda', b: 'courtyard', x: -2.8, z: -11.0, width: 3.0, style: 'open' },
    { a: 'living', b: 'terrace', x: 3.4, z: -5.2, width: 2.0, style: 'glass' },
    { a: 'living', b: 'pool', x: 5.6, z: -1.0, width: 1.2 },
    { a: 'pool', b: 'spa', x: 12.6, z: 3.5, width: 0.9 },
    { a: 'living', b: 'stairs', x: -5.6, z: 3.2, width: 1.2, style: 'arch', height: 2.4 },
    { a: 'landing', b: 'suite', x: -5.6, z: 2.95 },
    { a: 'suite', b: 'balcony', x: 0.3, z: 1.0, width: 1.8, style: 'glass' },
  ],
  stairs: [
    { from: 'stairs', to: 'landing', run: { x: -9.6, z: -0.1, w: 1.2, d: 4.2 }, ascent: 's' },
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
  site: {
    setting: 'desert',
    facade: 'stone',
    storey: 3.4,
    plinth: 0.3,
    approach: [
      { x: -3, z: 20, label: 'Street' },
      { x: -1.5, z: 14, label: 'Motor court' },
      { x: 0, z: 8.5, label: 'Entry court' },
      { x: 0, z: 5.4, label: 'Front steps' },
    ],
  },
  nodes: [
    {
      id: 'library',
      name: 'Library',
      pano: 'reading_room',
      floor: 1,
      rect: { x: -2.0, z: -7.2, w: 4.4, d: 10.2 },
      height: 3.3,
      capture: { x: 0, z: 0 },
      heading: 60,
      view: 0,
      hotspots: [
        {
          yaw: 152,
          pitch: -12,
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
      rect: { x: 2.4, z: -7.2, w: 8.4, d: 6.8 },
      height: 3.0,
      capture: { x: 9.4, z: -1.6 },
      heading: 180,
      view: 90,
    },
    {
      id: 'guest',
      name: 'Guest Suite',
      pano: 'hotel_room',
      floor: 1,
      rect: { x: -6.8, z: -4.6, w: 4.8, d: 6.8 },
      height: 2.9,
      capture: { x: -4.4, z: -1.2 },
      heading: 0,
      view: 270,
    },
    {
      id: 'club',
      name: 'Club Room',
      pano: 'country_club',
      floor: 1,
      rect: { x: -9.8, z: -16.9, w: 15.0, d: 9.7 },
      height: 4.5,
      capture: { x: -0.8, z: -10.9 },
      heading: 45,
      view: 0,
      hotspots: [
        {
          yaw: 40,
          pitch: -2,
          label: 'Resident amenity',
          body: 'Private club level with a chef kitchen, screening room and a 14-seat dining table.',
        },
      ],
    },
    {
      id: 'stairs',
      name: 'Stair Hall',
      kind: 'stair',
      floor: 1,
      rect: { x: 2.4, z: -0.4, w: 4.0, d: 5.8 },
    },
    {
      id: 'landing',
      name: 'Roof Landing',
      kind: 'stair',
      floor: 2,
      rect: { x: 2.4, z: -0.4, w: 4.0, d: 5.8 },
    },
    {
      id: 'skyline',
      name: 'Skyline Balcony',
      kind: 'outdoor',
      pano: 'hotel_rooftop_balcony',
      floor: 2,
      rect: { x: 2.4, z: -7.2, w: 8.4, d: 6.8 },
      capture: { x: 4.8, z: -3.9 },
      heading: -5,
      view: 0,
    },
    {
      id: 'rooftop',
      name: 'Rooftop Terrace',
      kind: 'outdoor',
      pano: 'homecoming_center_rooftop',
      floor: 2,
      rect: { x: -6.8, z: -4.6, w: 9.2, d: 6.8 },
      capture: { x: -2.2, z: -1.2 },
      heading: 0,
      view: 180,
    },
  ],
  doors: [
    { a: 'library', b: 'outside', x: 0, z: 3.0, width: 1.2, style: 'entrance' },
    { a: 'library', b: 'guest', x: -2.0, z: 0.8, width: 1.1 },
    { a: 'library', b: 'lounge', x: 2.4, z: -3.0, width: 1.4 },
    { a: 'library', b: 'club', x: 0.2, z: -7.2, width: 1.4, height: 2.5 },
    { a: 'library', b: 'stairs', x: 2.4, z: 1.5, width: 1.1, style: 'arch', height: 2.4 },
    { a: 'landing', b: 'skyline', x: 4.4, z: -0.4, width: 1.6, style: 'glass' },
    { a: 'skyline', b: 'rooftop', x: 2.4, z: -2.5, width: 2.4, style: 'open' },
  ],
  stairs: [
    { from: 'stairs', to: 'landing', run: { x: 5.2, z: 0.4, w: 1.2, d: 3.8 }, ascent: 'n' },
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

export const fallbackTours = [telluride, coastal, penthouse];

export function getTour(slug: string, index = 0): PropertyTour {
  return toursBySlug[slug] ?? fallbackTours[index % fallbackTours.length];
}
