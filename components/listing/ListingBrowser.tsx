'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Property } from '@/lib/types';
import {
  EMPTY_QUERY,
  SORT_LABELS,
  applyQueryWithFallback,
  describeQuery,
  parseSmartQuery,
  type SearchQuery,
  type SortKey,
} from '@/lib/smart-search';
import { FilterSidebar } from '@/components/listing/FilterSidebar';
import { ListingCard } from '@/components/listing/ListingCard';
import { MapView } from '@/components/listing/MapView';
import { useSession } from '@/lib/store';

interface ListingBrowserProps {
  title: string;
  source: Property[];
  /** Locks the 3D/360° requirement on, as the Tours page does. */
  lockTour?: boolean;
  perPage?: number;
  cardVariant?: 'tour' | 'sale';
  columns?: 2 | 3;
}

/**
 * The shared results surface: filter rail, toolbar, grid/map toggle, pagination.
 *
 * Query state lives in the URL so a filtered view is linkable and survives a
 * refresh; `q` carries the natural-language string and the structured params
 * carry whatever the user set by hand.
 */
export function ListingBrowser({
  title,
  source,
  lockTour = false,
  perPage = 24,
  cardVariant = 'sale',
  columns = 3,
}: ListingBrowserProps) {
  const router = useRouter();
  const params = useSearchParams();
  const saveSearch = useSession((state) => state.saveSearch);

  const [query, setQuery] = useState<SearchQuery>(() => hydrate(params, lockTour));
  const [sort, setSort] = useState<SortKey>((params.get('sort') as SortKey) ?? 'default');
  const [view, setView] = useState<'grid' | 'map'>(
    params.get('view') === 'map' ? 'map' : 'grid',
  );
  const [page, setPage] = useState(Number(params.get('page') ?? 1));
  const [smartText, setSmartText] = useState(params.get('q') ?? '');

  // Re-hydrate when the URL changes underneath us (back button, nav links).
  // `view` and `sort` belong to the URL too — leaving them out meant going back
  // from the map returned the grid's query but kept the map on screen.
  useEffect(() => {
    setQuery(hydrate(params, lockTour));
    setSmartText(params.get('q') ?? '');
    setPage(Number(params.get('page') ?? 1));
    setSort((params.get('sort') as SortKey) ?? 'default');
    setView(params.get('view') === 'map' ? 'map' : 'grid');
  }, [params, lockTour]);

  const countries = useMemo(
    () => Array.from(new Set(source.map((p) => p.country))).sort(),
    [source],
  );

  const { results, relaxed, dropped } = useMemo(
    () => applyQueryWithFallback(source, query, sort),
    [source, query, sort],
  );
  const chips = useMemo(() => describeQuery(query), [query]);

  const pageCount = Math.max(1, Math.ceil(results.length / perPage));
  const safePage = Math.min(page, pageCount);
  const pageItems = results.slice((safePage - 1) * perPage, safePage * perPage);

  const pushState = useCallback(
    (next: SearchQuery, nextSort: SortKey, nextView: 'grid' | 'map', nextPage: number, text: string) => {
      const search = new URLSearchParams();
      if (text) search.set('q', text);
      if (next.beds) search.set('beds', String(next.beds));
      if (next.baths) search.set('baths', String(next.baths));
      if (next.minAcres) search.set('acres', String(next.minAcres));
      if (next.maxPrice) search.set('max', String(next.maxPrice));
      if (next.minPrice) search.set('min', String(next.minPrice));
      if (next.country) search.set('country', next.country);
      if (next.region) search.set('region', next.region);
      if (next.city) search.set('city', next.city);
      if (next.type) search.set('type', next.type);
      if (next.status) search.set('status', next.status);
      if (next.tags.length) search.set('tag', next.tags.join('|'));
      if (next.requireVideo) search.set('media', 'video');
      if (next.requireRegents) search.set('regents', '1');
      if (next.requireOpenHouse) search.set('open', '1');
      if (!lockTour && next.requireTour) search.set('tour', '1');
      if (nextSort !== 'default') search.set('sort', nextSort);
      if (nextView === 'map') search.set('view', 'map');
      if (nextPage > 1) search.set('page', String(nextPage));
      router.replace(`?${search.toString()}`, { scroll: false });
    },
    [router, lockTour],
  );

  const update = (patch: Partial<SearchQuery>) => {
    const next = { ...query, ...patch };
    setQuery(next);
    setPage(1);
    pushState(next, sort, view, 1, smartText);
  };

  const runSmartSearch = () => {
    const parsed = parseSmartQuery(smartText, {
      ...EMPTY_QUERY,
      requireTour: lockTour,
    });
    setQuery(parsed);
    setPage(1);
    pushState(parsed, sort, view, 1, smartText);
  };

  const clear = () => {
    const next = { ...EMPTY_QUERY, requireTour: lockTour };
    setQuery(next);
    setSmartText('');
    setPage(1);
    pushState(next, sort, view, 1, '');
  };

  const save = () => {
    const search = new URLSearchParams(window.location.search);
    saveSearch({
      id: `${title}:${search.toString()}`,
      label: chips.length ? chips.join(' · ') : `All ${title}`,
      href: `${window.location.pathname}?${search.toString()}`,
    });
  };

  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(1, next), pageCount);
    setPage(clamped);
    pushState(query, sort, view, clamped, smartText);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main
      id="main"
      className="mx-auto flex max-w-wide flex-col gap-7 px-4 py-6 md:px-6 lg:flex-row"
    >
      <FilterSidebar
        query={{ ...query, text: smartText }}
        countries={countries}
        onChange={(patch) => {
          if ('text' in patch) {
            setSmartText(patch.text ?? '');
            return;
          }
          update(patch);
        }}
        onSearch={runSmartSearch}
        onClear={clear}
        onSave={save}
        resultCount={results.length}
        lockTour={lockTour}
      />

      <div className="min-w-0 flex-1" data-purpose="listings-container">
        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <h1 className="font-serif-title text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            {title}
          </h1>
          <div className="flex items-center space-x-3 text-[12px]">
            <span className="font-medium text-gray-500">Sort By</span>
            <select
              value={sort}
              onChange={(event) => {
                const next = event.target.value as SortKey;
                setSort(next);
                pushState(query, next, view, 1, smartText);
                setPage(1);
              }}
              className="custom-select rounded border border-gray-300 bg-white py-1 pl-2 pr-6 text-[11px] text-gray-700"
              aria-label="Sort results"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>

            <div className="flex items-center overflow-hidden rounded border border-gray-300 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setView('grid');
                  pushState(query, sort, 'grid', safePage, smartText);
                }}
                className={`p-1.5 ${view === 'grid' ? 'bg-slate-700 text-white' : 'bg-white text-gray-500 hover:text-gray-800'}`}
                title="Grid view"
                aria-pressed={view === 'grid'}
              >
                <i className="fa-solid fa-table-cells-large text-[12px]" aria-hidden="true" />
                <span className="sr-only">Grid view</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setView('map');
                  pushState(query, sort, 'map', safePage, smartText);
                }}
                className={`p-1.5 ${view === 'map' ? 'bg-slate-700 text-white' : 'bg-white text-gray-500 hover:text-gray-800'}`}
                title="Map view"
                aria-pressed={view === 'map'}
              >
                <i className="fa-solid fa-earth-americas text-[12px]" aria-hidden="true" />
                <span className="sr-only">Map view</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
              Filtering by
            </span>
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-[10.5px] text-gray-700"
              >
                {chip}
              </span>
            ))}
            <button
              type="button"
              onClick={clear}
              className="ml-1 text-[10.5px] text-[#1a6fa0] hover:underline"
            >
              Reset
            </button>
          </div>
        )}

        {/* When nothing matched exactly, say so rather than silently widening. */}
        {relaxed && results.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900">
            <i className="fa-solid fa-circle-info text-amber-600" aria-hidden="true" />
            <span>
              No exact matches. Showing the closest listings by relaxing{' '}
              <strong className="font-semibold">{dropped.join(', ')}</strong>.
            </span>
            <button
              type="button"
              onClick={clear}
              className="ml-auto font-semibold underline"
            >
              Start over
            </button>
          </div>
        )}

        {view === 'map' ? (
          <MapView properties={results} />
        ) : pageItems.length === 0 ? (
          <div className="rounded-sm border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
            <i className="fa-solid fa-house-circle-xmark text-2xl text-gray-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-700">No listings match those filters</p>
            <p className="mt-1 text-[12px] text-gray-500">
              Try widening the price range or clearing a characteristic.
            </p>
            <button
              type="button"
              onClick={clear}
              className="mt-4 rounded-sm bg-[#2c333a] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#1f2429]"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div
            className={[
              'grid grid-cols-1 gap-5 md:grid-cols-2',
              columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
            ].join(' ')}
            data-purpose="cards-grid"
          >
            {pageItems.map((property, index) => (
              <ListingCard
                key={property.slug}
                property={property}
                variant={cardVariant}
                priority={index < 3}
              />
            ))}
          </div>
        )}

        {view === 'grid' && results.length > 0 && (
          <Pagination
            page={safePage}
            pageCount={pageCount}
            total={results.length}
            perPage={perPage}
            onChange={goToPage}
          />
        )}
      </div>
    </main>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  perPage,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}) {
  const windowed = pageWindow(page, pageCount);
  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);

  return (
    <div className="mt-8 flex flex-col items-center gap-2" data-purpose="pagination">
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <PageButton disabled={page === 1} onClick={() => onChange(page - 1)} label="Previous">
          <i className="fa-solid fa-chevron-left text-[10px]" aria-hidden="true" />
        </PageButton>
        {windowed.map((entry, index) =>
          entry === '…' ? (
            <span key={`gap-${index}`} className="px-1.5 text-[11px] text-gray-400">
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onChange(entry)}
              aria-current={entry === page ? 'page' : undefined}
              className={[
                'h-7 min-w-[28px] rounded border px-2 text-[11px] transition-colors',
                entry === page
                  ? 'border-slate-700 bg-slate-700 font-semibold text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400',
              ].join(' ')}
            >
              {entry}
            </button>
          ),
        )}
        <PageButton disabled={page === pageCount} onClick={() => onChange(page + 1)} label="Next">
          <i className="fa-solid fa-chevron-right text-[10px]" aria-hidden="true" />
        </PageButton>
      </nav>
      <p className="text-[11px] text-gray-500">
        {first} - {last} of {total.toLocaleString('en-US')} Listings
      </p>
    </div>
  );
}

function PageButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 transition-colors hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function pageWindow(page: number, pageCount: number): (number | '…')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) out.push('…');
  for (let i = start; i <= end; i += 1) out.push(i);
  if (end < pageCount - 1) out.push('…');
  out.push(pageCount);
  return out;
}

function hydrate(params: URLSearchParams, lockTour: boolean): SearchQuery {
  const text = params.get('q') ?? '';
  const base: SearchQuery = text
    ? parseSmartQuery(text, { ...EMPTY_QUERY, requireTour: lockTour })
    : { ...EMPTY_QUERY, requireTour: lockTour, tags: [] };

  const number = (key: string) => {
    const value = params.get(key);
    return value ? Number(value) : undefined;
  };

  return {
    ...base,
    beds: number('beds') ?? base.beds,
    baths: number('baths') ?? base.baths,
    minAcres: number('acres') ?? base.minAcres,
    minPrice: number('min') ?? base.minPrice,
    maxPrice: number('max') ?? base.maxPrice,
    country: params.get('country') ?? base.country,
    region: params.get('region') ?? base.region,
    city: params.get('city') ?? base.city,
    type: params.get('type') ?? base.type,
    status: params.get('status') ?? base.status,
    tags: params.get('tag') ? params.get('tag')!.split('|') : base.tags,
    requireTour: lockTour || params.get('tour') === '1' || base.requireTour,
    requireVideo: params.get('media') === 'video' || base.requireVideo,
    requireRegents: params.get('regents') === '1' || base.requireRegents,
    requireOpenHouse: params.get('open') === '1' || base.requireOpenHouse,
  };
}
