'use client';

import { useState } from 'react';
import type { Property } from '@/lib/types';
import { compactPrice, locationLabel } from '@/lib/format';
import { useSession } from '@/lib/store';
import { hideBrokenPhoto } from '@/components/ui/Photo';

type Layer = 'Standard' | 'Terrain' | 'Satellite';

const NEARBY = [
  { label: 'Historic Museum', dx: 0.34, dy: -0.12, colour: '#c0392b' },
  { label: 'Resort and Spa', dx: -0.42, dy: 0.24, colour: '#8e44ad' },
  { label: 'Ski Resort', dx: -0.36, dy: 0.32, colour: '#2980b9' },
  { label: 'Falls Trail', dx: 0.18, dy: 0.3, colour: '#27ae60' },
];

const PALETTE: Record<Layer, { land: string; hill: string; road: string; water: string }> = {
  Standard: { land: '#dce6d2', hill: '#cddbbd', road: '#e3a152', water: '#87afc7' },
  Terrain: { land: '#e6e0d2', hill: '#d6ccb4', road: '#c98b3f', water: '#7fa8c2' },
  Satellite: { land: '#33402f', hill: '#2a3628', road: '#9a7b3c', water: '#22415a' },
};

/**
 * Location panel.
 *
 * Renders a schematic neighbourhood rather than embedding a tile provider, so
 * the page has no key requirement and no third-party request. The "Open in Maps"
 * link hands off to a real map when someone needs exact streets.
 */
export function LocationMap({ property }: { property: Property }) {
  const [layer, setLayer] = useState<Layer>('Standard');
  const currency = useSession((state) => state.currency);
  const colours = PALETTE[layer];
  const dark = layer === 'Satellite';

  return (
    <section className="mb-16" data-purpose="location-map">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-sand-200 pb-4">
        <div>
          <p className="eyebrow">The setting</p>
          <h2 className="font-serif-title mt-2 text-[25px] font-normal text-ink-900">
            Location &amp; nearby
          </h2>
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${property.lat},${property.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-link"
        >
          Open in Maps
          <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" aria-hidden="true" />
        </a>
      </div>

      <div
        className="relative h-[420px] w-full overflow-hidden rounded-xs border border-sand-300 shadow-soft sm:h-[480px]"
        style={{ backgroundColor: colours.land }}
      >
        <svg
          className="h-full w-full"
          viewBox="0 0 1200 500"
          preserveAspectRatio="xMidYMid slice"
          aria-label={`Schematic map of ${locationLabel(property)}`}
        >
          <rect width="1200" height="500" fill={colours.land} />
          <path
            d="M-50 180 C 150 140, 300 240, 500 190 C 700 140, 900 210, 1250 150 L 1250 0 L -50 0 Z"
            fill={colours.hill}
          />
          <path
            d="M-50 360 C 200 320, 450 390, 750 340 C 950 300, 1100 360, 1250 330 L 1250 500 L -50 500 Z"
            fill={colours.hill}
          />
          <path
            d="M-20 280 C 200 260, 450 295, 700 270 C 920 245, 1100 290, 1220 280"
            stroke={colours.water}
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M-30 250 C 200 240, 430 255, 650 255 L 1230 255"
            stroke={dark ? '#4a4535' : '#f4ecd8'}
            strokeWidth={9}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M-30 250 C 200 240, 430 255, 650 255 L 1230 255"
            stroke={colours.road}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 120 380 C 240 330, 400 310, 520 300"
            stroke={dark ? '#6f7a63' : '#ffffff'}
            strokeDasharray="4 3"
            strokeWidth={3}
            fill="none"
          />
          <path
            d="M 600 260 L 600 380 L 800 380"
            stroke={dark ? '#6f7a63' : '#ffffff'}
            strokeWidth={2.5}
            fill="none"
          />
          <text
            x={710}
            y={295}
            fill={dark ? '#e8e8e8' : '#333333'}
            fontFamily="var(--font-playfair), Playfair Display, serif"
            fontSize={24}
            fontWeight="bold"
            opacity={0.6}
          >
            {property.city}
          </text>

          {NEARBY.map((point) => {
            const x = 600 + point.dx * 900;
            const y = 250 + point.dy * 360;
            return (
              <g key={point.label}>
                <circle cx={x} cy={y} r={4.5} fill={point.colour} />
                <text
                  x={x + 10}
                  y={y + 3}
                  fill={dark ? '#dcdcdc' : '#4a4a4a'}
                  fontFamily="sans-serif"
                  fontSize={10}
                  fontWeight={500}
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Property callout */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
          <div className="w-56 rounded-xs border border-sand-200 bg-white p-2.5 shadow-lift">
            <div className="flex gap-1">
              {property.gallery.slice(0, 2).map((src, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={index}
                  src={src}
                  alt=""
                  className="h-14 w-1/2 rounded-[2px] bg-sand-100 object-cover"
                  onError={hideBrokenPhoto}
                />
              ))}
            </div>
            <p className="font-serif-title mt-2 truncate text-[13px] text-ink-900">{property.title}</p>
            <p className="truncate text-[10px] uppercase tracking-[0.1em] text-ink-300">
              {property.city}, {property.region || property.country}
            </p>
            <p className="font-serif-title mt-1 text-[13px] text-ink-900">
              {compactPrice(property, currency)}
            </p>
          </div>
          <span className="mx-auto block h-2 w-2 rotate-45 border-b border-r border-sand-200 bg-white" style={{ marginTop: -4 }} />
          <span className="mx-auto mt-1 block h-3 w-3 rounded-full border-2 border-white bg-gold-500 shadow-lift" />
        </div>

        {/* Layer control */}
        <div className="absolute right-3 top-3 z-10">
          <select
            value={layer}
            onChange={(event) => setLayer(event.target.value as Layer)}
            className="custom-select rounded-xs border border-sand-300 bg-white/95 py-1.5 pl-3 pr-7 text-[11px] text-ink-700 shadow-soft focus:outline-none"
            aria-label="Map layer"
          >
            {(['Standard', 'Terrain', 'Satellite'] as Layer[]).map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="absolute bottom-3 left-3 z-10 rounded-xs bg-white/90 px-2.5 py-1 font-mono text-[9px] text-ink-500 backdrop-blur-sm">
          {property.lat.toFixed(4)}, {property.lng.toFixed(4)} · Schematic
        </div>
      </div>
    </section>
  );
}
