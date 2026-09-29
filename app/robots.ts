import { SITE_URL } from '@/lib/site-url';
import type { MetadataRoute } from 'next';

const BASE = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/account', '/favorites'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
