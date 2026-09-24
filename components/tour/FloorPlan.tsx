'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PropertyTour } from '@/lib/types';
import {
  findRoute,
  navHotspots,
  nodeById,
  nodeHeadings,
  roomOutlines,
  roomShape,
  worldToPlan,
} from '@/lib/tour-graph';

interface FloorPlanProps {
  tour: PropertyTour;
  activeNodeId: string;
  visited: string[];
  /** `mini` docks in the corner of the walk; `plan` is the full schematic. */
  variant: 'mini' | 'plan';
  /** The route being walked, drawn in gold. */
  route?: string[];
  /** The leg in progress, so the position marker can travel along it. */
  leg?: { from: string; to: string } | null;
  onSelect: (nodeId: string) => void;
  onClose?: () => void;
}

const VIEW_W = 1000;
const VIEW_H = 625;

/**
 * Floor plan and minimap: the walk graph drawn flat.
 *
 * Rooms are the Voronoi outlines from `roomOutlines`; the edges are the same
 * `nav` hotspots the walk uses, so the map can never drift out of sync with
 * where a visitor can actually go. The "you are here" marker and its view cone
 * follow the camera through CSS custom properties the walk engine sets on the
 * viewer (`--tour-yaw`, `--tour-leg`), so they move every frame without a React
 * render.
 */
export function FloorPlan({
  tour,
  activeNodeId,
  visited,
  variant,
  route = [],
  leg = null,
  onSelect,
  onClose,
}: FloorPlanProps) {
  const activeFloor = nodeById(tour, activeNodeId)?.floor ?? 1;
  const [floor, setFloor] = useState(activeFloor);
  const [hover, setHover] = useState<string | null>(null);

  // Follow the visitor up and down stairs.
  useEffect(() => setFloor(activeFloor), [activeFloor]);

  const mini = variant === 'mini';
  const headings = useMemo(() => nodeHeadings(tour), [tour]);
  const outlines = useMemo(() => roomOutlines(tour), [tour]);

  // Nodes are inset from the frame so a marker at x = 0.95 still has room for
  // its centred label; without this the outermost rooms clip at the edge.
  const INSET = mini ? 0.07 : 0.1;
  const fit = (value: number) => INSET + value * (1 - INSET * 2);
  const toView = (plan: { x: number; y: number }) => ({ x: fit(plan.x) * VIEW_W, y: fit(plan.y) * VIEW_H });

  const nodes = tour.nodes.filter((n) => n.floor === floor);
  const edges = useMemo(() => {
    const seen = new Set<string>();
    return tour.nodes.flatMap((from) =>
      navHotspots(from).flatMap((hotspot) => {
        const to = nodeById(tour, hotspot.to);
        const key = [from.id, hotspot.to].sort().join('~');
        if (!to || seen.has(key)) return [];
        seen.add(key);
        return [{ from, to, key }];
      }),
    );
  }, [tour]);

  // Hovering a room previews the walk there.
  const preview = useMemo(
    () => (hover && hover !== activeNodeId ? findRoute(tour, activeNodeId, hover) : []),
    [hover, activeNodeId, tour],
  );
  const shownRoute = route.length > 1 ? route : preview;
  const routePoints = shownRoute
    .map((id) => nodeById(tour, id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n));

  const active = nodeById(tour, activeNodeId);
  const legFrom = leg ? nodeById(tour, leg.from) : null;
  const legTo = leg ? nodeById(tour, leg.to) : null;
  const markerFrom = legFrom ?? active;
  const markerTo = legTo ?? markerFrom;
  const a = markerFrom ? { x: fit(markerFrom.plan.x), y: fit(markerFrom.plan.y) } : null;
  const b = markerTo ? { x: fit(markerTo.plan.x), y: fit(markerTo.plan.y) } : a;
  const markerHeading = headings.get(markerFrom?.id ?? '') ?? 0;
  const markerOnFloor =
    markerFrom?.floor === floor || (markerTo?.floor === floor && Boolean(leg));

  const hoverNode = hover ? nodeById(tour, hover) : null;

  return (
    <div
      className={[
        'relative',
        mini
          ? 'rounded-xs border border-white/12 bg-ink-950/75 p-2 backdrop-blur-md'
          : 'w-full max-w-3xl rounded-xs border border-white/12 bg-ink-950 p-5',
      ].join(' ')}
    >
      {!mini && (
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-serif-title text-lg text-white">Floor Plan</h3>
            <p className="text-[11px] text-white/50">
              {tour.title} · {tour.nodes.length} capture points ·{' '}
              {tour.floors.reduce((sum, f) => sum + f.area, 0).toLocaleString('en-US')} sqft
            </p>
          </div>
          {onClose && (
            <button type="button" className="tour-btn" onClick={onClose} aria-label="Close">
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {tour.floors.length > 1 && (
        <div className={['flex items-center gap-1', mini ? 'mb-1.5' : 'mb-3'].join(' ')}>
          {tour.floors.map((f) => (
            <FloorChip key={f.level} active={floor === f.level} mini={mini} onClick={() => setFloor(f.level)}>
              {mini ? `L${f.level}` : f.name}
            </FloorChip>
          ))}
        </div>
      )}

      <div
        className={[
          'relative w-full overflow-hidden rounded-sm border border-white/10',
          mini ? 'aspect-[4/3]' : 'aspect-[16/10]',
        ].join(' ')}
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: mini ? '14px 14px' : '28px 28px',
          backgroundColor: 'rgba(12, 16, 19, 0.85)',
        }}
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Rooms */}
          {nodes.map((node) => {
            const outline = outlines.get(node.id);
            if (!outline) return null;
            const points = outline
              .map((p) => {
                const v = toView(worldToPlan(p));
                return `${v.x.toFixed(1)},${v.y.toFixed(1)}`;
              })
              .join(' ');
            const isActive = node.id === activeNodeId;
            const isHover = node.id === hover;
            const outdoor = roomShape(node).outdoor;
            return (
              <polygon
                key={node.id}
                points={points}
                onClick={() => onSelect(node.id)}
                onPointerEnter={() => setHover(node.id)}
                onPointerLeave={() => setHover((h) => (h === node.id ? null : h))}
                className="cursor-pointer transition-[fill] duration-200"
                fill={
                  isActive
                    ? 'rgba(197,168,105,0.18)'
                    : isHover
                      ? 'rgba(255,255,255,0.12)'
                      : visited.includes(node.id)
                        ? 'rgba(255,255,255,0.07)'
                        : 'rgba(255,255,255,0.03)'
                }
                stroke={isActive ? 'rgba(197,168,105,0.8)' : 'rgba(255,255,255,0.3)'}
                strokeWidth={mini ? 3 : 2}
                strokeDasharray={outdoor ? '10 7' : undefined}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {/* Walk graph */}
          {edges.map(({ from, to, key }) => {
            if (from.floor !== floor && to.floor !== floor) return null;
            const p = toView(from.plan);
            const q = toView(to.plan);
            const crossFloor = from.floor !== to.floor;
            return (
              <line
                key={key}
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                stroke={crossFloor ? 'rgba(197,168,105,0.55)' : 'rgba(255,255,255,0.22)'}
                strokeWidth={mini ? 1 : 1.5}
                strokeDasharray={crossFloor ? '5 4' : undefined}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {/* Route: the walk in progress, or a preview of the walk to the hovered room */}
          {routePoints.length > 1 && (
            <polyline
              points={routePoints.map((n) => {
                const v = toView(n.plan);
                return `${v.x},${v.y}`;
              }).join(' ')}
              fill="none"
              stroke="#c5a869"
              strokeWidth={mini ? 2 : 3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={route.length > 1 ? '8 6' : '2 6'}
              className={route.length > 1 ? 'tour-route-flow' : undefined}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Capture points */}
        {nodes.map((node) => {
          const isActive = node.id === activeNodeId;
          const isVisited = visited.includes(node.id);
          const onRoute = shownRoute.includes(node.id);
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelect(node.id)}
              onPointerEnter={() => setHover(node.id)}
              onPointerLeave={() => setHover((h) => (h === node.id ? null : h))}
              onFocus={() => setHover(node.id)}
              onBlur={() => setHover((h) => (h === node.id ? null : h))}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${fit(node.plan.x) * 100}%`, top: `${fit(node.plan.y) * 100}%` }}
              title={node.name}
            >
              <span
                className={[
                  'block rounded-full border transition-all',
                  mini ? 'h-2 w-2' : 'h-3 w-3',
                  isActive
                    ? 'border-white/0 bg-transparent'
                    : onRoute
                      ? 'border-gold-300 bg-gold-500'
                      : isVisited
                        ? 'border-white/70 bg-white/70 group-hover:bg-white'
                        : 'border-white/45 bg-white/15 group-hover:bg-white/60',
                ].join(' ')}
              />
              {!mini && (
                <span
                  className={[
                    'pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em]',
                    isActive ? 'text-gold-500' : 'text-white/60 group-hover:text-white',
                  ].join(' ')}
                >
                  {node.name}
                </span>
              )}
              <span className="sr-only">Walk to {node.name}</span>
            </button>
          );
        })}

        {/* You are here — glides along the leg being walked, cone follows the view */}
        {a && b && markerOnFloor && (
          <div
            className="pointer-events-none absolute z-10"
            style={{
              left: `calc((${a.x} + (${b.x} - ${a.x}) * var(--tour-leg, 0)) * 100%)`,
              top: `calc((${a.y} + (${b.y} - ${a.y}) * var(--tour-leg, 0)) * 100%)`,
            }}
          >
            <div
              className="absolute left-0 top-0"
              style={{
                transform: `translate(-50%, -100%) rotate(calc((var(--tour-yaw, 0) + ${markerHeading.toFixed(1)}) * 1deg))`,
                transformOrigin: '50% 100%',
              }}
            >
              <svg width={mini ? 34 : 56} height={mini ? 30 : 48} viewBox="0 0 56 48" aria-hidden="true">
                <defs>
                  <radialGradient id={`cone-${variant}`} cx="50%" cy="100%" r="100%">
                    <stop offset="0%" stopColor="#c5a869" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#c5a869" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <path d="M28 48 L4 6 Q28 -4 52 6 Z" fill={`url(#cone-${variant})`} />
              </svg>
            </div>
            <span
              className={[
                'absolute block -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gold-500 shadow-[0_0_0_4px_rgba(197,168,105,0.28)]',
                mini ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5',
              ].join(' ')}
            />
          </div>
        )}
      </div>

      {!mini && (
        <p className="mt-3 min-h-[1.25rem] text-[11px] text-white/50">
          {hoverNode && hover !== activeNodeId && preview.length > 1 ? (
            <>
              Walk to <span className="text-white">{hoverNode.name}</span> through{' '}
              {preview.length - 2 === 0
                ? 'one doorway'
                : `${preview.length - 2} room${preview.length - 2 === 1 ? '' : 's'}`}{' '}
              — step by step.
            </>
          ) : (
            'Select a room to walk there through the house. Dashed links are stairs; dashed rooms are outdoors.'
          )}
        </p>
      )}
    </div>
  );
}

function FloorChip({
  active,
  mini,
  onClick,
  children,
}: {
  active: boolean;
  mini: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border transition-colors',
        mini ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[11px]',
        'font-semibold uppercase tracking-[0.1em]',
        active
          ? 'border-gold-500 bg-gold-500 text-ink-900'
          : 'border-white/20 text-white/65 hover:border-white/50 hover:text-white',
      ].join(' ')}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
