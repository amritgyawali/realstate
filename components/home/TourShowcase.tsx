'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Property, PropertyTour } from '@/lib/types';
import { locationLabel, priceLabel } from '@/lib/format';
import { useSession } from '@/lib/store';

interface ShowcaseEntry {
  property: Property;
  tour: PropertyTour;
}

interface TourShowcaseProps {
  entries: ShowcaseEntry[];
}

/**
 * Homepage feature for the walkover platform — the thing this site exists for.
 * Hovering a room preview swaps the stage image, so the section demonstrates the
 * room-to-room idea before a visitor ever opens a tour.
 */
export function TourShowcase({ entries }: TourShowcaseProps) {
  const [activeTour, setActiveTour] = useState(0);
  const [activeNode, setActiveNode] = useState(0);
  const currency = useSession((state) => state.currency);

  const entry = entries[activeTour];
  const node = entry.tour.nodes[Math.min(activeNode, entry.tour.nodes.length - 1)];

  return (
    <section
      className="relative overflow-hidden bg-[#111315] py-14 text-white"
      data-purpose="tour-showcase"
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `url('/panoramas/${node.pano}-preview.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(28px) saturate(0.8)',
          transform: 'scale(1.1)',
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#111315] via-[#111315]/75 to-[#111315]" aria-hidden="true" />

      <div className="relative mx-auto max-w-page px-4 md:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-white/15 pb-3">
          <div>
            <p className="mb-1 font-crest text-[10px] uppercase tracking-[0.3em] text-[#c5a869]">
              Virtual Walkover
            </p>
            <h2 className="font-serif-title text-2xl font-medium md:text-3xl">
              Walk the whole house from anywhere
            </h2>
            <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-white/60">
              Every showcase listing is captured as a connected set of 360° positions. Step from the
              entry hall to the terrace, open the floor plan, measure a wall, or switch to Matterport
              — in the browser, on any device, with no plugin.
            </p>
          </div>
          <Link
            href="/tours"
            className="rounded-sm border border-white/30 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors hover:bg-white hover:text-neutral-900"
          >
            Browse all tours
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          {/* Stage */}
          <Link
            href={`/property/${entry.property.slug}/tour`}
            className="group relative block aspect-[16/10] overflow-hidden rounded-sm border border-white/12"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/panoramas/${node.pano}.jpg`}
              alt={`${node.name} — ${entry.property.title}`}
              className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

            <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] backdrop-blur-sm">
              <i className="fa-solid fa-cube text-[10px] text-[#c5a869]" aria-hidden="true" />
              {node.name}
            </span>

            <span className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5">
              <span>
                <span className="block font-serif-title text-xl">{entry.property.title}</span>
                <span className="block text-[11px] uppercase tracking-widest text-white/65">
                  {locationLabel(entry.property)}
                </span>
                <span className="mt-1 block text-[13px] font-semibold">
                  {priceLabel(entry.property, currency)}
                </span>
              </span>
              <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-neutral-900 transition-transform group-hover:translate-x-1">
                <i className="fa-solid fa-person-walking" aria-hidden="true" />
                Enter tour
              </span>
            </span>
          </Link>

          {/* Room reel + tour switcher */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {entries.map((candidate, index) => (
                <button
                  key={candidate.property.slug}
                  type="button"
                  onClick={() => {
                    setActiveTour(index);
                    setActiveNode(0);
                  }}
                  className={[
                    'rounded-full border px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider transition-colors',
                    index === activeTour
                      ? 'border-[#c5a869] bg-[#c5a869] text-neutral-900'
                      : 'border-white/25 text-white/70 hover:border-white/60 hover:text-white',
                  ].join(' ')}
                >
                  {candidate.tour.title}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
              {entry.tour.nodes.map((candidate, index) => (
                <button
                  key={candidate.id}
                  type="button"
                  onMouseEnter={() => setActiveNode(index)}
                  onFocus={() => setActiveNode(index)}
                  onClick={() => setActiveNode(index)}
                  className={[
                    'group/room relative aspect-[4/3] overflow-hidden rounded-sm border transition-all',
                    index === activeNode
                      ? 'border-[#c5a869] ring-1 ring-[#c5a869]'
                      : 'border-white/15 opacity-75 hover:opacity-100',
                  ].join(' ')}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/panoramas/${candidate.pano}-preview.jpg`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em]">
                    {candidate.name}
                  </span>
                </button>
              ))}
            </div>

            <dl className="grid grid-cols-3 gap-2 border-t border-white/12 pt-4 text-center">
              {[
                ['Capture points', String(entry.tour.nodes.length)],
                ['Levels', String(entry.tour.floors.length)],
                [
                  'Scanned area',
                  `${entry.tour.floors.reduce((sum, f) => sum + f.area, 0).toLocaleString('en-US')} sqft`,
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[9.5px] uppercase tracking-[0.14em] text-white/45">{label}</dt>
                  <dd className="mt-0.5 font-serif-title text-lg">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
