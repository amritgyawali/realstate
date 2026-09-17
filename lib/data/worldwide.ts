export interface TerritoryGroup {
  region: string;
  countries: { flag: string; name: string }[];
}

/** Global territory ledger, transcribed from the homepage Worldwide Luxury block. */
export const worldwideIntro = "As the premier luxury homes search site, LuxuryRealEstate.com is known for providing access to fine international estates and property listings. Recognized worldwide by industry leaders and media alike, the Who's Who In Luxury Real Estate brand continues to set the standard. Our extensive list of luxury homes for sale enables you to search and browse unique properties from across the globe, including:";

export const territoryGroups: TerritoryGroup[] = [
  {
    "region": "North America",
    "countries": [
      {
        "flag": "🇨🇦",
        "name": "Canada"
      },
      {
        "flag": "🇲🇽",
        "name": "Mexico"
      },
      {
        "flag": "🇺🇸",
        "name": "United States"
      }
    ]
  },
  {
    "region": "Central America",
    "countries": [
      {
        "flag": "🇧🇿",
        "name": "Belize"
      },
      {
        "flag": "🇨🇷",
        "name": "Costa Rica"
      },
      {
        "flag": "🇵🇦",
        "name": "Panama"
      }
    ]
  },
  {
    "region": "South America",
    "countries": [
      {
        "flag": "🇧🇷",
        "name": "Brazil"
      },
      {
        "flag": "🇨🇴",
        "name": "Colombia"
      },
      {
        "flag": "🇨🇼",
        "name": "Curaçao"
      }
    ]
  },
  {
    "region": "Middle East",
    "countries": [
      {
        "flag": "🇮🇱",
        "name": "Israel"
      },
      {
        "flag": "🇹🇷",
        "name": "Türkiye"
      },
      {
        "flag": "🇶🇦",
        "name": "Qatar"
      },
      {
        "flag": "🇦🇪",
        "name": "United Arab Emirates"
      }
    ]
  },
  {
    "region": "Caribbean",
    "countries": [
      {
        "flag": "🇦🇮",
        "name": "Anguilla"
      },
      {
        "flag": "🇦🇬",
        "name": "Antigua and Barbuda"
      },
      {
        "flag": "🇧🇸",
        "name": "Bahamas"
      },
      {
        "flag": "🇰🇾",
        "name": "Cayman Islands"
      },
      {
        "flag": "🇩🇴",
        "name": "Dominican Republic"
      },
      {
        "flag": "🇬🇩",
        "name": "Grenada"
      },
      {
        "flag": "🇳🇱",
        "name": "Netherlands Antilles"
      },
      {
        "flag": "🇵🇷",
        "name": "Puerto Rico"
      },
      {
        "flag": "🇧🇱",
        "name": "Saint Barthélemy"
      },
      {
        "flag": "🇲🇫",
        "name": "Saint Martin"
      },
      {
        "flag": "🇸🇽",
        "name": "Sint Maarten"
      },
      {
        "flag": "🇻🇨",
        "name": "St. Vincent and the Grenadines"
      },
      {
        "flag": "🇹🇨",
        "name": "Turks and Caicos Islands"
      },
      {
        "flag": "🇻🇬",
        "name": "Virgin Islands, British"
      }
    ]
  },
  {
    "region": "Europe",
    "countries": [
      {
        "flag": "🇧🇪",
        "name": "Belgium"
      },
      {
        "flag": "🇨🇿",
        "name": "Czech Republic"
      },
      {
        "flag": "🇫🇷",
        "name": "France"
      },
      {
        "flag": "🇩🇪",
        "name": "Germany"
      },
      {
        "flag": "🇬🇷",
        "name": "Greece"
      },
      {
        "flag": "🇭🇺",
        "name": "Hungary"
      },
      {
        "flag": "🇮🇪",
        "name": "Ireland"
      },
      {
        "flag": "🇮🇹",
        "name": "Italy"
      },
      {
        "flag": "🇱🇺",
        "name": "Luxembourg"
      },
      {
        "flag": "🇲🇹",
        "name": "Malta"
      },
      {
        "flag": "🇲🇨",
        "name": "Monaco"
      },
      {
        "flag": "🇲🇪",
        "name": "Montenegro"
      },
      {
        "flag": "🇳🇱",
        "name": "Netherlands"
      },
      {
        "flag": "🇵🇹",
        "name": "Portugal"
      },
      {
        "flag": "🇷🇺",
        "name": "Russian Federation"
      },
      {
        "flag": "🇪🇸",
        "name": "Spain"
      },
      {
        "flag": "🇸🇪",
        "name": "Sweden"
      },
      {
        "flag": "🇨🇭",
        "name": "Switzerland"
      },
      {
        "flag": "🇬🇧",
        "name": "United Kingdom"
      }
    ]
  },
  {
    "region": "Asia",
    "countries": [
      {
        "flag": "🇮🇳",
        "name": "India"
      },
      {
        "flag": "🇹🇭",
        "name": "Thailand"
      }
    ]
  },
  {
    "region": "Australia & the South Pacific",
    "countries": [
      {
        "flag": "🇦🇺",
        "name": "Australia"
      },
      {
        "flag": "🇫🇯",
        "name": "Fiji"
      },
      {
        "flag": "🇵🇫",
        "name": "French Polynesia"
      },
      {
        "flag": "🇳🇿",
        "name": "New Zealand"
      }
    ]
  },
  {
    "region": "Africa",
    "countries": [
      {
        "flag": "🇰🇪",
        "name": "Kenya"
      },
      {
        "flag": "🇲🇺",
        "name": "Mauritius"
      },
      {
        "flag": "🇲🇦",
        "name": "Morocco"
      },
      {
        "flag": "🇿🇦",
        "name": "South Africa"
      }
    ]
  }
];

export const explorationCards = [
  {
    "title": "Worldwide Search",
    "subtitle": "Homes for Sale and for rent.",
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuAVpXJs7K5rhKAHwuj0H555DdM1LmvJE6-KpNJakSV1Ocn59Dfij9UVgotrKU9REZAVfIApOcUaIVME1N-3qVeQcAWU8hAxXnotbZv6mTiAynmAqufC4x6YwdUG-P_h8OVd2SLS1a_9FgfmSaQKLw1c7Vf1tuIpy_FaQzZbxm_-8DRME0dqYdFYonK8zD6C79Ymh8mkIau45PWRZuurnN3o-3dKSJTEWlhD9ZW7nYiZdUfA_IOPoZm1"
  },
  {
    "title": "Destinations",
    "subtitle": "Noteworthy cities and regions.",
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuCHcnYPI8Pwm88H1LI6qg9CNbMVKGfevn7-am4N517EOyJNCRsCnFf8UiaqxCqgpPxRtEc7480lgOSgRXt_FoaKJ4_S1QYxRF7q34nCUeamJQShcArr8ke1YShL2e1QgvsePveY93gAnBIF5hbw_dPFBFf7eg8uIggLNiqqXzgMCbuPJRf6Fp2RIldVMMs1ReTvlTCioFvTkY3iI-xnsge9Yg7NUyTIlFfGwqZuCpgMaBleKHRyWmEW"
  },
  {
    "title": "Developments",
    "subtitle": "Global developments & resorts.",
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuAFKlJfRb_KzfV76_VDtBinzagIPsRAYmOXcZbyv91yI9iBzE7sH3hZMuSXtPEBhpabUrzzFXUKZO4GbsUmem9tltRKNRB-6VbQhvteXc7ZlnhWJs4_DxfZIrXHAL-XpPKFkdMCOj4A96eYFL5CTHmQMTohnYmlAbwWTrqATnZoX9-mSf4W42Hs0i2wIE5bI4I5K5yVpJ3n663gFjet7RN8S-6qYvRUbciSkN_fFE35YpBa7Ap04Rlk"
  }
];
