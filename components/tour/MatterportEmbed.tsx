'use client';

import { useEffect, useRef, useState } from 'react';

interface MatterportEmbedProps {
  modelId: string;
  title: string;
}

/**
 * Matterport Showcase adapter.
 *
 * The tour system is provider-agnostic: a listing captured on real Matterport
 * hardware renders here, while everything else falls to the built-in panorama
 * engine. The iframe carries the SDK query params Matterport documents, and the
 * component watches for a load that never arrives so a dead or unauthorised
 * model id degrades to a link rather than an empty black rectangle.
 */
export function MatterportEmbed({ modelId, title }: MatterportEmbedProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setState((current) => (current === 'loading' ? 'failed' : current));
    }, 12000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [modelId]);

  const src = `https://my.matterport.com/show/?m=${encodeURIComponent(
    modelId,
  )}&play=1&qs=1&brand=0&help=0&title=0&hl=2`;

  if (state === 'failed') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950 p-8 text-center">
        <i className="fa-solid fa-cube text-2xl text-white/35" aria-hidden="true" />
        <p className="text-[13px] text-white/70">
          This Matterport space could not be reached.
        </p>
        <p className="max-w-sm text-[11px] leading-relaxed text-white/45">
          Set <code className="font-mono text-white/70">NEXT_PUBLIC_MATTERPORT_MODEL_ID</code> to a
          model your account can serve, or stay in the built-in 360° walkover, which needs no
          third-party service.
        </p>
        <a
          href={`https://my.matterport.com/show/?m=${encodeURIComponent(modelId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 rounded-full border border-white/25 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/80 transition-colors hover:bg-white hover:text-ink-900"
        >
          Open on Matterport
        </a>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <iframe
        title={`Matterport 3D tour — ${title}`}
        src={src}
        className="h-full w-full border-0"
        allow="xr-spatial-tracking; fullscreen; accelerometer; gyroscope; vr"
        allowFullScreen
        loading="lazy"
        onLoad={() => setState('ready')}
      />
      {state === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink-950/75">
          <span className="font-crest text-[10px] uppercase tracking-[0.28em] text-white/60">
            Loading Matterport
          </span>
        </div>
      )}
    </div>
  );
}
