'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import type { Property } from '@/lib/types';
import { locationLabel, priceLabel } from '@/lib/format';
import { useSession } from '@/lib/store';
import { HeroSearchConsole } from '@/components/home/HeroSearchConsole';

type HeroSlide = Property & { heroImage?: string; heroAlt?: string };

interface HeroCarouselProps {
  slides: HeroSlide[];
}

const INTERVAL = 7000;

/** Full-bleed hero carousel with the floating global search console beneath. */
export function HeroCarousel({ slides }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const currency = useSession((state) => state.currency);

  const go = useCallback(
    (delta: number) => setIndex((current) => (current + delta + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (paused || slides.length < 2) return undefined;
    const timer = setInterval(() => go(1), INTERVAL);
    return () => clearInterval(timer);
  }, [go, paused, slides.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const slide = slides[index];

  return (
    <section
      className="relative h-[620px] w-full overflow-hidden bg-neutral-900 lg:h-[720px]"
      data-purpose="hero-banner"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured listings"
    >
      {slides.map((item, slideIndex) => (
        <div
          key={item.slug}
          className="absolute inset-0 z-0 transition-opacity duration-[1200ms] ease-out"
          style={{ opacity: slideIndex === index ? 1 : 0 }}
          aria-hidden={slideIndex !== index}
        >
          <Image
            src={item.heroImage ?? item.image}
            alt={item.heroAlt ?? `${item.title}, ${locationLabel(item)}`}
            fill
            priority={slideIndex === 0}
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
        </div>
      ))}

      {/* Arrows */}
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous listing"
        className="absolute left-6 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
      >
        <i className="fa-solid fa-chevron-left text-base" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next listing"
        className="absolute right-6 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
      >
        <i className="fa-solid fa-chevron-right text-base" aria-hidden="true" />
      </button>

      {/* Property badge. On phones the search console below is three rows tall,
          so the badge is lifted clear of it rather than tucked behind. */}
      <div className="absolute bottom-[216px] left-4 right-4 z-20 max-w-xl text-white drop-shadow-md sm:bottom-28 sm:left-12 sm:right-auto">
        <div className="inline-block rounded-sm border border-white/10 bg-black/60 p-5 backdrop-blur-md sm:p-6">
          <h2 className="text-base font-normal tracking-wide text-white sm:text-2xl">
            {priceLabel(slide, currency)}
            <span className="mx-1 text-white/60">—</span> {slide.beds} Beds
            <span className="mx-1 text-white/60">—</span> {slide.baths} Baths
          </h2>
          <p className="mt-1 text-xs font-light uppercase tracking-widest text-gray-300 sm:text-sm">
            {locationLabel(slide)}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/15 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-200">
              {slide.agency}
            </span>
            <Link
              href={`/property/${slide.slug}`}
              className="rounded bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-900 transition-colors hover:bg-gray-200"
            >
              More Information
            </Link>
            {slide.hasTour && (
              <Link
                href={`/property/${slide.slug}/tour`}
                className="flex items-center gap-1.5 rounded border border-white/45 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-neutral-900"
              >
                <i className="fa-solid fa-cube text-[10px]" aria-hidden="true" />
                Walk it in 360°
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Slide dots */}
      <div className="absolute bottom-[196px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 sm:bottom-28 sm:left-auto sm:right-12 sm:translate-x-0">
        {slides.map((item, slideIndex) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => setIndex(slideIndex)}
            aria-label={`Go to slide ${slideIndex + 1}`}
            aria-current={slideIndex === index}
            className={[
              'h-1 rounded-full transition-all duration-300',
              slideIndex === index ? 'w-7 bg-white' : 'w-3 bg-white/40 hover:bg-white/70',
            ].join(' ')}
          />
        ))}
      </div>

      <HeroSearchConsole />
    </section>
  );
}
