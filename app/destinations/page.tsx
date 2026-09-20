import type { Metadata } from 'next';
import { Photo } from '@/components/ui/Photo';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { DestinationsGrid } from '@/components/destinations/DestinationsGrid';
import { destinations } from '@/lib/data/destinations';
import { properties } from '@/lib/data/properties';

export const metadata: Metadata = {
  title: 'Destinations',
  description:
    'Explore noteworthy cities, coastlines and mountain regions, and the luxury homes for sale in each.',
};

export default function DestinationsPage() {
  const hero = destinations.find((d) => d.name === 'Mexico') ?? destinations[0];
  const spotlight = properties.filter((p) => p.hasTour).slice(0, 3);

  return (
    <>
      <SiteHeader variant="banner" sticky={false} />

      {/* Hero */}
      <section className="relative h-[340px] w-full overflow-hidden bg-neutral-900 sm:h-[420px]">
        <Photo
          src={hero.image}
          alt={hero.name}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/25" />
        <div className="absolute bottom-8 left-6 max-w-md border border-white/10 bg-black/55 p-5 text-white backdrop-blur-sm sm:left-12">
          <h1 className="font-serif-title text-2xl">{hero.name}</h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-200">{hero.description}</p>
          <Link
            href={`/homes-for-sale?q=${encodeURIComponent(hero.name)}`}
            className="mt-4 inline-block bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-900 transition-colors hover:bg-gray-200"
          >
            More Information
          </Link>
        </div>
      </section>

      <DestinationsGrid destinations={destinations} />

      {/* Walk-a-destination strip */}
      <section className="border-t border-gray-200 bg-slate-50 py-12">
        <div className="mx-auto max-w-page px-4 md:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-2">
            <h2 className="font-serif-title text-xl font-medium text-slate-900 md:text-2xl">
              Walk a destination
            </h2>
            <Link
              href="/tours"
              className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
            >
              All 3D/360° tours ›
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {spotlight.map((property) => (
              <Link
                key={property.slug}
                href={`/property/${property.slug}/tour`}
                className="group relative block aspect-[4/3] overflow-hidden rounded-sm"
              >
                <Photo
                  src={property.image}
                  alt={property.title}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <span className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#e0c98f]">
                    <i className="fa-solid fa-cube" aria-hidden="true" />
                    360° Walkover
                  </span>
                  <span className="block font-serif-title text-base">{property.title}</span>
                  <span className="block text-[11px] text-white/70">
                    {property.city}, {property.country}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
