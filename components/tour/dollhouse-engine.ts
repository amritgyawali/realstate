import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PropertyTour, TourNode } from '@/lib/types';
import {
  EYE_HEIGHT,
  STOREY_HEIGHT,
  clamp,
  linkBetween,
  navHotspots,
  nodeById,
  nodeHeadings,
  planToWorld,
  roomOutlines,
  roomShape,
  type Point2,
} from '@/lib/tour-graph';

const DEG = Math.PI / 180;
const WALL_HEIGHT = 2.7;
const GOLD = 0xc5a869;

export interface DollhouseLabel {
  nodeId: string;
  x: number;
  y: number;
  visible: boolean;
}

export interface DollhouseOptions {
  onLabels: (labels: DollhouseLabel[]) => void;
  onHover?: (nodeId: string | null) => void;
  onSelect?: (nodeId: string) => void;
  reducedMotion?: boolean;
}

interface Room {
  node: TourNode;
  level: number;
  group: THREE.Group;
  material: THREE.ShaderMaterial;
  pickables: THREE.Mesh[];
  marker: THREE.Mesh;
  anchor: THREE.Vector3;
}

interface Flight {
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  duration: number;
  elapsed: number;
  resolve: () => void;
}

const ROOM_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// Each room is painted by projecting its own panorama from the capture point,
// so the dollhouse is built from the same 360° captures as the walk.
const ROOM_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uOrigin;
  uniform float uYaw;
  uniform float uOpacity;
  uniform float uHighlight;
  uniform float uLoaded;
  varying vec3 vWorld;

  const float PI = 3.141592653589793;

  void main() {
    vec3 d = vWorld - uOrigin;
    float c = cos(uYaw);
    float s = sin(uYaw);
    vec3 r = normalize(vec3(d.x * c - d.z * s, d.y, d.x * s + d.z * c));
    float u = atan(r.z, r.x) / (2.0 * PI);
    float v = 0.5 + asin(clamp(r.y, -1.0, 1.0)) / PI;

    // Mip selection from whichever of two seam placements is continuous here,
    // so the wrap in u doesn't draw a seam down the back wall.
    float u1 = fract(u);
    float u2 = fract(u + 0.5) - 0.5;
    vec2 g1 = vec2(dFdx(u1), dFdy(u1));
    vec2 g2 = vec2(dFdx(u2), dFdy(u2));
    vec2 gu = dot(g1, g1) < dot(g2, g2) ? g1 : g2;
    vec2 uv = vec2(u1, v);
    vec3 colour = textureGrad(uMap, uv, vec2(gu.x, dFdx(v)), vec2(gu.y, dFdy(v))).rgb;
    colour = mix(vec3(0.16, 0.17, 0.18), colour, uLoaded);
    colour = mix(colour, colour * 1.12 + vec3(0.07, 0.055, 0.025), uHighlight);

    gl_FragColor = vec4(colour, uOpacity);
    #include <colorspace_fragment>
  }
`;

/**
 * A real 3D dollhouse of the tour.
 *
 * Rooms are the walk graph's Voronoi outlines (see `roomOutlines`), extruded
 * into walls and stacked by floor. Walls face inwards and back faces are
 * culled, so whichever walls stand between the camera and a room drop away —
 * the cut-away look of a doll's house — and the camera can orbit freely.
 *
 * Choosing a room flies the camera down to eye height at a capture point, which
 * is the hand-off back to the walk: from there the panorama engine takes over.
 */
export class DollhouseEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private container: HTMLElement;
  private tour: PropertyTour;
  private options: DollhouseOptions;
  private loader = new THREE.TextureLoader();

  private rooms: Room[] = [];
  private headings: Map<string, number>;
  private routeGroup = new THREE.Group();
  private routeCurve: THREE.CurvePath<THREE.Vector3> | null = null;
  private routeBead: THREE.Mesh;
  private activeRing: THREE.Mesh;
  private textures: THREE.Texture[] = [];

  private activeId: string | null = null;
  private hoverId: string | null = null;
  private visibleLevel: number | 'all' = 'all';
  private flight: Flight | null = null;
  private pointer = new THREE.Vector2();
  private pointerDown = { x: 0, y: 0 };
  private raycaster = new THREE.Raycaster();
  private centre = new THREE.Vector3();
  private lastSignature = '';
  private orbitHeld = false;
  private clock = new THREE.Clock();
  private frame = 0;
  private disposed = false;

  constructor(container: HTMLElement, tour: PropertyTour, options: DollhouseOptions) {
    this.container = container;
    this.tour = tour;
    this.options = options;
    this.headings = nodeHeadings(tour);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color('#0c1013');
    this.camera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.05,
      400,
    );

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 70;
    this.controls.minPolarAngle = 6 * DEG;
    this.controls.maxPolarAngle = 80 * DEG;
    this.controls.screenSpacePanning = true;
    this.controls.autoRotate = !options.reducedMotion;
    this.controls.autoRotateSpeed = 0.55;
    this.controls.addEventListener('start', () => {
      this.controls.autoRotate = false;
    });

    this.buildGround();
    this.buildRooms();
    this.buildGraph();

    this.activeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.46, 48),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, depthWrite: false }),
    );
    this.activeRing.rotation.x = -Math.PI / 2;
    this.scene.add(this.activeRing);

    this.routeBead = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xfff4dc }),
    );
    this.routeBead.visible = false;
    this.scene.add(this.routeGroup, this.routeBead);

    this.frameHouse();

    const el = this.renderer.domElement;
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointerleave', this.onPointerLeave);
    this.loop();
  }

  // ------------------------------------------------------------ public API --

  /** Highlights a room from outside the canvas (its label is hovered). */
  highlight(nodeId: string | null) {
    this.setHover(nodeId);
  }

  setActive(nodeId: string) {
    this.activeId = nodeId;
    const room = this.rooms.find((r) => r.node.id === nodeId);
    if (room) this.activeRing.position.copy(room.anchor).setY(room.anchor.y + 0.03);
  }

  /** Floors above the chosen one are lifted off; floors below are ghosted. */
  setLevel(level: number | 'all') {
    this.visibleLevel = level;
    this.rooms.forEach((room) => {
      const above = level !== 'all' && room.level > level;
      const below = level !== 'all' && room.level < level;
      room.group.visible = !above;
      room.material.uniforms.uOpacity.value = below ? 0.22 : 1;
      room.material.transparent = below;
      room.material.depthWrite = !below;
      room.marker.visible = !below;
    });
    this.lastSignature = '';
  }

  /** Draws a route through the house, with a bead walking along it. */
  setRoute(path: string[]) {
    this.routeGroup.clear();
    this.routeCurve = null;
    this.routeBead.visible = false;
    if (path.length < 2) return;
    const points = path
      .map((id) => this.rooms.find((r) => r.node.id === id))
      .filter((r): r is Room => Boolean(r))
      .map((r) => r.anchor.clone().setY(r.anchor.y + 0.12));
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < points.length - 1; i += 1) {
      curve.add(new THREE.LineCurve3(points[i], points[i + 1]));
    }
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, Math.max(24, points.length * 24), 0.07, 8, false),
      new THREE.MeshBasicMaterial({ color: GOLD }),
    );
    this.routeGroup.add(tube);
    this.routeCurve = curve;
    this.routeBead.visible = true;
  }

  /** Pulls the camera out of a room, from eye height to the overview. */
  introFrom(nodeId: string, yaw: number) {
    const eye = this.eyeAt(nodeId, yaw);
    if (!eye || this.options.reducedMotion) return;
    const endPosition = this.camera.position.clone();
    const endTarget = this.controls.target.clone();
    this.camera.position.copy(eye.position);
    this.controls.target.copy(eye.target);
    this.fly(endPosition, endTarget, 1.5);
  }

  /** Descends to eye height at a capture point, facing along `yaw`. */
  flyInto(nodeId: string, yaw: number): Promise<void> {
    const eye = this.eyeAt(nodeId, yaw);
    if (!eye || this.options.reducedMotion) return Promise.resolve();
    this.controls.autoRotate = false;
    return this.fly(eye.position, eye.target, 1.25);
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

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    const el = this.renderer.domElement;
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    this.controls.dispose();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
    this.textures.forEach((texture) => texture.dispose());
    this.renderer.dispose();
    el.remove();
  }

  // ------------------------------------------------------------- building --

  private levelY(level: number) {
    const lowest = Math.min(...this.tour.floors.map((f) => f.level), 1);
    return (level - lowest) * STOREY_HEIGHT;
  }

  private buildGround() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(197,168,105,0.16)');
    gradient.addColorStop(0.55, 'rgba(197,168,105,0.05)');
    gradient.addColorStop(1, 'rgba(197,168,105,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(texture);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.04;
    this.scene.add(ground);
  }

  private buildRooms() {
    const outlines = roomOutlines(this.tour);
    this.tour.nodes.forEach((node) => {
      const outline = outlines.get(node.id);
      if (!outline || outline.length < 3) return;
      const baseY = this.levelY(node.floor);
      const capture = planToWorld(node.plan);
      const shape = roomShape(node);
      const heading = this.headings.get(node.id) ?? 0;

      const texture = this.loader.load(`/panoramas/${node.pano}-preview.jpg`, () => {
        material.uniforms.uLoaded.value = 1;
        this.lastSignature = '';
      });
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      this.textures.push(texture);

      const material = new THREE.ShaderMaterial({
        vertexShader: ROOM_VERTEX,
        fragmentShader: ROOM_FRAGMENT,
        side: THREE.FrontSide,
        uniforms: {
          uMap: { value: texture },
          uOrigin: { value: new THREE.Vector3(capture.x, baseY + EYE_HEIGHT, capture.z) },
          // World bearing minus the node's heading is its pano yaw.
          uYaw: { value: -heading * DEG },
          uOpacity: { value: 1 },
          uHighlight: { value: 0 },
          uLoaded: { value: 0 },
        },
      });

      const group = new THREE.Group();
      const floorShape = new THREE.Shape(outline.map((p) => new THREE.Vector2(p.x, -p.z)));
      const floor = new THREE.Mesh(new THREE.ShapeGeometry(floorShape), material);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = baseY;
      group.add(floor);
      const pickables: THREE.Mesh[] = [floor];

      const trim = new THREE.LineBasicMaterial({
        color: shape.outdoor ? 0x8a8f94 : GOLD,
        transparent: true,
        opacity: shape.outdoor ? 0.45 : 0.7,
      });
      if (!shape.outdoor) {
        const walls = new THREE.Mesh(wallGeometry(outline, baseY, WALL_HEIGHT), material);
        group.add(walls);
        pickables.push(walls);
        group.add(outlineLines(outline, baseY + WALL_HEIGHT, trim));
      } else {
        // Decks and terraces get a railing line instead of walls.
        group.add(outlineLines(outline, baseY + 1.05, trim));
      }
      group.add(outlineLines(outline, baseY + 0.01, trim));

      const anchor = new THREE.Vector3(capture.x, baseY, capture.z);
      const marker = new THREE.Mesh(
        new THREE.CircleGeometry(0.24, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }),
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.copy(anchor).setY(baseY + 0.025);
      group.add(marker);

      pickables.forEach((mesh) => {
        mesh.userData.nodeId = node.id;
      });
      this.scene.add(group);
      this.rooms.push({ node, level: node.floor, group, material, pickables, marker, anchor });
    });
  }

  /** The walk graph drawn on the floors: doors as lines, stairs dashed. */
  private buildGraph() {
    const seen = new Set<string>();
    const flat: number[] = [];
    const stairs: number[] = [];
    this.tour.nodes.forEach((node) => {
      navHotspots(node).forEach((hotspot) => {
        const key = [node.id, hotspot.to].sort().join('~');
        if (seen.has(key)) return;
        seen.add(key);
        const link = linkBetween(this.tour, node.id, hotspot.to);
        const target = nodeById(this.tour, hotspot.to);
        if (!link || !target) return;
        const a = planToWorld(node.plan);
        const b = planToWorld(target.plan);
        const list = link.levels === 0 ? flat : stairs;
        list.push(a.x, this.levelY(node.floor) + 0.05, a.z, b.x, this.levelY(target.floor) + 0.05, b.z);
      });
    });
    const flatGeometry = new THREE.BufferGeometry();
    flatGeometry.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
    this.scene.add(
      new THREE.LineSegments(
        flatGeometry,
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }),
      ),
    );
    const stairGeometry = new THREE.BufferGeometry();
    stairGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stairs, 3));
    const stairLines = new THREE.LineSegments(
      stairGeometry,
      new THREE.LineDashedMaterial({ color: GOLD, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.8 }),
    );
    stairLines.computeLineDistances();
    this.scene.add(stairLines);
  }

  /** Frames the whole house from a three-quarter view. */
  private frameHouse() {
    const box = new THREE.Box3();
    this.rooms.forEach((room) => box.expandByObject(room.group));
    if (box.isEmpty()) return;
    box.getCenter(this.centre);
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.z, 8) * 0.5;
    const distance = radius / Math.tan((this.camera.fov * DEG) / 2) * 1.05;
    this.controls.target.copy(this.centre);
    this.camera.position.set(
      this.centre.x + distance * 0.55,
      this.centre.y + distance * 0.72,
      this.centre.z + distance * 0.62,
    );
    this.controls.maxDistance = distance * 2.2;
    this.controls.update();
  }

  private eyeAt(nodeId: string, yaw: number) {
    const room = this.rooms.find((r) => r.node.id === nodeId);
    if (!room) return null;
    const bearing = (this.headings.get(nodeId) ?? 0) + yaw;
    const position = room.anchor.clone().setY(room.anchor.y + EYE_HEIGHT);
    const target = position
      .clone()
      .add(new THREE.Vector3(Math.sin(bearing * DEG), -0.05, -Math.cos(bearing * DEG)).multiplyScalar(0.6));
    return { position, target };
  }

  private fly(position: THREE.Vector3, target: THREE.Vector3, duration: number) {
    return new Promise<void>((resolve) => {
      this.flight?.resolve();
      this.controls.enabled = false;
      this.flight = {
        fromPosition: this.camera.position.clone(),
        toPosition: position.clone(),
        fromTarget: this.controls.target.clone(),
        toTarget: target.clone(),
        duration,
        elapsed: 0,
        resolve,
      };
    });
  }

  // ---------------------------------------------------------------- input --

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.pick();
  };

  private onPointerDown = (event: PointerEvent) => {
    this.pointerDown = { x: event.clientX, y: event.clientY };
  };

  private onPointerUp = (event: PointerEvent) => {
    const moved = Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y);
    if (moved > 5 || this.flight) return;
    this.onPointerMove(event);
    if (this.hoverId) this.options.onSelect?.(this.hoverId);
  };

  private onPointerLeave = () => {
    this.setHover(null);
  };

  private pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const pickables = this.rooms
      .filter((room) => room.group.visible && room.material.uniforms.uOpacity.value > 0.5)
      .flatMap((room) => room.pickables);
    const hit = this.raycaster.intersectObjects(pickables, false)[0];
    this.setHover((hit?.object.userData.nodeId as string | undefined) ?? null);
  }

  private setHover(nodeId: string | null) {
    if (nodeId === this.hoverId) return;
    this.hoverId = nodeId;
    // Hold the orbit still while a room is being pointed at, so it can be clicked.
    this.orbitHeld = Boolean(nodeId);
    this.renderer.domElement.style.cursor = nodeId ? 'pointer' : 'grab';
    this.options.onHover?.(nodeId);
  }

  // ----------------------------------------------------------- main loop ---

  private loop = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    const time = this.clock.elapsedTime;

    if (this.flight) {
      const flight = this.flight;
      flight.elapsed = Math.min(flight.duration, flight.elapsed + dt);
      const t = easeInOutCubic(flight.elapsed / flight.duration);
      this.camera.position.lerpVectors(flight.fromPosition, flight.toPosition, t);
      this.controls.target.lerpVectors(flight.fromTarget, flight.toTarget, t);
      this.camera.lookAt(this.controls.target);
      if (flight.elapsed >= flight.duration) {
        this.flight = null;
        this.controls.enabled = true;
        flight.resolve();
      }
    } else {
      const spin = this.controls.autoRotate;
      if (this.orbitHeld) this.controls.autoRotate = false;
      this.controls.update();
      this.controls.autoRotate = spin;
    }

    this.rooms.forEach((room) => {
      const target = room.node.id === this.hoverId ? 1 : 0;
      const u = room.material.uniforms.uHighlight;
      u.value += (target - u.value) * (1 - Math.exp(-dt * 10));
      const marker = room.marker.material as THREE.MeshBasicMaterial;
      marker.color.setHex(room.node.id === this.activeId ? GOLD : 0xffffff);
    });

    const pulse = this.options.reducedMotion ? 1 : 1 + Math.sin(time * 3) * 0.14;
    this.activeRing.scale.setScalar(pulse);
    const activeRoom = this.rooms.find((r) => r.node.id === this.activeId);
    this.activeRing.visible = Boolean(activeRoom?.group.visible);

    if (this.routeCurve && this.routeBead.visible) {
      const t = (time * 0.22) % 1;
      this.routeBead.position.copy(this.routeCurve.getPointAt(t));
    }

    this.emitLabels();
    this.renderer.render(this.scene, this.camera);
  };

  private emitLabels() {
    const signature = [
      ...this.camera.matrixWorld.elements.map((v) => v.toFixed(3)),
      this.container.clientWidth,
      this.container.clientHeight,
      this.visibleLevel,
    ].join('|');
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const view = new THREE.Vector3();
    this.options.onLabels(
      this.rooms.map((room) => {
        const point = room.anchor.clone().setY(room.anchor.y + 0.5);
        view.copy(point).applyMatrix4(this.camera.matrixWorldInverse);
        const screen = point.project(this.camera);
        return {
          nodeId: room.node.id,
          x: (screen.x * 0.5 + 0.5) * width,
          y: (-screen.y * 0.5 + 0.5) * height,
          visible:
            room.group.visible && room.marker.visible && view.z < -0.5 && Math.abs(screen.x) < 1.1 && Math.abs(screen.y) < 1.1,
        };
      }),
    );
  }
}

// ------------------------------------------------------------------- utils --

/** Walls around an outline, each quad wound to face into the room. */
function wallGeometry(outline: Point2[], baseY: number, height: number) {
  const centre = outline.reduce(
    (acc, p) => ({ x: acc.x + p.x / outline.length, z: acc.z + p.z / outline.length }),
    { x: 0, z: 0 },
  );
  const positions: number[] = [];
  outline.forEach((p, index) => {
    const q = outline[(index + 1) % outline.length];
    const ex = q.x - p.x;
    const ez = q.z - p.z;
    if (Math.hypot(ex, ez) < 0.05) return;
    const a = [p.x, baseY, p.z];
    const b = [q.x, baseY, q.z];
    const c = [q.x, baseY + height, q.z];
    const d = [p.x, baseY + height, p.z];
    // (a, b, c) has normal (-ez, 0, ex); keep it if that points inwards.
    const inward = (-ez) * (centre.x - (p.x + q.x) / 2) + ex * (centre.z - (p.z + q.z) / 2) > 0;
    const tris = inward ? [a, b, c, a, c, d] : [a, c, b, a, d, c];
    tris.forEach((v) => positions.push(...v));
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function outlineLines(outline: Point2[], y: number, material: THREE.LineBasicMaterial) {
  const points = outline.map((p) => new THREE.Vector3(p.x, y, p.z));
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material);
}

function easeInOutCubic(t: number) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}
