import Link from 'next/link';
import Image from 'next/image';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { SectionHeading } from '@/components/home/SectionHeading';
import { TourShowcase } from '@/components/home/TourShowcase';
import { ListingCard } from '@/components/listing/ListingCard';
import { AgentPortrait } from '@/components/professionals/AgentPortrait';
import { properties, tourProperties } from '@/lib/data/properties';
import { agents } from '@/lib/data/agents';
import { destinations } from '@/lib/data/destinations';
import { pressReleases } from '@/lib/data/press';
import { blogPosts } from '@/lib/data/editorial';
import { territoryGroups, worldwideIntro, explorationCards } from '@/lib/data/worldwide';
import { getTour } from '@/lib/data/tours';
import { heroSlides } from '@/lib/data/hero';

export default function HomePage() {
  const topHighlights = properties.slice(24, 28);
  const featuredPros = agents.slice(0, 5);
  const featuredDestinations = destinations.slice(0, 4);
  const noteworthy = properties.slice(28, 36);
  const moreToDiscover = properties.slice(36, 44);

  const showcaseSlugs = [
    '747-w-pacific-avenue-unit-540-telluride',
    'cala-vinyes-spain',
    '11966-rockview-point-street-las-vegas',
  ];
  const showcase = showcaseSlugs
    .map((slug, index) => {
      const property = properties.find((p) => p.slug === slug) ?? tourProperties[index];
      return { property, tour: getTour(property.slug, index) };
    })
    .filter((entry) => Boolean(entry.property));

  return (
    <>
      <SiteHeader variant="banner" />
      <HeroCarousel slides={heroSlides} />

      <main id="main">
        {/* Four-across highlights */}
        <section
          className="mx-auto max-w-page px-4 pb-12 pt-16 md:px-8"
          data-purpose="featured-top-listings"
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {topHighlights.map((property, index) => (
              <ListingCard
                key={property.slug}
                property={property}
                variant="compact"
                priority={index < 2}
              />
            ))}
          </div>
        </section>

        <TourShowcase entries={showcase} />

        {/* Featured Professionals */}
        <section
          className="mx-auto max-w-page px-4 py-10 md:px-8"
          data-purpose="featured-professionals"
        >
          <SectionHeading title="Featured Professionals" action={{ label: 'All Professionals', href: '/professionals' }} />
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {featuredPros.map((agent) => (
              <Link
                key={agent.slug}
                href={`/professionals#${agent.slug}`}
                className="flex flex-col rounded border border-gray-200 bg-white p-2.5 transition-colors hover:border-slate-400"
              >
                <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded bg-slate-100">
                  <AgentPortrait agent={agent} sizes="(min-width: 1024px) 18vw, 45vw" />
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{agent.name}</h4>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-slate-600">
                      {agent.firm}
                    </p>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400">{agent.location}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Press & blog */}
        <section
          className="mx-auto max-w-page px-4 py-8 md:px-8"
          data-purpose="editorial-updates"
        >
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 border-b border-gray-200 pb-2 font-serif-title text-lg font-semibold text-slate-900 md:text-xl">
                Recent Press Releases
              </h3>
              <div className="space-y-4 text-xs">
                {pressReleases.slice(0, 5).map((release) => (
                  <div key={release.slug}>
                    <Link
                      href={`/press-releases#${release.slug}`}
                      className="font-semibold leading-relaxed text-blue-700 hover:underline"
                    >
                      {release.title}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <i className="fa-regular fa-clock" aria-hidden="true" /> {release.date}
                      {release.source ? ` — ${release.source}` : ''}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <Link
                  href="/press-releases"
                  className="inline-block rounded bg-[#4c545c] px-4 py-1.5 text-xs text-white transition-colors hover:bg-[#373e44]"
                >
                  All Press Releases
                </Link>
              </div>
            </div>

            <div>
              <h3 className="mb-4 border-b border-gray-200 pb-2 font-serif-title text-lg font-semibold text-slate-900 md:text-xl">
                Recent Blog Posts
              </h3>
              <div className="space-y-4 text-xs">
                {blogPosts.map((post) => (
                  <div key={post.slug}>
                    <Link
                      href="/press-releases#blog"
                      className="font-semibold leading-relaxed text-blue-700 hover:underline"
                    >
                      {post.title}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <i className="fa-regular fa-clock" aria-hidden="true" /> {post.date}
                      {post.author ? ` — Posted By ${post.author}` : ''}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <Link
                  href="/press-releases#blog"
                  className="inline-block rounded bg-[#4c545c] px-4 py-1.5 text-xs text-white transition-colors hover:bg-[#373e44]"
                >
                  All Blog Posts
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Destinations */}
        <section
          className="mx-auto max-w-page px-4 py-10 md:px-8"
          data-purpose="destinations-overview"
        >
          <SectionHeading
            title="Featured Destinations"
            action={{ label: 'View All Destinations', href: '/destinations' }}
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredDestinations.map((destination) => (
              <Link
                key={destination.slug}
                href={`/destinations#${destination.slug}`}
                className="group block overflow-hidden rounded"
              >
                <div className="relative h-44 overflow-hidden rounded">
                  <Image
                    src={destination.image}
                    alt={destination.name}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="img-zoom object-cover"
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-800 transition-colors group-hover:text-blue-600">
                  {destination.name}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Noteworthy Listings */}
        <section
          className="mx-auto max-w-page px-4 py-8 md:px-8"
          data-purpose="noteworthy-listings-grid"
        >
          <SectionHeading
            title="Recent Noteworthy Listings"
            action={{ label: 'More Recent Additions', href: '/homes-for-sale?sort=newest' }}
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {noteworthy.map((property) => (
              <ListingCard key={property.slug} property={property} variant="compact" />
            ))}
          </div>
        </section>

        {/* More to Discover */}
        <section
          className="mx-auto max-w-page px-4 py-8 md:px-8"
          data-purpose="more-to-discover-grid"
        >
          <SectionHeading title="More to Discover" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {moreToDiscover.map((property) => (
              <ListingCard key={property.slug} property={property} variant="compact" />
            ))}
          </div>
        </section>

        {/* Worldwide Luxury */}
        <section
          className="relative border-b border-t border-gray-200 bg-slate-50 py-12"
          data-purpose="worldwide-directory"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(#000_1px,transparent_1px)] opacity-[0.035] [background-size:16px_16px]"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-page px-4 md:px-8">
            <div className="mb-8">
              <h2 className="mb-2 font-serif-title text-xl font-medium text-slate-900 md:text-2xl">
                Worldwide Luxury
              </h2>
              <p className="max-w-5xl text-xs leading-relaxed text-slate-600">{worldwideIntro}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs text-slate-700 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              <div>
                {territoryGroups.slice(0, 4).map((group) => (
                  <TerritoryList key={group.region} group={group} />
                ))}
              </div>
              <div>
                <TerritoryList group={territoryGroups[4]} />
              </div>
              <div>
                <TerritoryList group={territoryGroups[5]} />
              </div>
              <div>
                {territoryGroups.slice(6).map((group) => (
                  <TerritoryList key={group.region} group={group} />
                ))}
              </div>

              <div className="col-span-2 flex flex-col space-y-4">
                {explorationCards.map((card, index) => (
                  <Link
                    key={card.title}
                    href={index === 1 ? '/destinations' : index === 2 ? '/destinations' : '/homes-for-sale'}
                    className="group block overflow-hidden rounded border border-gray-200 bg-white transition-colors hover:border-slate-400"
                  >
                    <div className="relative h-28 overflow-hidden">
                      <Image
                        src={card.image}
                        alt={card.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-3">
                      <h5 className="text-xs font-bold text-slate-900">{card.title}</h5>
                      <p className="text-[11px] text-slate-500">{card.subtitle}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function TerritoryList({
  group,
}: {
  group: { region: string; countries: { flag: string; name: string }[] };
}) {
  return (
    <>
      <h4 className="mb-2 border-b border-gray-200 pb-1 font-bold text-slate-900 first:mt-0 [&:not(:first-child)]:mt-5">
        {group.region}
      </h4>
      <ul className="space-y-1.5 text-[11px]">
        {group.countries.map((country) => (
          <li key={`${group.region}-${country.name}`}>
            <Link
              href={`/homes-for-sale?country=${encodeURIComponent(country.name)}`}
              className="flex items-center gap-1.5 hover:text-blue-600"
            >
              <span aria-hidden="true">{country.flag}</span> {country.name}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
