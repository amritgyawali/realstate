import type { Agent } from '@/lib/types';

/**
 * Listing agents for the Nepal and India portfolio. These are sample profiles:
 * contact details use the reserved example.com domain and placeholder numbers,
 * and no portrait is supplied, so the directory shows the crest avatar.
 */
export const agents: Agent[] = [
  {
    "slug": "anisha-gurung",
    "name": "Anisha Gurung",
    "firm": "Phewa Lakeside Estates",
    "location": "Pokhara, Gandaki, Nepal",
    "image": "",
    "regents": true,
    "phone": "+977 61 555 0142",
    "email": "anisha@example.com",
    "address": [
      "Lakeside Road, Ward 6",
      "Pokhara, Gandaki, Nepal"
    ],
    "languages": [
      "Nepali",
      "English",
      "Hindi",
      "Gurung"
    ],
    "title": "Principal Broker",
    "bio": "Anisha represents buyers and sellers of houses, villas and heritage homes across the Pokhara market, and walks every listing in 3D before it goes live — so buyers abroad can see the house room by room before they fly in."
  },
  {
    "slug": "rohan-shrestha",
    "name": "Rohan Shrestha",
    "firm": "Himalayan Hills Realty",
    "location": "Kathmandu, Bagmati, Nepal",
    "image": "",
    "regents": true,
    "phone": "+977 1 555 0187",
    "email": "rohan@example.com",
    "address": [
      "Budhanilkantha Road, Ward 3",
      "Kathmandu, Bagmati, Nepal"
    ],
    "languages": [
      "Nepali",
      "Nepal Bhasa",
      "English"
    ],
    "title": "Director of Residential Sales",
    "bio": "Rohan represents buyers and sellers of houses, villas and heritage homes across the Kathmandu Valley market, and walks every listing in 3D before it goes live — so buyers abroad can see the house room by room before they fly in."
  },
  {
    "slug": "suman-khadka",
    "name": "Suman Khadka",
    "firm": "Karnali Homes",
    "location": "Birendranagar, Karnali, Nepal",
    "image": "",
    "regents": false,
    "phone": "+977 83 555 0119",
    "email": "suman@example.com",
    "address": [
      "Birendra Chowk, Ward 7",
      "Birendranagar, Karnali, Nepal"
    ],
    "languages": [
      "Nepali",
      "English"
    ],
    "title": "Residential Specialist",
    "bio": "Suman represents buyers and sellers of houses, villas and heritage homes across the Karnali market, and walks every listing in 3D before it goes live — so buyers abroad can see the house room by room before they fly in."
  },
  {
    "slug": "maria-fernandes",
    "name": "Maria Fernandes",
    "firm": "Konkan Coast Properties",
    "location": "Panaji, Goa, India",
    "image": "",
    "regents": true,
    "phone": "+91 832 555 0164",
    "email": "maria@example.com",
    "address": [
      "Dayanand Bandodkar Marg",
      "Panaji, Goa, India"
    ],
    "languages": [
      "Konkani",
      "English",
      "Portuguese",
      "Hindi"
    ],
    "title": "Heritage Homes Specialist",
    "bio": "Maria represents buyers and sellers of houses, villas and heritage homes across the Goa market, and walks every listing in 3D before it goes live — so buyers abroad can see the house room by room before they fly in."
  },
  {
    "slug": "vikram-thakur",
    "name": "Vikram Thakur",
    "firm": "Dhauladhar Estates",
    "location": "Dharamshala, Himachal Pradesh, India",
    "image": "",
    "regents": false,
    "phone": "+91 1892 555 012",
    "email": "vikram@example.com",
    "address": [
      "Kotwali Bazaar",
      "Dharamshala, Himachal Pradesh, India"
    ],
    "languages": [
      "Hindi",
      "Pahari",
      "English"
    ],
    "title": "Hill Property Advisor",
    "bio": "Vikram represents buyers and sellers of houses, villas and heritage homes across the Himachal market, and walks every listing in 3D before it goes live — so buyers abroad can see the house room by room before they fly in."
  },
  {
    "slug": "meera-rathore",
    "name": "Meera Rathore",
    "firm": "Rajputana Heritage Homes",
    "location": "Jaipur, Rajasthan, India",
    "image": "",
    "regents": true,
    "phone": "+91 141 555 0173",
    "email": "meera@example.com",
    "address": [
      "MI Road",
      "Jaipur, Rajasthan, India"
    ],
    "languages": [
      "Hindi",
      "Rajasthani",
      "English"
    ],
    "title": "Haveli & Heritage Advisor",
    "bio": "Meera represents buyers and sellers of houses, villas and heritage homes across the Rajasthan market, and walks every listing in 3D before it goes live — so buyers abroad can see the house room by room before they fly in."
  },
  {
    "slug": "karthik-subramanian",
    "name": "Karthik Subramanian",
    "firm": "Nilgiri Country Homes",
    "location": "Coimbatore, Tamil Nadu, India",
    "image": "",
    "regents": false,
    "phone": "+91 422 555 0158",
    "email": "karthik@example.com",
    "address": [
      "Race Course Road",
      "Coimbatore, Tamil Nadu, India"
    ],
    "languages": [
      "Tamil",
      "English",
      "Kannada"
    ],
    "title": "Farm & Estate Specialist",
    "bio": "Karthik represents buyers and sellers of houses, villas and heritage homes across the Kongu market, and walks every listing in 3D before it goes live — so buyers abroad can see the house room by room before they fly in."
  }
];

export const agentBySlug = new Map(agents.map((a) => [a.slug, a]));
