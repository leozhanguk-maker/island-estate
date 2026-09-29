// ======================= 03b 海岸坐标场（后台线程，不依赖 three.js） =======================
// @ts-nocheck —— 由拼接式全局脚本机械转换而来，类型尚未补齐（逐文件移除此行并补类型）
import { mulberry32, smoothstep } from '../core/util';
import { G } from './terrain';
import { L } from '../core/layout';
// 碎浪 / 涌浪 / 崖岸拍浪都在这个坐标系里计算（移植并泛化自 ShoreBreak，MIT）：
//   f0 = (n 离岸有符号距离：海正陆负, gx, gz 离岸单位梯度, slope 近岸坡度)
//   f1 = (expo 迎浪程度, delay 涌浪到达延迟 s, fine 细噪声, lagoon 泊港内=1)
//   f2 = (far1, far2, mid1, mid2) 在“最近岸点”上取值的静态沿岸噪声
// delay 由程函方程 |∇τ| = 1/c(水深) 快速扫描求得：浪线会绕岛折射、经缺口衍射进泊港。
export const SHORE = {
  swellDir: [0.22, -1.0],     // 涌浪传播方向（x 东, z 南）：自南向北，略偏东
  lagoonGain: 0.62,           // 经 76 米缺口与镂空闸门进入泊港后的浪高比例
};
export function shoreNoiseFn(seed) {
  const R = mulberry32(seed), perm = new Uint16Array(512), gx = new Float32Array(256), gy = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const a = R() * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); perm[i] = i; }
  for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const fd = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    const g = (h, dx, dy) => gx[h] * dx + gy[h] * dy;
    const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1], ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    const u = fd(xf), v = fd(yf);
    const x1 = g(aa, xf, yf) + u * (g(ba, xf - 1, yf) - g(aa, xf, yf)), x2 = g(ab, xf, yf - 1) + u * (g(bb, xf - 1, yf - 1) - g(ab, xf, yf - 1));
    return 1.4 * (x1 + v * (x2 - x1));
  };
}
export function shoreBlur(src, iters) {   // 可分离 [1 2 1]⊗[1 2 1]，边界按已有样本归一化
  const nx = G.nx, nz = G.nz;
  let a = src.slice(), t = new Float32Array(src.length);
  for (let it = 0; it < iters; it++) {
    for (let j = 0; j < nz; j++) { const r = j * nx; for (let i = 0; i < nx; i++) { const l = i > 0, rr = i < nx - 1; t[r + i] = ((l ? a[r + i - 1] : 0) + 2 * a[r + i] + (rr ? a[r + i + 1] : 0)) / (2 + (l ? 1 : 0) + (rr ? 1 : 0)); } }
    for (let j = 0; j < nz; j++) { const u = j > 0, d = j < nz - 1; for (let i = 0, r = j * nx; i < nx; i++) a[r + i] = ((u ? t[r + i - nx] : 0) + 2 * t[r + i] + (d ? t[r + i + nx] : 0)) / (2 + (u ? 1 : 0) + (d ? 1 : 0)); }
  }
  return a;
}
export function buildShoreField(H, sdW) {
  const nx = G.nx, nz = G.nz, N = nx * nz, INF = 1e9;
  const at = (i, j) => H[Math.min(Math.max(j, 0), nz - 1) * nx + Math.min(Math.max(i, 0), nx - 1)];
  // ---- 1. 离岸有符号距离（亚格点种子 + 快速扫描）
  const d = new Float32Array(N).fill(INF), frozen = new Uint8Array(N);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const o = j * nx + i, s = H[o] < 0;
    if (!((i > 0 && (H[o - 1] < 0) !== s) || (i < nx - 1 && (H[o + 1] < 0) !== s) || (j > 0 && (H[o - nx] < 0) !== s) || (j < nz - 1 && (H[o + nx] < 0) !== s))) continue;
    const gb = Math.hypot((at(i + 1, j) - at(i - 1, j)) / 2, (at(i, j + 1) - at(i, j - 1)) / 2);
    d[o] = Math.min(Math.abs(H[o]) / Math.max(gb, 1e-6), 1); frozen[o] = 1;
  }
  const sweep = (arr, fz, slow) => {
    const orders = [[0, 1, 0, 1], [nx - 1, -1, 0, 1], [0, 1, nz - 1, -1], [nx - 1, -1, nz - 1, -1]];
    for (let it = 0; it < 2; it++) for (const [is, id, js, jd] of orders)
      for (let j = js; j >= 0 && j < nz; j += jd) for (let i = is; i >= 0 && i < nx; i += id) {
        const o = j * nx + i; if (fz[o]) continue;
        const h = slow ? slow[o] : 1; if (h >= INF) continue;
        const a = Math.min(i > 0 ? arr[o - 1] : INF, i < nx - 1 ? arr[o + 1] : INF), b = Math.min(j > 0 ? arr[o - nx] : INF, j < nz - 1 ? arr[o + nx] : INF);
        if (a >= INF && b >= INF) continue;
        const dn = Math.abs(a - b) >= h ? Math.min(a, b) + h : 0.5 * (a + b + Math.sqrt(2 * h * h - (a - b) * (a - b)));
        if (dn < arr[o]) arr[o] = dn;
      }
  };
  sweep(d, frozen, null);
  let n = new Float32Array(N);
  for (let o = 0; o < N; o++) n[o] = d[o] >= INF ? 2000 : (H[o] < 0 ? d[o] : -d[o]);
  n = shoreBlur(n, 2);
  // ---- 2. 离岸梯度
  let gx = new Float32Array(N), gz = new Float32Array(N);
  const nn = (i, j) => n[Math.min(Math.max(j, 0), nz - 1) * nx + Math.min(Math.max(i, 0), nx - 1)];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const o = j * nx + i; gx[o] = nn(i + 1, j) - nn(i - 1, j); gz[o] = nn(i, j + 1) - nn(i, j - 1); }
  gx = shoreBlur(gx, 1); gz = shoreBlur(gz, 1);
  for (let o = 0; o < N; o++) { const l = Math.hypot(gx[o], gz[o]) || 1; gx[o] /= l; gz[o] /= l; }
  // ---- 3. 涌浪到达时间：程函方程，慢度 1/sqrt(g·h)，陆地不可达；边界以平面波初始化
  const sl = Math.hypot(SHORE.swellDir[0], SHORE.swellDir[1]), sx = SHORE.swellDir[0] / sl, sz = SHORE.swellDir[1] / sl;
  const cDeep = Math.sqrt(9.81 * 25), slow = new Float32Array(N), tau = new Float32Array(N).fill(INF), tf = new Uint8Array(N);
  for (let o = 0; o < N; o++) slow[o] = H[o] < -0.05 ? 1 / Math.sqrt(9.81 * Math.min(Math.max(-H[o], 0.4), 25)) : INF;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (i > 0 && j > 0 && i < nx - 1 && j < nz - 1) continue;
    const o = j * nx + i; if (slow[o] >= INF) continue;
    tau[o] = ((G.x0 + i) * sx + (G.z0 + j) * sz) / cDeep; tf[o] = 1;
  }
  sweep(tau, tf, slow);
  // 陆地格点取邻近水域的到达时间（最近岸点的值由后面按 foot 采样）
  // ---- 4. 按最近岸点（foot）取值的沿岸属性
  const bil = (arr, x, z) => {
    const u = Math.min(Math.max(x - G.x0, 0), nx - 1.001), v = Math.min(Math.max(z - G.z0, 0), nz - 1.001);
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, o = j * nx + i;
    return (arr[o] * (1 - fu) + arr[o + 1] * fu) * (1 - fv) + (arr[o + nx] * (1 - fu) + arr[o + nx + 1] * fu) * fv;
  };
  const tauW = new Float32Array(N);   // 仅水域有值，陆地用邻近水域平均填充，避免 INF 参与插值
  for (let o = 0; o < N; o++) tauW[o] = tau[o] < INF ? tau[o] : NaN;
  for (let pass = 0; pass < 6; pass++) for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const o = j * nx + i; if (!Number.isNaN(tauW[o])) continue;
    let s = 0, c = 0;
    for (const q of [o - 1, o + 1, o - nx, o + nx]) if (q >= 0 && q < N && !Number.isNaN(tauW[q])) { s += tauW[q]; c++; }
    if (c) tauW[o] = s / c;
  }
  for (let o = 0; o < N; o++) if (Number.isNaN(tauW[o])) tauW[o] = 0;
  const nF = shoreNoiseFn(11), nA = shoreNoiseFn(23), nB = shoreNoiseFn(37), nC = shoreNoiseFn(51), nD = shoreNoiseFn(67);
  let slope = new Float32Array(N), expo = new Float32Array(N), delay = new Float32Array(N);
  const fine = new Float32Array(N), f1 = new Float32Array(N), f2 = new Float32Array(N), m1 = new Float32Array(N), m2 = new Float32Array(N), lag = new Float32Array(N);
  let dMin = INF, dMax = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const o = j * nx + i, x = G.x0 + i, z = G.z0 + j, nv = Math.min(n[o], 300);
    const fx = x - nv * gx[o], fz = z - nv * gz[o];
    slope[o] = Math.min(Math.max(-bil(H, fx + gx[o] * 8, fz + gz[o] * 8) / 8, 0.012), 0.6);
    const e = -(sx * gx[o] + sz * gz[o]);
    const inLag = sdW && sdW[o] > -6 && z < L.notch.zGate - 1 ? 1 : 0;
    lag[o] = inLag;
    // 泊港里浪经缺口衍射进来，朝向判断失效：统一按泊港增益处理
    expo[o] = inLag ? SHORE.lagoonGain : 0.16 + 0.84 * smoothstep(-0.4, 0.75, e);
    delay[o] = bil(tauW, fx + gx[o] * 3, fz + gz[o] * 3);
    if (Math.abs(n[o]) < 40) { dMin = Math.min(dMin, delay[o]); }
    f1[o] = nA(fx * 0.055, fz * 0.055); f2[o] = nB(fx * 0.055 + 17.3, fz * 0.055 - 4.1);
    m1[o] = nC(fx * 0.3, fz * 0.3); m2[o] = nD(fx * 0.3 - 7.7, fz * 0.3 + 3.9);
    fine[o] = nF(fx * 0.6, fz * 0.6);
  }
  if (!(dMin < INF)) dMin = 0;
  for (let o = 0; o < N; o++) { delay[o] = Math.max(delay[o] - dMin, 0); if (Math.abs(n[o]) < 40) dMax = Math.max(dMax, delay[o]); }
  slope = shoreBlur(slope, 3); expo = shoreBlur(expo, 2); delay = shoreBlur(delay, 2);
  const pack = (a, b, c, e) => { const out = new Float32Array(N * 4); for (let o = 0; o < N; o++) { out[o * 4] = a[o]; out[o * 4 + 1] = b[o]; out[o * 4 + 2] = c[o]; out[o * 4 + 3] = e[o]; } return out; };
  return { f0: pack(n, gx, gz, slope), f1: pack(expo, delay, fine, lag), f2: pack(f1, f2, m1, m2), delayMax: dMax };
}
// Float32 → IEEE half（与 THREE.DataUtils.toHalfFloat 相同的舍入），供后台线程直接产出半精度纹理数据
export const _shoreF = new Float32Array(1), _shoreI = new Uint32Array(_shoreF.buffer);
export function shoreToHalf(v) {
  _shoreF[0] = Math.max(-65000, Math.min(65000, v)); const x = _shoreI[0];
  const sign = (x >> 16) & 0x8000, e = ((x >> 23) & 0xff) - 112, m = x & 0x7fffff;
  if (e <= 0) { if (e < -10) return sign; const mm = (m | 0x800000) >> (1 - e); return sign | ((mm + 0x1000) >> 13); }
  const h = sign | (e << 10) | ((m + 0x1000) >> 13);
  return e > 30 ? sign | 0x7bff : h;
}
export function shoreFieldHalf(S) {
  const out = {}; for (const k of ['f0', 'f1', 'f2']) { const a = S[k], u = new Uint16Array(a.length); for (let i = 0; i < a.length; i++) u[i] = shoreToHalf(a[i]); out[k] = u; }
  out.delayMax = S.delayMax; return out;
}
