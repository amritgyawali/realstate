import * as THREE from 'three';
import type { PropertyTour, TourNode } from '@/lib/types';
import {
  EYE_HEIGHT,
  OUTSIDE,
  captureNodes,
  captureOf,
  ceilingHeight,
  floorAtElevation,
  floorBounds,
  floorElevation,
  hasPano,
  nodeById,
  proxyDistance,
  rectCentre,
  spaceAt,
  spaceKind,
  stairFor,
  type DoorGeometry,
} from '@/lib/tour/layout';
import {
  buildWalkGraph,
  findPath,
  nearestStop,
  routeWaypoints,
  type WalkGraph,
} from '@/lib/tour/walk-graph';
import {
  buildBackgroundPlate,
  buildDepthMesh,
  buildHouse,
  doorCentre,
  type DepthMeshBuild,
  type DoorFrame,
  type DoorPatch,
  type HouseBuild,
  type ProjectionMaterialHost,
} from './build-house';
import { buildEnvironment, type EnvironmentBuild } from './environment';
import {
  MAX_PORTALS,
  createPalette,
  createPortalUniforms,
  type Palette,
  type PortalUniforms,
  type ProjectionMaterial,
} from './materials';
import { createSurfaceLibrary } from './textures';

const DEG = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0);
const PLAN_BACKGROUND = new THREE.Color('#15181b');
const ASCENT_YAW = { n: 0, e: 90, s: 180, w: 270 } as const;

export type TourMode = 'overview' | 'walk' | 'dollhouse' | 'floorplan';

export interface EngineState {
  mode: TourMode;
  /** Space the visitor is standing in, or `outside`. */
  space: string;
  floor: number;
  stop: number;
  walking: boolean;
  flying: boolean;
  guided: boolean;
  /** Level shown in the dollhouse and floor plan; `all` stacks every level. */
  level: number | 'all';
}

export type OverlayItem =
  | { kind: 'door'; key: string; x: number; y: number; label: string; target: string; scale: number; hint: string }
  | { kind: 'info'; key: string; x: number; y: number; label: string; body: string; scale: number }
  | { kind: 'room'; key: string; x: number; y: number; label: string; target: string; active: boolean }
  | { kind: 'entrance'; key: string; x: number; y: number; label: string };

export interface EnginePose {
  x: number;
  z: number;
  yaw: number;
  floor: number;
}

export interface EngineCallbacks {
  onState: (state: EngineState) => void;
  onOverlay: (items: OverlayItem[]) => void;
  onPose: (pose: EnginePose) => void;
  onProgress: (loaded: number) => void;
  onVisit: (space: string) => void;
  onMeasure: (points: { x: number; y: number }[], metres: number | null) => void;
}

interface Pose {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  fov: number;
}

interface Flight {
  from: Pose;
  to: Pose;
  t: number;
  duration: number;
  lift: number;
  done: () => void;
}

interface Motion {
  points: THREE.Vector3[];
  cumulative: number[];
  total: number;
  s: number;
  /** Current walking speed, m/s — carried over when a walk is re-routed. */
  speed: number;
  /** Graph stops along the route, with their distance along it. */
  route: { stop: number; at: number }[];
  target: number;
  faceTravel: boolean;
  finalYaw: number | null;
  cruise: number;
  resolve: () => void;
}

interface Pan {
  from: number;
  to: number;
  t: number;
  duration: number;
  resolve: () => void;
}

interface TextureSlot {
  preview?: THREE.Texture;
  full?: THREE.Texture;
  loadingFull?: boolean;
}

const MIN_FOV = 35;
const MAX_FOV = 100;
const WALK_FOV = 76;
const MAX_PITCH = 80;
/** Distances from a capture point over which its reconstruction smooths out. */
const MELT_FROM = 1.9;
const MELT_TO = 3.9;

/**
 * The walkover engine.
 *
 * It keeps a whole house in one scene — photographed rooms projected onto their
 * own geometry, modelled stairs, exterior and grounds — and moves a camera
 * through it continuously. Four ways of looking at the same model:
 *
 * - `overview`: the whole building from outside, turning slowly.
 * - `walk`: eye height, one step at a time. A step is a short, eased move to a
 *   neighbouring stop on the walk graph; a longer walk strings steps together
 *   and turns the head along the route, so going from the hall to a bedroom
 *   passes through every doorway and up every tread on the way.
 * - `dollhouse`: the house with roof and ceilings lifted off.
 * - `floorplan`: straight down on one level.
 *
 * Switching views is always a camera flight, never a cut.
 *
 * Kept deliberately free of a React reconciler: the render loop owns its own
 * state and only pushes projected labels and a little state back to React, so
 * dragging the view never re-renders the 3D layer.
 */
export class WalkEngine {
  readonly graph: WalkGraph;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private container: HTMLElement;
  private tour: PropertyTour;
  private callbacks: EngineCallbacks;
  private reducedMotion: boolean;
  /** Whether keyboard input is meant for the tour (not the page around it). */
  private handlesKeys: () => boolean;

  private portals: PortalUniforms;
  private surfaces = createSurfaceLibrary();
  private palette: Palette;
  private house: HouseBuild;
  private environment: EnvironmentBuild;
  private world = new THREE.Group();
  private cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e4);
  private loader = new THREE.TextureLoader();
  private textures = new Map<string, TextureSlot>();
  private fullOrder: string[] = [];
  private fullLimit: number;

  private mode: TourMode = 'overview';
  private level: number | 'all' = 'all';
  private space = OUTSIDE;
  private stop = -1;

  // Walk rig.
  private eye = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private fov = WALK_FOV;
  private targetYaw = 0;
  private targetPitch = 0;
  private targetFov = WALK_FOV;
  /** Turn rate of the head while walking (deg/s), for a critically damped turn. */
  private yawSpeed = 0;

  // Orbit rig, shared by overview, dollhouse and floor plan.
  private orbit = { target: new THREE.Vector3(), azimuth: 32, elevation: 20, distance: 40, fov: 45 };
  private orbitGoal = { target: new THREE.Vector3(), azimuth: 32, elevation: 20, distance: 40, fov: 45 };
  private autoOrbit = true;

  private flight: Flight | null = null;
  private motion: Motion | null = null;
  private pan: Pan | null = null;
  private guidedToken: object | null = null;
  private fade: { material: ProjectionMaterial; t: number; previous: string | null } | null = null;
  private doorOpen = 0;

  // Input.
  private pointers = new Map<number, { x: number; y: number }>();
  private press: { x: number; y: number; time: number; moved: boolean } | null = null;
  private pinch = 0;
  private keys = new Set<string>();
  private raycaster = new THREE.Raycaster();
  private hoverStop = -1;
  private cursor: THREE.Group;
  private markers: THREE.InstancedMesh;
  private markerFill: THREE.InstancedMesh;
  private markerKey = '';
  private gyro: { alpha: number; beta: number } | null = null;
  private gyroEnabled = false;
  private autoRotate = false;

  private measuring = false;
  private measurePoints: THREE.Vector3[] = [];
  private lastMeasureKey = '';

  private infoPoints = new Map<string, { point: THREE.Vector3; label: string; body: string }[]>();
  /** Reconstructed shape of each photographed space, once its depth map loads. */
  private depth = new Map<string, DepthMeshBuild>();
  /** Each room's photo with the furniture lifted out. */
  private plates = new Map<string, THREE.DataTexture>();
  /** The view the doorway patches were last settled for. */
  private doorwaysMode = '';
  /** Lattice stops that would stand the visitor on a piece of furniture. */
  private occupied = new Set<number>();
  /** Photo materials currently sharpening from preview to full resolution. */
  private blending = new Set<ProjectionMaterial['uniforms']>();
  private lastOverlayKey = '';
  private lastStateKey = '';
  private lastPoseAt = 0;
  private needsRender = true;
  private frame = 0;
  private disposed = false;

  constructor(
    container: HTMLElement,
    tour: PropertyTour,
    callbacks: EngineCallbacks,
    options: { reducedMotion?: boolean; handlesKeys?: () => boolean } = {},
  ) {
    this.container = container;
    this.tour = tour;
    this.callbacks = callbacks;
    this.reducedMotion = options.reducedMotion ?? false;
    this.handlesKeys = options.handlesKeys ?? (() => true);
    this.graph = buildWalkGraph(tour);

    const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    this.fullLimit = coarse ? 2 : 4;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.75 : 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.localClippingEnabled = true;
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.05,
      2000,
    );

    this.portals = createPortalUniforms();
    this.palette = createPalette(tour.site, this.portals, this.surfaces);
    this.scene.add(this.world);
    this.house = buildHouse(tour, this.palette, this.portals, this.world);
    this.environment = buildEnvironment(tour, this.palette, this.renderer, this.scene);
    this.scene.add(this.environment.group, this.environment.planting, this.environment.lights);

    // Only the house is cut away in the dollhouse; trees and sky stay whole.
    const cut = [this.cutPlane];
    [
      this.palette.plaster,
      this.palette.oak,
      this.palette.railGlass,
      this.palette.brass,
      this.palette.skylight,
      this.palette.doorLeaf,
      this.palette.metal,
    ].forEach((material) => {
      material.clippingPlanes = cut;
    });
    this.house.rooms.forEach((room) => {
      room.material.clippingPlanes = cut;
    });
    this.house.frames.forEach((frame) => {
      frame.materials.forEach((material) => {
        material.clippingPlanes = cut;
      });
    });
    this.house.outdoor.forEach((space) => {
      (space.patch.material as ProjectionMaterial).clippingPlanes = cut;
    });

    const ring = new THREE.RingGeometry(0.17, 0.225, 40).rotateX(-Math.PI / 2);
    const disc = new THREE.CircleGeometry(0.17, 40).rotateX(-Math.PI / 2);
    this.markers = new THREE.InstancedMesh(
      ring,
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.78, depthWrite: false }),
      this.graph.stops.length,
    );
    this.markerFill = new THREE.InstancedMesh(
      disc,
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false }),
      this.graph.stops.length,
    );
    [this.markers, this.markerFill].forEach((mesh) => {
      mesh.frustumCulled = false;
      mesh.renderOrder = 5;
      mesh.count = 0;
      this.scene.add(mesh);
    });
    this.markers.setColorAt(0, new THREE.Color('#ffffff'));

    this.cursor = new THREE.Group();
    const cursorRing = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.3, 48),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false, depthTest: false }),
    );
    const cursorDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.24, 48),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false, depthTest: false }),
    );
    this.cursor.add(cursorRing, cursorDisc);
    this.cursor.renderOrder = 20;
    this.cursor.visible = false;
    this.scene.add(this.cursor);

    this.tour.nodes.forEach((node) => this.placeInfoPoints(node));
    this.frameOverview(true);
    this.applyCamera();
    this.applyScene();
    this.renderer.shadowMap.needsUpdate = true;
    this.loadPreviews();
    this.loadDepthMaps();

    this.bindEvents();
    this.loop();
  }

  // --------------------------------------------------------------- public --

  getState(): EngineState {
    return {
      mode: this.mode,
      space: this.space,
      floor: this.currentFloor(),
      stop: this.stop,
      walking: this.motion !== null,
      flying: this.flight !== null,
      guided: this.guidedToken !== null,
      level: this.level,
    };
  }

  /** Overview → street → up the path to the front door. */
  async approach() {
    this.stopGuided();
    await this.enterWalkAt(this.graph.street, this.yawTowards(this.graph.street, this.graph.porch));
    await this.walkToStop(this.graph.porch, { faceTravel: true });
  }

  /** Walk, step by step, to a space's capture point (or stair foot/head). */
  async walkToSpace(space: string) {
    const target = this.graph.arrival.get(space);
    if (target === undefined) return;
    await this.walkToStop(target, { faceTravel: true, finalYaw: this.arrivalYaw(space) });
  }

  /** Which way to face on arriving in a space: its best view, or up the stairs. */
  private arrivalYaw(space: string): number | null {
    const node = nodeById(this.tour, space);
    if (node?.view !== undefined) return node.view;
    const stair = stairFor(this.tour, space);
    if (!stair) return null;
    // At the foot, face up the flight; at the head, turn toward the landing.
    if (space === stair.from) return ASCENT_YAW[stair.ascent];
    const head = this.graph.arrival.get(space);
    if (!node || head === undefined) return ASCENT_YAW[stair.ascent];
    const from = this.graph.stops[head];
    const centre = rectCentre(node.rect);
    return Math.atan2(centre.x - from.x, -(centre.z - from.z)) / DEG;
  }

  /**
   * Walk to a stop along the graph. From outside the house the walk starts at
   * the street; from the dollhouse or floor plan it flies down to the stop.
   */
  async walkToStop(
    target: number,
    options: { faceTravel?: boolean; finalYaw?: number | null } = {},
  ) {
    if (this.disposed) return;
    const stop = this.graph.stops[target];
    if (!stop) return;
    if (this.mode === 'overview') {
      // From outside the whole way: land on the pavement, then walk in.
      await this.enterWalkAt(this.graph.street, this.yawTowards(this.graph.street, this.graph.porch));
    } else if (this.mode !== 'walk') {
      // From the dollhouse or floor plan: fly down into the chosen room.
      await this.enterWalkAt(target, options.finalYaw ?? this.yaw);
      return;
    }
    if (this.mode !== 'walk' || this.stop < 0) return;
    await this.walkAlong(target, options.faceTravel ?? true, options.finalYaw ?? null);
  }

  /** One step roughly the way the camera faces (`-1` steps backwards). */
  step(direction: 1 | -1 = 1) {
    if (this.mode !== 'walk' || this.flight) return;
    const from = this.motion ? this.motion.target : this.stop;
    if (from < 0) return;
    const origin = this.graph.stops[from];
    const heading = this.yaw + (direction < 0 ? 180 : 0);
    let best = -1;
    let bestScore = Infinity;
    this.graph.adjacency[from].forEach((candidate) => {
      if (this.occupied.has(candidate)) return;
      const stop = this.graph.stops[candidate];
      const bearing = Math.atan2(stop.x - origin.x, -(stop.z - origin.z)) / DEG;
      const off = Math.abs(angleDelta(bearing, heading));
      if (off > 55) return;
      const score = off + Math.hypot(stop.x - origin.x, stop.z - origin.z) * 6;
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    });
    if (best >= 0) void this.walkAlong(best, false, null);
  }

  /** Stop walking at the next stop ahead (never turning back). */
  halt() {
    this.stopGuided();
    const motion = this.motion;
    if (!motion) return;
    const ahead = motion.route.find((entry) => entry.at >= motion.s - 0.05)?.stop ?? motion.target;
    void this.walkAlong(ahead, false, null);
  }

  turn(degrees: number) {
    this.targetYaw += degrees;
    this.cancelPan();
    this.needsRender = true;
  }

  setMode(mode: TourMode) {
    if (this.disposed) return;
    this.stopGuided();
    if (mode === 'walk') {
      if (this.mode === 'walk') return;
      if (this.stop < 0) {
        void this.approach();
      } else {
        void this.enterWalkAt(this.stop, this.yaw);
      }
      return;
    }
    this.finishMotion();
    const from = this.currentPose();
    this.mode = mode;
    if (mode === 'floorplan' && this.level === 'all') this.level = this.currentFloor();
    if (mode === 'overview') this.frameOverview(false);
    if (mode === 'dollhouse') this.frameDollhouse();
    if (mode === 'floorplan') this.frameFloorplan();
    this.orbit.target.copy(this.orbitGoal.target);
    Object.assign(this.orbit, {
      azimuth: this.orbitGoal.azimuth,
      elevation: this.orbitGoal.elevation,
      distance: this.orbitGoal.distance,
      fov: this.orbitGoal.fov,
    });
    this.autoOrbit = mode === 'overview' && !this.reducedMotion;
    this.applyScene();
    this.flyTo(from, this.orbitPose(), mode === 'floorplan' ? 1.3 : 1.5, 0, () => undefined);
  }

  setLevel(level: number | 'all') {
    this.level = this.mode === 'floorplan' && level === 'all' ? this.currentFloor() : level;
    if (this.mode === 'floorplan') this.frameFloorplan();
    if (this.mode === 'dollhouse') this.frameDollhouse();
    this.applyScene();
    this.emitState();
    this.needsRender = true;
  }

  /** The guided walkthrough: street, door, every room, stairs, every room. */
  async playGuided() {
    this.stopGuided();
    const token = {};
    this.guidedToken = token;
    this.emitState();
    const live = () => this.guidedToken === token && !this.disposed;
    try {
      if (this.mode !== 'walk') {
        await this.approach();
        if (!live()) return;
        this.guidedToken = token;
      }
      await this.walkToSpace(this.tour.startNode);
      if (!live()) return;
      await this.lookAround(6);
      for (const node of this.guidedOrder()) {
        if (!live()) return;
        if (node.id === this.tour.startNode) continue;
        await this.walkToSpace(node.id);
        if (!live()) return;
        await this.lookAround(5);
      }
      if (live()) {
        this.guidedToken = null;
        this.setMode('dollhouse');
      }
    } finally {
      if (this.guidedToken === token) this.guidedToken = null;
      this.emitState();
    }
  }

  stopGuided() {
    if (!this.guidedToken) return;
    this.guidedToken = null;
    this.cancelPan();
    this.emitState();
  }

  zoomBy(delta: number) {
    if (this.mode === 'walk') {
      this.targetFov = clamp(this.targetFov + delta, MIN_FOV, MAX_FOV);
    } else {
      this.orbitGoal.distance = clamp(this.orbitGoal.distance * (1 + delta / 40), 6, 160);
    }
    this.needsRender = true;
  }

  setAutoRotate(enabled: boolean) {
    this.autoRotate = enabled;
    if (this.mode !== 'walk') this.autoOrbit = enabled;
    this.needsRender = true;
  }

  setMeasuring(enabled: boolean) {
    this.measuring = enabled;
    this.measurePoints = [];
    this.lastMeasureKey = '';
    this.callbacks.onMeasure([], null);
    this.renderer.domElement.style.cursor = enabled ? 'crosshair' : '';
    this.cursor.visible = false;
  }

  clearMeasurement() {
    this.measurePoints = [];
    this.lastMeasureKey = '';
    this.callbacks.onMeasure([], null);
  }

  async enableGyro(): Promise<boolean> {
    const request = (DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    }).requestPermission;
    try {
      if (typeof request === 'function') {
        const state = await request();
        if (state !== 'granted') return false;
      }
    } catch {
      return false;
    }
    window.addEventListener('deviceorientation', this.onDeviceOrientation);
    this.gyroEnabled = true;
    return true;
  }

  disableGyro() {
    window.removeEventListener('deviceorientation', this.onDeviceOrientation);
    this.gyroEnabled = false;
    this.gyro = null;
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.mode === 'floorplan') this.frameFloorplan();
    this.needsRender = true;
  }

  snapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  dispose() {
    this.disposed = true;
    this.guidedToken = null;
    cancelAnimationFrame(this.frame);
    this.unbindEvents();
    this.disableGyro();
    this.motion?.resolve();
    this.flight?.done();
    this.pan?.resolve();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
    this.textures.forEach((slot) => {
      slot.preview?.dispose();
      slot.full?.dispose();
    });
    this.textures.clear();
    this.plates.forEach((plate) => plate.dispose());
    this.environment.dispose();
    this.surfaces.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ------------------------------------------------------------- walking --

  private async enterWalkAt(stopId: number, yaw: number) {
    this.finishMotion();
    const from = this.currentPose();
    const stop = this.graph.stops[stopId];
    this.stop = stopId;
    this.eye.set(stop.x, stop.y + EYE_HEIGHT, stop.z);
    this.yaw = this.targetYaw = yaw;
    this.pitch = this.targetPitch = 0;
    this.fov = this.targetFov = WALK_FOV;
    this.autoOrbit = false;
    const lift = from.position.y > this.eye.y + 6 ? 0 : 2;
    // The scene keeps its current state for the flight and switches to the
    // walk state on touchdown, so an outdoor photo dome is never seen from
    // outside and ceilings don't pop in above a descending camera.
    await new Promise<void>((resolve) =>
      this.flyTo(from, this.walkPose(), this.reducedMotion ? 0.6 : 1.8, lift, () => {
        this.mode = 'walk';
        this.updateSpace(true);
        const outdoor = this.house.outdoor.get(this.space);
        if (outdoor) {
          this.startFade(outdoor.material, null);
          this.applyScene();
        }
        resolve();
      }),
    );
    this.emitState();
  }

  private walkAlong(target: number, faceTravel: boolean, finalYaw: number | null) {
    return new Promise<void>((resolve) => {
      const feet = this.eye.clone().setY(this.eye.y - EYE_HEIGHT);
      let from = this.stop;
      let carried = 0;
      let lead: THREE.Vector3[] = [];
      if (this.motion) {
        // Already walking: carry on to the next stop ahead at the same pace,
        // then re-route from there, so a change of mind never jerks the camera.
        const motion = this.motion;
        const ahead = motion.route.find((entry) => entry.at >= motion.s + 0.05);
        from = ahead ? ahead.stop : motion.target;
        lead = [feet];
        carried = motion.speed;
        this.motion = null;
        motion.resolve();
      }
      const path = findPath(this.graph, from, target, this.occupied);
      if (!path) {
        resolve();
        return;
      }
      // Straighten the route inside each room, cross doorways square through
      // their centre, then run a centripetal spline through what is left.
      const controls: THREE.Vector3[] = [];
      [...lead, ...routeWaypoints(this.tour, this.graph, path).map((p) => new THREE.Vector3(p.x, p.y, p.z))].forEach(
        (point) => {
          if (!controls.length || controls[controls.length - 1].distanceTo(point) > 0.05) controls.push(point);
        },
      );
      if (controls.length < 2) {
        this.stop = target;
        if (finalYaw !== null) this.targetYaw = nearestAngle(finalYaw, this.yaw);
        this.emitState();
        resolve();
        return;
      }
      const curve = new THREE.CatmullRomCurve3(controls, false, 'centripetal', 0.5);
      const length = curve.getLength();
      const points = curve.getSpacedPoints(Math.max(8, Math.ceil(length / 0.05)));
      const cumulative = [0];
      for (let i = 1; i < points.length; i += 1) {
        cumulative.push(cumulative[i - 1] + points[i].distanceTo(points[i - 1]));
      }
      const total = cumulative[cumulative.length - 1];
      // Where each stop of the route falls along the curve, for re-routing.
      let cursor = 0;
      const route = path.map((id) => {
        const stop = this.graph.stops[id];
        let best = cursor;
        let bestDistance = Infinity;
        for (let i = cursor; i < points.length; i += 1) {
          const d = Math.hypot(points[i].x - stop.x, points[i].z - stop.z, points[i].y - stop.y);
          if (d < bestDistance) {
            bestDistance = d;
            best = i;
          }
          if (d > bestDistance + 2) break;
        }
        cursor = best;
        return { stop: id, at: cumulative[best] };
      });
      this.motion = {
        points,
        cumulative,
        total,
        s: 0,
        speed: carried,
        route,
        target,
        faceTravel,
        finalYaw,
        cruise: total > 6 ? 1.9 : 1.55,
        resolve,
      };
      this.cancelPan();
      // Fetch sharp photos for the rooms along the way, nearest first.
      const spaces: string[] = [];
      path.forEach((id) => {
        const space = this.graph.stops[id].space;
        if (!spaces.includes(space)) spaces.push(space);
      });
      this.ensureDetail([...spaces.slice(0, 3), this.graph.stops[target].space]);
      this.emitState();
    });
  }

  private finishMotion() {
    if (!this.motion) return;
    const motion = this.motion;
    this.motion = null;
    const last = this.graph.stops[motion.target];
    this.stop = motion.target;
    this.eye.set(last.x, last.y + EYE_HEIGHT, last.z);
    motion.resolve();
  }

  private lookAround(seconds: number) {
    if (this.reducedMotion) return new Promise<void>((resolve) => setTimeout(resolve, seconds * 400));
    return new Promise<void>((resolve) => {
      this.cancelPan();
      this.pan = { from: this.yaw, to: this.yaw + 150, t: 0, duration: seconds, resolve };
    });
  }

  private cancelPan() {
    if (!this.pan) return;
    const pan = this.pan;
    this.pan = null;
    pan.resolve();
  }

  private guidedOrder(): TourNode[] {
    // Nearest-first within each level, lowest level first, so the tour flows
    // room to room instead of zig-zagging across the house.
    const remaining = captureNodes(this.tour).filter((node) => node.id !== this.tour.startNode);
    const order: TourNode[] = [];
    let from = this.graph.arrival.get(this.tour.startNode) ?? this.graph.porch;
    while (remaining.length) {
      const lowest = Math.min(...remaining.map((node) => node.floor));
      let best = -1;
      let bestLength = Infinity;
      remaining.forEach((node, index) => {
        if (node.floor !== lowest) return;
        const target = this.graph.arrival.get(node.id);
        if (target === undefined) return;
        const path = findPath(this.graph, from, target);
        const length = path ? path.length : Infinity;
        if (length < bestLength) {
          bestLength = length;
          best = index;
        }
      });
      if (best < 0) break;
      const [next] = remaining.splice(best, 1);
      order.push(next);
      from = this.graph.arrival.get(next.id) ?? from;
    }
    return order;
  }

  private yawTowards(fromStop: number, toStop: number) {
    const a = this.graph.stops[fromStop];
    const b = this.graph.stops[toStop];
    return Math.atan2(b.x - a.x, -(b.z - a.z)) / DEG;
  }

  // -------------------------------------------------------------- camera --

  private frameOverview(instant: boolean) {
    const bounds = this.house.bounds;
    const centre = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    this.orbitGoal.target.set(centre.x, Math.max(2.5, size.y * 0.55), centre.z);
    this.orbitGoal.azimuth = 32;
    this.orbitGoal.elevation = 12;
    this.orbitGoal.fov = 40;
    this.orbitGoal.distance = this.fitDistance(Math.max(size.x, size.z) * 1.3, this.orbitGoal.fov) + 8;
    if (instant) {
      this.orbit.target.copy(this.orbitGoal.target);
      Object.assign(this.orbit, {
        azimuth: this.orbitGoal.azimuth,
        elevation: this.orbitGoal.elevation,
        distance: this.orbitGoal.distance,
        fov: this.orbitGoal.fov,
      });
    }
  }

  private frameDollhouse() {
    const level = this.level === 'all' ? undefined : this.level;
    const bounds = floorBounds(this.tour, level);
    const floorY = level ? floorElevation(this.tour, level) : 0;
    this.orbitGoal.target.set(bounds.x + bounds.w / 2, floorY + 1.2, bounds.z + bounds.d / 2);
    this.orbitGoal.azimuth = this.mode === 'dollhouse' && this.orbit.elevation > 30 ? this.orbit.azimuth : 28;
    this.orbitGoal.elevation = 42;
    this.orbitGoal.fov = 40;
    this.orbitGoal.distance = this.fitDistance(Math.max(bounds.w, bounds.d) * 1.1, 40) + 4;
  }

  private frameFloorplan() {
    const level = typeof this.level === 'number' ? this.level : this.currentFloor();
    const bounds = floorBounds(this.tour, level);
    const floorY = floorElevation(this.tour, level);
    this.orbitGoal.target.set(bounds.x + bounds.w / 2, floorY, bounds.z + bounds.d / 2);
    this.orbitGoal.azimuth = 0;
    this.orbitGoal.elevation = 89.5;
    this.orbitGoal.fov = 30;
    const aspect = this.camera.aspect || 1.6;
    const needed = Math.max(bounds.d, bounds.w / aspect) * 1.18;
    this.orbitGoal.distance = needed / (2 * Math.tan((this.orbitGoal.fov / 2) * DEG));
  }

  private fitDistance(span: number, fov: number) {
    const aspect = Math.max(0.6, this.camera?.aspect || 1.6);
    const vertical = span / Math.min(aspect, 1.8);
    return Math.max(span, vertical) / (2 * Math.tan((fov / 2) * DEG));
  }

  private orbitPose(): Pose {
    const o = this.orbit;
    const el = o.elevation * DEG;
    const az = o.azimuth * DEG;
    const position = new THREE.Vector3(
      o.target.x + Math.sin(az) * Math.cos(el) * o.distance,
      o.target.y + Math.sin(el) * o.distance,
      o.target.z + Math.cos(az) * Math.cos(el) * o.distance,
    );
    // Matrix4.lookAt uses the camera convention (looking down -Z); a plain
    // Object3D.lookAt would point +Z at the house and face the other way.
    const rotation = new THREE.Matrix4().lookAt(position, o.target, UP);
    return { position, quaternion: new THREE.Quaternion().setFromRotationMatrix(rotation), fov: o.fov };
  }

  private walkPose(): Pose {
    return {
      position: this.eye.clone(),
      quaternion: new THREE.Quaternion().setFromEuler(
        new THREE.Euler(this.pitch * DEG, -this.yaw * DEG, 0, 'YXZ'),
      ),
      fov: this.fov,
    };
  }

  private currentPose(): Pose {
    return {
      position: this.camera.position.clone(),
      quaternion: this.camera.quaternion.clone(),
      fov: this.camera.fov,
    };
  }

  private flyTo(from: Pose, to: Pose, duration: number, lift: number, done: () => void) {
    this.flight?.done();
    this.flight = { from, to, t: 0, duration: Math.max(0.2, duration), lift, done };
    this.cursor.visible = false;
    this.emitState();
  }

  private applyCamera() {
    const pose = this.mode === 'walk' ? this.walkPose() : this.orbitPose();
    this.camera.position.copy(pose.position);
    this.camera.quaternion.copy(pose.quaternion);
    if (this.camera.fov !== pose.fov) {
      this.camera.fov = pose.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  // ------------------------------------------------------------ the loop --

  private loop = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, this.clock.getDelta());
    let active = this.needsRender;
    this.needsRender = false;

    if (this.flight) {
      active = true;
      const f = this.flight;
      f.t = Math.min(1, f.t + dt / f.duration);
      const e = easeInOutCubic(f.t);
      this.camera.position.lerpVectors(f.from.position, f.to.position, e);
      this.camera.position.y += Math.sin(e * Math.PI) * f.lift;
      this.camera.quaternion.slerpQuaternions(f.from.quaternion, f.to.quaternion, e);
      this.camera.fov = f.from.fov + (f.to.fov - f.from.fov) * e;
      this.camera.updateProjectionMatrix();
      if (f.t >= 1) {
        this.flight = null;
        f.done();
        this.emitState();
      }
    } else if (this.mode === 'walk') {
      active = this.updateWalk(dt) || active;
      this.applyCamera();
    } else {
      active = this.updateOrbit(dt) || active;
      this.applyCamera();
    }

    if (this.mode === 'walk' && !this.flight) this.updateSpace(false);
    active = this.updateFade(dt) || active;
    active = this.updateBlends(dt) || active;
    active = this.updateDoors(dt) || active;
    active = this.updateDoorways(dt) || active;
    this.updateMarkers();

    if (active || this.measurePoints.length) {
      this.emitOverlay();
      this.emitMeasure();
      this.emitPose();
      this.renderer.render(this.scene, this.camera);
    }
  };

  private updateWalk(dt: number) {
    let active = false;
    const turnRate = 90 * dt;
    if (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A')) {
      this.targetYaw -= turnRate;
      active = true;
    }
    if (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D')) {
      this.targetYaw += turnRate;
      active = true;
    }
    if (this.gyroEnabled && this.gyro && !this.pointers.size) {
      this.targetYaw = -this.gyro.alpha;
      this.targetPitch = clamp(this.gyro.beta - 90, -MAX_PITCH, MAX_PITCH);
    }
    if (this.autoRotate && !this.motion && !this.pointers.size) this.targetYaw += 5 * dt;
    // Holding forward or back keeps walking, one stop after another.
    if (!this.motion && !this.flight) {
      if (this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has('W')) this.step(1);
      else if (this.keys.has('ArrowDown') || this.keys.has('s') || this.keys.has('S')) this.step(-1);
    }

    if (this.pan) {
      const pan = this.pan;
      pan.t = Math.min(1, pan.t + dt / pan.duration);
      this.targetYaw = pan.from + (pan.to - pan.from) * easeInOutSine(pan.t);
      if (pan.t >= 1) {
        this.pan = null;
        pan.resolve();
      }
      active = true;
    }

    let turning = false;
    if (this.motion) {
      active = true;
      const m = this.motion;
      const remaining = m.total - m.s;
      // Ease up to walking pace, and brake early enough to stop on the mark.
      const brake = Math.sqrt(2 * 1.1 * Math.max(0, remaining));
      const desired = Math.min(m.cruise, brake);
      m.speed += (desired - m.speed) * (1 - Math.exp(-dt * 3.4));
      if (m.speed > brake) m.speed = brake;
      m.speed = Math.max(m.speed, remaining > 1e-3 ? 0.06 : 0);
      m.s = Math.min(m.total, m.s + m.speed * dt);
      const feet = samplePath(m.points, m.cumulative, m.s);
      this.eye.set(feet.x, feet.y + EYE_HEIGHT, feet.z);

      const lookAhead = Math.max(1.3, m.speed * 1.2);
      const ahead = samplePath(m.points, m.cumulative, Math.min(m.total, m.s + lookAhead));
      const dx = ahead.x - feet.x;
      const dz = ahead.z - feet.z;
      if (m.faceTravel && Math.hypot(dx, dz) > 0.2) {
        this.targetYaw = nearestAngle(Math.atan2(dx, -dz) / DEG, this.yaw);
        turning = true;
      }
      if (m.finalYaw !== null && remaining < 1.8) {
        const w = easeInOutSine(1 - remaining / 1.8);
        const final = nearestAngle(m.finalYaw, this.yaw);
        this.targetYaw = this.targetYaw + angleDelta(final, this.targetYaw) * w;
        turning = true;
      }
      const slope = Math.atan2(ahead.y - feet.y, Math.max(0.3, Math.hypot(dx, dz))) / DEG;
      if (m.faceTravel) this.targetPitch = clamp(slope * 0.5, -20, 20);

      if (m.s >= m.total - 1e-3) {
        this.motion = null;
        this.stop = m.target;
        const last = this.graph.stops[m.target];
        this.eye.set(last.x, last.y + EYE_HEIGHT, last.z);
        if (m.faceTravel) this.targetPitch = 0;
        m.resolve();
        this.emitState();
        this.ensureDetail(this.neighbourSpaces(this.space));
      }
    }

    // While walking the head turns like a critically damped spring — no lag
    // at the start of a turn, no overshoot at the end.
    const dy = angleDelta(this.targetYaw, this.yaw);
    if (turning || this.motion) {
      const omega = 5;
      this.yawSpeed += (omega * omega * dy - 2 * omega * this.yawSpeed) * dt;
      this.yaw += this.yawSpeed * dt;
    } else {
      this.yawSpeed = 0;
      this.yaw += (this.targetYaw - this.yaw) * (1 - Math.exp(-dt * 9));
    }
    const ease = 1 - Math.exp(-dt * (this.motion ? 5 : 9));
    const dp = this.targetPitch - this.pitch;
    const df = this.targetFov - this.fov;
    this.pitch += dp * ease;
    this.fov += df * ease;
    if (Math.abs(dy) > 0.01 || Math.abs(dp) > 0.01 || Math.abs(df) > 0.01) active = true;
    return active;
  }

  private updateOrbit(dt: number) {
    let active = false;
    if (this.autoOrbit && !this.pointers.size) {
      this.orbitGoal.azimuth += 4 * dt;
      active = true;
    }
    if (this.keys.has('ArrowLeft')) {
      this.orbitGoal.azimuth -= 60 * dt;
      active = true;
    }
    if (this.keys.has('ArrowRight')) {
      this.orbitGoal.azimuth += 60 * dt;
      active = true;
    }
    const ease = 1 - Math.exp(-dt * 7);
    const o = this.orbit;
    const g = this.orbitGoal;
    const before = o.azimuth + o.elevation + o.distance + o.fov + o.target.x + o.target.z;
    o.azimuth += (g.azimuth - o.azimuth) * ease;
    o.elevation += (g.elevation - o.elevation) * ease;
    o.distance += (g.distance - o.distance) * ease;
    o.fov += (g.fov - o.fov) * ease;
    o.target.lerp(g.target, ease);
    const after = o.azimuth + o.elevation + o.distance + o.fov + o.target.x + o.target.z;
    return active || Math.abs(after - before) > 1e-3;
  }

  // ------------------------------------------------------- scene states --

  /** Which space the camera is in, and the scene state that follows from it. */
  private updateSpace(force: boolean) {
    const feetY = this.eye.y - EYE_HEIGHT;
    const floor = floorAtElevation(this.tour, feetY);
    const space = spaceAt(this.tour, this.eye.x, this.eye.z, floor);
    if (!force && space === this.space) return;
    const previous = this.space;
    this.space = space;

    const next = this.house.outdoor.get(space);
    const wasOutdoor = this.house.outdoor.has(previous);
    if (next && wasOutdoor && !force) this.startFade(next.material, previous);
    else if (next && previous === OUTSIDE && !force) this.startFade(next.material, null);

    this.applyScene();
    this.ensureDetail(this.neighbourSpaces(space));
    const node = nodeById(this.tour, space);
    if (node && hasPano(node)) this.callbacks.onVisit(space);
    this.markerKey = '';
    this.emitState();
  }

  private applyScene() {
    const walk = this.mode === 'walk';
    const cutaway = this.mode === 'dollhouse' || this.mode === 'floorplan';
    const outdoorHere = walk ? this.house.outdoor.get(this.space) : undefined;
    // A fade brings a photo dome in over whatever was there before: the
    // previous dome, or the modelled world when arriving from the garden or
    // from the dollhouse.
    const blendingIn = Boolean(this.fade && outdoorHere && this.fade.material === outdoorHere.material);
    const previousDome =
      blendingIn && this.fade?.previous ? this.house.outdoor.get(this.fade.previous) : undefined;
    const shown = (floor: number) => {
      if (!cutaway || this.level === 'all') return true;
      return this.mode === 'floorplan' ? floor === this.level : floor <= this.level;
    };

    // Grounds, sky and landscape: hidden while standing inside a photo dome.
    // The floor plan sits on a plain ground; the dollhouse drops the trees.
    const outdoorWorld = !outdoorHere || (blendingIn && !previousDome);
    const plan = this.mode === 'floorplan';
    this.environment.group.visible = outdoorWorld && !plan;
    this.environment.planting.visible = outdoorWorld && !cutaway;
    this.scene.background = !outdoorWorld ? null : plan ? PLAN_BACKGROUND : this.environment.background;
    this.house.grounds.visible = outdoorWorld && !plan;
    this.house.outdoor.forEach((space) => {
      space.deck.visible = !cutaway;
    });

    // The shell: modelled outside, re-textured with the photo while on a deck
    // so the photographed facade and the modelled house agree.
    const shellSource = blendingIn ? previousDome : outdoorHere;
    this.house.shell.visible = !cutaway;
    this.house.shell.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      mesh.material = shellSource ? shellSource.shellMaterial : (mesh.userData.cgMaterial as THREE.Material);
    });

    this.house.rooms.forEach((room) => {
      room.group.visible = shown(room.node.floor);
      room.ceiling.visible = !cutaway;
    });
    this.house.stairs.forEach((stair) => {
      stair.group.visible = shown(stair.lower.floor) || shown(stair.upper.floor);
      stair.ceiling.forEach((part) => {
        part.visible = !cutaway;
      });
    });
    this.house.casings.children.forEach((group) => {
      group.visible = shown(group.userData.floor as number);
    });

    // Photo domes and the portals they are seen through.
    this.house.outdoor.forEach((space) => {
      space.patch.visible = cutaway && shown(space.node.floor);
      space.dome.visible = false;
      space.material.uniforms.ownCount.value = 0;
      space.material.uniforms.excludeOn.value = 1;
      space.material.depthTest = true;
      space.material.transparent = false;
      space.material.uniforms.opacity.value = 1;
      space.dome.renderOrder = 0;
    });
    // Reconstructed shapes: seen from inside while walking (both faces, so a
    // chair has a back), from outside in the other views (front faces only, so
    // the dollhouse sees into rooms rather than onto their backs).
    this.depth.forEach((build) => {
      build.material.side = walk ? THREE.DoubleSide : THREE.FrontSide;
      build.material.transparent = false;
      build.material.depthTest = true;
      build.body.renderOrder = 0;
      if (build.ceiling) build.ceiling.visible = !cutaway;
    });

    let portalCount = 0;
    if (walk && !outdoorHere) {
      const seen = new Map<string, DoorGeometry[]>();
      const near = this.nearSpaces(this.space);
      this.house.doors.forEach((door) => {
        const { a, b } = door.door;
        const outdoorSide = this.house.outdoor.has(a) ? a : this.house.outdoor.has(b) ? b : null;
        if (!outdoorSide) return;
        const other = outdoorSide === a ? b : a;
        if (this.house.outdoor.has(other)) return;
        if (!near.has(other)) return;
        seen.set(outdoorSide, [...(seen.get(outdoorSide) ?? []), door]);
      });
      seen.forEach((doors, id) => {
        const space = this.house.outdoor.get(id)!;
        space.dome.visible = true;
        const uniforms = space.material.uniforms;
        uniforms.ownCount.value = Math.min(2, doors.length);
        doors.slice(0, 2).forEach((door, i) => {
          writePortal(door, uniforms.ownA.value[i], uniforms.ownB.value[i]);
        });
        doors.forEach((door) => {
          if (portalCount >= MAX_PORTALS) return;
          writePortal(door, this.portals.uPortalA.value[portalCount], this.portals.uPortalB.value[portalCount]);
          portalCount += 1;
        });
      });
    }
    this.portals.uPortalCount.value = portalCount;

    if (outdoorHere) {
      outdoorHere.dome.visible = true;
      outdoorHere.material.uniforms.excludeOn.value = 0;
    }
    if (previousDome) {
      previousDome.dome.visible = true;
      previousDome.material.uniforms.excludeOn.value = 0;
    }
    if (blendingIn && outdoorHere && this.fade) {
      const material = outdoorHere.material;
      material.transparent = true;
      material.depthTest = false;
      material.uniforms.opacity.value = easeInOutSine(this.fade.t);
      outdoorHere.dome.renderOrder = 10;
    }
    // An open-air space's reconstructed shape travels with its dome; while a
    // dome is still fading in, the flat dome alone carries the blend.
    this.house.outdoor.forEach((space, id) => {
      const build = this.depth.get(id);
      if (build) build.body.visible = space.dome.visible && !(blendingIn && space === outdoorHere);
    });

    // Floor cut for the dollhouse and floor plan.
    if (cutaway && this.level !== 'all') {
      this.cutPlane.constant = floorElevation(this.tour, this.level + 1) - 0.08;
    } else if (this.mode === 'floorplan') {
      this.cutPlane.constant = floorElevation(this.tour, this.currentFloor() + 1) - 0.08;
    } else {
      this.cutPlane.constant = 1e4;
    }

    this.markers.visible = walk && !this.measuring;
    this.markerFill.visible = this.markers.visible;
    this.needsRender = true;
  }

  /** The current space, the enclosed spaces one door away, and itself. */
  private nearSpaces(space: string) {
    const near = new Set<string>([space]);
    this.house.doors.forEach((door) => {
      const { a, b } = door.door;
      if (a === space && !this.house.outdoor.has(b)) near.add(b);
      if (b === space && !this.house.outdoor.has(a)) near.add(a);
    });
    const stair = stairFor(this.tour, space);
    if (stair) {
      near.add(stair.from);
      near.add(stair.to);
    }
    return near;
  }

  private neighbourSpaces(space: string) {
    const out = new Set<string>([space]);
    this.house.doors.forEach((door) => {
      if (door.door.a === space) out.add(door.door.b);
      if (door.door.b === space) out.add(door.door.a);
    });
    return [...out];
  }

  private startFade(material: ProjectionMaterial, previous: string | null) {
    this.fade = { material, t: 0, previous };
  }

  private updateFade(dt: number) {
    if (!this.fade) return false;
    this.fade.t = Math.min(1, this.fade.t + dt / (this.reducedMotion ? 0.2 : 0.65));
    const done = this.fade.t >= 1;
    if (done) this.fade = null;
    this.applyScene();
    return true;
  }

  private updateBlends(dt: number) {
    if (!this.blending.size) return false;
    this.blending.forEach((uniforms) => {
      uniforms.blend.value = Math.min(1, uniforms.blend.value + dt / 0.45);
      if (uniforms.blend.value >= 1) {
        uniforms.mapPrevious.value = null;
        this.blending.delete(uniforms);
      }
    });
    return true;
  }

  private updateDoors(dt: number) {
    if (!this.house.leaves.length) return false;
    const door = this.house.leaves[0].door;
    const centre = door.axis === 'x'
      ? new THREE.Vector3(door.plane, door.bottom, door.along)
      : new THREE.Vector3(door.along, door.bottom, door.plane);
    const near =
      this.mode === 'walk' &&
      (this.space !== OUTSIDE || this.eye.distanceTo(centre.setY(this.eye.y)) < 5.5);
    const goal = near || this.mode === 'dollhouse' || this.mode === 'floorplan' ? 1 : 0;
    const before = this.doorOpen;
    this.doorOpen += (goal - this.doorOpen) * (1 - Math.exp(-dt * 3.2));
    if (Math.abs(this.doorOpen - before) < 1e-4) return false;
    this.house.leaves.forEach((leaf) => {
      leaf.pivot.rotation.y = leaf.openAngle * easeInOutSine(this.doorOpen);
    });
    return true;
  }

  /**
   * The photographs do not agree with the plan about every doorway: a photo
   * may show a bookcase where the plan opens into the kitchen. So each room
   * keeps its own photo in front of a doorway (the door patch) while the
   * visitor is anywhere near where it was taken, and only opens it onto the
   * next room as they walk up to the door; the doorway's modelled frame fades
   * in as the patch fades out. From the capture point every room is exactly
   * its photograph.
   */
  private updateDoorways(dt: number) {
    const walk = this.mode === 'walk';
    const eye = this.camera.position;
    // Arriving from another view (the dollhouse, the street) doorways start
    // in their resting state rather than fading in after the landing.
    const snap = this.mode !== this.doorwaysMode;
    this.doorwaysMode = this.mode;
    const rate = snap ? 1 : 1 - Math.exp(-dt * (this.reducedMotion ? 30 : 9));
    let changed = false;
    const ease = (current: number, goal: number) => {
      const next = Math.abs(goal - current) < 0.003 ? goal : current + (goal - current) * rate;
      if (next !== current) changed = true;
      return next;
    };
    const frameGoal = new Map<DoorFrame['door'], number>();
    this.depth.forEach((build, id) => {
      const dome = this.house.outdoor.get(id)?.dome;
      // Detailed near where the photo was taken, smoothed seen from afar.
      const node = nodeById(this.tour, id);
      if (node) {
        const capture = captureOf(node);
        const away = Math.hypot(
          eye.x - capture.x,
          eye.y - floorElevation(this.tour, node.floor) - EYE_HEIGHT,
          eye.z - capture.z,
        );
        const melt = THREE.MathUtils.smoothstep(away, MELT_FROM, MELT_TO);
        const uniforms = build.material.uniforms;
        if (Math.abs(uniforms.depthFar.value - melt) > 0.002) {
          uniforms.depthFar.value = melt;
          changed = true;
        }
        const fill = uniforms.fillMap.value ? THREE.MathUtils.smoothstep(away, 0.05, 0.7) : 0;
        if (Math.abs(uniforms.fillOn.value - fill) > 0.002) {
          uniforms.fillOn.value = fill;
          changed = true;
        }
      }
      build.doors.forEach((patch) => {
        const open = walk ? doorwayOpening(eye, patch) : 1;
        // A frame only waits on the photo of the room the visitor is in (or
        // looking into), never on one behind the door they are facing.
        const door = patch.door;
        const centre = doorCentre(door);
        const facing = (eye.x - centre.x) * door.normalA.x + (eye.z - centre.z) * door.normalA.z;
        const onSide = door.door.a === id ? facing > 0 : facing < 0;
        if (walk && onSide) frameGoal.set(door, Math.min(frameGoal.get(door) ?? 1, open));
        // Never a veil across the lens: right at the door the patch is gone.
        const atDoor = Math.hypot(eye.x - centre.x, eye.z - centre.z) < 0.7;
        if (atDoor && walk) {
          if (patch.shown !== 0) changed = true;
          patch.shown = 0;
        } else {
          patch.shown = ease(patch.shown, walk ? 1 - open : 0);
        }
        showPatch(patch);
        // An open-air space's patch lives and dies with its dome.
        if (dome && !dome.visible) patch.mesh.visible = false;
      });
    });
    this.house.frames.forEach((frame) => {
      frame.shown = ease(frame.shown, frameGoal.get(frame.door) ?? 1);
      showFrame(frame);
    });
    return changed;
  }

  private updateMarkers() {
    if (!this.markers.visible) return;
    const key = `${this.stop}:${this.space}:${this.hoverStop}:${this.motion ? this.motion.target : -1}`;
    if (key === this.markerKey) return;
    this.markerKey = key;
    const feet = this.eye.y - EYE_HEIGHT;
    const dummy = new THREE.Object3D();
    const white = new THREE.Color('#ffffff');
    const gold = new THREE.Color('#e3c887');
    let count = 0;
    const origin = this.motion ? this.graph.stops[this.motion.target] : this.graph.stops[this.stop];
    this.graph.stops.forEach((stop) => {
      if (stop.id === this.stop && !this.motion) return;
      if (this.occupied.has(stop.id)) return;
      if (origin && Math.hypot(stop.x - origin.x, stop.z - origin.z) > 12) return;
      if (Math.abs(stop.y - feet) > 2.2) return;
      let y = stop.y;
      if (stop.kind === 'tread') {
        const stair = this.house.stairs.find(
          (candidate) => candidate.lower.id === stop.space || candidate.upper.id === stop.space,
        );
        y = stair?.treadTop(stop.x, stop.z) ?? y;
      }
      dummy.position.set(stop.x, y + (stop.space === OUTSIDE ? 0.03 : 0.012), stop.z);
      dummy.updateMatrix();
      this.markers.setMatrixAt(count, dummy.matrix);
      this.markerFill.setMatrixAt(count, dummy.matrix);
      this.markers.setColorAt(count, stop.id === this.hoverStop ? gold : white);
      count += 1;
    });
    this.markers.count = count;
    this.markerFill.count = count;
    this.markers.instanceMatrix.needsUpdate = true;
    this.markerFill.instanceMatrix.needsUpdate = true;
    if (this.markers.instanceColor) this.markers.instanceColor.needsUpdate = true;
    this.needsRender = true;
  }

  // ------------------------------------------------------------ textures --

  /**
   * Each photo's reconstructed depth (see scripts/build-depth.ts) turns into a
   * displaced mesh in front of its room box. A photo without a depth map keeps
   * the box alone, so new captures work before they have been processed.
   */
  private loadDepthMaps() {
    const segments = this.fullLimit <= 2 ? 192 : 288;
    captureNodes(this.tour).forEach((node) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (this.disposed) return;
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const host = this.house.rooms.get(node.id) ?? this.house.outdoor.get(node.id);
        if (!host) return;
        const build = buildDepthMesh(
          this.tour,
          node,
          { data: pixels.data, width: pixels.width, height: pixels.height, stride: 4 },
          this.house.doors,
          host.material,
          segments,
        );
        const room = this.house.rooms.get(node.id);
        if (room) {
          build.doors.forEach((patch) => room.group.add(patch.mesh));
          room.group.add(build.body);
          if (build.ceiling) room.group.add(build.ceiling);
        } else {
          build.doors.forEach((patch) => this.world.add(patch.mesh));
          this.world.add(build.body);
        }
        this.depth.set(node.id, build);
        this.attachPlate(node);
        this.placeInfoPoints(node);
        this.markOccupied(node, build);
        this.applyScene();
      };
      image.src = `/panoramas/${node.pano}-depth.png`;
    });
  }

  /**
   * A room's background plate (see buildBackgroundPlate) needs both its depth
   * map and its photo, whichever arrives last. The room box behind the
   * reconstruction shows it where stepping aside uncovers what the camera
   * never saw. Out of doors that would be the sky, so domes keep the photo.
   */
  private attachPlate(node: TourNode) {
    const room = this.house.rooms.get(node.id);
    const build = this.depth.get(node.id);
    const photo = node.pano ? this.textures.get(node.pano)?.preview?.image : undefined;
    if (!room || !build || !photo || this.plates.has(node.id)) return;
    const plate = buildBackgroundPlate(build.mask, photo as CanvasImageSource);
    if (!plate) return;
    this.plates.set(node.id, plate);
    room.material.uniforms.fillMap.value = plate;
    this.needsRender = true;
  }

  /** Lattice stops whose floor spot is taken by furniture in the photo. */
  private markOccupied(node: TourNode, build: DepthMeshBuild) {
    if (spaceKind(node) !== 'room') return;
    const floorY = floorElevation(this.tour, node.floor);
    const capture = captureOf(node);
    const eye = new THREE.Vector3(capture.x, floorY + EYE_HEIGHT, capture.z);
    this.graph.stops.forEach((stop) => {
      if (stop.space !== node.id || stop.kind !== 'grid') return;
      const dir = new THREE.Vector3(stop.x - eye.x, floorY - eye.y, stop.z - eye.z);
      const distance = dir.length();
      dir.normalize();
      const hit = proxyDistance(this.tour, node, dir) * build.ratioAt(dir);
      if (hit > distance - 0.35) return;
      const point = eye.clone().addScaledVector(dir, hit);
      if (Math.hypot(point.x - stop.x, point.z - stop.z) < 1.0 && point.y - floorY < 1.3) {
        this.occupied.add(stop.id);
      }
    });
    this.markerKey = '';
  }

  private loadPreviews() {
    const nodes = captureNodes(this.tour);
    let loaded = 0;
    this.callbacks.onProgress(0);
    nodes.forEach((node) => {
      this.load(`/panoramas/${node.pano}-preview.jpg`)
        .then((texture) => {
          if (this.disposed) {
            texture.dispose();
            return;
          }
          const slot = this.slot(node.pano);
          slot.preview = texture;
          if (!slot.full) this.assign(node.pano, texture);
          captureNodes(this.tour)
            .filter((other) => other.pano === node.pano)
            .forEach((other) => this.attachPlate(other));
        })
        .catch(() => undefined)
        .finally(() => {
          loaded += 1;
          this.callbacks.onProgress(loaded / nodes.length);
          this.needsRender = true;
        });
    });
  }

  /** Full-resolution photos for the spaces around the visitor, a few at a time. */
  private ensureDetail(spaces: string[]) {
    const wanted = spaces
      .map((id) => nodeById(this.tour, id))
      .filter((node): node is TourNode & { pano: string } => Boolean(node && hasPano(node)))
      .map((node) => node.pano);
    wanted.forEach((pano) => {
      const slot = this.slot(pano);
      this.fullOrder = [pano, ...this.fullOrder.filter((p) => p !== pano)];
      if (slot.full || slot.loadingFull) return;
      slot.loadingFull = true;
      this.load(`/panoramas/${pano}.jpg`)
        .then((texture) => {
          slot.loadingFull = false;
          if (this.disposed || !this.fullOrder.includes(pano)) {
            texture.dispose();
            return;
          }
          slot.full = texture;
          this.assign(pano, texture);
          this.needsRender = true;
        })
        .catch(() => {
          slot.loadingFull = false;
        });
    });
    // Evict the least recently wanted full-size photos beyond the budget.
    const keep = new Set([...wanted, ...this.fullOrder.slice(0, this.fullLimit)]);
    this.fullOrder = this.fullOrder.filter((pano) => keep.has(pano));
    this.textures.forEach((slot, pano) => {
      if (keep.has(pano) || !slot.full) return;
      const full = slot.full;
      slot.full = undefined;
      if (slot.preview) this.assign(pano, slot.preview, false);
      full.dispose();
    });
  }

  private slot(pano: string) {
    let slot = this.textures.get(pano);
    if (!slot) {
      slot = {};
      this.textures.set(pano, slot);
    }
    return slot;
  }

  private assign(pano: string, texture: THREE.Texture, fade = true) {
    const hosts: ProjectionMaterialHost[] = [];
    this.house.rooms.forEach((room) => {
      if (room.node.pano === pano) hosts.push(room);
    });
    this.house.outdoor.forEach((space) => {
      if (space.node.pano === pano) hosts.push(space);
    });
    hosts.forEach((host) => {
      const uniforms = host.material.uniforms;
      const previous = uniforms.map.value;
      uniforms.map.value = texture;
      uniforms.hasMap.value = 1;
      if (fade && previous && previous !== texture && !this.reducedMotion) {
        uniforms.mapPrevious.value = previous;
        uniforms.blend.value = 0;
        this.blending.add(uniforms);
      } else {
        uniforms.mapPrevious.value = null;
        uniforms.blend.value = 1;
        this.blending.delete(uniforms);
      }
    });
  }

  private load(url: string) {
    return new Promise<THREE.Texture>((resolve, reject) => {
      this.loader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
          resolve(texture);
        },
        undefined,
        reject,
      );
    });
  }

  // ------------------------------------------------------------ overlays --

  /**
   * Where each info marker sits: along its view ray from the capture point, on
   * the reconstructed surface when the depth map is in (so a marker about the
   * hearth sits on the hearth), otherwise just in front of the room box.
   */
  private placeInfoPoints(node: TourNode) {
    if (!hasPano(node) || !node.hotspots?.length) return;
    const y = floorElevation(this.tour, node.floor);
    const capture = captureOf(node);
    const eye = new THREE.Vector3(capture.x, y + EYE_HEIGHT, capture.z);
    const depth = this.depth.get(node.id);
    const points = node.hotspots.map((hotspot) => {
      const yaw = (hotspot.yaw + (node.heading ?? 0)) * DEG;
      const pitch = hotspot.pitch * DEG;
      const dir = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch),
      );
      const ratio = depth ? depth.ratioAt(dir) : 1;
      const limit = spaceKind(node) === 'room' ? Infinity : 8;
      const distance = clamp(proxyDistance(this.tour, node, dir) * ratio * 0.95, 0.8, limit);
      return {
        point: eye.clone().addScaledVector(dir, distance),
        label: hotspot.label,
        body: hotspot.body ?? '',
      };
    });
    this.infoPoints.set(node.id, points);
  }

  private emitOverlay() {
    const items: OverlayItem[] = [];
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const project = (point: THREE.Vector3) => {
      const toPoint = point.clone().sub(this.camera.position);
      const distance = toPoint.length();
      if (toPoint.normalize().dot(forward) < 0.15) return null;
      const screen = point.clone().project(this.camera);
      const x = (screen.x * 0.5 + 0.5) * width;
      const y = (-screen.y * 0.5 + 0.5) * height;
      if (x < -40 || x > width + 40 || y < -40 || y > height + 40) return null;
      return { x, y, distance };
    };

    if (this.mode === 'walk' && !this.flight) {
      this.house.doors.forEach((door) => {
        const { a, b } = door.door;
        if (a !== this.space && b !== this.space) return;
        const other = a === this.space ? b : a;
        const centre = door.axis === 'x'
          ? new THREE.Vector3(door.plane, door.bottom + Math.min(1.4, door.height * 0.62), door.along)
          : new THREE.Vector3(door.along, door.bottom + Math.min(1.4, door.height * 0.62), door.plane);
        const across = Math.abs((door.axis === 'x' ? this.eye.x : this.eye.z) - door.plane);
        if (across < 0.9) return;
        const hit = project(centre);
        if (!hit) return;
        const target = other === OUTSIDE ? OUTSIDE : other;
        const label = other === OUTSIDE ? 'Front garden' : nodeById(this.tour, other)?.name ?? other;
        const hint = other === OUTSIDE
          ? 'Step outside'
          : this.space === OUTSIDE
            ? 'Step inside'
            : door.door.style === 'glass' || this.house.outdoor.has(other)
              ? 'Step out'
              : 'Walk through';
        items.push({
          kind: 'door',
          key: `door-${door.index}`,
          x: hit.x,
          y: hit.y,
          label,
          target,
          hint,
          scale: clamp(3 / Math.max(1, hit.distance), 0.7, 1.1),
        });
      });

      const stair = stairFor(this.tour, this.space);
      if (stair && this.stop >= 0) {
        const goingUp = this.space === stair.from;
        const anchorStop = this.graph.arrival.get(goingUp ? stair.from : stair.to);
        const other = nodeById(this.tour, goingUp ? stair.to : stair.from);
        if (anchorStop !== undefined && other && anchorStop !== this.stop) {
          const s = this.graph.stops[anchorStop];
          const hit = project(new THREE.Vector3(s.x, s.y + 1.3, s.z));
          if (hit) {
            items.push({
              kind: 'door',
              key: `stair-${stair.from}`,
              x: hit.x,
              y: hit.y,
              label: other.name,
              target: other.id,
              hint: goingUp ? 'Upstairs' : 'Downstairs',
              scale: clamp(3 / Math.max(1, hit.distance), 0.7, 1.1),
            });
          }
        }
      }

      (this.infoPoints.get(this.space) ?? []).forEach((info, index) => {
        const hit = project(info.point);
        if (!hit) return;
        items.push({
          kind: 'info',
          key: `info-${this.space}-${index}`,
          x: hit.x,
          y: hit.y,
          label: info.label,
          body: info.body,
          scale: clamp(2.5 / Math.max(1, hit.distance), 0.75, 1.05),
        });
      });
    }

    if ((this.mode === 'dollhouse' || this.mode === 'floorplan') && !this.flight) {
      this.tour.nodes.forEach((node) => {
        if (spaceKind(node) === 'stair' && node.floor > 1) return;
        const visible =
          this.level === 'all' ||
          (this.mode === 'floorplan' ? node.floor === this.level : node.floor <= this.level);
        if (!visible) return;
        const y = floorElevation(this.tour, node.floor);
        const c = captureOf(node);
        const hit = project(new THREE.Vector3(c.x, y + 0.4, c.z));
        if (!hit) return;
        items.push({
          kind: 'room',
          key: `room-${node.id}`,
          x: hit.x,
          y: hit.y,
          label: node.name,
          target: node.id,
          active: node.id === this.space,
        });
      });
    }

    if (this.mode === 'overview' && !this.flight) {
      const entrance = this.house.doors.find((door) => door.door.b === OUTSIDE || door.door.a === OUTSIDE);
      if (entrance) {
        const anchor = entrance.axis === 'x'
          ? new THREE.Vector3(entrance.plane, entrance.bottom + entrance.height + 1.2, entrance.along)
          : new THREE.Vector3(entrance.along, entrance.bottom + entrance.height + 1.2, entrance.plane);
        const hit = project(anchor);
        if (hit) items.push({ kind: 'entrance', key: 'entrance', x: hit.x, y: hit.y, label: 'Entrance' });
      }
    }

    const key = items.map((item) => `${item.key}:${Math.round(item.x)}:${Math.round(item.y)}`).join('|');
    if (key === this.lastOverlayKey) return;
    this.lastOverlayKey = key;
    this.callbacks.onOverlay(items);
  }

  private emitState() {
    const state = this.getState();
    const key = JSON.stringify(state);
    if (key === this.lastStateKey) return;
    this.lastStateKey = key;
    this.callbacks.onState(state);
  }

  private emitPose() {
    const now = performance.now();
    if (now - this.lastPoseAt < 60) return;
    this.lastPoseAt = now;
    const source = this.mode === 'walk' || this.stop >= 0 ? this.eye : this.orbit.target;
    this.callbacks.onPose({
      x: source.x,
      z: source.z,
      yaw: this.mode === 'walk' ? this.yaw : this.orbit.azimuth + 180,
      floor: this.currentFloor(),
    });
  }

  private emitMeasure() {
    if (!this.measurePoints.length) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const screen = this.measurePoints.map((point) => {
      const p = point.clone().project(this.camera);
      return { x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height };
    });
    const metres = this.measurePoints.length === 2 ? this.measurePoints[0].distanceTo(this.measurePoints[1]) : null;
    const key = screen.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join('|') + metres;
    if (key === this.lastMeasureKey) return;
    this.lastMeasureKey = key;
    this.callbacks.onMeasure(screen, metres);
  }

  private currentFloor() {
    if (this.mode !== 'walk' && this.stop < 0) return typeof this.level === 'number' ? this.level : 1;
    return floorAtElevation(this.tour, this.eye.y - EYE_HEIGHT);
  }

  // --------------------------------------------------------------- input --

  private bindEvents() {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerCancel);
    el.addEventListener('pointerleave', this.onPointerLeave);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private unbindEvents() {
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerCancel);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    el.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onPointerDown = (event: PointerEvent) => {
    this.renderer.domElement.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 1) {
      this.press = { x: event.clientX, y: event.clientY, time: performance.now(), moved: false };
    } else {
      this.press = null;
      this.pinch = this.pinchDistance();
    }
    this.stopGuided();
    this.cancelPan();
    this.autoOrbit = false;
    this.needsRender = true;
  };

  private onPointerMove = (event: PointerEvent) => {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) {
      this.hover(event);
      return;
    }
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size >= 2) {
      const distance = this.pinchDistance();
      if (this.pinch > 0 && distance > 0) {
        const ratio = this.pinch / distance;
        if (this.mode === 'walk') this.targetFov = clamp(this.targetFov * ratio, MIN_FOV, MAX_FOV);
        else this.orbitGoal.distance = clamp(this.orbitGoal.distance * ratio, 6, 160);
      }
      this.pinch = distance;
      this.needsRender = true;
      return;
    }

    if (this.press && Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y) > 6) {
      this.press.moved = true;
      this.cursor.visible = false;
    }
    if (!this.press?.moved) return;

    if (this.mode === 'walk') {
      const speed = (this.fov / 75) * 0.14;
      this.targetYaw -= dx * speed;
      this.targetPitch = clamp(this.targetPitch + dy * speed, -MAX_PITCH, MAX_PITCH);
      this.yaw = this.targetYaw - (this.targetYaw - this.yaw) * 0.3;
    } else if (this.mode === 'floorplan') {
      const scale = (this.orbit.distance * Math.tan((this.orbit.fov / 2) * DEG) * 2) / this.container.clientHeight;
      this.orbitGoal.target.x -= dx * scale;
      this.orbitGoal.target.z -= dy * scale;
    } else {
      this.orbitGoal.azimuth -= dx * 0.3;
      this.orbitGoal.elevation = clamp(this.orbitGoal.elevation + dy * 0.25, 6, 88);
    }
    this.needsRender = true;
  };

  private onPointerUp = (event: PointerEvent) => {
    const press = this.press;
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinch = 0;
    if (this.pointers.size === 0) this.press = null;
    if (press && !press.moved && performance.now() - press.time < 600) this.click(event);
  };

  private onPointerCancel = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId);
    this.press = null;
  };

  private onPointerLeave = () => {
    if (this.pointers.size) return;
    this.cursor.visible = false;
    if (this.hoverStop !== -1) {
      this.hoverStop = -1;
      this.needsRender = true;
    }
  };

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    this.stopGuided();
    this.autoOrbit = false;
    if (this.mode === 'walk') {
      this.targetFov = clamp(this.targetFov + event.deltaY * 0.04, MIN_FOV, MAX_FOV);
    } else {
      this.orbitGoal.distance = clamp(this.orbitGoal.distance * (1 + event.deltaY * 0.0012), 6, 160);
    }
    this.needsRender = true;
  };

  private onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (!this.container.isConnected || !this.handlesKeys()) return;
    const key = event.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) event.preventDefault();
    if (key === 'Escape') {
      this.halt();
      return;
    }
    if (!this.keys.has(key)) {
      if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        this.stopGuided();
        this.step(1);
      }
      if (key === 'ArrowDown' || key === 's' || key === 'S') {
        this.stopGuided();
        this.step(-1);
      }
    }
    if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(key)) {
      this.stopGuided();
      this.cancelPan();
      this.autoOrbit = false;
    }
    this.keys.add(key);
    this.needsRender = true;
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key);
  };

  private onDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (event.alpha == null || event.beta == null) return;
    this.gyro = { alpha: event.alpha, beta: event.beta };
    this.needsRender = true;
  };

  private pinchDistance() {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private pick(event: PointerEvent | MouseEvent, targets: THREE.Object3D[]) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const visible = targets.filter(
      (object) => isShown(object) || (this.mode === 'walk' && object.userData.pickWhenHidden),
    );
    const hits = this.raycaster.intersectObjects(visible, false).filter((hit) => {
      // Respect the dollhouse cut: nothing above it can be picked.
      return hit.point.y <= this.cutPlane.constant + 0.01;
    });
    return hits[0] ?? null;
  }

  private hover(event: PointerEvent) {
    if (this.mode !== 'walk' || this.flight || this.measuring) {
      this.cursor.visible = false;
      return;
    }
    const hit = this.pick(event, [...this.house.walkable, ...this.house.solid, this.groundMesh()]);
    const isFloor = hit && (hit.object.userData.surface === 'floor' || hit.object.userData.surface === 'ground' || this.house.walkable.includes(hit.object));
    if (!hit || !isFloor || !hit.face) {
      this.cursor.visible = false;
      if (this.hoverStop !== -1) {
        this.hoverStop = -1;
        this.needsRender = true;
      }
      return;
    }
    this.cursor.visible = true;
    this.cursor.position.copy(hit.point).add(new THREE.Vector3(0, 0.02, 0));
    this.cursor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));
    const stop = this.stopNear(hit.point, hit.object.userData.space as string | undefined);
    if (stop !== this.hoverStop) this.hoverStop = stop;
    this.needsRender = true;
  }

  private click(event: PointerEvent) {
    if (this.flight) return;
    if (this.measuring && this.mode === 'walk') {
      const shapes = [...this.depth.values()].map((build) => build.body);
      const hit = this.pick(event, [...shapes, ...this.house.walkable, ...this.house.solid]);
      if (hit) {
        this.measurePoints = [...this.measurePoints, hit.point.clone()].slice(-2);
        this.lastMeasureKey = '';
        this.needsRender = true;
      }
      return;
    }
    if (this.mode === 'walk') {
      const hit = this.pick(event, [...this.house.walkable, ...this.house.solid, this.groundMesh()]);
      if (!hit) return;
      const stop = this.stopNear(hit.point, hit.object.userData.space as string | undefined);
      if (stop < 0 || stop === this.stop) return;
      const origin = this.graph.stops[this.stop];
      const target = this.graph.stops[stop];
      const far = origin ? Math.hypot(target.x - origin.x, target.z - origin.z) > 3.2 : true;
      void this.walkAlong(stop, far, null);
      return;
    }
    if (this.mode === 'overview') {
      void this.approach();
      return;
    }
    // Dollhouse and floor plan: fly into the room that was clicked.
    const hit = this.pick(event, this.house.walkable);
    const space = hit?.object.userData.space as string | undefined;
    if (!space || space === OUTSIDE) return;
    const arrival = this.graph.arrival.get(space);
    if (arrival === undefined) return;
    void this.enterWalkAt(arrival, this.arrivalYaw(space) ?? this.yaw);
  }

  private groundMesh() {
    return this.environment.group.children.find((child) => child.userData.surface === 'ground') ?? this.world;
  }

  /** The stop a floor point most plausibly means: same space and level first. */
  private stopNear(point: THREE.Vector3, space?: string) {
    const level = floorAtElevation(this.tour, point.y + 0.2);
    const free = (id: number) => !this.occupied.has(id);
    const inSpace = space
      ? nearestStop(
          this.graph,
          point.x,
          point.z,
          (stop) => stop.space === space && free(stop.id) && Math.abs(stop.y - point.y) < 1.2,
        )
      : -1;
    if (inSpace >= 0) return inSpace;
    return nearestStop(
      this.graph,
      point.x,
      point.z,
      (stop) => stop.floor === level && free(stop.id) && Math.abs(stop.y - point.y) < 1.5,
    );
  }
}

// ----------------------------------------------------------------- utils ---

/**
 * Whether a room's photo has opened onto a doorway (1 = the next room, 0 = the
 * photo). It opens once the visitor is well on the way to the door and never
 * at the capture point; the switch itself is eased into a short cross-fade, so
 * at rest a doorway is always one or the other, never a ghost of both. A
 * little hysteresis keeps it from flickering at the threshold.
 */
function doorwayOpening(eye: THREE.Vector3, patch: DoorPatch) {
  const centre = doorCentre(patch.door);
  const distance = Math.hypot(
    eye.x - centre.x,
    (eye.y - patch.door.bottom - EYE_HEIGHT) * 2,
    eye.z - centre.z,
  );
  const threshold = Math.min(Math.max(patch.reach * 0.5, 1.3), 2.1, patch.reach * 0.8);
  const opened = patch.shown < 0.5;
  return distance < threshold + (opened ? 0.2 : 0) ? 1 : 0;
}

function showPatch(patch: DoorPatch) {
  const opacity = patch.shown;
  const solid = opacity > 0.997;
  patch.mesh.visible = opacity > 0.003;
  patch.material.uniforms.opacity.value = solid ? 1 : opacity;
  patch.material.transparent = !solid;
  patch.material.depthWrite = solid;
}

function showFrame(frame: DoorFrame) {
  const opacity = frame.shown;
  const solid = opacity > 0.997;
  frame.materials.forEach((material) => {
    material.visible = opacity > 0.003;
    material.opacity = solid ? 1 : opacity;
    if (material.transparent !== !solid) {
      material.transparent = !solid;
      material.needsUpdate = true;
    }
    material.depthWrite = solid;
  });
}

function writePortal(door: DoorGeometry, a: THREE.Vector4, b: THREE.Vector2) {
  a.set(door.plane, door.along, door.bottom - 0.05, door.axis === 'x' ? 0 : 1);
  b.set(door.width / 2 + 0.02, door.height + 0.05);
}

function samplePath(points: THREE.Vector3[], cumulative: number[], s: number) {
  if (s <= 0) return points[0].clone();
  const total = cumulative[cumulative.length - 1];
  if (s >= total) return points[points.length - 1].clone();
  let i = 1;
  while (i < cumulative.length && cumulative[i] < s) i += 1;
  const span = cumulative[i] - cumulative[i - 1] || 1;
  return points[i - 1].clone().lerp(points[i], (s - cumulative[i - 1]) / span);
}

function isShown(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function angleDelta(target: number, current: number) {
  return ((((target - current) % 360) + 540) % 360) - 180;
}

function nearestAngle(target: number, current: number) {
  return current + angleDelta(target, current);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}
