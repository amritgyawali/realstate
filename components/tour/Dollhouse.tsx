'use client';

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { PropertyTour } from '@/lib/types';
import { findRoute, nodeById } from '@/lib/tour-graph';
import { DollhouseEngine, type DollhouseLabel } from './dollhouse-engine';

interface DollhouseProps {
  tour: PropertyTour;
  activeNodeId: string;
  visited: string[];
  /** The walk view's heading when the dollhouse opened, for the pull-out. */
  entryYaw: number;
  reducedMotion: boolean;
  /** Lets the viewer fly the camera back into a room before handing over. */
  controllerRef: MutableRefObject<DollhouseEngine | null>;
  onSelect: (nodeId: string) => void;
  onClose: () => void;
}

/**
 * The 3D dollhouse overlay: the orbiting house plus its DOM chrome — room
 * labels projected from the scene, the floor switcher and the route preview
 * for whichever room is under the pointer.
 */
export function Dollhouse({
  tour,
  activeNodeId,
  visited,
  entryYaw,
  reducedMotion,
  controllerRef,
  onSelect,
  onClose,
}: DollhouseProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [labels, setLabels] = useState<DollhouseLabel[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const [level, setLevel] = useState<number | 'all'>('all');
  const selectRef = useRef(onSelect);
  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!mountRef.current) return undefined;
    const engine = new DollhouseEngine(mountRef.current, tour, {
      onLabels: setLabels,
      onHover: setHover,
      onSelect: (id) => selectRef.current(id),
      reducedMotion,
    });
    controllerRef.current = engine;
    engine.setActive(activeNodeId);
    engine.introFrom(activeNodeId, entryYaw);

    const observer = new ResizeObserver(() => engine.resize());
    observer.observe(mountRef.current);
    return () => {
      observer.disconnect();
      engine.dispose();
      controllerRef.current = null;
    };
    // The dollhouse is rebuilt only when the tour changes; the rest is pushed in below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  useEffect(() => {
    controllerRef.current?.setActive(activeNodeId);
  }, [activeNodeId, controllerRef]);

  useEffect(() => {
    controllerRef.current?.setLevel(level);
  }, [level, controllerRef]);

  // Preview the walk to the room under the pointer.
  const preview = useMemo(
    () => (hover && hover !== activeNodeId ? findRoute(tour, activeNodeId, hover) : []),
    [hover, activeNodeId, tour],
  );
  useEffect(() => {
    controllerRef.current?.setRoute(preview);
  }, [preview, controllerRef]);

  useEffect(() => {
    controllerRef.current?.highlight(hover);
  }, [hover, controllerRef]);

  const hoverNode = hover ? nodeById(tour, hover) : null;
  const totalArea = tour.floors.reduce((sum, f) => sum + f.area, 0);

  return (
    <div className="absolute inset-0">
      <div ref={mountRef} className="absolute inset-0" />

      {/* Room labels, projected from the 3D scene */}
      <div className="pointer-events-none absolute inset-0">
        {labels.map((label) => {
          const node = nodeById(tour, label.nodeId);
          if (!node || !label.visible) return null;
          const isActive = label.nodeId === activeNodeId;
          const isHover = label.nodeId === hover;
          return (
            <button
              key={label.nodeId}
              type="button"
              onClick={() => onSelect(label.nodeId)}
              onPointerEnter={() => setHover(label.nodeId)}
              onPointerLeave={() => setHover((h) => (h === label.nodeId ? null : h))}
              onFocus={() => setHover(label.nodeId)}
              className={[
                'pointer-events-auto absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-lg backdrop-blur-md transition-colors',
                isActive
                  ? 'border-gold-500 bg-gold-500 text-ink-900'
                  : isHover
                    ? 'border-white bg-white text-ink-900'
                    : visited.includes(label.nodeId)
                      ? 'border-white/30 bg-ink-950/75 text-white'
                      : 'border-white/15 bg-ink-950/60 text-white/70',
              ].join(' ')}
              style={{ left: label.x, top: label.y - 6 }}
            >
              {isActive && <i className="fa-solid fa-person mr-1.5" aria-hidden="true" />}
              {node.name}
            </button>
          );
        })}
      </div>

      {/* Header */}
      <div className="pointer-events-none absolute inset-x-0 top-14 flex items-start justify-between gap-3 px-3 sm:px-4">
        <div>
          <p className="eyebrow text-gold-500">Dollhouse</p>
          <h3 className="font-serif-title text-lg text-white">{tour.title}</h3>
          <p className="text-[11px] text-white/55">
            {tour.nodes.length} rooms · {tour.floors.length} level{tour.floors.length === 1 ? '' : 's'} ·{' '}
            {totalArea.toLocaleString('en-US')} sqft
          </p>
        </div>
        <button
          type="button"
          className="tour-btn pointer-events-auto tour-glass"
          onClick={onClose}
          aria-label="Close dollhouse"
        >
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </div>

      {/* Floor switcher and hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-16 flex flex-col items-center gap-2 px-3">
        {tour.floors.length > 1 && (
          <div className="tour-pill pointer-events-auto">
            {(['all', ...tour.floors.map((f) => f.level)] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setLevel(value)}
                aria-pressed={level === value}
                className={[
                  'rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors',
                  level === value ? 'bg-white text-ink-900' : 'text-white/70 hover:text-white',
                ].join(' ')}
              >
                {value === 'all' ? 'All levels' : tour.floors.find((f) => f.level === value)?.name}
              </button>
            ))}
          </div>
        )}
        <p className="tour-glass rounded-full px-3 py-1.5 text-center text-[11px] text-white/75">
          {hoverNode && hover !== activeNodeId && preview.length > 1 ? (
            <>
              <span className="text-gold-400">{hoverNode.name}</span> — walk there through{' '}
              {preview.length - 1} doorway{preview.length - 1 === 1 ? '' : 's'}
            </>
          ) : (
            'Drag to orbit · Scroll to zoom · Choose a room to walk there'
          )}
        </p>
      </div>
    </div>
  );
}
