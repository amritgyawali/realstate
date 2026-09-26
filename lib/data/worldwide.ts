export interface TerritoryGroup {
  region: string;
  flag: string;
  /** Each entry links to Homes For Sale narrowed to this country, and region when given. */
  places: { name: string; country: string; region?: string }[];
}

export const worldwideIntro =
  'Houses, villas and heritage homes across Nepal and India, every one of them walkable in 3D before you visit: lakeshore estates in Pokhara, ridge houses in the Kathmandu Valley, riverside villas in Goa, village houses in the Himalayan foothills and painted havelis in Shekhawati. Browse by province or state:';

export const territoryGroups: TerritoryGroup[] = [
  {
    region: 'Nepal',
    flag: '🇳🇵',
    places: [
      { name: 'All of Nepal', country: 'Nepal' },
      { name: 'Gandaki', country: 'Nepal', region: 'Gandaki' },
      { name: 'Bagmati', country: 'Nepal', region: 'Bagmati' },
      { name: 'Karnali', country: 'Nepal', region: 'Karnali' },
    ],
  },
  {
    region: 'India',
    flag: '🇮🇳',
    places: [
      { name: 'All of India', country: 'India' },
      { name: 'Goa', country: 'India', region: 'Goa' },
      { name: 'Himachal Pradesh', country: 'India', region: 'Himachal Pradesh' },
      { name: 'Rajasthan', country: 'India', region: 'Rajasthan' },
      { name: 'Tamil Nadu', country: 'India', region: 'Tamil Nadu' },
    ],
  },
];

export const explorationCards = [
  {
    title: 'Search Nepal & India',
    subtitle: 'Houses and villas for sale.',
    image: '/listings/views/small_harbour_morning.jpg',
  },
  {
    title: 'Destinations',
    subtitle: 'Provinces and states.',
    image: '/listings/views/qwantani_afternoon.jpg',
  },
  {
    title: 'Heritage Homes',
    subtitle: 'Havelis and old village houses.',
    image: '/listings/views/country_club.jpg',
  },
];
