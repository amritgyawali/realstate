export interface NavChild {
  label: string;
  href: string;
  blurb?: string;
}

export interface NavGroup {
  label: string;
  href: string;
  columns: { heading: string; items: NavChild[] }[];
  /** Optional promo tile rendered on the right edge of the mega menu. */
  feature?: { title: string; blurb: string; href: string; image: string };
}

/** Top-level navigation, matching the five menus in every reference screen. */
export const primaryNav: NavGroup[] = [
  {
    label: 'Listings',
    href: '/homes-for-sale',
    columns: [
      {
        heading: 'Properties',
        items: [
          { label: 'Homes For Sale', href: '/homes-for-sale' },
          { label: 'Private Islands', href: '/homes-for-sale?tag=Private+Islands' },
          { label: 'Farm & Ranch', href: '/homes-for-sale?type=Farm+%26+Ranch' },
          { label: 'Lots & Land', href: '/homes-for-sale?type=Lots+%26+Land' },
          { label: 'Long Term Rentals', href: '/homes-for-sale' },
          { label: 'Short Term Rentals', href: '/homes-for-sale' },
        ],
      },
      {
        heading: 'Immersive',
        items: [
          { label: '3D/360° Tours', href: '/tours', blurb: 'Walk any listing end to end' },
          { label: 'Property Videos', href: '/tours?media=video' },
          { label: 'Open Houses', href: '/tours?media=open' },
          { label: 'Auction Properties', href: '/homes-for-sale?status=Auction' },
        ],
      },
    ],
    feature: {
      title: 'Virtual Walkover',
      blurb: 'Step inside 22 scanned rooms across three flagship estates — no plugin, no app.',
      href: '/tours',
      image: '/panoramas/lythwood_lounge-preview.jpg',
    },
  },
  {
    label: 'Our Network',
    href: '/professionals',
    columns: [
      {
        heading: 'Members & Partners',
        items: [
          { label: 'Agencies', href: '/professionals' },
          { label: 'Professionals', href: '/professionals' },
          { label: 'Partners', href: '/professionals' },
        ],
      },
      {
        heading: 'Recognition',
        items: [
          { label: 'The Board of Regents', href: '/about#regents' },
          { label: 'LRE® Executive Committee', href: '/about#committee' },
          { label: 'Awards & Accolades', href: '/about#awards' },
        ],
      },
    ],
  },
  {
    label: 'Discover',
    href: '/destinations',
    columns: [
      {
        heading: 'Discover',
        items: [
          { label: 'Destinations', href: '/destinations' },
          { label: 'Developments', href: '/destinations' },
          { label: '3D/360° Tours', href: '/tours' },
          { label: 'Property Videos', href: '/tours?media=video' },
        ],
      },
      {
        heading: 'Regions',
        items: [
          { label: 'Americas', href: '/destinations?region=Americas' },
          { label: 'Caribbean', href: '/destinations?region=Caribbean' },
          { label: 'Europe', href: '/destinations?region=Europe' },
          { label: 'South Pacific', href: '/destinations?region=South+Pacific' },
        ],
      },
    ],
  },
  {
    label: 'Media & Events',
    href: '/press-releases',
    columns: [
      {
        heading: 'Media & Events',
        items: [
          { label: 'Luxury Real Estate Blog', href: '/press-releases#blog' },
          { label: 'Press Releases', href: '/press-releases' },
          { label: 'LRE® Week in Review', href: '/press-releases#week-in-review' },
          { label: 'Luxury Real Estate Magazine', href: '/press-releases#magazine' },
          { label: 'LRE® Events', href: '/press-releases#events' },
          { label: 'LRE® Award Recipients', href: '/about#awards' },
        ],
      },
    ],
  },
  {
    label: 'About',
    href: '/about',
    columns: [
      {
        heading: 'About',
        items: [
          { label: 'About LRE®', href: '/about' },
          { label: 'The Board of Regents', href: '/about#regents' },
          { label: 'LRE® Executive Committee', href: '/about#committee' },
          { label: 'LRE® in the Media', href: '/about#media' },
          { label: 'Awards & Accolades', href: '/about#awards' },
          { label: 'Contact Us', href: '/about#contact' },
        ],
      },
    ],
  },
];

export interface FooterColumn {
  heading: string;
  items: NavChild[];
}

/** Footer link ledger, identical across every reference page. */
export const footerColumns: FooterColumn[][] = [
  [
    {
      heading: 'Social',
      items: [
        { label: 'Facebook', href: '#' },
        { label: 'Instagram', href: '#' },
        { label: 'LinkedIn', href: '#' },
        { label: 'Pinterest', href: '#' },
        { label: 'X', href: '#' },
        { label: 'YouTube', href: '#' },
      ],
    },
    {
      heading: 'Legal',
      items: [
        { label: 'Terms & Conditions', href: '#' },
        { label: 'Privacy Policy', href: '#' },
        { label: 'Disclaimer', href: '#' },
      ],
    },
  ],
  [
    {
      heading: 'Help',
      items: [
        { label: 'Inquiries', href: '#' },
        { label: 'Report a bug', href: '#' },
        { label: 'Luxury Lounge', href: '#' },
      ],
    },
    {
      heading: 'Properties',
      items: [
        { label: 'Homes For Sale', href: '/homes-for-sale' },
        { label: 'Private Islands', href: '/homes-for-sale?tag=Private+Islands' },
        { label: 'Farm & Ranch', href: '/homes-for-sale?type=Farm+%26+Ranch' },
        { label: 'Lots & Land', href: '/homes-for-sale?type=Lots+%26+Land' },
        { label: 'Long Term Rentals', href: '/homes-for-sale' },
        { label: 'Short Term Rentals', href: '/homes-for-sale' },
      ],
    },
  ],
  [
    {
      heading: 'Members & Partners',
      items: [
        { label: 'Agencies', href: '/professionals' },
        { label: 'Professionals', href: '/professionals' },
        { label: 'Partners', href: '/professionals' },
      ],
    },
    {
      heading: 'Discover',
      items: [
        { label: 'Destinations', href: '/destinations' },
        { label: 'Developments', href: '/destinations' },
        { label: '3D/360° Tours', href: '/tours' },
        { label: 'Property Videos', href: '/tours?media=video' },
      ],
    },
  ],
  [
    {
      heading: 'Media & Events',
      items: [
        { label: 'Luxury Real Estate Blog', href: '/press-releases#blog' },
        { label: 'Press Releases', href: '/press-releases' },
        { label: 'LRE® Week in Review', href: '/press-releases#week-in-review' },
        { label: 'Luxury Real Estate Magazine', href: '/press-releases#magazine' },
        { label: 'LRE® Events', href: '/press-releases#events' },
        { label: 'LRE® Award Recipients', href: '/about#awards' },
      ],
    },
  ],
  [
    {
      heading: 'About',
      items: [
        { label: 'About LRE®', href: '/about' },
        { label: 'The Board of Regents', href: '/about#regents' },
        { label: 'LRE® Executive Committee', href: '/about#committee' },
        { label: 'LRE® in the Media', href: '/about#media' },
        { label: 'Awards & Accolades', href: '/about#awards' },
        { label: 'Contact Us', href: '/about#contact' },
      ],
    },
  ],
];

export const socialIcons: Record<string, string> = {
  Facebook: 'fa-brands fa-facebook-f',
  Instagram: 'fa-brands fa-instagram',
  LinkedIn: 'fa-brands fa-linkedin-in',
  Pinterest: 'fa-brands fa-pinterest-p',
  X: 'fa-brands fa-x-twitter',
  YouTube: 'fa-brands fa-youtube',
};
