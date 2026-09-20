'use client';

import Link from 'next/link';
import { Photo } from '@/components/ui/Photo';
import type { Property } from '@/lib/types';
import { compactPrice, locationLabel, priceLabel } from '@/lib/format';
import { useSession } from '@/lib/store';
import { ListingActions } from '@/components/ui/ListingActions';

interface ListingCardProps {
  property: Property;
  /**
   * `tour` is the 3D/360 grid card, `sale` the Homes For Sale card, `compact`
   * the four-across homepage card and `wide` the map-view list row.
   */
  variant?: 'tour' | 'sale' | 'compact' | 'wide';
  priority?: boolean;
}

export function ListingCard({ property, variant = 'sale', priority = false }: ListingCardProps) {
  const currency = useSession((state) => state.currency);
  const href = `/property/${property.slug}`;

  if (variant === 'compact') {
    return (
      <article className="property-card group relative flex cursor-pointer flex-col overflow-hidden rounded bg-white shadow-sm">
        <ListingActions slug={property.slug} title={property.title} />
        <Link href={href} className="flex flex-1 flex-col">
          <div className="relative h-44 overflow-hidden sm:h-48">
            <Photo
              src={property.image}
              alt={property.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="img-zoom object-cover"
              priority={priority}
            />
            {property.status === 'Auction' && (
              <span className="absolute bottom-2 right-2 rounded-sm bg-black/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                Auction
              </span>
            )}
            {property.status === 'Pending' && (
              <span className="absolute right-2 top-2 rounded-sm bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                Pending
              </span>
            )}
            {property.hasTour && (
              <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                <i className="fa-solid fa-cube text-[9px]" aria-hidden="true" />
                360°
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-col justify-between p-3.5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {priceLabel(property, currency)}
              </h3>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">{property.agency}</p>
            </div>
            <p className="mt-2 text-[11px] text-ink-300">{locationLabel(property)}</p>
          </div>
        </Link>
      </article>
    );
  }

  if (variant === 'wide') {
    return (
      <Link
        href={href}
        className="group flex gap-3 border-b border-gray-100 p-3 transition-colors hover:bg-gray-50"
      >
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-sm bg-gray-100">
          <Photo
            src={property.image}
            alt={property.title}
            fill
            sizes="112px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-gray-900">{property.title}</p>
          <p className="truncate text-[11px] text-gray-500">{locationLabel(property)}</p>
          <p className="mt-1 text-[12px] font-bold text-gray-900">
            {priceLabel(property, currency)}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-300">
            {property.beds} bd · {property.baths} ba · {property.sqft.toLocaleString('en-US')} sqft
          </p>
        </div>
      </Link>
    );
  }

  const isTour = variant === 'tour';

  return (
    <article
      className={[
        'group relative flex flex-col justify-between border border-gray-200 bg-white transition-shadow',
        isTour ? 'rounded shadow-sm hover:shadow-md' : 'overflow-hidden shadow-sm hover:shadow-md',
      ].join(' ')}
    >
      <ListingActions slug={property.slug} title={property.title} />
      <Link href={href} className="flex flex-1 flex-col">
        <div
          className={[
            'relative w-full overflow-hidden bg-gray-100',
            isTour ? 'aspect-[4/3]' : 'aspect-[16/10]',
          ].join(' ')}
        >
          <Photo
            src={property.image}
            alt={property.title}
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
          />
          {property.regents && (
            <span className="badge-regents absolute inset-x-0 bottom-0 py-1 text-center font-crest text-[9px] font-semibold uppercase tracking-[0.16em] text-white">
              Regents Showcase
            </span>
          )}
          {property.status === 'Auction' && (
            <span className="absolute inset-x-0 bottom-0 bg-[#1f2429]/90 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white">
              Auction
            </span>
          )}
          {property.hasTour && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
              <i className="fa-solid fa-cube text-[9px]" aria-hidden="true" />
              360° Walkover
            </span>
          )}
        </div>

        <div className="p-3">
          <h2
            className={[
              'truncate font-bold text-gray-900 transition-colors group-hover:text-amber-800',
              isTour ? 'text-[13px]' : 'text-sm',
            ].join(' ')}
          >
            {property.title}
          </h2>
          <p className="mb-1 truncate text-[11px] text-gray-500">{locationLabel(property)}</p>
          <p className="text-[12px] font-bold text-gray-900">{priceLabel(property, currency)}</p>
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-gray-100 px-3 pb-3 pt-1 text-[11px] text-gray-500">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1.5" title={`${property.beds} bedrooms`}>
            <i className="fa-solid fa-bed text-[11px] text-gray-400" aria-hidden="true" />
            {property.beds}
          </span>
          <span className="flex items-center gap-1.5" title={`${property.baths} bathrooms`}>
            <i className="fa-solid fa-bath text-[11px] text-gray-400" aria-hidden="true" />
            {property.baths}
          </span>
          <span className="hidden items-center gap-1.5 sm:flex" title="Living area">
            <i className="fa-solid fa-ruler-combined text-[11px] text-gray-400" aria-hidden="true" />
            {compactArea(property.sqft)}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-gray-500">
          {property.hasTour && (
            <i className="fa-solid fa-cube" title="3D/360° tour" aria-label="3D/360 tour" />
          )}
          {property.hasVideo && (
            <i className="fa-solid fa-video" title="Property video" aria-label="Property video" />
          )}
          {property.regents && (
            <i
              className="fa-solid fa-user opacity-70"
              title="Showcase agent"
              aria-label="Showcase agent"
            />
          )}
        </div>
      </div>
    </article>
  );
}

function compactArea(sqft: number) {
  return sqft >= 10000 ? `${(sqft / 1000).toFixed(1)}k` : sqft.toLocaleString('en-US');
}

/** Small price pill used by the map markers. */
export function MapMarkerLabel({ property }: { property: Property }) {
  const currency = useSession((state) => state.currency);
  return <>{compactPrice(property, currency)}</>;
}
