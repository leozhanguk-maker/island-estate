// ======================= 01 基础工具 =======================
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let rand = mulberry32(20260919);
const rr = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const SNoise = (function () {
  const grad3 = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const p = new Uint8Array(256); const r = mulberry32(1337);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512); for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return function (xin, yin) {
    let n0 = 0, n1 = 0, n2 = 0;
    const s = (xin + yin) * F2; const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2; const x0 = xin - (i - t), y0 = yin - (j - t);
    let i1, j1; if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { const g = grad3[perm[ii + perm[jj]] & 7]; t0 *= t0; n0 = t0 * t0 * (g[0] * x0 + g[1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { const g = grad3[perm[ii + i1 + perm[jj + j1]] & 7]; t1 *= t1; n1 = t1 * t1 * (g[0] * x1 + g[1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { const g = grad3[perm[ii + 1 + perm[jj + 1]] & 7]; t2 *= t2; n2 = t2 * t2 * (g[0] * x2 + g[1] * y2); }
    return 70 * (n0 + n1 + n2);
  };
})();
function fbm(x, z, oct = 4, lac = 2.0, gain = 0.5) {
  let a = 1, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) { s += a * SNoise(x * f + i * 17.13, z * f - i * 9.71); n += a; a *= gain; f *= lac; }
  return s / n;
}

// 向心 Catmull-Rom（支持任意维度，前两维为平面坐标）
function crPoint(P0, P1, P2, P3, u) {
  const dist = (a, b) => Math.pow(Math.hypot(a[0] - b[0], a[1] - b[1]) + 1e-4, 0.5);
  const t0 = 0, t1 = t0 + dist(P0, P1), t2 = t1 + dist(P1, P2), t3 = t2 + dist(P2, P3);
  const t = t1 + (t2 - t1) * u, D = P1.length, out = new Array(D);
  for (let k = 0; k < D; k++) {
    const A1 = (t1 - t) / (t1 - t0) * P0[k] + (t - t0) / (t1 - t0) * P1[k];
    const A2 = (t2 - t) / (t2 - t1) * P1[k] + (t - t1) / (t2 - t1) * P2[k];
    const A3 = (t3 - t) / (t3 - t2) * P2[k] + (t - t2) / (t3 - t2) * P3[k];
    const B1 = (t2 - t) / (t2 - t0) * A1 + (t - t0) / (t2 - t0) * A2;
    const B2 = (t3 - t) / (t3 - t1) * A2 + (t - t1) / (t3 - t1) * A3;
    out[k] = (t2 - t) / (t2 - t1) * B1 + (t - t1) / (t2 - t1) * B2;
  }
  return out;
}
function smoothClosed(pts, seg) {
  const out = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < seg; k++) out.push(crPoint(p0, p1, p2, p3, k / seg));
  }
  return out;
}
// 开放曲线：均匀重采样到 step 米
function smoothOpen(pts, step) {
  const n = pts.length; if (n < 2) return pts.slice();
  const ext = [pts[0].map((v, k) => 2 * v - pts[1][k]), ...pts, pts[n - 1].map((v, k) => 2 * v - pts[n - 2][k])];
  const dense = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const segLen = Math.hypot(ext[i + 1][0] - ext[i][0], ext[i + 1][1] - ext[i][1]);
    const m = Math.max(2, Math.ceil(segLen / 0.5));
    for (let k = 0; k < m; k++) dense.push(crPoint(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], k / m));
  }
  dense.push(pts[n - 1].slice());
  return resamplePolyline(dense, step);
}
function resamplePolyline(dense, step) {
  const out = [dense[0].slice()]; let acc = 0;
  for (let i = 1; i < dense.length; i++) {
    const a = dense[i - 1], b = dense[i]; let segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let from = 0;
    while (acc + (segLen - from) >= step) {
      const need = step - acc; from += need; const t = from / segLen;
      out.push(a.map((v, k) => v + (b[k] - v) * t)); acc = 0;
    }
    acc += segLen - from;
  }
  const last = dense[dense.length - 1];
  if (Math.hypot(last[0] - out[out.length - 1][0], last[1] - out[out.length - 1][1]) > step * 0.3) out.push(last.slice());
  return out;
}
function polyLength(p) { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; }
function pointInPoly(x, z, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) c = !c;
  }
  return c;
}
// 旋转矩形的有符号距离（外正内负）
function rectSD(x, z, cx, cz, hw, hd, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const dx = x - cx, dz = z - cz;
  const lx = c * dx - s * dz, lz = s * dx + c * dz;
  const qx = Math.abs(lx) - hw, qz = Math.abs(lz) - hd;
  const ox = Math.max(qx, 0), oz = Math.max(qz, 0);
  return Math.hypot(ox, oz) + Math.min(Math.max(qx, qz), 0);
}
function segDist(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az, wx = px - ax, wz = pz - az;
  const t = clamp((vx * wx + vz * wz) / (vx * vx + vz * vz + 1e-9), 0, 1);
  return [Math.hypot(px - (ax + vx * t), pz - (az + vz * t)), t];
}
