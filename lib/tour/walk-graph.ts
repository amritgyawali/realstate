import type { PropertyTour, TourNode, TourRect } from '@/lib/types';
import {
  ASCENT,
  OUTSIDE,
  captureOf,
  doorGeometries,
  floorElevation,
  hasPano,
  inRect,
  nodeById,
  spaceKind,
} from './layout';

/**
 * The walk graph: every place a visitor can stand, and which of them are one
 * step apart.
 *
 * A step is about the length of a stride and a half (1.5 m), so moving from the
 * hall to a bedroom is a string of short, visible steps — along the hall, up to
 * the doorway, through it, into the room — rather than a jump between photos.
 * Stops are generated from the plan rather than authored: a lattice across each
 * space anchored on its capture point, a stop either side of every door, a stop
 * every few treads on each stair, and the authored street-to-porch approach.
 */

export type StopKind = 'capture' | 'grid' | 'door' | 'stair' | 'tread' | 'approach';

export interface WalkStop {
  id: number;
  x: number;
  /** Elevation of the floor under the stop. */
  y: number;
  z: number;
  space: string;
  floor: number;
  kind: StopKind;
  label?: string;
  /** Index into `tour.doors` for door stops. */
  door?: number;
}

export interface WalkGraph {
  stops: WalkStop[];
  adjacency: number[][];
  /** Where a walk "to a room" ends: the capture point, or the stair foot/head. */
  arrival: Map<string, number>;
  /** First stop of the approach — the pavement in front of the house. */
  street: number;
  /** The stop on the porch in front of the entrance door. */
  porch: number;
}

const STEP = 1.5;
/**
 * In a photographed room, places to stand stay within this distance of the
 * capture point (doorway stops aside): the photo is exact at the capture point
 * and holds up well near it, so every place a walk comes to rest looks right.
 */
const PHOTO_REACH = 2.4;
const LINK = 2.25;
const WALL_INSET = 0.5;
const DOOR_OFFSET = 0.75;
const STAIR_MARGIN = 0.3;

export function buildWalkGraph(tour: PropertyTour): WalkGraph {
  const stops: WalkStop[] = [];
  const edges = new Set<string>();
  const add = (stop: Omit<WalkStop, 'id'>) => {
    const id = stops.length;
    stops.push({ ...stop, id });
    return id;
  };
  const link = (a: number, b: number) => {
    if (a === b) return;
    edges.add(a < b ? `${a}:${b}` : `${b}:${a}`);
  };

  /** Stair flights are obstacles on the lower level and voids on the upper. */
  const obstacles = new Map<string, TourRect[]>();
  tour.stairs.forEach((stair) => {
    const padded = pad(stair.run, STAIR_MARGIN);
    [stair.from, stair.to].forEach((id) => {
      obstacles.set(id, [...(obstacles.get(id) ?? []), padded]);
    });
  });
  const blocked = (space: string, x: number, z: number) =>
    (obstacles.get(space) ?? []).some((rect) => inRect(rect, x, z));

  const arrival = new Map<string, number>();

  // Capture points first, so a room's lattice is anchored on its photograph.
  tour.nodes.forEach((node) => {
    if (!hasPano(node)) return;
    const point = captureOf(node);
    const id = add({
      x: point.x,
      z: point.z,
      y: floorElevation(tour, node.floor),
      space: node.id,
      floor: node.floor,
      kind: 'capture',
      label: node.name,
    });
    arrival.set(node.id, id);
  });

  // A stop either side of every opening.
  const doors = doorGeometries(tour);
  const doorStops: number[] = [];
  doors.forEach((geometry) => {
    const centre = geometry.axis === 'x'
      ? { x: geometry.plane, z: geometry.along }
      : { x: geometry.along, z: geometry.plane };
    const sides: [string, number][] = [
      [geometry.door.a, 1],
      [geometry.door.b, -1],
    ];
    const pair = sides.map(([space, sign]) => {
      const outside = space === OUTSIDE;
      const offset = outside ? 0.95 : DOOR_OFFSET;
      const node = outside ? undefined : nodeById(tour, space);
      const id = add({
        x: centre.x + geometry.normalA.x * offset * sign,
        z: centre.z + geometry.normalA.z * offset * sign,
        y: geometry.bottom,
        space,
        floor: node?.floor ?? geometry.floor,
        kind: 'door',
        door: geometry.index,
        label: outside ? 'Front door' : undefined,
      });
      doorStops.push(id);
      return id;
    });
    link(pair[0], pair[1]);
  });

  // Stairs: foot, a stop every few treads, head.
  tour.stairs.forEach((stair) => {
    const lower = nodeById(tour, stair.from);
    const upper = nodeById(tour, stair.to);
    if (!lower || !upper) return;
    const dir = ASCENT[stair.ascent];
    const length = dir.x !== 0 ? stair.run.w : stair.run.d;
    const mid = { x: stair.run.x + stair.run.w / 2, z: stair.run.z + stair.run.d / 2 };
    const start = { x: mid.x - (dir.x * length) / 2, z: mid.z - (dir.z * length) / 2 };
    const y0 = floorElevation(tour, lower.floor);
    const y1 = floorElevation(tour, upper.floor);

    const foot = add({
      x: start.x - dir.x * 0.65,
      z: start.z - dir.z * 0.65,
      y: y0,
      space: lower.id,
      floor: lower.floor,
      kind: 'stair',
      label: `Stairs to ${upper.name}`,
    });
    arrival.set(lower.id, foot);
    let previous = foot;
    const treads = Math.max(2, Math.round(length / 1.25));
    for (let i = 1; i < treads; i += 1) {
      const t = i / treads;
      const id = add({
        x: start.x + dir.x * length * t,
        z: start.z + dir.z * length * t,
        y: y0 + (y1 - y0) * t,
        space: t < 0.5 ? lower.id : upper.id,
        floor: t < 0.5 ? lower.floor : upper.floor,
        kind: 'tread',
      });
      link(previous, id);
      previous = id;
    }
    const head = add({
      x: start.x + dir.x * (length + 0.65),
      z: start.z + dir.z * (length + 0.65),
      y: y1,
      space: upper.id,
      floor: upper.floor,
      kind: 'stair',
      label: upper.name,
    });
    link(previous, head);
    arrival.set(upper.id, head);
  });

  // A lattice across every space, anchored on its capture point.
  tour.nodes.forEach((node) => {
    const anchor = captureOf(node);
    const x0 = node.rect.x + WALL_INSET;
    const x1 = node.rect.x + node.rect.w - WALL_INSET;
    const z0 = node.rect.z + WALL_INSET;
    const z1 = node.rect.z + node.rect.d - WALL_INSET;
    const y = floorElevation(tour, node.floor);
    const occupied = stops.filter((stop) => stop.space === node.id);
    for (let i = Math.ceil((x0 - anchor.x) / STEP); anchor.x + i * STEP <= x1; i += 1) {
      for (let j = Math.ceil((z0 - anchor.z) / STEP); anchor.z + j * STEP <= z1; j += 1) {
        const x = anchor.x + i * STEP;
        const z = anchor.z + j * STEP;
        if (blocked(node.id, x, z)) continue;
        if (occupied.some((stop) => Math.hypot(stop.x - x, stop.z - z) < 0.9)) continue;
        if (hasPano(node) && spaceKind(node) === 'room' && Math.hypot(x - anchor.x, z - anchor.z) > PHOTO_REACH) {
          continue;
        }
        add({ x, z, y, space: node.id, floor: node.floor, kind: 'grid' });
      }
    }
  });

  // Approach: street to porch, subdivided into steps.
  const approach = tour.site.approach;
  const plinth = -tour.site.plinth;
  const entranceIndex = tour.doors.findIndex((door) => door.b === OUTSIDE || door.a === OUTSIDE);
  const porch = doorStops.find(
    (id) => stops[id].space === OUTSIDE && stops[id].door === entranceIndex,
  );
  let street = -1;
  let previous = -1;
  approach.forEach((point, index) => {
    const id = add({
      x: point.x,
      z: point.z,
      y: plinth,
      space: OUTSIDE,
      floor: 1,
      kind: 'approach',
      label: point.label,
    });
    if (index === 0) street = id;
    if (previous >= 0) stepBetween(previous, id);
    previous = id;
  });
  if (previous >= 0 && porch !== undefined) stepBetween(previous, porch);

  function stepBetween(from: number, to: number) {
    const a = stops[from];
    const b = stops[to];
    const segments = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 1.8));
    let last = from;
    for (let i = 1; i < segments; i += 1) {
      const t = i / segments;
      const id = add({
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        y: a.y + (b.y - a.y) * t,
        space: OUTSIDE,
        floor: 1,
        kind: 'approach',
      });
      link(last, id);
      last = id;
    }
    link(last, to);
  }

  // Link stops that share a space and are a step apart, around stair flights.
  const bySpace = new Map<string, WalkStop[]>();
  stops.forEach((stop) => {
    if (stop.space === OUTSIDE) return;
    bySpace.set(stop.space, [...(bySpace.get(stop.space) ?? []), stop]);
  });
  bySpace.forEach((members, space) => {
    const walls = obstacles.get(space) ?? [];
    members.forEach((a, index) => {
      members.slice(index + 1).forEach((b) => {
        if (Math.abs(a.y - b.y) > 0.3) return;
        if (Math.hypot(a.x - b.x, a.z - b.z) > LINK) return;
        if (walls.some((rect) => segmentHitsRect(a, b, rect))) return;
        link(a.id, b.id);
      });
    });
  });

  const adjacency: number[][] = stops.map(() => []);
  edges.forEach((key) => {
    const [a, b] = key.split(':').map(Number);
    adjacency[a].push(b);
    adjacency[b].push(a);
  });

  // Anything the lattice left stranded — a stair foot tucked behind the flight,
  // a door close to a corner, a narrow room — is joined to the rest of its space
  // at the closest pair of stops. Treads are never used: nobody steps sideways
  // off a staircase.
  bySpace.forEach((members) => {
    const walkable = members.filter((stop) => stop.kind !== 'tread');
    for (;;) {
      const component = reach(walkable[0]?.id, new Set(walkable.map((stop) => stop.id)));
      const outside = walkable.filter((stop) => !component.has(stop.id));
      if (!walkable.length || !outside.length) break;
      let bridge = { a: -1, b: -1, length: Infinity };
      for (const a of walkable) {
        if (!component.has(a.id)) continue;
        for (const b of outside) {
          if (Math.abs(a.y - b.y) > 0.3) continue;
          const length = dist(a, b);
          if (length < bridge.length) bridge = { a: a.id, b: b.id, length };
        }
      }
      if (bridge.a < 0) break;
      adjacency[bridge.a].push(bridge.b);
      adjacency[bridge.b].push(bridge.a);
    }
  });

  /** Stops reachable from `start` without leaving `within`. */
  function reach(start: number | undefined, within: Set<number>) {
    const seen = new Set<number>();
    if (start === undefined) return seen;
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const current = queue.shift()!;
      adjacency[current].forEach((next) => {
        if (seen.has(next)) return;
        if (!within.has(next) && stops[next].kind !== 'tread') return;
        seen.add(next);
        queue.push(next);
      });
    }
    return seen;
  }

  tour.nodes.forEach((node) => {
    if (arrival.has(node.id)) return;
    const members = bySpace.get(node.id) ?? [];
    const centre = captureOf(node);
    const nearest = [...members].sort(
      (p, q) => Math.hypot(p.x - centre.x, p.z - centre.z) - Math.hypot(q.x - centre.x, q.z - centre.z),
    )[0];
    if (nearest) arrival.set(node.id, nearest.id);
  });

  return {
    stops,
    adjacency,
    arrival,
    street: street >= 0 ? street : (porch ?? 0),
    porch: porch ?? 0,
  };
}

/**
 * Shortest walk between two stops, as a list of stop ids including both ends.
 * Stops in `avoid` (standing on furniture) cost three times as much to pass.
 */
export function findPath(
  graph: WalkGraph,
  from: number,
  to: number,
  avoid?: Set<number>,
): number[] | null {
  if (from === to) return [from];
  const { stops, adjacency } = graph;
  const cost = new Array<number>(stops.length).fill(Infinity);
  const previous = new Array<number>(stops.length).fill(-1);
  const done = new Array<boolean>(stops.length).fill(false);
  cost[from] = 0;
  for (;;) {
    let current = -1;
    let best = Infinity;
    for (let i = 0; i < stops.length; i += 1) {
      if (!done[i] && cost[i] < best) {
        best = cost[i];
        current = i;
      }
    }
    if (current < 0) return null;
    if (current === to) break;
    done[current] = true;
    adjacency[current].forEach((next) => {
      const penalty = avoid?.has(next) && next !== to ? 3 : 1;
      const step = cost[current] + dist3(stops[current], stops[next]) * penalty;
      if (step < cost[next]) {
        cost[next] = step;
        previous[next] = current;
      }
    });
  }
  const path = [to];
  while (path[0] !== from) path.unshift(previous[path[0]]);
  return path;
}

/**
 * Turns a path of stops into the points a person would actually walk through.
 * Inside one space the route is pulled straight wherever the straight line
 * stays inside the room (and clear of a stair flight), so a walk across a room
 * is one smooth line rather than a zig-zag over the lattice. Every doorway is
 * crossed square through its centre.
 */
export function routeWaypoints(tour: PropertyTour, graph: WalkGraph, path: number[]) {
  const stops = path.map((id) => graph.stops[id]);
  const doors = doorGeometries(tour);
  const obstacles = new Map<string, TourRect[]>();
  tour.stairs.forEach((stair) => {
    const padded = pad(stair.run, STAIR_MARGIN);
    [stair.from, stair.to].forEach((id) => obstacles.set(id, [...(obstacles.get(id) ?? []), padded]));
  });

  const clear = (from: number, to: number) => {
    const first = stops[from];
    if (first.space === OUTSIDE) return false;
    for (let m = from; m <= to; m += 1) {
      const stop = stops[m];
      if (stop.space !== first.space || stop.kind === 'tread' || Math.abs(stop.y - first.y) > 0.05) {
        return false;
      }
    }
    return !(obstacles.get(first.space) ?? []).some((rect) => segmentHitsRect(first, stops[to], rect));
  };

  const points: { x: number; y: number; z: number }[] = [stops[0]];
  let at = 0;
  while (at < stops.length - 1) {
    let next = at + 1;
    for (let k = stops.length - 1; k > at + 1; k -= 1) {
      if (clear(at, k)) {
        next = k;
        break;
      }
    }
    const a = stops[next - 1];
    const b = stops[next];
    if (a.door !== undefined && a.door === b.door && a.space !== b.space) {
      const door = doors[a.door];
      points.push(
        door.axis === 'x'
          ? { x: door.plane, y: (a.y + b.y) / 2, z: door.along }
          : { x: door.along, y: (a.y + b.y) / 2, z: door.plane },
      );
    }
    points.push(b);
    at = next;
  }
  return points;
}

/** Nearest stop to a point, optionally restricted to a level or a space. */
export function nearestStop(
  graph: WalkGraph,
  x: number,
  z: number,
  filter: (stop: WalkStop) => boolean = () => true,
) {
  let best = -1;
  let bestDistance = Infinity;
  graph.stops.forEach((stop) => {
    if (!filter(stop)) return;
    const d = Math.hypot(stop.x - x, stop.z - z);
    if (d < bestDistance) {
      bestDistance = d;
      best = stop.id;
    }
  });
  return best;
}

/** The label a stop is best described by for screen readers and the HUD. */
export function stopLabel(tour: PropertyTour, stop: WalkStop) {
  if (stop.label) return stop.label;
  if (stop.space === OUTSIDE) return 'Front garden';
  return nodeById(tour, stop.space)?.name ?? 'Walkway';
}

export function spaceName(tour: PropertyTour, space: string) {
  if (space === OUTSIDE) return 'Outside';
  const node: TourNode | undefined = nodeById(tour, space);
  if (!node) return space;
  return node.name;
}

export function isOutdoorSpace(tour: PropertyTour, space: string) {
  const node = nodeById(tour, space);
  return node ? spaceKind(node) === 'outdoor' : false;
}

// ----------------------------------------------------------------- utils ---

function dist(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function dist3(a: WalkStop, b: WalkStop) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function pad(rect: TourRect, margin: number): TourRect {
  return { x: rect.x - margin, z: rect.z - margin, w: rect.w + margin * 2, d: rect.d + margin * 2 };
}

/** Liang–Barsky: does the segment a→b pass through the rectangle? */
function segmentHitsRect(
  a: { x: number; z: number },
  b: { x: number; z: number },
  rect: TourRect,
) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  let t0 = 0;
  let t1 = 1;
  const clip = (p: number, q: number) => {
    if (Math.abs(p) < 1e-9) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  return (
    clip(-dx, a.x - rect.x) &&
    clip(dx, rect.x + rect.w - a.x) &&
    clip(-dz, a.z - rect.z) &&
    clip(dz, rect.z + rect.d - a.z) &&
    t0 < t1
  );
}
