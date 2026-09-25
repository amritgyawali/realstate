/**
 * Offline depth reconstruction for the tour panoramas.
 *
 * A single 360° photo carries no depth, so when it is projected onto a plain
 * room box, furniture is painted flat onto the floor and walls and smears as the
 * visitor walks. This script gives every photo its shape back:
 *
 * 1. The panorama is cut into 18 overlapping 100° perspective views.
 * 2. Depth Anything V2 (Small, Apache-2.0) predicts relative depth for each view.
 * 3. Each view's prediction is calibrated against the room's measured box — the
 *    walls, floor and ceiling the tour data already describes — with a trimmed
 *    least-squares fit, so every view lands on the same metric scale.
 * 4. The views are feathered into one equirectangular map of the fraction of
 *    the box distance (1 = on the wall, less = something in front of it). It is
 *    stored square-rooted — fine steps up close, coarse ones far away — as an
 *    8-bit greyscale PNG beside the photo: `<name>-depth.png`.
 *
 * The engine turns each map into a displaced mesh, so a sofa stands up off the
 * floor and a doorway has depth, and falls back to the box wherever the map
 * leaves a gap.
 *
 * The toolchain is deliberately kept out of package.json (the ONNX runtime is
 * ~100 MB of native binaries and only needed when photos change):
 *
 *   mkdir -p .depth && cd .depth
 *   npm init -y && npm i --ignore-scripts onnxruntime-node jpeg-js pngjs
 *   curl -L -o depth_anything_v2_vits.onnx \
 *     https://github.com/fabio-sim/Depth-Anything-ONNX/releases/download/v2.0.0/depth_anything_v2_vits.onnx
 *   cd .. && npx tsx scripts/build-depth.ts            # every panorama
 *   npx tsx scripts/build-depth.ts lythwood_lounge     # or just some
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fallbackTours, toursBySlug } from '../lib/data/tours';
import { hasPano, proxyDistance, spaceKind } from '../lib/tour/layout';
import type { PropertyTour, TourNode } from '../lib/types';

const toolchain = resolve(process.env.DEPTH_TOOLCHAIN ?? '.depth');
const load = createRequire(join(toolchain, 'index.js'));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ort: any = load('onnxruntime-node');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jpeg: any = load('jpeg-js');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { PNG }: any = load('pngjs');
const MODEL = process.env.DEPTH_MODEL ?? join(toolchain, 'depth_anything_v2_vits.onnx');
const PANORAMAS = resolve('public/panoramas');

const N = 518;
const FOV = (100 * Math.PI) / 180;
const T = Math.tan(FOV / 2);
const OUT_W = 1024;
const OUT_H = 512;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

type Vec = [number, number, number];

/** Views in the photo's own frame: [yaw, pitch] in degrees. */
const VIEWS: [number, number][] = [
  ...Array.from({ length: 8 }, (_, i) => [i * 45, 0] as [number, number]),
  ...Array.from({ length: 4 }, (_, i) => [i * 90 + 45, 50] as [number, number]),
  ...Array.from({ length: 4 }, (_, i) => [i * 90, -50] as [number, number]),
  [0, 89.5],
  [0, -89.5],
];

interface Basis {
  f: Vec;
  r: Vec;
  u: Vec;
}

function basis(yawDeg: number, pitchDeg: number): Basis {
  const y = (yawDeg * Math.PI) / 180;
  const p = (pitchDeg * Math.PI) / 180;
  const f: Vec = [Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)];
  const r: Vec = [Math.cos(y), 0, Math.sin(y)];
  const u = cross(r, f);
  return { f, r, u };
}

function cross(a: Vec, b: Vec): Vec {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a: Vec, b: Vec) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalise(v: Vec): Vec {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** Photo-frame direction → world direction, turning by the photo's heading. */
function toWorld(d: Vec, heading: number) {
  const h = (heading * Math.PI) / 180;
  return { x: d[0] * Math.cos(h) - d[2] * Math.sin(h), y: d[1], z: d[2] * Math.cos(h) + d[0] * Math.sin(h) };
}

interface Image {
  width: number;
  height: number;
  data: Uint8Array;
}

/** Bilinear sample of the panorama along a photo-frame direction, RGB 0-1. */
function samplePano(image: Image, d: Vec, out: number[]) {
  const yaw = Math.atan2(d[0], -d[2]);
  let u = yaw / (2 * Math.PI) - 0.25;
  u -= Math.floor(u);
  const v = 0.5 + Math.asin(Math.max(-1, Math.min(1, d[1]))) / Math.PI;
  const x = u * image.width - 0.5;
  const y = (1 - v) * image.height - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.max(0, Math.min(image.height - 2, Math.floor(y)));
  const fx = x - x0;
  const fy = Math.max(0, Math.min(1, y - y0));
  const xa = ((x0 % image.width) + image.width) % image.width;
  const xb = (xa + 1) % image.width;
  for (let c = 0; c < 3; c += 1) {
    const p00 = image.data[(y0 * image.width + xa) * 4 + c];
    const p10 = image.data[(y0 * image.width + xb) * 4 + c];
    const p01 = image.data[((y0 + 1) * image.width + xa) * 4 + c];
    const p11 = image.data[((y0 + 1) * image.width + xb) * 4 + c];
    out[c] = ((p00 * (1 - fx) + p10 * fx) * (1 - fy) + (p01 * (1 - fx) + p11 * fx) * fy) / 255;
  }
}

function rayFor(b: Basis, i: number, j: number): Vec {
  const sx = ((2 * (i + 0.5)) / N - 1) * T;
  const sy = (1 - (2 * (j + 0.5)) / N) * T;
  return normalise([b.f[0] + sx * b.r[0] + sy * b.u[0], b.f[1] + sx * b.r[1] + sy * b.u[1], b.f[2] + sx * b.r[2] + sy * b.u[2]]);
}

/**
 * Trimmed least squares for t ≈ a·p + b, keeping the best-fitting 60%. With
 * `throughOrigin`, b is pinned to 0 so the model's own zero (sky, far scenery)
 * stays at infinity — needed when only a nearby deck is available to fit on.
 */
function robustFit(p: number[], t: number[], throughOrigin = false) {
  let keep = p.map((_, i) => i);
  let a = 0;
  let b = 0;
  for (let iteration = 0; iteration < 6; iteration += 1) {
    let sp = 0;
    let st = 0;
    let spp = 0;
    let spt = 0;
    keep.forEach((i) => {
      sp += p[i];
      st += t[i];
      spp += p[i] * p[i];
      spt += p[i] * t[i];
    });
    const n = keep.length;
    if (throughOrigin) {
      if (spp < 1e-12) break;
      a = spt / spp;
      b = 0;
    } else {
      const det = n * spp - sp * sp;
      if (Math.abs(det) < 1e-12) break;
      a = (n * spt - sp * st) / det;
      b = (st - a * sp) / n;
    }
    const residuals = p.map((value, i) => ({ i, r: Math.abs(a * value + b - t[i]) }));
    residuals.sort((x, y) => x.r - y.r);
    keep = residuals.slice(0, Math.max(50, Math.floor(residuals.length * 0.6))).map((entry) => entry.i);
  }
  return { a, b };
}

async function depthFor(tour: PropertyTour, node: TourNode & { pano: string }, session: unknown) {
  const raw = jpeg.decode(readFileSync(join(PANORAMAS, `${node.pano}.jpg`)), {
    useTArray: true,
    maxMemoryUsageInMB: 1024,
  }) as Image;
  const outdoor = spaceKind(node) === 'outdoor';
  const heading = node.heading ?? 0;
  const views: { basis: Basis; ratio: Float32Array }[] = [];
  const rgb = [0, 0, 0];

  for (const [yaw, pitch] of VIEWS) {
    const b = basis(yaw, pitch);
    const input = new Float32Array(3 * N * N);
    const prior = new Float32Array(N * N);
    const pitchOf = new Float32Array(N * N);
    for (let j = 0; j < N; j += 1) {
      for (let i = 0; i < N; i += 1) {
        const d = rayFor(b, i, j);
        samplePano(raw, d, rgb);
        const k = j * N + i;
        for (let c = 0; c < 3; c += 1) input[c * N * N + k] = (rgb[c] - MEAN[c]) / STD[c];
        prior[k] = proxyDistance(tour, node, toWorld(d, heading));
        pitchOf[k] = (Math.asin(d[1]) * 180) / Math.PI;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (session as any).run({ l_x_: new ort.Tensor('float32', input, [1, 3, N, N]) });
    const predicted = result[Object.keys(result)[0]].data as Float32Array;

    // Calibrate against the box. Rooms use every surface; open-air spaces only
    // their deck, since the dome stands in for scenery at unknown distance.
    const ps: number[] = [];
    const ts: number[] = [];
    for (let j = 2; j < N; j += 4) {
      for (let i = 2; i < N; i += 4) {
        const k = j * N + i;
        if (pitchOf[k] < -72) continue; // the tripod
        if (outdoor && pitchOf[k] > -8) continue;
        ps.push(predicted[k]);
        ts.push(1 / prior[k]);
      }
    }
    const fit = ps.length > 100 ? robustFit(ps, ts, outdoor) : { a: 0, b: 0 };
    const ratio = new Float32Array(N * N).fill(1);
    if (fit.a > 0) {
      for (let k = 0; k < N * N; k += 1) {
        const disparity = fit.a * predicted[k] + fit.b;
        const distance = disparity > 1e-4 ? 1 / disparity : Infinity;
        ratio[k] = Math.max(0.02, Math.min(1, distance / prior[k]));
        if (pitchOf[k] < -76) ratio[k] = 1;
      }
    }
    views.push({ basis: b, ratio });
  }

  // Feather every view into one equirectangular map, averaging in log space.
  const map = new Float32Array(OUT_W * OUT_H);
  for (let y = 0; y < OUT_H; y += 1) {
    const v = 1 - (y + 0.5) / OUT_H;
    const pitch = (v - 0.5) * Math.PI;
    for (let x = 0; x < OUT_W; x += 1) {
      const u = (x + 0.5) / OUT_W;
      const yaw = (u + 0.25) * 2 * Math.PI;
      const d: Vec = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
      let sum = 0;
      let weight = 0;
      for (const view of views) {
        const fz = dot(d, view.basis.f);
        if (fz <= 0.05) continue;
        const sx = dot(d, view.basis.r) / fz / T;
        const sy = dot(d, view.basis.u) / fz / T;
        if (Math.abs(sx) >= 1 || Math.abs(sy) >= 1) continue;
        const i = ((sx + 1) / 2) * N - 0.5;
        const j = ((1 - sy) / 2) * N - 0.5;
        const value = bilinear(view.ratio, i, j);
        const w = (1 - Math.max(Math.abs(sx), Math.abs(sy))) ** 2 + 1e-4;
        sum += Math.log(value) * w;
        weight += w;
      }
      map[y * OUT_W + x] = weight > 0 ? Math.exp(sum / weight) : 1;
    }
  }

  const filtered = median3(map);
  const png = new PNG({ width: OUT_W, height: OUT_H, colorType: 0, inputColorType: 0, bitDepth: 8 });
  const bytes = Buffer.alloc(OUT_W * OUT_H);
  for (let k = 0; k < bytes.length; k += 1) {
    bytes[k] = Math.round(Math.sqrt(Math.max(0, Math.min(1, filtered[k]))) * 255);
  }
  png.data = bytes;
  const file = join(PANORAMAS, `${node.pano}-depth.png`);
  writeFileSync(file, PNG.sync.write(png, { colorType: 0, inputColorType: 0, bitDepth: 8 }));
  return file;
}

function bilinear(data: Float32Array, x: number, y: number) {
  const x0 = Math.max(0, Math.min(N - 2, Math.floor(x)));
  const y0 = Math.max(0, Math.min(N - 2, Math.floor(y)));
  const fx = Math.max(0, Math.min(1, x - x0));
  const fy = Math.max(0, Math.min(1, y - y0));
  const a = data[y0 * N + x0];
  const b = data[y0 * N + x0 + 1];
  const c = data[(y0 + 1) * N + x0];
  const d = data[(y0 + 1) * N + x0 + 1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

function median3(map: Float32Array) {
  const out = new Float32Array(map.length);
  const window: number[] = new Array(9);
  for (let y = 0; y < OUT_H; y += 1) {
    for (let x = 0; x < OUT_W; x += 1) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const yy = Math.max(0, Math.min(OUT_H - 1, y + dy));
        for (let dx = -1; dx <= 1; dx += 1) {
          const xx = (x + dx + OUT_W) % OUT_W;
          window[n] = map[yy * OUT_W + xx];
          n += 1;
        }
      }
      window.sort((a, b) => a - b);
      out[y * OUT_W + x] = window[4];
    }
  }
  return out;
}

async function main() {
  const only = new Set(process.argv.slice(2));
  const session = await ort.InferenceSession.create(MODEL, { intraOpNumThreads: 4 });
  const seen = new Set<string>();
  // Every tour, whether mapped to a listing or one of the demo houses.
  const tours = [...new Set([...Object.values(toursBySlug), ...fallbackTours])];
  for (const tour of tours) {
    for (const node of tour.nodes) {
      if (!hasPano(node) || seen.has(node.pano)) continue;
      if (only.size && !only.has(node.pano)) continue;
      seen.add(node.pano);
      const started = Date.now();
      const file = await depthFor(tour, node, session);
      console.log(`${node.pano}: ${((Date.now() - started) / 1000).toFixed(1)}s → ${file}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
