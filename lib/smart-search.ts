import type { Currency, Property } from '@/lib/types';
import { convert } from '@/lib/format';

/**
 * Structured filter state. Every listing surface (Homes For Sale, 3D/360 Tours,
 * the hero console, the command palette) narrows the same corpus through this
 * one shape, so a query typed anywhere means the same thing everywhere.
 */
export interface SearchQuery {
  text: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  minAcres?: number;
  country?: string;
  region?: string;
  city?: string;
  type?: string;
  status?: string;
  tags: string[];
  requireTour: boolean;
  requireVideo: boolean;
  requireRegents: boolean;
  requireOpenHouse: boolean;
}

export const EMPTY_QUERY: SearchQuery = {
  text: '',
  tags: [],
  requireTour: false,
  requireVideo: false,
  requireRegents: false,
  requireOpenHouse: false,
};

const MULTIPLIERS: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

/**
 * Order matters: multi-word phrases are tested first so "skyline view" is claimed
 * whole rather than leaving a stray "view" behind for the keyword pass.
 */
const TAG_SYNONYMS: Record<string, string> = {
  'mountain view': 'Mountain View',
  'river view': 'River View',
  'country home': 'Country Home',
  'heritage home': 'Historic',
  lakefront: 'Lake',
  lakeside: 'Lake',
  lake: 'Lake',
  waterfront: 'Waterfront',
  riverside: 'River View',
  river: 'River View',
  beach: 'Waterfront',
  himalaya: 'Mountain View',
  himalayan: 'Mountain View',
  himalayas: 'Mountain View',
  mountain: 'Mountain View',
  mountains: 'Mountain View',
  hills: 'Mountain View',
  heritage: 'Historic',
  historic: 'Historic',
  traditional: 'Historic',
  desert: 'Desert',
  tropical: 'Tropical',
  palms: 'Tropical',
  city: 'In-City',
  suburban: 'Suburban Home',
  countryside: 'Country Home',
  village: 'Country Home',
};

const TYPE_SYNONYMS: Record<string, string> = {
  villa: 'Villa',
  villas: 'Villa',
  bungalow: 'Villa',
  haveli: 'Haveli',
  havelis: 'Haveli',
  farmhouse: 'Farmhouse',
  farm: 'Farmhouse',
  house: 'Single Family',
  houses: 'Single Family',
};

/**
 * People type the province, state or district; listings store the province or
 * state in `region`. Resolving here means "in Goa" narrows to Goa instead of
 * falling through to a keyword search.
 */
const REGIONS: Record<string, { region: string; country: string; city?: string }> = {
  gandaki: { region: 'Gandaki', country: 'Nepal' },
  pokhara: { region: 'Gandaki', country: 'Nepal', city: 'Pokhara' },
  kaski: { region: 'Gandaki', country: 'Nepal' },
  mustang: { region: 'Gandaki', country: 'Nepal' },
  parbat: { region: 'Gandaki', country: 'Nepal' },
  bagmati: { region: 'Bagmati', country: 'Nepal' },
  kathmandu: { region: 'Bagmati', country: 'Nepal', city: 'Kathmandu' },
  bhaktapur: { region: 'Bagmati', country: 'Nepal' },
  lalitpur: { region: 'Bagmati', country: 'Nepal' },
  karnali: { region: 'Karnali', country: 'Nepal' },
  surkhet: { region: 'Karnali', country: 'Nepal' },
  goa: { region: 'Goa', country: 'India' },
  himachal: { region: 'Himachal Pradesh', country: 'India' },
  'himachal pradesh': { region: 'Himachal Pradesh', country: 'India' },
  kangra: { region: 'Himachal Pradesh', country: 'India' },
  rajasthan: { region: 'Rajasthan', country: 'India' },
  shekhawati: { region: 'Rajasthan', country: 'India' },
  jhunjhunu: { region: 'Rajasthan', country: 'India' },
  'tamil nadu': { region: 'Tamil Nadu', country: 'India' },
  erode: { region: 'Tamil Nadu', country: 'India' },
};

const COUNTRY_ALIASES: Record<string, string> = {
  nepal: 'Nepal',
  nepali: 'Nepal',
  india: 'India',
  indian: 'India',
};

function parseAmount(raw: string): number | undefined {
  const match = raw.match(/([\d.,]+)\s*([kmb])?/i);
  if (!match) return undefined;
  const base = Number(match[1].replace(/,/g, ''));
  if (Number.isNaN(base)) return undefined;
  const suffix = match[2]?.toLowerCase();
  return suffix ? base * MULTIPLIERS[suffix] : base;
}

/**
 * Turns a sentence into filters: "4 bed villa in Goa under $2m with a 3d tour"
 * becomes beds >= 4, type Villa, region Goa, maxPrice 2e6, requireTour. Whatever the parser cannot claim stays in `text` for the keyword
 * pass, so nothing typed is ever silently dropped.
 */
export function parseSmartQuery(input: string, base: SearchQuery = EMPTY_QUERY): SearchQuery {
  const query: SearchQuery = { ...base, tags: [...base.tags], text: '' };
  let rest = ` ${input.toLowerCase()} `;

  const take = (pattern: RegExp, handler: (m: RegExpMatchArray) => void) => {
    const match = rest.match(pattern);
    if (match) {
      handler(match);
      rest = rest.replace(pattern, ' ');
    }
  };

  take(/\b(?:under|below|less than|up to|max)\s*\$?\s*([\d.,]+\s*[kmb]?)/i, (m) => {
    query.maxPrice = parseAmount(m[1]);
  });
  take(/\b(?:over|above|more than|from|min|starting at)\s*\$?\s*([\d.,]+\s*[kmb]?)/i, (m) => {
    query.minPrice = parseAmount(m[1]);
  });
  take(/\$\s*([\d.,]+\s*[kmb]?)\s*(?:-|to|–)\s*\$?\s*([\d.,]+\s*[kmb]?)/i, (m) => {
    query.minPrice = parseAmount(m[1]);
    query.maxPrice = parseAmount(m[2]);
  });
  take(/\b(\d+)\s*\+?\s*(?:bed|beds|bedroom|bedrooms|br)\b/i, (m) => {
    query.beds = Number(m[1]);
  });
  take(/\b(\d+)\s*\+?\s*(?:bath|baths|bathroom|bathrooms|ba)\b/i, (m) => {
    query.baths = Number(m[1]);
  });
  take(/\b([\d.]+)\s*\+?\s*(?:acre|acres)\b/i, (m) => {
    query.minAcres = Number(m[1]);
  });

  if (/\b(3d|360|virtual tour|walkthrough|walkover|matterport)\b/i.test(rest)) {
    query.requireTour = true;
    // Strip the whole phrase, including a trailing "tour"/"tours", so the word
    // does not survive into the keyword pass and filter everything out.
    rest = rest.replace(
      /\b(3d|360°?|virtual|walkthrough|walkover|matterport)\s*(tours?)?\b/gi,
      ' ',
    );
    rest = rest.replace(/\btours?\b/gi, ' ');
  }
  if (/\b(video|film|cinematic)\b/i.test(rest)) {
    query.requireVideo = true;
    rest = rest.replace(/\b(video|film|cinematic)\b/gi, ' ');
  }
  if (/\b(regent|regents|showcase)\b/i.test(rest)) {
    query.requireRegents = true;
    rest = rest.replace(/\b(regent|regents|showcase)\b/gi, ' ');
  }
  if (/\bopen house\b/i.test(rest)) {
    query.requireOpenHouse = true;
    rest = rest.replace(/\bopen house\b/gi, ' ');
  }

  // Longest names first, so "himachal pradesh" is claimed before "himachal".
  const regionNames = Object.keys(REGIONS).sort((a, b) => b.length - a.length);
  for (const name of regionNames) {
    const pattern = new RegExp(`\\b${name}\\b`, 'i');
    if (pattern.test(rest)) {
      query.region = REGIONS[name].region;
      query.country = query.country ?? REGIONS[name].country;
      if (REGIONS[name].city) query.city = REGIONS[name].city;
      rest = rest.replace(new RegExp(`\\b${name}\\b`, 'gi'), ' ');
      break;
    }
  }
  for (const [alias, country] of Object.entries(COUNTRY_ALIASES)) {
    const pattern = new RegExp(`\\b${alias}\\b`, 'i');
    if (pattern.test(rest) && !query.country) {
      query.country = country;
      rest = rest.replace(new RegExp(`\\b${alias}\\b`, 'gi'), ' ');
      break;
    }
  }

  for (const [word, tag] of Object.entries(TAG_SYNONYMS)) {
    const pattern = new RegExp(`\\b${word}\\b`, 'i');
    if (pattern.test(rest)) {
      if (!query.tags.includes(tag)) query.tags.push(tag);
      rest = rest.replace(new RegExp(`\\b${word}\\b`, 'gi'), ' ');
    }
  }
  for (const [word, type] of Object.entries(TYPE_SYNONYMS)) {
    const pattern = new RegExp(`\\b${word}\\b`, 'i');
    if (pattern.test(rest) && !query.type) {
      query.type = type;
      rest = rest.replace(new RegExp(`\\b${word}\\b`, 'gi'), ' ');
    }
  }

  query.text = rest
    .replace(
      /\b(in|with|a|an|the|for|and|near|around|properties|property|listings|listing|homes|home|houses|view|views|style|show|me|find|looking|want)\b/gi,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
  return query;
}

/** Human-readable chips describing an active query, used above the results grid. */
export function describeQuery(query: SearchQuery): string[] {
  const chips: string[] = [];
  if (query.text) chips.push(`“${query.text}”`);
  if (query.beds) chips.push(`${query.beds}+ beds`);
  if (query.baths) chips.push(`${query.baths}+ baths`);
  if (query.minAcres) chips.push(`${query.minAcres}+ acres`);
  if (query.minPrice) chips.push(`from $${query.minPrice.toLocaleString('en-US')}`);
  if (query.maxPrice) chips.push(`to $${query.maxPrice.toLocaleString('en-US')}`);
  if (query.type) chips.push(query.type);
  if (query.status) chips.push(query.status);
  if (query.country) chips.push(query.country);
  if (query.region) chips.push(query.region);
  if (query.city) chips.push(query.city);
  query.tags.forEach((tag) => chips.push(tag));
  if (query.requireTour) chips.push('3D/360° tour');
  if (query.requireVideo) chips.push('Property video');
  if (query.requireRegents) chips.push('Regents showcase');
  if (query.requireOpenHouse) chips.push('Open house');
  return chips;
}

function haystack(p: Property): string {
  return [
    p.title,
    p.city,
    p.region,
    p.country,
    p.agency,
    p.type,
    p.status,
    p.headline,
    ...p.tags,
  ]
    .join(' ')
    .toLowerCase();
}

export type SortKey = 'default' | 'price-desc' | 'price-asc' | 'newest' | 'beds' | 'area';

export const SORT_LABELS: Record<SortKey, string> = {
  default: 'Default',
  'price-desc': 'Price: High to Low',
  'price-asc': 'Price: Low to High',
  newest: 'Newest',
  beds: 'Most Bedrooms',
  area: 'Largest',
};

export function applyQuery(
  source: Property[],
  query: SearchQuery,
  sort: SortKey = 'default',
): Property[] {
  const words = query.text.split(/\s+/).filter(Boolean);

  const filtered = source.filter((p) => {
    if (query.requireTour && !p.hasTour) return false;
    if (query.requireVideo && !p.hasVideo) return false;
    if (query.requireRegents && !p.regents) return false;
    if (query.requireOpenHouse && p.status !== 'New') return false;
    if (query.beds && p.beds < query.beds) return false;
    if (query.baths && p.baths < query.baths) return false;
    if (query.minAcres && p.lotAcres < query.minAcres) return false;
    if (query.type && p.type !== query.type) return false;
    if (query.status && p.status !== query.status) return false;
    if (query.country && p.country !== query.country) return false;
    if (query.region && p.region !== query.region) return false;
    if (query.city && !p.city.toLowerCase().includes(query.city.toLowerCase())) return false;
    if (query.tags.length && !query.tags.every((tag) => p.tags.includes(tag))) return false;

    if (query.minPrice || query.maxPrice) {
      // Price bounds are entered in USD; compare against the USD equivalent.
      if (!p.price) return false;
      const usd = convert(p.price, p.currency, 'USD' as Currency);
      if (query.minPrice && usd < query.minPrice) return false;
      if (query.maxPrice && usd > query.maxPrice) return false;
    }

    if (words.length) {
      const hay = haystack(p);
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });

  const sorted = [...filtered];
  switch (sort) {
    case 'price-desc':
      sorted.sort((a, b) => convert(b.price, b.currency, 'USD') - convert(a.price, a.currency, 'USD'));
      break;
    case 'price-asc':
      sorted.sort((a, b) => convert(a.price, a.currency, 'USD') - convert(b.price, b.currency, 'USD'));
      break;
    case 'newest':
      sorted.sort((a, b) => b.listedOn.localeCompare(a.listedOn));
      break;
    case 'beds':
      sorted.sort((a, b) => b.beds - a.beds);
      break;
    case 'area':
      sorted.sort((a, b) => b.sqft - a.sqft);
      break;
    default:
      break;
  }
  return sorted;
}

/**
 * Constraints dropped, in order, when a strict query returns nothing. Least
 * important first: someone who asked for a lakeside villa in Pokhara would rather
 * see a four-bedroom than nothing at all, but dropping "Pokhara" changes what
 * they asked for, so location goes last.
 */
const RELAXATION_ORDER: { key: keyof SearchQuery | 'tagsTail'; label: string }[] = [
  { key: 'text', label: 'keyword' },
  { key: 'minAcres', label: 'lot size' },
  { key: 'tagsTail', label: 'some characteristics' },
  { key: 'baths', label: 'bathrooms' },
  { key: 'type', label: 'property type' },
  { key: 'beds', label: 'bedrooms' },
  { key: 'status', label: 'listing status' },
  { key: 'minPrice', label: 'minimum price' },
  { key: 'maxPrice', label: 'maximum price' },
  { key: 'tags', label: 'characteristics' },
  { key: 'city', label: 'city' },
  { key: 'region', label: 'region' },
];

export interface RelaxedResult {
  results: Property[];
  /** True when the strict query matched nothing and constraints were dropped. */
  relaxed: boolean;
  /** What was dropped, for the "showing closest matches" note. */
  dropped: string[];
}

/**
 * Runs the query, then widens it step by step until something matches. An empty
 * grid is almost never the answer a searcher wants; a near miss, clearly labelled
 * as a near miss, is.
 */
export function applyQueryWithFallback(
  source: Property[],
  query: SearchQuery,
  sort: SortKey = 'default',
): RelaxedResult {
  const strict = applyQuery(source, query, sort);
  if (strict.length > 0) return { results: strict, relaxed: false, dropped: [] };

  let working: SearchQuery = { ...query, tags: [...query.tags] };
  const dropped: string[] = [];

  for (const step of RELAXATION_ORDER) {
    if (step.key === 'tagsTail') {
      // Keep the first characteristic asked for, drop the rest.
      if (working.tags.length <= 1) continue;
      working = { ...working, tags: working.tags.slice(0, 1) };
      dropped.push(step.label);
    } else if (step.key === 'text') {
      if (!working.text) continue;
      working = { ...working, text: '' };
      dropped.push(step.label);
    } else if (step.key === 'tags') {
      if (working.tags.length === 0) continue;
      working = { ...working, tags: [] };
      dropped.push(step.label);
    } else {
      if (working[step.key] === undefined) continue;
      working = { ...working, [step.key]: undefined };
      dropped.push(step.label);
    }

    const next = applyQuery(source, working, sort);
    if (next.length > 0) return { results: next, relaxed: true, dropped };
  }

  return { results: [], relaxed: true, dropped };
}

/** Suggestions for the command palette and the hero console typeahead. */
export function suggest(source: Property[], text: string, limit = 6): Property[] {
  const needle = text.trim().toLowerCase();
  if (!needle) return [];
  return source
    .filter((p) => haystack(p).includes(needle))
    .slice(0, limit);
}
