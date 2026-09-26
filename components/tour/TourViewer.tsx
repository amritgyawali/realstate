'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Property, PropertyTour } from '@/lib/types';
import { OUTSIDE, captureNodes, nodeById, stairFor } from '@/lib/tour/layout';
import { useSession } from '@/lib/store';
import {
  WalkEngine,
  type EnginePose,
  type EngineState,
  type OverlayItem,
  type TourMode,
} from './engine/WalkEngine';
import { createStore, useStore, type Store } from './engine-store';
import { FloorPlan } from './FloorPlan';
import { MatterportEmbed } from './MatterportEmbed';
import { StreetViewEmbed } from './StreetViewEmbed';

type Provider = 'engine' | 'matterport' | 'streetview';

interface TourViewerProps {
  property: Property;
  tour: PropertyTour;
  /** `panel` sits inside the detail page; `immersive` fills the viewport. */
  layout?: 'panel' | 'immersive';
  className?: string;
}

interface Measure {
  points: { x: number; y: number }[];
  metres: number | null;
}

const INITIAL_STATE: EngineState = {
  mode: 'overview',
  space: OUTSIDE,
  floor: 1,
  stop: -1,
  walking: false,
  flying: false,
  guided: false,
  level: 'all',
};

/**
 * The walkover. It opens on the whole house from outside; from there a visitor
 * walks up the path, through the front door and on through the house one step
 * at a time — never jumping from room to room.
 */
export function TourViewer({ property, tour, layout = 'panel', className = '' }: TourViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<WalkEngine | null>(null);

  const overlayStore = useMemo(() => createStore<OverlayItem[]>([]), []);
  const poseStore = useMemo(() => createStore<EnginePose | null>(null), []);
  const measureStore = useMemo(() => createStore<Measure>({ points: [], metres: null }), []);

  const [provider, setProvider] = useState<Provider>('engine');
  const [state, setState] = useState<EngineState>(INITIAL_STATE);
  const [progress, setProgress] = useState(0);
  const [destination, setDestination] = useState<string | null>(null);
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [units, setUnits] = useState<'m' | 'ft'>('ft');
  const [fullscreen, setFullscreen] = useState(false);
  const [gyro, setGyro] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [started, setStarted] = useState(false);

  // Keyboard input belongs to the tour when it fills the screen, or when the
  // visitor is pointing at or focused inside it; otherwise arrows scroll the page.
  const hoveredRef = useRef(false);
  const handlesKeys = useCallback(
    () =>
      layout === 'immersive' ||
      hoveredRef.current ||
      Boolean(shellRef.current?.contains(document.activeElement)),
    [layout],
  );
  const walkIdRef = useRef(0);

  const markVisited = useSession((session) => session.markVisited);
  const visitedNodes = useSession((session) => session.visitedNodes);
  const reducedMotion = useSession((session) => session.reducedMotion);

  const rooms = useMemo(() => captureNodes(tour), [tour]);
  const visited = useMemo(
    () => tour.nodes.filter((n) => visitedNodes.includes(`${property.slug}:${n.id}`)).map((n) => n.id),
    [tour.nodes, visitedNodes, property.slug],
  );
  const visitedRooms = rooms.filter((room) => visited.includes(room.id)).length;

  // --------------------------------------------------------------- engine ---

  useEffect(() => {
    if (provider !== 'engine' || !mountRef.current) return undefined;
    const prefersReduced =
      reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const engine = new WalkEngine(
      mountRef.current,
      tour,
      {
        onState: setState,
        onOverlay: overlayStore.set,
        onPose: poseStore.set,
        onProgress: setProgress,
        onVisit: (space) => markVisited(property.slug, space),
        onMeasure: (points, metres) => measureStore.set({ points, metres }),
      },
      { reducedMotion: prefersReduced, handlesKeys },
    );
    engineRef.current = engine;
    setState(engine.getState());

    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    const observer = new ResizeObserver(onResize);
    observer.observe(mountRef.current);
    return () => {
      window.removeEventListener('resize', onResize);
      observer.disconnect();
      engine.dispose();
      engineRef.current = null;
      overlayStore.set([]);
    };
    // The engine is rebuilt only when the tour or provider changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, tour]);

  const walkTo = useCallback(
    (space: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      setStarted(true);
      setActiveInfo(null);
      setDestination(space === OUTSIDE ? 'Front garden' : nodeById(tour, space)?.name ?? null);
      // A newer walk supersedes this one; only the latest may clear the pill.
      const id = ++walkIdRef.current;
      const walk =
        space === OUTSIDE ? engine.walkToStop(engine.graph.porch) : engine.walkToSpace(space);
      void walk.then(() => {
        if (walkIdRef.current === id) setDestination(null);
      });
    },
    [tour],
  );

  const approach = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setStarted(true);
    setDestination('the front door');
    const id = ++walkIdRef.current;
    void engine.approach().then(() => {
      if (walkIdRef.current === id) setDestination(null);
    });
  }, []);

  const setMode = (mode: TourMode) => {
    setActiveInfo(null);
    if (mode === 'walk') setStarted(true);
    if (mode !== 'walk' && measuring) {
      setMeasuring(false);
      engineRef.current?.setMeasuring(false);
    }
    engineRef.current?.setMode(mode);
  };

  const toggleGuided = () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (state.guided) {
      engine.stopGuided();
      return;
    }
    setStarted(true);
    void engine.playGuided();
  };

  const toggleMeasure = () => {
    const next = !measuring;
    setMeasuring(next);
    engineRef.current?.setMeasuring(next);
  };

  const toggleAutoRotate = () => {
    const next = !autoRotate;
    setAutoRotate(next);
    engineRef.current?.setAutoRotate(next);
  };

  const toggleGyro = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (gyro) {
      engine.disableGyro();
      setGyro(false);
      return;
    }
    setGyro(await engine.enableGyro());
  };

  const toggleFullscreen = async () => {
    const element = shellRef.current;
    if (!element) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await element.requestFullscreen().catch(() => undefined);
    }
  };

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Number keys walk to a room; `?` opens the shortcut sheet.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (!handlesKeys()) return;
      if (event.key === '?') setShowHelp((open) => !open);
      if (event.key === 'Escape') {
        setActiveInfo(null);
        setShowHelp(false);
      }
      const index = Number(event.key);
      if (provider === 'engine' && Number.isInteger(index) && index >= 1 && index <= Math.min(9, rooms.length)) {
        walkTo(rooms[index - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rooms, walkTo, provider, handlesKeys]);

  // ------------------------------------------------------------ derived ---

  const immersive = layout === 'immersive';
  const hasMatterport = Boolean(tour.modelId);
  const inHouse = state.space !== OUTSIDE;
  const here = nodeById(tour, state.space);
  const levelName = tour.floors.find((f) => f.level === state.floor)?.name ?? `Level ${state.floor}`;
  const stair = here ? stairFor(tour, here.id) ?? tour.stairs.find((s) => nodeById(tour, s.from)?.floor === state.floor) : undefined;
  const stairTarget = stair
    ? nodeById(tour, state.floor === nodeById(tour, stair.from)?.floor ? stair.to : stair.from)
    : undefined;
  const cutaway = state.mode === 'dollhouse' || state.mode === 'floorplan';
  const strip = [...rooms].sort((a, b) => {
    const aHere = a.floor === state.floor ? 0 : 1;
    const bHere = b.floor === state.floor ? 0 : 1;
    return aHere - bHere;
  });
  const startName = nodeById(tour, tour.startNode)?.name ?? 'the house';

  return (
    <div
      ref={shellRef}
      className={[
        'relative select-none overflow-hidden bg-ink-950 text-white',
        immersive ? 'h-full w-full' : 'aspect-[16/10] w-full',
        className,
      ].join(' ')}
      data-purpose="tour-viewer"
      onPointerEnter={() => {
        hoveredRef.current = true;
      }}
      onPointerLeave={() => {
        hoveredRef.current = false;
      }}
    >
      {/* ---------------------------------------------------------- stage -- */}
      {provider === 'matterport' && tour.modelId ? (
        <MatterportEmbed modelId={tour.modelId} title={tour.title} />
      ) : provider === 'streetview' ? (
        <StreetViewEmbed lat={property.lat} lng={property.lng} title={property.title} />
      ) : (
        <>
          <div
            ref={mountRef}
            className={['absolute inset-0', measuring ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'].join(' ')}
          />
          <OverlayLayer
            store={overlayStore}
            activeInfo={activeInfo}
            onInfo={setActiveInfo}
            onWalk={walkTo}
            onEntrance={approach}
          />
          {measuring && <MeasureLayer store={measureStore} units={units} />}
          <p className="sr-only" aria-live="polite">
            {state.mode === 'walk' ? `Now in ${inHouse ? here?.name ?? 'the house' : 'the front garden'}` : ''}
          </p>
          {progress < 1 && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-50 h-0.5 bg-white/10">
              <div
                className="h-full bg-gold-500 transition-all duration-300"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------- top bar -- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between bg-gradient-to-b from-black/70 via-black/30 to-transparent px-3 pb-10 pt-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-medium tracking-tight drop-shadow-md">
            {provider === 'matterport' ? (
              'Matterport'
            ) : provider === 'streetview' ? (
              'Street View'
            ) : state.mode === 'overview' ? (
              <>
                <i className="fa-solid fa-house text-[11px] text-gold-400" aria-hidden="true" />
                The whole house
              </>
            ) : cutaway ? (
              <>
                <i className="fa-solid fa-cube text-[11px] text-gold-400" aria-hidden="true" />
                {state.mode === 'dollhouse' ? 'Dollhouse' : 'Floor plan'}
              </>
            ) : (
              <>
                <i className="fa-solid fa-location-dot text-[11px] text-gold-400" aria-hidden="true" />
                <span className="truncate">{inHouse ? here?.name : 'Front garden'}</span>
                <span className="hidden text-[11px] font-normal text-white/60 sm:inline">
                  · {inHouse ? levelName : 'Outside'}
                </span>
              </>
            )}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-ink-100 drop-shadow-md">
            {tour.title} • Presented by {tour.capturedBy}
          </p>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {provider === 'engine' && state.mode === 'walk' && <Compass store={poseStore} />}
          <button type="button" className="tour-pill px-3 text-[11px]" onClick={toggleFullscreen}>
            <i className={`fa-solid ${fullscreen ? 'fa-compress' : 'fa-expand'} text-[12px]`} aria-hidden="true" />
            <span className="ml-1.5 hidden sm:inline">{fullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------- journey guidance -- */}
      {provider === 'engine' && state.mode === 'overview' && !state.flying && !started && (
        <div className="pointer-events-auto absolute left-3 top-16 z-30 w-[min(20rem,calc(100%-1.5rem))] animate-fade-up rounded-xs border border-white/12 bg-ink-950/80 p-4 backdrop-blur-md">
          <p className="eyebrow text-[9px] text-gold-400">Virtual walkover</p>
          <h3 className="mt-1 font-serif-title text-[17px] leading-snug">Start at the street</h3>
          <p className={['mt-1.5 text-[11.5px] leading-relaxed text-white/70', immersive ? '' : 'hidden lg:block'].join(' ')}>
            Take in the whole house, then walk up to the front door and step inside — one step at a
            time, through every doorway and up the stairs.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-gold px-3.5 py-2 text-[10.5px]" onClick={approach}>
              <i className="fa-solid fa-person-walking mr-1.5" aria-hidden="true" />
              Walk to the entrance
            </button>
            <button type="button" className="btn-white px-3.5 py-2 text-[10.5px]" onClick={toggleGuided}>
              <i className="fa-solid fa-play mr-1.5" aria-hidden="true" />
              Guided tour
            </button>
          </div>
        </div>
      )}

      {provider === 'engine' && state.mode === 'walk' && !inHouse && !state.walking && !state.flying && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-28 z-30 flex justify-center px-3">
          <div className="flex animate-fade-up flex-wrap items-center justify-center gap-2 rounded-full border border-white/12 bg-ink-950/75 p-1.5 backdrop-blur-md">
            <button type="button" className="btn-gold rounded-full px-4 py-2 text-[10.5px]" onClick={() => walkTo(tour.startNode)}>
              <i className="fa-solid fa-door-open mr-1.5" aria-hidden="true" />
              Step inside — {startName}
            </button>
            <button type="button" className="rounded-full px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-white/75 hover:text-white" onClick={() => setMode('overview')}>
              See the whole house
            </button>
          </div>
        </div>
      )}

      {provider === 'engine' && (state.walking || state.guided) && destination && (
        <div className="pointer-events-auto absolute left-1/2 top-14 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/12 bg-ink-950/75 py-1 pl-3 pr-1 text-[11px] backdrop-blur-md">
          <i className="fa-solid fa-shoe-prints text-[10px] text-gold-400" aria-hidden="true" />
          <span className="whitespace-nowrap">Walking to {destination}</span>
          <button
            type="button"
            className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider hover:bg-white/20"
            onClick={() => engineRef.current?.halt()}
          >
            Stop
          </button>
        </div>
      )}
      {provider === 'engine' && state.guided && !destination && (
        <div className="pointer-events-auto absolute left-1/2 top-14 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/12 bg-ink-950/75 py-1 pl-3 pr-1 text-[11px] backdrop-blur-md">
          <i className="fa-solid fa-play text-[9px] text-gold-400" aria-hidden="true" />
          <span className="whitespace-nowrap">Guided tour</span>
          <button type="button" className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider hover:bg-white/20" onClick={toggleGuided}>
            Stop
          </button>
        </div>
      )}

      {/* ------------------------------------------------ room strip -------- */}
      {provider === 'engine' && (state.mode === 'walk' || cutaway) && (
        <div
          className={[
            'pointer-events-none absolute inset-x-0 z-20 overflow-x-auto px-3 no-scrollbar',
            immersive ? 'bottom-16' : 'bottom-14',
          ].join(' ')}
        >
          <div className="pointer-events-auto mx-auto flex w-max items-end gap-2">
            {strip.map((room) => {
              const isHere = room.id === state.space;
              const otherLevel = room.floor !== state.floor;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => walkTo(room.id)}
                  className={[
                    'group relative shrink-0 overflow-hidden rounded-sm border transition-all',
                    immersive ? 'h-12 w-20' : 'h-10 w-16',
                    isHere
                      ? 'border-gold-500 ring-1 ring-gold-500'
                      : otherLevel
                        ? 'border-white/15 opacity-55 hover:opacity-100'
                        : 'border-white/40 hover:border-white',
                  ].join(' ')}
                  title={`Walk to ${room.name}${otherLevel ? ' (via the stairs)' : ''}`}
                >
                  <img
                    src={`/panoramas/${room.pano}-preview.jpg`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {otherLevel && (
                    <span className="absolute right-0.5 top-0.5 rounded-sm bg-black/70 px-1 text-[7.5px] font-bold uppercase tracking-wider">
                      L{room.floor}
                    </span>
                  )}
                  {visited.includes(room.id) && !isHere && (
                    <span className="absolute left-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-gold-500" aria-hidden="true" />
                  )}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.1em]">
                    {room.name}
                  </span>
                  <span className="sr-only">Walk to {room.name}</span>
                </button>
              );
            })}
            {state.mode === 'walk' && inHouse && stairTarget && (
              <button
                type="button"
                onClick={() => walkTo(stairTarget.id)}
                className={[
                  'flex shrink-0 flex-col items-center justify-center rounded-sm border border-white/40 bg-ink-950/70 px-2 text-center backdrop-blur-sm transition-colors hover:border-white',
                  immersive ? 'h-12 w-20' : 'h-10 w-16',
                ].join(' ')}
                title={`Take the stairs to ${stairTarget.name}`}
              >
                <i className="fa-solid fa-stairs text-[12px] text-gold-400" aria-hidden="true" />
                <span className="mt-0.5 text-[8px] font-semibold uppercase leading-tight tracking-[0.08em]">
                  {stairTarget.floor > state.floor ? 'Upstairs' : 'Downstairs'}
                </span>
              </button>
            )}
            {state.mode === 'walk' && inHouse && (
              <button
                type="button"
                onClick={() => walkTo(OUTSIDE)}
                className={[
                  'flex shrink-0 flex-col items-center justify-center rounded-sm border border-white/25 bg-ink-950/70 px-2 text-center backdrop-blur-sm transition-colors hover:border-white',
                  immersive ? 'h-12 w-20' : 'h-10 w-16',
                ].join(' ')}
                title="Walk back out of the front door"
              >
                <i className="fa-solid fa-door-open text-[12px] text-white/75" aria-hidden="true" />
                <span className="mt-0.5 text-[8px] font-semibold uppercase leading-tight tracking-[0.08em]">Outside</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------- mode switcher -- */}
      <div className="pointer-events-auto absolute bottom-3 left-3 z-40 flex flex-wrap items-center gap-2">
        <div className="tour-pill">
          <ModeButton
            icon="fa-house"
            label="Whole house"
            active={provider === 'engine' && state.mode === 'overview'}
            onClick={() => {
              setProvider('engine');
              setMode('overview');
            }}
          />
          <ModeButton
            icon="fa-person-walking"
            label="Walk"
            active={provider === 'engine' && state.mode === 'walk'}
            onClick={() => {
              setProvider('engine');
              setMode('walk');
            }}
          />
          <ModeButton
            icon="fa-cube"
            label="Dollhouse"
            active={provider === 'engine' && state.mode === 'dollhouse'}
            onClick={() => {
              setProvider('engine');
              setMode('dollhouse');
            }}
          />
          <ModeButton
            icon="fa-table-cells-large"
            label="Floor plan"
            active={provider === 'engine' && state.mode === 'floorplan'}
            onClick={() => {
              setProvider('engine');
              setMode('floorplan');
            }}
          />
          <ModeButton
            icon={state.guided ? 'fa-stop' : 'fa-play'}
            label={state.guided ? 'Stop guided tour' : 'Guided tour'}
            active={state.guided}
            onClick={toggleGuided}
          />
          {provider === 'engine' && state.mode === 'walk' && (
            <ModeButton icon="fa-ruler" label="Measure" active={measuring} onClick={toggleMeasure} />
          )}
          {hasMatterport && (
            <ModeButton
              icon="fa-vr-cardboard"
              label="Matterport"
              active={provider === 'matterport'}
              onClick={() => setProvider(provider === 'matterport' ? 'engine' : 'matterport')}
            />
          )}
          <ModeButton
            icon="fa-street-view"
            label="Street View"
            active={provider === 'streetview'}
            onClick={() => setProvider(provider === 'streetview' ? 'engine' : 'streetview')}
          />
        </div>

        {provider === 'engine' && cutaway && tour.floors.length > 1 && (
          <div className="tour-pill text-[10px] font-semibold uppercase tracking-wider">
            {state.mode === 'dollhouse' && (
              <LevelButton active={state.level === 'all'} onClick={() => engineRef.current?.setLevel('all')}>
                All
              </LevelButton>
            )}
            {tour.floors.map((floor) => (
              <LevelButton
                key={floor.level}
                active={state.level === floor.level}
                onClick={() => engineRef.current?.setLevel(floor.level)}
              >
                {floor.name}
              </LevelButton>
            ))}
          </div>
        )}

        {measuring && <MeasureReadout store={measureStore} units={units} onUnits={() => setUnits(units === 'ft' ? 'm' : 'ft')} onClear={() => engineRef.current?.clearMeasurement()} />}
      </div>

      {/* ------------------------------------------------ right controls -- */}
      <div className="pointer-events-auto absolute bottom-3 right-3 z-40 flex items-center gap-2">
        {/* Touch screens walk by tapping the floor and look by swiping, so the
            arrow pad, zoom and keyboard buttons only appear from `sm` up. */}
        {provider === 'engine' && state.mode === 'walk' && (
          <div className="tour-pill hidden sm:flex" role="group" aria-label="Walk controls">
            <button type="button" className="tour-btn" onClick={() => engineRef.current?.turn(-45)} title="Turn left (←)">
              <i className="fa-solid fa-rotate-left" aria-hidden="true" />
              <span className="sr-only">Turn left</span>
            </button>
            <button type="button" className="tour-btn" onClick={() => engineRef.current?.step(1)} title="Step forward (↑)">
              <i className="fa-solid fa-arrow-up" aria-hidden="true" />
              <span className="sr-only">Step forward</span>
            </button>
            <button type="button" className="tour-btn" onClick={() => engineRef.current?.step(-1)} title="Step back (↓)">
              <i className="fa-solid fa-arrow-down" aria-hidden="true" />
              <span className="sr-only">Step back</span>
            </button>
            <button type="button" className="tour-btn" onClick={() => engineRef.current?.turn(45)} title="Turn right (→)">
              <i className="fa-solid fa-rotate-right" aria-hidden="true" />
              <span className="sr-only">Turn right</span>
            </button>
          </div>
        )}
        <div className="tour-pill">
          <button
            type="button"
            className={`tour-btn ${autoRotate ? 'tour-btn-active' : ''}`}
            onClick={toggleAutoRotate}
            title="Auto-rotate"
            aria-pressed={autoRotate}
          >
            <i className="fa-solid fa-arrows-rotate" aria-hidden="true" />
            <span className="sr-only">Toggle auto-rotate</span>
          </button>
          <button type="button" className="tour-btn hidden sm:flex" onClick={() => engineRef.current?.zoomBy(-8)} title="Zoom in">
            <i className="fa-solid fa-magnifying-glass-plus" aria-hidden="true" />
            <span className="sr-only">Zoom in</span>
          </button>
          <button type="button" className="tour-btn hidden sm:flex" onClick={() => engineRef.current?.zoomBy(8)} title="Zoom out">
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
          <button type="button" className="tour-btn hidden sm:flex" onClick={() => setShowHelp((open) => !open)} title="Keyboard shortcuts">
            <i className="fa-solid fa-keyboard" aria-hidden="true" />
            <span className="sr-only">Keyboard shortcuts</span>
          </button>
        </div>

        {!immersive && (
          <Link
            href={`/property/${property.slug}/tour`}
            className="tour-glass hidden items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors hover:bg-white hover:text-ink-900 md:flex"
          >
            <i className="fa-solid fa-up-right-and-down-left-from-center" aria-hidden="true" />
            Immersive
          </Link>
        )}
      </div>

      {/* ------------------------------------------------------- minimap -- */}
      {provider === 'engine' && state.mode === 'walk' && immersive && (
        <div className="pointer-events-auto absolute right-3 top-16 z-20 hidden w-[210px] lg:block">
          <div className="rounded-xs border border-white/12 bg-ink-950/75 p-2 backdrop-blur-md">
            <div className="mb-1.5 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.14em] text-white/60">
              <span>{levelName}</span>
              <span>
                {visitedRooms}/{rooms.length} rooms
              </span>
            </div>
            <div className="aspect-[4/3]">
              <LiveFloorPlan
                tour={tour}
                store={poseStore}
                level={state.floor}
                activeSpace={state.space}
                visited={visited}
                onSelect={walkTo}
              />
            </div>
          </div>
        </div>
      )}

      {provider === 'engine' && state.mode === 'floorplan' && !state.flying && immersive && (
        <div className="pointer-events-auto absolute right-3 top-16 z-20 hidden w-[260px] lg:block">
          <div className="rounded-xs border border-white/12 bg-ink-950/80 p-3 backdrop-blur-md">
            <p className="eyebrow text-[9px] text-gold-400">Plan</p>
            <p className="mb-2 mt-0.5 text-[11px] text-white/60">
              {tour.nodes.filter((n) => n.floor === (typeof state.level === 'number' ? state.level : 1) && n.pano).length} photographed spaces ·{' '}
              {tour.floors.reduce((sum, f) => sum + f.area, 0).toLocaleString('en-US')} sqft
            </p>
            <div className="aspect-[4/3]">
              <FloorPlan
                tour={tour}
                level={typeof state.level === 'number' ? state.level : 1}
                activeSpace={state.space}
                visited={visited}
                variant="panel"
                onSelect={walkTo}
              />
            </div>
            <p className="mt-2 text-[10.5px] text-white/50">Choose a room to walk there step by step.</p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------ help card -- */}
      {showHelp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink-950/88 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xs border border-white/12 bg-ink-950 p-6">
            <div className="flex items-start justify-between">
              <h3 className="font-serif-title text-lg">Getting around</h3>
              <button type="button" className="tour-btn" onClick={() => setShowHelp(false)} aria-label="Close">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <dl className="mt-4 space-y-2 text-[12px] text-ink-200">
              {[
                ['Click the floor', 'Walk to that spot, one step at a time'],
                ['Click a doorway label', 'Walk through into the next room'],
                ['↑ / W', 'Step forward (hold to keep walking)'],
                ['↓ / S', 'Step back'],
                ['← → / A D', 'Turn'],
                ['Drag / swipe', 'Look around'],
                ['Scroll / pinch', 'Zoom'],
                ['1 – 9', 'Walk to a room'],
                ['Esc', 'Stop at the next step'],
                ['?', 'Open or close this card'],
              ].map(([key, meaning]) => (
                <div key={key} className="flex items-center justify-between gap-6">
                  <dt className="rounded border border-white/20 px-2 py-0.5 font-mono text-[11px]">{key}</dt>
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

// ------------------------------------------------------------- overlays ---

function OverlayLayer({
  store,
  activeInfo,
  onInfo,
  onWalk,
  onEntrance,
}: {
  store: Store<OverlayItem[]>;
  activeInfo: string | null;
  onInfo: (key: string | null) => void;
  onWalk: (space: string) => void;
  onEntrance: () => void;
}) {
  const items = useStore(store);
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {items.map((item) => {
        if (item.kind === 'door') {
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onWalk(item.target)}
              className="group pointer-events-auto absolute flex items-center gap-2 rounded-full border border-white/35 bg-ink-950/60 py-1 pl-1 pr-3 text-left shadow-lg backdrop-blur-md transition-colors hover:border-white hover:bg-ink-950/80 focus-visible:border-gold-400"
              style={{
                left: item.x,
                top: item.y,
                transform: `translate(-50%, -50%) scale(${item.scale})`,
              }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink-900 transition-transform group-hover:scale-110">
                <i
                  className={`fa-solid ${item.hint === 'Upstairs' ? 'fa-arrow-up' : item.hint === 'Downstairs' ? 'fa-arrow-down' : 'fa-person-walking'} text-[12px]`}
                  aria-hidden="true"
                />
              </span>
              <span className="leading-tight">
                <span className="block text-[8.5px] font-semibold uppercase tracking-[0.14em] text-gold-300">
                  {item.hint}
                </span>
                <span className="block whitespace-nowrap text-[11.5px] font-medium">{item.label}</span>
              </span>
            </button>
          );
        }
        if (item.kind === 'info') {
          const open = activeInfo === item.key;
          return (
            <div
              key={item.key}
              className="pointer-events-auto absolute"
              style={{ left: item.x, top: item.y, transform: `translate(-50%, -50%) scale(${item.scale})` }}
            >
              <button
                type="button"
                onClick={() => onInfo(open ? null : item.key)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-ink-900/85 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
                aria-expanded={open}
              >
                i<span className="sr-only">{item.label}</span>
              </button>
              {open && (
                <div className="absolute left-1/2 top-9 z-20 w-60 -translate-x-1/2 animate-fade-up rounded-xs border border-white/12 bg-black/85 p-3 text-left backdrop-blur-md">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-500">{item.label}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-100">{item.body}</p>
                </div>
              )}
            </div>
          );
        }
        if (item.kind === 'room') {
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onWalk(item.target)}
              className={[
                'pointer-events-auto absolute whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-lg backdrop-blur-md transition-colors',
                item.active
                  ? 'border-gold-500 bg-gold-500 text-ink-900'
                  : 'border-white/30 bg-ink-950/65 text-white hover:border-white hover:bg-ink-950/85',
              ].join(' ')}
              style={{ left: item.x, top: item.y, transform: 'translate(-50%, -50%)' }}
            >
              {item.label}
            </button>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            onClick={onEntrance}
            className="group pointer-events-auto absolute flex flex-col items-center"
            style={{ left: item.x, top: item.y, transform: 'translate(-50%, -100%)' }}
          >
            <span className="flex items-center gap-2 rounded-full bg-gold-500 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-900 shadow-pill transition-transform group-hover:-translate-y-0.5">
              <i className="fa-solid fa-person-walking" aria-hidden="true" />
              Walk in
            </span>
            <span className="h-5 w-px bg-gold-500" />
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inset-0 animate-hotspot-pulse rounded-full bg-gold-400" />
              <span className="relative h-2 w-2 rounded-full bg-gold-500" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MeasureLayer({ store, units }: { store: Store<Measure>; units: 'm' | 'ft' }) {
  const { points, metres } = useStore(store);
  if (!points.length) return null;
  const label = metres == null ? null : units === 'ft' ? `${(metres * 3.28084).toFixed(1)} ft` : `${metres.toFixed(2)} m`;
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        {points.length === 2 && (
          <line
            x1={points[0].x}
            y1={points[0].y}
            x2={points[1].x}
            y2={points[1].y}
            stroke="#c5a869"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        )}
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={5} fill="#c5a869" stroke="#fff" strokeWidth={1.5} />
        ))}
      </svg>
      {label && points.length === 2 && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500 px-2.5 py-1 text-[11px] font-bold text-ink-900 shadow-lg"
          style={{ left: (points[0].x + points[1].x) / 2, top: (points[0].y + points[1].y) / 2 }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

function MeasureReadout({
  store,
  units,
  onUnits,
  onClear,
}: {
  store: Store<Measure>;
  units: 'm' | 'ft';
  onUnits: () => void;
  onClear: () => void;
}) {
  const { points, metres } = useStore(store);
  const label = metres == null ? null : units === 'ft' ? `${(metres * 3.28084).toFixed(1)} ft` : `${metres.toFixed(2)} m`;
  return (
    <div className="tour-glass flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px]">
      <span className="text-white/70">{points.length < 2 || !label ? 'Tap two points on a wall or floor' : label}</span>
      <button type="button" className="font-semibold text-gold-500" onClick={onUnits}>
        {units}
      </button>
      <button type="button" className="text-white/60 hover:text-white" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}

function Compass({ store }: { store: Store<EnginePose | null> }) {
  const pose = useStore(store);
  const heading = pose ? ((pose.yaw % 360) + 360) % 360 : 0;
  return (
    <div className="tour-glass hidden h-9 w-9 items-center justify-center rounded-full sm:flex" title={`Facing ${Math.round(heading)}°`}>
      <i
        className="fa-solid fa-location-arrow text-[12px] text-gold-500"
        style={{ transform: `rotate(${heading - 45}deg)` }}
        aria-hidden="true"
      />
      <span className="sr-only">Compass heading {Math.round(heading)} degrees</span>
    </div>
  );
}

function LiveFloorPlan({
  tour,
  store,
  level,
  activeSpace,
  visited,
  onSelect,
}: {
  tour: PropertyTour;
  store: Store<EnginePose | null>;
  level: number;
  activeSpace: string;
  visited: string[];
  onSelect: (space: string) => void;
}) {
  const pose = useStore(store);
  return (
    <FloorPlan
      tour={tour}
      level={level}
      pose={pose}
      activeSpace={activeSpace}
      visited={visited}
      variant="mini"
      onSelect={onSelect}
    />
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

function LevelButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-full px-2.5 py-1 transition-colors',
        active ? 'bg-white text-ink-900' : 'text-white/70 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
