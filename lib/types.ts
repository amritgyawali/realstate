export type Currency = 'NPR' | 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export type ListingStatus = 'Active' | 'Pending' | 'Auction' | 'New' | 'Sold';

/** Which engine renders a property's immersive media. */
export type TourProvider = 'panorama' | 'matterport' | 'streetview' | 'video';

/** An information marker placed in a panorama, in the photo's own yaw/pitch. */
export interface TourHotspot {
  /** Yaw in degrees in panorama space: 0 = the photo's forward, positive = clockwise. */
  yaw: number;
  /** Pitch in degrees, negative = downward. */
  pitch: number;
  label: string;
  body?: string;
}

/** Axis-aligned plan rectangle in metres: x runs east, z runs south (down the plan). */
export interface TourRect {
  x: number;
  z: number;
  w: number;
  d: number;
}

/**
 * - `room` — an enclosed space; its panorama is projected onto a box of `rect` x `height`.
 * - `outdoor` — a deck, terrace or trail; its panorama is projected onto a far dome.
 * - `stair` — a modelled stair hall with no photograph (see `TourStair`).
 */
export type TourSpaceKind = 'room' | 'outdoor' | 'stair';

/**
 * One space in the house. Rooms and outdoor spaces carry a captured 360°
 * panorama; the engine projects it from `capture` onto the space's geometry, so
 * the camera can physically walk through the room instead of cutting between
 * photographs.
 */
export interface TourNode {
  id: string;
  name: string;
  kind?: TourSpaceKind;
  /** Basename in /public/panoramas — `<pano>.jpg` and `<pano>-preview.jpg`. Absent on stair halls. */
  pano?: string;
  floor: number;
  /** Footprint on the plan, in metres. */
  rect: TourRect;
  /** Ceiling height in metres. Defaults to 3. */
  height?: number;
  /** Where the panorama was shot, in plan metres. Defaults to the centre of `rect`. */
  capture?: { x: number; z: number };
  /**
   * World heading, in degrees, that the photo's yaw 0 points at once placed in the
   * house (0 = north / -z, 90 = east). Chosen so the photo's walls and doorways
   * line up with the plan.
   */
  heading?: number;
  /** World yaw to face when a walk ends at this space's capture point. */
  view?: number;
  hotspots?: TourHotspot[];
}

/**
 * An opening between two spaces. Doors are the single source of truth for the
 * walk graph: the engine, floor plan, dollhouse and minimap all derive their
 * routes from them. `b: 'outside'` is the front door to the grounds.
 */
export interface TourDoor {
  a: string;
  b: string;
  /** Centre of the opening on the shared wall, in plan metres. */
  x: number;
  z: number;
  width?: number;
  height?: number;
  /** `entrance` swings open as a visitor approaches; `open` has no frame at all. */
  style?: 'door' | 'arch' | 'glass' | 'entrance' | 'open';
}

/** A straight flight between a stair hall on one level and its landing above. */
export interface TourStair {
  /** The stair-hall space the flight starts in. */
  from: string;
  /** The landing space it arrives in, one level up. */
  to: string;
  /** Footprint of the flight itself. */
  run: TourRect;
  /** Compass direction of travel going up. */
  ascent: 'n' | 's' | 'e' | 'w';
}

export interface TourSite {
  /**
   * Landscape and sky treatment around the house. `himalayan` is green foothills
   * under a snow-capped range; `tropical` is palms and paddy with no sea.
   */
  setting: 'alpine' | 'coastal' | 'desert' | 'himalayan' | 'tropical';
  /** Adds a shoreline and open water around the grounds (a lake or a river bank). */
  waterside?: boolean;
  /** Facade treatment for the modelled exterior. */
  facade: 'timber' | 'stucco' | 'stone';
  /** Floor-to-floor height in metres. */
  storey: number;
  /** Height of the ground floor above the garden, in metres. */
  plinth: number;
  /** Street-to-porch route, walked step by step before the front door. */
  approach: { x: number; z: number; label?: string }[];
}

export interface TourFloor {
  level: number;
  name: string;
  area: number;
}

export interface PropertyTour {
  provider: TourProvider;
  /** Matterport model id, when provider is 'matterport'. */
  modelId?: string;
  /** Street View panorama id or `lat,lng`, when provider is 'streetview'. */
  streetViewId?: string;
  videoUrl?: string;
  title: string;
  capturedBy: string;
  scanDate: string;
  /** Every space in the house. Rooms with a `pano` are the capture points. */
  nodes: TourNode[];
  doors: TourDoor[];
  stairs: TourStair[];
  site: TourSite;
  floors: TourFloor[];
  /** The space the front door opens into. */
  startNode: string;
}

export interface Agent {
  slug: string;
  name: string;
  firm: string;
  location: string;
  image: string;
  regents: boolean;
  phone: string;
  email: string;
  address: string[];
  languages: string[];
  title: string;
  bio: string;
}

export interface Property {
  slug: string;
  title: string;
  city: string;
  region: string;
  country: string;
  price: number;
  currency: Currency;
  beds: number;
  baths: number;
  fullBaths: number;
  sqft: number;
  lotAcres: number;
  year: number;
  type: string;
  status: ListingStatus;
  agency: string;
  agentSlug: string;
  regents: boolean;
  hasVideo: boolean;
  hasTour: boolean;
  image: string;
  gallery: string[];
  tags: string[];
  description: string;
  headline: string;
  amenities: string[];
  appliances: string;
  generalFeatures: string;
  county: string;
  sourceId: string;
  lreId: number;
  lat: number;
  lng: number;
  listedOn: string;
  tour?: PropertyTour;
  /** Attribution for photographs that are not CC0, shown under the gallery. */
  credits?: PhotoCredit[];
}

export interface PhotoCredit {
  /** Published path of the photograph this credit covers. */
  image: string;
  author: string;
  license: string;
  licenseUrl: string;
  /** Where the original was published. */
  source: string;
}

export interface Destination {
  slug: string;
  name: string;
  description: string;
  image: string;
  region: string;
  listingCount: number;
}

export interface PressRelease {
  slug: string;
  title: string;
  date: string;
  source: string;
  dateline: string;
  body: string;
  image: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
}

export interface Milestone {
  year: string;
  title: string;
  text: string;
}
