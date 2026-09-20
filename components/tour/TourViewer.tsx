'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Property, PropertyTour, TourNode } from '@/lib/types';
import { PanoramaEngine, type MeasurePoint, type ScreenHotspot } from './panorama-engine';
import { FloorPlan } from './FloorPlan';
import { MatterportEmbed } from './MatterportEmbed';
import { StreetViewEmbed } from './StreetViewEmbed';
import { useSession } from '@/lib/store';

type Mode = 'walk' | 'dollhouse' | 'floorplan' | 'matterport' | 'streetview';

interface TourViewerProps {
  property: Property;
  tour: PropertyTour;
  /** `panel` sits inside the detail page; `immersive` fills the viewport. */
  layout?: 'panel' | 'immersive';
  className?: string;
}

export function TourViewer({
  property,
  tour,
  layout = 'panel',
  className = '',
}: TourViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<PanoramaEngine | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const [nodeId, setNodeId] = useState(tour.startNode);
  const [mode, setMode] = useState<Mode>('walk');
  const [hotspots, setHotspots] = useState<ScreenHotspot[]>([]);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [gyro, setGyro] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [units, setUnits] = useState<'m' | 'ft'>('ft');
  const [compass, setCompass] = useState(0);

  const markVisited = useSession((state) => state.markVisited);
  const visitedNodes = useSession((state) => state.visitedNodes);

  const node = useMemo(
    () => tour.nodes.find((n) => n.id === nodeId) ?? tour.nodes[0],
    [tour.nodes, nodeId],
  );

  const neighbours = useMemo(
    () =>
      node.hotspots
        .filter((h) => h.kind === 'nav' && h.to)
        .map((h) => tour.nodes.find((n) => n.id === h.to))
        .filter((n): n is TourNode => Boolean(n)),
    [node, tour.nodes],
  );

  const visitedCount = useMemo(
    () => tour.nodes.filter((n) => visitedNodes.includes(`${property.slug}:${n.id}`)).length,
    [tour.nodes, visitedNodes, property.slug],
  );

  // --------------------------------------------------------------- engine ---

  useEffect(() => {
    if (!mountRef.current || mode === 'matterport' || mode === 'streetview') return undefined;
    if (engineRef.current) return undefined;

    const engine = new PanoramaEngine(mountRef.current, {
      onHotspots: setHotspots,
      onLoadProgress: setProgress,
      onNodeReady: (id) => {
        setReady(true);
        markVisited(property.slug, id);
      },
      onMeasureUpdate: (points, metres) => {
        setMeasurePoints(points);
        setDistance(metres);
      },
      onViewChange: (yaw) => setCompass(((yaw % 360) + 360) % 360),
    });
    engineRef.current = engine;
    engine.goTo(tour.nodes.find((n) => n.id === tour.startNode) ?? tour.nodes[0], {
      instant: true,
    });

    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    const observer = new ResizeObserver(onResize);
    if (mountRef.current) observer.observe(mountRef.current);

    return () => {
      window.removeEventListener('resize', onResize);
      observer.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
    // Engine lifecycle is intentionally tied to the mount, not to node changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode === 'matterport', mode === 'streetview']);

  // Warm the textures for every room reachable in one step.
  useEffect(() => {
    if (ready) engineRef.current?.prefetch(neighbours);
  }, [ready, neighbours]);

  const walkTo = useCallback(
    (targetId: string) => {
      const target = tour.nodes.find((n) => n.id === targetId);
      if (!target || !engineRef.current) return;
      setReady(false);
      setActiveInfo(null);
      setNodeId(targetId);
      setMode('walk');
      engineRef.current.goTo(target);
    },
    [tour.nodes],
  );

  // --------------------------------------------------------------- chrome ---

  const toggleAutoRotate = () => {
    const next = !autoRotate;
    setAutoRotate(next);
    engineRef.current?.setAutoRotate(next);
  };

  const toggleMeasure = () => {
    const next = !measuring;
    setMeasuring(next);
    engineRef.current?.setMeasuring(next);
  };

  const toggleFullscreen = async () => {
    const element = shellRef.current;
    if (!element) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setFullscreen(false);
    } else {
      await element.requestFullscreen().catch(() => undefined);
      setFullscreen(true);
    }
  };

  const toggleGyro = async () => {
    if (!engineRef.current) return;
    if (gyro) {
      engineRef.current.disableGyro();
      setGyro(false);
      return;
    }
    const granted = await engineRef.current.enableGyro();
    setGyro(granted);
  };

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Number keys jump straight to a room; `?` opens the shortcut sheet.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === '?') setShowHelp((open) => !open);
      if (event.key === 'Escape') {
        setActiveInfo(null);
        setShowHelp(false);
      }
      const index = Number(event.key);
      if (!Number.isNaN(index) && index >= 1 && index <= Math.min(9, tour.nodes.length)) {
        walkTo(tour.nodes[index - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tour.nodes, walkTo]);

  const distanceLabel =
    distance == null
      ? null
      : units === 'ft'
        ? `${(distance * 3.28084).toFixed(1)} ft`
        : `${distance.toFixed(2)} m`;

  const hasMatterport = Boolean(tour.modelId);
  const immersive = layout === 'immersive';

  return (
    <div
      ref={shellRef}
      className={[
        'relative overflow-hidden bg-ink-950 text-white',
        immersive ? 'h-full w-full' : 'aspect-[16/10] w-full',
        className,
      ].join(' ')}
      data-purpose="tour-viewer"
    >
      {/* ---------------------------------------------------------- stage -- */}
      {mode === 'matterport' && tour.modelId ? (
        <MatterportEmbed modelId={tour.modelId} title={tour.title} />
      ) : mode === 'streetview' ? (
        <StreetViewEmbed lat={property.lat} lng={property.lng} title={property.title} />
      ) : (
        <>
          <div
            ref={mountRef}
            className="absolute inset-0 cursor-grab"
            style={{ cursor: measuring ? 'crosshair' : undefined }}
          />

          {/* Projected hotspots, rendered as real DOM so they stay accessible. */}
          <div className="pointer-events-none absolute inset-0">
            {hotspots.map((spot) =>
              !spot.visible ? null : (
                <div
                  key={spot.key}
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: spot.x,
                    top: spot.y,
                    transform: `translate(-50%, -50%) scale(${spot.scale})`,
                  }}
                >
                  {spot.hotspot.kind === 'nav' ? (
                    <button
                      type="button"
                      onClick={() => spot.hotspot.to && walkTo(spot.hotspot.to)}
                      className="group relative flex flex-col items-center"
                      title={`Walk to ${spot.hotspot.label}`}
                    >
                      <span className="relative flex h-11 w-11 items-center justify-center">
                        <span className="absolute inset-0 animate-hotspot-pulse rounded-full bg-white/70" />
                        <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/90 bg-white/25 backdrop-blur-sm transition-all duration-200 group-hover:scale-110 group-hover:bg-white/45">
                          <i
                            className="fa-solid fa-person-walking text-[15px] text-white drop-shadow"
                            aria-hidden="true"
                          />
                        </span>
                      </span>
                      <span className="mt-1.5 whitespace-nowrap rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        {spot.hotspot.label}
                      </span>
                      <span className="sr-only">Walk to {spot.hotspot.label}</span>
                    </button>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveInfo(activeInfo === spot.key ? null : spot.key)
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-[#0f2b48]/85 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
                        aria-expanded={activeInfo === spot.key}
                      >
                        i<span className="sr-only">{spot.hotspot.label}</span>
                      </button>
                      {activeInfo === spot.key && (
                        <div className="absolute left-1/2 top-9 z-20 w-60 -translate-x-1/2 animate-fade-up rounded-xs border border-white/12 bg-black/85 p-3 text-left backdrop-blur-md">
                          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#c5a869]">
                            {spot.hotspot.label}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-ink-100">
                            {spot.hotspot.body}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ),
            )}

            {/* Measurement overlay */}
            {measurePoints.length > 0 && (
              <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                {measurePoints.length === 2 && (
                  <line
                    x1={measurePoints[0].x}
                    y1={measurePoints[0].y}
                    x2={measurePoints[1].x}
                    y2={measurePoints[1].y}
                    stroke="#c5a869"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                )}
                {measurePoints.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r={5}
                    fill="#c5a869"
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                ))}
              </svg>
            )}

            {distanceLabel && measurePoints.length === 2 && (
              <div
                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c5a869] px-2.5 py-1 text-[11px] font-bold text-ink-900 shadow-lg"
                style={{
                  left: (measurePoints[0].x + measurePoints[1].x) / 2,
                  top: (measurePoints[0].y + measurePoints[1].y) / 2,
                }}
              >
                {distanceLabel}
              </div>
            )}
          </div>

          {/* Loading veil */}
          {!ready && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-ink-950/88 backdrop-blur-sm">
              <div className="h-px w-40 overflow-hidden bg-white/20">
                <div
                  className="h-full bg-[#c5a869] transition-all duration-300"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="mt-3 font-crest text-[10px] uppercase tracking-[0.28em] text-white/70">
                Entering {node.name}
              </p>
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------- top bar -- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pb-8 pt-3 px-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[11px] tracking-wide">
            {tour.nodes.findIndex((n) => n.id === node.id) + 1}/{tour.nodes.length}
          </span>
          <span>
            <span className="block text-[13px] font-medium tracking-tight drop-shadow-md">
              {mode === 'matterport' ? 'Matterport' : node.name}
            </span>
            <span className="block text-[10px] text-ink-100 drop-shadow-md">
              {tour.title} • Presented by {tour.capturedBy}
            </span>
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {/* Compass */}
          <div
            className="tour-glass hidden h-9 w-9 items-center justify-center rounded-full sm:flex"
            title={`Facing ${Math.round(compass)}°`}
          >
            <i
              className="fa-solid fa-location-arrow text-[12px] text-[#c5a869]"
              style={{ transform: `rotate(${compass - 45}deg)` }}
              aria-hidden="true"
            />
            <span className="sr-only">Compass heading {Math.round(compass)} degrees</span>
          </div>
          <button type="button" className="tour-pill px-3 text-[11px]" onClick={toggleFullscreen}>
            <i
              className={`fa-solid ${fullscreen ? 'fa-compress' : 'fa-expand'} text-[12px]`}
              aria-hidden="true"
            />
            <span className="ml-1.5 hidden sm:inline">
              {fullscreen ? 'Exit' : 'Fullscreen'}
            </span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------- mode switcher -- */}
      <div className="pointer-events-auto absolute bottom-3 left-3 z-40 flex flex-wrap items-center gap-2">
        <div className="tour-pill">
          <ModeButton
            icon="fa-person-walking"
            label="Walk"
            active={mode === 'walk'}
            onClick={() => setMode('walk')}
          />
          <ModeButton
            icon="fa-cube"
            label="Dollhouse"
            active={mode === 'dollhouse'}
            onClick={() => setMode(mode === 'dollhouse' ? 'walk' : 'dollhouse')}
          />
          <ModeButton
            icon="fa-table-cells-large"
            label="Floor plan"
            active={mode === 'floorplan'}
            onClick={() => setMode(mode === 'floorplan' ? 'walk' : 'floorplan')}
          />
          <ModeButton
            icon="fa-ruler"
            label="Measure"
            active={measuring}
            onClick={toggleMeasure}
          />
          {hasMatterport && (
            <ModeButton
              icon="fa-vr-cardboard"
              label="Matterport"
              active={mode === 'matterport'}
              onClick={() => setMode(mode === 'matterport' ? 'walk' : 'matterport')}
            />
          )}
          <ModeButton
            icon="fa-street-view"
            label="Street View"
            active={mode === 'streetview'}
            onClick={() => setMode(mode === 'streetview' ? 'walk' : 'streetview')}
          />
        </div>

        {measuring && (
          <div className="tour-glass flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px]">
            <span className="text-white/70">
              {measurePoints.length < 2 ? 'Tap two floor points' : distanceLabel}
            </span>
            <button
              type="button"
              className="font-semibold text-[#c5a869]"
              onClick={() => setUnits(units === 'ft' ? 'm' : 'ft')}
            >
              {units === 'ft' ? 'ft' : 'm'}
            </button>
            <button
              type="button"
              className="text-white/60 hover:text-white"
              onClick={() => engineRef.current?.clearMeasurement()}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------ right controls -- */}
      <div className="pointer-events-auto absolute bottom-3 right-3 z-40 flex items-center gap-2">
        <div className="tour-pill">
          <button
            type="button"
            className={`tour-btn ${autoRotate ? 'tour-btn-active' : ''}`}
            onClick={toggleAutoRotate}
            title="Auto-rotate"
          >
            <i className="fa-solid fa-arrows-rotate" aria-hidden="true" />
            <span className="sr-only">Toggle auto-rotate</span>
          </button>
          <button
            type="button"
            className="tour-btn"
            onClick={() => engineRef.current?.zoomBy(-8)}
            title="Zoom in"
          >
            <i className="fa-solid fa-magnifying-glass-plus" aria-hidden="true" />
            <span className="sr-only">Zoom in</span>
          </button>
          <button
            type="button"
            className="tour-btn"
            onClick={() => engineRef.current?.zoomBy(8)}
            title="Zoom out"
          >
            <i className="fa-solid fa-magnifying-glass-minus" aria-hidden="true" />
            <span className="sr-only">Zoom out</span>
          </button>
          <button
            type="button"
            className={`tour-btn sm:hidden ${gyro ? 'tour-btn-active' : ''}`}
            onClick={toggleGyro}
            title="Move your phone to look around"
          >
            <i className="fa-solid fa-mobile-screen" aria-hidden="true" />
            <span className="sr-only">Toggle motion controls</span>
          </button>
          <button
            type="button"
            className="tour-btn"
            onClick={() => setShowHelp((open) => !open)}
            title="Keyboard shortcuts"
          >
            <i className="fa-solid fa-keyboard" aria-hidden="true" />
            <span className="sr-only">Keyboard shortcuts</span>
          </button>
        </div>

        {!immersive && (
          <Link
            href={`/property/${property.slug}/tour`}
            className="tour-glass flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors hover:bg-white hover:text-ink-900"
          >
            <i className="fa-solid fa-up-right-and-down-left-from-center" aria-hidden="true" />
            Immersive
          </Link>
        )}
      </div>

      {/* ------------------------------------------------------- minimap -- */}
      {(mode === 'floorplan' || mode === 'dollhouse') && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink-950/94 p-6 pb-20 backdrop-blur-sm">
          <FloorPlan
            tour={tour}
            activeNodeId={node.id}
            visited={tour.nodes
              .filter((n) => visitedNodes.includes(`${property.slug}:${n.id}`))
              .map((n) => n.id)}
            variant={mode === 'dollhouse' ? 'dollhouse' : 'plan'}
            onSelect={(id) => walkTo(id)}
            onClose={() => setMode('walk')}
          />
        </div>
      )}

      {/* The docked minimap only earns its space in the full-viewport layout;
          inside the detail-page panel it would crowd the filmstrip, so there the
          floor-plan button is the way in. */}
      {mode === 'walk' && immersive && (
        <div className="pointer-events-auto absolute right-3 top-16 z-20 hidden w-[190px] lg:block">
          <FloorPlan
            tour={tour}
            activeNodeId={node.id}
            visited={tour.nodes
              .filter((n) => visitedNodes.includes(`${property.slug}:${n.id}`))
              .map((n) => n.id)}
            variant="mini"
            onSelect={(id) => walkTo(id)}
          />
          <p className="mt-1.5 text-right text-[10px] uppercase tracking-[0.14em] text-white/55">
            {visitedCount}/{tour.nodes.length} rooms visited
          </p>
        </div>
      )}

      {/* ------------------------------------------------- room filmstrip -- */}
      {/* The strip spans the full width, so the wrapper must not swallow clicks
          aimed at the panorama behind it — only the thumbnails are interactive. */}
      <div
        className={[
          'pointer-events-none absolute inset-x-0 z-10 overflow-x-auto px-3 no-scrollbar',
          immersive ? 'bottom-16' : 'bottom-14',
        ].join(' ')}
      >
        <div className="pointer-events-auto mx-auto flex w-max gap-2">
          {tour.nodes.map((candidate, index) => {
            const isActive = candidate.id === node.id;
            const isNeighbour = neighbours.some((n) => n.id === candidate.id);
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => walkTo(candidate.id)}
                className={[
                  'group relative shrink-0 overflow-hidden rounded-sm border transition-all',
                  immersive ? 'h-12 w-20' : 'h-10 w-16',
                  isActive
                    ? 'border-[#c5a869] ring-1 ring-[#c5a869]'
                    : isNeighbour
                      ? 'border-white/60'
                      : 'border-white/20 opacity-70 hover:opacity-100',
                ].join(' ')}
                title={`${index + 1}. ${candidate.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/panoramas/${candidate.pano}-preview.jpg`}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.1em]">
                  {candidate.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------ help card -- */}
      {showHelp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink-950/88 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xs border border-white/12 bg-ink-950 p-6">
            <div className="flex items-start justify-between">
              <h3 className="font-serif-title text-lg">Getting around</h3>
              <button
                type="button"
                className="tour-btn"
                onClick={() => setShowHelp(false)}
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <dl className="mt-4 space-y-2 text-[12px] text-ink-200">
              {[
                ['Drag / swipe', 'Look around the room'],
                ['Scroll / pinch', 'Zoom in and out'],
                ['Arrow keys', 'Look without a pointer'],
                ['1 – 9', 'Jump straight to a room'],
                ['Click a ring', 'Walk to the next room'],
                ['?', 'Open or close this card'],
              ].map(([key, meaning]) => (
                <div key={key} className="flex items-center justify-between gap-6">
                  <dt className="rounded border border-white/20 px-2 py-0.5 font-mono text-[11px]">
                    {key}
                  </dt>
                  <dd className="flex-1 text-right text-white/70">{meaning}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeButton({
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
      className={`tour-btn ${active ? 'tour-btn-active' : ''}`}
      title={label}
      aria-pressed={active}
    >
      <i className={`fa-solid ${icon}`} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
