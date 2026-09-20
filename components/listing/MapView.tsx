'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Property } from '@/lib/types';
import { compactPrice, locationLabel } from '@/lib/format';
import { useSession } from '@/lib/store';
import { hideBrokenPhoto } from '@/components/ui/Photo';

interface MapViewProps {
  properties: Property[];
}

interface Cluster {
  id: string;
  left: number;
  top: number;
  items: Property[];
}

/**
 * Marker footprint, in map units (the plate is 100 wide by 100 tall and drawn
 * 2:1, so a unit of height covers half the pixels of a unit of width).
 *
 * A bubble is sized by its label, so an "11 listings" count needs far more room
 * than a "$2.5M" price. The numbers are calibrated against the ~700px plate the
 * results column gives it; the clearance is deliberately generous, because two
 * markers that touch are harder to read than one that counts them both.
 */
const PLATE_PX = 700;
const BUBBLE_H = 7.5;

function halfWidth(count: number) {
  const chars = count === 1 ? 7 : `${count} listings`.length;
  return ((chars * 6.4 + 24) / 2 / PLATE_PX) * 100;
}

function collide(a: Cluster, b: Cluster) {
  return (
    Math.abs(a.left - b.left) < halfWidth(a.items.length) + halfWidth(b.items.length) &&
    Math.abs(a.top - b.top) < BUBBLE_H
  );
}

/**
 * Equirectangular world map with clustered price markers.
 *
 * Drawn as inline SVG rather than a tile provider, so the map needs no API key,
 * no third-party script and no network round-trip. Listing coordinates are real
 * city centres, so the distribution is meaningful; markets like Colorado stack
 * many listings on one point, so nearby markers collapse into a count bubble
 * that expands into the side list on click.
 */
export function MapView({ properties }: MapViewProps) {
  const [active, setActive] = useState<string | null>(null);
  const [focusCluster, setFocusCluster] = useState<string | null>(null);
  const currency = useSession((state) => state.currency);

  // Plate carrée: longitude maps to x linearly, latitude to y inverted.
  //
  // Every listing starts as its own marker; colliding markers are then merged
  // until none overlap. The old fixed grid bucketed by cell, which left two
  // listings either side of a cell boundary a pixel apart and overprinting —
  // Colorado came out as four bubbles stacked on one another.
  const clusters = useMemo<Cluster[]>(() => {
    const out: Cluster[] = properties.map((property) => ({
      id: property.slug,
      left: ((property.lng + 180) / 360) * 100,
      top: ((90 - property.lat) / 180) * 100,
      items: [property],
    }));

    // Merge the closest colliding pair, then look again: absorbing two markers
    // widens the survivor's label, which can bring a third into contact. A
    // single pass leaves those behind, which is how a market like Colorado ends
    // up as four bubbles printed over one another.
    for (;;) {
      let best: [number, number] | null = null;
      let bestGap = Infinity;
      for (let i = 0; i < out.length; i += 1) {
        for (let j = i + 1; j < out.length; j += 1) {
          if (!collide(out[i], out[j])) continue;
          const gap =
            (out[i].left - out[j].left) ** 2 + ((out[i].top - out[j].top) * 0.5) ** 2;
          if (gap < bestGap) {
            bestGap = gap;
            best = [i, j];
          }
        }
      }
      if (!best) break;

      const [i, j] = best;
      const a = out[i];
      const b = out[j];
      const total = a.items.length + b.items.length;
      // Weighted centroid, so the bubble sits over the bulk of what it covers.
      a.left = (a.left * a.items.length + b.left * b.items.length) / total;
      a.top = (a.top * a.items.length + b.top * b.items.length) / total;
      a.items.push(...b.items);
      out.splice(j, 1);
    }

    return out.sort((a, b) => a.top - b.top);
  }, [properties]);

  // Distinct towns, which is what "markets" means to a reader. It is not the
  // bubble count: bubbles merge when they would overprint each other, so a
  // world plate shows four of them for sixteen markets.
  const marketCount = useMemo(
    () => new Set(properties.map((p) => `${p.city}|${p.region || p.country}`)).size,
    [properties],
  );

  const activeProperty = properties.find((p) => p.slug === active);
  const focused = clusters.find((c) => c.id === focusCluster);
  const listItems = focused ? focused.items : properties;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="relative self-start overflow-hidden rounded-xs border border-sand-200 bg-[#dfe7ef] shadow-soft">
        <div className="relative aspect-[2/1] w-full">
          <svg
            viewBox="0 0 360 180"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <rect width="360" height="180" fill="#dbe6ee" />
            {/* Graticule at 30° intervals */}
            {Array.from({ length: 11 }, (_, i) => (i + 1) * 30).map((x) => (
              <line key={`v${x}`} x1={x} y1={0} x2={x} y2={180} stroke="#c6d4e0" strokeWidth={0.4} />
            ))}
            {Array.from({ length: 5 }, (_, i) => (i + 1) * 30).map((y) => (
              <line key={`h${y}`} x1={0} y1={y} x2={360} y2={y} stroke="#c6d4e0" strokeWidth={0.4} />
            ))}
            <line x1={0} y1={90} x2={360} y2={90} stroke="#aebecd" strokeWidth={0.7} />
            {/* Simplified landmass silhouettes, drawn in lon/lat space. */}
            <g fill="#cfd9c8" stroke="#bcc9b3" strokeWidth={0.4}>
              <path d="M28 28 L70 22 L96 30 L104 48 L88 62 L74 58 L64 74 L52 66 L40 48 Z" />
              <path d="M74 74 L96 70 L108 86 L98 100 L82 96 Z" />
              <path d="M96 104 L116 100 L126 122 L118 152 L104 148 L96 126 Z" />
              <path d="M166 24 L198 18 L214 28 L206 44 L186 48 L172 40 Z" />
              <path d="M172 52 L206 48 L222 70 L216 110 L200 132 L186 118 L178 88 Z" />
              <path d="M214 30 L268 20 L310 34 L316 62 L292 78 L258 74 L232 58 Z" />
              <path d="M292 110 L326 104 L338 124 L320 140 L298 132 Z" />
              <path d="M330 150 L350 146 L354 160 L336 164 Z" />
            </g>
          </svg>

          {clusters.map((cluster) => {
            const single = cluster.items.length === 1;
            const property = cluster.items[0];
            const isActive = single
              ? active === property.slug
              : focusCluster === cluster.id;
            return (
              <button
                key={cluster.id}
                type="button"
                onClick={() => {
                  if (single) {
                    setFocusCluster(null);
                    setActive(active === property.slug ? null : property.slug);
                  } else {
                    setActive(null);
                    setFocusCluster(focusCluster === cluster.id ? null : cluster.id);
                  }
                }}
                className="group absolute -translate-x-1/2 -translate-y-full"
                style={{ left: `${cluster.left}%`, top: `${cluster.top}%`, zIndex: isActive ? 30 : 10 }}
                aria-label={
                  single
                    ? `${property.title}, ${locationLabel(property)}`
                    : `${cluster.items.length} listings near ${property.city}`
                }
              >
                <span
                  className={[
                    'block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-lift transition-all duration-300',
                    isActive
                      ? 'scale-110 border-ink-900 bg-ink-900 text-white'
                      : single
                        ? 'border-white bg-white/95 text-ink-800 group-hover:border-ink-900 group-hover:bg-ink-900 group-hover:text-white'
                        : 'border-gold-500 bg-gold-500 text-ink-900 group-hover:bg-gold-400',
                  ].join(' ')}
                >
                  {single ? compactPrice(property, currency) : `${cluster.items.length} listings`}
                </span>
                <span
                  className={[
                    'mx-auto block h-1.5 w-1.5 rotate-45 border-b border-r',
                    isActive
                      ? 'border-ink-900 bg-ink-900'
                      : single
                        ? 'border-white bg-white'
                        : 'border-gold-500 bg-gold-500',
                  ].join(' ')}
                  style={{ marginTop: -3 }}
                />
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-sand-200 bg-white px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-ink-400">
          <span className="font-semibold text-ink-700">
            {properties.length} listings in {marketCount}{' '}
            {marketCount === 1 ? 'market' : 'markets'}
          </span>
          <span className="hidden sm:block">Equirectangular projection · city-level positions</span>
        </div>
      </div>

      <div className="max-h-[560px] overflow-y-auto rounded-xs border border-sand-200 bg-white shadow-soft">
        {activeProperty ? (
          <div className="p-4">
            <button
              type="button"
              onClick={() => setActive(null)}
              className="btn-link mb-4"
            >
              ← All listings
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeProperty.image}
              alt={activeProperty.title}
              className="mb-4 aspect-[16/10] w-full rounded-xs bg-sand-100 object-cover"
              onError={hideBrokenPhoto}
            />
            <h3 className="font-serif-title text-[18px] text-ink-900">{activeProperty.title}</h3>
            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-ink-400">{locationLabel(activeProperty)}</p>
            <p className="font-serif-title mt-2.5 text-xl text-ink-900">
              {compactPrice(activeProperty, currency)}
            </p>
            <Link
              href={`/property/${activeProperty.slug}`}
              className="btn-ink mt-5 w-full"
            >
              View listing
            </Link>
          </div>
        ) : (
          <>
            {focused && (
              <div className="flex items-center justify-between border-b border-sand-200 bg-sand-50 px-4 py-2.5">
                <span className="text-[11px] font-semibold text-ink-700">
                  {focused.items.length} near {focused.items[0].city}
                </span>
                <button
                  type="button"
                  onClick={() => setFocusCluster(null)}
                  className="text-[10px] uppercase tracking-[0.12em] text-ink-300 transition-colors hover:text-ink-800"
                >
                  Clear
                </button>
              </div>
            )}
            {listItems.slice(0, 40).map((property) => (
              <button
                key={property.slug}
                type="button"
                onClick={() => setActive(property.slug)}
                className="flex w-full gap-3.5 border-b border-sand-100 p-3.5 text-left transition-colors hover:bg-sand-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={property.image}
                  alt=""
                  className="h-16 w-24 shrink-0 rounded-xs bg-sand-100 object-cover"
                  onError={hideBrokenPhoto}
                />
                <span className="min-w-0 flex-1">
                  <span className="font-serif-title block truncate text-[15px] text-ink-900">
                    {property.title}
                  </span>
                  <span className="block truncate text-[11px] text-ink-400">
                    {locationLabel(property)}
                  </span>
                  <span className="font-serif-title mt-1 block text-[14px] text-ink-900">
                    {compactPrice(property, currency)}
                  </span>
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
