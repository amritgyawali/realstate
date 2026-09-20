'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { propertyBySlug } from '@/lib/data/properties';
import { ListingCard } from '@/components/listing/ListingCard';
import { useSession } from '@/lib/store';

/**
 * Personal board: saved listings, saved searches and recently viewed.
 *
 * Everything here lives in the persisted client store, so it renders only after
 * hydration — a server pass would have nothing to show and would flash empty.
 */
export function FavoritesBoard() {
  const [hydrated, setHydrated] = useState(false);
  const favorites = useSession((state) => state.favorites);
  const recentlyViewed = useSession((state) => state.recentlyViewed);
  const savedSearches = useSession((state) => state.savedSearches);
  const removeSearch = useSession((state) => state.removeSearch);
  const visitedNodes = useSession((state) => state.visitedNodes);

  useEffect(() => setHydrated(true), []);

  const saved = favorites.map((slug) => propertyBySlug.get(slug)).filter(Boolean);
  const recent = recentlyViewed.map((slug) => propertyBySlug.get(slug)).filter(Boolean);
  const roomsWalked = visitedNodes.length;

  if (!hydrated) {
    return <main id="main" className="mx-auto min-h-[50vh] max-w-page px-4 py-10 md:px-8" />;
  }

  return (
    <main id="main" className="mx-auto max-w-page px-4 py-8 md:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="font-serif-title text-2xl font-normal text-gray-900 md:text-[28px]">
            Your Board
          </h1>
          <p className="mt-1 text-[12px] text-gray-500">
            Saved privately in this browser — nothing leaves your device.
          </p>
        </div>
        <dl className="flex gap-6 text-center">
          {[
            [String(saved.length), 'Saved'],
            [String(recent.length), 'Viewed'],
            [String(roomsWalked), 'Rooms walked'],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="font-serif-title text-xl text-gray-900">{value}</dt>
              <dd className="text-[10px] uppercase tracking-[0.14em] text-ink-300">{label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section className="mb-12">
        <h2 className="mb-4 font-serif-title text-xl text-gray-900">Saved Listings</h2>
        {saved.length === 0 ? (
          <EmptyState
            icon="fa-heart"
            title="Nothing saved yet"
            body="Tap the heart on any listing card to keep it here."
            href="/homes-for-sale"
            cta="Browse listings"
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {saved.map((property) => (
              <ListingCard key={property!.slug} property={property!} variant="compact" />
            ))}
          </div>
        )}
      </section>

      <section className="mb-12">
        <h2 className="mb-4 font-serif-title text-xl text-gray-900">Saved Searches</h2>
        {savedSearches.length === 0 ? (
          <EmptyState
            icon="fa-bookmark"
            title="No saved searches"
            body="Use “Save Search” in the filter rail to keep a set of filters."
            href="/tours"
            cta="Open 3D/360° tours"
          />
        ) : (
          <ul className="divide-y divide-gray-100 rounded-sm border border-gray-200">
            {savedSearches.map((search) => (
              <li key={search.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <Link href={search.href} className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-gray-900 hover:underline">
                    {search.label}
                  </span>
                  <span className="block text-[11px] text-ink-300">
                    Saved {new Date(search.savedAt).toLocaleDateString('en-US')}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => removeSearch(search.id)}
                  className="text-[11px] text-ink-300 transition-colors hover:text-rose-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recent.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 font-serif-title text-xl text-gray-900">Recently Viewed</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recent.slice(0, 8).map((property) => (
              <ListingCard key={property!.slug} property={property!} variant="compact" />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function EmptyState({
  icon,
  title,
  body,
  href,
  cta,
}: {
  icon: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-sm border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
      <i className={`fa-solid ${icon} text-2xl text-gray-300`} aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-gray-700">{title}</p>
      <p className="mt-1 text-[12px] text-gray-500">{body}</p>
      <Link
        href={href}
        className="mt-4 inline-block rounded-sm bg-[#2c333a] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#1f2429]"
      >
        {cta}
      </Link>
    </div>
  );
}
