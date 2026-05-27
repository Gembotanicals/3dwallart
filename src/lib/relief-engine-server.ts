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
  const dx = W / (nx - 1);
  const dy = H / (ny - 1);
  const hasR = s.tcol < s.gc;
  const hasU = s.trow < s.gr;
  const hasL = s.tcol > 1;
  const hasD = s.trow > 1;
  const oy = H * s.offY;
  const ox = W * s.offX;
  const tw = s.tw;
  const to_ = s.to;
  const clr = s.tc;

  const notches: { x0: number; y0: number; x1: number; y1: number }[] = [];
  if (s.join && hasL)
    notches.push({
      x0: -1,
      y0: H / 2 + oy - (tw + 2 * clr) / 2,
      x1: to_ + clr,
      y1: H / 2 + oy + (tw + 2 * clr) / 2,
    });
  if (s.join && hasD)
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

  // top relief
  for (let y = 0; y < ny - 1; y++) {
    for (let x = 0; x < nx - 1; x++) {
      const x0 = x * dx,
        x1 = (x + 1) * dx,
        y0 = y * dy,
        y1 = (y + 1) * dy;
      if (inNotch((x0 + x1) / 2, (y0 + y1) / 2)) continue;
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
      if (inNotch((x0 + x1) / 2, (y0 + y1) / 2)) continue;
      q([x0, y0, 0], [x0, y1, 0], [x1, y1, 0], [x1, y0, 0]);
    }
  }
  // perimeter relief walls
  for (let x = 0; x < nx - 1; x++) {
    const xa = x * dx,
      xb = (x + 1) * dx;
    if (!inNotch((xa + xb) / 2, 0.5))
      q(
        [xa, 0, 0],
        [xb, 0, 0],
        [xb, 0, Z(x + 1, 0)],
        [xa, 0, Z(x, 0)]
      );
    q(
      [xb, H, 0],
      [xa, H, 0],
      [xa, H, Z(x, ny - 1)],
      [xb, H, Z(x + 1, ny - 1)]
    );
  }
  for (let y = 0; y < ny - 1; y++) {
    const ya = y * dy,
      yb = (y + 1) * dy;
    if (!inNotch(0.5, (ya + yb) / 2))
      q(
        [0, yb, 0],
        [0, ya, 0],
        [0, ya, Z(0, y)],
        [0, yb, Z(0, y + 1)]
      );
    q(
      [W, ya, 0],
      [W, yb, 0],
      [W, yb, Z(nx - 1, y + 1)],
      [W, ya, Z(nx - 1, y)]
    );
  }
  // notch inner walls
  for (const n of notches) {
    notchWalls(V, n, W, H, base + relief);
  }
  // tabs
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

  return {
    array: new Float32Array(V),
    tris: V.length / 9,
    nx,
    ny,
    bbox: [hasR ? W + to_ : W, hasU ? H + to_ : H, base + relief],
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
