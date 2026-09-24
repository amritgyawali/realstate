import type { PropertyTour, TourHotspot, TourNode } from '@/lib/types';

/**
 * Walk-graph maths shared by the walk engine, the floor plan and the dollhouse.
 *
 * Nav hotspots are the only source of truth: every edge, route, room outline
 * and heading here is derived from them and from each node's `plan` position,
 * so the three views can never disagree about where a visitor can go.
 *
 * Two coordinate spaces are in play:
 *
 * - **Pano space** — per node. Yaw is degrees clockwise from the panorama's own
 *   forward, which is how hotspots are authored.
 * - **Plan space** — shared. `plan` (0–1) scaled to metres by `PLAN_SIZE`, with
 *   x east and z south, so yaw 0 is north (up the plan) and yaw 90 is east —
 *   the same handedness the engine's camera uses.
 */

/** Camera height above the floor, in metres. Every floor projection uses it. */
export const EYE_HEIGHT = 1.6;

/** Vertical distance between stacked floors in the dollhouse, in metres. */
export const STOREY_HEIGHT = 3.2;

/** The floor plan's 0–1 square mapped onto metres. Matches its 16:10 frame. */
export const PLAN_SIZE = { width: 24, depth: 15 };

export const DEFAULT_ROOM = { radius: 4.5, ceiling: 2.8 };
export const OUTDOOR_RADIUS = 14;

export interface WalkLink {
  from: TourNode;
  to: TourNode;
  /** The hotspot in `from` that leads to `to`. */
  hotspot: TourHotspot;
  /** The hotspot in `to` that leads back, when the link is two-way. */
  back?: TourHotspot;
  /** Horizontal metres walked. */
  distance: number;
  /** Floors climbed (positive) or descended (negative). */
  levels: number;
}

export interface Point2 {
  x: number;
  z: number;
}

// --------------------------------------------------------------- angles ---

/** Wraps degrees into (-180, 180]. */
export function wrapDeg(deg: number) {
  const wrapped = ((((deg + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
}

/** Signed shortest turn from `from` to `to`, in degrees. */
export function turnBetween(from: number, to: number) {
  return wrapDeg(to - from);
}

// ---------------------------------------------------------------- graph ---

export function nodeById(tour: PropertyTour, id: string) {
  return tour.nodes.find((node) => node.id === id);
}

export function navHotspots(node: TourNode) {
  return node.hotspots.filter(
    (hotspot): hotspot is TourHotspot & { to: string } =>
      hotspot.kind === 'nav' && Boolean(hotspot.to),
  );
}

/**
 * How far one nav hotspot walks. A floor-level marker is read as the spot you
 * step to, so its distance follows from its pitch; stair links default to a
 * flight's horizontal run.
 */
export function hotspotDistance(hotspot: TourHotspot, levels: number) {
  if (hotspot.distance) return hotspot.distance;
  if (levels !== 0) return 3.6;
  if (hotspot.pitch < -4) {
    // Markers sit on the far side of the doorway; the step ends a little short.
    return clamp(0.8 * (EYE_HEIGHT / Math.tan((-hotspot.pitch * Math.PI) / 180)), 2.4, 5.5);
  }
  return 4.5;
}

export function linkBetween(tour: PropertyTour, fromId: string, toId: string): WalkLink | null {
  const from = nodeById(tour, fromId);
  const to = nodeById(tour, toId);
  if (!from || !to) return null;
  const hotspot = navHotspots(from).find((h) => h.to === toId);
  if (!hotspot) return null;
  const back = navHotspots(to).find((h) => h.to === fromId);
  const levels = to.floor - from.floor;
  return { from, to, hotspot, back, levels, distance: hotspotDistance(hotspot, levels) };
}

/**
 * The yaw, in the destination's pano space, you face on arrival when you walk
 * straight along the link. Walking in through a doorway means facing away from
 * the doorway that leads back.
 */
export function arrivalYaw(link: WalkLink) {
  return link.back ? wrapDeg(link.back.yaw + 180) : link.to.entryYaw;
}

/**
 * Rotation between the two pano spaces of a link: a direction at yaw `y` in
 * `from` is the direction at yaw `y + offset` in `to`. This is what lets the
 * camera keep its heading across a transition instead of snapping.
 */
export function frameOffset(link: WalkLink) {
  return wrapDeg(arrivalYaw(link) - link.hotspot.yaw);
}

/**
 * Shortest walk between two rooms, as a list of node ids including both ends.
 * Weighted by metres walked plus a penalty per staircase, so the route goes the
 * way a person would rather than the way with the fewest doors. Returns [] when
 * the rooms are not connected.
 */
export function findRoute(tour: PropertyTour, fromId: string, toId: string): string[] {
  if (fromId === toId) return [fromId];
  const dist = new Map<string, number>([[fromId, 0]]);
  const prev = new Map<string, string>();
  const open = new Set<string>([fromId]);
  const done = new Set<string>();

  while (open.size) {
    let current = '';
    let best = Infinity;
    open.forEach((id) => {
      const d = dist.get(id) ?? Infinity;
      if (d < best) {
        best = d;
        current = id;
      }
    });
    open.delete(current);
    if (current === toId) break;
    done.add(current);

    const node = nodeById(tour, current);
    if (!node) continue;
    navHotspots(node).forEach((hotspot) => {
      if (done.has(hotspot.to) || !nodeById(tour, hotspot.to)) return;
      const link = linkBetween(tour, current, hotspot.to);
      if (!link) return;
      const cost = best + link.distance + Math.abs(link.levels) * 4;
      if (cost < (dist.get(hotspot.to) ?? Infinity)) {
        dist.set(hotspot.to, cost);
        prev.set(hotspot.to, current);
        open.add(hotspot.to);
      }
    });
  }

  if (!prev.has(toId)) return [];
  const route = [toId];
  while (route[0] !== fromId) route.unshift(prev.get(route[0])!);
  return route;
}

/**
 * A guided walk that stands in every room once: a depth-first sweep from the
 * start, stepping back through rooms already seen when a wing is finished. The
 * trailing walk back to the last fork is dropped, so the tour ends in the last
 * new room rather than retracing its steps.
 */
export function guidedRoute(tour: PropertyTour, startId: string): string[] {
  const path: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    seen.add(id);
    path.push(id);
    const node = nodeById(tour, id);
    if (!node) return;
    // Same-floor rooms first, so the tour finishes a level before climbing.
    const next = navHotspots(node)
      .map((h) => linkBetween(tour, id, h.to))
      .filter((link): link is WalkLink => Boolean(link))
      .sort((a, b) => Math.abs(a.levels) - Math.abs(b.levels));
    next.forEach((link) => {
      if (seen.has(link.to.id)) return;
      visit(link.to.id);
      path.push(id);
    });
  };
  visit(startId);

  // Trim the final retreat back towards the start.
  let end = path.length - 1;
  while (end > 0 && path.lastIndexOf(path[end], end - 1) !== -1) end -= 1;
  return path.slice(0, end + 1);
}

// ----------------------------------------------------------- plan space ---

export function planToWorld(plan: { x: number; y: number }): Point2 {
  return { x: (plan.x - 0.5) * PLAN_SIZE.width, z: (plan.y - 0.5) * PLAN_SIZE.depth };
}

export function worldToPlan(point: Point2) {
  return { x: point.x / PLAN_SIZE.width + 0.5, y: point.z / PLAN_SIZE.depth + 0.5 };
}

/** Compass bearing from one plan point to another, yaw convention. */
export function planBearing(a: Point2, b: Point2) {
  return (Math.atan2(b.x - a.x, -(b.z - a.z)) * 180) / Math.PI;
}

/**
 * How each panorama sits on the plan: the rotation that turns pano-space yaw
 * into plan bearing. Solved per node as the circular mean over its nav links of
 * (bearing to neighbour − hotspot yaw), so the minimap's view cone and the
 * dollhouse's projected textures point where the hotspots do.
 */
export function nodeHeadings(tour: PropertyTour): Map<string, number> {
  const headings = new Map<string, number>();
  tour.nodes.forEach((node) => {
    let sx = 0;
    let sy = 0;
    const origin = planToWorld(node.plan);
    navHotspots(node).forEach((hotspot) => {
      const target = nodeById(tour, hotspot.to);
      if (!target) return;
      const offset = ((planBearing(origin, planToWorld(target.plan)) - hotspot.yaw) * Math.PI) / 180;
      sx += Math.cos(offset);
      sy += Math.sin(offset);
    });
    headings.set(node.id, sx || sy ? (Math.atan2(sy, sx) * 180) / Math.PI : 0);
  });
  return headings;
}

export function roomShape(node: TourNode) {
  const outdoor = Boolean(node.room?.outdoor);
  return {
    outdoor,
    radius: node.room?.radius ?? (outdoor ? OUTDOOR_RADIUS : DEFAULT_ROOM.radius),
    ceiling: node.room?.ceiling ?? DEFAULT_ROOM.ceiling,
  };
}

/**
 * Room outlines for the plan and the dollhouse, in plan-space metres.
 *
 * Each floor is divided between its capture points Voronoi-style: a room owns
 * the floor closer to its own capture point than to any other, inset by half a
 * wall on every shared edge, clipped to the floor's footprint and to a square
 * no wider than the room itself. The outlines are an interpretation, not a
 * survey, but they tile the plate the way real rooms do and every one of them
 * contains its own capture point.
 */
export function roomOutlines(tour: PropertyTour): Map<string, Point2[]> {
  const WALL = 0.28;
  const MARGIN = 2.4;
  const outlines = new Map<string, Point2[]>();

  const floors = new Set(tour.nodes.map((node) => node.floor));
  floors.forEach((level) => {
    const nodes = tour.nodes.filter((node) => node.floor === level);
    const points = nodes.map((node) => planToWorld(node.plan));
    const minX = Math.min(...points.map((p) => p.x)) - MARGIN;
    const maxX = Math.max(...points.map((p) => p.x)) + MARGIN;
    const minZ = Math.min(...points.map((p) => p.z)) - MARGIN;
    const maxZ = Math.max(...points.map((p) => p.z)) + MARGIN;

    nodes.forEach((node, index) => {
      const centre = points[index];
      const shape = roomShape(node);
      const half = clamp(shape.outdoor ? 4.2 : shape.radius, 2.4, 5.2);
      let polygon: Point2[] = [
        { x: Math.max(minX, centre.x - half), z: Math.max(minZ, centre.z - half) },
        { x: Math.min(maxX, centre.x + half), z: Math.max(minZ, centre.z - half) },
        { x: Math.min(maxX, centre.x + half), z: Math.min(maxZ, centre.z + half) },
        { x: Math.max(minX, centre.x - half), z: Math.min(maxZ, centre.z + half) },
      ];
      points.forEach((other, otherIndex) => {
        if (otherIndex === index) return;
        const nx = other.x - centre.x;
        const nz = other.z - centre.z;
        const length = Math.hypot(nx, nz) || 1;
        const ux = nx / length;
        const uz = nz / length;
        // Keep the side of the bisector nearer this room, less half a wall.
        const limit = length / 2 - WALL / 2;
        polygon = clipHalfPlane(polygon, (p) => limit - ((p.x - centre.x) * ux + (p.z - centre.z) * uz));
      });
      outlines.set(node.id, polygon);
    });
  });
  return outlines;
}

/** Sutherland–Hodgman against one half-plane; `side(p) >= 0` is kept. */
function clipHalfPlane(polygon: Point2[], side: (p: Point2) => number): Point2[] {
  const out: Point2[] = [];
  polygon.forEach((current, index) => {
    const next = polygon[(index + 1) % polygon.length];
    const a = side(current);
    const b = side(next);
    if (a >= 0) out.push(current);
    if ((a >= 0) !== (b >= 0)) {
      const t = a / (a - b);
      out.push({ x: current.x + (next.x - current.x) * t, z: current.z + (next.z - current.z) * t });
    }
  });
  return out;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
