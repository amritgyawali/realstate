import * as THREE from 'three';
import type { PropertyTour, TourNode, TourRect } from '@/lib/types';
import {
  ASCENT,
  DOME_RADIUS,
  EYE_HEIGHT,
  INWARD,
  OUTSIDE,
  captureOf,
  ceilingHeight,
  doorGeometries,
  exteriorWalls,
  floorElevation,
  hasPano,
  isInterior,
  nodeById,
  panoDirection,
  proxyDistance,
  rectEdges,
  sideOfRect,
  spaceKind,
  subtractIntervals,
  subtractRects,
  type DoorGeometry,
  type WallSide,
} from '@/lib/tour/layout';
import {
  createProjectionMaterial,
  linkedClone,
  type Palette,
  type PortalUniforms,
  type ProjectionMaterial,
} from './materials';

/**
 * Builds the walkable model of a house from its plan.
 *
 * - Every photographed room becomes a box — floor, walls with real door
 *   openings, ceiling — textured by projecting its panorama from the point it was
 *   captured. The camera can therefore stand anywhere in the room, and walking
 *   through a doorway shows the next room through the opening before you reach it.
 * - Open-air spaces become a dome with a flat floor, textured the same way.
 * - Stair halls, door frames and the whole exterior (facade, glazing, roofs,
 *   porch, decks) are modelled, so the house can be seen whole from the street
 *   and from above before anyone steps inside.
 */

/** Anything carrying a projected panorama whose texture can be swapped. */
export interface ProjectionMaterialHost {
  material: ProjectionMaterial;
}

export interface RoomBuild {
  node: TourNode;
  material: ProjectionMaterial;
  floor: THREE.Mesh;
  walls: THREE.Mesh;
  ceiling: THREE.Mesh;
  group: THREE.Group;
}

export interface OutdoorBuild {
  node: TourNode;
  material: ProjectionMaterial;
  /** Front-facing twin of `material`, for the facade while standing on the deck. */
  shellMaterial: ProjectionMaterial;
  /** The photo dome, shown while standing in or looking into the space. */
  dome: THREE.Mesh;
  /** The photo floor alone, for the dollhouse and floor plan. */
  patch: THREE.Mesh;
  /** Modelled deck and railings, for the exterior views. */
  deck: THREE.Group;
}

export interface StairBuild {
  lower: TourNode;
  upper: TourNode;
  group: THREE.Group;
  ceiling: THREE.Object3D[];
  light: THREE.PointLight;
  /** Top of the tread under a plan point, or null off the flight. */
  treadTop: (x: number, z: number) => number | null;
}

export interface DoorLeaf {
  pivot: THREE.Group;
  /** Rotation, in radians, of the fully open leaf. */
  openAngle: number;
  door: DoorGeometry;
}

export interface HouseBuild {
  rooms: Map<string, RoomBuild>;
  outdoor: Map<string, OutdoorBuild>;
  stairs: StairBuild[];
  /** Facade, glazing, roofs and soffits. */
  shell: THREE.Group;
  /** Porch, steps, path and decks — the built parts of the grounds. */
  grounds: THREE.Group;
  casings: THREE.Group;
  leaves: DoorLeaf[];
  /** Surfaces a visitor can stand on, for the floor cursor. */
  walkable: THREE.Object3D[];
  /** Surfaces that stop a pick or a measurement. */
  solid: THREE.Object3D[];
  bounds: THREE.Box3;
  doors: DoorGeometry[];
}


export function buildHouse(
  tour: PropertyTour,
  palette: Palette,
  portals: PortalUniforms,
  root: THREE.Group,
): HouseBuild {
  const doors = doorGeometries(tour);
  const rooms = new Map<string, RoomBuild>();
  const outdoor = new Map<string, OutdoorBuild>();
  const walkable: THREE.Object3D[] = [];
  const solid: THREE.Object3D[] = [];
  const { storey, plinth } = tour.site;
  const grade = -plinth;

  const shell = new THREE.Group();
  shell.name = 'shell';
  const grounds = new THREE.Group();
  grounds.name = 'grounds';
  const casings = new THREE.Group();
  casings.name = 'casings';
  root.add(shell, grounds, casings);

  // ------------------------------------------------------ projected rooms --

  tour.nodes.forEach((node) => {
    if (!hasPano(node) || spaceKind(node) !== 'room') return;
    const y = floorElevation(tour, node.floor);
    const height = ceilingHeight(node);
    const capture = captureOf(node);
    const material = createProjectionMaterial({
      capture: new THREE.Vector3(capture.x, y + EYE_HEIGHT, capture.z),
      heading: node.heading ?? 0,
      floorY: y,
      portals,
    });

    const floorGeometry = new Builder();
    floorGeometry.flat(node.rect, y, true);
    const ceilingGeometry = new Builder();
    ceilingGeometry.flat(node.rect, y + height, false);
    const wallGeometry = new Builder();
    rectEdges(node.rect).forEach((edge) => {
      const openings = openingsFor(doors, node, edge.side, y, y + height - 0.04);
      wallGeometry.wall(edgeLine(node.rect, edge.side), y, y + height, openings, INWARD[edge.side]);
    });

    const group = new THREE.Group();
    group.name = `room:${node.id}`;
    const floor = tag(new THREE.Mesh(floorGeometry.build(), material), node.id, 'floor');
    const walls = tag(new THREE.Mesh(wallGeometry.build(), material), node.id, 'wall');
    const ceiling = tag(new THREE.Mesh(ceilingGeometry.build(), material), node.id, 'ceiling');
    group.add(floor, walls, ceiling);
    root.add(group);
    walkable.push(floor);
    solid.push(walls, ceiling);
    rooms.set(node.id, { node, material, floor, walls, ceiling, group });
  });

  // ------------------------------------------------------ open-air spaces --

  tour.nodes.forEach((node) => {
    if (!hasPano(node) || spaceKind(node) !== 'outdoor') return;
    const y = floorElevation(tour, node.floor);
    const capture = captureOf(node);
    const eye = new THREE.Vector3(capture.x, y + EYE_HEIGHT, capture.z);
    const material = createProjectionMaterial({
      capture: eye,
      heading: node.heading ?? 0,
      floorY: y - 0.015,
      clampFloor: true,
      portals,
    });
    material.side = THREE.BackSide;

    const dome = tag(
      new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 72, 48), material),
      node.id,
      'dome',
    );
    dome.position.copy(eye);
    dome.visible = false;
    dome.frustumCulled = false;
    root.add(dome);

    const patchMaterial = linkedClone(material);
    patchMaterial.side = THREE.FrontSide;
    // The facade seen from this deck wears the same photograph; it needs its
    // own front-facing material, since the dome is drawn from the inside.
    const shellMaterial = linkedClone(material);
    shellMaterial.side = THREE.FrontSide;
    const patchGeometry = new Builder();
    patchGeometry.flat(node.rect, y - 0.015, true);
    const patch = tag(new THREE.Mesh(patchGeometry.build(), patchMaterial), node.id, 'floor');
    patch.visible = false;
    // While walking, the dome draws this floor; the patch stays pickable so a
    // click on the deck (or through its doorway) still finds somewhere to walk.
    patch.userData.pickWhenHidden = true;
    root.add(patch);
    walkable.push(patch);

    const deck = buildDeck(tour, node, palette);
    grounds.add(deck);
    outdoor.set(node.id, { node, material, shellMaterial, dome, patch, deck });
  });

  // ------------------------------------------------------ facade layout --

  const setting = tour.site.setting;
  const windowStyle =
    setting === 'alpine'
      ? { width: 1.5, sill: 0.75, head: 2.55, gap: 0.9 }
      : setting === 'coastal'
        ? { width: 2.3, sill: 0.15, head: 2.65, gap: 0.9 }
        : { width: 1.4, sill: 0.55, head: 2.6, gap: 1.1 };

  const facadeRuns = exteriorWalls(tour).map((run) => {
    const node = run.node;
    const y = floorElevation(tour, node.floor);
    const top = wallTop(tour, node);
    const doorOpenings = doors
      .filter(
        (door) =>
          (door.door.a === node.id || door.door.b === node.id) &&
          sideOfRect(node.rect, door.door.x, door.door.z) === run.side &&
          door.along >= run.from - 0.01 &&
          door.along <= run.to + 0.01,
      )
      .map((door) => ({
        u0: door.along - run.from - door.width / 2,
        u1: door.along - run.from + door.width / 2,
        v0: door.bottom,
        v1: door.bottom + door.height,
      }));
    const windows = placeWindows(
      run.to - run.from,
      doorOpenings.map((o) => [o.u0, o.u1] as [number, number]),
      windowStyle,
    ).map(([u0, u1]) => ({
      u0,
      u1,
      v0: y + windowStyle.sill,
      v1: Math.min(y + windowStyle.head, top - 0.25),
    }));
    return { run, top, doorOpenings, windows };
  });

  /** Windows in one wall of a space, measured from the start of that wall. */
  const windowsIn = (node: TourNode, side: WallSide): Opening[] => {
    const start = side === 'n' || side === 's' ? node.rect.x : node.rect.z;
    return facadeRuns
      .filter((entry) => entry.run.node === node && entry.run.side === side)
      .flatMap((entry) =>
        entry.windows.map((w) => ({
          ...w,
          u0: w.u0 + entry.run.from - start,
          u1: w.u1 + entry.run.from - start,
        })),
      );
  };

  // ---------------------------------------------------------- stair halls --

  const stairs = tour.stairs.map((stair) => {
    const lower = nodeById(tour, stair.from)!;
    const upper = nodeById(tour, stair.to)!;
    return buildStair(tour, stair, lower, upper, doors, windowsIn, palette, root, walkable, solid);
  });

  // --------------------------------------------------------------- doors --

  const leaves: DoorLeaf[] = [];
  // Door frames are grouped by level so the dollhouse and floor plan can show
  // one level's frames without the others floating over it.
  const frameSets = new Map<number, { trim: Builder; metal: Builder; group: THREE.Group }>();
  const frameSet = (floor: number) => {
    let set = frameSets.get(floor);
    if (!set) {
      const group = new THREE.Group();
      group.userData.floor = floor;
      casings.add(group);
      set = { trim: new Builder(), metal: new Builder(), group };
      frameSets.set(floor, set);
    }
    return set;
  };
  doors.forEach((door) => {
    const style = door.door.style ?? 'door';
    if (style === 'open') return;
    const set = frameSet(door.floor);
    // Slim frames read as doorways against the photographs; a deep pale
    // reveal stood out as a slab.
    const target = style === 'glass' ? set.metal : set.trim;
    const depth = style === 'arch' ? 0.2 : 0.24;
    const jamb = style === 'glass' ? 0.06 : style === 'arch' ? 0.07 : 0.09;
    const centre = doorCentre(door);
    const along = door.axis === 'z' ? { x: 1, z: 0 } : { x: 0, z: 1 };
    const half = door.width / 2 + jamb / 2;
    [-half, half].forEach((offset) => {
      target.orientedBox(
        centre.x + along.x * offset,
        door.bottom + door.height / 2,
        centre.z + along.z * offset,
        jamb,
        door.height,
        depth,
        door.axis,
      );
    });
    target.orientedBox(
      centre.x,
      door.bottom + door.height + jamb / 2,
      centre.z,
      door.width + jamb * 2,
      jamb,
      depth,
      door.axis,
    );

    if (style === 'entrance') {
      // `normalA` points into space `a`; the leaves always swing indoors.
      const indoor = door.door.a === OUTSIDE
        ? { x: -door.normalA.x, z: -door.normalA.z }
        : door.normalA;
      const count = door.width >= 1.2 ? 2 : 1;
      const leafWidth = door.width / count;
      for (let i = 0; i < count; i += 1) {
        const hingeSign = i === 0 ? -1 : 1;
        const pivot = new THREE.Group();
        pivot.position.set(
          centre.x + along.x * (door.width / 2) * hingeSign + indoor.x * 0.06,
          door.bottom,
          centre.z + along.z * (door.width / 2) * hingeSign + indoor.z * 0.06,
        );
        const leafGeometry = new Builder();
        const run = -hingeSign * (leafWidth / 2);
        leafGeometry.orientedBox(
          along.x * run,
          door.height / 2 - 0.01,
          along.z * run,
          leafWidth - 0.012,
          door.height - 0.02,
          0.055,
          door.axis,
        );
        const leaf = new THREE.Mesh(leafGeometry.build(), palette.doorLeaf);
        const handleGeometry = new Builder();
        const handleRun = -hingeSign * (leafWidth - 0.1);
        [-1, 1].forEach((face) => {
          handleGeometry.orientedBox(
            along.x * handleRun + door.normalA.x * 0.05 * face,
            1.05,
            along.z * handleRun + door.normalA.z * 0.05 * face,
            0.03,
            0.34,
            0.03,
            door.axis,
          );
        });
        const handle = new THREE.Mesh(handleGeometry.build(), palette.brass);
        pivot.add(leaf, handle);
        set.group.add(pivot);

        // Open inwards: pick the rotation that swings the free edge indoors.
        const probe = new THREE.Vector3(along.x * run, 0, along.z * run).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          Math.PI / 2,
        );
        const sign = probe.x * indoor.x + probe.z * indoor.z > 0 ? 1 : -1;
        leaves.push({ pivot, openAngle: sign * THREE.MathUtils.degToRad(96), door });
      }
    }
  });
  frameSets.forEach((set) => {
    set.group.add(
      new THREE.Mesh(set.trim.build(), palette.doorLeaf),
      new THREE.Mesh(set.metal.build(), palette.metal),
    );
  });

  // ------------------------------------------------------------- exterior --

  const facade = new Builder();
  const base = new Builder();
  const glass = new Builder();
  const frames = new Builder();
  const roof = new Builder();
  const snow = new Builder();
  const soffit = new Builder();
  facadeRuns.forEach(({ run, top, doorOpenings, windows }) => {
    const node = run.node;
    const bottom = node.floor === 1 ? 0 : floorElevation(tour, node.floor);
    const line = edgeLine(node.rect, run.side, run.from, run.to);
    const outward = { x: -INWARD[run.side].x, z: -INWARD[run.side].z };

    if (node.floor === 1) {
      base.wall(line, grade - 0.02, 0, [], outward);
    }
    facade.wall(line, bottom, top, [...doorOpenings, ...windows], outward);

    const dir = { x: line.bx - line.ax, z: line.bz - line.az };
    const len = Math.hypot(dir.x, dir.z) || 1;
    const t = { x: dir.x / len, z: dir.z / len };
    windows.forEach((window) => {
      const mid = (window.u0 + window.u1) / 2;
      const width = window.u1 - window.u0;
      const height = window.v1 - window.v0;
      const cx = line.ax + t.x * mid;
      const cz = line.az + t.z * mid;
      // Glazing sits just proud of the wall, so the room behind is never
      // hidden from inside and the pane still reads from the street.
      const inset = 0.04;
      glass.wall(
        {
          ax: cx - (t.x * width) / 2 + outward.x * inset,
          az: cz - (t.z * width) / 2 + outward.z * inset,
          bx: cx + (t.x * width) / 2 + outward.x * inset,
          bz: cz + (t.z * width) / 2 + outward.z * inset,
        },
        window.v0,
        window.v1,
        [],
        outward,
      );
      // Frames and sills stay wholly outside the wall plane: anything that
      // poked through would float inside the photographed room.
      const axis = run.axis;
      const f = 0.06;
      const ox = outward.x * 0.075;
      const oz = outward.z * 0.075;
      frames.orientedBox(cx - (t.x * width) / 2 + ox, window.v0 + height / 2, cz - (t.z * width) / 2 + oz, f, height, 0.14, axis);
      frames.orientedBox(cx + (t.x * width) / 2 + ox, window.v0 + height / 2, cz + (t.z * width) / 2 + oz, f, height, 0.14, axis);
      frames.orientedBox(cx + ox, window.v1 + f / 2, cz + oz, width + f * 2, f, 0.14, axis);
      frames.orientedBox(
        cx + outward.x * 0.11,
        window.v0 - 0.03,
        cz + outward.z * 0.11,
        width + 0.16,
        0.05,
        0.2,
        axis,
      );
      if (width > 1.8) {
        frames.orientedBox(cx + outward.x * 0.06, window.v0 + height / 2, cz + outward.z * 0.06, 0.05, height, 0.1, axis);
      }
    });
  });

  // Roofs over whatever has nothing built above it, with an overhang on the
  // original outside edges; soffits under anything cantilevered.
  tour.nodes.filter(isInterior).forEach((node) => {
    const y = floorElevation(tour, node.floor);
    const top = wallTop(tour, node);
    const above = tour.nodes.filter((other) => other.floor === node.floor + 1).map((other) => other.rect);
    subtractRects(node.rect, above).forEach((piece) => {
      const overhang = overhangs(node.rect, piece, 0.4);
      const x0 = piece.x - overhang.w;
      const x1 = piece.x + piece.w + overhang.e;
      const z0 = piece.z - overhang.n;
      const z1 = piece.z + piece.d + overhang.s;
      roof.box(x0, top - 0.02, z0, x1, top + 0.22, z1);
      if (setting === 'alpine') {
        snow.box(x0 + 0.05, top + 0.22, z0 + 0.05, x1 - 0.05, top + 0.34, z1 - 0.05);
      }
    });
    if (node.floor > 1) {
      const below = tour.nodes
        .filter((other) => other.floor === node.floor - 1 && isInterior(other))
        .map((other) => other.rect);
      subtractRects(node.rect, below).forEach((piece) => {
        soffit.box(piece.x, y - 0.34, piece.z, piece.x + piece.w, y - 0.02, piece.z + piece.d);
      });
    }
  });

  shell.add(
    shellMesh(facade, palette.facade),
    shellMesh(base, palette.base),
    shellMesh(glass, palette.glass),
    shellMesh(frames, palette.trim),
    shellMesh(roof, palette.roof),
    shellMesh(snow, palette.snow),
    shellMesh(soffit, palette.soffit),
  );
  shell.children.forEach((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });
  solid.push(...shell.children);

  // --------------------------------------------------- porch and the path --

  const entrance = doors.find((door) => door.door.b === OUTSIDE || door.door.a === OUTSIDE);
  if (entrance) buildEntrance(tour, entrance, palette, grounds, shell, walkable);

  const bounds = new THREE.Box3();
  tour.nodes.forEach((node) => {
    const y = floorElevation(tour, node.floor);
    bounds.expandByPoint(new THREE.Vector3(node.rect.x, grade, node.rect.z));
    bounds.expandByPoint(
      new THREE.Vector3(node.rect.x + node.rect.w, y + (isInterior(node) ? wallTop(tour, node) - y : 1.1), node.rect.z + node.rect.d),
    );
  });
  return { rooms, outdoor, stairs, shell, grounds, casings, leaves, walkable, solid, bounds, doors };
}

/** Top of a space's outer walls: one storey, or more for a tall room. */
export function wallTop(tour: PropertyTour, node: TourNode) {
  const y = floorElevation(tour, node.floor);
  if (spaceKind(node) === 'stair') return y + tour.site.storey;
  return y + Math.max(tour.site.storey, ceilingHeight(node) + 0.35);
}

// ---------------------------------------------------------------- stairs ---

function buildStair(
  tour: PropertyTour,
  stair: PropertyTour['stairs'][number],
  lower: TourNode,
  upper: TourNode,
  doors: DoorGeometry[],
  windowsIn: (node: TourNode, side: WallSide) => Opening[],
  palette: Palette,
  root: THREE.Group,
  walkable: THREE.Object3D[],
  solid: THREE.Object3D[],
): StairBuild {
  const group = new THREE.Group();
  group.name = `stair:${lower.id}`;
  const y0 = floorElevation(tour, lower.floor);
  const y1 = floorElevation(tour, upper.floor);
  const top = y1 + (upper.height ?? 2.9);
  const rect = lower.rect;

  const floor = new Builder();
  floor.flat(rect, y0, true);
  const walls = new Builder();
  rectEdges(rect).forEach((edge) => {
    // Real openings for the facade's windows, so the stair hall looks out.
    const openings = [
      ...openingsFor(doors, lower, edge.side, y0, y1 - 0.3),
      ...openingsFor(doors, upper, edge.side, y1, top - 0.05),
      ...windowsIn(lower, edge.side),
      ...windowsIn(upper, edge.side),
    ];
    walls.wall(edgeLine(rect, edge.side), y0, top, openings, INWARD[edge.side]);
  });
  const ceiling = new Builder();
  ceiling.flat(rect, top, false);

  const floorMesh = tag(new THREE.Mesh(floor.build(), palette.oak), lower.id, 'floor');
  const wallMesh = tag(new THREE.Mesh(walls.build(), palette.plaster), lower.id, 'wall');
  const ceilingMesh = tag(new THREE.Mesh(ceiling.build(), palette.plaster), upper.id, 'ceiling');
  const centre = { x: rect.x + rect.w / 2, z: rect.z + rect.d / 2 };
  const skylightGeometry = new Builder();
  skylightGeometry.box(centre.x - 0.7, top - 0.04, centre.z - 1.1, centre.x + 0.7, top - 0.01, centre.z + 1.1);
  const skylight = new THREE.Mesh(skylightGeometry.build(), palette.skylight);
  group.add(floorMesh, wallMesh, ceilingMesh, skylight);

  // Landing: the upper floor with the flight cut out of it.
  const landingTop = new Builder();
  const landingBody = new Builder();
  subtractRects(upper.rect, [stair.run]).forEach((piece) => {
    landingTop.flat(piece, y1, true);
    landingBody.box(piece.x, y1 - 0.26, piece.z, piece.x + piece.w, y1 - 0.005, piece.z + piece.d);
  });
  const landingFloor = tag(new THREE.Mesh(landingTop.build(), palette.oak), upper.id, 'floor');
  const landingSlab = new THREE.Mesh(landingBody.build(), palette.plaster);
  group.add(landingFloor, landingSlab);

  // Floating oak treads.
  const dir = ASCENT[stair.ascent];
  const length = dir.x !== 0 ? stair.run.w : stair.run.d;
  const width = dir.x !== 0 ? stair.run.d : stair.run.w;
  const runCentre = { x: stair.run.x + stair.run.w / 2, z: stair.run.z + stair.run.d / 2 };
  const start = { x: runCentre.x - (dir.x * length) / 2, z: runCentre.z - (dir.z * length) / 2 };
  const count = Math.max(4, Math.round((y1 - y0) / 0.18));
  const going = length / count;
  const rise = (y1 - y0) / count;
  const treads = new Builder();
  for (let i = 0; i < count; i += 1) {
    const along = (i + 0.5) * going;
    const cx = start.x + dir.x * along;
    const cz = start.z + dir.z * along;
    const topY = y0 + rise * (i + 1);
    const alongSize = going + 0.04;
    const acrossSize = width - 0.04;
    const sx = dir.x !== 0 ? alongSize : acrossSize;
    const sz = dir.x !== 0 ? acrossSize : alongSize;
    treads.box(cx - sx / 2, topY - 0.06, cz - sz / 2, cx + sx / 2, topY, cz + sz / 2);
  }
  const treadMesh = tag(new THREE.Mesh(treads.build(), palette.oak), lower.id, 'floor');
  group.add(treadMesh);

  // Glass balustrade on the open side of the flight and round the void above.
  const across = dir.x !== 0 ? { x: 0, z: 1 } : { x: 1, z: 0 };
  const sideA = { x: runCentre.x - (across.x * width) / 2, z: runCentre.z - (across.z * width) / 2 };
  const sideB = { x: runCentre.x + (across.x * width) / 2, z: runCentre.z + (across.z * width) / 2 };
  const onWall = (point: { x: number; z: number }) =>
    Math.abs(point.x - rect.x) < 0.05 ||
    Math.abs(point.x - (rect.x + rect.w)) < 0.05 ||
    Math.abs(point.z - rect.z) < 0.05 ||
    Math.abs(point.z - (rect.z + rect.d)) < 0.05;
  const open = onWall(sideA) ? sideB : sideA;
  const railBase = {
    x: open.x - (dir.x * length) / 2 + (open === sideA ? across.x * 0.04 : -across.x * 0.04),
    z: open.z - (dir.z * length) / 2 + (open === sideA ? across.z * 0.04 : -across.z * 0.04),
  };
  const railEnd = { x: railBase.x + dir.x * length, z: railBase.z + dir.z * length };
  const balustrade = new Builder();
  balustrade.slopedPanel(railBase, railEnd, y0 + 0.08, y1 + 0.08, 0.95);
  balustrade.slopedPanel(railBase, railEnd, y1 + 0.02, y1 + 0.02, 1.0);
  const footSide = {
    ax: open.x - (dir.x * length) / 2,
    az: open.z - (dir.z * length) / 2,
  };
  const wallSideFoot = open === sideA ? sideB : sideA;
  balustrade.slopedPanel(
    { x: footSide.ax, z: footSide.az },
    { x: wallSideFoot.x - (dir.x * length) / 2, z: wallSideFoot.z - (dir.z * length) / 2 },
    y1 + 0.02,
    y1 + 0.02,
    1.0,
  );
  group.add(new THREE.Mesh(balustrade.build(), palette.railGlass));
  group.add(
    rail(railBase, railEnd, y0 + 1.03, y1 + 1.03, palette.brass),
    rail(railBase, railEnd, y1 + 1.02, y1 + 1.02, palette.brass),
  );

  const light = new THREE.PointLight('#fff0dc', 14, 16, 1.6);
  light.position.set(centre.x, y1 + 1.2, centre.z);
  group.add(light);

  root.add(group);
  walkable.push(floorMesh, landingFloor, treadMesh);
  solid.push(wallMesh, ceilingMesh, landingSlab);

  const treadTop = (x: number, z: number) => {
    const along = (x - start.x) * dir.x + (z - start.z) * dir.z;
    const lateral = (x - runCentre.x) * across.x + (z - runCentre.z) * across.z;
    if (along < 0 || along > length || Math.abs(lateral) > width / 2 + 0.05) return null;
    const index = Math.min(count - 1, Math.max(0, Math.floor(along / going)));
    return y0 + rise * (index + 1);
  };

  return { lower, upper, group, ceiling: [ceilingMesh, skylight], light, treadTop };
}

function rail(
  a: { x: number; z: number },
  b: { x: number; z: number },
  ya: number,
  yb: number,
  material: THREE.Material,
) {
  const from = new THREE.Vector3(a.x, ya, a.z);
  const to = new THREE.Vector3(b.x, yb, b.z);
  const length = from.distanceTo(to);
  const geometry = new THREE.CylinderGeometry(0.022, 0.022, length, 10);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  return mesh;
}

// ----------------------------------------------------------------- decks ---

function buildDeck(tour: PropertyTour, node: TourNode, palette: Palette) {
  const group = new THREE.Group();
  group.name = `deck:${node.id}`;
  const y = floorElevation(tour, node.floor);
  const grade = -tour.site.plinth;
  const top = new Builder();
  const body = new Builder();
  const r = node.rect;
  if (node.floor === 1) {
    top.flat(r, y - 0.025, true);
    body.box(r.x, grade - 0.02, r.z, r.x + r.w, y - 0.03, r.z + r.d);
  } else {
    top.flat(r, y - 0.025, true);
    body.box(r.x, y - 0.34, r.z, r.x + r.w, y - 0.03, r.z + r.d);
  }
  const deckMaterial =
    tour.site.setting === 'alpine' || node.floor > 1 ? palette.decking : palette.paver;
  group.add(new THREE.Mesh(top.build(), deckMaterial), new THREE.Mesh(body.build(), palette.base));

  // Railings wherever the edge is not against the house or another terrace.
  const neighbours = tour.nodes.filter((other) => other !== node && other.floor === node.floor);
  const panels = new Builder();
  const rails: THREE.Mesh[] = [];
  rectEdges(r).forEach((edge) => {
    const cuts: [number, number][] = [];
    neighbours.forEach((other) => {
      rectEdges(other.rect).forEach((candidate) => {
        if (candidate.axis !== edge.axis || Math.abs(candidate.plane - edge.plane) > 0.05) return;
        cuts.push([candidate.from, candidate.to]);
      });
    });
    subtractIntervals([edge.from, edge.to], cuts).forEach(([from, to]) => {
      const inward = INWARD[edge.side];
      const inset = 0.05;
      const a =
        edge.axis === 'z'
          ? { x: from, z: edge.plane + inward.z * inset }
          : { x: edge.plane + inward.x * inset, z: from };
      const b =
        edge.axis === 'z'
          ? { x: to, z: edge.plane + inward.z * inset }
          : { x: edge.plane + inward.x * inset, z: to };
      panels.slopedPanel(a, b, y, y, 1.0);
      rails.push(rail(a, b, y + 1.02, y + 1.02, palette.metal));
    });
  });
  group.add(new THREE.Mesh(panels.build(), palette.railGlass), ...rails);
  group.children.forEach((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return group;
}

// -------------------------------------------------------------- entrance ---

function buildEntrance(
  tour: PropertyTour,
  door: DoorGeometry,
  palette: Palette,
  grounds: THREE.Group,
  shell: THREE.Group,
  walkable: THREE.Object3D[],
) {
  const grade = -tour.site.plinth;
  const centre = doorCentre(door);
  // `normalA` points into the house; the porch lies the other way.
  const inside = door.door.a === OUTSIDE ? -1 : 1;
  const out = { x: -door.normalA.x * inside, z: -door.normalA.z * inside };
  const along = door.axis === 'z' ? { x: 1, z: 0 } : { x: 0, z: 1 };
  const width = door.width + 2.6;
  const depth = 1.7;
  const y = door.bottom;

  const slab = new Builder();
  const slabTop = new Builder();
  const corner = (u: number, o: number) => ({
    x: centre.x + along.x * u + out.x * o,
    z: centre.z + along.z * u + out.z * o,
  });
  const a = corner(-width / 2, 0);
  const b = corner(width / 2, depth);
  const porchRect: TourRect = {
    x: Math.min(a.x, b.x),
    z: Math.min(a.z, b.z),
    w: Math.abs(b.x - a.x),
    d: Math.abs(b.z - a.z),
  };
  slabTop.flat(porchRect, y, true);
  slab.box(porchRect.x, grade - 0.02, porchRect.z, porchRect.x + porchRect.w, y - 0.005, porchRect.z + porchRect.d);

  const steps = Math.max(1, Math.round((y - grade) / 0.16));
  const rise = (y - grade) / steps;
  for (let i = 0; i < steps; i += 1) {
    const s0 = corner(-width / 2 + 0.3, depth + i * 0.32);
    const s1 = corner(width / 2 - 0.3, depth + (i + 1) * 0.32);
    const stepTop = y - rise * (i + 1);
    const box = {
      x0: Math.min(s0.x, s1.x),
      x1: Math.max(s0.x, s1.x),
      z0: Math.min(s0.z, s1.z),
      z1: Math.max(s0.z, s1.z),
    };
    slab.box(box.x0, grade - 0.02, box.z0, box.x1, stepTop, box.z1);
    slabTop.flat({ x: box.x0, z: box.z0, w: box.x1 - box.x0, d: box.z1 - box.z0 }, stepTop + 0.001, true);
  }

  // Canopy and a pair of lanterns.
  const canopy = new Builder();
  const c0 = corner(-width / 2 - 0.2, -0.05);
  const c1 = corner(width / 2 + 0.2, depth + 0.35);
  const canopyY = y + door.height + 0.45;
  canopy.box(
    Math.min(c0.x, c1.x),
    canopyY,
    Math.min(c0.z, c1.z),
    Math.max(c0.x, c1.x),
    canopyY + 0.16,
    Math.max(c0.z, c1.z),
  );
  const lanterns = new Builder();
  [-1, 1].forEach((side) => {
    const p = corner(side * (door.width / 2 + 0.42), 0.09);
    lanterns.box(p.x - 0.08, y + 1.65, p.z - 0.08, p.x + 0.08, y + 2.0, p.z + 0.08);
  });

  const top = new THREE.Mesh(slabTop.build(), palette.paver);
  top.receiveShadow = true;
  const body = new THREE.Mesh(slab.build(), palette.base);
  body.receiveShadow = true;
  body.castShadow = true;
  // Canopy and lanterns belong to the facade: the dollhouse lifts them off
  // with the roof.
  const canopyMesh = shellMesh(canopy, palette.roof);
  canopyMesh.castShadow = true;
  grounds.add(top, body);
  shell.add(canopyMesh, shellMesh(lanterns, palette.lantern));
  top.userData.space = OUTSIDE;
  walkable.push(top);

  // Garden path from the street to the foot of the steps.
  const approach = tour.site.approach;
  const foot = corner(0, depth + steps * 0.32 + 0.2);
  const points = [...approach.map((p) => ({ x: p.x, z: p.z })), foot];
  const path = new Builder();
  for (let i = 0; i < points.length - 1; i += 1) {
    path.strip(points[i], points[i + 1], grade + 0.012, 1.7);
  }
  points.forEach((p) => path.disc(p, grade + 0.011, 0.85, 18));
  const pathMesh = new THREE.Mesh(path.build(), palette.paver);
  pathMesh.receiveShadow = true;
  pathMesh.userData.space = OUTSIDE;
  grounds.add(pathMesh);
  walkable.push(pathMesh);
}

// ---------------------------------------------------------- depth meshes ---

/**
 * A decoded depth map: one byte per pixel, the square root of the fraction of
 * the proxy distance (see scripts/build-depth.ts).
 */
export interface DepthMap {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  /** Bytes between pixels (4 for RGBA canvas data). */
  stride: number;
}

export interface DepthMeshBuild {
  /** Everything but the ceiling. */
  body: THREE.Mesh;
  /** Ceiling triangles, hidden with the ceiling in the dollhouse. */
  ceiling: THREE.Mesh | null;
  material: ProjectionMaterial;
  /** Reconstructed depth along a world direction, as a fraction of the proxy. */
  ratioAt: (dir: { x: number; y: number; z: number }) => number;
}

/** Sample a depth map along a direction in the photo's own frame. */
export function sampleDepth(depth: DepthMap, yawDeg: number, pitchDeg: number) {
  let u = yawDeg / 360 - 0.25;
  u -= Math.floor(u);
  const v = 0.5 + pitchDeg / 180;
  const x = u * depth.width - 0.5;
  const y = Math.min(depth.height - 1.001, Math.max(0, (1 - v) * depth.height - 0.5));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const xa = ((x0 % depth.width) + depth.width) % depth.width;
  const xb = (xa + 1) % depth.width;
  const at = (xx: number, yy: number) => {
    const root = depth.data[(yy * depth.width + xx) * depth.stride] / 255;
    return root * root;
  };
  const top = at(xa, y0) * (1 - fx) + at(xb, y0) * fx;
  const bottom = at(xa, y0 + 1) * (1 - fx) + at(xb, y0 + 1) * fx;
  return Math.max(0.02, top * (1 - fy) + bottom * fy);
}

/**
 * Prepares a depth map for meshing: anything within a few percent of the room
 * box is snapped onto it, so walls, floors and ceilings are perfectly flat
 * instead of carrying the model's noise; then a small blur turns depth edges
 * into short ramps.
 */
export function smoothDepth(raw: DepthMap): DepthMap {
  const { width, height } = raw;
  const ratio = new Float32Array(width * height);
  for (let k = 0; k < ratio.length; k += 1) {
    const root = raw.data[k * raw.stride] / 255;
    const r = root * root;
    // 0.86–0.94 blends into 1: flat surfaces lock onto the box.
    const t = Math.min(1, Math.max(0, (r - 0.86) / 0.08));
    const snap = t * t * (3 - 2 * t);
    ratio[k] = r + (1 - r) * snap;
  }
  const blurred = new Float32Array(ratio.length);
  const radius = 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let n = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        const yy = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -radius; dx <= radius; dx += 1) {
          const xx = (x + dx + width) % width;
          sum += Math.log(ratio[yy * width + xx]);
          n += 1;
        }
      }
      blurred[y * width + x] = Math.exp(sum / n);
    }
  }
  const data = new Uint8Array(ratio.length);
  for (let k = 0; k < data.length; k += 1) data[k] = Math.round(Math.sqrt(blurred[k]) * 255);
  return { data, width, height, stride: 1 };
}

/**
 * Gives a photograph its shape back: a sphere of rays from the capture point,
 * each pushed out to the depth the photo was reconstructed at. Because every
 * vertex lies on its own ray, the photo still lines up exactly at the capture
 * point; anywhere else furniture stands off the floor instead of smearing
 * across it.
 *
 * Triangles that bridge a depth edge (the side of a sofa the camera never saw)
 * and triangles in front of a real doorway are left out; the room box behind
 * shows through those gaps, so nothing is ever empty.
 */
export function buildDepthMesh(
  tour: PropertyTour,
  node: TourNode,
  raw: DepthMap,
  doors: DoorGeometry[],
  source: ProjectionMaterial,
  segments: number,
): DepthMeshBuild {
  const depth = smoothDepth(raw);
  const W = segments;
  const H = Math.round(segments / 2);
  const floorY = floorElevation(tour, node.floor);
  const capture = captureOf(node);
  const eye = new THREE.Vector3(capture.x, floorY + EYE_HEIGHT, capture.z);
  const room = spaceKind(node) === 'room';
  const ceilingY = floorY + ceilingHeight(node);
  const own = doors.filter((door) => door.door.a === node.id || door.door.b === node.id);

  const count = (W + 1) * (H + 1);
  const positions = new Float32Array(count * 3);
  const blocked = new Uint8Array(count);
  const up = new Uint8Array(count);
  const end = new THREE.Vector3();
  for (let j = 0; j <= H; j += 1) {
    const pitch = 90 - (180 * j) / H;
    for (let i = 0; i <= W; i += 1) {
      const yaw = (360 * i) / W;
      const k = j * (W + 1) + i;
      const dir = panoDirection(node, yaw, pitch);
      const box = proxyDistance(tour, node, dir);
      const ratio = Math.abs(pitch) > 89.9 ? 1 : sampleDepth(depth, yaw, pitch);
      const distance = box * ratio * 0.996;
      positions[k * 3] = eye.x + dir.x * distance;
      positions[k * 3 + 1] = eye.y + dir.y * distance;
      positions[k * 3 + 2] = eye.z + dir.z * distance;
      end.set(eye.x + dir.x * (box + 0.08), eye.y + dir.y * (box + 0.08), eye.z + dir.z * (box + 0.08));
      if (own.some((door) => rayThroughDoor(eye, end, door))) blocked[k] = 1;
      if (room && pitch > 0 && positions[k * 3 + 1] > ceilingY - 0.35) up[k] = 1;
    }
  }

  const body: number[] = [];
  const ceiling: number[] = [];
  // Depth edges are bridged rather than torn open: after smoothing they are
  // short ramps, which read as a soft stretch when seen from one side, where
  // a hole would show a jagged ghost of the furniture on the wall behind.
  const triangle = (a: number, b: number, c: number) => {
    if (blocked[a] || blocked[b] || blocked[c]) return;
    (up[a] && up[b] && up[c] ? ceiling : body).push(a, b, c);
  };
  for (let j = 0; j < H; j += 1) {
    for (let i = 0; i < W; i += 1) {
      const a = j * (W + 1) + i;
      const b = a + 1;
      const c = a + W + 1;
      const d = c + 1;
      // Wound to face the capture point.
      triangle(a, c, b);
      triangle(b, c, d);
    }
  }

  const position = new THREE.BufferAttribute(positions, 3);
  const make = (indices: number[]) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', position);
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return geometry;
  };
  const material = linkedClone(source, { NEAR_FADE: '0.32' });
  material.side = THREE.DoubleSide;
  const bodyMesh = tag(new THREE.Mesh(make(body), material), node.id, 'depth');
  const ceilingMesh = ceiling.length
    ? tag(new THREE.Mesh(make(ceiling), material), node.id, 'ceiling')
    : null;

  const heading = node.heading ?? 0;
  const ratioAt = (dir: { x: number; y: number; z: number }) => {
    const yaw = (Math.atan2(dir.x, -dir.z) * 180) / Math.PI - heading;
    const pitch = (Math.asin(Math.max(-1, Math.min(1, dir.y))) * 180) / Math.PI;
    return sampleDepth(depth, yaw, pitch);
  };
  return { body: bodyMesh, ceiling: ceilingMesh, material, ratioAt };
}

/** Does the segment from `from` to `to` pass through a door's opening? */
export function rayThroughDoor(from: THREE.Vector3, to: THREE.Vector3, door: DoorGeometry, margin = 0.1) {
  const c0 = door.axis === 'x' ? from.x : from.z;
  const c1 = door.axis === 'x' ? to.x : to.z;
  const span = c1 - c0;
  if (Math.abs(span) < 1e-6) return false;
  const t = (door.plane - c0) / span;
  if (t <= 0 || t >= 1) return false;
  const qx = from.x + (to.x - from.x) * t;
  const qy = from.y + (to.y - from.y) * t;
  const qz = from.z + (to.z - from.z) * t;
  const lateral = (door.axis === 'x' ? qz : qx) - door.along;
  return (
    Math.abs(lateral) <= door.width / 2 + margin &&
    qy >= door.bottom - margin &&
    qy <= door.bottom + door.height + margin
  );
}

// ------------------------------------------------------------- geometry ---

interface Line {
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

interface Opening {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

function edgeLine(rect: TourRect, side: WallSide, from?: number, to?: number): Line {
  switch (side) {
    case 'n':
      return { ax: from ?? rect.x, az: rect.z, bx: to ?? rect.x + rect.w, bz: rect.z };
    case 's':
      return { ax: from ?? rect.x, az: rect.z + rect.d, bx: to ?? rect.x + rect.w, bz: rect.z + rect.d };
    case 'w':
      return { ax: rect.x, az: from ?? rect.z, bx: rect.x, bz: to ?? rect.z + rect.d };
    case 'e':
      return { ax: rect.x + rect.w, az: from ?? rect.z, bx: rect.x + rect.w, bz: to ?? rect.z + rect.d };
  }
}

function openingsFor(
  doors: DoorGeometry[],
  node: TourNode,
  side: WallSide,
  bottom: number,
  limit: number,
): Opening[] {
  const line = edgeLine(node.rect, side);
  const start = side === 'n' || side === 's' ? line.ax : line.az;
  return doors
    .filter(
      (door) =>
        (door.door.a === node.id || door.door.b === node.id) &&
        sideOfRect(node.rect, door.door.x, door.door.z) === side,
    )
    .map((door) => ({
      u0: door.along - start - door.width / 2,
      u1: door.along - start + door.width / 2,
      v0: bottom,
      v1: Math.min(bottom + door.height, limit),
    }));
}

function doorCentre(door: DoorGeometry) {
  return door.axis === 'x' ? { x: door.plane, z: door.along } : { x: door.along, z: door.plane };
}

function overhangs(original: TourRect, piece: TourRect, amount: number) {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.05;
  return {
    w: near(piece.x, original.x) ? amount : 0,
    e: near(piece.x + piece.w, original.x + original.w) ? amount : 0,
    n: near(piece.z, original.z) ? amount : 0,
    s: near(piece.z + piece.d, original.z + original.d) ? amount : 0,
  };
}

function placeWindows(
  length: number,
  blocked: [number, number][],
  style: { width: number; gap: number },
): [number, number][] {
  const free = subtractIntervals(
    [0.5, length - 0.5],
    blocked.map(([a, b]) => [a - 0.55, b + 0.55] as [number, number]),
  );
  const windows: [number, number][] = [];
  free.forEach(([a, b]) => {
    const span = b - a;
    if (span < 1.0) return;
    const count = Math.max(1, Math.floor((span + style.gap) / (style.width + style.gap)));
    const width = Math.min(style.width, (span - style.gap * (count - 1)) / count);
    const total = count * width + (count - 1) * style.gap;
    let u = a + (span - total) / 2;
    for (let i = 0; i < count; i += 1) {
      windows.push([u, u + width]);
      u += width + style.gap;
    }
  });
  return windows;
}

function tag<T extends THREE.Object3D>(object: T, space: string, surface: string): T {
  object.userData.space = space;
  object.userData.surface = surface;
  return object;
}

function shellMesh(builder: Builder, material: THREE.Material) {
  const mesh = new THREE.Mesh(builder.build(), material);
  mesh.userData.cgMaterial = material;
  mesh.userData.space = OUTSIDE;
  return mesh;
}

/**
 * Accumulates quads with metric UVs into one non-indexed geometry, so each
 * material in the house is a single draw call.
 */
export class Builder {
  private positions: number[] = [];
  private normals: number[] = [];
  private uvs: number[] = [];

  quad(
    p: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3],
    uv: [number, number][],
    normal: THREE.Vector3,
  ) {
    const natural = new THREE.Vector3()
      .subVectors(p[1], p[0])
      .cross(new THREE.Vector3().subVectors(p[2], p[0]));
    const order = natural.dot(normal) >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    order.forEach((i) => {
      this.positions.push(p[i].x, p[i].y, p[i].z);
      this.normals.push(normal.x, normal.y, normal.z);
      this.uvs.push(uv[i][0], uv[i][1]);
    });
  }

  /** A horizontal rectangle facing up or down, UVs in plan metres. */
  flat(rect: TourRect, y: number, up: boolean) {
    const { x, z, w, d } = rect;
    this.quad(
      [
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(x + w, y, z),
        new THREE.Vector3(x + w, y, z + d),
        new THREE.Vector3(x, y, z + d),
      ],
      [
        [x, -z],
        [x + w, -z],
        [x + w, -z - d],
        [x, -z - d],
      ],
      new THREE.Vector3(0, up ? 1 : -1, 0),
    );
  }

  /** A vertical wall along a line with rectangular holes cut in it. */
  wall(line: Line, y0: number, y1: number, openings: Opening[], normal: { x: number; z: number }) {
    const length = Math.hypot(line.bx - line.ax, line.bz - line.az);
    if (length < 0.01 || y1 - y0 < 0.01) return;
    const tx = (line.bx - line.ax) / length;
    const tz = (line.bz - line.az) / length;
    const cuts = openings
      .map((o) => ({ ...o, u0: Math.max(0, o.u0), u1: Math.min(length, o.u1) }))
      .filter((o) => o.u1 - o.u0 > 0.01 && o.v1 > y0 && o.v0 < y1);
    const breaks = Array.from(new Set([0, length, ...cuts.flatMap((o) => [o.u0, o.u1])])).sort(
      (a, b) => a - b,
    );
    const n = new THREE.Vector3(normal.x, 0, normal.z);
    for (let i = 0; i < breaks.length - 1; i += 1) {
      const u0 = breaks[i];
      const u1 = breaks[i + 1];
      if (u1 - u0 < 0.001) continue;
      const mid = (u0 + u1) / 2;
      const holes = cuts
        .filter((o) => o.u0 <= mid && o.u1 >= mid)
        .map((o) => [o.v0, o.v1] as [number, number]);
      subtractIntervals([y0, y1], holes).forEach(([v0, v1]) => {
        const p = (u: number, v: number) => new THREE.Vector3(line.ax + tx * u, v, line.az + tz * u);
        this.quad(
          [p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1)],
          [
            [u0, v0],
            [u1, v0],
            [u1, v1],
            [u0, v1],
          ],
          n,
        );
      });
    }
  }

  /** An axis-aligned box given two opposite corners. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const faces: [THREE.Vector3[], [number, number][], THREE.Vector3][] = [
      [[v(x1, y0, z0), v(x1, y0, z1), v(x1, y1, z1), v(x1, y1, z0)], [[z0, y0], [z1, y0], [z1, y1], [z0, y1]], v(1, 0, 0)],
      [[v(x0, y0, z1), v(x0, y0, z0), v(x0, y1, z0), v(x0, y1, z1)], [[z1, y0], [z0, y0], [z0, y1], [z1, y1]], v(-1, 0, 0)],
      [[v(x0, y1, z0), v(x1, y1, z0), v(x1, y1, z1), v(x0, y1, z1)], [[x0, -z0], [x1, -z0], [x1, -z1], [x0, -z1]], v(0, 1, 0)],
      [[v(x0, y0, z1), v(x1, y0, z1), v(x1, y0, z0), v(x0, y0, z0)], [[x0, z1], [x1, z1], [x1, z0], [x0, z0]], v(0, -1, 0)],
      [[v(x0, y0, z1), v(x1, y0, z1), v(x1, y1, z1), v(x0, y1, z1)], [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], v(0, 0, 1)],
      [[v(x1, y0, z0), v(x0, y0, z0), v(x0, y1, z0), v(x1, y1, z0)], [[x1, y0], [x0, y0], [x0, y1], [x1, y1]], v(0, 0, -1)],
    ];
    faces.forEach(([points, uv, normal]) =>
      this.quad(points as [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3], uv, normal),
    );
  }

  /**
   * A box centred on a point, sized along the wall, vertically and across the
   * wall. `axis` is the wall's constant coordinate: 'z' walls run along x.
   */
  orientedBox(
    cx: number,
    cy: number,
    cz: number,
    alongSize: number,
    height: number,
    acrossSize: number,
    axis: 'x' | 'z',
  ) {
    const sx = axis === 'z' ? alongSize : acrossSize;
    const sz = axis === 'z' ? acrossSize : alongSize;
    this.box(cx - sx / 2, cy - height / 2, cz - sz / 2, cx + sx / 2, cy + height / 2, cz + sz / 2);
  }

  /** A vertical panel whose base runs from `a` at `ya` to `b` at `yb`. */
  slopedPanel(
    a: { x: number; z: number },
    b: { x: number; z: number },
    ya: number,
    yb: number,
    height: number,
  ) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    if (length < 0.01) return;
    const normal = new THREE.Vector3(-dz / length, 0, dx / length);
    this.quad(
      [
        new THREE.Vector3(a.x, ya, a.z),
        new THREE.Vector3(b.x, yb, b.z),
        new THREE.Vector3(b.x, yb + height, b.z),
        new THREE.Vector3(a.x, ya + height, a.z),
      ],
      [
        [0, ya],
        [length, yb],
        [length, yb + height],
        [0, ya + height],
      ],
      normal,
    );
  }

  /** A flat strip between two plan points, for paths. */
  strip(a: { x: number; z: number }, b: { x: number; z: number }, y: number, width: number) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    if (length < 0.01) return;
    const nx = (-dz / length) * (width / 2);
    const nz = (dx / length) * (width / 2);
    this.quad(
      [
        new THREE.Vector3(a.x + nx, y, a.z + nz),
        new THREE.Vector3(b.x + nx, y, b.z + nz),
        new THREE.Vector3(b.x - nx, y, b.z - nz),
        new THREE.Vector3(a.x - nx, y, a.z - nz),
      ],
      [
        [a.x + nx, -(a.z + nz)],
        [b.x + nx, -(b.z + nz)],
        [b.x - nx, -(b.z - nz)],
        [a.x - nx, -(a.z - nz)],
      ],
      new THREE.Vector3(0, 1, 0),
    );
  }

  disc(c: { x: number; z: number }, y: number, radius: number, segments: number) {
    for (let i = 0; i < segments; i += 1) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const p0 = new THREE.Vector3(c.x, y, c.z);
      const p1 = new THREE.Vector3(c.x + Math.cos(a0) * radius, y, c.z + Math.sin(a0) * radius);
      const p2 = new THREE.Vector3(c.x + Math.cos(a1) * radius, y, c.z + Math.sin(a1) * radius);
      this.quad(
        [p0, p1, p2, p2.clone()],
        [
          [p0.x, -p0.z],
          [p1.x, -p1.z],
          [p2.x, -p2.z],
          [p2.x, -p2.z],
        ],
        new THREE.Vector3(0, 1, 0),
      );
    }
  }

  build() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    return geometry;
  }
}
