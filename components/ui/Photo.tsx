'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useState } from 'react';
import { Crest } from '@/components/layout/Crest';

type PhotoProps = Omit<ImageProps, 'src' | 'alt'> & {
  src: string;
  alt: string;
};

/**
 * `next/image` that fails to paper rather than to a broken frame.
 *
 * Every photograph on the site is hosted off-domain, so a single expired or
 * rate-limited URL is enough to drop a torn-image glyph into the middle of a
 * card grid. When one does not load the frame falls back to the crest on sand,
 * which reads as an intentional "no photograph" state — the same treatment
 * `AgentPortrait` already gives a member with no headshot.
 *
 * `fill` callers must position the parent themselves, exactly as they do with
 * `next/image`; the placeholder inherits that same box.
 */
export function Photo({ src, alt, className = '', fill, ...rest }: PhotoProps) {
  const [failed, setFailed] = useState(false);

  // A card can be recycled onto a different listing while mounted (the grid
  // keys on slug, but the hero and filmstrip swap `src` in place), so a past
  // failure must not blank out the next photograph.
  useEffect(() => setFailed(false), [src]);

  if (failed) {
    return (
      <span
        className={[
          'flex items-center justify-center bg-sand-100 text-sand-400',
          fill ? 'absolute inset-0' : 'h-full w-full',
          className,
        ].join(' ')}
        role="img"
        aria-label={`${alt} — photograph unavailable`}
      >
        <Crest className="h-8 w-7 opacity-60" />
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}

/**
 * `onError` for the small raw `<img>` thumbnails — the compare tray, the
 * command palette, the map rail. They are too small to be worth the crest, so
 * a photograph that will not load collapses to the frame's own sand backdrop
 * instead of a torn-image glyph. Every caller gives its frame that backdrop.
 */
export function hideBrokenPhoto(event: { currentTarget: HTMLImageElement }) {
  event.currentTarget.style.visibility = 'hidden';
}
