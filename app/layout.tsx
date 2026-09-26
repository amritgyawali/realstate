import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Montserrat, Cinzel } from 'next/font/google';
import './globals.css';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { CompareTray } from '@/components/ui/CompareTray';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cinzel',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.luxuryrealestate.com'),
  title: {
    default: "Who's Who in Luxury Real Estate | Houses & Villas in Nepal and India, in 3D/360°",
    template: '%s | Who’s Who in Luxury Real Estate',
  },
  description:
    'Houses, villas and heritage homes in Nepal and India, every one walkable in 3D/360° — from the lakeshore at Pokhara to the havelis of Shekhawati.',
  keywords: [
    'luxury real estate',
    '3D tours',
    '360 virtual tour',
    'virtual walkthrough',
    'Matterport',
    'luxury homes for sale',
    'Nepal real estate',
    'India real estate',
    'house for sale Kathmandu',
    'villa for sale Goa',
  ],
  openGraph: {
    type: 'website',
    siteName: "Who's Who in Luxury Real Estate",
    title: "Who's Who in Luxury Real Estate",
    description:
      'Walk through houses and villas in Nepal and India in 3D/360° — anywhere, on any device.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0C1013',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${montserrat.variable} ${cinzel.variable} scroll-smooth`}
    >
      <body className="flex min-h-screen flex-col bg-sand-50 text-ink-700 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xs focus:bg-gold-500 focus:px-5 focus:py-2.5 focus:text-[11px] focus:font-semibold focus:uppercase focus:tracking-[0.16em] focus:text-ink-900"
        >
          Skip to content
        </a>
        {children}
        <CommandPalette />
        <CompareTray />
      </body>
    </html>
  );
}
