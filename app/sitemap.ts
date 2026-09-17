import type { MetadataRoute } from 'next';
import { properties } from '@/lib/data/properties';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luxuryrealestate.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const statics: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/homes-for-sale`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/tours`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/destinations`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/professionals`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/press-releases`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const listings: MetadataRoute.Sitemap = properties.flatMap((property) => {
    const entries: MetadataRoute.Sitemap = [
      {
        url: `${BASE}/property/${property.slug}`,
        lastModified: new Date(property.listedOn),
        changeFrequency: 'weekly',
        priority: 0.8,
      },
    ];
    if (property.hasTour) {
      entries.push({
        url: `${BASE}/property/${property.slug}/tour`,
        lastModified: new Date(property.listedOn),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
    return entries;
  });

  return [...statics, ...listings];
}
