// ======================= 04b 地表细节：可平铺细节纹理 + 材质权重图 =======================
function phash(i, j, P, seed) {
  i = ((i % P) + P) % P; j = ((j % P) + P) % P;
  let n = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
function pnoise(x, y, P, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(phash(xi, yi, P, seed), phash(xi + 1, yi, P, seed), u), lerp(phash(xi, yi + 1, P, seed), phash(xi + 1, yi + 1, P, seed), u), v);
}
function pfbm(u, v, P, oct, seed) { let s = 0, a = 1, n = 0, f = 1; for (let o = 0; o < oct; o++) { s += a * pnoise(u * P * f, v * P * f, P * f, seed + o * 31); n += a; a *= 0.5; f *= 2; } return s / n; }
// 周期 Voronoi：返回最近点距离与所属格随机数
function pvor(u, v, P, seed) {
  const x = u * P, y = v * P, xi = Math.floor(x), yi = Math.floor(y); let best = 9, id = 0, second = 9;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const cx = xi + di, cy = yi + dj, px = cx + phash(cx, cy, P, seed), py = cy + phash(cx, cy, P, seed + 7);
    const d = Math.hypot(x - px, y - py); if (d < best) { second = best; best = d; id = phash(cx, cy, P, seed + 13); } else if (d < second) second = d;
  }
  return [best, id, second];
}
function makeDetailTex(kind, N = 512) {
  const hgt = new Float32Array(N * N), lum = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N; let h = 0, l = 0.5;
    if (kind === 'grass') {
      const blades = pfbm(u * 1, v * 0.25, 128, 3, 11), clump = pfbm(u, v, 8, 3, 12), fine = pnoise(u * 256, v * 256, 256, 13);
      h = 0.5 * blades + 0.3 * clump + 0.2 * fine; l = 0.35 + 0.45 * blades + 0.35 * (clump - 0.5) + 0.12 * (fine - 0.5);
    } else if (kind === 'sand') {
      const warp = pfbm(u, v, 4, 3, 21), rip = 0.5 + 0.5 * Math.sin(TAU * (7 * u + 3 * v) + warp * 5), grain = pnoise(u * 256, v * 256, 256, 22);
      h = 0.55 * rip + 0.25 * pfbm(u, v, 16, 3, 23) + 0.2 * grain; l = 0.5 + 0.12 * (rip - 0.5) + 0.3 * (grain - 0.5) + 0.12 * (pfbm(u, v, 6, 2, 24) - 0.5);
    } else if (kind === 'gravel') {
      const [d, id, d2] = pvor(u, v, 40, 31), r = 0.42 + 0.1 * id, peb = Math.max(0, 1 - (d / r) ** 2), edge = smoothstep(0.02, 0.12, d2 - d);
      const fine = pnoise(u * 256, v * 256, 256, 32);
      h = Math.sqrt(peb) * edge * 0.8 + 0.2 * fine; l = 0.25 + 0.55 * id * edge + 0.25 * peb * edge + 0.15 * (fine - 0.5) - 0.2 * (1 - edge);
    } else if (kind === 'soil') {
      const cl = pfbm(u, v, 12, 4, 41), [d, id] = pvor(u, v, 24, 42), stone = id > 0.82 ? Math.max(0, 1 - (d / 0.28) ** 2) : 0;
      h = 0.7 * cl + 0.5 * stone; l = 0.35 + 0.35 * cl + 0.35 * stone + 0.1 * (pnoise(u * 128, v * 128, 128, 43) - 0.5);
    } else if (kind === 'rock') {
      let r = 0; let a = 1, f = 4, n = 0; for (let o = 0; o < 5; o++) { const q = pnoise(u * f, v * f, f, 51 + o); r += a * (1 - Math.abs(2 * q - 1)); n += a; a *= 0.5; f *= 2; } r /= n;
      const [d, , d2] = pvor(u, v, 6, 52), crack = smoothstep(0.0, 0.05, d2 - d);
      const cw = 0.5 + 0.5 * pnoise(u * 12, v * 12, 12, 54); h = r * 0.85 + 0.15 * crack; l = 0.25 + 0.6 * r * (1 - 0.3 * cw * (1 - crack)) + 0.12 * (pnoise(u * 64, v * 64, 64, 53) - 0.5);
    }
    hgt[y * N + x] = h; lum[y * N + x] = clamp(l, 0, 1);
  }
  if (kind === 'grass') {   // 叠加数万条短草叶笔触（周期环绕）
    const R = mulberry32(606);
    for (let k = 0; k < 42000; k++) {
      let x = R() * N, y = R() * N; const a = R() * TAU, len = 3 + R() * 7, dl = (R() - 0.42) * 0.55, dh = 0.3 + R() * 0.5;
      for (let t = 0; t < len; t += 0.7) { const xi = ((Math.round(x + Math.cos(a) * t) % N) + N) % N, yi = ((Math.round(y + Math.sin(a) * t) % N) + N) % N, i = yi * N + xi; lum[i] = clamp(lum[i] * 0.4 + (0.5 + dl) * 0.6, 0, 1); hgt[i] = Math.max(hgt[i], dh * (1 - t / len)); }
    }
  }
  if (kind === 'sand') for (let i = 0; i < N * N; i++) lum[i] = clamp(0.5 + (lum[i] - 0.5) * 1.6, 0, 1);
  { let lo = 1, hi = 0; for (let i = 0; i < N * N; i += 7) { lo = Math.min(lo, lum[i]); hi = Math.max(hi, lum[i]); }   // 对比度归一
    const tgtLo = kind === 'rock' ? 0.08 : 0.2, tgtHi = kind === 'rock' ? 0.92 : 0.8;
    for (let i = 0; i < N * N; i++) lum[i] = tgtLo + (tgtHi - tgtLo) * clamp((lum[i] - lo) / Math.max(hi - lo, 1e-3), 0, 1); }
  const data = new Uint8Array(N * N * 4), s = kind === 'gravel' ? 5 : kind === 'rock' ? 4 : kind === 'sand' ? 5 : 3;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, hx = hgt[y * N + ((x + 1) % N)] - hgt[y * N + ((x - 1 + N) % N)], hy = hgt[((y + 1) % N) * N + x] - hgt[((y - 1 + N) % N) * N + x];
    let nx = -hx * s, ny = -hy * s; const l = Math.hypot(nx, ny, 1); nx /= l; ny /= l;
    data[i * 4] = lum[i] * 255; data[i * 4 + 1] = (nx * 0.5 + 0.5) * 255; data[i * 4 + 2] = (ny * 0.5 + 0.5) * 255; data[i * 4 + 3] = clamp(hgt[i], 0, 1) * 255;
  }
  return { data, w: N, h: N };
}
// 材质权重图（0.5 米/像素，覆盖地表贴图同一区域）：R 草 G 沙 B 碎石路面 A 泥土；草通道 255=高草，130=修剪草坪
function makeMaterialMap(X) {
  const W = TX.w, Hh = TX.h, data = new Uint8Array(W * Hh * 4), H = X.H, RD = X.roads.dist;
  const inR = (x, z, r, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;
  const gh0 = L.greenhouses, ghR = { x0: gh0.x0 - 3, z0: gh0.z0 - 3, x1: gh0.x0 + gh0.n * gh0.w + (gh0.n - 1) * gh0.gap + 3, z1: gh0.z0 + gh0.len + 3 };
  const pads = [
    [164, -64, 198, -32], [-19, -163, 19, -136], [-10.5, -134, 10.5, -98], [205, 9.5, 227, 24], [L.barn.x - 15, L.barn.z - 8, L.barn.x + 15, L.barn.z + 8]
  ];
  for (let py = 0; py < Hh; py++) for (let px = 0; px < W; px++) {
    const x = TX.x0 + px + 0.5, z = TX.z0 + py + 0.5, o = (py * W + px) * 4;
    const k = Math.round(clamp(z - G.z0, 0, G.nz - 1)) * G.nx + Math.round(clamp(x - G.x0, 0, G.nx - 1));
    const h = sampleGrid(H, x, z), sdb = X.sdB[k], sdc = X.sdC[k], sdw = X.sdW[k];
    let gr = 0, sa = 0, gv = 0, so = 0;
    if (h < -0.3 || sdw > 0) { sa = 1; }
    else if (sdb >= 0 || sdw > -40) gr = 1;
    else { const s = sdc / (sdc - sdb); so = 1 - smoothstep(0.55, 0.85, s); gr = 1 - so; }
    if (sdw < 0 && sdw > -38 && X.beachW(x, z) > 0.12) { const b = smoothstep(0.12, 0.3, X.beachW(x, z)) * (1 - smoothstep(33, 38, -sdw)); sa = Math.max(sa, b); if (b > 0.2) { gr = 0; so = 0; } else gr *= 1 - b; }
    if (Math.min(lakeSD(x, z, L.lake, 0), lakeSD(x, z, L.upperLake, 0)) < 0.5) { gr = 0; sa = 0.5; so = 0.5; }
    // 农田与场地
    if (inR(x, z, L.rice)) { gr = 0.15; so = 0.85; }
    else if (inR(x, z, L.veg)) { gr = 0.2; so = 0.8; }
    else if (inR(x, z, L.vineyard)) { gr = 0.75; so = 0.25; }
    else if (inR(x, z, L.bananas)) { gr = 0.5; so = 0.5; }
    else if (inR(x, z, ghR)) { gr = 0; gv = 0.6; so = 0.2; }
    for (const pen of [L.pig, L.chicken]) if (Math.abs(x - pen.x) < pen.w / 2 && Math.abs(z - pen.z) < pen.d / 2) { gr = 0; so = 1; }
    const inPast = x > -239 && x < -160 && z > -47 && z < 17 && pointInPoly(x, z, L.pasture);
    let mow = false;
    for (const a of L.golfAreas) if (x >= a[0] && x <= a[2] && z >= a[1] && z <= a[3]) mow = true;
    if (x > 53 && x < 133 && z > -126 && z < -97 && pointInPoly(x, z, L.orchard)) mow = true;
    for (const p of pads) if (x >= p[0] && x <= p[2] && z >= p[1] && z <= p[3]) { gr = 0; so = 0; sa = 0; }
    if (rectSD(x, z, L.plateau.x, L.plateau.z, L.plateau.len / 2, L.plateau.wid / 2, L.plateau.rot) < 0) { gr = 0; gv = 0.5; }
    // 道路（碎石，边缘柔化）
    const rd = sampleGrid(RD, x, z);
    const road = 1 - smoothstep(-0.2, 0.5, rd);
    gv = Math.max(gv, road); gr *= 1 - road; so *= 1 - road; sa *= 1 - road;
    const grassV = gr * (mow ? 0.5 : inPast ? 0.8 : 1);
    data[o] = clamp(grassV, 0, 1) * 255; data[o + 1] = clamp(sa, 0, 1) * 255; data[o + 2] = clamp(gv, 0, 1) * 255; data[o + 3] = clamp(so, 0, 1) * 255;
  }
  return { data, w: W, h: Hh };
}
