// ======================= 03 地形生成 =======================
const G = { x0: -380, z0: -230, nx: 761, nz: 461 };
const GN = G.nx * G.nz;

function makeCoastPoly() {
  const { a, b, n } = L.island, pts = [], M = 1440;
  for (let k = 0; k < M; k++) {
    const th = k / M * TAU, c = Math.cos(th), s = Math.sin(th);
    let x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    let z = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    const pert = 1 + 0.024 * SNoise(c * 2.2 + 5, s * 2.2 - 3) + 0.011 * SNoise(c * 7 + 11, s * 7 + 2) + 0.004 * SNoise(c * 25 - 7, s * 25 + 4);
    pts.push([x * pert, z * pert]);
  }
  return pts;
}
function rasterPoly(poly, mask, val = 1) {
  const n = poly.length;
  for (let j = 0; j < G.nz; j++) {
    const z = G.z0 + j, xs = [];
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      if ((a[1] <= z && b[1] > z) || (b[1] <= z && a[1] > z)) xs.push(a[0] + (z - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil(xs[k] - G.x0)), i1 = Math.min(G.nx - 1, Math.floor(xs[k + 1] - G.x0));
      for (let i = i0; i <= i1; i++) mask[j * G.nx + i] = val;
    }
  }
}
function dt1(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}
function edt(mask, featureVal) {
  const w = G.nx, h = G.nz, m = Math.max(w, h);
  const f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), zz = new Float64Array(m + 1);
  const g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = mask[i] === featureVal ? 0 : 1e20;
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; dt1(f, h, d, v, zz); for (let y = 0; y < h; y++) g[y * w + x] = d[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; dt1(f, w, d, v, zz); for (let x = 0; x < w; x++) g[y * w + x] = d[x]; }
  const out = new Float32Array(w * h); for (let i = 0; i < w * h; i++) out[i] = Math.sqrt(g[i]); return out;
}
function signedDist(mask) { // 内正外负
  const dOut = edt(mask, 0), dIn = edt(mask, 1), out = new Float32Array(GN);
  for (let i = 0; i < GN; i++) out[i] = mask[i] ? dOut[i] - 0.5 : -(dIn[i] - 0.5);
  return out;
}
function basinF(x, z) {
  return 3.0 + 0.075 * Math.max(0, 10 - z) + 0.00012 * x * x + 0.55 * fbm(x * 0.012 + 7.3, z * 0.012 - 2.1, 3);
}
function ellAngleDeg(x, z) { let d = Math.atan2(-z / 200, x / 350) * 180 / Math.PI; return d < 0 ? d + 360 : d; }
function crestH(x, z) {
  const deg = ellAngleDeg(x, z), T = CREST_TABLE, n = T.length;
  let k = n - 1; for (let i = 0; i < n; i++) if (T[i][0] <= deg) k = i;
  const a = T[k], b = T[(k + 1) % n];
  const span = (((b[0] - a[0]) % 360) + 360) % 360 || 360;
  const t = ((((deg - a[0]) % 360) + 360) % 360) / span;
  const p0 = T[(k - 1 + n) % n][1], p1 = a[1], p2 = b[1], p3 = T[(k + 2) % n][1];
  const v = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  const ds = (x - 219) * (x - 219) + (z + 141) * (z + 141);
  return v + 3.5 * fbm(x * 0.008 + 3.3, z * 0.008 - 1.2, 3) + 6 * Math.exp(-ds / (2 * 15 * 15));
}
function steepK(x, z) {
  const deg = ellAngleDeg(x, z);
  const bump = (d, a, b, f) => smoothstep(a - f, a + f, d) * (1 - smoothstep(b - f, b + f, d));
  return Math.max(bump(deg, 120, 160, 9), bump(deg, 12, 60, 8));
}
function naturalH(x, z, dC, dB) {
  if (dC <= 0) return -3 - 30 * (1 - Math.exp(dC / 14)) + 1.2 * fbm(x * 0.03, z * 0.03, 2);
  const F = basinF(x, z);
  if (dB >= 0) return F;
  const dOut = -dB, W = dC + dOut, s = dC / W, sc = 0.38;
  const th = Math.atan2(z / 200, x / 350);
  // 崖顶高度沿海岸低频起伏（约 ±20%），打破等高环形墙
  const Hc = crestH(x, z), Hcl = Hc * (0.74 + 0.1 * SNoise(Math.cos(th) * 1.8 + 9, Math.sin(th) * 1.8) + 0.07 * SNoise(Math.cos(th) * 5 - 3, Math.sin(th) * 5 + 2));
  // 冲沟：沿海岸约每 30–40 米一条 V 形切口（避开南部水道），崖线向内退缩
  const harbor = smoothstep(95, 70, Math.abs(x)) * smoothstep(90, 130, z);
  const gph = th * 52 + 2.2 * SNoise(Math.cos(th) * 3 + 20, Math.sin(th) * 3 - 5);
  const gstr = 0.55 + 0.45 * SNoise(Math.cos(th) * 7 + 40, Math.sin(th) * 7);
  const gully = Math.pow(Math.max(0, Math.cos(gph)), 10) * gstr * (1 - harbor);
  const dCe = dC - gully * 7 * (1 - smoothstep(10, 28, dC));
  const cliffW = (5 + 3.5 * (0.5 + 0.5 * SNoise(x * 0.02 - 4, z * 0.02 + 6))) * (1 + 0.35 * SNoise(Math.cos(th) * 11 + 3, Math.sin(th) * 11));
  const c = smoothstep(0, cliffW, dCe);
  // 岩架：崖面剖面叠加 2–3 级台阶
  const lv = Math.pow(c, 0.55) * 3, stepv = (Math.floor(lv) + smoothstep(0.62, 1.0, lv - Math.floor(lv))) / 3;
  const cp = lerp(Math.pow(c, 0.55), stepv, 0.32 * (1 - harbor));
  let h;
  if (s <= sc) {
    const tr = smoothstep(Math.min(cliffW / W, sc * 0.9), sc, s);
    const top = Hcl + (Hc - Hcl) * tr;
    h = -3 + (top + 3) * cp;
  } else {
    const u = (s - sc) / (1 - sc), k = steepK(x, z);
    const hMod = lerp(Hc, F, smoothstep(0, 1, u));
    const plat = Hc - (Hc - F) * 0.22 * smoothstep(0, 1, u);
    const gFall = Math.exp(-(((x - 202) ** 2) + ((z + 80) ** 2)) / (2 * 20 * 20));
    const cliffIn = (9 + 4 * SNoise(x * 0.03 + 2, z * 0.03)) * (1 - 0.72 * gFall);
    const hSteep = F + (plat - F) * Math.pow(smoothstep(0, cliffIn, dOut), 0.6);
    h = lerp(hMod, hSteep, k);
    if (dC < cliffW) h = -3 + (h + 3) * cp;
    // 内侧岩壁的粗糙度
    const face = k * smoothstep(0, 3, dOut) * (1 - smoothstep(cliffIn * 0.8, cliffIn * 1.6, dOut));
    h += face * 2.5 * fbm(x * 0.12 + 5, z * 0.12 - 5, 3);
  }
  h -= gully * 9 * (1 - smoothstep(4, 26, dC)) * smoothstep(0, 4, dC);
  const bell = Math.sin(Math.PI * clamp(s, 0, 1));
  h += bell * (3.5 * fbm(x * 0.018 + 3.1, z * 0.018 + 1.7, 4) + 1.0 * fbm(x * 0.09, z * 0.09, 2));
  h += (1 - c) * c * 4 * 2.4 * fbm(x * 0.2 + 1, z * 0.2 - 2, 2);
  return h;
}
function sampleGrid(A, x, z) {
  const fx = clamp(x - G.x0, 0, G.nx - 1.001), fz = clamp(z - G.z0, 0, G.nz - 1.001);
  const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j, k = j * G.nx + i;
  return lerp(lerp(A[k], A[k + 1], tx), lerp(A[k + G.nx], A[k + G.nx + 1], tx), tz);
}
function lakeSD(x, z, lk, amp) {
  const dx = x - lk.x, dz = z - lk.z, ang = Math.atan2(dz, dx);
  const r = Math.hypot(dx / lk.a, dz / lk.b);
  const wob = 1 + amp * SNoise(Math.cos(ang) * 1.4 + lk.x * 0.1, Math.sin(ang) * 1.4 + lk.z * 0.1);
  return (wob - r) * Math.min(lk.a, lk.b);
}
// 瀑布几何（落点、唇口），供地形与水体共用
const FALL = (function () {
  const lk = L.upperLake;
  const lip = { x: 200.4, z: -82.0, y: L.upperLake.level - 0.35 };
  const plunge = { x: 194.4, z: -80.6, y: L.lake.level };
  return { lip, plunge, src: { x: lk.x - lk.a + 0.8, z: lk.z + 0.4 } };
})();

// 水田：扰动 Voronoi 划分
const PADDY = (function () {
  const r = L.rice, seeds = [];
  const rows = [[-79, [22, 58, 82]], [-64, [16, 44, 74]], [-50, [26, 60, 84]], [-36, [15, 46, 76]], [-26, [34, 72]]];
  for (const [z, xs] of rows) for (const x of xs) seeds.push({ x: x + rr(-4, 4), z: z + rr(-3, 3) });
  seeds.forEach(s => { s.level = Math.round((basinF(s.x, s.z) - 0.1) * 2.5) / 2.5; });
  function id(x, z) {
    const wx = x + 3.2 * SNoise(x * 0.06, z * 0.06 + 3), wz = z + 3.2 * SNoise(x * 0.06 + 7, z * 0.06);
    let best = 0, bd = 1e9;
    for (let i = 0; i < seeds.length; i++) { const d = (wx - seeds[i].x) ** 2 + (wz - seeds[i].z) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  }
  const inside = (x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
  return { seeds, id, inside };
})();

const PADS = [
  { cx: L.plateau.x, cz: L.plateau.z, hw: L.plateau.len / 2, hd: L.plateau.wid / 2, rot: L.plateau.rot, h: L.plateau.h, blend: 12 },
  { cx: L.westTower.x, cz: L.westTower.z, hw: 6.5, hd: 6.5, rot: 0, h: 20, blend: 6 },
  { cx: L.summitPad.x, cz: L.summitPad.z, hw: L.summitPad.hw, hd: L.summitPad.hd, rot: L.summitPad.rot, h: L.summitPad.h, blend: 7 },
  { cx: 0, cz: -150, hw: 19, hd: 13, rot: 0, h: 15.0, blend: 7 },
  { cx: 0, cz: -116, hw: 10, hd: 18.5, rot: 0, h: 13.2, blend: 4 },
  { cx: 181, cz: -47, hw: 17, hd: 14.5, rot: 0, h: 11.2, blend: 5 },
  { cx: L.parking.x, cz: L.parking.z, hw: 14, hd: 10, rot: 0, h: 8.6, blend: 5 },
  { cx: L.barn.x, cz: L.barn.z, hw: 15.5, hd: 8.5, rot: 0, h: 13.0, blend: 5 },
  { cx: -115, cz: -8, hw: 29, hd: 18, rot: 0, h: 5.9, blend: 6 },
  { cx: L.pig.x, cz: L.pig.z, hw: 13, hd: 11, rot: 0, h: 5.0, blend: 3 },
  { cx: L.chicken.x, cz: L.chicken.z, hw: 13, hd: 11, rot: 0, h: 4.4, blend: 3 },
  { cx: L.gateTower.x, cz: L.gateTower.z, hw: 5.2, hd: 5.2, rot: 0, h: 2.2, blend: 1.2 },
  { cx: L.duck.x, cz: L.duck.z, hw: 12, hd: 4.5, rot: 0, h: 10.9, blend: 3 },
  { cx: L.pwWest.x, cz: L.pwWest.z, hw: 5, hd: 3, rot: -0.35, h: null, blend: 3 },
];

function buildTerrain(progress) {
  const H = new Float32Array(GN);
  const coastPoly = makeCoastPoly();
  const coastMask = new Uint8Array(GN); rasterPoly(coastPoly, coastMask);
  const sdC = signedDist(coastMask);
  const basinPoly = smoothClosed(L.basin, 10);
  const basinMask = new Uint8Array(GN); rasterPoly(basinPoly, basinMask);
  const sdB = signedDist(basinMask);
  for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
    const k = j * G.nx + i; H[k] = naturalH(G.x0 + i, G.z0 + j, sdC[k], sdB[k]);
  }
  const X = { H, coastPoly, basinPoly, sdC, sdB };
  // ---- 南侧水道与泊港 ----
  const lagPoly = smoothClosed(L.lagoon, 6); X.lagPoly = lagPoly;
  const wMask = new Uint8Array(GN); rasterPoly(lagPoly, wMask);
  for (let j = 0; j < G.nz; j++) { const z = G.z0 + j; if (z < L.notch.zGate - 1.5) continue; for (let i = 0; i < G.nx; i++) { const x = G.x0 + i; if (x >= L.notch.x0 && x <= L.notch.x1) wMask[j * G.nx + i] = 1; } }
  const sdW = signedDist(wMask); X.sdW = sdW;
  X.beachW = (x, z) => smoothstep(58, 44, z) * smoothstep(72, 58, Math.abs(x));
  for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
    const k = j * G.nx + i, d = sdW[k]; if (d < -45) continue;
    const x = G.x0 + i, z = G.z0 + j, bw = X.beachW(x, z);
    if (d >= 0) {
      let depth;
      if (z >= L.notch.zGate - 1.5) depth = 10.5 + 1.5 * fbm(x * 0.05, z * 0.05, 2);
      else depth = lerp(Math.min(6.8, 1.4 + d * 0.5), Math.min(6.8, d * 0.065 + d * d * 0.0012), bw) + 0.3 * fbm(x * 0.07, z * 0.07, 2) * (1 - bw * 0.85);
      H[k] = Math.min(H[k] < -0.5 && z > L.notch.zGate + 20 ? H[k] : 99, -depth);
    } else {
      const dd = -d, hn = H[k];
      // 沙滩：水线处与水下缓坡连续（约 1:16），中段平缓，后缘一道低矮沙堤再接绿地
      const hBeach = lerp(0.02 + dd * 0.06 + 0.35 * smoothstep(20, 30, dd), hn, smoothstep(30, 42, dd));
      const wallW = z > 116 ? 1.3 : 3.0;
      const hBank = lerp(Math.min(0.9 + 0.5 * fbm(x * 0.2, z * 0.2, 2), hn), hn, smoothstep(0, wallW, dd));
      H[k] = lerp(hBank, hBeach, bw);
    }
  }
  // ---- 淡水湖、山顶小湖与瀑布 ----
  const lk = L.lake, ul = L.upperLake;
  const ulTerrace = { x: ul.x + 3, z: ul.z, a: ul.a + 10, b: ul.b + 10 };
  for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
    const k = j * G.nx + i, x = G.x0 + i, z = G.z0 + j;
    if (Math.abs(x - ul.x) < 45 && Math.abs(z - ul.z) < 40 && sdB[k] < -0.8) {
      const dt = lakeSD(x, z, ulTerrace, 0.08);
      H[k] = lerp(ul.level + 0.9 + 0.3 * fbm(x * 0.2, z * 0.2, 2), H[k], smoothstep(0, 7, -dt));
      const d2 = lakeSD(x, z, ul, 0.12);
      if (d2 > 0) H[k] = ul.level - Math.min(2.2, 0.3 + d2 * 0.5);
      else if (d2 > -3) H[k] = Math.min(H[k], lerp(ul.level + 0.25, H[k], smoothstep(0, 3, -d2)));
      // 出水口小溪与跌水口
      const [sd] = segDist(x, z, FALL.src.x, FALL.src.z, FALL.lip.x, FALL.lip.z);
      if (sd < 3) H[k] = Math.min(H[k], lerp(ul.level - 0.6, H[k], smoothstep(1.0, 3, sd)));
    }
    if (Math.abs(x - lk.x) < 40 && Math.abs(z - lk.z) < 32) {
      const d = lakeSD(x, z, lk, 0.1);
      if (d > 0) H[k] = lk.level - Math.min(2.8, 0.3 + d * 0.42) + 0.2 * fbm(x * 0.1, z * 0.1, 2);
      else if (d > -6) H[k] = lerp(lk.level + 0.3, H[k], smoothstep(0, 6, -d));
    }
    // 瀑布槽口
    const [sf, tf] = segDist(x, z, FALL.lip.x, FALL.lip.z, FALL.plunge.x, FALL.plunge.z);
    if (sf < 5 && tf > 0.02 && tf < 0.98) {
      const yf = lerp(FALL.lip.y, FALL.plunge.y, tf) - 1.2;
      H[k] = Math.min(H[k], lerp(yf, H[k], smoothstep(1.5, 5, sf)));
    }
  }
  if (progress) progress(0.35);
  // ---- 平台与场地整平 ----
  for (const p of PADS) {
    if (p.h === null) p.h = sampleGrid(H, p.cx, p.cz);
    applyPad(H, (x, z) => rectSD(x, z, p.cx, p.cz, p.hw, p.hd, p.rot), () => p.h, p.cx, p.cz, Math.max(p.hw, p.hd) + p.blend + 2, p.blend);
  }
  // 别墅泳池：下沉池体（池底 9.95）
  applyPad(H, (x, z) => rectSD(x, z, 180, -58.6, 7.2, 2.15, 0), () => 9.9, 180, -58.6, 10, 0.4);
  const so = L.solar;
  applyPad(H, (x, z) => rectSD(x, z, (so.x0 + so.x1) / 2, (so.z0 + so.z1) / 2, (so.x1 - so.x0) / 2 + 4, (so.z1 - so.z0) / 2 + 3, 0),
    (x, z) => lerp(48.8, 44.2, clamp((z - so.z0) / (so.z1 - so.z0), 0, 1)), (so.x0 + so.x1) / 2, (so.z0 + so.z1) / 2, 50, 9);
  for (const t of L.turbines) { const h0 = sampleGrid(H, t[0], t[1]); applyPad(H, (x, z) => Math.hypot(x - t[0], z - t[1]) - 5, () => h0, t[0], t[1], 12, 4); }
  // ---- 水田梯田 ----
  const pid = new Int16Array(GN).fill(-1);
  for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
    const x = G.x0 + i, z = G.z0 + j; if (!PADDY.inside(x, z)) continue;
    pid[j * G.nx + i] = PADDY.id(x, z);
  }
  for (let j = 1; j < G.nz - 1; j++) for (let i = 1; i < G.nx - 1; i++) {
    const k = j * G.nx + i, p = pid[k]; if (p < 0) continue;
    let bund = false, hi = PADDY.seeds[p].level;
    for (const o of [1, -1, G.nx, -G.nx]) { const q = pid[k + o]; if (q !== p) { bund = true; if (q >= 0) hi = Math.max(hi, PADDY.seeds[q].level); } }
    H[k] = bund ? hi + 0.28 : PADDY.seeds[p].level - 0.12;
  }
  X.pid = pid;
  if (progress) progress(0.5);
  // ---- 道路 ----
  X.roads = buildRoads(H);
  carveRoads(H, X.roads);
  if (progress) progress(0.7);
  return X;
}
function applyPad(H, sdf, hf, cx, cz, R, blend) {
  const i0 = Math.max(0, Math.floor(cx - R - G.x0)), i1 = Math.min(G.nx - 1, Math.ceil(cx + R - G.x0));
  const j0 = Math.max(0, Math.floor(cz - R - G.z0)), j1 = Math.min(G.nz - 1, Math.ceil(cz + R - G.z0));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = G.x0 + i, z = G.z0 + j, d = sdf(x, z); if (d > blend) continue;
    const k = j * G.nx + i; H[k] = lerp(hf(x, z), H[k], smoothstep(0, blend, d));
  }
}
function buildRoads(H) {
  const out = [];
  const near = (x, z) => { let best = null, bd = 2.5; for (const q of out) for (const p of q.pts) { const d = Math.hypot(p[0] - x, p[1] - z); if (d < bd) { bd = d; best = p[2]; } } return best; };
  for (const r of ROADS) {
    const auto = r.pts.map(p => p.length < 3 || p[2] === null);
    const ctrl = r.pts.map((p, i) => { if (!auto[i]) return [p[0], p[1], p[2]]; const j = near(p[0], p[1]); return [p[0], p[1], j !== null ? j : sampleGrid(H, p[0], p[1])]; });
    let pts = smoothOpen(ctrl, 1.0);
    const allAuto = auto.every(a => a);
    if (allAuto) pts.forEach(p => { p[2] = sampleGrid(H, p[0], p[1]); });
    const passes = allAuto ? 3 : 1, win = allAuto ? 9 : 5;
    for (let pass = 0; pass < passes; pass++) {
      const ys = pts.map(p => p[2]);
      for (let i = 0; i < pts.length; i++) {
        let s = 0, n = 0; for (let k = -win; k <= win; k++) { const q = i + k; if (q < 0 || q >= pts.length) continue; s += ys[q]; n++; }
        if (i > 0 && i < pts.length - 1) pts[i][2] = s / n;
      }
    }
    // 端点与已建道路衔接
    for (const end of [0, 1]) {
      const idx = end ? pts.length - 1 : 0, j = near(pts[idx][0], pts[idx][1]);
      if (j === null) continue;
      const delta = j - pts[idx][2];
      for (let i = 0; i < pts.length; i++) { const d = end ? (pts.length - 1 - i) : i; if (d > 25) continue; pts[i][2] += delta * (1 - smoothstep(0, 25, d)); }
    }
    const len = polyLength(pts);
    const widths = pts.map(() => r.w);
    for (const pb of PASSING) if (pb.id === r.id) {
      const c = pb.at * (pts.length - 1);
      for (let i = 0; i < pts.length; i++) { const d = Math.abs(i - c); if (d < 11) widths[i] = r.w + 2.6 * smoothstep(11, 6, d); }
    }
    out.push({ id: r.id, w: r.w, pts, widths, len });
  }
  return out;
}
function carveRoads(H, roads) {
  const infl = new Float32Array(GN), sw = new Float32Array(GN), sh = new Float32Array(GN);
  const rd = new Float32Array(GN).fill(999); roads.dist = rd;
  for (const r of roads) for (let n = 0; n < r.pts.length; n++) {
    const [px, pz, py] = r.pts[n], core = r.widths[n] / 2 + 0.9;
    const hn = sampleGrid(H, px, pz);
    const R = core + clamp(3 + Math.abs(hn - py) * 1.15, 3, 26);
    const i0 = Math.max(0, Math.floor(px - R - G.x0)), i1 = Math.min(G.nx - 1, Math.ceil(px + R - G.x0));
    const j0 = Math.max(0, Math.floor(pz - R - G.z0)), j1 = Math.min(G.nz - 1, Math.ceil(pz + R - G.z0));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(G.x0 + i - px, G.z0 + j - pz); if (d > R) continue;
      const k = j * G.nx + i, inf = d <= core ? 1 : 1 - smoothstep(core, R, d);
      const e = d - r.widths[n] / 2; if (e < rd[k]) rd[k] = e;
      const w = 1 / (d * d + 0.25);
      sw[k] += w; sh[k] += w * py; if (inf > infl[k]) infl[k] = inf;
    }
  }
  for (let k = 0; k < GN; k++) if (infl[k] > 0) H[k] = lerp(H[k], sh[k] / sw[k], infl[k]);
}
function terrainNormals(H) {
  const N = new Float32Array(GN * 3);
  for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
    const k = j * G.nx + i;
    const hl = H[j * G.nx + Math.max(i - 1, 0)], hr = H[j * G.nx + Math.min(i + 1, G.nx - 1)];
    const hd = H[Math.max(j - 1, 0) * G.nx + i], hu = H[Math.min(j + 1, G.nz - 1) * G.nx + i];
    const nx = (hl - hr) / 2, nz = (hd - hu) / 2, ny = 1, l = Math.hypot(nx, ny, nz);
    N[k * 3] = nx / l; N[k * 3 + 1] = ny / l; N[k * 3 + 2] = nz / l;
  }
  return N;
}
function terrainAO(H) {
  const AO = new Float32Array(GN), dirs = [];
  for (let a = 0; a < 8; a++) dirs.push([Math.cos(a / 8 * TAU), Math.sin(a / 8 * TAU)]);
  const steps = [2, 4, 7, 12, 20, 32];
  for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
    const k = j * G.nx + i, h0 = H[k]; let occ = 0;
    for (const [dx, dz] of dirs) {
      let m = 0;
      for (const s of steps) {
        const ii = Math.round(i + dx * s), jj = Math.round(j + dz * s);
        if (ii < 0 || jj < 0 || ii >= G.nx || jj >= G.nz) break;
        const t = (H[jj * G.nx + ii] - h0) / s; if (t > m) m = t;
      }
      occ += m / Math.sqrt(1 + m * m);
    }
    AO[k] = 1 - 0.75 * occ / 8;
  }
  return AO;
}
