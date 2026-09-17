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
    default: "Who's Who in Luxury Real Estate | Global Luxury Homes & 360° Tours",
    template: '%s | Who’s Who in Luxury Real Estate',
  },
  description:
    'Search the world’s finest homes and walk through them in 3D/360°. Immersive virtual walkover tours, curated destinations and a vetted global network of luxury brokerages.',
  keywords: [
    'luxury real estate',
    '3D tours',
    '360 virtual tour',
    'virtual walkthrough',
    'Matterport',
    'luxury homes for sale',
    'international property',
  ],
  openGraph: {
    type: 'website',
    siteName: "Who's Who in Luxury Real Estate",
    title: "Who's Who in Luxury Real Estate",
    description:
      'Walk through the world’s finest homes in 3D/360° — anywhere, on any device.',
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
