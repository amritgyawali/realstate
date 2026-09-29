/**
 * Canonical origin for sitemap.xml and robots.txt. Uses NEXT_PUBLIC_SITE_URL when
 * set, then the Vercel production domain, then the deployment URL, so a fresh
 * Vercel deploy emits correct links with no configuration.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  'https://www.luxuryrealestate.com'
).replace(/\/$/, '');
