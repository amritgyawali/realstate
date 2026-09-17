'use client';

import { useState } from 'react';
import type { PropertyTour } from '@/lib/types';

interface FloorPlanProps {
  tour: PropertyTour;
  activeNodeId: string;
  visited: string[];
  /** `mini` docks in the corner, `plan` is the schematic, `dollhouse` is the 3D-ish view. */
  variant: 'mini' | 'plan' | 'dollhouse';
  onSelect: (nodeId: string) => void;
  onClose?: () => void;
}

/**
 * Floor plan, minimap and dollhouse are the same graph drawn three ways.
 *
 * Nodes sit at their normalised plan coordinates; the edges are the same `nav`
 * hotspots the walk mode uses, so the map can never drift out of sync with where
 * a visitor can actually go. The dollhouse variant applies an isometric skew and
 * lifts upper floors on the Y axis to suggest stacked levels.
 */
/** Label placements cycled through in the dollhouse view, in order. */
const LABEL_SLOTS = [
  'left-1/2 top-full mt-1.5 -translate-x-1/2',
  'left-1/2 bottom-full mb-1.5 -translate-x-1/2',
  'left-full top-1/2 ml-2 -translate-y-1/2',
  'right-full top-1/2 mr-2 -translate-y-1/2',
];

export function FloorPlan({
  tour,
  activeNodeId,
  visited,
  variant,
  onSelect,
  onClose,
}: FloorPlanProps) {
  const [floor, setFloor] = useState<number | 'all'>(
    variant === 'dollhouse' ? 'all' : tour.nodes.find((n) => n.id === activeNodeId)?.floor ?? 1,
  );

  const nodes = tour.nodes.filter((n) => (floor === 'all' ? true : n.floor === floor));
  const edges = tour.nodes.flatMap((from) =>
    from.hotspots
      .filter((h) => h.kind === 'nav' && h.to)
      .map((h) => {
        const to = tour.nodes.find((n) => n.id === h.to);
        if (!to) return null;
        if (floor !== 'all' && (from.floor !== floor || to.floor !== floor)) return null;
        return { from, to };
      })
      .filter(Boolean as unknown as (v: unknown) => v is { from: typeof from; to: typeof from }),
  );

  const mini = variant === 'mini';
  const dollhouse = variant === 'dollhouse';

  // Nodes are inset from the frame so a marker at x = 0.95 still has room for
  // its centred label; without this the outermost rooms clip at the edge.
  const INSET = mini ? 0.08 : 0.14;
  const fit = (value: number) => INSET + value * (1 - INSET * 2);

  // Dollhouse: isometric skew, with each level offset upward.
  const project = (x: number, y: number, level: number) => {
    if (!dollhouse) return { left: `${fit(x) * 100}%`, top: `${fit(y) * 100}%` };
    const skewX = x - 0.5;
    const skewY = y - 0.5;
    const isoX = 0.5 + (skewX - skewY) * 0.46;
    const isoY = 0.56 + (skewX + skewY) * 0.34 - (level - 1) * 0.3;
    return { left: `${isoX * 100}%`, top: `${isoY * 100}%` };
  };

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
            <h3 className="font-serif-title text-lg text-white">
              {dollhouse ? 'Dollhouse' : 'Floor Plan'}
            </h3>
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

      {/* Floor selector */}
      {(tour.floors.length > 1 || dollhouse) && (
        <div
          className={[
            'flex items-center gap-1',
            mini ? 'mb-1.5' : 'mb-3',
          ].join(' ')}
        >
          {dollhouse && (
            <FloorChip active={floor === 'all'} mini={mini} onClick={() => setFloor('all')}>
              All
            </FloorChip>
          )}
          {tour.floors.map((f) => (
            <FloorChip
              key={f.level}
              active={floor === f.level}
              mini={mini}
              onClick={() => setFloor(f.level)}
            >
              {mini ? `L${f.level}` : f.name}
            </FloorChip>
          ))}
        </div>
      )}

      <div
        className={[
          'relative w-full overflow-hidden rounded-sm border border-white/10',
          mini ? 'aspect-[4/3]' : dollhouse ? 'aspect-[16/9]' : 'aspect-[16/10]',
        ].join(' ')}
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: mini ? '14px 14px' : '28px 28px',
          backgroundColor: 'rgba(12, 16, 22, 0.85)',
        }}
      >
        {/* Walk graph */}
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          {edges.map(({ from, to }, index) => {
            const a = project(from.plan.x, from.plan.y, from.floor);
            const b = project(to.plan.x, to.plan.y, to.floor);
            const crossFloor = from.floor !== to.floor;
            return (
              <line
                key={`${from.id}-${to.id}-${index}`}
                x1={a.left}
                y1={a.top}
                x2={b.left}
                y2={b.top}
                stroke={crossFloor ? 'rgba(197,168,105,0.5)' : 'rgba(255,255,255,0.28)'}
                strokeWidth={mini ? 1 : 1.5}
                strokeDasharray={crossFloor ? '4 3' : undefined}
              />
            );
          })}
        </svg>

        {nodes.map((node, index) => {
          const isActive = node.id === activeNodeId;
          const isVisited = visited.includes(node.id);
          const position = project(node.plan.x, node.plan.y, node.floor);
          // The isometric view packs rooms close together, so rotate each label
          // through below / above / right / left of its marker. Neighbouring
          // rooms therefore never place their labels in the same spot.
          const labelSlot = dollhouse ? index % 4 : 0;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelect(node.id)}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={position}
              title={node.name}
            >
              <span
                className={[
                  'block rounded-full border transition-all',
                  mini ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5',
                  isActive
                    ? 'scale-125 border-white bg-[#c5a869] shadow-[0_0_0_4px_rgba(197,168,105,0.25)]'
                    : isVisited
                      ? 'border-white/70 bg-white/70 group-hover:bg-white'
                      : 'border-white/45 bg-white/15 group-hover:bg-white/60',
                ].join(' ')}
              />
              {!mini && (
                <span
                  className={[
                    'absolute whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em]',
                    LABEL_SLOTS[labelSlot],
                    isActive ? 'text-[#c5a869]' : 'text-white/55 group-hover:text-white',
                  ].join(' ')}
                >
                  {node.name}
                </span>
              )}
              <span className="sr-only">Walk to {node.name}</span>
            </button>
          );
        })}
      </div>

      {!mini && (
        <p className="mt-3 text-[11px] text-white/45">
          Select any point to walk there. Dashed links are stairs between levels.
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
          ? 'border-[#c5a869] bg-[#c5a869] text-ink-900'
          : 'border-white/20 text-white/65 hover:border-white/50 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
