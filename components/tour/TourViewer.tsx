'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Property, PropertyTour } from '@/lib/types';
import {
  PanoramaEngine,
  type FloorTarget,
  type MeasurePoint,
  type RouteState,
  type ScreenHotspot,
} from './panorama-engine';
import type { DollhouseEngine } from './dollhouse-engine';
import { Dollhouse } from './Dollhouse';
import { FloorPlan } from './FloorPlan';
import { MatterportEmbed } from './MatterportEmbed';
import { StreetViewEmbed } from './StreetViewEmbed';
import { useSession } from '@/lib/store';
import { findRoute, navHotspots, nodeById, nodeHeadings } from '@/lib/tour-graph';

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
  const dollhouseRef = useRef<DollhouseEngine | null>(null);
  const nodeRef = useRef(tour.startNode);
  const pointerInside = useRef(false);

  const [nodeId, setNodeId] = useState(tour.startNode);
  const [mode, setMode] = useState<Mode>('walk');
  const [hotspots, setHotspots] = useState<ScreenHotspot[]>([]);
  const [progress, setProgress] = useState(0);
  const [booted, setBooted] = useState(false);
  const [route, setRoute] = useState<RouteState | null>(null);
  const [leg, setLeg] = useState<{ from: string; to: string } | null>(null);
  const [floorTarget, setFloorTarget] = useState<FloorTarget | null>(null);
  const [dollhouseYaw, setDollhouseYaw] = useState(0);
  const [overlayLeaving, setOverlayLeaving] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [gyro, setGyro] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [units, setUnits] = useState<'m' | 'ft'>('ft');
  const [coach, setCoach] = useState(true);

  const markVisited = useSession((state) => state.markVisited);
  const visitedNodes = useSession((state) => state.visitedNodes);
  const storeReducedMotion = useSession((state) => state.reducedMotion);
  const prefersReducedMotion = usePrefersReducedMotion();
  const reducedMotion = storeReducedMotion || prefersReducedMotion;

  const node = useMemo(() => nodeById(tour, nodeId) ?? tour.nodes[0], [tour, nodeId]);
  const headings = useMemo(() => nodeHeadings(tour), [tour]);
  const neighbours = useMemo(() => new Set(navHotspots(node).map((h) => h.to)), [node]);
  const visited = useMemo(
    () =>
      tour.nodes
        .filter((n) => visitedNodes.includes(`${property.slug}:${n.id}`))
        .map((n) => n.id),
    [tour.nodes, visitedNodes, property.slug],
  );

  const embedded = mode === 'matterport' || mode === 'streetview';
  const overlay = mode === 'dollhouse' || mode === 'floorplan';
  const immersive = layout === 'immersive';

  // --------------------------------------------------------------- engine ---

  useEffect(() => {
    if (!mountRef.current || embedded) return undefined;
    if (engineRef.current) return undefined;

    const engine = new PanoramaEngine(mountRef.current, tour, {
      onHotspots: setHotspots,
      onLoadProgress: setProgress,
      onNodeChange: (id) => {
        nodeRef.current = id;
        setNodeId(id);
        setActiveInfo(null);
        setBooted(true);
        markVisited(property.slug, id);
      },
      onNodeReady: () => setProgress(1),
      onRoute: setRoute,
      onLeg: setLeg,
      onFloorTarget: setFloorTarget,
      onMeasureUpdate: (points, metres) => {
        setMeasurePoints(points);
        setDistance(metres);
      },
      onInteract: () => setCoach(false),
      reducedMotion,
      styleTarget: shellRef.current ?? undefined,
      keyScope: immersive ? null : shellRef.current,
    });
    engineRef.current = engine;
    engine.start(nodeRef.current);

    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    const observer = new ResizeObserver(onResize);
    observer.observe(mountRef.current);

    return () => {
      window.removeEventListener('resize', onResize);
      observer.disconnect();
      engine.dispose();
      engineRef.current = null;
      setRoute(null);
      setLeg(null);
      setHotspots([]);
    };
    // Engine lifecycle is intentionally tied to the mount, not to node changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, tour]);

  useEffect(() => {
    engineRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  // Nothing to draw under an opaque overlay.
  useEffect(() => {
    engineRef.current?.setPaused(overlay && !overlayLeaving);
  }, [overlay, overlayLeaving]);

  // The coach card bows out on its own after a few seconds.
  useEffect(() => {
    if (!coach || !booted) return undefined;
    const timer = window.setTimeout(() => setCoach(false), 9000);
    return () => window.clearTimeout(timer);
  }, [coach, booted]);

  /** Every way of choosing a room ends here: a walk through the house, door by door. */
  const walkTo = useCallback((targetId: string) => {
    setActiveInfo(null);
    setCoach(false);
    setMode((current) => (current === 'floorplan' || current === 'dollhouse' ? 'walk' : current));
    engineRef.current?.walkTo(targetId);
  }, []);

  const toggleGuided = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setCoach(false);
    setMode('walk');
    if (route?.kind === 'guided') engine.stopRoute();
    else engine.playGuidedTour();
  }, [route?.kind]);

  // --------------------------------------------------------------- chrome ---

  const openDollhouse = () => {
    if (mode === 'dollhouse') {
      setMode('walk');
      return;
    }
    const engine = engineRef.current;
    if (route?.kind === 'guided') engine?.stopRoute();
    setDollhouseYaw(engine?.getView().yaw ?? 0);
    setMode('dollhouse');
  };

  /** Fly down into the room you stand in, then walk from there to the one chosen. */
  const enterFromDollhouse = async (targetId: string) => {
    const engine = engineRef.current;
    if (!engine || overlayLeaving) return;
    const here = engine.currentNodeId ?? nodeId;
    dollhouseRef.current?.setRoute(findRoute(tour, here, targetId));
    await dollhouseRef.current?.flyInto(here, engine.getView().yaw);
    setOverlayLeaving(true);
    window.setTimeout(
      () => {
        setMode('walk');
        setOverlayLeaving(false);
        if (targetId !== here) engine.walkTo(targetId);
      },
      reducedMotion ? 0 : 320,
    );
  };

  const toggleAutoRotate = () => {
    const next = !autoRotate;
    setAutoRotate(next);
    engineRef.current?.setAutoRotate(next);
  };

  const toggleMeasure = () => {
    const next = !measuring;
    setMeasuring(next);
    setMode('walk');
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

  // Number keys walk to a room; G runs the guided tour; `?` opens the key sheet.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const shell = shellRef.current;
      const owns =
        immersive || pointerInside.current || Boolean(shell?.contains(document.activeElement));
      if (!owns) return;

      if (event.key === '?') setShowHelp((open) => !open);
      if (event.key === 'Escape') {
        setActiveInfo(null);
        setShowHelp(false);
        if (mode === 'dollhouse' || mode === 'floorplan') setMode('walk');
        else engineRef.current?.stopRoute();
      }
      if (event.key === 'g' || event.key === 'G') toggleGuided();
      const index = Number(event.key);
      if (!Number.isNaN(index) && index >= 1 && index <= Math.min(9, tour.nodes.length)) {
        walkTo(tour.nodes[index - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tour.nodes, walkTo, toggleGuided, immersive, mode]);

  const distanceLabel =
    distance == null
      ? null
      : units === 'ft'
        ? `${(distance * 3.28084).toFixed(1)} ft`
        : `${distance.toFixed(2)} m`;

  const hasMatterport = Boolean(tour.modelId);
  const heading = headings.get(node.id) ?? 0;
  const routeNames = (route?.path ?? []).map((id) => nodeById(tour, id)?.name ?? id);
  const showRouteHud =
    route && mode === 'walk' && (route.kind !== 'step' || route.path.length > 2);
  const routeProgress = routeSummary(route);

  return (
    <div
      ref={shellRef}
      className={[
        'relative overflow-hidden bg-ink-950 text-white',
        immersive ? 'h-full w-full' : 'aspect-[16/10] w-full',
        className,
      ].join(' ')}
      data-purpose="tour-viewer"
      onPointerEnter={() => {
        pointerInside.current = true;
      }}
      onPointerLeave={() => {
        pointerInside.current = false;
      }}
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
            className="absolute inset-0"
            style={{ cursor: measuring ? 'crosshair' : undefined }}
          />

          {/* Speed vignette: deepens while walking, driven by --tour-speed. */}
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              opacity: 'calc(var(--tour-speed, 0) * 0.85)',
              background:
                'radial-gradient(ellipse at center, transparent 42%, rgba(6, 8, 10, 0.62) 100%)',
            }}
            aria-hidden="true"
          />

          {/* Projected hotspots, rendered as real DOM so they stay accessible. */}
          <div className="pointer-events-none absolute inset-0 z-[2]">
            {mode === 'walk' &&
              hotspots.map((spot) => {
                if (!spot.visible) return null;
                const destination = spot.hotspot.to ? nodeById(tour, spot.hotspot.to) : null;
                const levels = destination ? destination.floor - node.floor : 0;
                return (
                  <div
                    key={spot.key}
                    className="pointer-events-auto absolute animate-fade-in"
                    style={{
                      left: spot.x,
                      top: spot.y,
                      transform: `translate(-50%, -50%) scale(${spot.scale})`,
                    }}
                  >
                    {spot.hotspot.kind === 'nav' && destination ? (
                      <button
                        type="button"
                        onClick={() => walkTo(destination.id)}
                        className="tour-waypoint group"
                        title={`Walk to ${spot.hotspot.label}`}
                        style={
                          {
                            '--tilt': `${Math.round(clampNumber(70 + spot.hotspot.pitch, 44, 62))}deg`,
                          } as React.CSSProperties
                        }
                      >
                        {levels !== 0 ? (
                          <span className="tour-waypoint-stairs" aria-hidden="true">
                            <i className="fa-solid fa-stairs text-[15px]" />
                            <i
                              className={`fa-solid ${levels > 0 ? 'fa-caret-up' : 'fa-caret-down'} absolute -right-1 -top-1 text-[12px] text-gold-400`}
                            />
                          </span>
                        ) : (
                          <span className="tour-waypoint-disc" aria-hidden="true" />
                        )}
                        <span className="tour-waypoint-label">{spot.hotspot.label}</span>
                        <span className="sr-only">Walk to {spot.hotspot.label}</span>
                      </button>
                    ) : (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveInfo(activeInfo === spot.key ? null : spot.key)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-sovereign-sapphire/85 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
                          aria-expanded={activeInfo === spot.key}
                        >
                          i<span className="sr-only">{spot.hotspot.label}</span>
                        </button>
                        {activeInfo === spot.key && (
                          <div className="absolute left-1/2 top-9 z-20 w-60 -translate-x-1/2 animate-fade-up rounded-xs border border-white/12 bg-black/85 p-3 text-left backdrop-blur-md">
                            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-500">
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
                );
              })}

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
                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500 px-2.5 py-1 text-[11px] font-bold text-ink-900 shadow-lg"
                style={{
                  left: (measurePoints[0].x + measurePoints[1].x) / 2,
                  top: (measurePoints[0].y + measurePoints[1].y) / 2,
                }}
              >
                {distanceLabel}
              </div>
            )}
          </div>

          {/* The room a click on the floor would walk to, beside the cursor. */}
          {floorTarget?.label && mode === 'walk' && (
            <div
              className="pointer-events-none absolute z-[3]"
              style={{ left: 'var(--tour-px, -100px)', top: 'var(--tour-py, -100px)' }}
            >
              <span className="ml-5 mt-4 block whitespace-nowrap rounded-full bg-gold-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-900 shadow-lg">
                <i className="fa-solid fa-person-walking mr-1.5" aria-hidden="true" />
                {floorTarget.label}
              </span>
            </div>
          )}

          {/* Loading veil — only for the first room; later rooms load mid-walk. */}
          {!booted && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-ink-950/90 backdrop-blur-sm">
              <div className="h-px w-40 overflow-hidden bg-white/20">
                <div
                  className="h-full bg-gold-500 transition-all duration-300"
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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent px-3 pb-8 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[11px] tracking-wide">
            {tour.nodes.findIndex((n) => n.id === node.id) + 1}/{tour.nodes.length}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium tracking-tight drop-shadow-md">
              {mode === 'matterport'
                ? 'Matterport'
                : mode === 'streetview'
                  ? 'Street View'
                  : node.name}
            </span>
            <span className="block truncate text-[10px] text-ink-100 drop-shadow-md">
              {tour.title} • Presented by {tour.capturedBy}
            </span>
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {!embedded && (
            <div
              className="tour-glass hidden h-9 w-9 items-center justify-center rounded-full sm:flex"
              title="Facing"
            >
              <i
                className="fa-solid fa-location-arrow text-[12px] text-gold-500"
                style={{
                  transform: `rotate(calc((var(--tour-yaw, 0) + ${heading.toFixed(1)}) * 1deg - 45deg))`,
                }}
                aria-hidden="true"
              />
              <span className="sr-only">Compass</span>
            </div>
          )}
          <button type="button" className="tour-pill px-3 text-[11px]" onClick={toggleFullscreen}>
            <i
              className={`fa-solid ${fullscreen ? 'fa-compress' : 'fa-expand'} text-[12px]`}
              aria-hidden="true"
            />
            <span className="ml-1.5 hidden sm:inline">{fullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------- route HUD -- */}
      {showRouteHud && route && (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-40 flex justify-center px-3">
          <div className="tour-glass pointer-events-auto flex max-w-full animate-fade-down items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 shadow-pill">
            <span className="eyebrow shrink-0 text-gold-400">
              {route.kind === 'guided' ? 'Guided tour' : 'Walking'}
            </span>

            {route.kind === 'guided' ? (
              <span className="flex min-w-0 items-center gap-2 text-[11px]">
                <span className="truncate text-white">
                  {route.dwelling ? `Looking around ${node.name}` : node.name}
                </span>
                <span className="shrink-0 font-mono text-white/55">
                  {routeProgress.seen}/{routeProgress.total}
                </span>
              </span>
            ) : (
              <ol className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px]">
                {routeNames.map((name, index) => {
                  if (routeNames.length > 5 && index > 0 && index < routeNames.length - 1 && Math.abs(index - route.index) > 1) {
                    return index === 1 || index === routeNames.length - 2 ? (
                      <li key={index} className="text-white/35">…</li>
                    ) : null;
                  }
                  const state =
                    index < route.index ? 'done' : index === route.index ? 'here' : 'ahead';
                  return (
                    <li key={index} className="flex shrink-0 items-center gap-1.5">
                      {index > 0 && (
                        <i className="fa-solid fa-chevron-right text-[8px] text-white/35" aria-hidden="true" />
                      )}
                      <span
                        className={
                          state === 'here'
                            ? 'font-semibold text-gold-400'
                            : state === 'done'
                              ? 'text-white/45 line-through decoration-white/25'
                              : 'text-white/85'
                        }
                      >
                        {name}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            {route.loading && (
              <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-white/60">
                <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />
                Loading
              </span>
            )}

            <button
              type="button"
              onClick={() => engineRef.current?.stopRoute()}
              className="flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-white hover:text-ink-900"
            >
              <i className="fa-solid fa-stop text-[9px]" aria-hidden="true" />
              Stop
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------- coach card --- */}
      {coach && booted && mode === 'walk' && !route && (
        <div
          className={[
            'pointer-events-none absolute left-3 z-20 w-[min(21rem,calc(100%-1.5rem))]',
            immersive ? 'bottom-[7.75rem]' : 'bottom-[6.5rem]',
          ].join(' ')}
        >
          <div className="tour-glass pointer-events-auto w-full animate-fade-up rounded-xs p-4 shadow-pill">
            <div className="flex items-start justify-between gap-4">
              <p className="eyebrow text-gold-400">Walk through the home</p>
              <button
                type="button"
                className="-mr-1 -mt-1 text-white/50 transition-colors hover:text-white"
                onClick={() => setCoach(false)}
                aria-label="Dismiss tips"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <ul className="mt-3 space-y-2 text-[12px] text-white/80">
              <CoachTip icon="fa-hand-pointer" text="Click the floor or a ring to step into the next room" />
              <CoachTip icon="fa-arrow-up" text="Hold W or ↑ to keep walking — A/D or ←/→ to turn" />
              <CoachTip icon="fa-cube" text="Open the 3D dollhouse and pick any room — you walk there door by door" />
            </ul>
            <button type="button" onClick={toggleGuided} className="btn-gold mt-4 w-full justify-center">
              <i className="fa-solid fa-play mr-2 text-[11px]" aria-hidden="true" />
              Start guided tour
            </button>
          </div>
        </div>
      )}

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
            label="3D dollhouse"
            active={mode === 'dollhouse'}
            onClick={openDollhouse}
          />
          <ModeButton
            icon="fa-table-cells-large"
            label="Floor plan"
            active={mode === 'floorplan'}
            onClick={() => setMode(mode === 'floorplan' ? 'walk' : 'floorplan')}
          />
          <ModeButton
            icon={route?.kind === 'guided' ? 'fa-pause' : 'fa-play'}
            label={route?.kind === 'guided' ? 'Stop guided tour' : 'Guided tour'}
            active={route?.kind === 'guided'}
            onClick={toggleGuided}
          />
          <ModeButton icon="fa-ruler" label="Measure" active={measuring} onClick={toggleMeasure} />
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
              className="font-semibold text-gold-500"
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
        {!embedded && (
          <div className="tour-pill">
            <button
              type="button"
              className="tour-btn"
              onClick={() => {
                setCoach(false);
                engineRef.current?.step(1);
              }}
              title="Step forward (W / ↑)"
            >
              <i className="fa-solid fa-circle-arrow-up" aria-hidden="true" />
              <span className="sr-only">Step forward through the doorway ahead</span>
            </button>
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
              className="tour-btn hidden sm:flex"
              onClick={() => engineRef.current?.zoomBy(-8)}
              title="Zoom in"
            >
              <i className="fa-solid fa-magnifying-glass-plus" aria-hidden="true" />
              <span className="sr-only">Zoom in</span>
            </button>
            <button
              type="button"
              className="tour-btn hidden sm:flex"
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
        )}

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

      {/* ------------------------------------------------------- overlays -- */}
      {mode === 'floorplan' && (
        <div className="absolute inset-0 z-30 flex animate-fade-in items-center justify-center bg-ink-950/94 p-6 pb-20 backdrop-blur-sm">
          <FloorPlan
            tour={tour}
            activeNodeId={node.id}
            visited={visited}
            variant="plan"
            route={route?.path}
            leg={leg}
            onSelect={walkTo}
            onClose={() => setMode('walk')}
          />
        </div>
      )}

      {mode === 'dollhouse' && (
        <div
          className={[
            'absolute inset-0 z-30 bg-ink-950 transition-opacity duration-300',
            overlayLeaving ? 'opacity-0' : 'animate-fade-in opacity-100',
          ].join(' ')}
        >
          <Dollhouse
            tour={tour}
            activeNodeId={node.id}
            visited={visited}
            entryYaw={dollhouseYaw}
            reducedMotion={reducedMotion}
            controllerRef={dollhouseRef}
            onSelect={enterFromDollhouse}
            onClose={() => setMode('walk')}
          />
        </div>
      )}

      {/* The docked minimap only earns its space in the full-viewport layout;
          inside the detail-page panel it would crowd the filmstrip, so there the
          floor-plan button is the way in. */}
      {mode === 'walk' && immersive && (
        <div className="pointer-events-auto absolute right-3 top-16 z-20 hidden w-[200px] lg:block">
          <FloorPlan
            tour={tour}
            activeNodeId={node.id}
            visited={visited}
            variant="mini"
            route={route?.path}
            leg={leg}
            onSelect={walkTo}
          />
          <p className="mt-1.5 text-right text-[10px] uppercase tracking-[0.14em] text-white/55">
            {visited.length}/{tour.nodes.length} rooms visited
          </p>
        </div>
      )}

      {/* ------------------------------------------------- room filmstrip -- */}
      {/* The strip spans the full width, so the wrapper must not swallow clicks
          aimed at the panorama behind it — only the thumbnails are interactive. */}
      {!embedded && mode !== 'dollhouse' && (
        <div
          className={[
            'pointer-events-none absolute inset-x-0 z-10 overflow-x-auto px-3 no-scrollbar',
            immersive ? 'bottom-16' : 'bottom-14',
          ].join(' ')}
        >
          <div className="pointer-events-auto mx-auto flex w-max gap-2">
            {tour.nodes.map((candidate, index) => {
              const isActive = candidate.id === node.id;
              const isNeighbour = neighbours.has(candidate.id);
              const onRoute = Boolean(route?.path.includes(candidate.id)) && !isActive;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => walkTo(candidate.id)}
                  className={[
                    'group relative shrink-0 overflow-hidden rounded-sm border transition-all',
                    immersive ? 'h-12 w-20' : 'h-10 w-16',
                    isActive
                      ? 'border-gold-500 ring-1 ring-gold-500'
                      : onRoute
                        ? 'border-gold-300/80'
                        : isNeighbour
                          ? 'border-white/60'
                          : 'border-white/20 opacity-70 hover:opacity-100',
                  ].join(' ')}
                  title={`${index + 1}. ${candidate.name}${isActive ? '' : ' — walk there'}`}
                >
                  <img
                    src={`/panoramas/${candidate.pano}-preview.jpg`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-0.5 top-0.5 rounded-sm bg-black/60 px-1 font-mono text-[8px] leading-tight text-white/80">
                    {index + 1}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.1em]">
                    {candidate.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------ help card -- */}
      {showHelp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink-950/88 p-6 backdrop-blur-sm">
          <div className="max-h-full w-full max-w-md overflow-y-auto rounded-xs border border-white/12 bg-ink-950 p-6">
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
                ['Click the floor', 'Walk through the doorway on that side'],
                ['W / ↑ (hold)', 'Walk forward, room after room'],
                ['S / ↓', 'Step back'],
                ['A D / ← →', 'Turn'],
                ['R F / PgUp PgDn', 'Look up and down'],
                ['Drag / swipe', 'Look around'],
                ['Scroll / pinch / + −', 'Zoom'],
                ['1 – 9', 'Walk to that room, door by door'],
                ['G', 'Start or stop the guided tour'],
                ['Esc', 'Stop walking, close overlays'],
                ['?', 'Open or close this card'],
              ].map(([key, meaning]) => (
                <div key={key} className="flex items-center justify-between gap-6">
                  <dt className="shrink-0 rounded border border-white/20 px-2 py-0.5 font-mono text-[11px]">
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

function CoachTip({ icon, text }: { icon: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <i className={`fa-solid ${icon} mt-0.5 w-4 shrink-0 text-center text-gold-400`} aria-hidden="true" />
      <span>{text}</span>
    </li>
  );
}

/** Rooms seen so far on a guided tour, counting each room once. */
function routeSummary(route: RouteState | null) {
  if (!route) return { seen: 0, total: 0 };
  const total = new Set(route.path).size;
  const seen = new Set(route.path.slice(0, route.index + 1)).size;
  return { seen, total };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}
