import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PropertyTour, TourSite } from '@/lib/types';
import { floorBounds } from '@/lib/tour/layout';
import { Builder } from './build-house';
import type { Palette } from './materials';
import { seeded } from './textures';

/**
 * The world around the house: sky, sun, ground, street and planting.
 *
 * All of it is procedural — a sky shader with clouds and a mountain, mesa or
 * sea horizon, a few instanced tree species — so the exterior needs no assets
 * and reads as the listing's setting: a snowy valley, a coastline, a desert.
 */

export interface EnvironmentBuild {
  /** Ground, sea and street. */
  group: THREE.Group;
  /** Trees and rocks, hidden in the dollhouse so the house stays in view. */
  planting: THREE.Group;
  /** Sun and sky light; always on, whatever else is hidden. */
  lights: THREE.Group;
  /** The rendered sky, used as the scene background. */
  background: THREE.Texture;
  sun: THREE.DirectionalLight;
  environmentMap: THREE.Texture | null;
  horizon: THREE.Color;
  dispose: () => void;
}

interface SettingLook {
  zenith: string;
  horizon: string;
  sun: string;
  hemiSky: string;
  hemiGround: string;
  farRidge: string;
  nearRidge: string;
  snow: number;
  farBase: number;
  farAmp: number;
  nearBase: number;
  nearAmp: number;
  mesa: number;
  clouds: number;
}

const LOOKS: Record<TourSite['setting'], SettingLook> = {
  alpine: {
    zenith: '#4a7cb6',
    horizon: '#dde7f0',
    sun: '#fff1dc',
    hemiSky: '#e3edf7',
    hemiGround: '#8f96a0',
    farRidge: '#8ea3b9',
    nearRidge: '#3c4c44',
    snow: 1,
    farBase: 0.015,
    farAmp: 0.21,
    nearBase: -0.03,
    nearAmp: 0.16,
    mesa: 0,
    clouds: 0.7,
  },
  coastal: {
    zenith: '#3f86c4',
    horizon: '#dbe9f2',
    sun: '#fff4e0',
    hemiSky: '#e8f2fa',
    hemiGround: '#8c8470',
    farRidge: '#8fa39a',
    nearRidge: '#5d7054',
    snow: 0,
    farBase: -0.03,
    farAmp: 0.09,
    nearBase: -0.1,
    nearAmp: 0.05,
    mesa: 0,
    clouds: 0.55,
  },
  desert: {
    zenith: '#3b78b5',
    horizon: '#efe4d3',
    sun: '#fff0d6',
    hemiSky: '#f4ebdd',
    hemiGround: '#a58a68',
    farRidge: '#c39b7a',
    nearRidge: '#a4684a',
    snow: 0,
    farBase: 0.0,
    farAmp: 0.2,
    nearBase: -0.02,
    nearAmp: 0.14,
    mesa: 1,
    clouds: 0.35,
  },
};

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vDir = world.xyz - cameraPosition;
    gl_Position = projectionMatrix * viewMatrix * world;
    gl_Position.z = gl_Position.w;
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 sunColor;
  uniform vec3 sunDir;
  uniform vec3 farRidge;
  uniform vec3 nearRidge;
  uniform vec3 groundFar;
  uniform float snow;
  uniform float farBase;
  uniform float farAmp;
  uniform float nearBase;
  uniform float nearAmp;
  uniform float mesa;
  uniform float clouds;
  varying vec3 vDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  // Ridged noise gives sharp crests; sampling on a circle wraps the horizon
  // without a seam.
  float ridged(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 6; i++) {
      float n = 1.0 - abs(noise(p) * 2.0 - 1.0);
      v += a * n * n;
      p *= 2.07;
      a *= 0.5;
    }
    return v;
  }
  float ridge(float az, float scale, float seed) {
    return ridged(vec2(cos(az), sin(az)) * scale + seed);
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 colour = mix(horizon, zenith, pow(clamp(h, 0.0, 1.0), 0.5));
    float s = max(dot(d, sunDir), 0.0);
    colour += sunColor * (pow(s, 1400.0) * 10.0 + pow(s, 28.0) * 0.22 + pow(s, 4.0) * 0.07);

    if (h > 0.0) {
      vec2 p = d.xz / (h + 0.16) * 1.1;
      float c = fbm(p * 1.3 + vec2(7.3, 1.1));
      c = smoothstep(0.52, 0.88, c) * smoothstep(0.0, 0.18, h);
      float lit = 0.85 + 0.15 * s;
      colour = mix(colour, vec3(lit), c * clouds);
    }

    float az = atan(d.x, -d.z);
    float far = farBase + farAmp * ridge(az, 2.2, 3.1);
    if (mesa > 0.5) far = min(far, farBase + farAmp * 0.42);
    if (h < far) {
      float depth = clamp((far - h) / max(0.02, far - farBase), 0.0, 1.0);
      vec3 rock = farRidge;
      if (mesa > 0.5) rock *= 0.92 + 0.08 * sin(h * 260.0);
      if (snow > 0.5) {
        float line = smoothstep(0.42, 0.3, depth);
        rock = mix(rock, vec3(0.94, 0.96, 0.99), line);
      }
      // Distant ranges fade into the haze toward their base.
      colour = mix(rock, horizon, 0.28 + 0.35 * depth);
    }
    float near = nearBase + nearAmp * ridge(az + 1.3, 3.4, 11.7);
    if (mesa > 0.5) near = min(near, nearBase + nearAmp * 0.4);
    if (h < near) {
      float depth = clamp((near - h) / max(0.02, near - nearBase), 0.0, 1.0);
      vec3 rock = nearRidge * (0.8 + 0.35 * noise(vec2(az * 60.0, h * 140.0)));
      if (mesa > 0.5) rock *= 0.9 + 0.1 * sin(h * 320.0);
      if (snow > 0.5) {
        float line = smoothstep(0.3, 0.16, depth) * (0.75 + 0.25 * noise(vec2(az * 90.0, 3.0)));
        rock = mix(rock, vec3(0.92, 0.94, 0.97), line);
      }
      colour = mix(rock, horizon, 0.12 + 0.25 * depth);
    }
    if (h < 0.0) colour = mix(colour, groundFar, clamp(-h * 5.0, 0.0, 1.0));

    gl_FragColor = vec4(colour, 1.0);
    #include <colorspace_fragment>
  }
`;

export function buildEnvironment(
  tour: PropertyTour,
  palette: Palette,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
): EnvironmentBuild {
  const site = tour.site;
  const look = LOOKS[site.setting];
  const group = new THREE.Group();
  group.name = 'environment';
  const planting = new THREE.Group();
  planting.name = 'planting';
  const lights = new THREE.Group();
  lights.name = 'lights';
  const grade = -site.plinth;
  const disposables: { dispose: () => void }[] = [];

  const sunDir = new THREE.Vector3(-0.52, 0.6, 0.6).normalize();
  const horizon = new THREE.Color(look.horizon);

  // ------------------------------------------------------------------ sky --
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      zenith: { value: new THREE.Color(look.zenith) },
      horizon: { value: horizon.clone() },
      sunColor: { value: new THREE.Color(look.sun) },
      sunDir: { value: sunDir },
      farRidge: { value: new THREE.Color(look.farRidge) },
      nearRidge: { value: new THREE.Color(look.nearRidge) },
      groundFar: {
        value: new THREE.Color(
          site.setting === 'alpine' ? '#e9eef3' : site.setting === 'desert' ? '#d6c1a1' : '#5d7a5a',
        ),
      },
      snow: { value: look.snow },
      farBase: { value: look.farBase },
      farAmp: { value: look.farAmp },
      nearBase: { value: look.nearBase },
      nearAmp: { value: look.nearAmp },
      mesa: { value: look.mesa },
      clouds: { value: look.clouds },
    },
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 32), skyMaterial);
  sky.frustumCulled = false;
  disposables.push(sky.geometry, skyMaterial);

  // The sky never changes, so it is rendered once into a cube map and used as
  // the background — a texture lookup per pixel instead of a noise field — and
  // prefiltered once more for glass and metal reflections.
  const skyScene = new THREE.Scene();
  skyScene.add(sky);
  const cubeTarget = new THREE.WebGLCubeRenderTarget(1024, { type: THREE.HalfFloatType });
  cubeTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
  const cubeCamera = new THREE.CubeCamera(0.5, 2000, cubeTarget);
  const toneMapping = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  cubeCamera.update(renderer, skyScene);
  renderer.toneMapping = toneMapping;
  scene.background = cubeTarget.texture;
  disposables.push(cubeTarget);

  let environmentMap: THREE.Texture | null = null;
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    environmentMap = pmrem.fromCubemap(cubeTarget.texture).texture;
    pmrem.dispose();
    scene.environment = environmentMap;
    disposables.push(environmentMap);
  } catch {
    environmentMap = null;
  }

  scene.fog = new THREE.Fog(horizon.clone(), 70, 560);

  // --------------------------------------------------------------- lights --
  const hemi = new THREE.HemisphereLight(look.hemiSky, look.hemiGround, 1.35);
  const bounds = floorBounds(tour);
  const centre = new THREE.Vector3(bounds.x + bounds.w / 2, 0, bounds.z + bounds.d / 2);
  const sun = new THREE.DirectionalLight(look.sun, 2.7);
  sun.position.copy(centre).addScaledVector(sunDir, 90);
  sun.target.position.copy(centre);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const extent = Math.max(bounds.w, bounds.d) / 2 + 22;
  sun.shadow.camera.left = -extent;
  sun.shadow.camera.right = extent;
  sun.shadow.camera.top = extent;
  sun.shadow.camera.bottom = -extent;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 200;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  lights.add(hemi, sun, sun.target);

  // --------------------------------------------------------------- ground --
  const groundGeometry = new THREE.CircleGeometry(site.setting === 'coastal' ? 95 : 700, 64);
  groundGeometry.rotateX(-Math.PI / 2);
  scaleUV(groundGeometry, site.setting === 'coastal' ? 190 : 1400);
  const ground = new THREE.Mesh(groundGeometry, palette.ground);
  ground.position.set(centre.x, grade - 0.01, centre.z);
  ground.receiveShadow = true;
  ground.userData.space = 'outside';
  ground.userData.surface = 'ground';
  group.add(ground);
  disposables.push(groundGeometry);

  if (site.setting === 'coastal') {
    const beach = new THREE.RingGeometry(94, 118, 64);
    beach.rotateX(-Math.PI / 2);
    const sand = palette.concrete.clone();
    sand.color = new THREE.Color('#e3d2b0');
    sand.map = null;
    const beachMesh = new THREE.Mesh(beach, sand);
    beachMesh.position.set(centre.x, grade - 0.12, centre.z);
    const sea = new THREE.CircleGeometry(900, 64);
    sea.rotateX(-Math.PI / 2);
    const seaMesh = new THREE.Mesh(sea, palette.water);
    seaMesh.position.set(centre.x, grade - 0.5, centre.z);
    group.add(beachMesh, seaMesh);
    disposables.push(beach, sea, sand);
  }

  // --------------------------------------------------------------- street --
  const approach = site.approach;
  if (approach.length >= 2) {
    const kerb = approach[0];
    const next = approach[1];
    const away = new THREE.Vector2(kerb.x - next.x, kerb.z - next.z).normalize();
    const along = new THREE.Vector2(-away.y, away.x);
    const road = new Builder();
    const walk = new Builder();
    const point = (offset: number, run: number) => ({
      x: kerb.x + away.x * offset + along.x * run,
      z: kerb.z + away.y * offset + along.y * run,
    });
    road.strip(point(4.6, -220), point(4.6, 220), grade + 0.004, 7.2);
    walk.strip(point(0.4, -220), point(0.4, 220), grade + 0.05, 2.2);
    const roadMesh = new THREE.Mesh(road.build(), palette.asphalt);
    roadMesh.receiveShadow = true;
    const walkMesh = new THREE.Mesh(walk.build(), palette.concrete);
    walkMesh.receiveShadow = true;
    group.add(roadMesh, walkMesh);
    disposables.push(roadMesh.geometry, walkMesh.geometry);
  }

  // ------------------------------------------------------------- planting --
  plant(tour, palette, centre).forEach((mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    planting.add(mesh);
    disposables.push(mesh.geometry);
  });

  return {
    group,
    planting,
    lights,
    background: cubeTarget.texture,
    sun,
    environmentMap,
    horizon,
    dispose: () => disposables.forEach((item) => item.dispose()),
  };
}

// ------------------------------------------------------------- planting ---

function plant(tour: PropertyTour, palette: Palette, centre: THREE.Vector3) {
  const site = tour.site;
  const random = seeded(tour.title.length * 131 + 7);
  const grade = -site.plinth;
  const bounds = floorBounds(tour);
  const radius = Math.max(bounds.w, bounds.d) / 2;

  const keepClear = (x: number, z: number, margin: number) => {
    if (
      tour.nodes.some(
        (node) =>
          x > node.rect.x - margin &&
          x < node.rect.x + node.rect.w + margin &&
          z > node.rect.z - margin &&
          z < node.rect.z + node.rect.d + margin,
      )
    ) {
      return false;
    }
    const path = site.approach;
    for (let i = 0; i < path.length - 1; i += 1) {
      if (distanceToSegment(x, z, path[i], path[i + 1]) < margin + 1.5) return false;
    }
    // Keep the street and the verge in front of the house open.
    if (path.length) {
      const kerb = path[0];
      const next = path[path.length > 1 ? 1 : 0];
      const away = new THREE.Vector2(kerb.x - next.x, kerb.z - next.z).normalize();
      const offset = (x - kerb.x) * away.x + (z - kerb.z) * away.y;
      if (offset > -2.5 && offset < 10) return false;
    }
    return true;
  };

  const species =
    site.setting === 'alpine'
      ? [{ geometry: pine(), count: 90, scale: [0.8, 1.5] as [number, number] }]
      : site.setting === 'coastal'
        ? [
            { geometry: palm(), count: 28, scale: [0.85, 1.25] as [number, number] },
            { geometry: roundTree('#5f7f45'), count: 26, scale: [0.7, 1.1] as [number, number] },
            { geometry: shrub('#6c8a4d'), count: 50, scale: [0.6, 1.3] as [number, number] },
          ]
        : [
            { geometry: palm(), count: 16, scale: [0.9, 1.3] as [number, number] },
            { geometry: roundTree('#7c8a55'), count: 14, scale: [0.6, 0.9] as [number, number] },
            { geometry: shrub('#8c8a5c'), count: 60, scale: [0.4, 1.0] as [number, number] },
            { geometry: rock(), count: 30, scale: [0.4, 1.4] as [number, number] },
          ];
  if (site.setting === 'alpine') {
    species.push({ geometry: rock(), count: 26, scale: [0.5, 1.6] });
  }

  const dummy = new THREE.Object3D();
  return species.map(({ geometry, count, scale }) => {
    const mesh = new THREE.InstancedMesh(geometry, palette.foliage, count);
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 40) {
      attempts += 1;
      const angle = random() * Math.PI * 2;
      const ring = radius + 5 + Math.pow(random(), 0.7) * (site.setting === 'coastal' ? 55 : 70);
      const x = centre.x + Math.cos(angle) * ring;
      const z = centre.z + Math.sin(angle) * ring;
      if (!keepClear(x, z, 2.5)) continue;
      const s = scale[0] + random() * (scale[1] - scale[0]);
      dummy.position.set(x, grade, z);
      dummy.rotation.set(0, random() * Math.PI * 2, 0);
      dummy.scale.set(s, s * (0.9 + random() * 0.25), s);
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      placed += 1;
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  });
}

function coloured(geometry: THREE.BufferGeometry, colour: string) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const c = new THREE.Color(colour);
  const count = flat.getAttribute('position').count;
  const colours = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const shade = 0.9 + ((i * 7919) % 13) / 60;
    colours[i * 3] = c.r * shade;
    colours[i * 3 + 1] = c.g * shade;
    colours[i * 3 + 2] = c.b * shade;
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  if (!flat.getAttribute('uv')) {
    flat.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  return flat;
}

function merge(parts: THREE.BufferGeometry[]) {
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  return merged ?? new THREE.BufferGeometry();
}

function pine() {
  const trunk = coloured(new THREE.CylinderGeometry(0.12, 0.2, 1.6, 7).translate(0, 0.8, 0), '#4a3526');
  const tiers = [
    [2.0, 3.2, 1.9],
    [1.55, 2.8, 3.6],
    [1.05, 2.4, 5.1],
  ].map(([r, h, y]) => coloured(new THREE.ConeGeometry(r, h, 9).translate(0, y, 0), '#2f4a36'));
  const caps = [
    [1.4, 1.2, 2.9],
    [1.0, 1.0, 4.5],
    [0.6, 0.9, 6.0],
  ].map(([r, h, y]) => coloured(new THREE.ConeGeometry(r, h, 9).translate(0, y, 0), '#e8eef3'));
  return merge([trunk, ...tiers, ...caps]);
}

function roundTree(colour: string) {
  const trunk = coloured(new THREE.CylinderGeometry(0.1, 0.18, 2.2, 7).translate(0, 1.1, 0), '#5a4332');
  const crown = coloured(new THREE.IcosahedronGeometry(1.7, 1).scale(1, 0.8, 1).translate(0, 3.1, 0), colour);
  const crown2 = coloured(new THREE.IcosahedronGeometry(1.1, 1).translate(0.9, 3.6, 0.4), colour);
  return merge([trunk, crown, crown2]);
}

function palm() {
  const segments: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i += 1) {
    segments.push(
      coloured(
        new THREE.CylinderGeometry(0.16 - i * 0.012, 0.19 - i * 0.012, 1.1, 7).translate(i * 0.06, 0.55 + i * 1.05, 0),
        i % 2 ? '#7a6248' : '#6c563f',
      ),
    );
  }
  for (let i = 0; i < 9; i += 1) {
    const frond = new THREE.ConeGeometry(0.35, 2.6, 4);
    frond.scale(1, 1, 0.25);
    frond.translate(0, 1.3, 0);
    frond.rotateZ(-1.15 - (i % 3) * 0.12);
    frond.rotateY((i / 9) * Math.PI * 2);
    frond.translate(0.36, 6.4, 0);
    segments.push(coloured(frond, i % 2 ? '#4f7a3b' : '#5d8a44'));
  }
  return merge(segments);
}

function shrub(colour: string) {
  return merge([coloured(new THREE.IcosahedronGeometry(0.7, 0).scale(1, 0.7, 1).translate(0, 0.35, 0), colour)]);
}

function rock() {
  return merge([coloured(new THREE.DodecahedronGeometry(0.8, 0).scale(1.2, 0.6, 1).translate(0, 0.2, 0), '#8d8a84')]);
}

function scaleUV(geometry: THREE.BufferGeometry, scale: number) {
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) * scale, uv.getY(i) * scale);
  }
  uv.needsUpdate = true;
}

function distanceToSegment(
  x: number,
  z: number,
  a: { x: number; z: number },
  b: { x: number; z: number },
) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSq = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSq));
  return Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
}
