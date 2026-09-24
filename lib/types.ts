export type Currency = 'USD' | 'EUR' | 'CAD' | 'SEK' | 'GBP' | 'AED' | 'CHF';

export type ListingStatus = 'Active' | 'Pending' | 'Auction' | 'New' | 'Sold';

/** Which engine renders a property's immersive media. */
export type TourProvider = 'panorama' | 'matterport' | 'streetview' | 'video';

export interface TourHotspot {
  /** Destination node id for `nav` hotspots. */
  to?: string;
  kind: 'nav' | 'info';
  /** Yaw in degrees, 0 = forward, positive = clockwise from above. */
  yaw: number;
  /** Pitch in degrees, negative = downward. */
  pitch: number;
  label: string;
  body?: string;
  /**
   * Metres walked to reach the destination. Optional: by default a floor-level
   * nav hotspot is taken to mark the spot you step to, so the distance follows
   * from its pitch and the eye height.
   */
  distance?: number;
}

/**
 * The rough shape of the space a panorama was captured in. The walk engine
 * projects each panorama onto this proxy (a floor, a ceiling and a round wall)
 * so the camera can physically move through the room instead of cutting
 * between fixed viewpoints.
 */
export interface TourRoom {
  /** Distance from the capture point to the walls, in metres. */
  radius?: number;
  /** Floor-to-ceiling height, in metres. Ignored outdoors. */
  ceiling?: number;
  /** Open to the sky: no ceiling, and walls far enough to read as horizon. */
  outdoor?: boolean;
}

export interface TourNode {
  id: string;
  name: string;
  /** Basename in /public/panoramas — `<pano>.jpg` and `<pano>-preview.jpg`. */
  pano: string;
  /**
   * Optional equirectangular 360° video (mp4/webm) that plays in place of the
   * still. The still stays the poster and the fallback when video can't play.
   */
  video?: string;
  floor: number;
  /** Normalised 0-1 position on the floor plan, used by the minimap. */
  plan: { x: number; y: number };
  /** Yaw the camera faces when the node is entered, in degrees. */
  entryYaw: number;
  room?: TourRoom;
  hotspots: TourHotspot[];
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
  nodes: TourNode[];
  floors: TourFloor[];
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
