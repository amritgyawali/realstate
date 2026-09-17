'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Destination } from '@/lib/types';

const REGION_GROUPS: { heading: string; regions: string[] }[] = [
  { heading: 'Americas', regions: ['North America', 'Caribbean', 'Central America'] },
  { heading: 'Europe', regions: ['Western Europe', 'Northern Europe', 'Southern Europe'] },
  { heading: 'South Pacific', regions: ['Australia & New Zealand'] },
  { heading: 'Asia', regions: ['South-Eastern Asia'] },
  { heading: 'Middle East', regions: ['United Arab Emirates', 'Israel'] },
];

const REGION_OF: Record<string, string> = {
  Americas: 'Americas',
  Caribbean: 'Caribbean',
  Europe: 'Europe',
  'South Pacific': 'South Pacific',
  'Middle East': 'Middle East',
};

const PER_PAGE = 12;

/** Destinations grid with the left filter rail from the reference screen. */
export function DestinationsGrid({ destinations }: { destinations: Destination[] }) {
  const [text, setText] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const results = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return destinations.filter((destination) => {
      if (needle && !`${destination.name} ${destination.description}`.toLowerCase().includes(needle))
        return false;
      if (selected.length) {
        const headings = selected
          .map((region) =>
            REGION_GROUPS.find((group) => group.regions.includes(region))?.heading ?? region,
          )
          .map((heading) => REGION_OF[heading] ?? heading);
        if (!headings.includes(destination.region)) return false;
      }
      return true;
    });
  }, [destinations, text, selected]);

  const pageCount = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const pageItems = results.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const toggle = (region: string) => {
    setSelected((current) =>
      current.includes(region) ? current.filter((item) => item !== region) : [...current, region],
    );
    setPage(1);
  };

  return (
    <main id="main" className="mx-auto flex max-w-page flex-col gap-8 px-4 py-8 md:px-8 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-[220px]">
        <div className="mb-2 flex">
          <div className="relative flex-grow">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">
              <i className="fa-solid fa-magnifying-glass text-[11px]" aria-hidden="true" />
            </span>
            <input
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setPage(1);
              }}
              className="w-full rounded border border-gray-300 bg-white py-1.5 pl-8 pr-2 text-[11px] placeholder-gray-400 focus:border-slate-600 focus:ring-1 focus:ring-slate-600"
              placeholder="Location, Company, Keyword, etc."
              type="text"
              aria-label="Search destinations"
            />
          </div>
        </div>
        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setText('');
              setSelected([]);
              setPage(1);
            }}
            className="flex flex-1 items-center justify-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[10px] text-gray-700 hover:bg-gray-50"
          >
            <i className="fa-solid fa-rotate-left text-[10px] text-gray-500" aria-hidden="true" />
            Clear Search
          </button>
          <button
            type="button"
            className="flex-1 rounded bg-[#3b4856] px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-[#2c3641]"
          >
            Search
          </button>
        </div>

        {REGION_GROUPS.map((group) => (
          <div key={group.heading} className="mb-5">
            <h3 className="mb-2 border-b border-gray-200 pb-1 text-[13px] font-bold text-gray-800">
              {group.heading}
            </h3>
            <div className="space-y-1.5 text-[11px] text-gray-600">
              {group.regions.map((region) => (
                <label key={region} className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    className="custom-checkbox h-3 w-3 border-gray-300 text-slate-800"
                    checked={selected.includes(region)}
                    onChange={() => toggle(region)}
                  />
                  <span>{region}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <div className="min-w-0 flex-1">
        <h2 className="mb-6 font-serif-title text-2xl font-medium text-gray-900 md:text-3xl">
          Destinations
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((destination) => (
            <article
              key={destination.slug}
              id={destination.slug}
              className="group overflow-hidden rounded-sm border border-gray-200 bg-white transition-shadow hover:shadow-md"
            >
              <Link href={`/homes-for-sale?q=${encodeURIComponent(destination.name)}`}>
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                  <Image
                    src={destination.image}
                    alt={destination.name}
                    fill
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[9.5px] font-semibold text-white backdrop-blur-sm">
                    {destination.listingCount.toLocaleString('en-US')} listings
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="mb-2 text-base font-bold text-gray-900">{destination.name}</h3>
                  <p className="text-[12px] leading-relaxed text-gray-500">
                    {destination.description}
                  </p>
                </div>
              </Link>
            </article>
          ))}
        </div>

        {results.length === 0 && (
          <div className="rounded-sm border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
            <p className="text-sm font-semibold text-gray-700">No destinations match that search</p>
          </div>
        )}

        {pageCount > 1 && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <nav className="flex items-center gap-1" aria-label="Pagination">
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setPage(entry)}
                  aria-current={entry === safePage ? 'page' : undefined}
                  className={[
                    'h-7 min-w-[28px] rounded border px-2 text-[11px]',
                    entry === safePage
                      ? 'border-slate-700 bg-slate-700 font-semibold text-white'
                      : 'border-gray-300 bg-white text-gray-600',
                  ].join(' ')}
                >
                  {entry}
                </button>
              ))}
            </nav>
            <p className="text-[11px] text-gray-500">
              {(safePage - 1) * PER_PAGE + 1} - {Math.min(safePage * PER_PAGE, results.length)} of{' '}
              {results.length} Results
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
