import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FavoritesBoard } from '@/components/ui/FavoritesBoard';

export const metadata: Metadata = {
  title: 'Saved Listings',
  description: 'Your saved listings, saved searches and recently viewed properties.',
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return (
    <>
      <SiteHeader variant="compact" />
      <FavoritesBoard />
      <SiteFooter />
    </>
  );
}
