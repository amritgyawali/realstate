'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Property, PropertyTour } from '@/lib/types';
import { TourViewer } from '@/components/tour/TourViewer';
import { StreetViewEmbed } from '@/components/tour/StreetViewEmbed';

interface MediaStageProps {
  property: Property;
  tour: PropertyTour;
}

type Tab = 'photos' | 'tour' | 'street';

/**
 * Media tab bar plus the 8/4 stage-and-thumbnail grid from the reference detail
 * page. The 3D/360° tab is the default for listings that have a tour, because
 * that is the primary way this site expects people to view a property.
 */
export function MediaStage({ property, tour }: MediaStageProps) {
  const [tab, setTab] = useState<Tab>(property.hasTour ? 'tour' : 'photos');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const gallery = property.gallery.length ? property.gallery : [property.image];
  const thumbs = gallery.slice(1, 7);

  return (
    <>
      {/* Tab bar */}
      <div
        className="mb-3 flex flex-col justify-between border-b border-gray-100 pb-2 text-xs sm:flex-row sm:items-center"
        data-purpose="media-tabs"
      >
        <div className="flex items-center space-x-4">
          <MediaTab
            icon="fa-image"
            label="Photos"
            active={tab === 'photos'}
            onClick={() => setTab('photos')}
          />
          {property.hasTour && (
            <MediaTab
              icon="fa-globe"
              label="3D/360°"
              active={tab === 'tour'}
              onClick={() => setTab('tour')}
            />
          )}
          <MediaTab
            icon="fa-location-dot"
            label="Street View"
            active={tab === 'street'}
            onClick={() => setTab('street')}
          />
        </div>

        {tab === 'photos' && (
          <div className="mt-2 flex items-center space-x-3 text-gray-500 sm:mt-0">
            <button
              type="button"
              className="text-sky-700 hover:underline"
              onClick={() => setPhotoIndex((i) => (i - 1 + gallery.length) % gallery.length)}
            >
              « Previous
            </button>
            <span>
              {photoIndex + 1} - {Math.min(photoIndex + 6, gallery.length)} of {gallery.length}
            </span>
            <button
              type="button"
              className="text-sky-700 hover:underline"
              onClick={() => setPhotoIndex((i) => (i + 1) % gallery.length)}
            >
              Next »
            </button>
          </div>
        )}
      </div>

      {/* Stage */}
      <div
        className="mb-8 grid grid-cols-1 gap-2 lg:grid-cols-12"
        data-purpose="media-gallery-section"
      >
        <div className="relative overflow-hidden bg-neutral-900 lg:col-span-8">
          {tab === 'tour' && property.hasTour ? (
            <TourViewer property={property} tour={tour} layout="panel" />
          ) : tab === 'street' ? (
            <div className="relative aspect-[16/10] w-full">
              <StreetViewEmbed lat={property.lat} lng={property.lng} title={property.title} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="group relative block aspect-[16/10] w-full"
              aria-label="Open full-size photo"
            >
              <Image
                src={gallery[photoIndex]}
                alt={`${property.title} — photo ${photoIndex + 1}`}
                fill
                priority
                sizes="(min-width: 1024px) 66vw, 100vw"
                className="object-cover"
              />
              <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-0.5 font-mono text-[11px] text-white">
                {photoIndex + 1}/{gallery.length}
              </span>
              <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                <i className="fa-solid fa-expand mr-1.5" aria-hidden="true" />
                Full size
              </span>
            </button>
          )}
        </div>

        <div className="grid h-full grid-cols-2 gap-2 lg:col-span-4">
          {thumbs.map((src, index) => (
            <button
              key={src + index}
              type="button"
              onClick={() => {
                setTab('photos');
                setPhotoIndex(index + 1);
              }}
              className="group relative aspect-[4/3] overflow-hidden bg-gray-100"
            >
              <Image
                src={src}
                alt={`${property.title} — photo ${index + 2}`}
                fill
                sizes="(min-width: 1024px) 17vw, 50vw"
                className="cursor-pointer object-cover transition duration-300 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-neutral-950/92 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
            aria-label="Close"
            onClick={() => setLightbox(false)}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="absolute left-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
            aria-label="Previous photo"
            onClick={(event) => {
              event.stopPropagation();
              setPhotoIndex((i) => (i - 1 + gallery.length) % gallery.length);
            }}
          >
            <i className="fa-solid fa-chevron-left" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="absolute right-5 top-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
            aria-label="Next photo"
            onClick={(event) => {
              event.stopPropagation();
              setPhotoIndex((i) => (i + 1) % gallery.length);
            }}
          >
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gallery[photoIndex]}
            alt={`${property.title} — photo ${photoIndex + 1}`}
            className="max-h-[88vh] max-w-[92vw] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function MediaTab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'flex items-center space-x-1 py-1 transition-colors',
        active
          ? 'border-b-2 border-sky-700 pb-0.5 font-semibold text-sky-700'
          : 'text-gray-600 hover:text-sky-700',
      ].join(' ')}
    >
      <i className={`fa-solid ${icon} text-[13px]`} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
