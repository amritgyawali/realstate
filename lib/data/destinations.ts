import type { Destination } from '@/lib/types';
import { properties } from '@/lib/data/properties';

/**
 * Provinces of Nepal and states of India with listings. Each card links to a
 * search on its name, so the name must match the listings' `region`. Images are
 * frames from the CC0 tour panoramas.
 */
const DESTINATIONS: Destination[] = [
  {
    "slug": "gandaki",
    "name": "Gandaki",
    "description": "Phewa lake, Pokhara and the Annapurna and Dhaulagiri ranges — lakeshore villas, hill houses and stone houses in the old villages.",
    "image": "/listings/views/small_harbour_morning.jpg",
    "region": "Nepal",
    "listingCount": 0
  },
  {
    "slug": "bagmati",
    "name": "Bagmati",
    "description": "The Kathmandu Valley and its rim: garden villas below Shivapuri and ridge houses at Nagarkot facing the Himalaya.",
    "image": "/listings/views/treetop_balcony.jpg",
    "region": "Nepal",
    "listingCount": 0
  },
  {
    "slug": "karnali",
    "name": "Karnali",
    "description": "The wide valley of Surkhet and the hills of the far west — family houses with gardens and room to grow.",
    "image": "/listings/views/sterkspruit_falls.jpg",
    "region": "Nepal",
    "listingCount": 0
  },
  {
    "slug": "goa",
    "name": "Goa",
    "description": "River-bank villas, Portuguese-era village homes and the beaches of the Konkan coast.",
    "image": "/listings/views/sundowner_deck.jpg",
    "region": "India",
    "listingCount": 0
  },
  {
    "slug": "himachal-pradesh",
    "name": "Himachal Pradesh",
    "description": "Slate-roofed village houses and hill homes under the Dhauladhar, from Kangra to Hamirpur.",
    "image": "/listings/views/qwantani_afternoon.jpg",
    "region": "India",
    "listingCount": 0
  },
  {
    "slug": "rajasthan",
    "name": "Rajasthan",
    "description": "Painted havelis of Shekhawati, with frescoed halls, jharokha windows and roof terraces.",
    "image": "/listings/views/country_club.jpg",
    "region": "India",
    "listingCount": 0
  },
  {
    "slug": "tamil-nadu",
    "name": "Tamil Nadu",
    "description": "Farmhouses on open land below the Western Ghats, with borewells, groves and long, tree-lined drives.",
    "image": "/listings/views/veranda.jpg",
    "region": "India",
    "listingCount": 0
  }
];

/** Listing counts are taken from the corpus so a card never promises more than it opens. */
export const destinations: Destination[] = DESTINATIONS.map((destination) => ({
  ...destination,
  listingCount: properties.filter((p) => p.region === destination.name).length,
}));

export const destinationBySlug = new Map(destinations.map((d) => [d.slug, d]));
