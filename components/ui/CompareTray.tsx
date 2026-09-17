'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { propertyBySlug } from '@/lib/data/properties';
import { compactPrice, formatArea, locationLabel, priceLabel } from '@/lib/format';
import { useSession } from '@/lib/store';

/**
 * Docked compare tray. Holds up to four listings and expands into a side-by-side
 * table, so a shortlist survives navigation without a separate compare page.
 */
export function CompareTray() {
  const compare = useSession((state) => state.compare);
  const toggleCompare = useSession((state) => state.toggleCompare);
  const clearCompare = useSession((state) => state.clearCompare);
  const currency = useSession((state) => state.currency);
  const [expanded, setExpanded] = useState(false);

  const items = useMemo(
    () => compare.map((slug) => propertyBySlug.get(slug)).filter(Boolean),
    [compare],
  );

  if (items.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-gold-500/30 bg-ink-950/95 text-white shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.75)] backdrop-blur-xl">
      <div className="mx-auto max-w-page px-4 md:px-8">
        <div className="flex items-center gap-4 py-2.5">
          <span className="hidden text-[9.5px] font-bold uppercase tracking-[0.2em] text-gold-400 sm:block">
            Compare
          </span>
          <div className="flex flex-1 items-center gap-2 overflow-x-auto no-scrollbar">
            {items.map((property) => (
              <div
                key={property!.slug}
                className="group relative flex shrink-0 items-center gap-2.5 rounded-xs border border-white/12 bg-white/[0.06] py-1.5 pl-1.5 pr-2.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={property!.image}
                  alt=""
                  className="h-9 w-12 rounded-xs object-cover"
                />
                <span className="max-w-[140px]">
                  <span className="block truncate text-[11px] font-semibold">
                    {property!.title}
                  </span>
                  <span className="block text-[10px] text-white/50">
                    {compactPrice(property!, currency)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => toggleCompare(property!.slug)}
                  className="ml-1 text-white/40 transition-colors hover:text-white"
                  aria-label={`Remove ${property!.title} from compare`}
                >
                  <i className="fa-solid fa-xmark text-[11px]" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="shrink-0 rounded-xs bg-gold-500 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-900 transition-colors hover:bg-gold-400"
          >
            {expanded ? 'Hide' : `Compare ${items.length}`}
          </button>
          <button
            type="button"
            onClick={clearCompare}
            className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-white/40 transition-colors hover:text-white"
          >
            Clear
          </button>
        </div>

        {expanded && (
          <div className="animate-fade-up overflow-x-auto border-t border-white/10 pb-4 pt-3">
            <table className="w-full min-w-[560px] text-left text-[11px]">
              <thead>
                <tr className="text-white/45">
                  <th className="w-28 pb-2 font-semibold uppercase tracking-[0.12em]">Attribute</th>
                  {items.map((property) => (
                    <th key={property!.slug} className="pb-2 pr-4">
                      <Link
                        href={`/property/${property!.slug}`}
                        className="font-serif-title text-[14px] text-white transition-colors hover:text-gold-300"
                      >
                        {property!.title}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {(
                  [
                    ['Price', (p: NonNullable<typeof items[number]>) => priceLabel(p, currency)],
                    ['Location', (p) => locationLabel(p)],
                    ['Type', (p) => p.type],
                    ['Bedrooms', (p) => String(p.beds)],
                    ['Bathrooms', (p) => String(p.baths)],
                    ['Living area', (p) => formatArea(p.sqft)],
                    ['Lot', (p) => `${p.lotAcres} acres`],
                    ['Built', (p) => String(p.year)],
                    ['3D/360° tour', (p) => (p.hasTour ? 'Yes' : '—')],
                    ['Regents', (p) => (p.regents ? 'Showcase' : '—')],
                  ] as [string, (p: NonNullable<typeof items[number]>) => string][]
                ).map(([label, render]) => (
                  <tr key={label}>
                    <th className="py-1.5 font-normal text-white/45">{label}</th>
                    {items.map((property) => (
                      <td key={property!.slug} className="py-1.5 pr-4 text-white/85">
                        {render(property!)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
