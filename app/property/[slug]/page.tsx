import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { MediaStage } from '@/components/property/MediaStage';
import { InquiryForm } from '@/components/property/InquiryForm';
import { PropertyPriceHeader } from '@/components/property/PropertyPriceHeader';
import { LocationMap } from '@/components/property/LocationMap';
import { ViewRecorder } from '@/components/property/ViewRecorder';
import { ListingCard } from '@/components/listing/ListingCard';
import { AgentPortrait } from '@/components/professionals/AgentPortrait';
import { properties, propertyBySlug } from '@/lib/data/properties';
import { agentBySlug } from '@/lib/data/agents';
import { getTour } from '@/lib/data/tours';
import { captureNodes } from '@/lib/tour/layout';
import { RegentsStar } from '@/components/layout/Crest';
import { formatArea, formatDate, locationLabel } from '@/lib/format';

export function generateStaticParams() {
  return properties.map((property) => ({ slug: property.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = propertyBySlug.get(slug);
  if (!property) return { title: 'Listing not found' };
  return {
    title: `${property.title}, ${locationLabel(property)}`,
    description: property.description.slice(0, 180),
    openGraph: {
      title: property.title,
      description: property.headline,
      images: [{ url: property.image }],
    },
  };
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = propertyBySlug.get(slug);
  if (!property) notFound();

  const agent = agentBySlug.get(property.agentSlug) ?? agentBySlug.values().next().value!;
  const tourIndex = properties.findIndex((p) => p.slug === property.slug);
  const tour = getTour(property.slug, tourIndex);

  const similar = properties
    .filter(
      (candidate) =>
        candidate.slug !== property.slug &&
        (candidate.country === property.country || candidate.type === property.type),
    )
    .slice(0, 4);

  const details: [string, string][] = [
    ['Residential', property.type],
    ['Bedrooms', String(property.beds)],
    ['Total Baths', String(property.baths)],
    ['Source ID', property.sourceId],
    ['Living Area', formatArea(property.sqft)],
    ['County', property.county],
  ];
  const detailsRight: [string, string][] = [
    ['Listing Status', property.status],
    ['Full Baths', String(property.fullBaths)],
    ['Lot Size', `${property.lotAcres} acres`],
    ['LRE® ID', String(property.lreId)],
    ['Built', String(property.year)],
    ['Listed', formatDate(property.listedOn)],
  ];

  return (
    <>
      <SiteHeader variant="compact" />
      <ViewRecorder slug={property.slug} />

      <main id="main" className="mx-auto max-w-page px-4 py-4 sm:px-6">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-3 flex flex-wrap items-center gap-x-1.5 text-[11px] text-gray-500"
        >
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>&gt;</span>
          <Link href="/homes-for-sale" className="hover:underline">
            Search Results
          </Link>
          <span>&gt;</span>
          <Link
            href={`/homes-for-sale?country=${encodeURIComponent(property.country)}`}
            className="hover:underline"
          >
            {property.country}
          </Link>
          <span>&gt;</span>
          <Link
            href={`/homes-for-sale?city=${encodeURIComponent(property.city)}`}
            className="hover:underline"
          >
            {property.city}
          </Link>
          <span>&gt;</span>
          <span className="font-medium text-gray-700">{property.sourceId}</span>
        </nav>

        <PropertyPriceHeader property={property} />

        <MediaStage property={property} tour={tour} />

        {/* Two-column body */}
        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-7 lg:col-span-8">
            <section className="border-b border-gray-200 pb-7" data-purpose="property-description">
              <h2 className="mb-3 border-b border-gray-200 pb-1.5 font-serif-title text-[20px] font-normal text-gray-900">
                Description
              </h2>
              <h3 className="mb-3 font-serif-title text-[18px] font-normal text-gray-900">
                {property.headline}
              </h3>
              <p className="text-justify text-[13px] leading-relaxed text-gray-600">
                {property.description}
              </p>
              {property.tags.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {property.tags.map((tag) => (
                    <li key={tag}>
                      <Link
                        href={`/homes-for-sale?tag=${encodeURIComponent(tag)}`}
                        className="inline-block rounded-full border border-gray-300 px-2.5 py-0.5 text-[10.5px] text-gray-600 transition-colors hover:border-[#0f2b48] hover:text-[#0f2b48]"
                      >
                        {tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="border-b border-gray-200 pb-7" data-purpose="property-details">
              <h2 className="mb-4 border-b border-gray-200 pb-1.5 font-serif-title text-[20px] font-normal text-gray-900">
                Details
              </h2>
              <div className="grid grid-cols-1 gap-x-10 text-[13px] md:grid-cols-2">
                <dl className="divide-y divide-gray-100">
                  {details.map(([label, value]) => (
                    <div key={label} className="flex justify-between py-2">
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="font-medium text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
                <dl className="divide-y divide-gray-100">
                  {detailsRight.map(([label, value]) => (
                    <div key={label} className="flex justify-between py-2">
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="font-medium text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>

            <section className="border-b border-gray-200 pb-7" data-purpose="property-features">
              <h2 className="mb-4 border-b border-gray-200 pb-1.5 font-serif-title text-[20px] font-normal text-gray-900">
                Features
              </h2>
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 text-[13px] md:grid-cols-2">
                <div>
                  <h4 className="mb-1 font-semibold text-gray-800">Amenities</h4>
                  <p className="text-gray-600">{property.amenities.join(', ')}.</p>
                </div>
                <div>
                  <h4 className="mb-1 font-semibold text-gray-800">General Features</h4>
                  <p className="text-gray-600">{property.generalFeatures}</p>
                </div>
                <div>
                  <h4 className="mb-1 font-semibold text-gray-800">Appliances</h4>
                  <p className="text-gray-600">{property.appliances}</p>
                </div>
                <div>
                  <h4 className="mb-1 font-semibold text-gray-800">Categories</h4>
                  <p className="text-gray-600">{property.tags.join(', ')}.</p>
                </div>
              </div>
            </section>

            <section data-purpose="additional-resources">
              <h2 className="mb-4 border-b border-gray-200 pb-1.5 font-serif-title text-[20px] font-normal text-gray-900">
                Additional Resources
              </h2>
              {property.hasTour && (
                <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 text-[12.5px] md:grid-cols-2">
                  <Resource
                    label="3D Walkover"
                    href={`/property/${property.slug}/tour`}
                    note={`${tour.title} — ${captureNodes(tour).length} capture points`}
                  />
                </div>
              )}

              {/* The feed carries no URL for these, and a link to nowhere reads
                  as live until it is clicked. Name them once, quietly, instead
                  of printing four dead rows. */}
              <p className={`text-[11px] leading-relaxed text-ink-300 ${property.hasTour ? 'mt-4' : ''}`}>
                Not supplied for this listing: corporate website, LRE® property website
                {property.hasVideo ? ', property video' : ''}, landing page.
              </p>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:col-span-4">
            <div data-purpose="agent-card">
              <h2 className="mb-4 border-b border-gray-200 pb-1.5 font-serif-title text-[20px] font-normal text-gray-900">
                Presented By
              </h2>
              <div className="rounded-sm border border-gray-200 p-4">
                <div className="flex items-start space-x-3.5">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden border border-gray-100 bg-gray-100">
                    <AgentPortrait agent={agent} sizes="80px" />
                  </div>
                  <div className="space-y-1 text-[11.5px] leading-snug">
                    <h3 className="text-xs font-bold text-gray-900">{agent.name}</h3>
                    <p className="text-gray-600">
                      {agent.address.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </p>
                    <p className="text-gray-800">
                      Main:{' '}
                      <a
                        className="hover:underline"
                        href={`tel:${agent.phone.replace(/\s/g, '')}`}
                      >
                        {agent.phone}
                      </a>
                    </p>
                  </div>
                </div>
                <div className="mt-3.5 flex items-center space-x-2 text-[11px]">
                  <a
                    href={`mailto:${agent.email}`}
                    className="flex-1 rounded-sm border border-gray-300 px-2 py-1 text-center text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Send Inquiry
                  </a>
                  <Link
                    href={`/professionals#${agent.slug}`}
                    className="flex-1 rounded-sm border border-gray-300 px-2 py-1 text-center text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            </div>

            <div
              className="space-y-3 rounded-sm border border-gray-200 p-4 text-[11.5px]"
              data-purpose="brokerage-card"
            >
              <h3 className="text-xs font-semibold text-gray-800">{property.agency}</h3>
              <div className="flex items-center space-x-3">
                <div className="flex h-20 w-28 shrink-0 flex-col items-center justify-center bg-[#002244] p-3 text-center text-white">
                  <span className="font-serif-title text-lg font-bold leading-tight tracking-widest">
                    {initials(property.agency)}
                  </span>
                  <span className="mt-1 font-serif-title text-[8px] uppercase tracking-wider">
                    Member
                  </span>
                  <span className="font-serif-title text-[5.5px] uppercase tracking-tight text-gray-300">
                    International Realty
                  </span>
                </div>
                <div className="space-y-0.5 leading-snug text-gray-600">
                  <p>Main {agent.phone}</p>
                  <p className="mt-1">
                    {agent.address.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>

            {property.regents && (
              <div
                className="flex flex-col items-center justify-center border-b border-t border-gray-100 py-2"
                data-purpose="board-of-regents-logo"
              >
                <div className="flex items-center space-x-2 text-gray-800">
                  <RegentsStar className="h-8 w-8 text-[#b89535]" />
                  <div>
                    <div className="font-serif-title text-[9px] uppercase tracking-widest text-gray-500">
                      Board of
                    </div>
                    <div className="-mt-1 font-serif-title text-base font-bold tracking-widest text-gray-800">
                      REGENTS
                    </div>
                  </div>
                </div>
                <div className="mt-0.5 font-serif-title text-[7.5px] uppercase tracking-[0.2em] text-gray-600">
                  Who&rsquo;s Who In Luxury Real Estate
                </div>
              </div>
            )}

            {/* The member's own site is not in the feed, so this points at the
                brokerage's profile here rather than at a dead `#`. */}
            <Link
              href={`/professionals#${agent.slug}`}
              className="block rounded-sm border border-sky-200 bg-sky-50/50 p-2 text-center transition-colors hover:bg-sky-50"
            >
              <span className="flex items-center justify-center gap-1 text-xs text-sky-800">
                <i className="fa-solid fa-arrow-right text-sky-700" aria-hidden="true" />
                <span className="font-medium">More from this member</span>
              </span>
              <span className="block text-[10px] text-gray-500">{property.agency}</span>
            </Link>

            <InquiryForm property={property} agent={agent} />
          </div>
        </div>

        <LocationMap property={property} />

        {/* Similar listings */}
        {similar.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 border-b border-gray-200 pb-1.5 font-serif-title text-[20px] font-normal text-gray-900">
              Similar Properties
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((candidate) => (
                <ListingCard key={candidate.slug} property={candidate} variant="compact" />
              ))}
            </div>
          </section>
        )}

        <section className="mb-10 text-[10px] leading-relaxed text-ink-300">
          <h2 className="mb-1.5 text-[11px] font-semibold text-gray-600">Disclaimers</h2>
          <p className="mb-1">Last updated: {formatDate(property.listedOn)}</p>
          <p className="italic">
            To the fullest extent permissible pursuant to applicable law, this web site and the
            materials are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
            LuxuryRealEstate.com expressly disclaims all warranties of any kind, whether expressed,
            implied, or statutory including, but not limited to, the implied warranties of
            merchantability, fitness for a particular purpose and non-infringement. Converted prices
            are for informational purposes only.
          </p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * A resource row.
 *
 * Feeds do not carry a URL for every one of these — a listing may have no
 * corporate site on file — and a link to `#` is worse than no link: it reads as
 * live, and clicking it does nothing. Without an `href` the row states that the
 * resource was not supplied, the way the rest of the build is explicit about
 * what is not wired up.
 */
function Resource({ label, href, note }: { label: string; href: string; note?: string }) {
  return (
    <div>
      <Link
        href={href}
        className="flex items-center gap-1 font-medium text-sky-700 hover:underline"
      >
        <i className="fa-solid fa-arrow-up-right-from-square text-[11px] text-sky-600" aria-hidden="true" />
        <span>{label}</span>
      </Link>
      {note && <p className="ml-5 text-[11px] text-gray-500">{note}</p>}
    </div>
  );
}

function initials(agency: string) {
  return agency
    .split(/\s+/)
    .slice(0, 3)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}
