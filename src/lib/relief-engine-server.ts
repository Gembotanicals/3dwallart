// Server-side Relief Engine
// Ports the core relief generation logic from relief-engine.ts
// without DOM dependencies (HTMLCanvasElement, HTMLImageElement, Blob)
// Uses raw pixel data from sharp instead of canvas getImageData

export interface ServerReliefSettings {
  mapMode: "brightness" | "subject";
  invert: boolean;
  contrast: number;
  smooth: number;
  pw: number;
  ph: number;
  relief: number;
  base: number;
  gc: number;
  gr: number;
  tcol: number;
  trow: number;
  join: boolean;
  tw: number;
  to: number;
  tc: number;
  offX: number;
  offY: number;
  colorOn: boolean;
  nc: number;
  bandMode: "height" | "coverage";
  out: "PANEL" | "MOLD";
  mw: number;
  mr: number;
  res: number;
  puzzleOn: boolean;
  puzzleSize: number;
  puzzleExtent: number;
  puzzleEdges: string; // JSON string of edge map
}

export interface ServerHeightGrid {
  nx: number;
  ny: number;
  data: Float32Array;
  fw: number;
  fh: number;
  full: Float32Array;
}

export interface ServerGeometryResult {
  array: Float32Array;
  tris: number;
  nx: number;
  ny: number;
  bbox: [number, number, number];
}

// ---- Box blur (identical to browser version) ----

function boxBlur(g: Float32Array, w: number, h: number, r: number): void {
  if (r < 1) return;
  const t = new Float32Array(g.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0,
        n = 0;
      for (let k = -r; k <= r; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < w) {
          s += g[y * w + xx];
          n++;
        }
      }
      t[y * w + x] = s / n;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let s = 0,
        n = 0;
      for (let k = -r; k <= r; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < h) {
          s += t[yy * w + x];
          n++;
        }
      }
      g[y * w + x] = s / n;
    }
  }
}

// ---- Puzzle Edge Map ----

export interface PuzzleEdgeMap {
  v: number[]; // vertical seams: (gc-1) * gr, each ±1
  h: number[]; // horizontal seams: gc * (gr-1), each ±1
}

function createDefaultPuzzleEdgeMap(gc: number, gr: number): PuzzleEdgeMap {
  const v: number[] = [];
  const h: number[] = [];

  for (let c = 0; c < gc - 1; c++) {
    for (let r = 0; r < gr; r++) {
      v.push((c + r) % 2 === 0 ? 1 : -1);
    }
  }

  for (let r = 0; r < gr - 1; r++) {
    for (let c = 0; c < gc; c++) {
      h.push((c + r) % 2 === 0 ? 1 : -1);
    }
  }

  return { v, h };
}

function parsePuzzleEdgeMap(json: string, gc: number, gr: number): PuzzleEdgeMap | null {
  if (!json || gc < 1 || gr < 1 || (gc === 1 && gr === 1)) return null;
  try {
    const map = JSON.parse(json);
    if (!Array.isArray(map.v) || !Array.isArray(map.h)) return null;
    const expectedV = (gc - 1) * gr;
    const expectedH = gc * (gr - 1);
    if (map.v.length !== expectedV || map.h.length !== expectedH) return null;
    if (!map.v.every((v: unknown) => v === 1 || v === -1)) return null;
    if (!map.h.every((v: unknown) => v === 1 || v === -1)) return null;
    return { v: map.v, h: map.h };
  } catch {
    return null;
  }
}

function getPuzzleEdgeMap(json: string, gc: number, gr: number): PuzzleEdgeMap | null {
  if (gc < 1 || gr < 1 || (gc === 1 && gr === 1)) return null;
  return parsePuzzleEdgeMap(json, gc, gr) || createDefaultPuzzleEdgeMap(gc, gr);
}

// ---- Height grid (server-side, using raw RGBA pixel buffer) ----

export function buildHeightGridServer(
  pixels: Buffer,
  imgWidth: number,
  imgHeight: number,
  s: ServerReliefSettings
): ServerHeightGrid | null {
  if (!pixels || imgWidth < 1 || imgHeight < 1) return null;

  const longest = Math.max(imgWidth, imgHeight);
  const scale = Math.min(1, (s.res * Math.max(s.gc, s.gr)) / longest);
  const fw = Math.max(1, Math.round(imgWidth * scale));
  const fh = Math.max(1, Math.round(imgHeight * scale));

  // Resample pixel data to fw x fh using nearest-neighbor
  // Input pixels is RGBA with stride = imgWidth * 4
  const g = new Float32Array(fw * fh);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const sx = Math.min(imgWidth - 1, Math.round((x / fw) * imgWidth));
      const sy = Math.min(imgHeight - 1, Math.round((y / fh) * imgHeight));
      const idx = (sy * imgWidth + sx) * 4;
      const r = pixels[idx] || 0;
      const gv = pixels[idx + 1] || 0;
      const b = pixels[idx + 2] || 0;
      let v = (0.299 * r + 0.587 * gv + 0.114 * b) / 255;
      v = (v - 0.5) * s.contrast + 0.5;
      if (s.mapMode === "subject") {
        v = v > 0.7 ? 1.0 : v * 0.92;
      }
      if (s.invert) v = 1 - v;
      g[y * fw + x] = Math.max(0, Math.min(1, v));
    }
  }

  if (s.smooth > 0) {
    boxBlur(
      g,
      fw,
      fh,
      Math.max(1, Math.round(s.smooth * scale * 2 + s.smooth))
    );
  }

  const tw = Math.floor(fw / s.gc);
  const th = Math.floor(fh / s.gr);
  const cx0 = (s.tcol - 1) * tw;
  const cx1 = s.tcol === s.gc ? fw : s.tcol * tw;
  const rTop = s.gr - s.trow;
  const cy0 = rTop * th;
  const cy1 = rTop === s.gr - 1 ? fh : (rTop + 1) * th;
  const nx = cx1 - cx0;
  const ny = cy1 - cy0;
  const out = new Float32Array(nx * ny);
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const sy = cy1 - 1 - y;
      const sx = cx0 + x;
      out[y * nx + x] = g[sy * fw + sx];
    }
  }

  return { nx, ny, data: out, fw, fh, full: g };
}

// ---- Geometry helpers ----

type Vec3 = [number, number, number];

function pushQuad(
  V: number[],
  a: Vec3,
  b: Vec3,
  c: Vec3,
  d: Vec3
): void {
  V.push(...a, ...b, ...c, ...a, ...c, ...d);
}

function tilePixelBounds(
  hg: ServerHeightGrid,
  c: number,
  r: number,
  gc: number,
  gr: number
) {
  const twp = Math.floor(hg.fw / gc);
  const thp = Math.floor(hg.fh / gr);
  const cx0 = (c - 1) * twp;
  const cx1 = c === gc ? hg.fw : c * twp;
  const rTop = gr - r;
  const cy0 = rTop * thp;
  const cy1 = rTop === gr - 1 ? hg.fh : (rTop + 1) * thp;
  return { cx0, cx1, cy0, cy1 };
}

function sampleTileHeight(
  hg: ServerHeightGrid,
  c: number,
  r: number,
  lx: number,
  ly: number,
  gc: number,
  gr: number,
  pw: number,
  ph: number
): number {
  const b = tilePixelBounds(hg, c, r, gc, gr);
  const tx = Math.max(0, Math.min(1, lx / pw));
  const ty = Math.max(0, Math.min(1, ly / ph));
  const px = b.cx0 + tx * Math.max(0, b.cx1 - b.cx0 - 1);
  const py = b.cy1 - 1 - ty * Math.max(0, b.cy1 - b.cy0 - 1);
  const x0 = Math.max(0, Math.min(hg.fw - 1, Math.floor(px)));
  const y0 = Math.max(0, Math.min(hg.fh - 1, Math.floor(py)));
  const x1 = Math.min(hg.fw - 1, x0 + 1);
  const y1 = Math.min(hg.fh - 1, y0 + 1);
  const fx = px - x0;
  const fy = py - y0;
  const a = hg.full[y0 * hg.fw + x0];
  const bb = hg.full[y0 * hg.fw + x1];
  const cc = hg.full[y1 * hg.fw + x0];
  const d = hg.full[y1 * hg.fw + x1];
  return a * (1 - fx) * (1 - fy) + bb * fx * (1 - fy) + cc * (1 - fx) * fy + d * fx * fy;
}

function reliefTab(
  V: number[],
  hg: ServerHeightGrid,
  c: number,
  r: number,
  x: number,
  y: number,
  sx: number,
  sy: number,
  dx: number,
  dy: number,
  mapLocal: (u: number, v: number) => [number, number],
  s: ServerReliefSettings
): void {
  const nx = Math.max(2, Math.ceil(sx / dx));
  const ny = Math.max(2, Math.ceil(sy / dy));
  const Q = (a: Vec3, b: Vec3, c: Vec3, d: Vec3) => {
    V.push(...a, ...b, ...c, ...a, ...c, ...d);
  };
  const top = (i: number, j: number): Vec3 => {
    const u = (i / nx) * sx;
    const v = (j / ny) * sy;
    const [lx, ly] = mapLocal(u, v);
    return [
      x + u,
      y + v,
      s.base +
        sampleTileHeight(hg, c, r, lx, ly, s.gc, s.gr, s.pw, s.ph) *
          s.relief,
    ];
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      Q(top(i, j), top(i + 1, j), top(i + 1, j + 1), top(i, j + 1));
    }
  }
  Q([x, y, 0], [x, y + sy, 0], [x + sx, y + sy, 0], [x + sx, y, 0]);
  for (let i = 0; i < nx; i++) {
    const x0 = x + (i / nx) * sx;
    const x1 = x + ((i + 1) / nx) * sx;
    Q([x0, y, 0], [x1, y, 0], top(i + 1, 0), top(i, 0));
    Q([x1, y + sy, 0], [x0, y + sy, 0], top(i, ny), top(i + 1, ny));
  }
  for (let j = 0; j < ny; j++) {
    const y0 = y + (j / ny) * sy;
    const y1 = y + ((j + 1) / ny) * sy;
    Q([x, y1, 0], [x, y0, 0], top(0, j), top(0, j + 1));
    Q([x + sx, y0, 0], [x + sx, y1, 0], top(nx, j + 1), top(nx, j));
  }
}

function notchWalls(
  V: number[],
  n: { x0: number; y0: number; x1: number; y1: number },
  W: number,
  H: number,
  z1: number
): void {
  const Q = (a: Vec3, b: Vec3, c: Vec3, d: Vec3) => {
    V.push(...a, ...b, ...c, ...a, ...c, ...d);
  };
  const x0 = Math.max(0, n.x0);
  const x1 = Math.min(W, n.x1);
  const y0 = Math.max(0, n.y0);
  const y1 = Math.min(H, n.y1);
  if (n.x0 < 0) {
    Q([x0, y0, 0], [x1, y0, 0], [x1, y0, z1], [x0, y0, z1]);
    Q([x1, y1, 0], [x0, y1, 0], [x0, y1, z1], [x1, y1, z1]);
    Q([x1, y0, 0], [x1, y1, 0], [x1, y1, z1], [x1, y0, z1]);
  } else {
    Q([x1, y0, 0], [x1, y1, 0], [x1, y1, z1], [x1, y0, z1]);
    Q([x0, y1, 0], [x0, y0, 0], [x0, y0, z1], [x0, y1, z1]);
    Q([x1, y1, 0], [x0, y1, 0], [x0, y1, z1], [x1, y1, z1]);
  }
}


// ---- Snap-lock clip/socket profile (server-side) ----

function polygonArea(poly: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function pointInTriangle2D(
  p: [number, number],
  a: [number, number],
  b: [number, number],
  c: [number, number]
): boolean {
  const area = (p1: [number, number], p2: [number, number], p3: [number, number]) =>
    (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
  const ab = area(a, b, p);
  const bc = area(b, c, p);
  const ca = area(c, a, p);
  const eps = 1e-7;
  return ab >= -eps && bc >= -eps && ca >= -eps;
}

function triangulatePolygon(poly: [number, number][]): [number, number, number][] {
  if (poly.length < 3) return [];
  const remaining = poly.map((_, i) => i);
  const triangles: [number, number, number][] = [];
  let guard = 0;

  while (remaining.length > 3 && guard < poly.length * poly.length) {
    let clipped = false;
    for (let i = 0; i < remaining.length; i++) {
      const prev = remaining[(i - 1 + remaining.length) % remaining.length];
      const curr = remaining[i];
      const next = remaining[(i + 1) % remaining.length];
      const a = poly[prev], b = poly[curr], c = poly[next];
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (cross <= 1e-7) continue;

      const hasPointInside = remaining.some((idx) => (
        idx !== prev &&
        idx !== curr &&
        idx !== next &&
        pointInTriangle2D(poly[idx], a, b, c)
      ));
      if (hasPointInside) continue;

      triangles.push([prev, curr, next]);
      remaining.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
    guard++;
  }

  if (remaining.length === 3) {
    triangles.push([remaining[0], remaining[1], remaining[2]]);
  }

  if (!triangles.length) {
    for (let i = 1; i < poly.length - 1; i++) triangles.push([0, i, i + 1]);
  }

  return triangles;
}

function pushPrism(V: number[], rawPoly: [number, number][], zTop: number): void {
  const poly = polygonArea(rawPoly) < 0 ? [...rawPoly].reverse() : rawPoly;
  const triangles = triangulatePolygon(poly);
  const q = (a: Vec3, b: Vec3, c: Vec3, d: Vec3) => pushQuad(V, a, b, c, d);

  for (const [ia, ib, ic] of triangles) {
    const a: Vec3 = [poly[ia][0], poly[ia][1], zTop];
    const b: Vec3 = [poly[ib][0], poly[ib][1], zTop];
    const c: Vec3 = [poly[ic][0], poly[ic][1], zTop];
    V.push(...a, ...b, ...c);
  }

  for (const [ia, ib, ic] of triangles) {
    const a: Vec3 = [poly[ia][0], poly[ia][1], 0];
    const b: Vec3 = [poly[ic][0], poly[ic][1], 0];
    const c: Vec3 = [poly[ib][0], poly[ib][1], 0];
    V.push(...a, ...b, ...c);
  }

  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    q([x0, y0, 0], [x1, y1, 0], [x1, y1, zTop], [x0, y0, zTop]);
  }
}

function puzzleClickMouthHalf(tabSize: number, edgeLen: number): number {
  const bulbHalf = Math.max(4, Math.min(tabSize, edgeLen * 0.68) / 2);
  return Math.max(2.4, bulbHalf * 0.48);
}

function cubicPoint(
  p0: [number, number],
  c1: [number, number],
  c2: [number, number],
  p1: [number, number],
  t: number
): [number, number] {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
    u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
  ];
}

function pushBezier(
  points: [number, number][],
  p0: [number, number],
  c1: [number, number],
  c2: [number, number],
  p1: [number, number],
  steps: number
): void {
  for (let i = 1; i <= steps; i++) {
    points.push(cubicPoint(p0, c1, c2, p1, i / steps));
  }
}

function puzzleClickProfileLocal(tabSize: number, edgeLen: number, extent: number): [number, number][] {
  const bulbHalf = Math.max(4, Math.min(tabSize, edgeLen * 0.68) / 2);
  const neckHalf = puzzleClickMouthHalf(tabSize, edgeLen);
  const reach = Math.max(1, extent);
  const neckDepth = Math.max(1, Math.min(reach * 0.34, reach - 0.7));
  const headDepth = neckDepth + (reach - neckDepth) * 0.45;
  const handle = Math.max(0.8, reach * 0.18);
  const points: [number, number][] = [[0, -neckHalf], [neckDepth, -neckHalf]];

  pushBezier(points, [neckDepth, -neckHalf], [neckDepth + handle, -neckHalf], [headDepth - handle, -bulbHalf], [headDepth, -bulbHalf], 6);
  pushBezier(points, [headDepth, -bulbHalf], [reach - handle, -bulbHalf], [reach, -bulbHalf * 0.42], [reach, 0], 6);
  pushBezier(points, [reach, 0], [reach, bulbHalf * 0.42], [reach - handle, bulbHalf], [headDepth, bulbHalf], 6);
  pushBezier(points, [headDepth, bulbHalf], [headDepth - handle, bulbHalf], [neckDepth + handle, neckHalf], [neckDepth, neckHalf], 6);
  points.push([0, neckHalf]);
  return points;
}

function pointInPolygon2D(point: [number, number], poly: [number, number][]): boolean {
  let inside = false;
  const [px, py] = point;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersects = ((yi > py) !== (yj > py)) &&
      px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function puzzleClickPolygon(
  edgeAxis: 'x' | 'y',
  edgePos: number,
  edgeStart: number,
  edgeEnd: number,
  dir: number,
  tabSize: number,
  extent: number
): [number, number][] {
  const edgeLen = Math.max(1, edgeEnd - edgeStart);
  const center = edgeStart + edgeLen / 2;
  return puzzleClickProfileLocal(tabSize, edgeLen, extent).map(([normal, along]) => {
    const x = edgeAxis === 'x' ? edgePos + dir * normal : center + along;
    const y = edgeAxis === 'x' ? center + along : edgePos + dir * normal;
    return [x, y];
  });
}

function puzzleTab(
  V: number[], edgeAxis: 'x' | 'y', edgePos: number,
  edgeStart: number, edgeEnd: number, dir: number,
  zTop: number, tabSize: number, extent: number
) {
  pushPrism(V, puzzleClickPolygon(edgeAxis, edgePos, edgeStart, edgeEnd, dir, tabSize, extent), zTop);
}

function puzzleBlank(
  V: number[], edgeAxis: 'x' | 'y', edgePos: number,
  edgeStart: number, edgeEnd: number, dir: number,
  zTop: number, tabSize: number, extent: number
) {
  const q = (a: Vec3, b: Vec3, c: Vec3, d: Vec3) => pushQuad(V, a, b, c, d);
  const poly = puzzleClickPolygon(edgeAxis, edgePos, edgeStart, edgeEnd, dir, tabSize, extent);

  for (let i = 0; i < poly.length - 1; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[i + 1];
    q([x0, y0, 0], [x1, y1, 0], [x1, y1, zTop], [x0, y0, zTop]);
  }
}

// ---- Build panel geometry (server-side) ----

export function buildGeometryServer(
  hg: ServerHeightGrid,
  s: ServerReliefSettings
): ServerGeometryResult {
  const { nx, ny, data } = hg;
  const W = s.pw,
    H = s.ph,
    base = s.base,
    relief = s.relief;
  const V: number[] = [];
  const q = (a: Vec3, b: Vec3, c: Vec3, d: Vec3) =>
    pushQuad(V, a, b, c, d);
  const Z = (x: number, y: number) => base + data[y * nx + x] * relief;
  const dx = nx > 1 ? W / (nx - 1) : W;
  const dy = ny > 1 ? H / (ny - 1) : H;
  const hasR = s.tcol < s.gc;
  const hasU = s.trow < s.gr;
  const hasL = s.tcol > 1;
  const hasD = s.trow > 1;
  const oy = H * s.offY;
  const ox = W * s.offX;
  const tw = s.tw;
  const to_ = s.to;
  const clr = s.tc;

  const usePuzzle = s.puzzleOn;
  const puzzleSz = s.puzzleSize;
  const puzzleExt = s.puzzleExtent;
  
  // Parse edge map for snap-lock mode; fall back to a deterministic map for older projects.
  const edgeMap = usePuzzle ? getPuzzleEdgeMap(s.puzzleEdges, s.gc, s.gr) : null;
  const col = s.tcol - 1; // 0-indexed
  const row = s.trow - 1; // 0-indexed
  
  // Determine edge types for this tile
  const getEdgeType = (edge: 'right' | 'left' | 'top' | 'bottom'): { type: 'tab' | 'blank' | 'flat'; dir: number } => {
    if (!edgeMap) return { type: 'flat', dir: 1 };
    
    if (edge === 'right') {
      if (!hasR) return { type: 'flat', dir: 1 };
      const seam = edgeMap.v[col * s.gr + row];
      return { type: seam === 1 ? 'tab' : 'blank', dir: seam };
    }
    if (edge === 'left') {
      if (!hasL) return { type: 'flat', dir: 1 };
      const seam = edgeMap.v[(col - 1) * s.gr + row];
      return { type: seam === 1 ? 'blank' : 'tab', dir: seam };
    }
    if (edge === 'top') {
      if (!hasU) return { type: 'flat', dir: 1 };
      const seam = edgeMap.h[row * s.gc + col];
      return { type: seam === 1 ? 'tab' : 'blank', dir: seam };
    }
    if (edge === 'bottom') {
      if (!hasD) return { type: 'flat', dir: 1 };
      const seam = edgeMap.h[(row - 1) * s.gc + col];
      return { type: seam === 1 ? 'blank' : 'tab', dir: seam };
    }
    return { type: 'flat', dir: 1 };
  };
  
  const rightEdge = getEdgeType('right');
  const leftEdge = getEdgeType('left');
  const topEdge = getEdgeType('top');
  const bottomEdge = getEdgeType('bottom');

  const notches: { x0: number; y0: number; x1: number; y1: number }[] = [];
  if (s.join && !usePuzzle && hasL)
    notches.push({
      x0: -1,
      y0: H / 2 + oy - (tw + 2 * clr) / 2,
      x1: to_ + clr,
      y1: H / 2 + oy + (tw + 2 * clr) / 2,
    });
  if (s.join && !usePuzzle && hasD)
    notches.push({
      x0: W / 2 + ox - (tw + 2 * clr) / 2,
      y0: -1,
      x1: W / 2 + ox + (tw + 2 * clr) / 2,
      y1: to_ + clr,
    });
  const inNotch = (cx: number, cy: number) =>
    notches.some(
      (n) => cx > n.x0 && cx < n.x1 && cy > n.y0 && cy < n.y1
    );

  const snapSockets: { edge: 'left' | 'bottom' | 'right' | 'top'; center: number; profile: [number, number][] }[] = [];
  const snapTabs: { edge: 'left' | 'bottom' | 'right' | 'top'; center: number; halfSize: number; depth: number }[] = [];
  const socketHalfX = Math.min((puzzleSz + 2 * clr) / 2, Math.max(3, W * 0.34));
  const socketHalfY = Math.min((puzzleSz + 2 * clr) / 2, Math.max(3, H * 0.34));
  const tabHalfX = puzzleClickMouthHalf(puzzleSz, W);
  const tabHalfY = puzzleClickMouthHalf(puzzleSz, H);
  const socketDepth = puzzleExt + clr;
  const socketProfileX = puzzleClickProfileLocal(socketHalfX * 2, W, socketDepth);
  const socketProfileY = puzzleClickProfileLocal(socketHalfY * 2, H, socketDepth);

  if (usePuzzle) {
    if (rightEdge.type === 'tab') snapTabs.push({ edge: 'right', center: H / 2, halfSize: tabHalfY, depth: puzzleExt });
    if (rightEdge.type === 'blank') snapSockets.push({ edge: 'right', center: H / 2, profile: socketProfileY });
    if (leftEdge.type === 'tab') snapTabs.push({ edge: 'left', center: H / 2, halfSize: tabHalfY, depth: puzzleExt });
    if (leftEdge.type === 'blank') snapSockets.push({ edge: 'left', center: H / 2, profile: socketProfileY });
    if (topEdge.type === 'tab') snapTabs.push({ edge: 'top', center: W / 2, halfSize: tabHalfX, depth: puzzleExt });
    if (topEdge.type === 'blank') snapSockets.push({ edge: 'top', center: W / 2, profile: socketProfileX });
    if (bottomEdge.type === 'tab') snapTabs.push({ edge: 'bottom', center: W / 2, halfSize: tabHalfX, depth: puzzleExt });
    if (bottomEdge.type === 'blank') snapSockets.push({ edge: 'bottom', center: W / 2, profile: socketProfileX });
  }

  const inSnapSocket = (cx: number, cy: number) => snapSockets.some((socket) => {
    if (socket.edge === 'left') return pointInPolygon2D([cx, cy - socket.center], socket.profile);
    if (socket.edge === 'right') return pointInPolygon2D([W - cx, cy - socket.center], socket.profile);
    if (socket.edge === 'bottom') return pointInPolygon2D([cy, cx - socket.center], socket.profile);
    return pointInPolygon2D([H - cy, cx - socket.center], socket.profile);
  });

  const inSnapTab = (cx: number, cy: number) => snapTabs.some((tab) => {
    if (tab.edge === 'left') return cx <= Math.max(1, tab.depth) && Math.abs(cy - tab.center) <= tab.halfSize;
    if (tab.edge === 'right') return cx >= W - Math.max(1, tab.depth) && Math.abs(cy - tab.center) <= tab.halfSize;
    if (tab.edge === 'bottom') return cy <= Math.max(1, tab.depth) && Math.abs(cx - tab.center) <= tab.halfSize;
    return cy >= H - Math.max(1, tab.depth) && Math.abs(cx - tab.center) <= tab.halfSize;
  });

  // top relief
  for (let y = 0; y < ny - 1; y++) {
    for (let x = 0; x < nx - 1; x++) {
      const x0 = x * dx,
        x1 = (x + 1) * dx,
        y0 = y * dy,
        y1 = (y + 1) * dy;
      if (
        inNotch((x0 + x1) / 2, (y0 + y1) / 2) ||
        inSnapSocket((x0 + x1) / 2, (y0 + y1) / 2)
      ) continue;
      q(
        [x0, y0, Z(x, y)],
        [x1, y0, Z(x + 1, y)],
        [x1, y1, Z(x + 1, y + 1)],
        [x0, y1, Z(x, y + 1)]
      );
    }
  }
  // bottom
  for (let y = 0; y < ny - 1; y++) {
    for (let x = 0; x < nx - 1; x++) {
      const x0 = x * dx,
        x1 = (x + 1) * dx,
        y0 = y * dy,
        y1 = (y + 1) * dy;
      if (
        inNotch((x0 + x1) / 2, (y0 + y1) / 2) ||
        inSnapSocket((x0 + x1) / 2, (y0 + y1) / 2)
      ) continue;
      q([x0, y0, 0], [x0, y1, 0], [x1, y1, 0], [x1, y0, 0]);
    }
  }
  // perimeter relief walls
  for (let x = 0; x < nx - 1; x++) {
    const xa = x * dx, xb = (x + 1) * dx;
    // Bottom edge (y = 0)
    if (!inNotch((xa + xb) / 2, 0.5) && !inSnapSocket((xa + xb) / 2, 0.5)) {
      const z0 = inSnapTab((xa + xb) / 2, 0.5) ? base : 0;
      q([xa, 0, z0], [xb, 0, z0], [xb, 0, Z(x + 1, 0)], [xa, 0, Z(x, 0)]);
    }
    // Top edge (y = H)
    if (!inNotch((xa + xb) / 2, H - 0.5) && !inSnapSocket((xa + xb) / 2, H - 0.5)) {
      const z0 = inSnapTab((xa + xb) / 2, H - 0.5) ? base : 0;
      q([xb, H, z0], [xa, H, z0], [xa, H, Z(x, ny - 1)], [xb, H, Z(x + 1, ny - 1)]);
    }
  }
  for (let y = 0; y < ny - 1; y++) {
    const ya = y * dy, yb = (y + 1) * dy;
    // Left edge (x = 0)
    if (!inNotch(0.5, (ya + yb) / 2) && !inSnapSocket(0.5, (ya + yb) / 2)) {
      const z0 = inSnapTab(0.5, (ya + yb) / 2) ? base : 0;
      q([0, yb, z0], [0, ya, z0], [0, ya, Z(0, y)], [0, yb, Z(0, y + 1)]);
    }
    // Right edge (x = W)
    if (!inNotch(W - 0.5, (ya + yb) / 2) && !inSnapSocket(W - 0.5, (ya + yb) / 2)) {
      const z0 = inSnapTab(W - 0.5, (ya + yb) / 2) ? base : 0;
      q([W, ya, z0], [W, yb, z0], [W, yb, Z(nx - 1, y + 1)], [W, ya, Z(nx - 1, y)]);
    }
  }
  // notch inner walls
  for (const n of notches) {
    notchWalls(V, n, W, H, base + relief);
  }
  // tabs (regular join or puzzle)
  if (!usePuzzle) {
    if (s.join && hasR) {
      const tabY = H / 2 + oy - tw / 2;
      reliefTab(
        V,
        hg,
        s.tcol + 1,
        s.trow,
        W,
        tabY,
        to_,
        tw,
        dx,
        dy,
        (u, v) => [u, tabY + v],
        s
      );
    }
    if (s.join && hasU) {
      const tabX = W / 2 + ox - tw / 2;
      reliefTab(
        V,
        hg,
        s.tcol,
        s.trow + 1,
        tabX,
        H,
        tw,
        to_,
        dx,
        dy,
        (u, v) => [tabX + u, v],
        s
      );
    }
  } else {
    // Snap-lock edges: tab protrudes at bed height, blank cuts a matching through-socket.
    const tabZ = base;
    const socketZ = base + relief;
    const socketWidth = puzzleSz + 2 * clr;
    const socketReach = puzzleExt + clr;
    
    // Right edge (x = W)
    if (rightEdge.type === 'tab') {
      puzzleTab(V, 'x', W, 0, H, rightEdge.dir, tabZ, puzzleSz, puzzleExt);
    } else if (rightEdge.type === 'blank') {
      puzzleBlank(V, 'x', W, 0, H, rightEdge.dir, socketZ, socketWidth, socketReach);
    }
    // Left edge (x = 0)
    if (leftEdge.type === 'tab') {
      puzzleTab(V, 'x', 0, 0, H, leftEdge.dir, tabZ, puzzleSz, puzzleExt);
    } else if (leftEdge.type === 'blank') {
      puzzleBlank(V, 'x', 0, 0, H, leftEdge.dir, socketZ, socketWidth, socketReach);
    }
    // Top edge (y = H)
    if (topEdge.type === 'tab') {
      puzzleTab(V, 'y', H, 0, W, topEdge.dir, tabZ, puzzleSz, puzzleExt);
    } else if (topEdge.type === 'blank') {
      puzzleBlank(V, 'y', H, 0, W, topEdge.dir, socketZ, socketWidth, socketReach);
    }
    // Bottom edge (y = 0)
    if (bottomEdge.type === 'tab') {
      puzzleTab(V, 'y', 0, 0, W, bottomEdge.dir, tabZ, puzzleSz, puzzleExt);
    } else if (bottomEdge.type === 'blank') {
      puzzleBlank(V, 'y', 0, 0, W, bottomEdge.dir, socketZ, socketWidth, socketReach);
    }
  }

  const bboxW = usePuzzle
    ? W + (rightEdge.type === 'tab' ? puzzleExt : 0) + (leftEdge.type === 'tab' ? puzzleExt : 0)
    : (hasR ? W + to_ : W);
  const bboxH = usePuzzle
    ? H + (topEdge.type === 'tab' ? puzzleExt : 0) + (bottomEdge.type === 'tab' ? puzzleExt : 0)
    : (hasU ? H + to_ : H);

  return {
    array: new Float32Array(V),
    tris: V.length / 9,
    nx,
    ny,
    bbox: [bboxW, bboxH, base + relief],
  };
}

// ---- Build mold geometry (server-side) ----

export function buildMoldGeometryServer(
  hg: ServerHeightGrid,
  s: ServerReliefSettings
): ServerGeometryResult {
  const { nx, ny, data } = hg;
  const W = s.pw,
    H = s.ph,
    cav = s.relief,
    wall = s.mw,
    rim = s.mr,
    floor = s.mw;
  const oW = W + 2 * wall,
    oH = H + 2 * wall,
    total = floor + cav + rim;
  const V: number[] = [];
  const q = (a: Vec3, b: Vec3, c: Vec3, d: Vec3) =>
    pushQuad(V, a, b, c, d);

  // outer box
  q([0, 0, 0], [0, oH, 0], [oW, oH, 0], [oW, 0, 0]);
  q([0, 0, 0], [oW, 0, 0], [oW, 0, total], [0, 0, total]);
  q([oW, oH, 0], [0, oH, 0], [0, oH, total], [oW, oH, total]);
  q([0, oH, 0], [0, 0, 0], [0, 0, total], [0, oH, total]);
  q([oW, 0, 0], [oW, oH, 0], [oW, oH, total], [oW, 0, total]);

  // top rim (4 strips around cavity opening)
  const ix0 = wall,
    ix1 = wall + W,
    iy0 = wall,
    iy1 = wall + H;
  q([0, 0, total], [oW, 0, total], [oW, iy0, total], [0, iy0, total]);
  q(
    [0, iy1, total],
    [oW, iy1, total],
    [oW, oH, total],
    [0, oH, total]
  );
  q(
    [0, iy0, total],
    [ix0, iy0, total],
    [ix0, iy1, total],
    [0, iy1, total]
  );
  q(
    [ix1, iy0, total],
    [oW, iy0, total],
    [oW, iy1, total],
    [ix1, iy1, total]
  );

  // cavity inner walls
  q(
    [ix0, iy0, total],
    [ix0, iy0, floor],
    [ix1, iy0, floor],
    [ix1, iy0, total]
  );
  q(
    [ix1, iy1, total],
    [ix1, iy1, floor],
    [ix0, iy1, floor],
    [ix0, iy1, total]
  );
  q(
    [ix0, iy1, total],
    [ix0, iy1, floor],
    [ix0, iy0, floor],
    [ix0, iy0, total]
  );
  q(
    [ix1, iy0, total],
    [ix1, iy0, floor],
    [ix1, iy1, floor],
    [ix1, iy1, total]
  );

  // cavity floor (inverted relief)
  const ddx = W / (nx - 1);
  const ddy = H / (ny - 1);
  const ZZ = (x: number, y: number) =>
    floor + (1 - data[y * nx + x]) * cav;
  for (let y = 0; y < ny - 1; y++) {
    for (let x = 0; x < nx - 1; x++) {
      const X0 = ix0 + x * ddx,
        X1 = ix0 + (x + 1) * ddx;
      const Y0 = iy0 + y * ddy,
        Y1 = iy0 + (y + 1) * ddy;
      q(
        [X0, Y0, ZZ(x, y)],
        [X0, Y1, ZZ(x, y + 1)],
        [X1, Y1, ZZ(x + 1, y + 1)],
        [X1, Y0, ZZ(x + 1, y)]
      );
    }
  }

  return {
    array: new Float32Array(V),
    tris: V.length / 9,
    nx,
    ny,
    bbox: [oW, oH, total],
  };
}

// ---- STL binary export (server-side, returns Buffer) ----

export function toSTLBuffer(geo: ServerGeometryResult): Buffer {
  const t = geo.tris;
  const buf = Buffer.alloc(84 + t * 50);
  // 80-byte header (zeros)
  buf.writeUInt32LE(t, 80);
  let o = 84;
  const a = geo.array;
  for (let i = 0; i < t; i++) {
    const b = i * 9;
    const ax = a[b],
      ay = a[b + 1],
      az = a[b + 2];
    const bx = a[b + 3],
      by = a[b + 4],
      bz = a[b + 5];
    const cx = a[b + 6],
      cy = a[b + 7],
      cz = a[b + 8];
    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    buf.writeFloatLE(nx, o);
    buf.writeFloatLE(ny, o + 4);
    buf.writeFloatLE(nz, o + 8);
    o += 12;
    for (let k = 0; k < 9; k++) {
      buf.writeFloatLE(a[b + k], o);
      o += 4;
    }
    buf.writeUInt16LE(0, o);
    o += 2;
  }
  return buf;
}

export function toOBJBuffer(geo: ServerGeometryResult): Buffer {
  const t = geo.tris;
  const a = geo.array;
  
  // Collect unique vertices
  const vertexMap = new Map<string, number>();
  const vertices: number[][] = [];
  const faces: number[][] = [];
  
  for (let i = 0; i < t; i++) {
    const b = i * 9;
    const face: number[] = [];
    
    for (let v = 0; v < 3; v++) {
      const x = a[b + v * 3];
      const y = a[b + v * 3 + 1];
      const z = a[b + v * 3 + 2];
      const key = `${x},${y},${z}`;
      
      let idx = vertexMap.get(key);
      if (idx === undefined) {
        idx = vertices.length;
        vertexMap.set(key, idx);
        vertices.push([x, y, z]);
      }
      face.push(idx);
    }
    
    faces.push(face);
  }
  
  // Build OBJ string
  let obj = '# ReliefForge OBJ Export\n';
  obj += `# Vertices: ${vertices.length}\n`;
  obj += `# Faces: ${faces.length}\n\n`;
  
  for (const [x, y, z] of vertices) {
    obj += `v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}\n`;
  }
  
  obj += '\n';
  
  for (const face of faces) {
    // OBJ uses 1-based indexing
    obj += `f ${face[0] + 1} ${face[1] + 1} ${face[2] + 1}\n`;
  }
  
  return Buffer.from(obj, 'utf-8');
}
