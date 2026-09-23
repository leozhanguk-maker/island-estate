// ======================= 04 地表贴图（高分辨率画布） =======================
const TX = { x0: -360, z0: -210, w: 720, h: 420 };
TX.pw = 4096; TX.S = TX.pw / TX.w; TX.ph = Math.round(TX.h * TX.S);
function hexRGB(h) { return [(h >> 16) & 255, (h >> 8) & 255, h & 255]; }
function mixRGB(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function mkCanvas(w, h) {
  if (typeof document === 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
function makeGround(X, texW = 4096) {
  const H = X.H, NRM = X.normals;
  const PW = texW, S = PW / TX.w, PH = Math.round(TX.h * S);
  // ---------- 1 米分辨率基底 ----------
  const bw = TX.w, bh = TX.h;
  const bc = mkCanvas(bw, bh);
  const bctx = bc.getContext('2d', { willReadFrequently: true }); const img = bctx.createImageData(bw, bh), D = img.data;
  const C = {
    forest: hexRGB(0x2c4322), forest2: hexRGB(0x3b5229), shrub: hexRGB(0x5d6b33), shrub2: hexRGB(0x6f7a3c),
    grass: hexRGB(0x66873a), grass2: hexRGB(0x4f7430), dry: hexRGB(0x8a8f50), rock: hexRGB(0x6d6352),
    wet: hexRGB(0x4a443b), sand: hexRGB(0xe8e2d3), sandWet: hexRGB(0xcfc6b1), seabed: hexRGB(0xb6a77d), deep: hexRGB(0x5c6a64)
  };
  for (let py = 0; py < bh; py++) for (let px = 0; px < bw; px++) {
    const x = TX.x0 + px + 0.5, z = TX.z0 + py + 0.5;
    const h = sampleGrid(H, x, z);
    const gi_ = Math.round(clamp(z - G.z0, 0, G.nz - 1)) * G.nx + Math.round(clamp(x - G.x0, 0, G.nx - 1));
    const ny = NRM[gi_ * 3 + 1], sdb = X.sdB[gi_], sdc = X.sdC[gi_], sdw = X.sdW[gi_];
    const n1 = fbm(x * 0.05, z * 0.05, 3), n2 = SNoise(x * 0.23, z * 0.23);
    let c;
    if (h < -0.4 || sdw > 0) c = X.beachW(x, z) > 0.2 && sdw > -1 ? mixRGB(C.sand, C.seabed, smoothstep(0.5, 5, -h)) : mixRGB(C.seabed, C.deep, smoothstep(0.5, 7, -h));
    else if (sdb >= 0 || sdw > -40) {
      c = mixRGB(C.grass, C.grass2, clamp(0.5 + 0.9 * n1 + 0.25 * fbm(x * 0.012, z * 0.012, 2), 0, 1));
      c = mixRGB(c, C.dry, 0.12 + 0.12 * n2);
      if (sdb > -0.5 && sdb < 6) c = mixRGB(c, C.shrub, (1 - sdb / 6) * 0.5);
    } else {
      const s = sdc / (sdc - sdb);
      c = mixRGB(C.forest, C.forest2, 0.5 + 0.5 * n1);
      c = mixRGB(c, mixRGB(C.shrub, C.shrub2, 0.5 + 0.5 * n2), smoothstep(0.55, 0.85, s));
    }
    // 沙滩
    if (sdw < 0 && sdw > -38 && X.beachW(x, z) > 0.12) {   // 碧海银沙：纯白细沙，仅近水线 2 米内为湿沙
      const bwt = smoothstep(0.12, 0.3, X.beachW(x, z)) * (1 - smoothstep(33, 38, -sdw));
      const sc = mixRGB(C.sandWet, C.sand, smoothstep(0.5, 2.2, -sdw));
      c = mixRGB(c, sc, bwt);
    }
    if (h > -0.4 && h < 1.6 && sdw > -6 && X.beachW(x, z) < 0.12) c = mixRGB(c, C.wet, 0.7);
    { const lk = Math.min(lakeSD(x, z, L.lake, 0), lakeSD(x, z, L.upperLake, 0)); if (lk < 0.3) c = mixRGB(c, mixRGB([150, 132, 98], [92, 86, 64], smoothstep(0, 4, -lk)), clamp(0.3 - lk, 0, 1)); }
    if (h > -0.4 && h < 3 && sdc < 10 && sdc > -2) c = mixRGB(c, C.wet, 0.8);
    if (ny < 0.72 && h > 0) c = mixRGB(c, C.rock, smoothstep(0.72, 0.55, ny));
    const ao = X.ao[gi_];
    const o = (py * bw + px) * 4;
    D[o] = c[0] * ao; D[o + 1] = c[1] * ao; D[o + 2] = c[2] * ao; D[o + 3] = 255;
  }
  bctx.putImageData(img, 0, 0);
  const cv = mkCanvas(PW, PH);
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(bc, 0, 0, PW, PH);
  // 遮罩画布：R=水田水面
  const mc = mkCanvas(1024, Math.round(1024 * TX.h / TX.w));
  const m = mc.getContext('2d', { willReadFrequently: true }); m.fillStyle = '#000'; m.fillRect(0, 0, mc.width, mc.height);
  const W2 = (ctx, s) => ctx.setTransform(s, 0, 0, s, -TX.x0 * s, -TX.z0 * s);
  W2(g, S); W2(m, mc.width / TX.w);
  const R = mulberry32(77);
  const rect = (ctx, x0, z0, x1, z1, col) => { ctx.fillStyle = col; ctx.fillRect(x0, z0, x1 - x0, z1 - z0); };
  const poly = (ctx, pts, col) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
  const ell = (ctx, x, z, a, b, rot, col) => { ctx.beginPath(); ctx.ellipse(x, z, a, b, rot, 0, TAU); ctx.fillStyle = col; ctx.fill(); };
  const speckle = (x0, z0, x1, z1, n, cols, rmin, rmax, a) => {
    for (let i = 0; i < n; i++) { const x = lerp(x0, x1, R()), z = lerp(z0, z1, R()); g.fillStyle = css(hexRGB(cols[Math.floor(R() * cols.length)]), a); g.beginPath(); g.arc(x, z, lerp(rmin, rmax, R()), 0, TAU); g.fill(); }
  };

  // ---------- 牧场 ----------
  poly(g, L.pasture, 'rgba(138,160,80,0.9)');
  speckle(-236, -45, -163, 14, 900, [0x9aa35e, 0x7d9a46, 0xa6a36a, 0x86a24e], 0.4, 1.6, 0.35);
  g.strokeStyle = 'rgba(160,145,105,0.55)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-198, -50); g.quadraticCurveTo(-206, -30, -224, -10); g.stroke();
  g.beginPath(); g.moveTo(-190, -50); g.quadraticCurveTo(-180, -20, -172, 10); g.stroke();
  // ---------- 猪圈 / 鸡圈 ----------
  for (const pen of [L.pig, L.chicken]) {
    rect(g, pen.x - pen.w / 2, pen.z - pen.d / 2, pen.x + pen.w / 2, pen.z + pen.d / 2, pen === L.pig ? 'rgb(150,124,94)' : 'rgb(170,150,112)');
    speckle(pen.x - pen.w / 2, pen.z - pen.d / 2, pen.x + pen.w / 2, pen.z + pen.d / 2, 220, pen === L.pig ? [0x8a6d50, 0x9f8466, 0x7a6048] : [0xb39c78, 0x9f8a66, 0xc4ae88], 0.2, 0.8, 0.5);
  }
  // ---------- 香蕉园 ----------
  const bn = L.bananas; rect(g, bn.x0, bn.z0, bn.x1, bn.z1, 'rgb(104,118,62)');
  speckle(bn.x0, bn.z0, bn.x1, bn.z1, 600, [0x5d6d34, 0x7a7a48, 0x6e6a44], 0.3, 1.1, 0.5);
  // ---------- 蔬菜基地 ----------
  const vg = L.veg; rect(g, vg.x0, vg.z0, vg.x1, vg.z1, 'rgb(125,98,70)');
  const vcol = [0x8fbf4f, 0x6f9f5f, 0x5f9a3a, 0x9ac26a, 0x7faa8a, 0x6a8f3f, 0x9b8fa0];
  let bedI = 0;
  for (let x = vg.x0 + 1; x < vg.x1 - 1.2; x += 1.8, bedI++) {
    const col = hexRGB(vcol[Math.floor(bedI / 3) % vcol.length]);
    g.fillStyle = css(mixRGB(col, [110, 85, 60], 0.15)); g.fillRect(x, vg.z0 + 1, 1.2, vg.z1 - vg.z0 - 2);
    for (let z = vg.z0 + 1.4; z < vg.z1 - 1.2; z += 0.55) { g.fillStyle = css(mixRGB(col, [255, 255, 255], R() * 0.12), 0.9); g.beginPath(); g.arc(x + 0.35 + R() * 0.5, z, 0.22 + R() * 0.12, 0, TAU); g.fill(); }
  }
  // ---------- 大棚地坪 ----------
  const gh = L.greenhouses;
  rect(g, gh.x0 - 3, gh.z0 - 3, gh.x0 + gh.n * gh.w + (gh.n - 1) * gh.gap + 3, gh.z0 + gh.len + 3, 'rgb(176,170,152)');
  for (let i = 0; i < gh.n; i++) {
    const x0 = gh.x0 + i * (gh.w + gh.gap);
    rect(g, x0, gh.z0, x0 + gh.w, gh.z0 + gh.len, 'rgb(120,96,70)');
    for (let r = 0; r < 4; r++) rect(g, x0 + 0.8 + r * 1.9, gh.z0 + 0.8, x0 + 0.8 + r * 1.9 + 1.1, gh.z0 + gh.len - 0.8, css(hexRGB([0x6fae4f, 0x8cc063, 0x5f9f4a, 0x9ac46f][(i + r) % 4])));
  }
  // ---------- 葡萄园 ----------
  const vy = L.vineyard; rect(g, vy.x0, vy.z0, vy.x1, vy.z1, 'rgb(146,160,92)');
  speckle(vy.x0, vy.z0, vy.x1, vy.z1, 700, [0x9aa866, 0x86994e, 0xa9a878], 0.3, 1.0, 0.4);
  for (let x = vy.x0 + 1.4; x < vy.x1 - 0.8; x += 2.6) rect(g, x - 0.45, vy.z0 + 1.5, x + 0.45, vy.z1 - 1.5, 'rgba(118,92,64,0.85)');
  // 灌溉沟
  g.strokeStyle = 'rgb(88,110,96)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-3, -86); g.lineTo(-3, -22); g.stroke();
  g.strokeStyle = 'rgba(120,150,150,0.8)'; g.lineWidth = 0.7; g.stroke();
  // ---------- 水田（逐像素） ----------
  {
    const r = L.rice, x0 = Math.floor((r.x0 - TX.x0) * S), z0 = Math.floor((r.z0 - TX.z0) * S);
    const w = Math.ceil((r.x1 - r.x0) * S), h = Math.ceil((r.z1 - r.z0) * S);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const id = g.getImageData(x0, z0, w, h), d = id.data;
    const plotCol = PADDY.seeds.map((s, i) => ({ ang: (R() - 0.5) * 0.6 + (i % 2 ? Math.PI / 2 : 0), water: mixRGB(hexRGB(0x5d7f6c), hexRGB(0x56804e), R()), row: mixRGB(hexRGB(0x4f8a30), hexRGB(0x6aa23f), R()), density: 0.35 + R() * 0.55 }));
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const x = TX.x0 + (x0 + px + 0.5) / S, z = TX.z0 + (z0 + py + 0.5) / S;
      if (!PADDY.inside(x, z)) continue;
      const p = PADDY.id(x, z), pc = plotCol[p];
      const e = 0.42;
      const bund = PADDY.id(x + e, z) !== p || PADDY.id(x - e, z) !== p || PADDY.id(x, z + e) !== p || PADDY.id(x, z - e) !== p;
      let c;
      if (bund) c = mixRGB(hexRGB(0x6f8f45), hexRGB(0x869a58), 0.5 + 0.5 * SNoise(x * 0.8, z * 0.8));
      else {
        const u = x * Math.cos(pc.ang) + z * Math.sin(pc.ang);
        const rowv = 0.5 + 0.5 * Math.cos(u / 0.55 * TAU);
        c = mixRGB(pc.water, pc.row, clamp(rowv * pc.density * 1.3 + 0.08 * SNoise(x * 0.3, z * 0.3), 0, 1));
      }
      const o = (py * w + px) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
    }
    g.putImageData(id, x0, z0);
    W2(g, S);
    // 水面遮罩
    m.fillStyle = '#fff'; m.fillRect(r.x0 + 0.3, r.z0 + 0.3, r.x1 - r.x0 - 0.6, r.z1 - r.z0 - 0.6);
  }
  // ---------- 苹果园 ----------
  poly(g, L.orchard.map(p => [p[0], p[1]]), 'rgba(122,150,74,0.85)');
  // ---------- 高尔夫 ----------
  for (const a of L.golfAreas) rect(g, a[0], a[1], a[2], a[3], 'rgb(104,146,62)');
  for (const a of L.golfAreas) speckle(a[0], a[1], a[2], a[3], Math.round((a[2] - a[0]) * (a[3] - a[1]) / 7), [0x6a9a42, 0x5f8f3c, 0x77a44a], 0.3, 1.0, 0.18);
  for (const h of L.golf) {
    const [tx, tz] = h.tee, [gx, gz] = h.green, ang = Math.atan2(gz - tz, gx - tx), len = Math.hypot(gx - tx, gz - tz);
    g.save(); g.translate(tx, tz); g.rotate(ang);
    for (let s = -2; s < len + 4; s += 3) { g.fillStyle = (Math.floor(s / 3) % 2) ? 'rgb(128,184,76)' : 'rgb(116,172,68)'; g.beginPath(); g.ellipse(s + 1.5, 0, 1.6, 5.5 + 1.2 * Math.sin(s * 0.3), 0, 0, TAU); g.fill(); g.fillRect(s, -5.2, 3, 10.4); }
    g.restore();
    const [ga, gb, gr] = h.gr;
    ell(g, gx, gz, ga + 1.3, gb + 1.3, gr, 'rgb(118,176,70)');
    ell(g, gx, gz, ga, gb, gr, 'rgb(128,184,78)');
    for (let k = 0; k < 6; k++) { g.strokeStyle = k % 2 ? 'rgba(150,200,98,0.22)' : 'rgba(132,186,84,0.22)'; g.lineWidth = 0.9; g.beginPath(); g.ellipse(gx, gz, ga * (1 - k / 7), gb * (1 - k / 7), gr, 0, TAU); g.stroke(); }
    g.save(); g.translate(tx, tz); g.rotate(ang); g.fillStyle = 'rgb(140,196,86)'; g.fillRect(-2.5, -2, 5, 4); g.restore();
    // 沙坑
    const bx = gx + Math.cos(ang + 1.9) * (ga + 2.4), bz = gz + Math.sin(ang + 1.9) * (gb + 2.4);
    ell(g, bx, bz, 2.6, 1.5, ang + 1.9, 'rgb(212,196,150)'); ell(g, bx, bz, 2.2, 1.15, ang + 1.9, 'rgb(222,208,168)');
  }
  // ---------- 建筑周边铺装 ----------
  rect(g, 164, -64, 198, -32, 'rgb(116,160,72)');                   // 别墅草坪
  rect(g, 167, -64, 193, -53, 'rgb(214,208,196)');                  // 泳池平台
  rect(g, 168, -54, 192, -37, 'rgb(200,196,186)');                  // 别墅基底
  rect(g, 176, -37, 184, -32, 'rgb(186,182,172)');                  // 入口
  rect(g, -19, -163, 19, -136, 'rgb(196,192,182)');                // 宿舍基底与前庭
  rect(g, -10.5, -134, 10.5, -98, 'rgb(104,128,96)');               // 网球场外场
  rect(g, 205, 9.5, 227, 24, 'rgb(150,148,140)');                    // 停车场（两车位）
  rect(g, L.barn.x - 15, L.barn.z - 8, L.barn.x + 15, L.barn.z + 8, 'rgb(170,160,138)');
  // 山顶平台（直升机场 + 机库）
  g.save(); g.translate(L.plateau.x, L.plateau.z); g.rotate(-L.plateau.rot);
  g.fillStyle = 'rgb(172,168,156)'; g.fillRect(-L.plateau.len / 2 + 1, -L.plateau.wid / 2 + 1, L.plateau.len - 2, L.plateau.wid - 2);
  g.restore();
  // 东峰平台
  g.save(); g.translate(L.summitPad.x, L.summitPad.z); g.rotate(-L.summitPad.rot); g.fillStyle = 'rgb(168,164,152)'; g.fillRect(-L.summitPad.hw + 1, -L.summitPad.hd + 1, 2 * L.summitPad.hw - 2, 2 * L.summitPad.hd - 2); g.restore();
  ell(g, L.westTower.x, L.westTower.z, 6, 6, 0, 'rgb(168,164,152)');
  ell(g, L.gateTower.x, L.gateTower.z, 5, 5, 0, 'rgb(178,174,164)');
  // 光伏场地
  const so = L.solar; rect(g, so.x0 - 3, so.z0 - 2, so.x1 + 3, so.z1 + 2, 'rgb(150,146,120)');
  speckle(so.x0 - 3, so.z0 - 2, so.x1 + 3, so.z1 + 2, 500, [0x8c8a66, 0x9f9a7a, 0x7c8a54], 0.3, 1.1, 0.5);
  // 风机基础
  for (const t of L.turbines) ell(g, t[0], t[1], 4.6, 4.6, 0, 'rgb(170,164,148)');
  // 鸭鹅区
  rect(g, L.duck.x - 12, L.duck.z - 4.5, L.duck.x + 12, L.duck.z + 4.5, 'rgb(128,150,78)');
  // 山顶小湖台地
  ell(g, L.upperLake.x + 1, L.upperLake.z, 14, 11, 0, 'rgba(112,120,82,0.55)');

  // ---------- 道路 ----------
  for (const r of X.roads) {
    const p = r.pts, foot = r.id === 'DUCK';
    const base = foot ? [190, 176, 146] : [182, 170, 146];
    for (const [wAdd, col, a] of [[1.4, [128, 118, 92], 0.55], [0, base, 1]]) {
      g.strokeStyle = css(col, a); g.lineCap = 'round'; g.lineJoin = 'round';
      for (let i = 1; i < p.length; i++) { g.lineWidth = r.widths[i] + wAdd; g.beginPath(); g.moveTo(p[i - 1][0], p[i - 1][1]); g.lineTo(p[i][0], p[i][1]); g.stroke(); }
    }
    if (!foot) for (const off of [-0.85, 0.85]) {
      g.strokeStyle = 'rgba(150,138,112,0.45)'; g.lineWidth = 0.45; g.beginPath();
      for (let i = 0; i < p.length; i++) {
        const a = p[Math.max(i - 1, 0)], b = p[Math.min(i + 1, p.length - 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
        const x = p[i][0] - dz / l * off, z = p[i][1] + dx / l * off; i ? g.lineTo(x, z) : g.moveTo(x, z);
      }
      g.stroke();
    }
  }
  // 路面颗粒
  for (const r of X.roads) for (let i = 0; i < r.pts.length; i += 1) for (let k = 0; k < 5; k++) {
    const [x, z] = r.pts[i], a = R() * TAU, d = R() * r.widths[i] * 0.5;
    g.fillStyle = R() < 0.5 ? 'rgba(150,140,118,0.35)' : 'rgba(205,196,176,0.35)'; g.fillRect(x + Math.cos(a) * d, z + Math.sin(a) * d, 0.18, 0.18);
  }
  return { canvas: cv, mask: mc };
}
