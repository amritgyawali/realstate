import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ListingBrowser } from '@/components/listing/ListingBrowser';
import { ListingSkeleton } from '@/components/listing/ListingSkeleton';
import { properties } from '@/lib/data/properties';

export const metadata: Metadata = {
  title: 'Homes For Sale',
  description:
    'Search houses and villas for sale in Nepal and India — filter by price, bedrooms, characteristics and 3D/360° tour availability.',
};

export default function HomesForSalePage() {
  return (
    <>
      <SiteHeader variant="compact" />
      <Suspense fallback={<ListingSkeleton title="Homes For Sale" />}>
        <ListingBrowser title="Homes For Sale" source={properties} cardVariant="sale" />
      </Suspense>
      <SiteFooter />
    </>
  );
}
