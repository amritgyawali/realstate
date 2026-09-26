'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { properties } from '@/lib/data/properties';
import { destinations } from '@/lib/data/destinations';
import { agents } from '@/lib/data/agents';
import { describeQuery, parseSmartQuery, suggest } from '@/lib/smart-search';
import { compactPrice, locationLabel } from '@/lib/format';
import { useSession } from '@/lib/store';
import { hideBrokenPhoto } from '@/components/ui/Photo';

interface Shortcut {
  label: string;
  href: string;
  icon: string;
}

const SHORTCUTS: Shortcut[] = [
  { label: '3D/360° Tours', href: '/tours', icon: 'fa-cube' },
  { label: 'Homes For Sale', href: '/homes-for-sale', icon: 'fa-house' },
  { label: 'Destinations', href: '/destinations', icon: 'fa-earth-americas' },
  { label: 'Luxury Professionals', href: '/professionals', icon: 'fa-user-tie' },
  { label: 'Press Releases', href: '/press-releases', icon: 'fa-newspaper' },
  { label: 'About LRE®', href: '/about', icon: 'fa-circle-info' },
];

const EXAMPLES = [
  'lakeside villa in Pokhara with a 3d tour',
  '4 bed house in Nepal with mountain view',
  'heritage haveli in Rajasthan',
  'riverside villa in Goa under $2m',
];

/**
 * Site-wide command palette (Ctrl/Cmd + K).
 *
 * Typed text runs through the same natural-language parser the listing pages
 * use, so the chips shown here are exactly the filters that will be applied when
 * the search is submitted — no second, divergent interpretation.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const favorites = useSession((state) => state.favorites);
  const currency = useSession((state) => state.currency);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('lre:open-command-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('lre:open-command-palette', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setCursor(0);
      // Focus after paint so the caret lands reliably.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const query = useMemo(() => parseSmartQuery(text), [text]);
  const chips = useMemo(() => (text.trim() ? describeQuery(query) : []), [query, text]);

  const propertyHits = useMemo(() => suggest(properties, text, 5), [text]);
  const destinationHits = useMemo(
    () =>
      text.trim()
        ? destinations
            .filter((d) => d.name.toLowerCase().includes(text.trim().toLowerCase()))
            .slice(0, 3)
        : [],
    [text],
  );
  const agentHits = useMemo(
    () =>
      text.trim()
        ? agents
            .filter((a) =>
              `${a.name} ${a.firm} ${a.location}`.toLowerCase().includes(text.trim().toLowerCase()),
            )
            .slice(0, 3)
        : [],
    [text],
  );

  const rows = useMemo(
    () => [
      ...propertyHits.map((p) => ({ type: 'property' as const, href: `/property/${p.slug}`, item: p })),
      ...destinationHits.map((d) => ({
        type: 'destination' as const,
        href: `/destinations#${d.slug}`,
        item: d,
      })),
      ...agentHits.map((a) => ({ type: 'agent' as const, href: `/professionals#${a.slug}`, item: a })),
    ],
    [propertyHits, destinationHits, agentHits],
  );

  const submit = () => {
    const params = new URLSearchParams();
    if (text.trim()) params.set('q', text.trim());
    router.push(`/homes-for-sale?${params.toString()}`);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => Math.min(rows.length - 1, c + 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const row = rows[cursor];
      if (row) {
        router.push(row.href);
        setOpen(false);
      } else {
        submit();
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-neutral-950/55 px-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-2xl animate-fade-up overflow-hidden rounded-sm border border-neutral-200 bg-white shadow-pill">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <i className="fa-solid fa-magnifying-glass text-sm text-gray-400" aria-hidden="true" />
          <input
            ref={inputRef}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search listings, tours, destinations or brokers…"
            className="w-full border-0 p-0 text-sm text-gray-800 placeholder-gray-400 focus:ring-0"
            aria-label="Search query"
          />
          <kbd className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] text-gray-400">
            Esc
          </kbd>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-2">
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

        <div className="max-h-[52vh] overflow-y-auto">
          {rows.length > 0 ? (
            <ul className="py-1">
              {rows.map((row, index) => (
                <li key={`${row.type}-${index}`}>
                  <Link
                    href={row.href}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setCursor(index)}
                    className={[
                      'flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      index === cursor ? 'bg-gray-100' : 'hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {row.type === 'property' && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.item.image}
                          alt=""
                          className="h-10 w-14 shrink-0 rounded-sm bg-sand-100 object-cover"
                          onError={hideBrokenPhoto}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-gray-900">
                            {row.item.title}
                          </span>
                          <span className="block truncate text-[11px] text-gray-500">
                            {locationLabel(row.item)}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[12px] font-bold text-gray-900">
                            {compactPrice(row.item, currency)}
                          </span>
                          {row.item.hasTour && (
                            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#b89d62]">
                              360° tour
                            </span>
                          )}
                        </span>
                      </>
                    )}
                    {row.type === 'destination' && (
                      <>
                        <i
                          className="fa-solid fa-location-dot w-14 text-center text-gray-400"
                          aria-hidden="true"
                        />
                        <span className="flex-1 text-[13px] font-semibold text-gray-900">
                          {row.item.name}
                        </span>
                        <span className="text-[11px] text-ink-300">Destination</span>
                      </>
                    )}
                    {row.type === 'agent' && (
                      <>
                        <i
                          className="fa-solid fa-user-tie w-14 text-center text-gray-400"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-gray-900">
                            {row.item.name}
                          </span>
                          <span className="block truncate text-[11px] text-gray-500">
                            {row.item.firm}
                          </span>
                        </span>
                        <span className="text-[11px] text-ink-300">Professional</span>
                      </>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                {text.trim() ? 'No direct matches — try a broader search' : 'Try asking for'}
              </p>
              <ul className="mt-2 space-y-1.5">
                {EXAMPLES.map((example) => (
                  <li key={example}>
                    <button
                      type="button"
                      onClick={() => setText(example)}
                      className="text-left text-[12px] text-[#1a6fa0] hover:underline"
                    >
                      “{example}”
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-gray-100 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
              Jump to
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SHORTCUTS.map((shortcut) => (
                <Link
                  key={shortcut.href}
                  href={shortcut.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900"
                >
                  <i className={`fa-solid ${shortcut.icon} text-[10px]`} aria-hidden="true" />
                  {shortcut.label}
                </Link>
              ))}
              {favorites.length > 0 && (
                <Link
                  href="/favorites"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 rounded-full border border-[#c5a869] bg-[#c5a869]/10 px-2.5 py-1 text-[11px] font-semibold text-[#8a6f2f]"
                >
                  <i className="fa-solid fa-heart text-[10px]" aria-hidden="true" />
                  {favorites.length} saved
                </Link>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={submit}
          className="flex w-full items-center justify-center gap-2 bg-[#2c333a] py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#1f2429]"
        >
          Search all listings
          <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
