import { properties } from '@/lib/data/properties';
import type { Property } from '@/lib/types';

/**
 * Hero carousel slides.
 *
 * The grid thumbnails are cropped tight for cards; the hero needs wide,
 * full-bleed frames, so each slide pairs a real listing with the landscape
 * photography from the reference screens.
 */
const HERO_FRAMES: { slug: string; image: string; alt: string }[] = [
  {
    "slug": "747-w-pacific-avenue-unit-540-telluride",
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuBPzTVpkG70xMrlnysGoglkaq8oNU3fiyTo8IdkI3yA1F8c3GLMSnxwfJxGjMiW45Al6YQGuSnQhbj245RYiOfRuL5Un2mnnle3-NIjGg_gxNA8I3t_d-tv_WL_ZQb3VP7rbfc0xC3c5IS79OZmcaOOWm1wuJg3599AgvaR91UAqt3ciCSG_fA3yPIYuDJ3iX5TRwo0Qa884nxdYHocWWf7UPN2pFI3roHk8ejQQIgsfb0PsFUQRmsc",
    "alt": "Luxury Villa Estate at Twilight"
  },
  {
    "slug": "508-e-lionshead-circle-unit-502-vail",
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuD9CYPQJMwK_jZAYyGiInY-Q2UCMa_a7Dp5SjTqjVymHdyGhSwpYTaFOw81j2ldt1fxEl59xEvnj6bUhO4Gsza-tzuAPiNtZhm2vmiVSneRVgEiNww5dVREfIe_2N9bsW0IKJ9WM6CrhHfcipqK06oxog76JSeWRcsHZ07L45jOspV3hYgbLdYH7g5G7Ap-u77uUCH_OYKnvVGlIFGdhQy9pVxCWgLlP0NYsKcpdMvmdXWBP7EqHrWj",
    "alt": "Snow Mountain Lodge Exterior"
  },
  {
    "slug": "cala-vinyes-spain",
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuBXsed-Q6yHNj88kDqf-_wuPieWKnKiwlRJ0jsTtU80N0SwusKOhdhO4UuYaxCZ4fqFoNZ5Er4M9JIDHOcHNqVKEl1VBgXuPj32V1QNfI2VsiBUICK8cAEpGr_JtphUdlI8g9ilye05zA5BGh2PaKTD6UjjjtgEngJuAw2x0iHCAotJA7g41qPEsBmdwcGf4osst0bLh4foQT3BsC2eOZlTMfO0xY1hLdR0JkxsDWF1hSs-J9Sqk_6j",
    "alt": "San Miguel de Allende illuminated cathedral sunset view"
  },
  {
    "slug": "11966-rockview-point-street-las-vegas",
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuC979f3hYlcuWRzaftVX4O899Ypd8hCfqZObyg0mJDihzpU4fqTcnabe2QKtIfAHfeWWfW8LhY0GeoFFYLw09WxPTbtdkdBoK102-gbZblJvP9ZL5gFBzFGGRjRqiR9xcSw8T_cjQwphdEMdZSS_hHQguZPpQgzej5q64uKi2NXBfCEQHx4aH4doCUfrd89ELzsSel_uZKG8mYjINafkLXx-0li2jneOIWQK2gT_tLqOve7NysN8zCU",
    "alt": "Sydney Harbour with the Opera House and Harbour Bridge"
  },
  {
    "slug": "4278-moosehollow-road-park-city",
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuAUNgZILtPgoscsfwYtRoSeCQKASHvMOsuRN1Kqpy48VVPcL1LbFUekud_9JUYDPHkYZDCRCz2TGiWpBczj2puvuhjGrVm-FarHepL46Avd76BWaKToPXSs1SmsWI7-E23pTFCP14WM4MfR4eXbNzwflZF4GCjC5_0Wjx9w5UNIHFdySMDy7pge2uE8b97C2E9WbLul2VIATKOyrMulGBGXw6YJUpG2adYim_RLjG28nOlTXk7an5IK",
    "alt": "Sunset Mountain Peaks"
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
