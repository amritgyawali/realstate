import type { PropertyTour, TourSite } from '@/lib/types';

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
 * double doors really do open into the great room, the lodge's billiard-room
 * opening really does look back into the bar, and the squash court's door sits
 * in its back wall.
 *
 * There are four models — the ten-capture lakeside villa, a timber hill house,
 * a garden villa and a haveli — and each listing takes one of them, retitled
 * and set in its own landscape (`variant` below).
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
 * control and the timber hill houses gain a Matterport tab alongside the built-in
 * engine; leave it unset and the built-in engine is the only provider offered.
 */
export const MATTERPORT_MODEL_ID = process.env.NEXT_PUBLIC_MATTERPORT_MODEL_ID ?? '';

/**
 * Phewa Lakeside Villa — ten 360° captures of one lakeside estate, walked as a
 * single-level house. The lounge is the entrance; the dining hall opens north
 * onto the lake veranda, and the veranda steps down to the jetty and along the
 * shore. East of the lounge run the billiard room, the games room, the fireside
 * pavilion and a garden door up to the ridge lookout; west of the dining hall is
 * the squash court. All ten photographs were taken on the same property.
 *
 * Distances in each photo were read off its floor/wall line, so the rooms keep
 * their real proportions: the lounge is 9.5 x 12.6 m, the dining hall 17 x 11 m.
 */
const lakesideVilla: PropertyTour = {
  provider: 'panorama',
  title: 'Phewa Lakeside Villa',
  capturedBy: 'Phewa Lakeside Estates',
  scanDate: '2026-09-18',
  startNode: 'lounge',
  floors: [{ level: 1, name: 'Lake Level', area: 9350 }],
  site: {
    setting: 'himalayan',
    waterside: true,
    facade: 'stone',
    storey: 3.8,
    plinth: 0.45,
    approach: [
      { x: -2, z: 22, label: 'Lakeside road' },
      { x: -1, z: 15.5, label: 'Drive' },
      { x: 0.6, z: 10, label: 'Front garden' },
      { x: 0.6, z: 6.8, label: 'Front steps' },
    ],
  },
  nodes: [
    {
      id: 'lounge',
      name: 'Entrance Lounge & Bar',
      pano: 'warm_bar',
      floor: 1,
      rect: { x: -6, z: -9, w: 9.5, d: 12.6 },
      height: 3.4,
      capture: { x: 0, z: 0 },
      heading: 0,
      view: 0,
      hotspots: [
        {
          yaw: -20,
          pitch: -10,
          label: 'Stone-clad bar',
          body: 'A curved bar in dressed river stone with a timber top, cold room behind and seating for twelve.',
        },
        {
          yaw: 100,
          pitch: -8,
          label: 'Cast-iron fireplace',
          body: 'Free-standing firebox under a flue through the vaulted ceiling — the room\'s heat on winter evenings.',
        },
      ],
    },
    {
      id: 'dining',
      name: 'Dining Hall',
      pano: 'warm_restaurant',
      floor: 1,
      rect: { x: -23, z: -8, w: 17, d: 11 },
      height: 3.8,
      capture: { x: -15, z: -3 },
      heading: 90,
      view: 0,
      hotspots: [
        {
          yaw: -60,
          pitch: 0,
          label: 'Lake-facing French doors',
          body: 'Two pairs of French doors open straight onto the covered veranda and the water beyond.',
        },
        {
          yaw: 105,
          pitch: -5,
          label: 'Stone chimney breast',
          body: 'An open hearth in local sandstone anchors the east end of the hall under exposed pine trusses.',
        },
      ],
    },
    {
      id: 'veranda',
      name: 'Lake Veranda',
      kind: 'outdoor',
      pano: 'qwantani_patio',
      floor: 1,
      rect: { x: -16, z: -15, w: 10, d: 7 },
      capture: { x: -10.1, z: -10 },
      heading: 180,
      view: -45,
      hotspots: [
        {
          yaw: 130,
          pitch: 0,
          label: 'Lake frontage',
          body: 'The lawn runs down from the veranda to the shore, with the jetty a short walk to the north.',
        },
        {
          yaw: -60,
          pitch: -5,
          label: 'Wood-fired grill',
          body: 'A brick barbecue and chimney stand at the edge of the tiled terrace, under the shade of the olive trees.',
        },
      ],
    },
    {
      id: 'jetty',
      name: 'Private Jetty',
      kind: 'outdoor',
      pano: 'small_harbour_morning',
      floor: 1,
      rect: { x: -14, z: -25, w: 8, d: 10 },
      capture: { x: -10, z: -19 },
      heading: 60,
      view: 0,
      hotspots: [
        {
          yaw: -60,
          pitch: -2,
          label: 'Stone breakwater',
          body: 'A gabion breakwater shelters the mooring; boats and paddle craft launch from the slipway beside it.',
        },
      ],
    },
    {
      id: 'shore',
      name: 'Lakeshore Point',
      kind: 'outdoor',
      pano: 'lakeside',
      floor: 1,
      rect: { x: -24, z: -25, w: 10, d: 10 },
      capture: { x: -19, z: -20 },
      heading: -50,
      view: -30,
      hotspots: [
        {
          yaw: 20,
          pitch: -8,
          label: 'Swimming cove',
          body: 'Shelving rock and clear, shallow water on the sheltered side of the point.',
        },
      ],
    },
    {
      id: 'billiard',
      name: 'Billiard Room',
      pano: 'billiard_hall',
      floor: 1,
      rect: { x: 3.5, z: -12.3, w: 9.7, d: 9.9 },
      height: 3.4,
      capture: { x: 7.5, z: -6.3 },
      heading: 270,
      view: 180,
      hotspots: [
        {
          yaw: -80,
          pitch: -15,
          label: 'Two full-size tables',
          body: 'Slate-bed tables under brass pendant lights, with a cue rack and a garden door to the lawn.',
        },
      ],
    },
    {
      id: 'games',
      name: 'Games Room',
      pano: 'empty_play_room',
      floor: 1,
      rect: { x: 13.2, z: -13.5, w: 12.5, d: 15 },
      height: 3.8,
      capture: { x: 20.7, z: -6.5 },
      heading: 180,
      view: 90,
      hotspots: [
        {
          yaw: -45,
          pitch: -2,
          label: 'Garden doors',
          body: 'Glazed doors open east onto the garden and the path up to the ridge lookout.',
        },
        {
          yaw: 170,
          pitch: -12,
          label: 'Table tennis',
          body: 'Room for table tennis, a children\'s play corner and a long family table under the clerestory.',
        },
      ],
    },
    {
      id: 'pavilion',
      name: 'Fireside Pavilion',
      pano: 'boma',
      floor: 1,
      rect: { x: 9.5, z: 1.5, w: 13.5, d: 16 },
      height: 4.2,
      capture: { x: 16, z: 9.5 },
      heading: 0,
      view: 180,
      hotspots: [
        {
          yaw: 165,
          pitch: -5,
          label: 'Wood-fired oven',
          body: 'A brick oven and fireplace stand in the middle of the arcaded pavilion — built for festival cooking.',
        },
      ],
    },
    {
      id: 'ridge',
      name: 'Ridge Lookout',
      kind: 'outdoor',
      pano: 'qwantani_afternoon',
      floor: 1,
      rect: { x: 25.7, z: -8, w: 10, d: 12 },
      capture: { x: 30.7, z: -2 },
      heading: 75,
      view: 0,
      hotspots: [
        {
          yaw: -75,
          pitch: -2,
          label: 'Lake panorama',
          body: 'The whole lake opens up below the lookout, with the far shore and the hills beyond.',
        },
      ],
    },
    {
      id: 'squash',
      name: 'Squash Court',
      pano: 'squash_court',
      floor: 1,
      rect: { x: -32.75, z: -5.45, w: 9.75, d: 6.4 },
      height: 6,
      capture: { x: -27.25, z: -2.25 },
      heading: 10,
      view: 270,
      hotspots: [
        {
          yaw: 70,
          pitch: 20,
          label: 'Viewing gallery',
          body: 'A championship-size 9.75 x 6.4 m court with a sprung timber floor and a spectator gallery above the back wall.',
        },
      ],
    },
  ],
  doors: [
    { a: 'lounge', b: 'outside', x: 0.6, z: 3.6, width: 1.8, style: 'entrance' },
    { a: 'lounge', b: 'dining', x: -6, z: -1, width: 1.8, style: 'arch' },
    { a: 'lounge', b: 'billiard', x: 3.5, z: -4, width: 1.2 },
    { a: 'dining', b: 'veranda', x: -12.1, z: -8, width: 1.8, style: 'glass' },
    { a: 'dining', b: 'squash', x: -23, z: -3 },
    { a: 'veranda', b: 'jetty', x: -10, z: -15, width: 3, style: 'open' },
    { a: 'jetty', b: 'shore', x: -14, z: -20, width: 3, style: 'open' },
    { a: 'billiard', b: 'games', x: 13.2, z: -7.8 },
    { a: 'games', b: 'pavilion', x: 14.5, z: 1.5, width: 1.8, style: 'arch' },
    { a: 'games', b: 'ridge', x: 25.7, z: -1.5, width: 2, style: 'glass' },
  ],
  stairs: [],
};

/** Two-storey timber hill house: hall, great room, hearth, kitchen, deck and a suite upstairs. */
const timberHouse: PropertyTour = {
  provider: 'panorama',
  modelId: MATTERPORT_MODEL_ID,
  title: 'Timber Hill House',
  capturedBy: 'Himalayan Hills Realty',
  scanDate: '2026-08-29',
  startNode: 'entry',
  floors: [
    { level: 1, name: 'Main Level', area: 860 },
    { level: 2, name: 'Upper Level', area: 390 },
  ],
  site: {
    setting: 'himalayan',
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
          label: 'Boot room',
          body: 'Boot racks, a drying cupboard and a slate floor just inside the door — built for monsoon mud and trekking kit.',
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
          body: 'Double-glazed window wall framing the ridge line and the snow peaks beyond it.',
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
          label: 'Stone hearth',
          body: 'Dry-laid local stone around a sealed wood stove — the house\'s heat through the winter months.',
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
          label: 'Sun deck',
          body: 'South-facing timber deck with a gas fire table, plumbed for an outdoor kitchen.',
        },
      ],
    },
    {
      id: 'overlook',
      name: 'Waterfall Overlook',
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
          label: 'Waterfall trail',
          body: 'A footpath drops from the overlook to the stream and the falls below the house.',
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
          label: 'Mountain aspect',
          body: 'The bed wall faces due south; the glazing opposite frames the high peaks at first light.',
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
          body: 'Honed stone over underfloor heating, with a steam shower and a freestanding soaking tub.',
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

/** Garden villa: a double-height living pavilion, pool wing, terraces and a suite upstairs. */
const gardenVilla: PropertyTour = {
  provider: 'panorama',
  title: 'Garden Villa',
  capturedBy: 'Konkan Coast Properties',
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
          body: 'Covered pergola terrace with a built-in brick grill, looking out over the lawn and the garden.',
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
          label: 'Year-round pool',
          body: 'Dehumidified enclosure, 18 m pool, counter-current system and an adjoining sauna.',
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
      name: 'Principal Suite',
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
      name: 'Suite Balcony',
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

/** Haveli residence: library, baithak, durbar hall and guest suite, with a roof terrace above. */
const haveli: PropertyTour = {
  provider: 'panorama',
  title: 'Haveli Residence',
  capturedBy: 'Rajputana Heritage Homes',
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
      { x: -1.5, z: 14, label: 'Forecourt' },
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
          label: 'Library',
          body: 'Full-height teak shelving, arched French windows and a terrazzo floor laid in the original pattern.',
        },
      ],
    },
    {
      id: 'lounge',
      name: 'Baithak Lounge',
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
      name: 'Durbar Hall',
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
          label: 'Painted hall',
          body: 'Double-height reception hall with hand-painted walls and seating for a full family gathering.',
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
      name: 'Upper Terrace',
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

interface Variant {
  title: string;
  capturedBy: string;
  scanDate: string;
  setting?: TourSite['setting'];
  facade?: TourSite['facade'];
  waterside?: boolean;
}

/**
 * One of the four models, retitled for a listing and set in that listing's
 * landscape. The rooms and photographs stay the same; the ground, sky and
 * facade around them change.
 */
function variant(model: PropertyTour, v: Variant): PropertyTour {
  return {
    ...model,
    title: v.title,
    capturedBy: v.capturedBy,
    scanDate: v.scanDate,
    site: {
      ...model.site,
      setting: v.setting ?? model.site.setting,
      facade: v.facade ?? model.site.facade,
      waterside: v.waterside ?? model.site.waterside,
    },
  };
}

/** Tours keyed by property slug. Every listing with `hasTour` has an entry. */
export const toursBySlug: Record<string, PropertyTour> = {
  'phewa-lakeside-villa-pokhara': lakesideVilla,
  'nagarkot-ridge-house-bhaktapur': variant(timberHouse, {
    title: 'Nagarkot Ridge House',
    capturedBy: 'Himalayan Hills Realty',
    scanDate: '2026-09-02',
  }),
  'thapathana-stone-house-parbat': variant(timberHouse, {
    title: 'Thapathana Stone House',
    capturedBy: 'Phewa Lakeside Estates',
    scanDate: '2026-08-27',
    facade: 'stone',
  }),
  'birendranagar-garden-house-surkhet': variant(timberHouse, {
    title: 'Birendranagar Garden House',
    capturedBy: 'Karnali Homes',
    scanDate: '2026-09-09',
    facade: 'stucco',
  }),
  'muktinath-mountain-house-mustang': variant(timberHouse, {
    title: 'Muktinath Mountain House',
    capturedBy: 'Phewa Lakeside Estates',
    scanDate: '2026-08-21',
    facade: 'stone',
  }),
  'budhanilkantha-garden-villa-kathmandu': variant(gardenVilla, {
    title: 'Budhanilkantha Garden Villa',
    capturedBy: 'Himalayan Hills Realty',
    scanDate: '2026-09-14',
    setting: 'himalayan',
  }),
  'nerul-riverside-villa-goa': variant(gardenVilla, {
    title: 'Nerul Riverside Villa',
    capturedBy: 'Konkan Coast Properties',
    scanDate: '2026-09-05',
  }),
  'portuguese-village-home-goa': variant(gardenVilla, {
    title: 'Portuguese-Era Village Home',
    capturedBy: 'Konkan Coast Properties',
    scanDate: '2026-08-30',
    setting: 'tropical',
  }),
  'hamirpur-hill-house-himachal': variant(timberHouse, {
    title: 'Hamirpur Hill House',
    capturedBy: 'Dhauladhar Estates',
    scanDate: '2026-09-11',
    facade: 'stucco',
  }),
  'kareri-village-house-kangra': variant(timberHouse, {
    title: 'Kareri Village House',
    capturedBy: 'Dhauladhar Estates',
    scanDate: '2026-08-24',
  }),
  'shekhawati-haveli-jhunjhunu': variant(haveli, {
    title: 'Shekhawati Painted Haveli',
    capturedBy: 'Rajputana Heritage Homes',
    scanDate: '2026-09-07',
  }),
  'thalavadi-farmhouse-erode': variant(gardenVilla, {
    title: 'Thalavadi Farmhouse',
    capturedBy: 'Nilgiri Country Homes',
    scanDate: '2026-09-16',
    setting: 'tropical',
  }),
};

export const fallbackTours = [lakesideVilla, timberHouse, gardenVilla, haveli];

export function getTour(slug: string, index = 0): PropertyTour {
  return toursBySlug[slug] ?? fallbackTours[index % fallbackTours.length];
}
