'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Property } from '@/lib/types';
import { locationLabel, priceLabel } from '@/lib/format';
import { useSession } from '@/lib/store';
import { ListingActions } from '@/components/ui/ListingActions';

/** Address, actions and converted price — the band above the media stage. */
export function PropertyPriceHeader({ property }: { property: Property }) {
  const currency = useSession((state) => state.currency);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const payload = {
      title: property.title,
      text: `${property.title} — ${locationLabel(property)}`,
      url,
    };
    // Native share where the browser offers it, clipboard everywhere else.
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // User dismissed the sheet; fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mb-3 flex flex-col gap-3 border-b border-gray-200 pb-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="font-serif-title text-2xl font-normal tracking-tight text-[#1c2229] sm:text-[28px]">
          {property.title}
          <span className="block font-sans text-sm font-normal text-gray-600 sm:ml-2 sm:inline">
            {locationLabel(property)}
          </span>
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusChip status={property.status} />
          {property.hasTour && (
            <Link
              href={`/property/${property.slug}/tour`}
              className="flex items-center gap-1.5 rounded-full bg-[#0f2b48] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#153a60]"
            >
              <i className="fa-solid fa-person-walking text-[9px]" aria-hidden="true" />
              Walk this home
            </Link>
          )}
          {property.regents && (
            <span className="rounded-full border border-[#c5a869] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8a6f2f]">
              Regents Showcase
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <ListingActions slug={property.slug} title={property.title} variant="bar" />
          <button
            type="button"
            onClick={share}
            className="flex items-center gap-1 transition-colors hover:text-black"
          >
            <i className="fa-solid fa-share-nodes text-[13px] text-sky-600" aria-hidden="true" />
            <span className="text-sky-700">{copied ? 'Link copied' : 'Share'}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden items-center gap-1 transition-colors hover:text-black sm:flex"
          >
            <i className="fa-solid fa-print text-[13px] text-sky-600" aria-hidden="true" />
            <span className="text-sky-700">Print</span>
          </button>
        </div>
        <div className="font-serif-title text-2xl font-medium leading-none text-gray-900 sm:text-[29px]">
          {priceLabel(property, currency)}
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: Property['status'] }) {
  const palette: Record<string, string> = {
    Active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Pending: 'bg-amber-50 text-amber-800 border-amber-200',
    Auction: 'bg-neutral-900 text-white border-neutral-900',
    New: 'bg-sky-50 text-sky-800 border-sky-200',
    Sold: 'bg-gray-100 text-gray-600 border-gray-300',
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${palette[status] ?? palette.Active}`}
    >
      {status}
    </span>
  );
}
