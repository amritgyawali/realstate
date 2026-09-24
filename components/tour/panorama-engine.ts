import * as THREE from 'three';
import type { PropertyTour, TourHotspot, TourNode } from '@/lib/types';
import {
  EYE_HEIGHT,
  clamp,
  findRoute,
  frameOffset,
  guidedRoute,
  linkBetween,
  navHotspots,
  nodeById,
  roomShape,
  turnBetween,
  wrapDeg,
  type WalkLink,
} from '@/lib/tour-graph';

const DEG = Math.PI / 180;

export interface ScreenHotspot {
  node: TourNode;
  hotspot: TourHotspot;
  /** Viewport pixel position of the hotspot's projected centre. */
  x: number;
  y: number;
  /** Perspective scale, so far markers read smaller than near ones. */
  scale: number;
  /** False when the hotspot sits behind the camera or outside the frustum. */
  visible: boolean;
  key: string;
}

export interface MeasurePoint {
  x: number;
  y: number;
}

/** Where a multi-room walk is up to. `path` runs from where it began to where it ends. */
export interface RouteState {
  kind: 'route' | 'guided' | 'step';
  path: string[];
  /** Index in `path` of the room most recently reached. */
  index: number;
  /** Waiting for the next room's panorama before setting off. */
  loading: boolean;
  /** Guided tour only: pausing to look around a room. */
  dwelling: boolean;
}

export interface FloorTarget {
  /** Nav destination under the pointer, or null for plain floor. */
  nodeId: string | null;
  label: string | null;
}

export interface EngineOptions {
  onHotspots: (hotspots: ScreenHotspot[]) => void;
  onLoadProgress: (progress: number) => void;
  /** The camera now stands at this node — an arrival, including mid-route. */
  onNodeChange: (nodeId: string) => void;
  /** The full-resolution panorama for this node is on screen. */
  onNodeReady?: (nodeId: string) => void;
  onRoute: (route: RouteState | null) => void;
  /** A walk between two adjacent rooms has begun (or, with null, ended). */
  onLeg?: (leg: { from: string; to: string } | null) => void;
  onFloorTarget?: (target: FloorTarget | null) => void;
  onMeasureUpdate: (points: MeasurePoint[], distanceMetres: number | null) => void;
  /** The visitor took the controls (a guided tour stops on this). */
  onInteract?: () => void;
  reducedMotion?: boolean;
  /**
   * Limits the walk keys to when the pointer is over this element or focus is
   * inside it, so a tour embedded in a page doesn't take over the page's keys.
   * Omit it to listen globally (the full-viewport tour).
   */
  keyScope?: HTMLElement | null;
  /**
   * Receives per-frame CSS custom properties, so chrome that tracks the camera
   * (compass, minimap marker, speed vignette, floor-target label) can follow it
   * without a React render per frame:
   * `--tour-yaw` (deg), `--tour-leg` (0–1), `--tour-speed` (0–1),
   * `--tour-px` / `--tour-py` (pointer, px).
   */
  styleTarget?: HTMLElement;
}

const MIN_FOV = 32;
const MAX_FOV = 100;
const MAX_PITCH = 85;

/** Walking pace between rooms, m/s. Brisk, so a room is a second or two away. */
const CRUISE = 4;
/** Height climbed on a staircase link. */
const STAIR_RISE = 2.6;
/** Views further than this off a doorway will not walk through it. */
const ALIGN_TOLERANCE = 38;
/** Joints sharper than this come to a stop and turn, rather than curving through. */
const MAX_GLIDE_TURN = 75;
/** Degrees of turn left before setting off from a standstill. */
const TURN_BEFORE_WALK = 16;
const DWELL_SECONDS = 4.5;
/** 4096×2048 textures are ~32 MB of GPU memory each; keep only the nearest few. */
const MAX_FULL_TEXTURES = 6;

interface Slot {
  node: TourNode | null;
  texture: THREE.Texture;
  /** Where the panorama was captured, in world metres. */
  origin: THREE.Vector3;
  /** Degrees added to a world yaw to get this panorama's yaw. */
  yawOffset: number;
}

/**
 * A smooth ease along a path parameter: cubic Hermite from `from` to `to` with
 * the given start and end rates (path units per second), so consecutive legs
 * can hand over at speed instead of stopping in every doorway.
 */
interface Motion {
  from: number;
  to: number;
  v0: number;
  v1: number;
  duration: number;
  elapsed: number;
}

interface Leg {
  link: WalkLink | null;
  fromId: string;
  toId: string;
  start: THREE.Vector3;
  control: THREE.Vector3;
  end: THREE.Vector3;
  length: number;
  offset: number;
  steer: boolean;
  motion: Motion;
  progress: number;
  /** Path parameters between which the two panoramas cross-fade. */
  fade: [number, number];
}

interface PendingLeg {
  link: WalkLink | null;
  toId: string;
  steer: boolean;
  /** Speed carried in from the previous leg, m/s. Zero from a standstill. */
  speed: number;
}

interface VideoEntry {
  element: HTMLVideoElement;
  texture: THREE.VideoTexture;
  playing: boolean;
}

// The panorama pass: one full-screen triangle. Each fragment casts its view ray
// against both rooms' proxy shapes, looks the hit point up in the equirect
// captured at that room's origin, and blends the two.
const VERTEX_SHADER = /* glsl */ `
  uniform mat4 uInvViewProj;
  varying vec3 vRay;
  void main() {
    vec4 far = uInvViewProj * vec4(position.xy, 1.0, 1.0);
    vRay = far.xyz / far.w - cameraPosition;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMapA;
  uniform sampler2D uMapB;
  uniform vec3 uOriginA;
  uniform vec3 uOriginB;
  // radius, floor depth below origin, ceiling height above origin, outdoor
  uniform vec4 uShapeA;
  uniform vec4 uShapeB;
  uniform float uYawA;
  uniform float uYawB;
  uniform float uDecodeA;
  uniform float uDecodeB;
  uniform float uMix;
  varying vec3 vRay;

  const float PI = 3.141592653589793;

  // Where a ray from the camera meets a room: a capped cylinder around the
  // capture point, floor below and (indoors) a ceiling above.
  vec3 proxyHit(vec3 ro, vec3 rd, vec3 origin, vec4 shape) {
    vec3 q = ro - origin;
    float t = 1e5;
    float a = dot(rd.xz, rd.xz);
    if (a > 1e-8) {
      float b = dot(q.xz, rd.xz);
      float c = dot(q.xz, q.xz) - shape.x * shape.x;
      float disc = b * b - a * c;
      if (disc > 0.0) {
        float wall = (-b + sqrt(disc)) / a;
        if (wall > 0.0) t = wall;
      }
    }
    if (rd.y < -1e-5) {
      float ground = (-shape.y - q.y) / rd.y;
      if (ground > 0.0) t = min(t, ground);
    }
    if (shape.w < 0.5 && rd.y > 1e-5) {
      float lid = (shape.z - q.y) / rd.y;
      if (lid > 0.0) t = min(t, lid);
    }
    return q + rd * t;
  }

  vec2 equirect(vec3 d, float yaw) {
    float c = cos(yaw);
    float s = sin(yaw);
    vec3 r = normalize(vec3(d.x * c - d.z * s, d.y, d.x * s + d.z * c));
    float u = atan(r.z, r.x) / (2.0 * PI);
    float v = 0.5 + asin(clamp(r.y, -1.0, 1.0)) / PI;
    return vec2(fract(u), v);
  }

  vec3 sampleRoom(sampler2D map, vec3 rd, vec3 origin, vec4 shape, float yaw, float decode) {
    vec4 texel = texture2D(map, equirect(proxyHit(cameraPosition, rd, origin, shape), yaw));
    return decode > 0.5 ? sRGBTransferEOTF(texel).rgb : texel.rgb;
  }

  void main() {
    vec3 rd = normalize(vRay);
    vec3 colour = sampleRoom(uMapA, rd, uOriginA, uShapeA, uYawA, uDecodeA);
    if (uMix > 0.001) {
      colour = mix(colour, sampleRoom(uMapB, rd, uOriginB, uShapeB, uYawB, uDecodeB), uMix);
    }
    gl_FragColor = vec4(colour, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * The 360° walkover renderer.
 *
 * Every panorama is projected onto a proxy of the room it was captured in — a
 * floor at eye height below, a ceiling above and a round wall — rather than onto
 * an infinitely distant sphere. That is what lets the camera actually travel:
 * walking to the next room moves the camera through the proxy of the room it is
 * leaving, so the floor streams past and the doorway grows, while the next
 * room's panorama, projected from its own capture point, fades in around it.
 *
 * Moving between rooms is always a walk along the nav graph. Picking a distant
 * room plans the shortest route and walks it door by door, carrying speed
 * through gentle turns and stopping to turn round only at sharp ones.
 *
 * Kept deliberately free of a React reconciler: the render loop owns its own
 * state and only pushes projected hotspot positions and walk events back to
 * React, so dragging or walking never triggers a React render of the 3D layer.
 */
export class PanoramaEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private loader = new THREE.TextureLoader();
  private container: HTMLElement;
  private tour: PropertyTour;
  private options: EngineOptions;

  private material: THREE.ShaderMaterial;
  private reticle: THREE.Group;
  private reticleRing: THREE.MeshBasicMaterial;
  private reticleDisc: THREE.MeshBasicMaterial;
  private blank: THREE.DataTexture;

  private slotA: Slot;
  private slotB: Slot;
  private mix = 0;

  private textures = new Map<string, Promise<THREE.Texture>>();
  private loaded = new Map<string, THREE.Texture>();
  private fullUse: string[] = [];
  private videos = new Map<string, VideoEntry>();

  // View, in degrees. World yaw equals the current room's pano yaw at rest.
  private yaw = 0;
  private pitch = 0;
  private fov = 75;
  private targetYaw = 0;
  private targetPitch = 0;
  private targetFov = 75;
  private fovKick = 0;
  /** Camera position without head bob or bump, in world metres. */
  private position = new THREE.Vector3();
  private travelDir = new THREE.Vector3(0, 0, -1);
  private speed = 0;
  private stride = 0;
  private bump: { dir: THREE.Vector3; t: number } | null = null;

  // Walking
  private leg: Leg | null = null;
  private pending: PendingLeg | null = null;
  private route: RouteState | null = null;
  private dwell = 0;
  private waitingFor: string | null = null;
  private reducedMotion: boolean;

  // Input
  private dragging = false;
  private dragMoved = false;
  private pointerId: number | null = null;
  private lastPointer = { x: 0, y: 0 };
  private downPointer = { x: 0, y: 0, time: 0 };
  private velocity = { x: 0, y: 0 };
  private pinchDistance = 0;
  private hover: { x: number; y: number } | null = null;
  private floorTarget: FloorTarget | null = null;
  private keys = new Set<string>();
  private stepLatch = false;
  private latchYaw = 0;
  private pointerInside = false;
  private deviceOrientation: { alpha: number; beta: number; gamma: number } | null = null;
  private gyroEnabled = false;

  private autoRotate = false;
  private idleTime = 0;

  private measuring = false;
  private measurePoints: THREE.Vector3[] = [];

  private lastSignature = '';
  private lastTime = 0;
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private scratch = new THREE.Vector3();
  private frame = 0;
  private paused = false;
  private disposed = false;

  constructor(container: HTMLElement, tour: PropertyTour, options: EngineOptions) {
    this.container = container;
    this.tour = tour;
    this.options = options;
    this.reducedMotion = Boolean(options.reducedMotion);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.style.cursor = 'grab';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      this.fov,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.05,
      200,
    );

    this.blank = new THREE.DataTexture(new Uint8Array([11, 13, 16, 255]), 1, 1);
    this.blank.needsUpdate = true;
    this.slotA = { node: null, texture: this.blank, origin: new THREE.Vector3(), yawOffset: 0 };
    this.slotB = { node: null, texture: this.blank, origin: new THREE.Vector3(), yawOffset: 0 };

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uInvViewProj: { value: new THREE.Matrix4() },
        uMapA: { value: this.blank },
        uMapB: { value: this.blank },
        uOriginA: { value: new THREE.Vector3() },
        uOriginB: { value: new THREE.Vector3() },
        uShapeA: { value: new THREE.Vector4(4, EYE_HEIGHT, 1.2, 0) },
        uShapeB: { value: new THREE.Vector4(4, EYE_HEIGHT, 1.2, 0) },
        uYawA: { value: 0 },
        uYawB: { value: 0 },
        uDecodeA: { value: 0 },
        uDecodeB: { value: 0 },
        uMix: { value: 0 },
      },
    });
    const triangle = new THREE.BufferGeometry();
    triangle.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
    );
    const panorama = new THREE.Mesh(triangle, this.material);
    panorama.frustumCulled = false;
    panorama.renderOrder = 0;
    this.scene.add(panorama);

    // The floor cursor: where a click would take you, lying on the floor.
    this.reticleRing = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
    });
    this.reticleDisc = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.16,
      depthTest: false,
      depthWrite: false,
    });
    this.reticle = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.235, 56), this.reticleRing);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.2, 56), this.reticleDisc);
    ring.rotation.x = -Math.PI / 2;
    disc.rotation.x = -Math.PI / 2;
    this.reticle.add(disc, ring);
    this.reticle.renderOrder = 2;
    ring.renderOrder = 2;
    disc.renderOrder = 2;
    this.reticle.visible = false;
    this.scene.add(this.reticle);

    this.bindEvents();
    this.lastTime = performance.now();
    this.loop();
  }

  // ------------------------------------------------------------ public API --

  get currentNodeId() {
    return this.slotA.node?.id ?? null;
  }

  get canvas() {
    return this.renderer.domElement;
  }

  /** Places the camera in a room with no transition — the tour's first frame. */
  async start(nodeId: string) {
    const node = nodeById(this.tour, nodeId) ?? this.tour.nodes[0];
    if (!node || this.disposed) return;
    this.options.onLoadProgress(0.08);
    let texture: THREE.Texture;
    try {
      texture = await this.bestTexture(node);
    } catch {
      return;
    }
    if (this.disposed) return;
    this.options.onLoadProgress(0.6);

    this.cancelWalk();
    this.slotA = { node, texture, origin: new THREE.Vector3(), yawOffset: 0 };
    this.slotB = { node: null, texture: this.blank, origin: new THREE.Vector3(), yawOffset: 0 };
    this.mix = 0;
    this.position.set(0, 0, 0);
    this.yaw = this.targetYaw = node.entryYaw;
    this.pitch = this.targetPitch = 0;
    this.syncVideos();
    this.options.onNodeChange(node.id);
    this.upgrade(node);
    this.prefetchAround(node);
  }

  /**
   * Walks to any room along the nav graph — door by door, never a cut. Called
   * mid-walk it re-plans from the room being walked into.
   */
  walkTo(nodeId: string, kind: RouteState['kind'] = 'route') {
    const here = this.slotA.node;
    if (!here || this.disposed) return;
    const origin = this.leg ? this.leg.toId : here.id;
    if (!this.leg && origin === nodeId) return;

    let path = findRoute(this.tour, origin, nodeId);
    if (!path.length) {
      // Unconnected rooms still transition in place rather than cut.
      path = [origin, nodeId];
    }
    if (this.leg) path = [this.leg.fromId, ...path];
    this.dwell = 0;
    this.pending = null;
    this.setRoute({ kind, path, index: 0, loading: false, dwelling: false });
    this.prefetchRoute(path);
    if (this.leg) this.retime();
    else this.queueNext(0);
  }

  /** A guided walk through every room, pausing to look around each new one. */
  playGuidedTour() {
    const here = this.slotA.node;
    if (!here) return;
    const path = guidedRoute(this.tour, this.leg ? this.leg.toId : here.id);
    if (this.leg) path.unshift(this.leg.fromId);
    this.setRoute({ kind: 'guided', path, index: 0, loading: false, dwelling: false });
    this.prefetchRoute(path);
    if (this.leg) {
      this.retime();
    } else {
      this.dwell = DWELL_SECONDS * 0.6;
      this.setRoute({ ...this.route!, dwelling: true });
    }
  }

  /** One step through the doorway nearest the view: forward, or backwards. */
  step(direction: 1 | -1) {
    if (this.leg || this.pending || !this.slotA.node) return false;
    if (this.route?.kind === 'guided') this.stopRoute();
    const heading = direction > 0 ? this.yaw : this.yaw + 180;
    const hotspot = this.alignedHotspot(this.slotA.node, heading, ALIGN_TOLERANCE);
    if (!hotspot) {
      this.bumpToward(heading);
      return false;
    }
    this.setRoute({
      kind: 'step',
      path: [this.slotA.node.id, hotspot.to],
      index: 0,
      loading: false,
      dwelling: false,
    });
    this.prefetchRoute([hotspot.to]);
    this.queueNext(0, direction > 0);
    return true;
  }

  /** Ends any route: the current leg completes, then the walk stops. */
  stopRoute() {
    if (!this.route) return;
    this.dwell = 0;
    if (this.leg) {
      this.route = { ...this.route, path: this.route.path.slice(0, this.route.index + 2) };
      this.retime();
      this.options.onRoute(this.route);
    } else {
      this.pending = null;
      this.waitingFor = null;
      this.setRoute(null);
    }
  }

  setAutoRotate(enabled: boolean) {
    this.autoRotate = enabled;
    this.idleTime = 0;
  }

  setReducedMotion(enabled: boolean) {
    this.reducedMotion = enabled;
  }

  setMeasuring(enabled: boolean) {
    this.measuring = enabled;
    this.measurePoints = [];
    this.options.onMeasureUpdate([], null);
    this.renderer.domElement.style.cursor = enabled ? 'crosshair' : 'grab';
    this.setFloorTarget(null);
  }

  clearMeasurement() {
    this.measurePoints = [];
    this.options.onMeasureUpdate([], null);
  }

  setFov(fov: number) {
    this.targetFov = clamp(fov, MIN_FOV, MAX_FOV);
  }

  zoomBy(delta: number) {
    this.targetFov = clamp(this.targetFov + delta, MIN_FOV, MAX_FOV);
  }

  lookAt(yaw: number, pitch = 0) {
    this.targetYaw = this.yaw + turnBetween(this.yaw, yaw);
    this.targetPitch = clamp(pitch, -MAX_PITCH, MAX_PITCH);
    this.idleTime = 0;
  }

  getView() {
    return { yaw: this.yaw, pitch: this.pitch, fov: this.fov };
  }

  /** Stops drawing while another view (the dollhouse) covers the canvas. */
  setPaused(paused: boolean) {
    this.paused = paused;
    this.videos.forEach((entry) => {
      if (paused) entry.element.pause();
      else entry.element.play().catch(() => undefined);
    });
  }

  /** Device orientation drives the camera on phones once the user opts in. */
  async enableGyro(): Promise<boolean> {
    const anyEvent = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    };
    try {
      if (typeof anyEvent?.requestPermission === 'function') {
        const state = await anyEvent.requestPermission();
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
    this.deviceOrientation = null;
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.lastSignature = '';
  }

  /** Returns a PNG data URL of the current view, used by the share action. */
  snapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerUp);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    el.removeEventListener('wheel', this.onWheel);
    el.removeEventListener('touchstart', this.onTouchStart);
    el.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.options.keyScope?.removeEventListener('pointerenter', this.onScopeEnter);
    this.options.keyScope?.removeEventListener('pointerleave', this.onScopeLeave);
    this.disableGyro();
    this.videos.forEach((entry) => this.releaseVideo(entry));
    this.videos.clear();
    this.loaded.forEach((texture) => texture.dispose());
    this.loaded.clear();
    this.textures.clear();
    this.blank.dispose();
    this.material.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    this.reticleRing.dispose();
    this.reticleDisc.dispose();
    this.renderer.dispose();
    el.remove();
  }

  // ------------------------------------------------------------------ input --

  private bindEvents() {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    el.addEventListener('pointerleave', this.onPointerLeave);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('touchstart', this.onTouchStart, { passive: false });
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    this.options.keyScope?.addEventListener('pointerenter', this.onScopeEnter);
    this.options.keyScope?.addEventListener('pointerleave', this.onScopeLeave);
  }

  private onScopeEnter = () => {
    this.pointerInside = true;
  };

  private onScopeLeave = () => {
    this.pointerInside = false;
  };

  private ownsKeyboard() {
    const scope = this.options.keyScope;
    if (!scope) return true;
    return this.pointerInside || scope.contains(document.activeElement);
  }

  private interacted() {
    this.idleTime = 0;
    if (this.route?.kind === 'guided') this.stopRoute();
    this.options.onInteract?.();
  }

  private onPointerDown = (event: PointerEvent) => {
    if (this.measuring) {
      this.addMeasurePoint(event);
      return;
    }
    if (this.pointerId !== null) return;
    this.dragging = true;
    this.dragMoved = false;
    this.pointerId = event.pointerId;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.downPointer = { x: event.clientX, y: event.clientY, time: performance.now() };
    this.velocity = { x: 0, y: 0 };
    this.idleTime = 0;
    this.renderer.domElement.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (event.pointerType === 'mouse') {
      this.hover = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      this.options.styleTarget?.style.setProperty('--tour-px', `${this.hover.x}px`);
      this.options.styleTarget?.style.setProperty('--tour-py', `${this.hover.y}px`);
    }
    if (!this.dragging || event.pointerId !== this.pointerId) return;

    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    if (
      !this.dragMoved &&
      Math.hypot(event.clientX - this.downPointer.x, event.clientY - this.downPointer.y) > 5
    ) {
      this.dragMoved = true;
      this.renderer.domElement.style.cursor = 'grabbing';
      if (this.leg) this.leg.steer = false;
      this.interacted();
    }
    if (!this.dragMoved) return;

    // Drag sensitivity scales with FOV so zoomed-in panning stays proportional.
    const speed = (this.fov / 75) * 0.13;
    this.targetYaw -= dx * speed;
    this.targetPitch = clamp(this.targetPitch + dy * speed, -MAX_PITCH, MAX_PITCH);
    this.velocity = { x: -dx * speed, y: dy * speed };
  };

  private onPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId) return;
    const wasClick =
      !this.dragMoved && performance.now() - this.downPointer.time < 600 && event.type === 'pointerup';
    this.dragging = false;
    this.pointerId = null;
    this.renderer.domElement.style.cursor = this.measuring ? 'crosshair' : 'grab';
    if (wasClick) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.onFloorClick(event.clientX - rect.left, event.clientY - rect.top);
    }
  };

  private onPointerLeave = () => {
    this.hover = null;
    this.setFloorTarget(null);
  };

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    this.targetFov = clamp(this.targetFov + event.deltaY * 0.05, MIN_FOV, MAX_FOV);
    this.idleTime = 0;
  };

  private onTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 2) {
      this.pinchDistance = touchDistance(event);
      this.dragMoved = true;
    }
  };

  private onTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    const distance = touchDistance(event);
    if (this.pinchDistance) {
      this.targetFov = clamp(
        this.targetFov * (this.pinchDistance / distance),
        MIN_FOV,
        MAX_FOV,
      );
    }
    this.pinchDistance = distance;
  };

  private onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = normaliseKey(event.key);
    if (!key || !this.ownsKeyboard()) return;
    // Buttons keep their own Enter/Space; only movement keys are taken here.
    event.preventDefault();
    this.keys.add(key);
    this.interacted();
    if (key === 'forward' || key === 'back') {
      if (!event.repeat) this.stepLatch = false;
    }
    if (key === 'zoomIn') this.zoomBy(-8);
    if (key === 'zoomOut') this.zoomBy(8);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    const key = normaliseKey(event.key);
    if (key) this.keys.delete(key);
    if (key === 'forward' && this.leg && this.route?.kind === 'step') this.retime();
  };

  private onBlur = () => {
    this.keys.clear();
  };

  private onDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (event.alpha == null || event.beta == null || event.gamma == null) return;
    this.deviceOrientation = { alpha: event.alpha, beta: event.beta, gamma: event.gamma };
  };

  /** A click on the floor walks through the doorway on that side of the room. */
  private onFloorClick(x: number, y: number) {
    const node = this.slotA.node;
    if (!node || this.leg) return;
    const hit = this.floorHit(x, y);
    const ray = this.rayAt(x, y);
    const clickYaw = hit
      ? Math.atan2(hit.x - this.slotA.origin.x, -(hit.z - this.slotA.origin.z)) / DEG
      : Math.atan2(ray.x, -ray.z) / DEG;
    const hotspot = this.alignedHotspot(node, clickYaw, hit ? 30 : 16);
    if (hotspot) {
      this.interacted();
      this.walkTo(hotspot.to, 'step');
    } else if (hit) {
      this.interacted();
      this.bumpToward(clickYaw);
    }
  }

  // ------------------------------------------------------------ walking ----

  private setRoute(route: RouteState | null) {
    this.route = route;
    this.options.onRoute(route);
  }

  private cancelWalk() {
    this.leg = null;
    this.pending = null;
    this.dwell = 0;
    this.waitingFor = null;
    this.speed = 0;
    this.mix = 0;
    this.options.onLeg?.(null);
    if (this.route) this.setRoute(null);
  }

  /** The nav hotspot whose doorway lies closest to a heading, within tolerance. */
  private alignedHotspot(node: TourNode, heading: number, tolerance: number) {
    let best: (TourHotspot & { to: string }) | null = null;
    let bestTurn = tolerance;
    navHotspots(node).forEach((hotspot) => {
      if (!nodeById(this.tour, hotspot.to)) return;
      const turn = Math.abs(turnBetween(heading, hotspot.yaw));
      if (turn <= bestTurn) {
        best = hotspot;
        bestTurn = turn;
      }
    });
    return best as (TourHotspot & { to: string }) | null;
  }

  /**
   * Decides the next leg from the route (or a held walk key) and parks it until
   * its panorama has loaded. `speed` is carried in from the leg just finished.
   */
  private queueNext(speed: number, steer = true) {
    const here = this.slotA.node;
    const route = this.route;
    if (!here || !route) return this.settle();

    let nextId = route.path[route.index + 1];
    if (!nextId && route.kind === 'step' && this.keys.has('forward')) {
      // Holding forward keeps walking through whichever doorway lies ahead.
      const cameFrom = route.path[route.index - 1];
      const ahead = this.alignedHotspot(here, this.yaw, ALIGN_TOLERANCE + 10);
      if (ahead && ahead.to !== cameFrom) {
        nextId = ahead.to;
        this.route = { ...route, path: [...route.path, ahead.to] };
        this.prefetchRoute([ahead.to]);
      }
    }
    if (!nextId) return this.settle();

    const link = linkBetween(this.tour, here.id, nextId);
    this.pending = {
      link,
      toId: nextId,
      steer: route.kind === 'step' ? steer : true,
      speed,
    };
    this.options.onRoute(this.route);
  }

  /** Nothing more to walk: come to rest, show the full-res capture. */
  private settle() {
    this.pending = null;
    this.speed = 0;
    this.options.onLeg?.(null);
    if (this.route) this.setRoute(null);
    const node = this.slotA.node;
    if (node) {
      this.upgrade(node);
      this.prefetchAround(node);
    }
    this.lastSignature = '';
  }

  /** Called each frame while a leg is parked: waits for textures, then turns, then goes. */
  private tryDepart() {
    const pending = this.pending;
    const here = this.slotA.node;
    if (!pending || !here) return;
    const target = nodeById(this.tour, pending.toId);
    if (!target) {
      this.pending = null;
      this.settle();
      return;
    }

    const texture = this.readyTexture(target);
    if (!texture) {
      if (this.waitingFor !== target.id) {
        this.waitingFor = target.id;
        if (this.route) this.options.onRoute({ ...this.route, loading: true });
        this.bestTexture(target)
          .then(() => {
            if (this.waitingFor === target.id) this.waitingFor = null;
            if (this.route) this.options.onRoute({ ...this.route, loading: false });
          })
          .catch(() => {
            this.waitingFor = null;
            this.stopRoute();
            this.settle();
          });
      }
      return;
    }

    const heading = pending.link ? pending.link.hotspot.yaw : this.yaw;
    // From a standstill, turn to face the doorway before setting off.
    if (pending.speed === 0 && pending.steer && !this.reducedMotion) {
      const turn = turnBetween(this.yaw, heading);
      this.targetYaw = this.yaw + turn;
      this.targetPitch = clamp(this.targetPitch, -12, 8) * 0.4;
      if (Math.abs(turn) > TURN_BEFORE_WALK) return;
    }

    this.pending = null;
    this.beginLeg(pending, texture);
  }

  private beginLeg(pending: PendingLeg, texture: THREE.Texture) {
    const here = this.slotA.node!;
    const target = nodeById(this.tour, pending.toId)!;
    const link = pending.link;

    // Where the next capture point sits, in this room's frame.
    const still = this.reducedMotion || !link;
    const heading = link ? link.hotspot.yaw : this.yaw;
    const distance = still ? 0 : link.distance;
    const rise = still ? 0 : Math.sign(link.levels) * STAIR_RISE;
    const end = directionFromYaw(heading).multiplyScalar(distance).setY(rise);
    const start = this.position.clone();
    const length = Math.max(0.001, start.distanceTo(end));

    // Carrying speed in, curve out of the previous direction instead of kinking.
    const control =
      pending.speed > 0 && !still
        ? start.clone().addScaledVector(this.travelDir, length * 0.5)
        : start.clone().lerp(end, 0.5);

    // Rotation between the two panoramas. Unlinked rooms keep the view heading.
    const offset = link ? frameOffset(link) : wrapDeg(target.entryYaw - this.yaw);

    this.slotB = { node: target, texture, origin: end.clone(), yawOffset: offset };
    this.syncVideos();

    const endSpeed = still ? 0 : this.plannedEndSpeed(target.id);
    this.leg = {
      link,
      fromId: here.id,
      toId: target.id,
      start,
      control,
      end,
      length,
      offset,
      steer: pending.steer,
      progress: 0,
      motion: still
        ? planMotion(0, 1, 0, 0, 0.55, length)
        : planMotion(0, 1, pending.speed / length, endSpeed / length, null, length),
      fade: still ? [0, 1] : [0.26, 0.78],
    };
    if (pending.steer && !still) {
      this.targetYaw = this.yaw + turnBetween(this.yaw, heading);
      this.targetPitch *= 0.3;
    }
    this.options.onLeg?.({ from: here.id, to: target.id });
    this.lastSignature = '';
    this.setFloorTarget(null);
  }

  /** Whether the leg being planned should hand over at speed or stop. */
  private plannedEndSpeed(arrivingAt: string) {
    const route = this.route;
    if (!route) return 0;
    const arriveIndex = route.index + 1;
    if (route.kind === 'guided' && this.isFirstVisit(route, arriveIndex)) return 0;

    let nextId = route.path[arriveIndex + 1];
    if (!nextId && route.kind === 'step' && this.keys.has('forward')) {
      const arriving = nodeById(this.tour, arrivingAt);
      const link = linkBetween(this.tour, route.path[route.index], arrivingAt);
      if (arriving && link) {
        const facing = link.back ? link.back.yaw + 180 : arriving.entryYaw;
        const ahead = this.alignedHotspot(arriving, facing, ALIGN_TOLERANCE + 10);
        nextId = ahead && ahead.to !== route.path[route.index] ? ahead.to : '';
      }
    }
    if (!nextId) return 0;

    const inbound = linkBetween(this.tour, route.path[route.index], arrivingAt);
    const outbound = linkBetween(this.tour, arrivingAt, nextId);
    if (!inbound || !outbound || !this.readyTexture(outbound.to)) return 0;
    const facing = inbound.back ? inbound.back.yaw + 180 : inbound.to.entryYaw;
    return Math.abs(turnBetween(facing, outbound.hotspot.yaw)) <= MAX_GLIDE_TURN ? CRUISE : 0;
  }

  private isFirstVisit(route: RouteState, index: number) {
    return route.path.indexOf(route.path[index]) === index;
  }

  /** Re-plans the rest of the current leg after the route or held keys change. */
  private retime() {
    const leg = this.leg;
    if (!leg || leg.length < 0.01) return;
    const rate = motionRate(leg.motion);
    const endSpeed = this.plannedEndSpeed(leg.toId);
    leg.motion = planMotion(leg.progress, 1, rate, endSpeed / leg.length, null, leg.length);
  }

  private advanceLeg(dt: number) {
    const leg = this.leg!;
    leg.motion.elapsed = Math.min(leg.motion.duration, leg.motion.elapsed + dt);
    leg.progress = motionValue(leg.motion);
    const u = clamp(leg.progress, 0, 1);

    const point = bezier(leg.start, leg.control, leg.end, u);
    const tangent = bezierTangent(leg.start, leg.control, leg.end, u);
    if (tangent.lengthSq() > 1e-6) this.travelDir.copy(tangent.setY(0).normalize());
    this.position.copy(point);
    this.speed = motionRate(leg.motion) * leg.length;
    this.stride += this.speed * dt;
    this.mix = smoothstep(leg.fade[0], leg.fade[1], u);

    if (leg.motion.elapsed >= leg.motion.duration) this.arrive();
  }

  /**
   * The camera has reached the next capture point. The world is re-based on
   * it — translated to its origin and rotated into its panorama's frame — so the
   * image is unchanged while every coordinate becomes local to the new room.
   */
  private arrive() {
    const leg = this.leg!;
    const node = this.slotB.node!;
    const carried = this.speed;

    this.position.sub(leg.end);
    rotateYaw(this.position, leg.offset);
    rotateYaw(this.travelDir, leg.offset);
    this.yaw += leg.offset;
    this.targetYaw += leg.offset;

    this.slotA = { node, texture: this.slotB.texture, origin: new THREE.Vector3(), yawOffset: 0 };
    this.slotB = { node: null, texture: this.blank, origin: new THREE.Vector3(), yawOffset: 0 };
    this.mix = 0;
    this.leg = null;
    this.measurePoints = [];
    this.options.onMeasureUpdate([], null);
    this.syncVideos();
    this.options.onLeg?.(null);
    this.options.onNodeChange(node.id);

    const route = this.route;
    if (!route) {
      this.settle();
      return;
    }
    const index = route.index + 1;
    this.route = { ...route, index };

    if (route.kind === 'guided' && this.isFirstVisit(this.route, index) && index < route.path.length - 1) {
      this.dwell = DWELL_SECONDS;
      this.speed = 0;
      this.upgrade(node);
      this.setRoute({ ...this.route, dwelling: true });
      return;
    }
    if (index >= route.path.length - 1 && !(route.kind === 'step' && this.keys.has('forward'))) {
      this.settle();
      return;
    }
    this.queueNext(carried > 0.2 ? carried : 0);
    // Carrying speed, set off this frame rather than idling in the doorway.
    if (this.pending && this.pending.speed > 0) this.tryDepart();
  }

  private bumpToward(yaw: number) {
    if (this.reducedMotion || this.bump) return;
    this.bump = { dir: directionFromYaw(yaw), t: 0 };
  }

  // ----------------------------------------------------------- textures ----

  private urls(node: TourNode) {
    return {
      preview: `/panoramas/${node.pano}-preview.jpg`,
      full: `/panoramas/${node.pano}.jpg`,
    };
  }

  private readyTexture(node: TourNode) {
    const { preview, full } = this.urls(node);
    return this.loaded.get(full) ?? this.loaded.get(preview) ?? null;
  }

  /** The best texture already loaded, else the preview once it arrives. */
  private async bestTexture(node: TourNode) {
    return this.readyTexture(node) ?? this.load(this.urls(node).preview);
  }

  private load(url: string): Promise<THREE.Texture> {
    const existing = this.textures.get(url);
    if (existing) {
      this.touch(url);
      return existing;
    }
    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      this.loader.load(
        url,
        (texture) => {
          if (this.disposed) {
            texture.dispose();
            reject(new Error('disposed'));
            return;
          }
          configureTexture(texture);
          this.loaded.set(url, texture);
          this.touch(url);
          resolve(texture);
        },
        undefined,
        reject,
      );
    });
    promise.catch(() => this.textures.delete(url));
    this.textures.set(url, promise);
    return promise;
  }

  /** Keeps the full-resolution cache to the few rooms nearest the visitor. */
  private touch(url: string) {
    if (url.endsWith('-preview.jpg')) return;
    this.fullUse = [...this.fullUse.filter((u) => u !== url), url];
    if (this.fullUse.length <= MAX_FULL_TEXTURES) return;
    const inUse = new Set([this.slotA.texture, this.slotB.texture]);
    const victim = this.fullUse.find((u) => {
      const texture = this.loaded.get(u);
      return texture && !inUse.has(texture);
    });
    if (!victim) return;
    this.loaded.get(victim)?.dispose();
    this.loaded.delete(victim);
    this.textures.delete(victim);
    this.fullUse = this.fullUse.filter((u) => u !== victim);
  }

  /** Swaps the 4096×2048 capture in behind the preview once it has loaded. */
  private upgrade(node: TourNode) {
    const { full } = this.urls(node);
    const apply = (texture: THREE.Texture) => {
      if (this.disposed) return;
      if (this.slotA.node?.id === node.id) this.slotA.texture = texture;
      if (this.slotB.node?.id === node.id) this.slotB.texture = texture;
      if (this.slotA.node?.id === node.id && !this.leg) {
        this.options.onLoadProgress(1);
        this.options.onNodeReady?.(node.id);
      }
    };
    const ready = this.loaded.get(full);
    if (ready) {
      apply(ready);
      return;
    }
    this.options.onLoadProgress(0.75);
    this.load(full)
      .then(apply)
      .catch(() => {
        // The preview stays up; the room is still walkable.
        if (this.slotA.node?.id === node.id) this.options.onNodeReady?.(node.id);
      });
  }

  /** Warms every room one door away: previews first, then the full captures. */
  private prefetchAround(node: TourNode) {
    const neighbours = navHotspots(node)
      .map((h) => nodeById(this.tour, h.to))
      .filter((n): n is TourNode => Boolean(n));
    neighbours.forEach((n) => this.load(this.urls(n).preview).catch(() => undefined));
    neighbours.forEach((n) => this.load(this.urls(n).full).catch(() => undefined));
  }

  private prefetchRoute(path: string[]) {
    const nodes = path
      .map((id) => nodeById(this.tour, id))
      .filter((n): n is TourNode => Boolean(n));
    nodes.forEach((n) => this.load(this.urls(n).preview).catch(() => undefined));
  }

  // ------------------------------------------------------------- 360 video --

  /** Plays the 360° video of any room on screen; stops the rest. */
  private syncVideos() {
    const wanted = new Map<string, TourNode>();
    [this.slotA.node, this.slotB.node].forEach((node) => {
      if (node?.video) wanted.set(node.id, node);
    });
    this.videos.forEach((entry, id) => {
      if (wanted.has(id)) return;
      this.releaseVideo(entry);
      this.videos.delete(id);
    });
    wanted.forEach((node, id) => {
      if (this.videos.has(id)) return;
      const element = document.createElement('video');
      element.src = node.video!;
      element.crossOrigin = 'anonymous';
      element.loop = true;
      element.muted = true;
      element.playsInline = true;
      element.preload = 'auto';
      const texture = new THREE.VideoTexture(element);
      configureTexture(texture);
      const entry: VideoEntry = { element, texture, playing: false };
      element.addEventListener('playing', () => {
        entry.playing = true;
      });
      element.play().catch(() => undefined);
      this.videos.set(id, entry);
    });
  }

  private releaseVideo(entry: VideoEntry) {
    entry.element.pause();
    entry.element.removeAttribute('src');
    entry.element.load();
    entry.texture.dispose();
  }

  private slotMap(slot: Slot): { map: THREE.Texture; decode: number } {
    const video = slot.node ? this.videos.get(slot.node.id) : undefined;
    if (video?.playing) return { map: video.texture, decode: 1 };
    return { map: slot.texture, decode: 0 };
  }

  // ---------------------------------------------------------- measurement --

  private addMeasurePoint(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const hit = this.floorHit(event.clientX - rect.left, event.clientY - rect.top, true);
    if (!hit) return;
    this.measurePoints = [...this.measurePoints, hit].slice(-2);
    this.emitMeasurement();
  }

  private emitMeasurement() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const points = this.measurePoints.map((point) => {
      const projected = point.clone().project(this.camera);
      return {
        x: (projected.x * 0.5 + 0.5) * width,
        y: (-projected.y * 0.5 + 0.5) * height,
      };
    });
    const distance =
      this.measurePoints.length === 2 ? this.measurePoints[0].distanceTo(this.measurePoints[1]) : null;
    this.options.onMeasureUpdate(points, distance);
  }

  // ---------------------------------------------------------------- rays ----

  private rayAt(x: number, y: number) {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const ndc = new THREE.Vector3((x / width) * 2 - 1, -(y / height) * 2 + 1, 0.5);
    return ndc.unproject(this.camera).sub(this.camera.position).normalize();
  }

  /**
   * Where the view ray under a pixel meets the floor of the current room, or
   * null above the horizon or beyond the room's walls.
   */
  private floorHit(x: number, y: number, unbounded = false) {
    const ray = this.rayAt(x, y);
    if (ray.y > -0.03) return null;
    const floorY = this.slotA.origin.y - EYE_HEIGHT;
    const t = (floorY - this.camera.position.y) / ray.y;
    if (t <= 0) return null;
    const hit = this.camera.position.clone().addScaledVector(ray, t);
    if (!unbounded && this.slotA.node) {
      const radius = roomShape(this.slotA.node).radius;
      const reach = Math.hypot(hit.x - this.slotA.origin.x, hit.z - this.slotA.origin.z);
      if (reach > radius * 0.94) return null;
    }
    return hit;
  }

  private setFloorTarget(target: FloorTarget | null) {
    const same =
      target === this.floorTarget ||
      (target && this.floorTarget && target.nodeId === this.floorTarget.nodeId);
    this.floorTarget = target;
    if (!same) this.options.onFloorTarget?.(target);
  }

  private updateReticle() {
    const node = this.slotA.node;
    const show =
      node && this.hover && !this.dragging && !this.leg && !this.pending && !this.measuring;
    if (!show) {
      this.reticle.visible = false;
      if (this.floorTarget) this.setFloorTarget(null);
      return;
    }
    const hit = this.floorHit(this.hover!.x, this.hover!.y);
    if (!hit) {
      this.reticle.visible = false;
      this.setFloorTarget(null);
      return;
    }
    const yaw = Math.atan2(hit.x, -hit.z) / DEG;
    const hotspot = this.alignedHotspot(node!, yaw, 30);
    const target = hotspot ? nodeById(this.tour, hotspot.to) : null;
    this.reticle.visible = true;
    this.reticle.position.set(hit.x, hit.y + 0.01, hit.z);
    const distance = this.camera.position.distanceTo(hit);
    this.reticle.scale.setScalar(clamp(distance * 0.32, 0.6, 2.2) * (target ? 1.15 : 1));
    const colour = target ? 0xc5a869 : 0xffffff;
    this.reticleRing.color.setHex(colour);
    this.reticleDisc.color.setHex(colour);
    this.reticleDisc.opacity = target ? 0.3 : 0.14;
    this.setFloorTarget({ nodeId: target?.id ?? null, label: target?.name ?? null });
  }

  // ----------------------------------------------------------- main loop ---

  private loop = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (this.paused) return;

    this.updateInput(dt);
    this.updateWalk(dt);
    this.updateCamera(dt);
    this.updateUniforms();
    this.updateReticle();
    this.emitFrame();
    this.renderer.render(this.scene, this.camera);
  };

  private updateInput(dt: number) {
    const lookSpeed = (this.fov / 75) * 95 * dt;
    if (this.keys.has('left')) this.targetYaw -= lookSpeed;
    if (this.keys.has('right')) this.targetYaw += lookSpeed;
    if (this.keys.has('up')) this.targetPitch = clamp(this.targetPitch + lookSpeed, -MAX_PITCH, MAX_PITCH);
    if (this.keys.has('down')) this.targetPitch = clamp(this.targetPitch - lookSpeed, -MAX_PITCH, MAX_PITCH);

    // Held forward/back walks; a blocked step bumps once, then waits for the
    // key to be pressed again or the view to turn towards a doorway.
    if (this.stepLatch && Math.abs(turnBetween(this.latchYaw, this.yaw)) > 20) this.stepLatch = false;
    const idle = !this.leg && !this.pending && this.dwell <= 0;
    if (idle && !this.stepLatch && (this.keys.has('forward') || this.keys.has('back'))) {
      const moved = this.step(this.keys.has('forward') ? 1 : -1);
      if (!moved) {
        this.stepLatch = true;
        this.latchYaw = this.yaw;
      }
    }

    // Inertia after a flick, then idle auto-rotate.
    const frames = dt * 60;
    if (!this.dragging && (Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.y) > 0.01)) {
      this.targetYaw += this.velocity.x * frames;
      this.targetPitch = clamp(this.targetPitch + this.velocity.y * frames, -MAX_PITCH, MAX_PITCH);
      const decay = 0.92 ** frames;
      this.velocity.x *= decay;
      this.velocity.y *= decay;
    } else if (!this.dragging && !this.leg) {
      this.idleTime += dt;
      if (this.dwell > 0) {
        // Guided tour: a slow look around the room before moving on.
        this.targetYaw += (this.reducedMotion ? 9 : 20) * dt;
      } else if (this.autoRotate && this.idleTime > 1) {
        this.targetYaw += 2.1 * dt;
      }
    }

    if (this.gyroEnabled && this.deviceOrientation && !this.dragging) {
      this.targetYaw = -this.deviceOrientation.alpha;
      this.targetPitch = clamp(this.deviceOrientation.beta - 90, -MAX_PITCH, MAX_PITCH);
    }
  }

  private updateWalk(dt: number) {
    if (this.dwell > 0) {
      this.dwell -= dt;
      if (this.dwell <= 0) {
        this.dwell = 0;
        if (this.route) {
          this.route = { ...this.route, dwelling: false };
          this.queueNext(0);
        }
      }
    }
    if (this.pending && !this.leg) this.tryDepart();
    if (this.leg) this.advanceLeg(dt);
    if (!this.leg && !this.pending) {
      // Drift back to the capture point, where the projection is exact.
      this.position.multiplyScalar(Math.exp(-dt * 3));
      this.speed = 0;
    }
    if (this.bump) {
      this.bump.t += dt;
      if (this.bump.t > 0.5) this.bump = null;
    }
  }

  private updateCamera(dt: number) {
    const ease = 1 - Math.exp(-dt * 9);
    this.yaw += (this.targetYaw - this.yaw) * ease;
    this.pitch += (this.targetPitch - this.pitch) * ease;

    const speedRatio = clamp(this.speed / CRUISE, 0, 1.4);
    const kick = this.reducedMotion ? 0 : speedRatio * 7;
    this.fovKick += (kick - this.fovKick) * (1 - Math.exp(-dt * 6));
    this.fov += (this.targetFov - this.fov) * ease;

    this.camera.fov = clamp(this.fov + this.fovKick, MIN_FOV, MAX_FOV + 8);
    this.camera.updateProjectionMatrix();
    this.camera.quaternion.setFromEuler(this.euler.set(this.pitch * DEG, -this.yaw * DEG, 0, 'YXZ'));

    // Walking has a gentle cadence; a blocked step leans in and back.
    const bob = this.reducedMotion ? 0 : Math.sin(this.stride * 2.4) * 0.022 * Math.min(1, speedRatio);
    this.camera.position.copy(this.position);
    this.camera.position.y += bob;
    if (this.bump) {
      this.camera.position.addScaledVector(this.bump.dir, Math.sin((this.bump.t / 0.5) * Math.PI) * 0.4);
    }
    this.camera.updateMatrixWorld();
  }

  private updateUniforms() {
    const u = this.material.uniforms;
    u.uInvViewProj.value.multiplyMatrices(this.camera.matrixWorld, this.camera.projectionMatrixInverse);
    const a = this.slotMap(this.slotA);
    const b = this.slotMap(this.slotB);
    u.uMapA.value = a.map;
    u.uDecodeA.value = a.decode;
    u.uMapB.value = b.map;
    u.uDecodeB.value = b.decode;
    u.uOriginA.value.copy(this.slotA.origin);
    u.uOriginB.value.copy(this.slotB.origin);
    this.shapeFor(this.slotA, u.uShapeA.value);
    this.shapeFor(this.slotB, u.uShapeB.value);
    u.uYawA.value = this.slotA.yawOffset * DEG;
    u.uYawB.value = this.slotB.yawOffset * DEG;
    u.uMix.value = this.slotB.node ? this.mix : 0;
  }

  /**
   * A room's proxy, stretched just enough to keep the camera inside it — walls,
   * floor and ceiling all move out ahead of a camera walking or climbing out of
   * a room, so the projection never turns inside out mid-transition.
   */
  private shapeFor(slot: Slot, out: THREE.Vector4) {
    const shape = slot.node ? roomShape(slot.node) : { radius: 4, ceiling: 2.8, outdoor: false };
    const q = this.scratch.copy(this.camera.position).sub(slot.origin);
    out.set(
      Math.max(shape.radius, Math.hypot(q.x, q.z) + 0.6),
      Math.max(EYE_HEIGHT, 0.4 - q.y),
      Math.max(shape.ceiling - EYE_HEIGHT, q.y + 0.4),
      shape.outdoor ? 1 : 0,
    );
  }

  /**
   * Pushes camera-tracking values to the DOM. Hotspots go through React, but
   * only when the view actually changed; the rest are CSS custom properties.
   */
  private emitFrame() {
    const style = this.options.styleTarget?.style;
    if (style) {
      style.setProperty('--tour-yaw', this.yaw.toFixed(2));
      style.setProperty('--tour-leg', this.leg ? clamp(this.leg.progress, 0, 1).toFixed(4) : '0');
      style.setProperty('--tour-speed', clamp(this.speed / CRUISE, 0, 1).toFixed(3));
    }

    const moving = Boolean(this.leg);
    const p = this.camera.position;
    const signature = moving
      ? 'moving'
      : [
          this.slotA.node?.id,
          this.yaw.toFixed(2),
          this.pitch.toFixed(2),
          this.camera.fov.toFixed(2),
          p.x.toFixed(3),
          p.y.toFixed(3),
          p.z.toFixed(3),
        ].join('|');
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;

    if (moving) {
      this.options.onHotspots([]);
      return;
    }
    this.projectHotspots();
    if (this.measurePoints.length) this.emitMeasurement();
  }

  /**
   * Projects each hotspot into viewport pixels so React can render them as
   * ordinary DOM buttons — focusable, screen-reader friendly and styleable with
   * Tailwind, rather than as WebGL sprites. Floor markers are placed on the
   * floor in 3D, so they hold their spot as the camera shifts.
   */
  private projectHotspots() {
    const node = this.slotA.node;
    if (!node) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const view = new THREE.Vector3();

    const projected = node.hotspots.map((hotspot, index) => {
      const onFloor = hotspot.pitch < -3;
      const reach = onFloor ? Math.min(EYE_HEIGHT / Math.tan(-hotspot.pitch * DEG), 9) : 6;
      const position = sphericalToVector(hotspot.yaw, hotspot.pitch, 1)
        .multiplyScalar(onFloor ? reach / Math.cos(hotspot.pitch * DEG) : reach)
        .add(this.slotA.origin);
      view.copy(position).applyMatrix4(this.camera.matrixWorldInverse);
      const screen = position.clone().project(this.camera);
      const x = (screen.x * 0.5 + 0.5) * width;
      const y = (-screen.y * 0.5 + 0.5) * height;
      const distance = this.camera.position.distanceTo(position);
      const visible = view.z < -0.2 && x > -80 && x < width + 80 && y > -80 && y < height + 80;
      return {
        node,
        hotspot,
        x,
        y,
        scale: clamp(6 / Math.max(distance, 0.1), 0.7, 1.15) * (75 / this.camera.fov) ** 0.35,
        visible,
        key: `${node.id}-${index}`,
      } satisfies ScreenHotspot;
    });
    this.options.onHotspots(projected);
  }
}

// ------------------------------------------------------------------- utils --

type KeyAction = 'forward' | 'back' | 'left' | 'right' | 'up' | 'down' | 'zoomIn' | 'zoomOut';

function normaliseKey(key: string): KeyAction | null {
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return 'forward';
    case 'ArrowDown':
    case 's':
    case 'S':
      return 'back';
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return 'left';
    case 'ArrowRight':
    case 'd':
    case 'D':
      return 'right';
    case 'PageUp':
    case 'r':
    case 'R':
      return 'up';
    case 'PageDown':
    case 'f':
    case 'F':
      return 'down';
    case '+':
    case '=':
      return 'zoomIn';
    case '-':
    case '_':
      return 'zoomOut';
    default:
      return null;
  }
}

function configureTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  // No mipmaps: the equirect lookup wraps at the seam, and mip selection
  // across that jump would draw a hairline down the back of every room.
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 1;
}

/** Plans an eased move along a path parameter, with rates in parameter units per second. */
function planMotion(
  from: number,
  to: number,
  v0: number,
  v1: number,
  fixedDuration: number | null,
  length: number,
): Motion {
  const span = Math.max(1e-4, to - from);
  let duration: number;
  if (fixedDuration != null) {
    duration = fixedDuration;
  } else if (v0 <= 0 && v1 <= 0) {
    // From rest to rest: peak speed lands at about cruise.
    duration = clamp(((span * length) / CRUISE) * 1.55, 1, 2.4);
  } else {
    // Constant acceleration between the two speeds covers the span exactly.
    duration = clamp((2 * span) / Math.max(v0 + v1, 1e-3), 0.35, 2.6);
  }
  return { from, to, v0, v1, duration, elapsed: 0 };
}

function motionValue(motion: Motion) {
  const span = motion.to - motion.from;
  const u = motion.duration > 0 ? clamp(motion.elapsed / motion.duration, 0, 1) : 1;
  const a = clamp((motion.v0 * motion.duration) / span, 0, 2.8);
  const b = clamp((motion.v1 * motion.duration) / span, 0, 2.8);
  return motion.from + span * hermite(u, a, b);
}

function motionRate(motion: Motion) {
  const span = motion.to - motion.from;
  if (motion.duration <= 0) return 0;
  const u = clamp(motion.elapsed / motion.duration, 0, 1);
  const a = clamp((motion.v0 * motion.duration) / span, 0, 2.8);
  const b = clamp((motion.v1 * motion.duration) / span, 0, 2.8);
  return (span * hermiteSlope(u, a, b)) / motion.duration;
}

/** Cubic Hermite from 0 to 1 with start slope `a` and end slope `b`. */
function hermite(u: number, a: number, b: number) {
  const u2 = u * u;
  const u3 = u2 * u;
  return (u3 - 2 * u2 + u) * a + (-2 * u3 + 3 * u2) + (u3 - u2) * b;
}

function hermiteSlope(u: number, a: number, b: number) {
  const u2 = u * u;
  return (3 * u2 - 4 * u + 1) * a + (-6 * u2 + 6 * u) + (3 * u2 - 2 * u) * b;
}

function bezier(a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number) {
  const s = 1 - t;
  return new THREE.Vector3()
    .addScaledVector(a, s * s)
    .addScaledVector(c, 2 * s * t)
    .addScaledVector(b, t * t);
}

function bezierTangent(a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number) {
  return new THREE.Vector3()
    .addScaledVector(c.clone().sub(a), 2 * (1 - t))
    .addScaledVector(b.clone().sub(c), 2 * t);
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / Math.max(1e-6, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function touchDistance(event: TouchEvent) {
  const [a, b] = [event.touches[0], event.touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/** Horizontal unit vector for a yaw: 0 is -z (forward), 90 is +x (right). */
function directionFromYaw(yawDeg: number) {
  return new THREE.Vector3(Math.sin(yawDeg * DEG), 0, -Math.cos(yawDeg * DEG));
}

/** Rotates a vector about the vertical so its yaw grows by `deg`. */
function rotateYaw(vector: THREE.Vector3, deg: number) {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  const x = vector.x * c - vector.z * s;
  const z = vector.x * s + vector.z * c;
  vector.x = x;
  vector.z = z;
  return vector;
}

export function sphericalToVector(yawDeg: number, pitchDeg: number, radius: number) {
  const yaw = yawDeg * DEG;
  const pitch = pitchDeg * DEG;
  return new THREE.Vector3(
    radius * Math.cos(pitch) * Math.sin(yaw),
    radius * Math.sin(pitch),
    -radius * Math.cos(pitch) * Math.cos(yaw),
  );
}
