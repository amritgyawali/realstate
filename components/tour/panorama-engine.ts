import * as THREE from 'three';
import type { TourHotspot, TourNode } from '@/lib/types';

const DEG = Math.PI / 180;

export interface ScreenHotspot {
  node: TourNode;
  hotspot: TourHotspot;
  /** Viewport pixel position of the hotspot's projected centre. */
  x: number;
  y: number;
  /** Distance-based scale so far hotspots read as smaller. */
  scale: number;
  /** False when the hotspot sits behind the camera or outside the frustum. */
  visible: boolean;
  key: string;
}

export interface MeasurePoint {
  /** Direction from the camera origin, unit length. */
  direction: THREE.Vector3;
  x: number;
  y: number;
}

export interface EngineOptions {
  onHotspots: (hotspots: ScreenHotspot[]) => void;
  onLoadProgress: (progress: number) => void;
  onNodeReady: (nodeId: string) => void;
  onMeasureUpdate: (points: MeasurePoint[], distanceMetres: number | null) => void;
  onViewChange?: (yaw: number, pitch: number, fov: number) => void;
}

const MIN_FOV = 32;
const MAX_FOV = 100;
const MAX_PITCH = 85;

/**
 * Assumed eye height above the floor, in metres. The measurement tool intersects
 * view rays with the floor plane at y = -EYE_HEIGHT, which is how single-camera
 * panoramas can produce usable ground distances without depth data.
 */
const EYE_HEIGHT = 1.6;

/**
 * The 360° walkover renderer.
 *
 * A panorama is drawn on the inside of a sphere with the camera at its centre.
 * Walking to another capture point cross-fades a second sphere over the first
 * while the camera dollies forward a little, which reads as stepping through a
 * doorway rather than cutting to a new slide.
 *
 * Kept deliberately free of a React reconciler: the render loop owns its own
 * state and only pushes projected hotspot positions back to React, so dragging
 * the view never triggers a React re-render of the 3D layer.
 */
export class PanoramaEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private loader = new THREE.TextureLoader();
  private container: HTMLElement;
  private options: EngineOptions;

  private current: THREE.Mesh | null = null;
  private incoming: THREE.Mesh | null = null;
  private textureCache = new Map<string, THREE.Texture>();

  private yaw = 0;
  private pitch = 0;
  private targetYaw = 0;
  private targetPitch = 0;
  private fov = 75;
  private targetFov = 75;

  private dragging = false;
  private pointerId: number | null = null;
  private lastPointer = { x: 0, y: 0 };
  private velocity = { x: 0, y: 0 };
  private pinchDistance = 0;

  private autoRotate = false;
  private autoRotateSpeed = 0.035;
  private idleFrames = 0;

  private node: TourNode | null = null;
  private frame = 0;
  private disposed = false;
  private transition = 0;
  private transitioning = false;
  private dolly = 0;

  private measuring = false;
  private measurePoints: MeasurePoint[] = [];

  private keys = new Set<string>();
  private deviceOrientation: { alpha: number; beta: number; gamma: number } | null = null;
  private gyroEnabled = false;

  constructor(container: HTMLElement, options: EngineOptions) {
    this.container = container;
    this.options = options;

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
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      this.fov,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      1100,
    );
    this.scene.background = new THREE.Color('#0b0d10');

    this.bindEvents();
    this.loop();
  }

  // ------------------------------------------------------------------ input --

  private bindEvents() {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('touchstart', this.onTouchStart, { passive: false });
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onPointerDown = (event: PointerEvent) => {
    if (this.measuring) {
      this.addMeasurePoint(event);
      return;
    }
    this.dragging = true;
    this.pointerId = event.pointerId;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.velocity = { x: 0, y: 0 };
    this.idleFrames = 0;
    this.renderer.domElement.setPointerCapture(event.pointerId);
    this.renderer.domElement.style.cursor = 'grabbing';
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.dragging || event.pointerId !== this.pointerId) return;
    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    this.lastPointer = { x: event.clientX, y: event.clientY };

    // Drag sensitivity scales with FOV so zoomed-in panning stays proportional.
    const speed = (this.fov / 75) * 0.13;
    this.targetYaw -= dx * speed;
    this.targetPitch = clamp(this.targetPitch + dy * speed, -MAX_PITCH, MAX_PITCH);
    this.velocity = { x: -dx * speed, y: dy * speed };
  };

  private onPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId) return;
    this.dragging = false;
    this.pointerId = null;
    this.renderer.domElement.style.cursor = this.measuring ? 'crosshair' : 'grab';
  };

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    this.targetFov = clamp(this.targetFov + event.deltaY * 0.05, MIN_FOV, MAX_FOV);
    this.idleFrames = 0;
  };

  private onTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 2) {
      this.pinchDistance = touchDistance(event);
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
    this.keys.add(event.key);
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      this.idleFrames = 0;
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key);
  };

  // ------------------------------------------------------------- panoramas --

  /**
   * Loads a node. The 1024x512 preview paints almost immediately so the room is
   * legible within a frame or two; the 4096x2048 capture swaps in behind it.
   */
  async goTo(node: TourNode, options: { instant?: boolean; yaw?: number } = {}) {
    if (this.disposed) return;
    this.node = node;
    this.options.onLoadProgress(0.05);

    const previewUrl = `/panoramas/${node.pano}-preview.jpg`;
    const fullUrl = `/panoramas/${node.pano}.jpg`;

    const cached = this.textureCache.get(fullUrl);
    const texture = cached ?? (await this.load(previewUrl));
    this.options.onLoadProgress(cached ? 1 : 0.55);

    const mesh = this.buildSphere(texture);
    this.swap(mesh, options.instant === true);

    const startYaw = options.yaw ?? node.entryYaw;
    this.targetYaw = startYaw;
    this.yaw = options.instant ? startYaw : this.yaw;
    this.targetPitch = 0;

    if (!cached) {
      const full = await this.load(fullUrl);
      this.textureCache.set(fullUrl, full);
      if (this.disposed || this.node?.id !== node.id) return;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.map = full;
      material.needsUpdate = true;
    }
    this.options.onLoadProgress(1);
    this.options.onNodeReady(node.id);
  }

  /** Warms the texture cache for the rooms reachable from the current one. */
  prefetch(nodes: TourNode[]) {
    nodes.forEach((node) => {
      const url = `/panoramas/${node.pano}.jpg`;
      if (this.textureCache.has(url)) return;
      this.load(url)
        .then((texture) => this.textureCache.set(url, texture))
        .catch(() => undefined);
    });
  }

  private load(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
          resolve(texture);
        },
        undefined,
        reject,
      );
    });
  }

  private buildSphere(texture: THREE.Texture) {
    const geometry = new THREE.SphereGeometry(500, 72, 48);
    // Flip the sphere inside out so the texture faces the camera at the centre.
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    return new THREE.Mesh(geometry, material);
  }

  private swap(mesh: THREE.Mesh, instant: boolean) {
    if (!this.current || instant) {
      if (this.current) this.disposeMesh(this.current);
      if (this.incoming) this.disposeMesh(this.incoming);
      this.incoming = null;
      this.current = mesh;
      this.scene.add(mesh);
      this.transitioning = false;
      this.transition = 0;
      this.dolly = 0;
      return;
    }
    if (this.incoming) this.disposeMesh(this.incoming);
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0;
    mesh.renderOrder = 1;
    this.incoming = mesh;
    this.scene.add(mesh);
    this.transition = 0;
    this.transitioning = true;
    this.dolly = 0;
  }

  private disposeMesh(mesh: THREE.Mesh) {
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.dispose();
  }

  // ---------------------------------------------------------- view controls --

  setAutoRotate(enabled: boolean) {
    this.autoRotate = enabled;
    this.idleFrames = 0;
  }

  setMeasuring(enabled: boolean) {
    this.measuring = enabled;
    this.measurePoints = [];
    this.options.onMeasureUpdate([], null);
    this.renderer.domElement.style.cursor = enabled ? 'crosshair' : 'grab';
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
    this.targetYaw = yaw;
    this.targetPitch = clamp(pitch, -MAX_PITCH, MAX_PITCH);
    this.idleFrames = 0;
  }

  getView() {
    return { yaw: this.yaw, pitch: this.pitch, fov: this.fov };
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

  private onDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (event.alpha == null || event.beta == null || event.gamma == null) return;
    this.deviceOrientation = { alpha: event.alpha, beta: event.beta, gamma: event.gamma };
  };

  // ------------------------------------------------------------ measurement --

  private addMeasurePoint(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    const direction = raycaster.ray.direction.clone().normalize();

    this.measurePoints = [...this.measurePoints, {
      direction,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }].slice(-2);

    this.emitMeasurement();
  }

  private emitMeasurement() {
    if (this.measurePoints.length < 2) {
      this.options.onMeasureUpdate(this.measurePoints, null);
      return;
    }
    const [a, b] = this.measurePoints.map((point) => floorIntersection(point.direction));
    if (!a || !b) {
      this.options.onMeasureUpdate(this.measurePoints, null);
      return;
    }
    this.options.onMeasureUpdate(this.measurePoints, a.distanceTo(b));
  }

  // -------------------------------------------------------------- main loop --

  private loop = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.loop);

    // Keyboard look, so the tour is fully operable without a pointer.
    const step = (this.fov / 75) * 1.5;
    if (this.keys.has('ArrowLeft')) this.targetYaw -= step;
    if (this.keys.has('ArrowRight')) this.targetYaw += step;
    if (this.keys.has('ArrowUp')) this.targetPitch = clamp(this.targetPitch - step, -MAX_PITCH, MAX_PITCH);
    if (this.keys.has('ArrowDown')) this.targetPitch = clamp(this.targetPitch + step, -MAX_PITCH, MAX_PITCH);

    // Inertia after a flick, then idle auto-rotate.
    if (!this.dragging && (Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.y) > 0.01)) {
      this.targetYaw += this.velocity.x;
      this.targetPitch = clamp(this.targetPitch + this.velocity.y, -MAX_PITCH, MAX_PITCH);
      this.velocity.x *= 0.92;
      this.velocity.y *= 0.92;
    } else if (this.autoRotate && !this.dragging) {
      this.idleFrames += 1;
      if (this.idleFrames > 60) this.targetYaw += this.autoRotateSpeed;
    }

    if (this.gyroEnabled && this.deviceOrientation && !this.dragging) {
      this.targetYaw = -this.deviceOrientation.alpha;
      this.targetPitch = clamp(this.deviceOrientation.beta - 90, -MAX_PITCH, MAX_PITCH);
    }

    this.yaw += (this.targetYaw - this.yaw) * 0.12;
    this.pitch += (this.targetPitch - this.pitch) * 0.12;
    this.fov += (this.targetFov - this.fov) * 0.12;

    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    this.camera.quaternion.setFromEuler(
      new THREE.Euler(this.pitch * DEG, -this.yaw * DEG, 0, 'YXZ'),
    );

    if (this.transitioning && this.incoming) {
      this.transition = Math.min(1, this.transition + 0.045);
      const eased = easeInOutCubic(this.transition);
      (this.incoming.material as THREE.MeshBasicMaterial).opacity = eased;
      // A small forward dolly during the fade reads as physically moving.
      this.dolly = Math.sin(eased * Math.PI) * 14;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      this.camera.position.copy(forward.multiplyScalar(this.dolly));
      if (this.transition >= 1) {
        if (this.current) this.disposeMesh(this.current);
        this.current = this.incoming;
        this.current.renderOrder = 0;
        this.incoming = null;
        this.transitioning = false;
        this.camera.position.set(0, 0, 0);
      }
    }

    this.projectHotspots();
    this.options.onViewChange?.(this.yaw, this.pitch, this.fov);
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Projects each hotspot's spherical position into viewport pixels so React can
   * render them as ordinary DOM buttons — focusable, screen-reader friendly and
   * styleable with Tailwind, rather than as WebGL sprites.
   */
  private projectHotspots() {
    if (!this.node) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const projected: ScreenHotspot[] = [];
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

    this.node.hotspots.forEach((hotspot, index) => {
      const position = sphericalToVector(hotspot.yaw, hotspot.pitch, 300);
      const direction = position.clone().normalize();
      const facing = direction.dot(forward);
      const screen = position.clone().project(this.camera);
      const x = (screen.x * 0.5 + 0.5) * width;
      const y = (-screen.y * 0.5 + 0.5) * height;
      const inFrame =
        facing > 0.08 && x > -80 && x < width + 80 && y > -80 && y < height + 80;

      projected.push({
        node: this.node!,
        hotspot,
        x,
        y,
        // Hotspots nearer the view centre read slightly larger.
        scale: clamp(0.72 + facing * 0.45, 0.6, 1.15),
        visible: inFrame,
        key: `${this.node!.id}-${index}`,
      });
    });

    this.options.onHotspots(projected);

    if (this.measurePoints.length) {
      this.measurePoints = this.measurePoints.map((point) => {
        const projectedPoint = point.direction
          .clone()
          .multiplyScalar(300)
          .project(this.camera);
        return {
          ...point,
          x: (projectedPoint.x * 0.5 + 0.5) * width,
          y: (-projectedPoint.y * 0.5 + 0.5) * height,
        };
      });
      this.emitMeasurement();
    }
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  get canvas() {
    return this.renderer.domElement;
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
    el.removeEventListener('wheel', this.onWheel);
    el.removeEventListener('touchstart', this.onTouchStart);
    el.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.disableGyro();
    if (this.current) this.disposeMesh(this.current);
    if (this.incoming) this.disposeMesh(this.incoming);
    this.textureCache.forEach((texture) => texture.dispose());
    this.textureCache.clear();
    this.renderer.dispose();
    el.remove();
  }
}

// ------------------------------------------------------------------- utils --

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function touchDistance(event: TouchEvent) {
  const [a, b] = [event.touches[0], event.touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
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

/**
 * Where a view ray meets the floor plane, assuming a fixed camera height. Rays
 * pointing at or above the horizon never meet it, so those return null.
 */
function floorIntersection(direction: THREE.Vector3): THREE.Vector3 | null {
  if (direction.y >= -0.02) return null;
  const t = -EYE_HEIGHT / direction.y;
  return direction.clone().multiplyScalar(t);
}
