import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ListingBrowser } from '@/components/listing/ListingBrowser';
import { ListingSkeleton } from '@/components/listing/ListingSkeleton';
import { properties, tourProperties } from '@/lib/data/properties';
import { getTour } from '@/lib/data/tours';
import { captureNodes } from '@/lib/tour/layout';

export const metadata: Metadata = {
  title: '3D/360° Tours',
  description:
    'Walk through luxury homes in 3D and 360°. Step-by-step virtual walkover tours — from the street, through the front door and up the stairs — with floor plans, dollhouse view and on-screen measurement. No plugin required.',
};

const HEADER_BACKDROP =
  properties.find((p) => p.hasTour)?.image ?? properties[0].image;

export default function ToursPage() {
  const featured = tourProperties.slice(0, 3).map((property, index) => ({
    property,
    tour: getTour(property.slug, index),
  }));

  return (
    <>
      <SiteHeader variant="compact" backdrop={HEADER_BACKDROP} />

      {/* Walkover primer — explains what the tours actually do */}
      <section className="border-b border-gray-200 bg-[#111315] py-8 text-white">
        <div className="mx-auto max-w-wide px-4 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-1 font-crest text-[10px] uppercase tracking-[0.3em] text-[#c5a869]">
                Virtual Walkover
              </p>
              <h2 className="font-serif-title text-2xl">
                {tourProperties.length} listings you can walk through right now
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[11px] sm:grid-cols-4">
              {[
                ['fa-person-walking', 'Step-by-step walk'],
                ['fa-table-cells-large', 'Floor plan & dollhouse'],
                ['fa-ruler', 'On-screen measuring'],
                ['fa-vr-cardboard', 'Matterport-ready'],
              ].map(([icon, label]) => (
                <span key={label} className="flex items-center gap-2 text-white/70">
                  <i className={`fa-solid ${icon} text-[#c5a869]`} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {featured.map(({ property, tour }) => (
              <Link
                key={property.slug}
                href={`/property/${property.slug}/tour`}
                className="group relative flex h-28 items-end overflow-hidden rounded-sm border border-white/12"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/panoramas/${captureNodes(tour)[0].pano}-preview.jpg`}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                <span className="relative p-3">
                  <span className="block text-[12px] font-semibold">{tour.title}</span>
                  <span className="block text-[10px] uppercase tracking-widest text-white/60">
                    {captureNodes(tour).length} rooms · {tour.floors.length} levels
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Suspense fallback={<ListingSkeleton title="3D/360° Tours" />}>
        <ListingBrowser
          title="3D/360° Tours"
          source={properties}
          lockTour
          cardVariant="tour"
        />
      </Suspense>
      <SiteFooter />
    </>
  );
}
