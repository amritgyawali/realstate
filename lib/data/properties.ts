import type { Property } from '@/lib/types';

/**
 * Houses and villas in Nepal and India.
 *
 * These are sample listings built around the 3D/360° walkover: every one has a
 * tour (see `lib/data/tours.ts`), and its gallery is the house's exterior
 * followed by views from the rooms in that tour. Prices, agents and floor areas
 * are illustrative. Towns and coordinates are real; exterior photographs are
 * from Wikimedia Commons and credited in `credits`, and every room view is cut
 * from a CC0 panorama in /public/panoramas.
 *
 * `price: 0` means Price Upon Request.
 */
export const properties: Property[] = [
  {
    "slug": "phewa-lakeside-villa-pokhara",
    "title": "Phewa Lakeside Villa",
    "city": "Pokhara",
    "region": "Gandaki",
    "country": "Nepal",
    "price": 450000000,
    "currency": "NPR",
    "beds": 6,
    "baths": 7,
    "fullBaths": 6,
    "sqft": 9350,
    "lotAcres": 3.4,
    "year": 2012,
    "type": "Villa",
    "status": "Active",
    "agency": "Phewa Lakeside Estates",
    "agentSlug": "anisha-gurung",
    "regents": true,
    "hasVideo": false,
    "hasTour": true,
    "image": "/listings/views/qwantani_patio.jpg",
    "gallery": [
      "/listings/views/qwantani_patio.jpg",
      "/listings/views/warm_bar.jpg",
      "/listings/views/warm_restaurant.jpg",
      "/listings/views/small_harbour_morning.jpg",
      "/listings/views/billiard_hall.jpg",
      "/listings/views/empty_play_room.jpg",
      "/listings/views/boma.jpg",
      "/listings/views/squash_court.jpg",
      "/listings/views/lakeside.jpg",
      "/listings/views/qwantani_afternoon.jpg"
    ],
    "tags": [
      "Lake",
      "Waterfront",
      "Mountain View"
    ],
    "headline": "A lakeshore estate you can walk room by room, from the lounge to the jetty",
    "description": "A single-level stone and timber estate on its own stretch of lakeshore. The front door opens into a vaulted lounge with a stone-clad bar and a cast-iron fireplace; beyond it a 17-metre dining hall under exposed pine trusses opens through two pairs of French doors onto a covered veranda and the lawn running down to the water. A private jetty and a sheltered swimming cove sit at the foot of the garden. East of the lounge are a billiard room, a games room and an arcaded fireside pavilion with a wood-fired oven, and a garden door leads up to a ridge lookout over the whole lake. A full-size squash court completes the house. All ten spaces were captured in 360° and can be walked continuously in 3D, from the road to the shore.",
    "amenities": [
      "Private Jetty",
      "Squash Court",
      "Billiard Room",
      "Wood-Fired Oven",
      "Lake Frontage"
    ],
    "appliances": "Commercial Range, Walk-in Cold Room, Dishwasher, Ice Maker, Bar Refrigeration.",
    "generalFeatures": "Vaulted Timber Ceilings, Fireplaces, Covered Veranda, Solar Hot Water, Backup Generator.",
    "county": "Kaski District",
    "sourceId": "NP4A21",
    "lreId": 5102001,
    "lat": 28.2096,
    "lng": 83.9587,
    "listedOn": "2026-09-20"
  },
  {
    "slug": "nagarkot-ridge-house-bhaktapur",
    "title": "Nagarkot Ridge House",
    "city": "Nagarkot",
    "region": "Bagmati",
    "country": "Nepal",
    "price": 65000000,
    "currency": "NPR",
    "beds": 4,
    "baths": 3,
    "fullBaths": 3,
    "sqft": 3100,
    "lotAcres": 0.6,
    "year": 2016,
    "type": "Single Family",
    "status": "New",
    "agency": "Himalayan Hills Realty",
    "agentSlug": "rohan-shrestha",
    "regents": true,
    "hasVideo": false,
    "hasTour": true,
    "image": "/listings/nagarkot-ridge-house-bhaktapur.jpg",
    "gallery": [
      "/listings/nagarkot-ridge-house-bhaktapur.jpg",
      "/listings/views/lythwood_lounge.jpg",
      "/listings/views/glasshouse_interior.jpg",
      "/listings/views/lythwood_room.jpg",
      "/listings/views/treetop_balcony.jpg",
      "/listings/views/sterkspruit_falls.jpg"
    ],
    "tags": [
      "Mountain View",
      "Country Home"
    ],
    "headline": "Terraced hillside house on the Nagarkot ridge",
    "description": "A whitewashed hill house with a clay-tile roof, set into the terraced slope below the Nagarkot ridge. A glazed great room and a stone-hearthed sitting room open off the entrance hall; the kitchen and dining room face the valley, and a timber sun deck steps out over the terraces toward a waterfall trail. Upstairs, the principal suite looks north to the high Himalaya at first light. The whole house can be walked in 3D, from the lane to the upper landing.",
    "amenities": [
      "Sun Deck",
      "Terraced Garden",
      "Mountain Views"
    ],
    "appliances": "Gas Range, Refrigerator, Water Purifier, Solar Water Heater.",
    "generalFeatures": "Wood Stove, Clay-Tile Roof, Terraced Garden.",
    "county": "Bhaktapur District",
    "sourceId": "NP7C03",
    "lreId": 5102002,
    "lat": 27.7154,
    "lng": 85.5207,
    "listedOn": "2026-09-18",
    "credits": [
      {
        "image": "/listings/nagarkot-ridge-house-bhaktapur.jpg",
        "author": "Brabim Bhandari",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "source": "https://commons.wikimedia.org/wiki/File:Nagarkot,Bhaktapur_(14).JPG"
      }
    ]
  },
  {
    "slug": "thapathana-stone-house-parbat",
    "title": "Thapathana Stone House",
    "city": "Thapathana",
    "region": "Gandaki",
    "country": "Nepal",
    "price": 28000000,
    "currency": "NPR",
    "beds": 5,
    "baths": 2,
    "fullBaths": 2,
    "sqft": 2600,
    "lotAcres": 0.4,
    "year": 1988,
    "type": "Single Family",
    "status": "Active",
    "agency": "Phewa Lakeside Estates",
    "agentSlug": "anisha-gurung",
    "regents": false,
    "hasVideo": false,
    "hasTour": true,
    "image": "/listings/thapathana-stone-house-parbat.jpg",
    "gallery": [
      "/listings/thapathana-stone-house-parbat.jpg",
      "/listings/views/lythwood_lounge.jpg",
      "/listings/views/glasshouse_interior.jpg",
      "/listings/views/lythwood_room.jpg",
      "/listings/views/treetop_balcony.jpg",
      "/listings/views/sterkspruit_falls.jpg"
    ],
    "tags": [
      "Mountain View",
      "Historic",
      "Country Home"
    ],
    "headline": "Three-storey stone house in the traditional red and white",
    "description": "A three-storey house of dressed stone, finished in the red lower course and white upper walls of the western hills, with blue-painted timber windows and a carved balcony across the front. Rooms are generous and well lit: a hall, a great room and a hearth room on the ground floor, a kitchen with dining for a large family, and bedrooms above opening onto the balcony. The house can be walked in 3D from the courtyard to the upper floor.",
    "amenities": [
      "Carved Timber Balcony",
      "Courtyard",
      "Mountain Views"
    ],
    "appliances": "Gas Range, Refrigerator, Water Purifier.",
    "generalFeatures": "Load-bearing Stone Walls, Timber Floors, Wood Stove.",
    "county": "Parbat District",
    "sourceId": "NP2B77",
    "lreId": 5102003,
    "lat": 28.19,
    "lng": 83.65,
    "listedOn": "2026-09-06",
    "credits": [
      {
        "image": "/listings/thapathana-stone-house-parbat.jpg",
        "author": "Nabin845",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "source": "https://commons.wikimedia.org/wiki/File:A_house_made_of_stone_in_Thapathana_VDC_ofParbat.jpg"
      }
    ]
  },
  {
    "slug": "birendranagar-garden-house-surkhet",
    "title": "Birendranagar Garden House",
    "city": "Birendranagar",
    "region": "Karnali",
    "country": "Nepal",
    "price": 35000000,
    "currency": "NPR",
    "beds": 4,
    "baths": 3,
    "fullBaths": 2,
    "sqft": 2900,
    "lotAcres": 0.35,
    "year": 2014,
    "type": "Single Family",
    "status": "Active",
    "agency": "Karnali Homes",
    "agentSlug": "suman-khadka",
    "regents": false,
    "hasVideo": false,
    "hasTour": true,
    "image": "/listings/birendranagar-garden-house-surkhet.jpg",
    "gallery": [
      "/listings/birendranagar-garden-house-surkhet.jpg",
      "/listings/views/lythwood_lounge.jpg",
      "/listings/views/glasshouse_interior.jpg",
      "/listings/views/lythwood_room.jpg",
      "/listings/views/treetop_balcony.jpg",
      "/listings/views/sterkspruit_falls.jpg"
    ],
    "tags": [
      "Suburban Home",
      "Mountain View"
    ],
    "headline": "Two-storey family house with a walled garden in the Surkhet valley",
    "description": "A two-storey family house with a clay-tile roof and a first-floor balcony, set back from the road behind a stone garden wall with fruit trees along the boundary. Inside, a central hall leads to a bright great room, a sitting room with a wood stove and a kitchen with space for family dining; bedrooms and a principal suite are upstairs. Walk the whole house in 3D before visiting.",
    "amenities": [
      "Walled Garden",
      "First-Floor Balcony",
      "Fruit Trees"
    ],
    "appliances": "Gas Range, Refrigerator, Washing Machine, Water Purifier.",
    "generalFeatures": "Clay-Tile Roof, Wood Stove, Off-street Parking.",
    "county": "Surkhet District",
    "sourceId": "NP9D40",
    "lreId": 5102004,
    "lat": 28.6019,
    "lng": 81.6339,
    "listedOn": "2026-09-12",
    "credits": [
      {
        "image": "/listings/birendranagar-garden-house-surkhet.jpg",
        "author": "Janak Poudel",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "source": "https://commons.wikimedia.org/wiki/File:Nepali_house.jpg"
      }
    ]
  },
  {
    "slug": "muktinath-mountain-house-mustang",
    "title": "Muktinath Mountain House",
    "city": "Muktinath",
    "region": "Gandaki",
    "country": "Nepal",
    "price": 42000000,
    "currency": "NPR",
    "beds": 5,
    "baths": 4,
    "fullBaths": 3,
    "sqft": 3300,
    "lotAcres": 0.5,
    "year": 2009,
    "type": "Single Family",
    "status": "Pending",
    "agency": "Phewa Lakeside Estates",
    "agentSlug": "anisha-gurung",
    "regents": true,
    "hasVideo": false,
    "hasTour": true,
    "image": "/listings/muktinath-mountain-house-mustang.jpg",
    "gallery": [
      "/listings/muktinath-mountain-house-mustang.jpg",
      "/listings/views/lythwood_lounge.jpg",
      "/listings/views/glasshouse_interior.jpg",
      "/listings/views/lythwood_room.jpg",
      "/listings/views/treetop_balcony.jpg",
      "/listings/views/sterkspruit_falls.jpg"
    ],
    "tags": [
      "Mountain View",
      "Historic"
    ],
    "headline": "Stone house under the Dhaulagiri range",
    "description": "A low stone house in the Mustang style, with thick walls, deep-set windows and a flat roof for drying and sitting out, under a pine-covered slope with the snow peaks of the Dhaulagiri range across the valley. The plan is a sheltered hall, a great room, a hearth room with a wood stove and a kitchen, with a timber deck on the sunny side and the bedrooms above. Walk it in 3D from the lane to the upstairs suite.",
    "amenities": [
      "Roof Terrace",
      "Timber Deck",
      "Himalayan Views"
    ],
    "appliances": "Gas Range, Refrigerator, Solar Water Heater.",
    "generalFeatures": "Stone Construction, Wood Stove, Flat Roof Terrace.",
    "county": "Mustang District",
    "sourceId": "NP5E18",
    "lreId": 5102005,
    "lat": 28.8167,
    "lng": 83.8717,
    "listedOn": "2026-08-28",
    "credits": [
      {
        "image": "/listings/muktinath-mountain-house-mustang.jpg",
        "author": "Keshav Pudasaini",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "source": "https://commons.wikimedia.org/wiki/File:Muktinath_(1)_103.JPG"
      }
    ]
  },
  {
    "slug": "budhanilkantha-garden-villa-kathmandu",
    "title": "Budhanilkantha Garden Villa",
    "city": "Kathmandu",
    "region": "Bagmati",
    "country": "Nepal",
    "price": 180000000,
    "currency": "NPR",
    "beds": 5,
    "baths": 6,
    "fullBaths": 5,
    "sqft": 6200,
    "lotAcres": 0.9,
    "year": 2019,
    "type": "Villa",
    "status": "New",
    "agency": "Himalayan Hills Realty",
    "agentSlug": "rohan-shrestha",
    "regents": true,
    "hasVideo": false,
    "hasTour": true,
    "image": "/listings/views/wooden_lounge.jpg",
    "gallery": [
      "/listings/views/wooden_lounge.jpg",
      "/listings/views/veranda.jpg",
      "/listings/views/indoor_pool.jpg",
      "/listings/views/relax_inn_seaview_suite.jpg",
      "/listings/views/modern_bathroom.jpg"
    ],
    "tags": [
      "Suburban Home",
      "Mountain View"
    ],
    "headline": "Garden villa with an indoor pool below the Shivapuri hills",
    "description": "A contemporary villa on a walled garden plot at the foot of the Shivapuri hills. A double-height living pavilion in pale timber opens onto a brick veranda and a garden courtyard with an outdoor grill; a separate wing holds an indoor pool, sauna and spa bath, and a covered terrace looks west over the valley. The principal suite upstairs has its own balcony. Every room is walkable in 3D.",
    "amenities": [
      "Indoor Pool",
      "Sauna",
      "Garden Courtyard",
      "Covered Terrace"
    ],
    "appliances": "Induction Range, Steam Oven, Refrigerator, Dishwasher, Water Treatment Plant.",
    "generalFeatures": "Double-height Living Room, Solar Array, Backup Power, Staff Quarters.",
    "county": "Kathmandu District",
    "sourceId": "NP3F62",
    "lreId": 5102006,
    "lat": 27.7667,
    "lng": 85.365,
    "listedOn": "2026-09-22"
  },
  {
    "slug": "nerul-riverside-villa-goa",
    "title": "Nerul Riverside Villa",
    "city": "Nerul",
    "region": "Goa",
    "country": "India",
    "price": 145000000,
    "currency": "INR",
    "beds": 4,
    "baths": 5,
    "fullBaths": 4,
    "sqft": 5400,
    "lotAcres": 0.7,
    "year": 1972,
    "type": "Villa",
    "status": "Active",
    "agency": "Konkan Coast Properties",
    "agentSlug": "maria-fernandes",
    "regents": true,
    "hasVideo": false,
    "hasTour": true,
    "image": "/listings/nerul-riverside-villa-goa.jpg",
    "gallery": [
      "/listings/nerul-riverside-villa-goa.jpg",
      "/listings/views/wooden_lounge.jpg",
      "/listings/views/indoor_pool.jpg",
      "/listings/views/relax_inn_seaview_suite.jpg",
      "/listings/views/veranda.jpg",
      "/listings/views/modern_bathroom.jpg"
    ],
    "tags": [
      "River View",
      "Waterfront",
      "Tropical"
    ],
    "headline": "Whitewashed villa on the bank of the Nerul river",
    "description": "A whitewashed Goan villa with arched verandas, set among coconut palms on its own frontage on the Nerul river, a few minutes from the beaches of Candolim. The living pavilion opens onto a veranda and a garden courtyard; a pool wing and spa bath sit to one side, and a covered terrace faces west for the sunset. The principal suite and its balcony are upstairs. Walk the whole villa in 3D.",
    "amenities": [
      "River Frontage",
      "Pool",
      "Covered Terrace",
      "Coconut Grove"
    ],
    "appliances": "Gas Range, Refrigerator, Dishwasher, Water Purifier.",
    "generalFeatures": "Arched Verandas, Laterite Garden Walls, Terracotta Floors.",
    "county": "North Goa District",
    "sourceId": "IN1G55",
    "lreId": 5202001,
    "lat": 15.514,
    "lng": 73.783,
    "listedOn": "2026-09-15",
    "credits": [
      {
        "image": "/listings/nerul-riverside-villa-goa.jpg",
        "author": "Nikhilb239",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "source": "https://commons.wikimedia.org/wiki/File:House_in_Nerul_Goa_25012016.jpg"
      }
    ]
  },
  {
    "slug": "portuguese-village-home-goa",
    "title": "Portuguese-Era Village Home",
    "city": "Goa",
    "region": "",
    "country": "India",
    "price": 68000000,
    "currency": "INR",
    "beds": 4,
    "baths": 3,
    "fullBaths": 3,
    "sqft": 3800,
    "lotAcres": 0.5,
    "year": 1905,
    "type": "Single Family",
    "status": "Active",
    "agency": "Konkan Coast Properties",
    "agentSlug": "maria-fernandes",
    "regents": false,
    "hasVideo": false,
    "hasTour": true,
    "image": "/listings/portuguese-village-home-goa.jpg",
    "gallery": [
      "/listings/portuguese-village-home-goa.jpg",
      "/listings/views/wooden_lounge.jpg",
      "/listings/views/indoor_pool.jpg",
      "/listings/views/relax_inn_seaview_suite.jpg",
      "/listings/views/veranda.jpg",
      "/listings/views/modern_bathroom.jpg"
    ],
    "tags": [
      "Historic",
      "Tropical",
      "Country Home"
    ],
    "headline": "Village house with a gabled chapel front and a tiled veranda",
    "description": "A village house from the Portuguese era, with a white gabled front, a tiled roof over a deep veranda and a garden of palms and bougainvillea. The rooms run off a generous living hall; the veranda and a garden courtyard carry the house outdoors, and the principal suite has its own balcony. Walk the house in 3D from the gate.",
    "amenities": [
      "Deep Veranda",
      "Garden",
      "Heritage Facade"
    ],
    "appliances": "Gas Range, Refrigerator, Water Purifier.",
    "generalFeatures": "Mangalore-Tile Roof, Lime-Plastered Walls, High Ceilings.",
    "county": "Goa",
    "sourceId": "IN8H02",
    "lreId": 5202002,
    "lat": 15.38,
    "lng": 73.98,
    "listedOn": "2026-09-03",
    "credits": [
      {
        "image": "/listings/portuguese-village-home-goa.jpg",
        "author": "Fredericknoronha",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "source": "https://commons.wikimedia.org/wiki/File:Village_home_in_Goa,_India.jpg"
      }
    ]
  },
  {
    "slug": "hamirpur-hill-house-himachal",
    "title": "Hamirpur Hill House",
    "city": "Hamirpur",
    "region": "Himachal Pradesh",
    "country": "India",
    "price": 24000000,
    "currency": "INR",
    "beds": 3,
    "baths": 2,
    "fullBaths": 2,
    "sqft": 2200,
    "lotAcres": 1.2,
    "year": 2011,
    "type": "Single Family",
    "status": "New",
    "agency": "Dhauladhar Estates",
    "agentSlug": "vikram-thakur",
    "regents": false,
    "hasVideo": false,
    "hasTour": true,
    "image": "/listings/hamirpur-hill-house-himachal.jpg",
    "gallery": [
      "/listings/hamirpur-hill-house-himachal.jpg",
      "/listings/views/lythwood_lounge.jpg",
      "/listings/views/glasshouse_interior.jpg",
      "/listings/views/lythwood_room.jpg",
      "/listings/views/treetop_balcony.jpg",
      "/listings/views/sterkspruit_falls.jpg"
    ],
    "tags": [
      "Mountain View",
      "Country Home"
    ],
    "headline": "Stand-alone house on an open hillside",
    "description": "A two-storey house with a red roof and dormer windows, standing alone on an open grassy hillside with the ranges behind it and nothing but sky in front. The ground floor has a hall, a glazed great room, a hearth room and a kitchen with dining; the deck faces the valley, and the principal suite is upstairs. Walk it in 3D.",
    "amenities": [
      "Hillside Plot",
      "Timber Deck",
      "Valley Views"
    ],
    "appliances": "Gas Range, Refrigerator, Geyser.",
    "generalFeatures": "Dormer Windows, Wood Stove, Solar Water Heater.",
    "county": "Hamirpur District",
    "sourceId": "IN4K31",
    "lreId": 5202003,
    "lat": 31.6862,
    "lng": 76.5213,
    "listedOn": "2026-09-19",
    "credits": [
      {
        "image": "/listings/hamirpur-hill-house-himachal.jpg",
        "author": "Alexthomascv",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "source": "https://commons.wikimedia.org/wiki/File:Hamirpur_-_Himachal_Pradesh.jpg"
      }
    ]
  },
  {
    "slug": "kareri-village-house-kangra",
    "title": "Kareri Village House",
    "city": "Kareri",
    "region": "Himachal Pradesh",
    "country": "India",
    "price": 16000000,
    "currency": "INR",
    "beds": 3,
    "baths": 2,
    "fullBaths": 1,
    "sqft": 1900,
    "lotAcres": 0.8,
    "year": 1998,
    "type": "Single Family",
    "status": "Active",
    "agency": "Dhauladhar Estates",
    "agentSlug": "vikram-thakur",
    "regents": false,
    "hasVideo": false,
    "hasTour": true,
    "image": "/listings/kareri-village-house-kangra.jpg",
    "gallery": [
      "/listings/kareri-village-house-kangra.jpg",
      "/listings/views/lythwood_lounge.jpg",
      "/listings/views/glasshouse_interior.jpg",
      "/listings/views/lythwood_room.jpg",
      "/listings/views/treetop_balcony.jpg",
      "/listings/views/sterkspruit_falls.jpg"
    ],
    "tags": [
      "Mountain View",
      "Historic"
    ],
    "headline": "Slate-roofed house among the fields of the Dhauladhar",
    "description": "A two-storey village house with a slate roof and a turquoise front, set among terraced fields and haystacks below the Dhauladhar range, on the trail to Kareri lake. The plan is a hall, a great room, a hearth room with a wood stove and a kitchen, with a deck to the fields and bedrooms above. Walk it in 3D.",
    "amenities": [
      "Terraced Fields",
      "Timber Deck",
      "Trailhead Location"
    ],
    "appliances": "Gas Range, Geyser.",
    "generalFeatures": "Slate Roof, Wood Stove, Stone Plinth.",
    "county": "Kangra District",
    "sourceId": "IN6L90",
    "lreId": 5202004,
    "lat": 32.329,
    "lng": 76.269,
    "listedOn": "2026-08-25",
    "credits": [
      {
        "image": "/listings/kareri-village-house-kangra.jpg",
        "author": "Ashish Gupta",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "source": "https://commons.wikimedia.org/wiki/File:Houses_of_Kareri_village_(15339745109).jpg"
      }
    ]
  },
  {
    "slug": "shekhawati-haveli-jhunjhunu",
    "title": "Shekhawati Painted Haveli",
    "city": "Shekhawati",
    "region": "Rajasthan",
    "country": "India",
    "price": 0,
    "currency": "INR",
    "beds": 8,
    "baths": 6,
    "fullBaths": 6,
    "sqft": 8600,
    "lotAcres": 0.45,
    "year": 1890,
    "type": "Haveli",
    "status": "Active",
    "agency": "Rajputana Heritage Homes",
    "agentSlug": "meera-rathore",
    "regents": true,
    "hasVideo": false,
    "hasTour": true,
    "image": "/listings/shekhawati-haveli-jhunjhunu.jpg",
    "gallery": [
      "/listings/shekhawati-haveli-jhunjhunu.jpg",
      "/listings/views/reading_room.jpg",
      "/listings/views/country_club.jpg",
      "/listings/views/cayley_interior.jpg",
      "/listings/views/hotel_room.jpg"
    ],
    "tags": [
      "Historic",
      "Desert",
      "In-City"
    ],
    "headline": "Painted merchant haveli with jharokha windows",
    "description": "A merchant haveli of the Shekhawati region, its facade painted and carved around a pointed-arch doorway and a row of jharokha windows with blue shutters. Inside are a library with arched French windows, a baithak lounge, a double-height painted durbar hall and a guest suite, with a stair to the upper terrace and the roof. Offered for restoration or as it stands; walk every room in 3D.",
    "amenities": [
      "Painted Durbar Hall",
      "Roof Terrace",
      "Jharokha Windows"
    ],
    "appliances": "Refrigerator, Water Cooler.",
    "generalFeatures": "Lime Plaster Frescoes, Carved Stone, Terrazzo Floors, Courtyard Plan.",
    "county": "Jhunjhunu District",
    "sourceId": "IN2M14",
    "lreId": 5202005,
    "lat": 28.036,
    "lng": 75.6077,
    "listedOn": "2026-09-09",
    "credits": [
      {
        "image": "/listings/shekhawati-haveli-jhunjhunu.jpg",
        "author": "Indrapal Jangid",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "source": "https://commons.wikimedia.org/wiki/File:Old_Haveli_-_panoramio.jpg"
      }
    ]
  },
  {
    "slug": "thalavadi-farmhouse-erode",
    "title": "Thalavadi Farmhouse",
    "city": "Thalavadi",
    "region": "Tamil Nadu",
    "country": "India",
    "price": 39000000,
    "currency": "INR",
    "beds": 3,
    "baths": 3,
    "fullBaths": 2,
    "sqft": 2700,
    "lotAcres": 12,
    "year": 2006,
    "type": "Farmhouse",
    "status": "Active",
    "agency": "Nilgiri Country Homes",
    "agentSlug": "karthik-subramanian",
    "regents": false,
    "hasVideo": false,
    "hasTour": true,
    "image": "/listings/thalavadi-farmhouse-erode.jpg",
    "gallery": [
      "/listings/thalavadi-farmhouse-erode.jpg",
      "/listings/views/wooden_lounge.jpg",
      "/listings/views/indoor_pool.jpg",
      "/listings/views/relax_inn_seaview_suite.jpg",
      "/listings/views/veranda.jpg",
      "/listings/views/modern_bathroom.jpg"
    ],
    "tags": [
      "Country Home",
      "Tropical"
    ],
    "headline": "Farmhouse on twelve acres below the Western Ghats",
    "description": "A white farmhouse with arched windows and a red-tiled porch on twelve acres of farmland in the Thalavadi valley, below the forested slopes of the Western Ghats. A tree-lined drive leads to the porch; inside, the living pavilion opens to a veranda and courtyard, with a pool wing to one side and the principal suite upstairs. Walk it in 3D.",
    "amenities": [
      "12 Acres Farmland",
      "Borewell",
      "Garden Courtyard",
      "Pool"
    ],
    "appliances": "Gas Range, Refrigerator, Water Purifier.",
    "generalFeatures": "Arched Windows, Tiled Porch, Farm Outbuildings.",
    "county": "Erode District",
    "sourceId": "IN7N48",
    "lreId": 5202006,
    "lat": 11.7926,
    "lng": 77.0025,
    "listedOn": "2026-09-13",
    "credits": [
      {
        "image": "/listings/thalavadi-farmhouse-erode.jpg",
        "author": "JayakanthanG",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "source": "https://commons.wikimedia.org/wiki/File:Farm_house_in_Thalavadi_-_panoramio.jpg"
      }
    ]
  }
];

export const propertyBySlug = new Map(properties.map((p) => [p.slug, p]));

export const tourProperties = properties.filter((p) => p.hasTour);
