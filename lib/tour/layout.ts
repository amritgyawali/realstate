import type {
  PropertyTour,
  TourDoor,
  TourNode,
  TourRect,
  TourSpaceKind,
  TourStair,
} from '@/lib/types';

/**
 * Plan geometry shared by the walk engine, the walk graph and the floor plan.
 *
 * Plan space is metres, x east and z south, so a plan drawn with z pointing down
 * the page reads with north at the top. Elevation (y) is metres above the
 * ground-floor slab; the garden sits `site.plinth` below it.
 */

/** Eye height above the floor, in metres. */
export const EYE_HEIGHT = 1.6;

/** Pseudo-space id for the grounds around the house. */
export const OUTSIDE = 'outside';

/** Radius of the dome an open-air space's photograph is projected onto. */
export const DOME_RADIUS = 34;

const EPSILON = 0.05;

export type WallSide = 'n' | 's' | 'e' | 'w';

/** Unit vector pointing from each wall into the space it bounds. */
export const INWARD: Record<WallSide, { x: number; z: number }> = {
  n: { x: 0, z: 1 },
  s: { x: 0, z: -1 },
  w: { x: 1, z: 0 },
  e: { x: -1, z: 0 },
};

export const ASCENT: Record<TourStair['ascent'], { x: number; z: number }> = {
  n: { x: 0, z: -1 },
  s: { x: 0, z: 1 },
  e: { x: 1, z: 0 },
  w: { x: -1, z: 0 },
};

export function spaceKind(node: TourNode): TourSpaceKind {
  return node.kind ?? 'room';
}

/** Rooms and stair halls are enclosed; they get walls, a ceiling and a facade. */
export function isInterior(node: TourNode) {
  return spaceKind(node) !== 'outdoor';
}

export function hasPano(node: TourNode): node is TourNode & { pano: string } {
  return typeof node.pano === 'string' && node.pano.length > 0;
}

/** The spaces that carry a photograph, in authored order. */
export function captureNodes(tour: PropertyTour) {
  return tour.nodes.filter(hasPano);
}

export function ceilingHeight(node: TourNode) {
  return node.height ?? 3;
}

export function floorElevation(tour: PropertyTour, floor: number) {
  return (floor - 1) * tour.site.storey;
}

export function captureOf(node: TourNode) {
  return node.capture ?? { x: node.rect.x + node.rect.w / 2, z: node.rect.z + node.rect.d / 2 };
}

export function rectCentre(rect: TourRect) {
  return { x: rect.x + rect.w / 2, z: rect.z + rect.d / 2 };
}

export function inRect(rect: TourRect, x: number, z: number, inset = 0) {
  return (
    x >= rect.x + inset &&
    x <= rect.x + rect.w - inset &&
    z >= rect.z + inset &&
    z <= rect.z + rect.d - inset
  );
}

export function nodeById(tour: PropertyTour, id: string) {
  return tour.nodes.find((node) => node.id === id);
}

/** The level a standing elevation belongs to, rounding mid-flight to the nearer floor. */
export function floorAtElevation(tour: PropertyTour, y: number) {
  return Math.max(1, Math.floor(y / tour.site.storey + 0.5) + 1);
}

/** The space containing a plan point on a level, or `OUTSIDE`. */
export function spaceAt(tour: PropertyTour, x: number, z: number, floor: number): string {
  const hit = tour.nodes.find((node) => node.floor === floor && inRect(node.rect, x, z));
  return hit ? hit.id : OUTSIDE;
}

// ------------------------------------------------------------------ doors ---

export interface DoorGeometry {
  door: TourDoor;
  index: number;
  /** Wall side as seen from space `a`. */
  side: WallSide;
  /** `x` when the wall is a plane of constant x (east/west walls), else `z`. */
  axis: 'x' | 'z';
  /** The wall plane's constant coordinate. */
  plane: number;
  /** Centre of the opening along the wall. */
  along: number;
  width: number;
  height: number;
  /** Elevation of the threshold. */
  bottom: number;
  /** Points from the wall into space `a`. */
  normalA: { x: number; z: number };
  floor: number;
}

export function sideOfRect(rect: TourRect, x: number, z: number): WallSide | null {
  const withinX = x >= rect.x - EPSILON && x <= rect.x + rect.w + EPSILON;
  const withinZ = z >= rect.z - EPSILON && z <= rect.z + rect.d + EPSILON;
  if (withinX && Math.abs(z - rect.z) < EPSILON) return 'n';
  if (withinX && Math.abs(z - (rect.z + rect.d)) < EPSILON) return 's';
  if (withinZ && Math.abs(x - rect.x) < EPSILON) return 'w';
  if (withinZ && Math.abs(x - (rect.x + rect.w)) < EPSILON) return 'e';
  return null;
}

export function doorWidth(door: TourDoor) {
  return door.width ?? (door.style === 'arch' ? 1.8 : door.style === 'glass' ? 1.6 : 1.0);
}

export function doorHeight(door: TourDoor) {
  return door.height ?? (door.style === 'arch' ? 2.5 : door.style === 'entrance' ? 2.5 : 2.2);
}

export function doorGeometry(tour: PropertyTour, door: TourDoor, index: number): DoorGeometry {
  const a = nodeById(tour, door.a);
  const b = door.b === OUTSIDE ? undefined : nodeById(tour, door.b);
  const host = a ?? b;
  if (!host) throw new Error(`Door ${index} joins unknown spaces ${door.a} / ${door.b}`);

  let side = a ? sideOfRect(a.rect, door.x, door.z) : null;
  let flip = false;
  if (!side && b) {
    side = sideOfRect(b.rect, door.x, door.z);
    flip = true;
  }
  if (!side) {
    throw new Error(`Door ${index} (${door.a} → ${door.b}) is not on a wall of either space`);
  }
  const inward = INWARD[side];
  const normalA = flip ? { x: -inward.x, z: -inward.z } : inward;
  const axis = side === 'e' || side === 'w' ? 'x' : 'z';
  return {
    door,
    index,
    side,
    axis,
    plane: axis === 'x' ? door.x : door.z,
    along: axis === 'x' ? door.z : door.x,
    width: doorWidth(door),
    height: doorHeight(door),
    bottom: floorElevation(tour, host.floor),
    normalA,
    floor: host.floor,
  };
}

export function doorGeometries(tour: PropertyTour) {
  return tour.doors.map((door, index) => doorGeometry(tour, door, index));
}

/** Openings in one wall of a space, as [from, to] intervals along that wall. */
export function openingsOnWall(
  doors: DoorGeometry[],
  node: TourNode,
  side: WallSide,
) {
  return doors.filter(
    (geometry) =>
      (geometry.door.a === node.id || geometry.door.b === node.id) &&
      sideOfRect(node.rect, geometry.door.x, geometry.door.z) === side,
  );
}

// ---------------------------------------------------------- wall extents ---

export interface WallEdge {
  side: WallSide;
  axis: 'x' | 'z';
  plane: number;
  from: number;
  to: number;
}

export function rectEdges(rect: TourRect): WallEdge[] {
  return [
    { side: 'n', axis: 'z', plane: rect.z, from: rect.x, to: rect.x + rect.w },
    { side: 's', axis: 'z', plane: rect.z + rect.d, from: rect.x, to: rect.x + rect.w },
    { side: 'w', axis: 'x', plane: rect.x, from: rect.z, to: rect.z + rect.d },
    { side: 'e', axis: 'x', plane: rect.x + rect.w, from: rect.z, to: rect.z + rect.d },
  ];
}

const OPPOSITE: Record<WallSide, WallSide> = { n: 's', s: 'n', e: 'w', w: 'e' };

export function subtractIntervals(
  base: [number, number],
  cuts: [number, number][],
): [number, number][] {
  let pieces: [number, number][] = [base];
  cuts.forEach(([c0, c1]) => {
    pieces = pieces.flatMap(([p0, p1]) => {
      if (c1 <= p0 + EPSILON || c0 >= p1 - EPSILON) return [[p0, p1] as [number, number]];
      const out: [number, number][] = [];
      if (c0 > p0 + EPSILON) out.push([p0, c0]);
      if (c1 < p1 - EPSILON) out.push([c1, p1]);
      return out;
    });
  });
  return pieces.filter(([p0, p1]) => p1 - p0 > EPSILON);
}

/**
 * The parts of each enclosed space's walls that face the outdoors — the facade.
 * A wall shared with another enclosed space on the same level is interior.
 */
export function exteriorWalls(tour: PropertyTour) {
  const interiors = tour.nodes.filter(isInterior);
  const runs: (WallEdge & { node: TourNode })[] = [];
  interiors.forEach((node) => {
    rectEdges(node.rect).forEach((edge) => {
      const cuts: [number, number][] = [];
      interiors.forEach((other) => {
        if (other === node || other.floor !== node.floor) return;
        rectEdges(other.rect).forEach((candidate) => {
          if (candidate.side !== OPPOSITE[edge.side]) return;
          if (Math.abs(candidate.plane - edge.plane) > EPSILON) return;
          cuts.push([candidate.from, candidate.to]);
        });
      });
      subtractIntervals([edge.from, edge.to], cuts).forEach(([from, to]) => {
        runs.push({ ...edge, from, to, node });
      });
    });
  });
  return runs;
}

/** `base` minus every rectangle in `holes`, as a set of disjoint rectangles. */
export function subtractRects(base: TourRect, holes: TourRect[]): TourRect[] {
  let pieces: TourRect[] = [base];
  holes.forEach((hole) => {
    pieces = pieces.flatMap((piece) => {
      const x0 = Math.max(piece.x, hole.x);
      const x1 = Math.min(piece.x + piece.w, hole.x + hole.w);
      const z0 = Math.max(piece.z, hole.z);
      const z1 = Math.min(piece.z + piece.d, hole.z + hole.d);
      if (x1 - x0 <= EPSILON || z1 - z0 <= EPSILON) return [piece];
      const out: TourRect[] = [];
      if (z0 > piece.z + EPSILON) out.push({ x: piece.x, z: piece.z, w: piece.w, d: z0 - piece.z });
      if (z1 < piece.z + piece.d - EPSILON) {
        out.push({ x: piece.x, z: z1, w: piece.w, d: piece.z + piece.d - z1 });
      }
      if (x0 > piece.x + EPSILON) out.push({ x: piece.x, z: z0, w: x0 - piece.x, d: z1 - z0 });
      if (x1 < piece.x + piece.w - EPSILON) {
        out.push({ x: x1, z: z0, w: piece.x + piece.w - x1, d: z1 - z0 });
      }
      return out;
    });
  });
  return pieces;
}

/** The stair whose flight belongs to a stair hall or its landing. */
export function stairFor(tour: PropertyTour, nodeId: string) {
  return tour.stairs.find((stair) => stair.from === nodeId || stair.to === nodeId);
}

/** Bounds of a whole level, for framing the floor plan and the dollhouse. */
export function floorBounds(tour: PropertyTour, floor?: number) {
  const nodes = tour.nodes.filter((node) => floor === undefined || node.floor === floor);
  const source = nodes.length ? nodes : tour.nodes;
  const x0 = Math.min(...source.map((node) => node.rect.x));
  const z0 = Math.min(...source.map((node) => node.rect.z));
  const x1 = Math.max(...source.map((node) => node.rect.x + node.rect.w));
  const z1 = Math.max(...source.map((node) => node.rect.z + node.rect.d));
  return { x: x0, z: z0, w: x1 - x0, d: z1 - z0 };
}

// ------------------------------------------------------------- the proxy ---

/**
 * Converts a direction in a photograph's own frame (yaw clockwise from the
 * photo's forward, pitch above the horizon, degrees) to a world direction.
 */
export function panoDirection(node: TourNode, yawDeg: number, pitchDeg: number) {
  const yaw = ((yawDeg + (node.heading ?? 0)) * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  return {
    x: Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch),
  };
}

/**
 * How far a ray from a space's capture point travels before it meets the
 * surface the photograph is projected onto: the room box for a room, the dome
 * and its floor for an open-air space. The depth maps store every pixel's depth
 * as a fraction of this distance, so a map stays valid if a room is resized.
 */
export function proxyDistance(tour: PropertyTour, node: TourNode, dir: { x: number; y: number; z: number }) {
  const floorY = floorElevation(tour, node.floor);
  const capture = captureOf(node);
  const eye = { x: capture.x, y: floorY + EYE_HEIGHT, z: capture.z };
  if (spaceKind(node) === 'outdoor') {
    let t = DOME_RADIUS;
    if (dir.y < -1e-6) t = Math.min(t, (floorY - 0.015 - eye.y) / dir.y);
    return t;
  }
  const bounds: [number, number, number][] = [
    [node.rect.x, node.rect.x + node.rect.w, eye.x],
    [floorY, floorY + ceilingHeight(node), eye.y],
    [node.rect.z, node.rect.z + node.rect.d, eye.z],
  ];
  const d = [dir.x, dir.y, dir.z];
  let t = Infinity;
  bounds.forEach(([lo, hi, o], axis) => {
    if (d[axis] > 1e-9) t = Math.min(t, (hi - o) / d[axis]);
    else if (d[axis] < -1e-9) t = Math.min(t, (lo - o) / d[axis]);
  });
  return Math.max(0.05, t);
}
