import * as THREE from 'three';

/**
 * Procedural surface textures for the modelled parts of the house — cladding,
 * stucco, stone, oak, lawn, snow, paving. They are drawn once on a canvas, so
 * the exterior costs no extra downloads, and every one tiles at a known real
 * size: geometry carries UVs in metres and `repeat` converts to tiles.
 */

export type SurfaceKind =
  | 'plaster'
  | 'oak'
  | 'cedar'
  | 'stucco'
  | 'stone'
  | 'ashlar'
  | 'grass'
  | 'snow'
  | 'sand'
  | 'paver'
  | 'asphalt'
  | 'decking'
  | 'gravel'
  | 'concrete';

/** Real-world size of one texture tile, in metres. */
const TILE: Record<SurfaceKind, number> = {
  plaster: 2,
  oak: 2.4,
  cedar: 2,
  stucco: 2,
  stone: 2.4,
  ashlar: 3,
  grass: 3,
  snow: 4,
  sand: 3,
  paver: 1.8,
  asphalt: 4,
  decking: 2.4,
  gravel: 2,
  concrete: 2,
};

/**
 * One set of surface textures per engine, so disposing one viewer never pulls
 * textures out from under another.
 */
export interface SurfaceLibrary {
  get: (kind: SurfaceKind) => THREE.Texture;
  dispose: () => void;
}

export function createSurfaceLibrary(): SurfaceLibrary {
  const cache = new Map<SurfaceKind, THREE.Texture>();
  return {
    get: (kind) => {
      const cached = cache.get(kind);
      if (cached) return cached;
      const texture = paint(kind);
      cache.set(kind, texture);
      return texture;
    },
    dispose: () => {
      cache.forEach((texture) => texture.dispose());
      cache.clear();
    },
  };
}

function paint(kind: SurfaceKind): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const random = seeded(kind.length * 977 + kind.charCodeAt(0));
  PAINTERS[kind](ctx, 512, random);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.repeat.set(1 / TILE[kind], 1 / TILE[kind]);
  return texture;
}

type Painter = (ctx: CanvasRenderingContext2D, size: number, random: () => number) => void;

const PAINTERS: Record<SurfaceKind, Painter> = {
  plaster: (ctx, size, random) => {
    fill(ctx, size, '#e6dccb');
    speckle(ctx, size, random, 9000, 0.035, 1.4);
  },
  stucco: (ctx, size, random) => {
    fill(ctx, size, '#efe8dc');
    speckle(ctx, size, random, 14000, 0.05, 1.6);
    blotches(ctx, size, random, 40, 'rgba(160,140,110,0.035)', 60);
  },
  concrete: (ctx, size, random) => {
    fill(ctx, size, '#c9c5bd');
    speckle(ctx, size, random, 12000, 0.06, 1.5);
    blotches(ctx, size, random, 30, 'rgba(90,90,90,0.05)', 70);
  },
  oak: (ctx, size, random) => {
    planks(ctx, size, random, 13, ['#a9825a', '#b48c62', '#9d7650', '#b99467', '#a27b53'], true);
  },
  decking: (ctx, size, random) => {
    planks(ctx, size, random, 17, ['#8a6a4d', '#94735a', '#7f6147', '#9a7a5c'], true, 3);
  },
  cedar: (ctx, size, random) => {
    ctx.save();
    ctx.translate(size, 0);
    ctx.rotate(Math.PI / 2);
    planks(ctx, size, random, 14, ['#6e4b33', '#7a543a', '#654430', '#80593d', '#5f3f2c'], false, 5);
    ctx.restore();
  },
  stone: (ctx, size, random) => {
    fill(ctx, size, '#5d5a55');
    let y = 0;
    while (y < size) {
      const h = 34 + random() * 40;
      let x = -random() * 60;
      while (x < size) {
        const w = 60 + random() * 110;
        const tone = 118 + random() * 50;
        ctx.fillStyle = `rgb(${tone},${tone - 6},${tone - 14})`;
        ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
        x += w;
      }
      y += h;
    }
    speckle(ctx, size, random, 9000, 0.08, 1.4);
  },
  ashlar: (ctx, size, random) => {
    fill(ctx, size, '#9e8b72');
    const rows = 6;
    const h = size / rows;
    for (let r = 0; r < rows; r += 1) {
      let x = r % 2 ? -size / 6 : 0;
      while (x < size) {
        const w = size / 3 + (random() - 0.5) * 40;
        const tone = 190 + random() * 26;
        ctx.fillStyle = `rgb(${tone},${tone - 22},${tone - 50})`;
        ctx.fillRect(x + 2, r * h + 2, w - 4, h - 4);
        x += w;
      }
    }
    speckle(ctx, size, random, 12000, 0.06, 1.5);
  },
  grass: (ctx, size, random) => {
    fill(ctx, size, '#5c7a3c');
    blotches(ctx, size, random, 70, 'rgba(120,150,70,0.12)', 50);
    blotches(ctx, size, random, 60, 'rgba(40,60,25,0.12)', 45);
    blades(ctx, size, random, 16000, ['#6f8f47', '#4f6d33', '#7c9a50', '#57763a']);
  },
  snow: (ctx, size, random) => {
    fill(ctx, size, '#eef2f6');
    blotches(ctx, size, random, 50, 'rgba(170,190,215,0.10)', 80);
    speckle(ctx, size, random, 8000, 0.04, 1.2);
  },
  sand: (ctx, size, random) => {
    fill(ctx, size, '#d8c3a0');
    blotches(ctx, size, random, 60, 'rgba(170,140,100,0.10)', 60);
    speckle(ctx, size, random, 16000, 0.07, 1.3);
  },
  gravel: (ctx, size, random) => {
    fill(ctx, size, '#a79d8e');
    for (let i = 0; i < 5000; i += 1) {
      const tone = 120 + random() * 90;
      ctx.fillStyle = `rgb(${tone},${tone - 6},${tone - 14})`;
      ctx.beginPath();
      ctx.arc(random() * size, random() * size, 1.5 + random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  paver: (ctx, size, random) => {
    fill(ctx, size, '#8d877d');
    const n = 3;
    const cell = size / n;
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const tone = 186 + random() * 22;
        ctx.fillStyle = `rgb(${tone},${tone - 5},${tone - 12})`;
        ctx.fillRect(i * cell + 4, j * cell + 4, cell - 8, cell - 8);
      }
    }
    speckle(ctx, size, random, 9000, 0.05, 1.3);
  },
  asphalt: (ctx, size, random) => {
    fill(ctx, size, '#3b3d40');
    speckle(ctx, size, random, 20000, 0.12, 1.3);
  },
};

// ------------------------------------------------------------- painters ---

function fill(ctx: CanvasRenderingContext2D, size: number, colour: string) {
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, size, size);
}

function speckle(
  ctx: CanvasRenderingContext2D,
  size: number,
  random: () => number,
  count: number,
  alpha: number,
  radius: number,
) {
  for (let i = 0; i < count; i += 1) {
    const light = random() > 0.5;
    ctx.fillStyle = light ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(random() * size, random() * size, radius, radius);
  }
}

function blotches(
  ctx: CanvasRenderingContext2D,
  size: number,
  random: () => number,
  count: number,
  colour: string,
  radius: number,
) {
  ctx.fillStyle = colour;
  for (let i = 0; i < count; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const r = radius * (0.4 + random());
    // Draw each blotch at the wrapped positions too, so the tile stays seamless.
    [-size, 0, size].forEach((ox) =>
      [-size, 0, size].forEach((oy) => {
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
        ctx.fill();
      }),
    );
  }
}

function blades(
  ctx: CanvasRenderingContext2D,
  size: number,
  random: () => number,
  count: number,
  colours: string[],
) {
  for (let i = 0; i < count; i += 1) {
    ctx.fillStyle = colours[Math.floor(random() * colours.length)];
    ctx.fillRect(random() * size, random() * size, 1.2, 3 + random() * 3);
  }
}

function planks(
  ctx: CanvasRenderingContext2D,
  size: number,
  random: () => number,
  rows: number,
  tones: string[],
  staggered: boolean,
  gap = 2,
) {
  fill(ctx, size, '#2e241c');
  const h = size / rows;
  for (let r = 0; r < rows; r += 1) {
    let x = staggered ? -random() * size * 0.5 : 0;
    while (x < size) {
      const w = staggered ? size * (0.35 + random() * 0.5) : size;
      ctx.fillStyle = tones[Math.floor(random() * tones.length)];
      ctx.fillRect(x + (staggered ? 1 : 0), r * h + gap / 2, w - (staggered ? 2 : 0), h - gap);
      // Grain.
      for (let g = 0; g < 7; g += 1) {
        ctx.fillStyle = `rgba(40,25,10,${0.05 + random() * 0.06})`;
        ctx.fillRect(x, r * h + gap / 2 + random() * (h - gap), w, 1);
      }
      x += w;
    }
  }
}

/** Deterministic PRNG so textures and landscaping are stable between visits. */
export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
