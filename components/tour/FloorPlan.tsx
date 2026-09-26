'use client';

import { useMemo } from 'react';
import type { PropertyTour } from '@/lib/types';
import {
  OUTSIDE,
  doorGeometries,
  floorBounds,
  hasPano,
  isInterior,
  spaceKind,
} from '@/lib/tour/layout';
import type { EnginePose } from './engine/WalkEngine';

interface FloorPlanProps {
  tour: PropertyTour;
  level: number;
  /** Live position and heading of the visitor, when they are on this level. */
  pose?: EnginePose | null;
  activeSpace?: string;
  visited: string[];
  /** `mini` docks in the corner; `panel` is the large schematic. */
  variant: 'mini' | 'panel';
  onSelect: (spaceId: string) => void;
}

const PAD = 1.6;

/**
 * The plan of one level, drawn from the same footprints and doors the engine
 * builds the house from — so the map can never disagree with where a visitor
 * can actually walk. Rooms are buttons: choosing one walks there step by step.
 */
export function FloorPlan({ tour, level, pose, activeSpace, visited, variant, onSelect }: FloorPlanProps) {
  const mini = variant === 'mini';
  const bounds = useMemo(() => floorBounds(tour), [tour]);
  const doors = useMemo(() => doorGeometries(tour), [tour]);
  const view = {
    x: bounds.x - PAD,
    y: bounds.z - PAD,
    w: bounds.w + PAD * 2,
    h: bounds.d + PAD * 2,
  };
  const nodes = tour.nodes.filter((node) => node.floor === level);
  const below = tour.nodes.filter((node) => node.floor === level - 1 && isInterior(node));
  const stroke = mini ? 0.12 : 0.09;

  return (
    <svg
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      className="block h-full w-full"
      role="group"
      aria-label={`Floor plan — ${tour.floors.find((f) => f.level === level)?.name ?? `Level ${level}`}`}
    >
      <defs>
        <pattern id={`hatch-${variant}`} width="0.35" height="0.35" patternUnits="userSpaceOnUse">
          <path d="M0 0.35 L0.35 0" stroke="rgba(255,255,255,0.18)" strokeWidth="0.05" />
        </pattern>
      </defs>

      {/* The level below, as a faint footprint for orientation. */}
      {below.map((node) => (
        <rect
          key={`below-${node.id}`}
          x={node.rect.x}
          y={node.rect.z}
          width={node.rect.w}
          height={node.rect.d}
          fill="rgba(255,255,255,0.025)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke * 0.6}
          strokeDasharray="0.3 0.25"
        />
      ))}

      {nodes.map((node) => {
        const kind = spaceKind(node);
        const active = node.id === activeSpace;
        const seen = visited.includes(node.id);
        const fill =
          kind === 'outdoor'
            ? active
              ? 'rgba(197,168,105,0.22)'
              : 'rgba(255,255,255,0.04)'
            : active
              ? 'rgba(197,168,105,0.28)'
              : seen
                ? 'rgba(255,255,255,0.13)'
                : 'rgba(255,255,255,0.07)';
        const select = () => onSelect(node.id);
        return (
          <g
            key={node.id}
            role="button"
            tabIndex={0}
            aria-label={`Walk to ${node.name}`}
            className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[#c5a869] [&:hover>rect]:stroke-white"
            onClick={select}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                select();
              }
            }}
          >
            <title>{node.name}</title>
            <rect
              x={node.rect.x}
              y={node.rect.z}
              width={node.rect.w}
              height={node.rect.d}
              fill={fill}
              stroke={kind === 'outdoor' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)'}
              strokeWidth={kind === 'outdoor' ? stroke * 0.7 : stroke}
              strokeDasharray={kind === 'outdoor' ? '0.4 0.3' : undefined}
            />
            {kind === 'stair' && (
              <rect
                x={node.rect.x}
                y={node.rect.z}
                width={node.rect.w}
                height={node.rect.d}
                fill={`url(#hatch-${variant})`}
                pointerEvents="none"
              />
            )}
            {!mini && (
              <text
                x={node.rect.x + node.rect.w / 2}
                y={node.rect.z + node.rect.d / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.min(0.62, node.rect.w / Math.max(6, node.name.length * 0.62))}
                fill={active ? '#e3c887' : 'rgba(255,255,255,0.78)'}
                style={{ letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}
                pointerEvents="none"
              >
                {node.name}
              </text>
            )}
            {!mini && seen && hasPano(node) && (
              <circle
                cx={node.rect.x + node.rect.w - 0.45}
                cy={node.rect.z + 0.45}
                r={0.16}
                fill="#c5a869"
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}

      {/* Stairs: tread lines and an arrow up the flight. */}
      {tour.stairs
        .filter((stair) => tour.nodes.find((n) => n.id === stair.from)?.floor === level || tour.nodes.find((n) => n.id === stair.to)?.floor === level)
        .map((stair) => {
          const vertical = stair.ascent === 'n' || stair.ascent === 's';
          const length = vertical ? stair.run.d : stair.run.w;
          const count = Math.round(length / 0.28);
          return (
            <g key={`stair-${stair.from}`} pointerEvents="none">
              {Array.from({ length: count + 1 }, (_, i) => {
                const t = (i / count) * length;
                return vertical ? (
                  <line
                    key={i}
                    x1={stair.run.x}
                    x2={stair.run.x + stair.run.w}
                    y1={stair.run.z + t}
                    y2={stair.run.z + t}
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth={stroke * 0.5}
                  />
                ) : (
                  <line
                    key={i}
                    y1={stair.run.z}
                    y2={stair.run.z + stair.run.d}
                    x1={stair.run.x + t}
                    x2={stair.run.x + t}
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth={stroke * 0.5}
                  />
                );
              })}
            </g>
          );
        })}

      {/* Door openings: a break in the wall with a gold threshold. */}
      {doors
        .filter((door) => door.floor === level)
        .map((door) => {
          const half = door.width / 2;
          const along = door.axis === 'z';
          const x1 = along ? door.along - half : door.plane;
          const x2 = along ? door.along + half : door.plane;
          const y1 = along ? door.plane : door.along - half;
          const y2 = along ? door.plane : door.along + half;
          const outside = door.door.a === OUTSIDE || door.door.b === OUTSIDE;
          return (
            <g key={`door-${door.index}`} pointerEvents="none">
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#16191c" strokeWidth={stroke * 2.2} />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={outside ? '#e3c887' : 'rgba(197,168,105,0.8)'}
                strokeWidth={stroke * 0.8}
              />
            </g>
          );
        })}

      {/* Visitor: a dot and a cone for where they are looking. */}
      {pose && pose.floor === level && (
        <g transform={`translate(${pose.x} ${pose.z}) rotate(${pose.yaw})`} pointerEvents="none">
          <path
            d={`M0 0 L${-Math.tan((35 * Math.PI) / 180) * 3} -3 A3 3 0 0 1 ${Math.tan((35 * Math.PI) / 180) * 3} -3 Z`}
            fill="rgba(197,168,105,0.35)"
          />
          <circle r={mini ? 0.42 : 0.32} fill="#c5a869" stroke="#fff" strokeWidth={mini ? 0.12 : 0.08} />
        </g>
      )}
    </svg>
  );
}
