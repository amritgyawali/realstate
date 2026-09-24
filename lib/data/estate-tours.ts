import type { PropertyTour, TourHotspot, TourNode, TourRoom } from '@/lib/types';
import { propertyBySlug } from '@/lib/data/properties';

/**
 * Walkthroughs for the rest of the tour-enabled listings.
 *
 * Every room is a CC0 capture from Poly Haven (see public/panoramas), grouped
 * into houses by style so a walk reads as one home. Nav hotspots are aimed at
 * the doorway, arch, stair or path visible in each capture, and every link is
 * declared from both ends — the hotspot back is what sets the direction you
 * face on arrival. Titles, agencies, dates, floor areas and the appliance notes
 * come from the listing records themselves; nothing here is invented copy.
 */

interface RoomSpec {
  id: string;
  name: string;
  pano: string;
  floor?: number;
  plan: [number, number];
  entryYaw: number;
  room?: TourRoom;
  /** Neighbour id → [yaw, pitch] of the doorway that leads there. */
  links: Record<string, [number, number]>;
  info?: TourHotspot[];
}

interface HouseSpec {
  start: string;
  levels?: string[];
  rooms: RoomSpec[];
}

const OUTDOOR: TourRoom = { outdoor: true };

/** Builds a tour from a compact room list, labelling nav hotspots from the rooms they lead to. */
function house(slug: string, spec: HouseSpec): [string, PropertyTour] {
  const listing = propertyBySlug.get(slug);
  if (!listing) throw new Error(`No listing for tour ${slug}`);
  const levels = spec.levels ?? ['Main Level'];
  const byId = new Map(spec.rooms.map((room) => [room.id, room]));

  const nodes: TourNode[] = spec.rooms.map((room) => {
    const floor = room.floor ?? 1;
    const nav: TourHotspot[] = Object.entries(room.links).map(([to, [yaw, pitch]]) => {
      const target = byId.get(to);
      if (!target) throw new Error(`${slug}: ${room.id} links to unknown room ${to}`);
      const targetFloor = target.floor ?? 1;
      const prefix = targetFloor > floor ? 'Upstairs — ' : targetFloor < floor ? 'Downstairs — ' : '';
      return { kind: 'nav', to, yaw, pitch, label: `${prefix}${target.name}` };
    });
    return {
      id: room.id,
      name: room.name,
      pano: room.pano,
      floor,
      plan: { x: room.plan[0], y: room.plan[1] },
      entryYaw: room.entryYaw,
      room: room.room,
      hotspots: [...nav, ...(room.info ?? [])],
    };
  });

  const perLevel = Math.round(listing.sqft / levels.length / 10) * 10;
  return [
    slug,
    {
      provider: 'panorama',
      title: listing.title,
      capturedBy: listing.agency,
      scanDate: listing.listedOn,
      startNode: spec.start,
      floors: levels.map((name, index) => ({ level: index + 1, name, area: perLevel })),
      nodes,
    },
  ];
}

/** The listing's own appliance line, pinned to the kitchen. */
function appliances(slug: string, yaw: number, pitch: number): TourHotspot {
  return {
    kind: 'info',
    yaw,
    pitch,
    label: 'Appliances',
    body: propertyBySlug.get(slug)?.appliances ?? '',
  };
}

export const estateTours: [string, PropertyTour][] = [
  house('3754-patuxent-river-rd-davidsonville', {
    start: 'garden',
    rooms: [
      {
        id: 'garden', name: 'Front Garden', pano: 'ladybrand_heritage_house',
        plan: [0.18, 0.8], entryYaw: -111, room: OUTDOOR,
        links: { hall: [-111, -8] },
      },
      {
        id: 'hall', name: 'Entrance Hall', pano: 'large_corridor',
        plan: [0.36, 0.55], entryYaw: 127, room: { radius: 5, ceiling: 4 },
        links: { garden: [-57, -10], music: [127, -12] },
      },
      {
        id: 'music', name: 'Music Room', pano: 'ballroom',
        plan: [0.6, 0.45], entryYaw: -108, room: { radius: 7, ceiling: 4.5 },
        links: { hall: [-108, -10], drawing: [69, -12] },
      },
      {
        id: 'drawing', name: 'Drawing Room', pano: 'combination_room',
        plan: [0.84, 0.3], entryYaw: -60, room: { radius: 5, ceiling: 3.6 },
        links: { music: [129, -10] },
      },
    ],
  }),

  house('57-farewell-street-newport', {
    start: 'living',
    rooms: [
      {
        id: 'living', name: 'Living & Kitchen', pano: 'brown_photostudio_04',
        plan: [0.45, 0.45], entryYaw: -70, room: { radius: 6, ceiling: 3 },
        links: { bedroom: [120, -12], beach: [-70, -8] },
        info: [appliances('57-farewell-street-newport', 57, -5)],
      },
      {
        id: 'bedroom', name: 'Loft Bedroom', pano: 'brown_photostudio_02',
        plan: [0.2, 0.3], entryYaw: -55, room: { radius: 5, ceiling: 3.4 },
        links: { living: [165, -12] },
      },
      {
        id: 'beach', name: 'Beachfront', pano: 'umhlanga_sunrise',
        plan: [0.8, 0.75], entryYaw: -56, room: OUTDOOR,
        links: { living: [170, -10] },
      },
    ],
  }),

  house('508-e-lionshead-circle-unit-502-vail', {
    start: 'hall',
    levels: ['Main Level', 'Loft Level'],
    rooms: [
      {
        id: 'hall', name: 'Great Hall', pano: 'warm_restaurant',
        plan: [0.45, 0.55], entryYaw: -90, room: { radius: 8, ceiling: 5 },
        links: { bar: [175, -8], games: [15, -8] },
      },
      {
        id: 'bar', name: 'Hearth Bar', pano: 'warm_bar',
        plan: [0.18, 0.45], entryYaw: -40, room: { radius: 7, ceiling: 5 },
        links: { hall: [168, -10], loft: [-120, 5] },
      },
      {
        id: 'games', name: 'Games Room', pano: 'billiard_hall',
        plan: [0.78, 0.5], entryYaw: 10, room: { radius: 6, ceiling: 3 },
        links: { hall: [-60, -12] },
      },
      {
        id: 'loft', name: 'Loft Lounge', pano: 'pine_attic', floor: 2,
        plan: [0.3, 0.32], entryYaw: -90, room: { radius: 6, ceiling: 3 },
        links: { bar: [103, -14] },
      },
    ],
  }),

  house('4278-moosehollow-road-park-city', {
    start: 'living',
    rooms: [
      {
        id: 'living', name: 'Kitchen & Living', pano: 'kiara_interior',
        plan: [0.4, 0.55], entryYaw: -123, room: { radius: 4.5, ceiling: 3 },
        links: { terrace: [-123, -10], bunk: [163, -12] },
        info: [appliances('4278-moosehollow-road-park-city', 28, -3)],
      },
      {
        id: 'bunk', name: 'Bunk Room', pano: 'cabin',
        plan: [0.18, 0.38], entryYaw: -30, room: { radius: 3, ceiling: 2.4 },
        links: { living: [-140, -10] },
      },
      {
        id: 'terrace', name: 'Mountain Terrace', pano: 'kiara_5_noon',
        plan: [0.65, 0.62], entryYaw: -90, room: OUTDOOR,
        links: { living: [175, -10], lookout: [-40, -10] },
      },
      {
        id: 'lookout', name: 'Thatched Lookout', pano: 'lookout',
        plan: [0.86, 0.35], entryYaw: 160, room: { radius: 5, ceiling: 3 },
        links: { terrace: [65, -10] },
      },
    ],
  }),

  house('114-alpine-court-crested-butte', {
    start: 'kitchen',
    rooms: [
      {
        id: 'kitchen', name: 'Country Kitchen', pano: 'studio_country_hall',
        plan: [0.4, 0.45], entryYaw: -80, room: { radius: 5, ceiling: 3.2 },
        links: { terrace: [20, -10], bath: [-117, -12] },
        info: [appliances('114-alpine-court-crested-butte', -87, -6)],
      },
      {
        id: 'bath', name: 'Bathroom', pano: 'bathroom',
        plan: [0.18, 0.32], entryYaw: -120, room: { radius: 2.8, ceiling: 2.6 },
        links: { kitchen: [-2, -12] },
      },
      {
        id: 'terrace', name: 'Garden Terrace', pano: 'lythwood_terrace',
        plan: [0.62, 0.66], entryYaw: -93, room: OUTDOOR,
        links: { kitchen: [-93, -8], pond: [150, -10] },
      },
      {
        id: 'pond', name: 'Water Garden', pano: 'pond',
        plan: [0.86, 0.78], entryYaw: -60, room: { outdoor: true, radius: 6 },
        links: { terrace: [130, -12] },
      },
    ],
  }),

  house('15-via-montagna-rancho-mirage', {
    start: 'garden',
    rooms: [
      {
        id: 'garden', name: 'Garden Courtyard', pano: 'residential_garden',
        plan: [0.5, 0.85], entryYaw: -109, room: OUTDOOR,
        links: { living: [175, -8], study: [-20, -8] },
      },
      {
        id: 'living', name: 'Living Room', pano: 'small_empty_room_1',
        plan: [0.24, 0.45], entryYaw: -126, room: { radius: 3.5, ceiling: 2.7 },
        links: { garden: [-126, -10], primary: [99, -12] },
      },
      {
        id: 'primary', name: 'Primary Bedroom', pano: 'small_empty_room_2',
        plan: [0.44, 0.28], entryYaw: -120, room: { radius: 3.5, ceiling: 2.7 },
        links: { living: [140, -12], second: [158, -12] },
      },
      {
        id: 'second', name: 'Second Bedroom', pano: 'small_empty_room_3',
        plan: [0.64, 0.28], entryYaw: -110, room: { radius: 3.5, ceiling: 2.7 },
        links: { primary: [92, -12], study: [110, -12] },
      },
      {
        id: 'study', name: 'Study', pano: 'small_empty_room_4',
        plan: [0.8, 0.5], entryYaw: -124, room: { radius: 3.5, ceiling: 2.7 },
        links: { second: [146, -12], garden: [-124, -10] },
      },
    ],
  }),

  house('3-king-edward-court-rancho-mirage', {
    start: 'lounge',
    rooms: [
      {
        id: 'lounge', name: 'Sitting Room', pano: 'anniversary_lounge',
        plan: [0.3, 0.45], entryYaw: -30, room: { radius: 4.5, ceiling: 2.8 },
        links: { kitchen: [108, -12], lawn: [68, -12] },
      },
      {
        id: 'kitchen', name: 'Kitchen', pano: 'blinds',
        plan: [0.55, 0.32], entryYaw: -90, room: { radius: 3.5, ceiling: 2.7 },
        links: { lounge: [67, -12], nook: [105, -12] },
        info: [appliances('3-king-edward-court-rancho-mirage', -61, -8)],
      },
      {
        id: 'nook', name: 'Garden Nook', pano: 'garden_nook',
        plan: [0.8, 0.6], entryYaw: 20, room: OUTDOOR,
        links: { kitchen: [-143, -8], lawn: [20, -10] },
      },
      {
        id: 'lawn', name: 'Back Lawn', pano: 'suburban_garden',
        plan: [0.45, 0.8], entryYaw: -60, room: OUTDOOR,
        links: { lounge: [-30, -8], nook: [160, -10] },
      },
    ],
  }),

  house('10610-s-nandina-court-jenks', {
    start: 'court',
    rooms: [
      {
        id: 'court', name: 'Motor Court', pano: 'twilight_sunset',
        plan: [0.22, 0.75], entryYaw: -160, room: OUTDOOR,
        links: { living: [-160, -8] },
      },
      {
        id: 'living', name: 'Living Room', pano: 'small_empty_house',
        plan: [0.46, 0.45], entryYaw: -84, room: { radius: 4, ceiling: 2.7 },
        links: { court: [-84, -10], family: [164, -12] },
      },
      {
        id: 'family', name: 'Family Room', pano: 'lebombo',
        plan: [0.72, 0.35], entryYaw: -60, room: { radius: 4.5, ceiling: 2.8 },
        links: { living: [-147, -12] },
      },
    ],
  }),

  house('3362-cape-horn-road-south-lake-tahoe', {
    start: 'lodge',
    rooms: [
      {
        id: 'lodge', name: 'Lodge Approach', pano: 'wooden_motel',
        plan: [0.3, 0.66], entryYaw: -150, room: OUTDOOR,
        links: { pavilion: [-150, -8], deck: [-62, -10] },
      },
      {
        id: 'pavilion', name: 'Entertaining Pavilion', pano: 'boma',
        plan: [0.14, 0.34], entryYaw: -56, room: { radius: 8, ceiling: 4 },
        links: { lodge: [-56, -10] },
      },
      {
        id: 'deck', name: 'Lake View Deck', pano: 'cayley_lookout',
        plan: [0.6, 0.5], entryYaw: -35, room: OUTDOOR,
        links: { lodge: [165, -10], hilltop: [-150, -10] },
      },
      {
        id: 'hilltop', name: 'Hilltop Overlook', pano: 'qwantani',
        plan: [0.86, 0.3], entryYaw: -80, room: OUTDOOR,
        links: { deck: [150, -12] },
      },
    ],
  }),

  house('51-anglers-way-edwards', {
    start: 'games',
    rooms: [
      {
        id: 'games', name: 'Games Room', pano: 'empty_play_room',
        plan: [0.2, 0.4], entryYaw: -63, room: { radius: 7, ceiling: 3 },
        links: { pool: [-63, -10] },
      },
      {
        id: 'pool', name: 'Pool Garden', pano: 'pool',
        plan: [0.45, 0.56], entryYaw: -12, room: OUTDOOR,
        links: { games: [65, -8], lapa: [-12, -10] },
      },
      {
        id: 'lapa', name: 'Thatched Lapa', pano: 'lapa',
        plan: [0.66, 0.4], entryYaw: -140, room: { radius: 6, ceiling: 3.2 },
        links: { pool: [-140, -12], overlook: [165, -12] },
      },
      {
        id: 'overlook', name: 'Ocean Overlook', pano: 'sundowner_overlook',
        plan: [0.88, 0.7], entryYaw: 164, room: OUTDOOR,
        links: { lapa: [24, -8] },
      },
    ],
  }),

  house('2474-montano-ct-erie', {
    start: 'drive',
    rooms: [
      {
        id: 'drive', name: 'Tree-lined Drive', pano: 'tree_lined_driveway',
        plan: [0.1, 0.8], entryYaw: 13, room: OUTDOOR,
        links: { entrance: [13, -8] },
      },
      {
        id: 'entrance', name: 'Front Entrance', pano: 'bloem_olive_house',
        plan: [0.34, 0.64], entryYaw: -91, room: OUTDOOR,
        links: { drive: [127, -10], dining: [-91, -8] },
      },
      {
        id: 'dining', name: 'Dining Salon', pano: 'christmas_photo_studio_05',
        plan: [0.56, 0.44], entryYaw: -90, room: { radius: 5, ceiling: 3.4 },
        links: { entrance: [-17, -12], kitchen: [105, -12] },
      },
      {
        id: 'kitchen', name: 'Kitchen & Breakfast Room', pano: 'christmas_photo_studio_07',
        plan: [0.8, 0.32], entryYaw: 150, room: { radius: 5, ceiling: 3.2 },
        links: { dining: [-89, -12] },
        info: [appliances('2474-montano-ct-erie', 116, -8)],
      },
    ],
  }),

  house('1569-pembroke-st-victoria', {
    start: 'salon',
    rooms: [
      {
        id: 'salon', name: 'Garden Salon', pano: 'photo_studio_london_hall',
        plan: [0.45, 0.5], entryYaw: -60, room: { radius: 5, ceiling: 3.6 },
        links: { study: [97, -12], garden: [-163, -10] },
      },
      {
        id: 'study', name: 'Library Study', pano: 'photo_studio_loft_hall',
        plan: [0.2, 0.38], entryYaw: -60, room: { radius: 5, ceiling: 3.6 },
        links: { salon: [57, -12] },
      },
      {
        id: 'garden', name: 'Conservatory Garden', pano: 'roof_garden',
        plan: [0.76, 0.45], entryYaw: -91, room: OUTDOOR,
        links: { salon: [-91, -8] },
      },
    ],
  }),

  house('6067-woody-creek-road', {
    start: 'walk',
    rooms: [
      {
        id: 'walk', name: 'Garden Walkway', pano: 'glass_passage',
        plan: [0.2, 0.75], entryYaw: 176, room: { radius: 4, ceiling: 2.8 },
        links: { salon: [176, -8] },
      },
      {
        id: 'salon', name: 'Grand Salon', pano: 'brown_photostudio_03',
        plan: [0.45, 0.5], entryYaw: -91, room: { radius: 7, ceiling: 3.2 },
        links: { walk: [-91, -10], morning: [88, -12], dressing: [150, -12] },
      },
      {
        id: 'morning', name: 'Morning Room', pano: 'brown_photostudio_05',
        plan: [0.72, 0.3], entryYaw: -80, room: { radius: 6, ceiling: 3.2 },
        links: { salon: [97, -12] },
      },
      {
        id: 'dressing', name: 'Dressing Salon', pano: 'brown_photostudio_06',
        plan: [0.76, 0.66], entryYaw: -75, room: { radius: 6, ceiling: 3.2 },
        links: { salon: [80, -12] },
      },
    ],
  }),

  house('601-foothill-road-ojai', {
    start: 'courtyard',
    rooms: [
      {
        id: 'courtyard', name: 'Covered Courtyard', pano: 'courtyard',
        plan: [0.24, 0.7], entryYaw: -120, room: { radius: 7, ceiling: 3 },
        links: { office: [-60, -10] },
      },
      {
        id: 'office', name: 'Home Office', pano: 'poly_haven_studio',
        plan: [0.5, 0.45], entryYaw: -83, room: { radius: 5, ceiling: 3 },
        links: { courtyard: [43, -10], studio: [-83, -12] },
      },
      {
        id: 'studio', name: 'Wellness Studio', pano: 'yoga_room',
        plan: [0.78, 0.34], entryYaw: -60, room: { radius: 6, ceiling: 3.6 },
        links: { office: [43, -12] },
      },
    ],
  }),

  house('3906-village-commons-walk-henrico', {
    start: 'forecourt',
    rooms: [
      {
        id: 'forecourt', name: 'Forecourt', pano: 'furstenstein',
        plan: [0.5, 0.86], entryYaw: -59, room: OUTDOOR,
        links: { hall: [-59, -6] },
      },
      {
        id: 'hall', name: 'Grand Hall', pano: 'vestibule',
        plan: [0.5, 0.5], entryYaw: 32, room: { radius: 9, ceiling: 6 },
        links: { forecourt: [-147, -10], salon: [32, -12], stair: [120, -12] },
      },
      {
        id: 'salon', name: 'Painted Salon', pano: 'old_room',
        plan: [0.8, 0.34], entryYaw: -60, room: { radius: 7, ceiling: 4.5 },
        links: { hall: [129, -12] },
      },
      {
        id: 'stair', name: 'Stair Hall', pano: 'church_stairway',
        plan: [0.2, 0.34], entryYaw: 65, room: { radius: 3.5, ceiling: 5 },
        links: { hall: [-160, -14] },
      },
    ],
  }),

  house('3059-panorama-drive-tahoe-city', {
    start: 'great',
    rooms: [
      {
        id: 'great', name: 'Thatched Great Room', pano: 'thatch_chapel',
        plan: [0.45, 0.5], entryYaw: -60, room: { radius: 7, ceiling: 5 },
        links: { deck: [29, -12], gazebo: [-149, -12] },
      },
      {
        id: 'deck', name: 'River Deck', pano: 'sabie_tent',
        plan: [0.76, 0.66], entryYaw: 150, room: { outdoor: true, radius: 8 },
        links: { great: [-57, -10] },
      },
      {
        id: 'gazebo', name: 'Forest Gazebo', pano: 'whipple_creek_gazebo',
        plan: [0.18, 0.3], entryYaw: 178, room: OUTDOOR,
        links: { great: [132, -10] },
      },
    ],
  }),

  house('18828-still-lake-drive-jupiter', {
    start: 'library',
    levels: ['Main Level', 'Roof Level'],
    rooms: [
      {
        id: 'library', name: 'Library Lounge', pano: 'christmas_photo_studio_01',
        plan: [0.4, 0.45], entryYaw: -60, room: { radius: 5, ceiling: 3.4 },
        links: { terrace: [52, 5], garden: [-172, -12] },
      },
      {
        id: 'terrace', name: 'Roof Terrace', pano: 'balcony', floor: 2,
        plan: [0.34, 0.3], entryYaw: -64, room: { outdoor: true, radius: 8 },
        links: { library: [-64, -10] },
      },
      {
        id: 'garden', name: 'Formal Garden', pano: 'symmetrical_garden',
        plan: [0.76, 0.7], entryYaw: -91, room: OUTDOOR,
        links: { library: [171, -10] },
      },
    ],
  }),
];
