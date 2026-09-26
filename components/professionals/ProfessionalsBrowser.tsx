'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Agent } from '@/lib/types';
import { properties } from '@/lib/data/properties';
import { AgentPortrait } from '@/components/professionals/AgentPortrait';

const PER_PAGE = 24;

/** Professionals directory: filter rail, portrait grid, pagination. */
export function ProfessionalsBrowser({ agents }: { agents: Agent[] }) {
  const [text, setText] = useState('');
  const [country, setCountry] = useState('');
  const [membership, setMembership] = useState('All Members');
  const [languages, setLanguages] = useState<string[]>([]);
  const [sort, setSort] = useState<'default' | 'name' | 'listings'>('default');
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<Agent | null>(null);

  const listingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    properties.forEach((property) => {
      counts.set(property.agentSlug, (counts.get(property.agentSlug) ?? 0) + 1);
    });
    return counts;
  }, []);

  // Offer the languages the members actually speak, so no box filters to nothing.
  const languageOptions = useMemo(
    () => Array.from(new Set(agents.flatMap((agent) => agent.languages))).sort(),
    [agents],
  );

  const countries = useMemo(
    () =>
      Array.from(
        new Set(agents.map((agent) => agent.location.split(',').pop()?.trim() ?? '')),
      )
        .filter(Boolean)
        .sort(),
    [agents],
  );

  const results = useMemo(() => {
    const needle = text.trim().toLowerCase();
    const filtered = agents.filter((agent) => {
      if (needle && !`${agent.name} ${agent.firm} ${agent.location}`.toLowerCase().includes(needle))
        return false;
      if (country && !agent.location.endsWith(country)) return false;
      if (membership === 'Regents Only' && !agent.regents) return false;
      if (languages.length && !languages.every((language) => agent.languages.includes(language)))
        return false;
      return true;
    });

    if (sort === 'name') return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'listings')
      return [...filtered].sort(
        (a, b) => (listingCounts.get(b.slug) ?? 0) - (listingCounts.get(a.slug) ?? 0),
      );
    return filtered;
  }, [agents, text, country, membership, languages, sort, listingCounts]);

  const pageCount = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const pageItems = results.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const toggleLanguage = (language: string) => {
    setLanguages((current) =>
      current.includes(language)
        ? current.filter((item) => item !== language)
        : [...current, language],
    );
    setPage(1);
  };

  return (
    <main id="main" className="mx-auto flex max-w-wide flex-col gap-7 px-4 py-6 md:px-6 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-[240px]">
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
              className="w-full rounded-l border border-gray-300 bg-white py-1.5 pl-8 pr-2 text-[11px] placeholder-gray-400 focus:border-slate-600 focus:ring-1 focus:ring-slate-600"
              placeholder="Location, Company, Keyword, etc."
              type="text"
              aria-label="Search professionals"
            />
          </div>
          <button
            type="button"
            className="rounded-r bg-[#3b4856] px-3 text-[11px] font-medium text-white transition-colors hover:bg-[#2c3641]"
          >
            Search
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setText('');
              setCountry('');
              setMembership('All Members');
              setLanguages([]);
              setPage(1);
            }}
            className="flex flex-1 items-center justify-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[10px] text-gray-700 hover:bg-gray-50"
          >
            <i className="fa-solid fa-rotate-left text-[10px] text-gray-500" aria-hidden="true" />
            Clear Search
          </button>
        </div>

        <div className="mb-4">
          <h3 className="mb-2 border-b border-gray-200 pb-1 text-[13px] font-bold text-gray-800">
            Location
          </h3>
          <select
            value={country}
            onChange={(event) => {
              setCountry(event.target.value);
              setPage(1);
            }}
            className="custom-select w-full rounded border border-gray-300 bg-white py-1 pl-2 pr-5 text-[11px] text-gray-700"
            aria-label="Country"
          >
            <option value="">Country</option>
            {countries.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <h3 className="mb-2 border-b border-gray-200 pb-1 text-[13px] font-bold text-gray-800">
            Characteristics
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="filter-label">Account Type</label>
              <select
                className="custom-select w-full rounded border border-gray-300 bg-white py-1 pl-2 pr-5 text-[11px] text-gray-700"
                defaultValue="Any"
              >
                <option>Any</option>
                <option>Agent</option>
                <option>Team</option>
                <option>Brokerage</option>
              </select>
            </div>
            <div>
              <label className="filter-label">Members</label>
              <select
                value={membership}
                onChange={(event) => {
                  setMembership(event.target.value);
                  setPage(1);
                }}
                className="custom-select w-full rounded border border-gray-300 bg-white py-1 pl-2 pr-5 text-[11px] text-gray-700"
              >
                <option>All Members</option>
                <option>Regents Only</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 border-b border-gray-200 pb-1 text-[13px] font-bold text-gray-800">
            Languages
          </h3>
          <div className="grid grid-cols-1 gap-y-1.5 text-[11px] text-gray-600">
            {languageOptions.map((language) => (
              <label key={language} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  className="custom-checkbox h-3 w-3 border-gray-300 text-slate-800"
                  checked={languages.includes(language)}
                  onChange={() => toggleLanguage(language)}
                />
                <span>{language}</span>
              </label>
            ))}
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <h1 className="font-serif-title text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Luxury Professionals
          </h1>
          <div className="flex items-center gap-3 text-[12px]">
            <span className="font-medium text-gray-500">Sort By</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="custom-select rounded border border-gray-300 bg-white py-1 pl-2 pr-6 text-[11px] text-gray-700"
              aria-label="Sort professionals"
            >
              <option value="default">Default</option>
              <option value="name">Name A–Z</option>
              <option value="listings">Most Listings</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((agent) => (
            <article
              key={agent.slug}
              id={agent.slug}
              className="group relative flex flex-col overflow-hidden rounded border border-gray-200 bg-white transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => setActive(agent)}
                className="relative aspect-square w-full overflow-hidden bg-stone-100 text-left"
              >
                <AgentPortrait
                  agent={agent}
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                  className="transition-transform duration-300 group-hover:scale-[1.02]"
                />
                {agent.regents && (
                  <span className="absolute inset-x-0 bottom-0 bg-[#1f2429]/90 py-1 text-center font-crest text-[9px] font-semibold uppercase tracking-[0.16em] text-white">
                    Regents Showcase
                  </span>
                )}
              </button>
              <div className="relative flex flex-1 flex-col justify-between p-4">
                <div>
                  <h2 className="text-[14px] font-bold tracking-tight text-gray-900">
                    {agent.name}
                  </h2>
                  <p className="mt-1 text-xs font-normal text-gray-500">{agent.firm}</p>
                  <p className="text-[11px] text-ink-300">{agent.location}</p>
                </div>
                <div className="mt-3 flex items-center gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActive(agent)}
                    className="text-sky-700 hover:underline"
                  >
                    View profile
                  </button>
                  <span className="text-gray-300">|</span>
                  <Link
                    href={`/homes-for-sale?q=${encodeURIComponent(agent.firm)}`}
                    className="text-sky-700 hover:underline"
                  >
                    {listingCounts.get(agent.slug) ?? 0} listings
                  </Link>
                </div>
                <i
                  className="fa-solid fa-shield-halved absolute bottom-3 right-3 text-2xl text-gray-300 opacity-60"
                  aria-hidden="true"
                />
              </div>
            </article>
          ))}
        </div>

        {results.length === 0 && (
          <div className="rounded-sm border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
            <p className="text-sm font-semibold text-gray-700">No professionals match those filters</p>
          </div>
        )}

        {pageCount > 1 && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <nav className="flex items-center gap-1" aria-label="Pagination">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setPage(safePage - 1)}
                className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 disabled:opacity-40"
                aria-label="Previous page"
              >
                <i className="fa-solid fa-chevron-left text-[10px]" aria-hidden="true" />
              </button>
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
              <button
                type="button"
                disabled={safePage === pageCount}
                onClick={() => setPage(safePage + 1)}
                className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 disabled:opacity-40"
                aria-label="Next page"
              >
                <i className="fa-solid fa-chevron-right text-[10px]" aria-hidden="true" />
              </button>
            </nav>
            <p className="text-[11px] text-gray-500">
              {(safePage - 1) * PER_PAGE + 1} - {Math.min(safePage * PER_PAGE, results.length)} of{' '}
              {results.length} Profiles
            </p>
          </div>
        )}
      </div>

      {/* Profile drawer */}
      {active && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${active.name} profile`}
          onClick={(event) => {
            if (event.target === event.currentTarget) setActive(null);
          }}
        >
          <div className="w-full max-w-lg animate-fade-up overflow-hidden rounded-sm bg-white shadow-pill">
            <div className="relative h-56 bg-gray-100">
              <AgentPortrait agent={active} sizes="512px" />
              <button
                type="button"
                onClick={() => setActive(null)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/80"
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
              </button>
            </div>
            <div className="p-5">
              <h2 className="font-serif-title text-xl text-gray-900">{active.name}</h2>
              <p className="text-[12px] text-gray-500">
                {active.title} · {active.firm}
              </p>
              <p className="text-[11px] text-ink-300">{active.location}</p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-gray-600">{active.bio}</p>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 text-[11.5px]">
                <div>
                  <dt className="text-ink-300">Phone</dt>
                  <dd className="font-medium text-gray-800">{active.phone}</dd>
                </div>
                <div>
                  <dt className="text-ink-300">Email</dt>
                  <dd className="truncate font-medium text-gray-800">{active.email}</dd>
                </div>
                <div>
                  <dt className="text-ink-300">Languages</dt>
                  <dd className="font-medium text-gray-800">{active.languages.join(', ')}</dd>
                </div>
                <div>
                  <dt className="text-ink-300">Active listings</dt>
                  <dd className="font-medium text-gray-800">
                    {listingCounts.get(active.slug) ?? 0}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex gap-2">
                <a
                  href={`mailto:${active.email}`}
                  className="flex-1 rounded-sm bg-[#2c333a] py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#1f2429]"
                >
                  Contact
                </a>
                <Link
                  href={`/homes-for-sale?q=${encodeURIComponent(active.firm)}`}
                  className="flex-1 rounded-sm border border-gray-300 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-700 transition-colors hover:bg-gray-50"
                >
                  See listings
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
