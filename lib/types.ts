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
}

export interface TourNode {
  id: string;
  name: string;
  /** Basename in /public/panoramas — `<pano>.jpg` and `<pano>-preview.jpg`. */
  pano: string;
  floor: number;
  /** Normalised 0-1 position on the floor plan, used by the minimap. */
  plan: { x: number; y: number };
  /** Yaw the camera faces when the node is entered, in degrees. */
  entryYaw: number;
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
