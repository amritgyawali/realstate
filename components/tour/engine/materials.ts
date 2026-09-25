import * as THREE from 'three';
import type { TourSite } from '@/lib/types';
import type { SurfaceKind, SurfaceLibrary } from './textures';

const DEG = Math.PI / 180;

/**
 * Portals are doorways that lead from an enclosed room to an open-air space
 * (a deck, a terrace). An open-air space is drawn on a large dome around its
 * capture point, and that dome encloses half the house — so from indoors it is
 * only allowed to show through its own doorway, and everything else (the model,
 * other rooms, the sky) is cut away where the view passes through that doorway.
 * Each portal is (plane, along, bottom, axis) + (half width, height), where axis
 * 0 is a wall of constant x and 1 a wall of constant z.
 */
export const MAX_PORTALS = 6;

export interface PortalUniforms {
  uPortalA: { value: THREE.Vector4[] };
  uPortalB: { value: THREE.Vector2[] };
  uPortalCount: { value: number };
  [uniform: string]: THREE.IUniform;
}

export function createPortalUniforms(): PortalUniforms {
  return {
    uPortalA: { value: Array.from({ length: MAX_PORTALS }, () => new THREE.Vector4()) },
    uPortalB: { value: Array.from({ length: MAX_PORTALS }, () => new THREE.Vector2()) },
    uPortalCount: { value: 0 },
  };
}

const PORTAL_GLSL = /* glsl */ `
  uniform vec4 uPortalA[${MAX_PORTALS}];
  uniform vec2 uPortalB[${MAX_PORTALS}];
  uniform int uPortalCount;

  bool crossesPortal(vec3 from, vec3 to, vec4 a, vec2 b) {
    float c0 = a.w < 0.5 ? from.x : from.z;
    float c1 = a.w < 0.5 ? to.x : to.z;
    float span = c1 - c0;
    if (abs(span) < 1e-5) return false;
    float t = (a.x - c0) / span;
    if (t <= 0.0 || t >= 1.0) return false;
    vec3 q = from + (to - from) * t;
    float lateral = (a.w < 0.5 ? q.z : q.x) - a.y;
    return abs(lateral) <= b.x && q.y >= a.z && q.y <= a.z + b.y;
  }

  bool portalExcluded(vec3 world) {
    for (int i = 0; i < ${MAX_PORTALS}; i++) {
      if (i >= uPortalCount) break;
      if (crossesPortal(cameraPosition, world, uPortalA[i], uPortalB[i])) return true;
    }
    return false;
  }
`;

/**
 * Teaches a stock three.js material to respect the portal cut. Used for every
 * modelled surface: facade, stair hall, garden, sky.
 */
export function withPortalExclusion<T extends THREE.Material>(material: T, portals: PortalUniforms): T {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, portals);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPortalWorld;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 portalWorld = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          portalWorld = instanceMatrix * portalWorld;
        #endif
        vPortalWorld = (modelMatrix * portalWorld).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vPortalWorld;\n${PORTAL_GLSL}`)
      .replace('void main() {', 'void main() {\n  if (portalExcluded(vPortalWorld)) discard;');
  };
  material.customProgramCacheKey = () => 'portal-exclusion';
  return material;
}

// ------------------------------------------------------------ projection ---

const PROJECTION_VERTEX = /* glsl */ `
  uniform float floorY;
  uniform float clampFloor;
  varying vec3 vWorld;
  #include <common>
  #include <clipping_planes_pars_vertex>
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    // Outdoor domes: the lower hemisphere is flattened onto the deck, so the
    // photo's ground lands on a floor you can walk across.
    if (clampFloor > 0.5) world.y = max(world.y, floorY);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <clipping_planes_vertex>
  }
`;

const PROJECTION_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform sampler2D mapPrevious;
  uniform float hasMap;
  uniform float blend;
  uniform vec3 capture;
  uniform float heading;
  uniform float opacity;
  uniform float exposure;
  uniform vec3 fallback;
  uniform int ownCount;
  uniform vec4 ownA[2];
  uniform vec2 ownB[2];
  uniform float excludeOn;
  varying vec3 vWorld;
  #include <common>
  #include <clipping_planes_pars_fragment>
  ${PORTAL_GLSL}

  void main() {
    #include <clipping_planes_fragment>
    #ifdef NEAR_FADE
      // Reconstructed geometry right at the lens (a lamp, a doorframe the walk
      // brushes past) is dropped rather than filling the screen.
      if (distance(vWorld, cameraPosition) < NEAR_FADE) discard;
    #endif
    if (ownCount > 0) {
      bool seen = false;
      for (int i = 0; i < 2; i++) {
        if (i < ownCount && crossesPortal(cameraPosition, vWorld, ownA[i], ownB[i])) seen = true;
      }
      if (!seen) discard;
    } else if (excludeOn > 0.5 && portalExcluded(vWorld)) {
      discard;
    }

    // Re-project the photograph from the point it was taken: the direction from
    // the capture point to this surface picks the pixel, so the room is exact
    // at the capture point and shows true parallax everywhere else.
    vec3 d = normalize(vWorld - capture);
    float yaw = atan(d.x, -d.z) - heading;
    float t = yaw / (2.0 * PI) - 0.25;
    // Two parameterisations with the seam in different places; take whichever
    // is continuous here so mip selection never sees the wrap (Tarini 2012).
    float u1 = fract(t);
    float u2 = fract(t + 0.5) - 0.5;
    float u = fwidth(u1) < fwidth(u2) - 0.001 ? u1 : u2;
    float v = 0.5 + asin(clamp(d.y, -1.0, 1.0)) / PI;
    vec3 colour = fallback;
    if (hasMap > 0.5) {
      colour = texture2D(map, vec2(u, v)).rgb;
      // Sharpen from the preview to the full capture over a few frames instead
      // of popping.
      if (blend < 0.999) colour = mix(texture2D(mapPrevious, vec2(u, v)).rgb, colour, blend);
    }
    gl_FragColor = vec4(colour * exposure, opacity);
    #include <colorspace_fragment>
  }
`;

export interface ProjectionOptions {
  /** Eye position the photo was captured from. */
  capture: THREE.Vector3;
  /** Compass heading of the photo's yaw 0, in degrees. */
  heading: number;
  floorY: number;
  /** Flatten geometry below `floorY` onto it (outdoor domes). */
  clampFloor?: boolean;
  portals: PortalUniforms;
}

export type ProjectionMaterial = THREE.ShaderMaterial & {
  uniforms: {
    map: { value: THREE.Texture | null };
    mapPrevious: { value: THREE.Texture | null };
    blend: { value: number };
    hasMap: { value: number };
    capture: { value: THREE.Vector3 };
    heading: { value: number };
    opacity: { value: number };
    exposure: { value: number };
    ownCount: { value: number };
    ownA: { value: THREE.Vector4[] };
    ownB: { value: THREE.Vector2[] };
    excludeOn: { value: number };
    floorY: { value: number };
    clampFloor: { value: number };
  };
};

export function createProjectionMaterial(options: ProjectionOptions): ProjectionMaterial {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...options.portals,
      map: { value: null },
      mapPrevious: { value: null },
      blend: { value: 1 },
      hasMap: { value: 0 },
      capture: { value: options.capture },
      heading: { value: options.heading * DEG },
      opacity: { value: 1 },
      exposure: { value: 1 },
      fallback: { value: new THREE.Color('#7d756b') },
      ownCount: { value: 0 },
      ownA: { value: [new THREE.Vector4(), new THREE.Vector4()] },
      ownB: { value: [new THREE.Vector2(), new THREE.Vector2()] },
      excludeOn: { value: 1 },
      floorY: { value: options.floorY },
      clampFloor: { value: options.clampFloor ? 1 : 0 },
    },
    vertexShader: PROJECTION_VERTEX,
    fragmentShader: PROJECTION_FRAGMENT,
    clipping: true,
  });
  return material as ProjectionMaterial;
}

/**
 * A second material over the same photo: every uniform is shared (so texture
 * swaps, fades and portal cuts apply to both), while render state such as
 * culling and defines can differ.
 */
export function linkedClone(
  material: ProjectionMaterial,
  defines: Record<string, string | number> = {},
): ProjectionMaterial {
  const clone = material.clone() as ProjectionMaterial;
  clone.uniforms = material.uniforms;
  clone.defines = { ...material.defines, ...defines };
  clone.clippingPlanes = material.clippingPlanes;
  return clone;
}

// ---------------------------------------------------------- CG palette ---

export interface Palette {
  plaster: THREE.MeshStandardMaterial;
  oak: THREE.MeshStandardMaterial;
  facade: THREE.MeshStandardMaterial;
  base: THREE.MeshStandardMaterial;
  soffit: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  railGlass: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  snow: THREE.MeshStandardMaterial;
  decking: THREE.MeshStandardMaterial;
  paver: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  ground: THREE.MeshStandardMaterial;
  doorLeaf: THREE.MeshStandardMaterial;
  lantern: THREE.MeshStandardMaterial;
  skylight: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  all: THREE.Material[];
}

export function createPalette(
  site: TourSite,
  portals: PortalUniforms,
  surfaces: SurfaceLibrary,
): Palette {
  const surface = (kind: SurfaceKind, params: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ map: surfaces.get(kind), roughness: 0.85, ...params });

  const facadeKind: SurfaceKind =
    site.facade === 'timber' ? 'cedar' : site.facade === 'stone' ? 'ashlar' : 'stucco';
  const groundKind: SurfaceKind =
    site.setting === 'alpine' ? 'snow' : site.setting === 'desert' ? 'sand' : 'grass';

  const palette: Omit<Palette, 'all'> = {
    plaster: surface('plaster', { roughness: 0.95 }),
    oak: surface('oak', { roughness: 0.6 }),
    facade: surface(facadeKind, { roughness: 0.9 }),
    base: surface(site.facade === 'stucco' ? 'stone' : site.facade === 'stone' ? 'stone' : 'stone', {
      roughness: 0.95,
    }),
    soffit: surface(site.facade === 'timber' ? 'cedar' : 'plaster', { roughness: 0.9 }),
    trim: new THREE.MeshStandardMaterial({
      color: site.facade === 'timber' ? '#2c2622' : site.facade === 'stone' ? '#3a332c' : '#f3efe8',
      roughness: 0.55,
      metalness: site.facade === 'stucco' ? 0 : 0.35,
    }),
    metal: new THREE.MeshStandardMaterial({ color: '#23211f', roughness: 0.4, metalness: 0.7 }),
    brass: new THREE.MeshStandardMaterial({ color: '#b08d57', roughness: 0.35, metalness: 0.9 }),
    glass: new THREE.MeshStandardMaterial({
      color: '#1d2830',
      roughness: 0.06,
      metalness: 0.35,
      transparent: true,
      opacity: 0.52,
      envMapIntensity: 1.4,
    }),
    railGlass: new THREE.MeshStandardMaterial({
      color: '#b9cdd6',
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    roof: new THREE.MeshStandardMaterial({
      color: site.facade === 'timber' ? '#2b2926' : site.facade === 'stone' ? '#8f7e68' : '#e9e4da',
      roughness: 0.7,
      metalness: site.facade === 'timber' ? 0.4 : 0,
    }),
    snow: surface('snow', { roughness: 0.9 }),
    decking: surface('decking', { roughness: 0.8 }),
    paver: surface('paver', { roughness: 0.9 }),
    asphalt: surface('asphalt', { roughness: 0.95 }),
    concrete: surface('concrete', { roughness: 0.9 }),
    ground: surface(groundKind, { roughness: 1 }),
    doorLeaf: new THREE.MeshStandardMaterial({ color: '#4a3323', roughness: 0.55 }),
    lantern: new THREE.MeshStandardMaterial({
      color: '#fff4dc',
      emissive: new THREE.Color('#ffd9a0'),
      emissiveIntensity: 1.6,
    }),
    skylight: new THREE.MeshStandardMaterial({
      color: '#f4f8ff',
      emissive: new THREE.Color('#e8f1ff'),
      emissiveIntensity: 1.1,
    }),
    foliage: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }),
    water: new THREE.MeshStandardMaterial({
      color: '#1f5f78',
      roughness: 0.12,
      metalness: 0.2,
      envMapIntensity: 1.2,
    }),
  };

  const all = Object.values(palette) as THREE.Material[];
  all.forEach((material) => withPortalExclusion(material, portals));
  return { ...palette, all };
}
