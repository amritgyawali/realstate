'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { properties } from '@/lib/data/properties';
import { describeQuery, parseSmartQuery, suggest } from '@/lib/smart-search';
import { compactPrice, locationLabel } from '@/lib/format';
import { useSession } from '@/lib/store';

const CATEGORIES = [
  { label: 'Homes For Sale', href: '/homes-for-sale' },
  { label: '3D/360° Tours', href: '/tours' },
  { label: 'Private Islands', href: '/homes-for-sale?tag=Private+Islands' },
  { label: 'Farm & Ranch', href: '/homes-for-sale?type=Farm+%26+Ranch' },
  { label: 'Lots & Land', href: '/homes-for-sale?type=Lots+%26+Land' },
];

/**
 * Floating search console over the hero.
 *
 * Accepts plain sentences, shows how the query was understood as chips, and
 * offers live listing suggestions — the same parser the listing pages use, so
 * what you see here is what you get on the results page.
 */
export function HeroSearchConsole() {
  const router = useRouter();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [locating, setLocating] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currency = useSession((state) => state.currency);

  const parsed = useMemo(() => parseSmartQuery(text), [text]);
  const chips = useMemo(() => (text.trim() ? describeQuery(parsed) : []), [parsed, text]);
  const hits = useMemo(() => suggest(properties, text, 5), [text]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setFocused(false);
        setCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submit = () => {
    const params = new URLSearchParams();
    if (text.trim()) params.set('q', text.trim());
    const base = category.href.split('?')[0];
    const preset = new URLSearchParams(category.href.split('?')[1] ?? '');
    preset.forEach((value, key) => params.set(key, value));
    router.push(`${base}?${params.toString()}`);
  };

  /** Uses the browser's geolocation to seed the query with a coarse position. */
  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearest = [...properties].sort(
          (a, b) =>
            Math.hypot(a.lat - latitude, a.lng - longitude) -
            Math.hypot(b.lat - latitude, b.lng - longitude),
        )[0];
        if (nearest) setText(nearest.country);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  return (
    <div
      ref={containerRef}
      className="absolute bottom-6 left-1/2 z-30 w-[92%] max-w-[1080px] -translate-x-1/2"
      data-purpose="hero-search-bar"
    >
      <div className="flex flex-col items-stretch overflow-visible rounded-sm border border-neutral-200 bg-white shadow-2xl md:flex-row">
        {/* Category */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setCategoryOpen((open) => !open)}
            className="flex w-full min-w-[180px] cursor-pointer items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-gray-700 md:border-b-0 md:border-r"
            aria-expanded={categoryOpen}
          >
            <span>{category.label}</span>
            <i className="fa-solid fa-chevron-down text-[10px] text-gray-400" aria-hidden="true" />
          </button>
          {categoryOpen && (
            <ul className="absolute left-0 top-full z-40 w-full animate-fade-in border border-gray-200 bg-white py-1 shadow-menu">
              {CATEGORIES.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => {
                      setCategory(item);
                      setCategoryOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-[11px] uppercase tracking-wider text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Input */}
        <div className="flex flex-1 items-center bg-white px-4 py-3">
          <i
            className="fa-solid fa-magnifying-glass mr-3 text-sm text-gray-400"
            aria-hidden="true"
          />
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
            className="w-full border-none bg-transparent p-0 text-sm font-normal text-gray-800 placeholder-gray-400 outline-none focus:ring-0"
            placeholder="Search by location, company, or description"
            type="text"
            aria-label="Search listings"
          />
          <button
            type="button"
            onClick={useMyLocation}
            className="px-2 text-gray-400 transition-colors hover:text-gray-600"
            title="Use current location"
          >
            <i
              className={`fa-solid ${locating ? 'fa-spinner fa-spin' : 'fa-crosshairs'} text-base`}
              aria-hidden="true"
            />
            <span className="sr-only">Use current location</span>
          </button>
        </div>

        <button
          type="button"
          onClick={submit}
          className="bg-[#2c333a] px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#1f2429]"
        >
          Search
        </button>
      </div>

      {/* Understanding + suggestions */}
      {focused && (chips.length > 0 || hits.length > 0) && (
        <div className="mt-1 animate-fade-in overflow-hidden rounded-sm border border-neutral-200 bg-white shadow-pill">
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                Reading as
              </span>
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-[#0f2b48] px-2 py-0.5 text-[10px] font-semibold text-white"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
          {hits.map((property) => (
            <Link
              key={property.slug}
              href={`/property/${property.slug}`}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={property.image}
                alt=""
                className="h-10 w-14 shrink-0 rounded-sm object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-gray-900">
                  {property.title}
                </span>
                <span className="block truncate text-[11px] text-gray-500">
                  {locationLabel(property)}
                </span>
              </span>
              <span className="shrink-0 text-[12px] font-bold text-gray-900">
                {compactPrice(property, currency)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
