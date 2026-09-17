import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TourViewer } from '@/components/tour/TourViewer';
import { properties, propertyBySlug } from '@/lib/data/properties';
import { getTour } from '@/lib/data/tours';
import { Crest } from '@/components/layout/Crest';
import { locationLabel } from '@/lib/format';

export function generateStaticParams() {
  return properties.filter((p) => p.hasTour).map((property) => ({ slug: property.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = propertyBySlug.get(slug);
  if (!property) return { title: 'Tour not found' };
  return {
    title: `360° Walkover — ${property.title}`,
    description: `Walk through ${property.title} in ${locationLabel(property)} room by room in 3D and 360°.`,
  };
}

/**
 * Full-viewport immersive walkover. Deliberately chrome-free: no site header or
 * footer, so the panorama owns the whole screen the way a real tour should.
 */
export default async function ImmersiveTourPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = propertyBySlug.get(slug);
  if (!property) notFound();

  const index = properties.findIndex((p) => p.slug === property.slug);
  const tour = getTour(property.slug, index);

  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-950">
      <header className="flex items-center justify-between border-b border-white/10 bg-[#16181b] px-4 py-2.5 text-white">
        <Link href="/" className="flex items-center gap-2.5">
          <Crest className="h-7 w-6 text-white" />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-[7px] font-medium uppercase tracking-[0.25em] text-gray-400">
              Who&rsquo;s Who In
            </span>
            <span className="font-serif-title text-[13px] font-semibold tracking-[0.12em]">
              LUXURY REAL ESTATE
            </span>
          </span>
        </Link>

        <div className="min-w-0 px-3 text-center">
          <p className="truncate font-serif-title text-sm">{property.title}</p>
          <p className="truncate text-[10px] uppercase tracking-widest text-white/50">
            {locationLabel(property)}
          </p>
        </div>

        <Link
          href={`/property/${property.slug}`}
          className="flex shrink-0 items-center gap-2 rounded-full border border-white/25 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors hover:bg-white hover:text-neutral-900"
        >
          <i className="fa-solid fa-arrow-left text-[10px]" aria-hidden="true" />
          <span className="hidden sm:inline">Listing details</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </header>

      <main id="main" className="relative min-h-0 flex-1">
        <TourViewer property={property} tour={tour} layout="immersive" />
      </main>
    </div>
  );
}
