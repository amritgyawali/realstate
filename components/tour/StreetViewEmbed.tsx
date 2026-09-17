'use client';

interface StreetViewEmbedProps {
  lat: number;
  lng: number;
  title: string;
}

/**
 * Street View adapter — the "walk outside" half of the walkover.
 *
 * Google's Maps Embed API needs a key; without one the component shows what the
 * tab does and offers the same view in a new window, rather than rendering a
 * broken frame.
 */
export function StreetViewEmbed({ lat, lng, title }: StreetViewEmbedProps) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const external = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;

  if (!key) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950 p-8 text-center">
        <i className="fa-solid fa-street-view text-2xl text-white/35" aria-hidden="true" />
        <p className="text-[13px] text-white/70">Street View needs a Google Maps key.</p>
        <p className="max-w-sm text-[11px] leading-relaxed text-white/45">
          Set <code className="font-mono text-white/70">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> to embed
          the street-level pano beside the interior walkover.
        </p>
        <a
          href={external}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 rounded-full border border-white/25 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/80 transition-colors hover:bg-white hover:text-ink-900"
        >
          Open Street View
        </a>
      </div>
    );
  }

  const src = `https://www.google.com/maps/embed/v1/streetview?key=${key}&location=${lat},${lng}&heading=210&pitch=10&fov=80`;

  return (
    <iframe
      title={`Street View — ${title}`}
      src={src}
      className="absolute inset-0 h-full w-full border-0"
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
