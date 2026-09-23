let VEG_ATLAS = null;
// ======================= 08 植被：雨林 / 灌木 / 香蕉 / 苹果 =======================
function lumpyGeo(detail, seed, flat = 0.82, amp = 0.22) {
  let g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = THREE.BufferGeometryUtils.mergeVertices(g, 1e-4);
  const p = g.attributes.position, col = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = SNoise(v.x * 1.7 + seed, v.y * 1.7 + v.z * 1.3 - seed) * 0.6 + SNoise(v.x * 3.6 - seed, v.z * 3.6 + v.y) * 0.4;
    v.multiplyScalar(1 + amp * n); v.y *= flat; if (v.y < -0.35) v.y = -0.35 + (v.y + 0.35) * 0.3;
    p.setXYZ(i, v.x, v.y, v.z);
    const t = clamp((v.y + 0.4) / 1.2, 0, 1), sh = 0.55 + 0.5 * t + 0.08 * n;
    col.push(sh, sh, sh);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  return g;
}
function crownGeo(seed, lobes = 4, flat = 0.85, detail = 1) {
  const R = mulberry32(Math.floor(seed * 1000)), pos = [], col = [], idx = [];
  const base = (() => { let g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv'); return THREE.BufferGeometryUtils.mergeVertices(g, 1e-4); })();
  const bp = base.attributes.position, bi = base.index.array, v = new THREE.Vector3();
  for (let l = 0; l < lobes; l++) {
    const main = l === 0, r = main ? 0.72 : 0.42 + R() * 0.2, a = R() * TAU, d = main ? 0 : 0.38 + R() * 0.2;
    const ox = Math.cos(a) * d, oz = Math.sin(a) * d, oy = main ? 0 : -0.1 + R() * 0.35, off = pos.length / 3;
    for (let i = 0; i < bp.count; i++) {
      v.fromBufferAttribute(bp, i);
      const n = SNoise(v.x * 1.9 + seed + l * 3.1, v.y * 1.9 + v.z * 1.4 - seed) * 0.6 + SNoise(v.x * 4 - seed, v.z * 4 + v.y + l) * 0.4;
      v.multiplyScalar(r * (1 + 0.2 * n)); v.x += ox; v.z += oz; v.y = (v.y + oy) * flat;
      if (v.y < -0.4) v.y = -0.4 + (v.y + 0.4) * 0.3;
      pos.push(v.x, v.y, v.z);
      const t = clamp((v.y + 0.45) / 1.1, 0, 1), sh = 0.45 + 0.6 * t + 0.1 * n;
      col.push(sh, sh, sh);
    }
    for (let k = 0; k < bi.length; k++) idx.push(bi[k] + off);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function foliageMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPf;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vec4 wpf = vec4(transformed,1.0);\n #ifdef USE_INSTANCING\n wpf = instanceMatrix*wpf;\n #endif\n vWPf = (modelMatrix*wpf).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPf;\n' + GLSL_NOISE)
      .replace('#include <color_fragment>', '#include <color_fragment>\n float lf = vnoise(vWPf.xz*1.4 + vWPf.y*0.9); float lf2 = vnoise(vWPf.xz*4.1 - vWPf.y*2.0);\n diffuseColor.rgb *= 0.72 + 0.4*lf + 0.18*lf2;');
  };
  return m;
}
function buildVegetation(X, scene, QS) {
  const H = X.H, NR = X.normals;
  const R = mulberry32(4242);
  const cell = (x, z) => Math.round(clamp(z - G.z0, 0, G.nz - 1)) * G.nx + Math.round(clamp(x - G.x0, 0, G.nx - 1));
  // 排除区（山体上的设施、净空）
  const excl = [
    (x, z) => rectSD(x, z, L.plateau.x, L.plateau.z, L.plateau.len / 2 + 7, L.plateau.wid / 2 + 7, L.plateau.rot) < 0,
    (x, z) => { const [d, t] = segDist(x, z, L.helipad.x, L.helipad.z, -372, -95); return d < 20 && t > 0; },   // 西侧进离场净空
    (x, z) => Math.hypot(x - L.westTower.x, z - L.westTower.z) < 11,
    (x, z) => rectSD(x, z, L.summitPad.x, L.summitPad.z, L.summitPad.hw + 5, L.summitPad.hd + 5, L.summitPad.rot) < 0,
    (x, z) => x > L.solar.x0 - 7 && x < L.solar.x1 + 6 && z > L.solar.z0 - 6 && z < L.solar.z1 + 5,
    (x, z) => L.turbines.some(t => Math.hypot(x - t[0], z - t[1]) < 9),
    (x, z) => Math.hypot(x - L.pwWest.x, z - L.pwWest.z) < 7,
    (x, z) => Math.hypot((x - L.upperLake.x - 2) / 20, (z - L.upperLake.z) / 16) < 1,
    (x, z) => Math.hypot(x - L.gateTower.x, z - L.gateTower.z) < 9,
    (x, z) => Math.abs(z - L.gateZ) < 6 && Math.abs(x) < 48,
    (x, z) => { const [d, t] = segDist(x, z, FALL.lip.x, FALL.lip.z, FALL.plunge.x, FALL.plunge.z); return d < 5; },
  ];
  const trees = [], shrubs = [];
  const step = 4.2 / Math.sqrt(QS ? QS.density : 1);
  for (let z = G.z0 + 2; z < G.z0 + G.nz - 2; z += step) for (let x = G.x0 + 2; x < G.x0 + G.nx - 2; x += step) {
    const px = x + (R() - 0.5) * step * 0.9, pz = z + (R() - 0.5) * step * 0.9, k = cell(px, pz);
    const h = sampleGrid(H, px, pz), ny = NR[k * 3 + 1], sdb = X.sdB[k], sdc = X.sdC[k];
    if (h < 1.5 || sdc < 1.2) continue;
    if (X.roads.dist[k] < 2.2 + R() * 1.5) continue;
    if (excl.some(f => f(px, pz))) continue;
    if (sdb < -1.5) {
      const s = sdc / (sdc - sdb);
      if (ny < 0.5) continue;
      if (ny < 0.66 && R() < 0.6) continue;
      const forest = 1 - smoothstep(0.62, 0.88, s);
      if (R() < forest) trees.push([px, h, pz, ny]); else if (R() < 0.85) shrubs.push([px, h, pz, 1]);
      if (R() < 0.35) { const ox = px + (R() - 0.5) * 3, oz = pz + (R() - 0.5) * 3; shrubs.push([ox, gh(ox, oz), oz, 0.8]); }   // 偏移后按所在地面取高（陡坡上沿用原点高度会悬空或埋地）
    } else if (X.sdW[k] < -10 && !(X.beachW(px, pz) > 0.1 && X.sdW[k] > -40)) {
      // 盆地内灌木丛（避开农田、建筑与道路）
      if (!basinFree(px, pz) || X.roads.dist[k] < 4) continue;
      const clump = fbm(px * 0.035 + 11, pz * 0.035 - 4, 3);
      const edge = 1 - smoothstep(0, 14, sdb);
      const p = clamp(0.35 + edge * 0.6 + clump * 1.1, 0, 0.97);
      if (R() < p) shrubs.push([px, h, pz, 0.8 + 0.4 * edge]);
      if (R() < p * 0.6) { const ox = px + (R() - 0.5) * 3.5, oz = pz + (R() - 0.5) * 3.5; shrubs.push([ox, gh(ox, oz), oz, 0.7]); }
      if (R() < p * 0.06) trees.push([px, h, pz, 1, 'small']);
    }
  }
  // ---------------- 分层雨林：突出层 / 主冠层 / 下层 + 灌木 + 林下蕨类 ----------------
  const atlas = leafAtlas(); VEG_ATLAS = atlas;
  const leafMat = leafMaterial(atlas), coreMat = foliageMaterial(); coreMat.color.setHex(0x3c6a30);
  const mats = [coreMat, leafMat];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color(), eu = new THREE.Euler();
  const TINT = [[0.9, 0.95, 0.85], [0.78, 0.9, 0.7], [0.95, 0.9, 0.68], [0.7, 0.84, 0.78], [1.0, 0.98, 0.76], [0.66, 0.78, 0.62], [0.88, 0.8, 0.6], [0.6, 0.74, 0.6]];
  // 物种：高处以椰子树为主，低处以各类榕树为主
  const palmBark = std(0xffffff, 0.9, 0, { map: palmBarkTexture(), vertexColors: true });
  const barkMat = std(0xffffff, 0.95, 0, { map: barkTexture(), vertexColors: true });
  const SPEC = {
    palm: [0, 1, 2, 3].map(k => palmGeo(k + 1)),
    banyan: [banyanTreeGeo(1, { clumps: 10, flat: 0.42, spread: 0.82, cell: 10, hb: 0.68, roots: 9 }), banyanTreeGeo(2, { clumps: 9, flat: 0.38, spread: 0.85, cell: 10, hb: 0.72, roots: 7 })],
    ficusRound: [banyanTreeGeo(3, { clumps: 8, flat: 0.75, spread: 0.55, cell: 10, cards: 7, hb: 0.72, roots: 1 })],
    ficusWeep: [banyanTreeGeo(4, { clumps: 9, flat: 0.6, spread: 0.65, cell: 11, cards: 7, hb: 0.8, roots: 2 })],
    shrub: [crownCardsGeo(3.3, { lobes: 2, detail: 0, flat: 0.7, cards: 8, cell: 2, cardSize: 1.15 })],
  };
  const WOOD = { banyan: [banyanWoodGeo(1, 14), banyanWoodGeo(2, 10)], ficus: [banyanWoodGeo(3, 3)] };
  const lists = { palm: [[], [], [], []], banyan: [[], []], ficusRound: [[]], ficusWeep: [[]], shrub: [[]] }, wood = { banyan: [[], []], ficus: [[]] };
  const palmColl = [], treeColl = [];
  for (const t of trees) {
    const small = t[4] === 'small', u = R();
    if (!small && u < 0.33) {                                          // 椰子树（高）
      const H0 = 13 + R() * 9, v = Math.floor(R() * 4);
      lists.palm[v].push({ x: t[0], y: t[1] - 0.3, z: t[2], sx: H0, sy: H0, rot: R() * TAU, tint: [0.95 + R() * 0.1, 1.0, 0.8 + R() * 0.1] });
      palmColl.push([t[0], t[2], 0.35]); continue;
    }
    const w = R();
    let kind = small ? 'ficusRound' : w < 0.5 ? 'banyan' : w < 0.8 ? 'ficusRound' : 'ficusWeep';
    if (kind === 'banyan' && R() < 0.45) continue;                     // 冠幅大，稀疏布置
    const Rc = kind === 'banyan' ? 6.5 + R() * 3 : small ? 2.4 + R() * 1.0 : 3.4 + R() * 1.6;
    const v = kind === 'banyan' ? Math.floor(R() * 2) : 0, rot = R() * TAU, tint = TINT[Math.floor(R() * TINT.length)];
    lists[kind][v].push({ x: t[0], y: t[1], z: t[2], sx: Rc, sy: Rc * (0.92 + R() * 0.16), rot, tint });    // 整株：地面为原点，均匀缩放
    treeColl.push([t[0], t[2], 0.1 * Rc + 0.08]);
  }
  for (const t of shrubs) { const r = (1.1 + R() * 1.6) * t[3]; lists.shrub[0].push({ x: t[0], y: t[1] + r * 0.3, z: t[2], sx: r, sy: r * (0.6 + R() * 0.35), rot: R() * TAU, tint: TINT[Math.floor(R() * TINT.length)] }); }
  const out = [];
  for (const k in lists) lists[k].forEach((L_, vi) => {
    if (!L_.length) return;
    const im = new THREE.InstancedMesh(SPEC[k][vi], k === 'palm' ? [palmBark, leafMat] : k === 'shrub' ? mats : [barkMat, coreMat, leafMat], L_.length);
    L_.forEach((o, i) => { eu.set(0, o.rot, 0); q.setFromEuler(eu); sc.set(o.sx, o.sy, o.sx); m4.compose(ps.set(o.x, o.y, o.z), q, sc); im.setMatrixAt(i, m4); col.setRGB(o.tint[0], o.tint[1], o.tint[2]); im.setColorAt(i, col); });
    im.castShadow = true; im.receiveShadow = true; scene.add(im); out.push(im);
  });
  for (const wk in wood) wood[wk].forEach((L_, vi) => {
    if (!L_.length) return;
    const tm = new THREE.InstancedMesh(WOOD[wk][vi], barkMat, L_.length);
    L_.forEach((o, i) => { eu.set(0, o.rot, 0); q.setFromEuler(eu); m4.compose(ps.set(o.x, o.y, o.z), q, sc.set(o.sx, o.sy, o.sx)); tm.setMatrixAt(i, m4); });
    tm.castShadow = true; tm.receiveShadow = true; scene.add(tm);
  });
  // 别墅北门扶桑（开红花）
  if (typeof HIBISCUS !== 'undefined' && HIBISCUS.length) {
    const hm = new THREE.InstancedMesh(crownCardsGeo(9.9, { lobes: 2, detail: 0, flat: 0.85, cards: 12, cell: 9, cardSize: 1.1 }), mats, HIBISCUS.length);
    HIBISCUS.forEach((p, i) => { const r = 0.55 + R() * 0.15; eu.set(0, R() * TAU, 0); q.setFromEuler(eu); m4.compose(ps.set(p[0], p[1] + r * 0.9, p[2]), q, sc.set(r, r * 1.15, r)); hm.setMatrixAt(i, m4); hm.setColorAt(i, col.setRGB(1, 1, 1)); });
    hm.castShadow = true; hm.receiveShadow = true; scene.add(hm);
  }
  const trunksN = [], trunksE = [];
  // 林下蕨类（漫游可见；鸟瞰被树冠遮挡）
  const ferns = [];
  if (!QS || QS.density >= 0.7) for (const t of trees) for (let k = 0; k < 1; k++) {
    if (R() < 0.3) continue;
    const a = R() * TAU, d = 1.5 + R() * 3.5, x = t[0] + Math.cos(a) * d, z = t[2] + Math.sin(a) * d, cc = cell(x, z);
    if (NR[cc * 3 + 1] < 0.6 || X.roads.dist[cc] < 2) continue;
    ferns.push([x, sampleGrid(H, x, z), z]);
  }
  if (ferns.length) {
    const fm = new THREE.InstancedMesh(frondGeo(6, 1.5, 3, 0.55), leafMat, ferns.length);
    ferns.forEach((f, i) => { const s = 0.7 + R() * 0.6; eu.set(0, R() * TAU, 0); q.setFromEuler(eu); m4.compose(ps.set(f[0], f[1] - 0.05, f[2]), q, sc.set(s, s, s)); fm.setMatrixAt(i, m4); col.setRGB(0.85 + R() * 0.2, 0.95 + R() * 0.1, 0.8); fm.setColorAt(i, col); });
    fm.castShadow = false; fm.receiveShadow = true; scene.add(fm);
  }
  for (const c of [...palmColl, ...treeColl]) collC(c[0], c[1], c[2]);
  const sm = null;
  // 崖脚崩积碎石
  const rocks = [];
  const steepAt = (x, z) => NR[cell(x, z) * 3 + 1] < 0.55;
  for (let z = G.z0 + 3; z < G.z0 + G.nz - 3; z += 2.2) for (let x = G.x0 + 3; x < G.x0 + G.nx - 3; x += 2.2) {
    const px = x + (R() - 0.5) * 2, pz = z + (R() - 0.5) * 2, k = cell(px, pz), h = sampleGrid(H, px, pz);
    if (h < 1.2 || NR[k * 3 + 1] < 0.72 || X.roads.dist[k] < 2.5 || X.sdC[k] < 2) continue;
    if (X.sdB[k] >= 0 && !basinFree(px, pz) && lakeSD(px, pz, L.lake, 0.1) < -3) continue;
    if (lakeSD(px, pz, L.lake, 0.1) > -0.5 || excl.some(f => f(px, pz))) continue;
    let near = 0; for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, 2], [2, -2], [-2, -2]]) if (steepAt(px + dx, pz + dz)) near++;
    if (near === 0 || R() > 0.25 + near * 0.08) continue;
    rocks.push([px, h, pz, 0.5 + R() * (0.6 + near * 0.18)]);
  }
  // 崖脚海岸崩落岩块（部分没入水中）
  for (let z = G.z0 + 3; z < G.z0 + G.nz - 3; z += 2.6) for (let x = G.x0 + 3; x < G.x0 + G.nx - 3; x += 2.6) {
    const px = x + (R() - 0.5) * 2.4, pz = z + (R() - 0.5) * 2.4, k = cell(px, pz), sc_ = X.sdC[k];
    if (sc_ < -3.5 || sc_ > 2.5 || (Math.abs(px) < 60 && pz > 100)) continue;
    const h = sampleGrid(H, px, pz); if (h > 4 || h < -6 || R() > 0.42) continue;
    rocks.push([px, Math.max(h, -1.2), pz, 1.0 + R() * 2.6]);
  }
  const rg = (() => { let g = new THREE.DodecahedronGeometry(1, 0); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = THREE.BufferGeometryUtils.mergeVertices(g); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const f = 0.8 + 0.35 * Math.abs(SNoise(p.getX(i) * 2.1, p.getZ(i) * 2.1 + p.getY(i))); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.7, p.getZ(i) * f); } g.computeVertexNormals(); return g; })();
  const rm = new THREE.InstancedMesh(rg, std(0xffffff, 0.92), rocks.length);
  rocks.forEach((r, i) => { m4.compose(ps.set(r[0], r[1] + r[3] * 0.15, r[2]), q.setFromEuler(new THREE.Euler(R() * 0.5, R() * TAU, R() * 0.5)), sc.set(r[3], r[3] * (0.7 + R() * 0.5), r[3] * (0.8 + R() * 0.4))); rm.setMatrixAt(i, m4); rm.setColorAt(i, col.setHex(0x6e675c).lerp(new THREE.Color(0x9a9282), R())); });
  rm.castShadow = true; rm.receiveShadow = true; scene.add(rm);
  for (const r of rocks) if (r[3] > 0.7) collC(r[0], r[2], r[3] * 0.85);
  return { banyanAt: lists.banyan[0].slice(0, 6).map(o => [+o.x.toFixed(1), +o.z.toFixed(1), +o.y.toFixed(1), +o.sx.toFixed(1)]), ficusAt: lists.ficusRound[0].slice(0, 4).map(o => [+o.x.toFixed(1), +o.z.toFixed(1), +o.y.toFixed(1), +o.sx.toFixed(1)]), trees: trees.length, palms: palmColl.length, ficus: treeColl.length, shrubs: shrubs.length, rocks: rocks.length, ferns: ferns.length };
}
// 盆地内空地判定（不压占任何功能区）
function basinFree(x, z) {
  const rects = [
    [L.vineyard.x0, L.vineyard.z0, L.vineyard.x1, L.vineyard.z1], [L.rice.x0, L.rice.z0, L.rice.x1, L.rice.z1],
    [L.bananas.x0, L.bananas.z0, L.bananas.x1, L.bananas.z1], [L.veg.x0, L.veg.z0, L.veg.x1, L.veg.z1],
    [-144, -26, -86, 10], [-240, -70, -158, 18], [-142, 40, -84, 66], [-12, -166, 12, -96], [-20, -166, 20, -134],
    [100, -95, 216, -4], [160, -66, 200, -30], [200, 8, 232, 34], [150, -104, 200, -88], [52, -128, 135, -96], [-236, -64, -166, -50], [-12, -140, 20, -90]
  ];
  for (const r of rects) if (x > r[0] - 4 && x < r[2] + 4 && z > r[1] - 4 && z < r[3] + 4) return false;
  if (Math.hypot(x - L.lake.x, (z - L.lake.z) * 1.4) < 24) return false;
  for (const path of [BOARDWALK.east, BOARDWALK.south]) for (let i = 1; i < path.length; i++) if (segDist(x, z, path[i - 1][0], path[i - 1][1], path[i][0], path[i][1])[0] < 4) return false;
  if (Math.hypot(x - L.landing.x, z - L.landing.z) < 10) return false;
  return true;
}
// ---------------- 香蕉株（宽大长叶，非椰子） ----------------
function bananaGeo() {
  const [u0, v0, u1, v1] = ATLAS_UV(5), vm = (v0 + v1) / 2, vh = (v1 - v0) * 0.3;
  const parts = [];
  const stem = new THREE.CylinderGeometry(0.085, 0.13, 2.4, 7); stem.translate(0, 1.2, 0);
  { const uv = stem.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (u0 + u1) / 2, vm); }
  const cs = []; for (let i = 0; i < stem.attributes.position.count; i++) cs.push(0.62, 0.5, 0.26); stem.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3));
  parts.push(stem.toNonIndexed());
  for (let k = 0; k < 11; k++) {
    const a = k / 11 * TAU + (k % 2) * 0.3, L0 = 2.7 + (k % 3) * 0.35, W0 = 0.95;
    const pos = [], uv = [], col = [], idx = [], n = 7;
    for (let i = 0; i <= n; i++) {
      const t = i / n, r = t * L0 * (0.85 + 0.15 * (1 - t)), y = 2.2 + t * 1.3 - t * t * 2.0, w = W0 * Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.04));
      for (const sd of [-1, 1]) { const lz = sd * w / 2; pos.push(r * Math.cos(a) - lz * Math.sin(a), y - Math.abs(sd) * 0.05 * t, r * Math.sin(a) + lz * Math.cos(a)); uv.push(lerp(u0, u1, t), vm + sd * vh); const c = 0.7 + 0.35 * t; col.push(c, c, c); }
      if (i < n) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    parts.push(g.toNonIndexed());
  }
  const merged = THREE.BufferGeometryUtils.mergeGeometries(parts.map(p => { if (p.attributes.normal) p.deleteAttribute('normal'); return p; }));
  merged.computeVertexNormals(); return merged;
}
function buildCrops(scene) {
  const R = mulberry32(99), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();
  // 香蕉
  const bn = L.bananas, pts = [];
  for (let x = bn.x0 + 1.8; x < bn.x1 - 1; x += 3.1) for (let z = bn.z0 + 1.8; z < bn.z1 - 1; z += 3.1) pts.push([x + (R() - 0.5) * 0.8, z + (R() - 0.5) * 0.8]);
  const bm = leafMaterial(VEG_ATLAS);
  const bi = new THREE.InstancedMesh(bananaGeo(), bm, pts.length);
  pts.forEach((p, i) => { const s = 0.85 + R() * 0.4; m4.compose(ps.set(p[0], gh(p[0], p[1]), p[1]), q.setFromEuler(new THREE.Euler(0, R() * TAU, 0)), sc.set(s, s, s)); bi.setMatrixAt(i, m4); bi.setColorAt(i, col.setRGB(0.85 + R() * 0.25, 0.95 + R() * 0.15, 0.7 + R() * 0.15)); });
  bi.castShadow = true; bi.receiveShadow = true; scene.add(bi);
  for (const p of pts) collC(p[0], p[1], 0.3);
  // 苹果树
  const orch = L.orchard, apples = [];
  for (let x = 56; x < 132; x += 5) for (let z = -122; z < -99; z += 5) if (pointInPoly(x, z, orch.map(p => [p[0] + (p[0] > 90 ? 0 : 0), p[1]])) && Math.hypot(x - 100, z + 110) < 60) apples.push([x + (R() - 0.5), z + (R() - 0.5)]);
  const acore = foliageMaterial(); acore.color.setHex(0x345c26);
  const am = new THREE.InstancedMesh(crownCardsGeo(5.5, { lobes: 2, cards: 14, cell: 4, cardSize: 1.05 }), [acore, leafMaterial(VEG_ATLAS)], apples.length);
  const tg = new THREE.CylinderGeometry(0.12, 0.16, 1.4, 6); tg.translate(0, 0.7, 0);
  const at = new THREE.InstancedMesh(tg, std(0x5b4636, 0.9), apples.length);
  apples.forEach((p, i) => { const y = gh(p[0], p[1]), r = 1.6 + R() * 0.4; m4.compose(ps.set(p[0], y + 2.3, p[1]), q.setFromEuler(new THREE.Euler(0, R() * TAU, 0)), sc.set(r, r * 0.95, r)); am.setMatrixAt(i, m4); am.setColorAt(i, col.setRGB(0.9, 1, 0.85)); m4.compose(ps.set(p[0], y, p[1]), q.identity(), sc.set(1, 1, 1)); at.setMatrixAt(i, m4); });
  am.castShadow = at.castShadow = true; am.receiveShadow = true; scene.add(am); scene.add(at);
  for (const p of apples) collC(p[0], p[1], 0.25);
  // ---------------- 蔬菜基地：按畦种植七种作物；大棚内番茄吊蔓与草莓 ----------------
  const VT = ['lettuce', 'cabbage', 'tomato', 'carrot', 'corn', 'eggplant', 'scallion'], lists = {}; VT.forEach(k => lists[k] = []);
  const vg = L.veg; let bedI = 0;
  for (let x = vg.x0 + 1; x < vg.x1 - 1.2; x += 1.8, bedI++) {
    const type = VT[Math.floor(bedI / 3) % VT.length], sp = { lettuce: 0.42, cabbage: 0.55, tomato: 0.6, carrot: 0.28, corn: 0.5, eggplant: 0.6, scallion: 0.22 }[type];
    for (const off of (type === 'tomato' || type === 'corn' || type === 'eggplant' ? [0.6] : [0.3, 0.9])) for (let z = vg.z0 + 1.4; z < vg.z1 - 1.2; z += sp) lists[type].push([x + off + (R() - 0.5) * 0.06, z + (R() - 0.5) * 0.06, R()]);
  }
  const gh0 = L.greenhouses, ghT = [], ghS = [];
  for (let i = 0; i < gh0.n; i++) for (let r = 0; r < 4; r++) { const x = gh0.x0 + i * (gh0.w + gh0.gap) + 1.35 + r * 1.9; for (let z = gh0.z0 + 1.2; z < gh0.z0 + gh0.len - 1; z += (i % 2 ? 0.35 : 0.55)) (i % 2 ? ghS : ghT).push([x, z, R()]); }
  const leafM = leafMaterial(VEG_ATLAS), riceM = leafMaterial(riceTexture());
  const inst = (geo, mat, arr, fn, cast = false) => { if (!arr.length) return; const im = new THREE.InstancedMesh(geo, mat, arr.length); arr.forEach((p, i) => { const o = fn(p); q.setFromEuler(new THREE.Euler(0, o.rot, 0)); m4.compose(ps.set(p[0], o.y, p[1]), q, sc.set(o.sx, o.sy, o.sx)); im.setMatrixAt(i, m4); col.setRGB(...(o.c || [1, 1, 1])); im.setColorAt(i, col); }); im.castShadow = cast; im.receiveShadow = true; scene.add(im); };
  const g_ = (x, z) => gh(x, z);
  const hillGeo = (() => { const g = new THREE.BufferGeometry(), hp = [], hu = [], hn = [], hc = [], hi = []; for (let k = 0; k < 2; k++) { const a = k * Math.PI / 2 + 0.3, dx = Math.cos(a) * 0.2, dz = Math.sin(a) * 0.2, b = hp.length / 3; hp.push(-dx, 0, -dz, dx, 0, dz, dx, 1, dz, -dx, 1, -dz); hu.push(0, 0, 1, 0, 1, 1, 0, 1); for (let i = 0; i < 4; i++) { hn.push(0, 1, 0); const c = i < 2 ? 0.7 : 1.05; hc.push(c, c, c); } hi.push(b, b + 1, b + 2, b, b + 2, b + 3); } g.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(hu, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(hn, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(hc, 3)); g.setIndex(hi); return g; })();
  const solid = (geo, color) => { const g = geo.index ? geo.toNonIndexed() : geo; const c = new THREE.Color(color), a = []; for (let i = 0; i < g.attributes.position.count; i++) a.push(c.r, c.g, c.b); g.setAttribute('color', new THREE.Float32BufferAttribute(a, 3)); return g; };
  const vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), noCore = new THREE.MeshBasicMaterial({ visible: false });
  // 生菜
  inst(frondGeo(9, 0.24, 7, 0.15, 0.02), leafM, lists.lettuce, p => ({ y: g_(p[0], p[1]), rot: p[2] * 7, sx: 0.9 + p[2] * 0.3, sy: 0.9, c: [0.9, 1.05, 0.8] }));
  // 结球甘蓝：叶球 + 外叶
  inst(solid(new THREE.IcosahedronGeometry(0.15, 1), 0x7fa85c), vcMat, lists.cabbage, p => ({ y: g_(p[0], p[1]) + 0.13, rot: p[2] * 7, sx: 1 + p[2] * 0.2, sy: 0.85 }), true);
  inst(frondGeo(7, 0.3, 7, 0.35, 0.05), leafM, lists.cabbage, p => ({ y: g_(p[0], p[1]), rot: p[2] * 9, sx: 1, sy: 0.8, c: [0.75, 0.95, 0.85] }));
  // 番茄：竹竿 + 藤叶 + 红果
  const tomatoFruit = solid(THREE.BufferGeometryUtils.mergeGeometries([0, 1, 2, 3].map(k => { const g = new THREE.IcosahedronGeometry(0.045, 0); g.translate(Math.cos(k * 1.7) * 0.18, 0.45 + k * 0.22, Math.sin(k * 1.7) * 0.18); return g; })), 0xd02a1e);   // Icosahedron 本身非索引，无需 toNonIndexed
  const stake = solid(new THREE.CylinderGeometry(0.012, 0.015, 1.5, 5).translate(0, 0.75, 0), 0xa08a5c);
  const tomatoLeaves = crownCardsGeo(41.1, { lobes: 1, detail: 0, flat: 2.2, cards: 14, cell: 2, cardSize: 1.0, shell: 0.55 });
  for (const [arr, H] of [[lists.tomato, 1.0], [ghT, 1.5]]) {
    inst(stake, vcMat, arr, p => ({ y: g_(p[0], p[1]), rot: 0, sx: 1, sy: H }));
    inst(tomatoLeaves, [noCore, leafM], arr, p => ({ y: g_(p[0], p[1]) + 0.55 * H, rot: p[2] * 7, sx: 0.32, sy: 0.3 * H, c: [0.85, 1, 0.8] }), true);
    inst(tomatoFruit, vcMat, arr, p => ({ y: g_(p[0], p[1]), rot: p[2] * 7, sx: 1, sy: H }));
  }
  // 胡萝卜：羽状叶
  inst(frondGeo(8, 0.26, 3, 0.2, 0.02), leafM, lists.carrot, p => ({ y: g_(p[0], p[1]), rot: p[2] * 7, sx: 0.9, sy: 1.1, c: [0.9, 1.1, 0.8] }));
  // 玉米：茎秆 + 长叶（稻叶贴图放大）+ 雄穗
  inst(solid(new THREE.CylinderGeometry(0.02, 0.03, 2.0, 6).translate(0, 1.0, 0), 0x6f8f3a), vcMat, lists.corn, p => ({ y: g_(p[0], p[1]), rot: 0, sx: 1, sy: 0.9 + p[2] * 0.2 }), true);
  inst(hillGeo, riceM, lists.corn, p => ({ y: g_(p[0], p[1]) + 0.1, rot: p[2] * 7, sx: 2.2, sy: 1.8 + p[2] * 0.3, c: [0.8, 0.95, 0.75] }));
  inst(solid(new THREE.ConeGeometry(0.06, 0.35, 5).translate(0, 2.1, 0), 0xc9b36a), vcMat, lists.corn, p => ({ y: g_(p[0], p[1]), rot: 0, sx: 1, sy: 0.9 + p[2] * 0.2 }));
  // 茄子：灌丛 + 紫色长果
  inst(crownCardsGeo(42.2, { lobes: 1, detail: 0, flat: 0.9, cards: 10, cell: 2, cardSize: 1.2 }), [noCore, leafM], lists.eggplant, p => ({ y: g_(p[0], p[1]) + 0.35, rot: p[2] * 7, sx: 0.38, sy: 0.35, c: [0.85, 0.95, 0.9] }), true);
  inst(solid(THREE.BufferGeometryUtils.mergeGeometries([0, 1, 2].map(k => { const g = new THREE.SphereGeometry(0.04, 6, 5); g.scale(1, 2.6, 1); g.translate(Math.cos(k * 2.1) * 0.22, 0.3, Math.sin(k * 2.1) * 0.22); return g.toNonIndexed(); })), 0x4a1f5a), vcMat, lists.eggplant, p => ({ y: g_(p[0], p[1]), rot: p[2] * 7, sx: 1, sy: 1 }));
  // 香葱
  inst(hillGeo, riceM, lists.scallion, p => ({ y: g_(p[0], p[1]), rot: p[2] * 7, sx: 0.5, sy: 0.45, c: [0.55, 0.85, 0.5] }));
  // 大棚草莓：低矮叶丛 + 红果
  inst(frondGeo(6, 0.16, 7, 0.1, 0.01), leafM, ghS, p => ({ y: g_(p[0], p[1]) + 0.12, rot: p[2] * 7, sx: 1, sy: 1, c: [0.75, 1, 0.75] }));
  inst(solid(new THREE.IcosahedronGeometry(0.025, 0).translate(0.08, 0.14, 0.03), 0xe0202a), vcMat, ghS, p => ({ y: g_(p[0], p[1]), rot: p[2] * 7, sx: 1, sy: 1 }));
  for (let i = 0; i < gh0.n; i++) if (i % 2 === 0) for (let r = 0; r < 4; r++) { const x = gh0.x0 + i * (gh0.w + gh0.gap) + 1.35 + r * 1.9; const g = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, gh0.len - 2, 4), M.galv); g.rotation.x = Math.PI / 2; g.position.set(x, 5.9 + 2.1, gh0.z0 + gh0.len / 2); scene.add(g); }
  const vp = []; for (const k of VT) vp.push(...lists[k]);
  return { bananas: pts.length, apples: apples.length, veg: vp.length, greenhouse: ghT.length + ghS.length };
}
// ======================= 水田：水面 + 成行稻丛 =======================
function riceTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d'), R = mulberry32(4411);
  for (let i = 0; i < 26; i++) {
    const a = (R() - 0.5) * 0.9, len = 70 + R() * 55, bx = 64 + (R() - 0.5) * 10, bend = (R() - 0.5) * 30;
    const gr = g.createLinearGradient(0, 128, 0, 128 - len); gr.addColorStop(0, '#3d6a2a'); gr.addColorStop(0.6, '#5f9a38'); gr.addColorStop(1, '#9cc25a');
    g.strokeStyle = gr; g.lineWidth = 2 + R() * 1.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, 128);
    g.quadraticCurveTo(bx + Math.sin(a) * len * 0.5, 128 - len * 0.55, bx + Math.sin(a) * len + bend, 128 - len * Math.cos(a)); g.stroke();
  }
  for (let i = 0; i < 7; i++) {   // 抽穗：下垂的稻穗
    const x0 = 40 + R() * 48, y0 = 22 + R() * 20, dir = R() < 0.5 ? -1 : 1;
    g.strokeStyle = '#b8b060'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + dir * 12, y0 - 6, x0 + dir * 20, y0 + 14); g.stroke();
    for (let k = 0; k < 8; k++) { const t = k / 8; g.fillStyle = '#d4c270'; g.beginPath(); g.ellipse(x0 + dir * (8 + t * 12), y0 - 4 + t * 16, 2.2, 1.3, 0.8 * dir, 0, TAU); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8; return t;
}
function buildRice(scene, QS) {
  const r = L.rice, plots = PADDY.seeds;
  const id = (x, z) => PADDY.inside(x, z) ? PADDY.id(x, z) : -1;
  // 水面：逐 0.5 米格，田埂处留空
  const pos = [], idx = [];
  for (let z = r.z0; z < r.z1; z += 0.5) for (let x = r.x0; x < r.x1; x += 0.5) {
    const p = id(x + 0.25, z + 0.25); if (p < 0) continue;
    if (id(x - 0.3, z + 0.25) !== p || id(x + 0.8, z + 0.25) !== p || id(x + 0.25, z - 0.3) !== p || id(x + 0.25, z + 0.8) !== p) continue;
    const y = plots[p].level + 0.06, b = pos.length / 3;
    pos.push(x, y, z, x + 0.5, y, z, x + 0.5, y, z + 0.5, x, y, z + 0.5); idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg.setIndex(idx); wg.computeVertexNormals();
  const wm = new THREE.MeshStandardMaterial({ color: 0x3f5a4c, roughness: 0.06, metalness: 0.0, transparent: true, opacity: 0.78, envMapIntensity: 1.4 });
  const water = new THREE.Mesh(wg, wm); water.receiveShadow = true; scene.add(water);
  // 稻丛：每丛两片交叉面片，成行种植（行距 0.3 米、丛距 0.25 米，低档加倍间距）
  const k = QS && QS.tier === 'low' ? 1.6 : 1.0, rowS = 0.3 * k, hillS = 0.25 * k;
  const hills = [], R = mulberry32(8811);
  plots.forEach((pl, p) => {
    const ang = (p * 0.61) % Math.PI, ca = Math.cos(ang), sa = Math.sin(ang), cx = pl.x, cz = pl.z;
    for (let v = -34; v <= 34; v += rowS) for (let u = -34; u <= 34; u += hillS) {
      const x = cx + u * ca - v * sa, z = cz + u * sa + v * ca;
      if (id(x, z) !== p || id(x + 0.45, z) !== p || id(x - 0.45, z) !== p || id(x, z + 0.45) !== p || id(x, z - 0.45) !== p) continue;
      const jx = (R() - 0.5) * 0.04, jz = (R() - 0.5) * 0.04, rr = R();            // 先取随机数，保持其余稻丛位置不变
      if (gh(x, z) > pl.level + 0.15) continue;                                         // 梯田挡墙脚下地面已抬高，种下去会整丛埋进墙里
      hills.push([x + jx, pl.level - 0.12, z + jz, rr]);
    }
  });
  const hg = new THREE.BufferGeometry(), hp = [], hu = [], hn = [], hc = [], hi = [];
  for (let q = 0; q < 2; q++) { const a = q * Math.PI / 2 + 0.3, dx = Math.cos(a) * 0.2, dz = Math.sin(a) * 0.2, b = hp.length / 3;
    hp.push(-dx, 0, -dz, dx, 0, dz, dx, 1, dz, -dx, 1, -dz); hu.push(0, 0, 1, 0, 1, 1, 0, 1); for (let i = 0; i < 4; i++) { hn.push(0, 1, 0); const c = i < 2 ? 0.7 : 1.05; hc.push(c, c, c); } hi.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  hg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3)); hg.setAttribute('uv', new THREE.Float32BufferAttribute(hu, 2)); hg.setAttribute('normal', new THREE.Float32BufferAttribute(hn, 3)); hg.setAttribute('color', new THREE.Float32BufferAttribute(hc, 3)); hg.setIndex(hi);
  const hm = new THREE.InstancedMesh(hg, leafMaterial(riceTexture()), hills.length);
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color(), eu = new THREE.Euler();
  hills.forEach((h, i) => { const s = 0.62 + h[3] * 0.2; eu.set(0, h[3] * TAU, 0); qq.setFromEuler(eu); m4.compose(ps.set(h[0], h[1], h[2]), qq, sc.set(1.1, s, 1.1)); hm.setMatrixAt(i, m4); hm.setColorAt(i, col.setRGB(0.66 + h[3] * 0.1, 0.74 + h[3] * 0.06, 0.6)); });
  hm.castShadow = false; hm.receiveShadow = true; scene.add(hm);
  return { hills: hills.length };
}
// ======================= 盆栽花卉：水仙（白花被 + 黄副冠）与红玫瑰 =======================
function buildPots(scene) {
  if (!POTS.length) return;
  const parts = (list) => { list.forEach(p => { if (p.attributes.uv) p.deleteAttribute('uv'); }); const g = THREE.BufferGeometryUtils.mergeGeometries(list.map(p => p.index ? p.toNonIndexed() : p)); g.computeVertexNormals(); return g; };
  const colored = (g, c) => { const col = new THREE.Color(c), a = []; const n = (g.index ? g.toNonIndexed() : g); for (let i = 0; i < n.attributes.position.count; i++) a.push(col.r, col.g, col.b); n.setAttribute('color', new THREE.Float32BufferAttribute(a, 3)); return n; };
  const R = mulberry32(2718);
  // 水仙
  const nParts = [];
  for (let k = 0; k < 6; k++) { const g = new THREE.BoxGeometry(0.014, 0.36, 0.028); g.translate(0, 0.18, 0); g.rotateZ((R() - 0.5) * 0.35); g.rotateY(k / 6 * TAU); g.translate((R() - 0.5) * 0.04, 0, (R() - 0.5) * 0.04); nParts.push(colored(g, 0x4f8a3a)); }
  for (let k = 0; k < 3; k++) {
    const a = k / 3 * TAU + 0.4, cx = Math.cos(a) * 0.035, cz = Math.sin(a) * 0.035, hy = 0.38 + k * 0.03;
    const st = new THREE.CylinderGeometry(0.004, 0.005, hy, 5); st.translate(cx, hy / 2, cz); nParts.push(colored(st, 0x5f9a45));
    for (let pp = 0; pp < 6; pp++) { const pt = new THREE.SphereGeometry(1, 6, 4); pt.scale(0.028, 0.004, 0.014); pt.translate(0.02, 0, 0); pt.rotateY(pp / 6 * TAU); pt.rotateZ(1.2); pt.translate(cx + 0.01, hy, cz); nParts.push(colored(pt, 0xfbfaf2)); }
    const co = new THREE.CylinderGeometry(0.012, 0.008, 0.018, 8); co.rotateZ(Math.PI / 2 - 0.35); co.translate(cx + 0.02, hy, cz); nParts.push(colored(co, 0xf0b528));
  }
  const nGeo = parts(nParts);
  // 红玫瑰：绿叶 + 层瓣花头
  const rParts = [];
  for (let k = 0; k < 14; k++) { const g = new THREE.SphereGeometry(1, 5, 3); g.scale(0.035, 0.005, 0.02); g.rotateY(R() * TAU); g.translate((R() - 0.5) * 0.28, 0.15 + R() * 0.3, (R() - 0.5) * 0.28); rParts.push(colored(g, R() < 0.5 ? 0x2f5a26 : 0x3d6a2e)); }
  for (let k = 0; k < 5; k++) {
    const cx = (R() - 0.5) * 0.22, cz = (R() - 0.5) * 0.22, hy = 0.42 + R() * 0.12;
    const st = new THREE.CylinderGeometry(0.004, 0.005, hy, 5); st.translate(cx, hy / 2, cz); rParts.push(colored(st, 0x3d6a2e));
    for (let l = 0; l < 3; l++) for (let pp = 0; pp < 5; pp++) { const r = 0.012 + l * 0.01, pt = new THREE.SphereGeometry(1, 6, 4); pt.scale(0.018 + l * 0.006, 0.02 - l * 0.004, 0.009); pt.rotateY(pp / 5 * TAU + l * 0.6); pt.translate(Math.cos(pp / 5 * TAU + l) * r, 0, Math.sin(pp / 5 * TAU + l) * r); pt.translate(cx, hy + 0.012 - l * 0.006, cz); rParts.push(colored(pt, l === 0 ? 0x8a0a14 : 0xb3121e)); }
  }
  const rGeo = parts(rParts);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  for (const [kind, geo, sc] of [['narcissus', nGeo, 1.0], ['rose', rGeo, 1.0]]) {
    const L_ = POTS.filter(p => p.kind === kind); if (!L_.length) continue;
    const im = new THREE.InstancedMesh(geo, mat, L_.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3();
    L_.forEach((p, i) => { q.setFromEuler(new THREE.Euler(0, (p.r || R()) * TAU, 0)); m4.compose(v.set(p.x, p.y, p.z), q, new THREE.Vector3(sc, sc * (0.9 + R() * 0.2), sc)); im.setMatrixAt(i, m4); });
    im.castShadow = true; im.receiveShadow = true; scene.add(im);
  }
}
