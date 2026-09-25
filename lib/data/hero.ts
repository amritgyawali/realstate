import { properties } from '@/lib/data/properties';
import type { Property } from '@/lib/types';

/**
 * Hero carousel slides.
 *
 * Each slide pairs a listing with a wide frame from its own 3D tour. The frames
 * are cut from the CC0 panoramas, so the hero needs no photo credit.
 */
const HERO_FRAMES: { slug: string; image: string; alt: string }[] = [
  {
    "slug": "phewa-lakeside-villa-pokhara",
    "image": "/listings/views/qwantani_patio.jpg",
    "alt": "Covered veranda looking out over the lake"
  },
  {
    "slug": "nerul-riverside-villa-goa",
    "image": "/listings/views/sundowner_deck.jpg",
    "alt": "Covered terrace open to the sea"
  },
  {
    "slug": "muktinath-mountain-house-mustang",
    "image": "/listings/views/sterkspruit_falls.jpg",
    "alt": "Waterfall and green mountain valley below the house"
  },
  {
    "slug": "shekhawati-haveli-jhunjhunu",
    "image": "/listings/views/country_club.jpg",
    "alt": "Painted double-height durbar hall"
  },
  {
    "slug": "nagarkot-ridge-house-bhaktapur",
    "image": "/listings/views/treetop_balcony.jpg",
    "alt": "Timber deck over a forested valley"
  }
];

export const heroSlides: (Property & { heroImage: string; heroAlt: string })[] = HERO_FRAMES
  .map((frame) => {
    const property = properties.find((candidate) => candidate.slug === frame.slug);
    return property
      ? { ...property, heroImage: frame.image, heroAlt: frame.alt }
      : null;
  })
  .filter((slide): slide is Property & { heroImage: string; heroAlt: string } => slide !== null);
