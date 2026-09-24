// ======================= 17b 水域生态·岛内淡水湖（热带淡水，禁止任何海洋物种） =======================
// 底质按水深分层：湖岸浅水鹅卵石（半埋细沙）→ 中部细沙夹淤泥、沉木与腐叶 → 深处深色淤泥（地表色见 04_ground）
// 水草按水深分布：岸边挺水芦苇、香蒲；浮叶睡莲；沉水苦草、金鱼藻、黑藻、狐尾藻（成片丛生）
// 生物：小龙虾、罗氏沼虾、溪蟹、田螺、河蚌；鲫鱼、罗非鱼
const ecoDepAttr = (g, d) => { g.setAttribute('dep', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(d), 1)); return g; };
// 在淡水湖内按条件随机取点：inside 为离湖岸向内的距离范围，depth 为水深范围
function ecoLakePoint(inside, depth, tries = 60) {
  const lk = L.lake;
  for (let k = 0; k < tries; k++) {
    const a = ECO_R() * TAU, r = Math.sqrt(ECO_R()) * 1.08, x = lk.x + Math.cos(a) * lk.a * r, z = lk.z + Math.sin(a) * lk.b * r;
    const sd = lakeSD(x, z, lk, 0.1), d = lk.level - gh(x, z);
    if (sd >= inside[0] && sd <= inside[1] && d >= depth[0] && d <= depth[1] && Math.hypot(x - FALL.plunge.x, z - FALL.plunge.z) > 3) return { x, z, d, y: gh(x, z) };
  }
  return null;
}
// 扁带状叶（苦草、海草、香蒲叶）：从 (x, y, z) 起向上 h，宽 w，沿 dir 方向逐渐弯曲；aw = 高度比例
function ecoRibbon(x, y, z, h, w, dir, bend, color, segs = 6) {
  const pos = [], cx = Math.cos(dir), cz = Math.sin(dir);
  const pt = (t, s) => { const b = bend * t * t, tw = t * 1.2; return [x + cx * b * h + Math.cos(dir + Math.PI / 2 + tw) * w * s * (1 - 0.7 * t), y + h * t * (1 - 0.25 * bend * t), z + cz * b * h + Math.sin(dir + Math.PI / 2 + tw) * w * s * (1 - 0.7 * t)]; };
  for (let i = 0; i < segs; i++) { const t0 = i / segs, t1 = (i + 1) / segs, a = pt(t0, -0.5), b = pt(t0, 0.5), c = pt(t1, 0.5), d = pt(t1, -0.5); pos.push(...a, ...b, ...c, ...a, ...c, ...d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return ecoPart(g, color, (px, py) => clamp((py - y) / h, 0, 1));
}
// 轮生叶的沉水草（金鱼藻、黑藻、狐尾藻）：一根茎，节上轮生 k 片细叶
function ecoWhorlPlant(x, y, z, h, nodes, k, leafLen, leafW, stemCol, leafCol, tipCol, feather) {
  const parts = [ecoRod(V3(x, y, z), V3(x + ecoRand(-0.05, 0.05), y + h, z + ecoRand(-0.05, 0.05)), 0.004, 0.003, stemCol, (px, py) => clamp((py - y) / h, 0, 1), 3)];
  for (let n = 1; n <= nodes; n++) {
    const t = n / (nodes + 1), ny = y + h * t, col = tipCol ? ecoMix(leafCol, tipCol, (t - 0.6) * 2.5) : new THREE.Color(leafCol);
    for (let j = 0; j < k; j++) {
      const a = j / k * TAU + n * 0.7, ll = leafLen * (1 - 0.35 * t), e = V3(x + Math.cos(a) * ll, ny + ll * 0.35, z + Math.sin(a) * ll);
      parts.push(ecoRod(V3(x, ny, z), e, leafW, leafW * 0.4, col, t, 3));
      if (feather) for (let f = 1; f <= 2; f++) { const q = V3(x + Math.cos(a) * ll * f / 3, ny + ll * 0.12 * f, z + Math.sin(a) * ll * f / 3); parts.push(ecoRod(q, V3(q.x + Math.cos(a + 0.9) * ll * 0.3, q.y + ll * 0.15, q.z + Math.sin(a + 0.9) * ll * 0.3), leafW * 0.6, leafW * 0.3, col, t, 3), ecoRod(q, V3(q.x + Math.cos(a - 0.9) * ll * 0.3, q.y + ll * 0.15, q.z + Math.sin(a - 0.9) * ll * 0.3), leafW * 0.6, leafW * 0.3, col, t, 3)); }
    }
  }
  return parts;
}
// ---------------- 甲壳类几何（头朝 +x，地面 y=0）：aw∈(0,1] 步足、aw∈(1,2] 触角与钳 ----------------
function ecoCrustGeo(o, lo) {
  const parts = [], s = o.len, c1 = o.c1, c2 = o.c2 ?? o.c1, by = o.bodyY ?? s * 0.18;
  // 头胸甲 + 分节腹部（虾类腹部略向下弯）
  const seg = lo ? 4 : 9, ring = lo ? 4 : 7, band = o.band ?? null;
  const body = ecoBody(s, (t) => { const k = t < 0.42 ? 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t / 0.42 * 0.9 + 0.1)) : 1 - (t - 0.42) * 1.25; return [s * (o.h ?? 0.13) * Math.max(0.2, k), s * (o.w ?? 0.14) * Math.max(0.2, k)]; },
    (t, a) => { const c = ecoMix(c1, c2, 0.5 - Math.sin(a) * 0.7); if (band && t > 0.45 && Math.sin(t * 40) > 0.6) c.lerp(new THREE.Color(band), 0.6); return c; }, seg, ring, () => 0);
  body.applyMatrix4(ecoM4(0, by, 0, 0, 0, o.curl ?? -0.06)); parts.push(body);
  // 尾扇
  parts.push(ecoFin([[-s * 0.5, by - s * 0.02, 0], [-s * 0.66, by - s * 0.05, s * 0.1], [-s * 0.7, by - s * 0.05, 0], [-s * 0.66, by - s * 0.05, -s * 0.1]], c1, 0));
  if (lo) return ecoMerge(parts);
  // 步足：四对，左右交替相位
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
    const x0 = s * (0.12 - i * 0.07), a = V3(x0, by - s * 0.04, sd * s * 0.06), k = V3(x0 + s * 0.02, by + s * 0.03, sd * s * 0.2), f = V3(x0 - s * 0.03 * i, 0, sd * s * 0.28);
    const aw = 0.1 + ((i + (sd > 0 ? 0 : 2)) % 4) * 0.25; parts.push(ecoRod(a, k, s * 0.012, s * 0.009, c1, aw, 3), ecoRod(k, f, s * 0.009, s * 0.004, c1, aw, 3));
  }
  // 螯足（钳）
  if (o.claw) for (const sd of [-1, 1]) {
    const cl = o.claw, a = V3(s * 0.22, by, sd * s * 0.06), el = V3(s * (0.22 + cl.arm * 0.5), by + s * 0.05, sd * s * (0.06 + cl.arm * 0.35)), wr = V3(s * (0.22 + cl.arm), by + s * 0.04, sd * s * (0.1 + cl.arm * 0.25));
    parts.push(ecoRod(a, el, s * cl.r, s * cl.r * 0.8, cl.col, 1.05, 4), ecoRod(el, wr, s * cl.r * 0.8, s * cl.r * 0.9, cl.col, 1.1, 4));
    const pal = new THREE.SphereGeometry(1, 6, 4); pal.applyMatrix4(ecoM4(wr.x + s * cl.palm * 0.5, wr.y, wr.z, 0, -sd * 0.3, 0, s * cl.palm * 0.6, s * cl.r * 1.8, s * cl.r * 1.4)); parts.push(ecoPart(pal, cl.col, 1.15));
    const tip = V3(wr.x + s * cl.palm * 1.4, wr.y, wr.z - sd * s * 0.02); parts.push(ecoRod(V3(wr.x + s * cl.palm, wr.y + s * 0.01, wr.z), tip, s * cl.r * 0.9, s * 0.004, cl.col, 1.2, 3), ecoRod(V3(wr.x + s * cl.palm, wr.y - s * 0.012, wr.z), V3(tip.x - s * 0.02, tip.y - s * 0.015, tip.z), s * cl.r * 0.7, s * 0.004, cl.col, 1.2, 3));
  }
  // 触角：两根长须 + 两对短须
  const an = o.antenna ?? 1.2;
  for (const sd of [-1, 1]) {
    const b = V3(s * 0.5, by + s * 0.03, sd * s * 0.03), m = V3(s * (0.5 + an * 0.4), by + s * 0.12, sd * s * (0.08 + an * 0.15)), e = V3(s * (0.4 + an * 0.7), by + s * 0.05, sd * s * (0.15 + an * 0.45));
    parts.push(ecoRod(b, m, s * (o.antR ?? 0.008), s * 0.004, o.antCol ?? c1, 1.4, 3), ecoRod(m, e, s * 0.004, s * 0.002, o.antCol ?? c1, 1.9, 3));
    parts.push(ecoRod(b, V3(s * 0.66, by + s * 0.06, sd * s * 0.07), s * 0.004, s * 0.002, c1, 1.3, 3));
  }
  if (o.rostrum) parts.push(ecoRod(V3(s * 0.45, by + s * 0.05, 0), V3(s * 0.62, by + s * 0.08, 0), s * 0.012, s * 0.003, c1, 0, 3));
  return ecoMerge(parts);
}
// 蟹：横宽的扁圆甲壳，钳在前，步足伸向两侧（横行方向为局部 ±z）
function ecoCrabGeo(o, lo) {
  const s = o.w, parts = [], by = s * 0.22;
  const cara = new THREE.SphereGeometry(1, lo ? 6 : 12, lo ? 4 : 8); cara.applyMatrix4(ecoM4(0, by, 0, 0, 0, 0, s * 0.36, s * 0.16, s * 0.5));
  parts.push(ecoPart(cara, (x, y) => ecoMix(o.c2, o.c1, (y - by + s * 0.1) / (s * 0.25)), 0));
  if (lo) return ecoMerge(parts);
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
    const x0 = s * (0.12 - i * 0.1), a = V3(x0, by, sd * s * 0.4), k = V3(x0 - s * 0.04, by + s * 0.14, sd * s * 0.72), f = V3(x0 - s * 0.1, 0, sd * s * 0.9);
    const aw = 0.1 + ((i + (sd > 0 ? 0 : 2)) % 4) * 0.25; parts.push(ecoRod(a, k, s * 0.035, s * 0.028, o.c1, aw, 4), ecoRod(k, f, s * 0.028, s * 0.01, o.c1, aw, 4));
  }
  for (const sd of [-1, 1]) {
    const cs = o.claw ?? 1, a = V3(s * 0.26, by, sd * s * 0.3), el = V3(s * 0.46, by + s * 0.04, sd * s * 0.42), wr = V3(s * 0.56, by + s * 0.02, sd * s * 0.24);
    parts.push(ecoRod(a, el, s * 0.05 * cs, s * 0.045 * cs, o.cc ?? o.c1, 1.05, 5), ecoRod(el, wr, s * 0.045 * cs, s * 0.06 * cs, o.cc ?? o.c1, 1.1, 5));
    const pal = new THREE.SphereGeometry(1, 7, 5); pal.applyMatrix4(ecoM4(wr.x + s * 0.08, wr.y, wr.z, 0, 0, 0, s * 0.14 * cs, s * 0.08 * cs, s * 0.07 * cs)); parts.push(ecoPart(pal, o.cc ?? o.c1, 1.15));
    parts.push(ecoRod(V3(wr.x + s * 0.18 * cs, wr.y + s * 0.01, wr.z), V3(wr.x + s * 0.3 * cs, wr.y, wr.z - sd * s * 0.06), s * 0.04 * cs, s * 0.008, o.tip ?? 0x1a1a1a, 1.2, 4));
  }
  for (const sd of [-1, 1]) parts.push(ecoRod(V3(s * 0.3, by + s * 0.08, sd * s * 0.08), V3(s * 0.34, by + s * 0.16, sd * s * 0.1), s * 0.02, s * 0.03, 0x1a1410, 1.3, 3));   // 眼柄
  return ecoMerge(parts);
}
// ---------------- 爬行动物通用：位置、朝向、状态机；每帧由物种函数推进 ----------------
class EcoCritters {
  constructor(lod, list, step) { this.lod = lod; this.a = list; this.step = step; ECO.critters.push(this); }
  update(dt, t) { for (const c of this.a) this.step(c, dt, t); }
  draw() { const L_ = this.lod; L_.begin(); for (const c of this.a) L_.put(ecoPose(c.x, c.y, c.z, c.yaw, c.pitch || 0, c.roll || 0, c.s), c.x, c.y, c.z, c.ph, c.col); L_.end(); }
}
// 缓慢爬向目标；到达后停留；返回是否在移动
function ecoCrawl(c, dt, speed, pick, side = false) {
  c.tm -= dt;
  if (c.state === 'idle') { if (c.tm <= 0) { const g = pick(c); if (g) { c.gx = g.x; c.gz = g.z; c.state = 'walk'; c.tm = ecoRand(6, 16); } else c.tm = ecoRand(2, 5); } return false; }
  const dx = c.gx - c.x, dz = c.gz - c.z, d = Math.hypot(dx, dz);
  if (d < 0.05 || c.tm <= 0) { c.state = 'idle'; c.tm = ecoRand(3, 10); return false; }
  const want = Math.atan2(-dz, dx) + (side ? Math.PI / 2 * (c.sideDir || 1) : 0); let da = ((want - c.yaw + Math.PI * 3) % TAU) - Math.PI; c.yaw += clamp(da, -1.5 * dt, 1.5 * dt);
  const k = Math.abs(da) < 0.6 ? speed * dt : 0; c.x += dx / d * k; c.z += dz / d * k; return k > 0;
}
const ecoPlayerNear = (c, r) => { const p = ECO.player; return p && p.inWater && Math.hypot(p.x - c.x, p.z - c.z) < r && Math.abs((p.y ?? c.y) - c.y) < 2.5; };

function buildEcoLake(scene) {
  const lk = L.lake, Z = { center: { x: lk.x, z: lk.z }, radius: 22, meshes: [], lods: [] }, c0 = ECO.critters.length;
  // ---------------- 静态底质与装饰（合并为一个网格） ----------------
  const deco = [], stones = [];
  const pebbleCols = [0x8c8b85, 0x9a948a, 0xa67a4a, 0x8f6a44, 0xd9ceb4, 0xc9bda0, 0x6f6e6a];
  for (let i = 0; i < 420; i++) {
    const p = ecoLakePoint([-0.35, 2.2], [-0.3, 1.0]); if (!p) continue;
    const s = Math.pow(ECO_R(), 1.8) * 0.2 + 0.035, g = new THREE.IcosahedronGeometry(1, 1), P = g.attributes.position;
    const sq = ecoRand(0.45, 0.75), el = ecoRand(0.8, 1.35);
    for (let k = 0; k < P.count; k++) { const x = P.getX(k), y = P.getY(k), z = P.getZ(k), n = 1 + 0.12 * SNoise(x * 2 + i, z * 2 - i); P.setXYZ(k, x * n * el, y * n * sq, z * n); }
    g.computeVertexNormals(); const base = new THREE.Color(pebbleCols[Math.floor(ECO_R() * pebbleCols.length)]).multiplyScalar(ecoRand(0.85, 1.1));
    deco.push(ecoPart(g, (x, y) => base.clone().multiplyScalar(0.88 + 0.12 * Math.sign(y)), 0, ecoM4(p.x, p.y - s * sq * ecoRand(0.25, 0.6), p.z, 0, ECO_R() * TAU, 0, s)));
    stones.push({ x: p.x, z: p.z, y: p.y, s });
  }
  // 沉木：半埋在中部淤泥里，枝上附着少量绿藻（上表面偏绿）
  const logs = [];
  for (let i = 0; i < 6; i++) {
    const p = ecoLakePoint([2.5, 99], [1.1, 2.4]); if (!p) continue;
    const r = ecoRand(0.06, 0.13), len = ecoRand(1.4, 2.8), yaw = ECO_R() * TAU, tilt = ecoRand(-0.08, 0.08);
    const bark = (x, y) => ecoMix(0x3b2b1c, 0x4f6a2a, (y - p.y) / (r * 1.6) * 0.8 - 0.25).multiplyScalar(0.85 + 0.25 * Math.sin(x * 40 + y * 30));
    const g = new THREE.CylinderGeometry(r * 0.85, r, len, 9, 4); deco.push(ecoPart(g, bark, 0, ecoM4(p.x, p.y + r * 0.45, p.z, tilt, yaw, Math.PI / 2)));
    for (let b = 0; b < 3; b++) { const t = ecoRand(-0.4, 0.4) * len, bx = p.x + Math.cos(-yaw) * t, bz = p.z + Math.sin(-yaw) * t, a = yaw + ecoRand(-1, 1) * 1.2 + Math.PI / 2; deco.push(ecoRod(V3(bx, p.y + r, bz), V3(bx + Math.cos(a) * 0.35, p.y + r + ecoRand(0.05, 0.3), bz + Math.sin(a) * 0.35), r * 0.35, r * 0.12, bark, 0, 5)); }
    logs.push(p);
  }
  // 腐烂落叶：集中在沉木周围与中部
  const leafCols = [0x5a4022, 0x74562a, 0x3d2c19, 0x6b5a2e, 0x4a3a20];
  for (let i = 0; i < 260; i++) {
    const near = logs.length && ECO_R() < 0.6 ? logs[Math.floor(ECO_R() * logs.length)] : null;
    const p = near ? { x: near.x + ecoRand(-1.5, 1.5), z: near.z + ecoRand(-1.5, 1.5) } : ecoLakePoint([1.5, 99], [0.8, 2.6]); if (!p || lakeSD(p.x, p.z, lk, 0.1) < 1) continue;
    const g = new THREE.PlaneGeometry(ecoRand(0.05, 0.1), ecoRand(0.03, 0.05)); deco.push(ecoPart(g, leafCols[Math.floor(ECO_R() * leafCols.length)], 0, ecoM4(p.x, gh(p.x, p.z) + 0.012, p.z, -Math.PI / 2 + ecoRand(-0.2, 0.2), ECO_R() * TAU, 0)));
  }
  // 田螺：附在卵石上或半埋于泥中（螺旋纹锥形壳）
  for (let i = 0; i < 38; i++) {
    const st = stones.length && ECO_R() < 0.6 ? stones[Math.floor(ECO_R() * stones.length)] : null; const p = st ? { x: st.x + ecoRand(-0.1, 0.1), z: st.z + ecoRand(-0.1, 0.1), y: st.y + st.s * 0.35 } : ecoLakePoint([0.5, 99], [0.3, 2.2]); if (!p) continue;
    const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new THREE.Vector2(0.018 * Math.sin(Math.PI * Math.min(1, t * 1.1)) * (1 - 0.6 * t) + 0.002, t * 0.035)); }
    const g = new THREE.LatheGeometry(pts, 8); deco.push(ecoPart(g, (x, y) => ecoMix(0x4b4a32, 0x2f2c1e, Math.sin(y * 520) * 0.5 + 0.5), 0, ecoM4(p.x, p.y ?? gh(p.x, p.z), p.z, ecoRand(0.6, 1.2), ECO_R() * TAU, 0)));
  }
  // 河蚌：两片椭圆壳，斜插半埋于泥中
  for (let i = 0; i < 26; i++) {
    const p = ecoLakePoint([1.2, 99], [0.6, 2.9]); if (!p) continue;
    for (const sd of [-1, 1]) { const g = new THREE.SphereGeometry(1, 8, 5, 0, TAU, 0, Math.PI / 2); deco.push(ecoPart(g, (x, y) => ecoMix(0x2f3222, 0x5a5236, y * 30), 0, ecoM4(p.x, p.y + 0.01, p.z, sd * Math.PI / 2 + ecoRand(-0.3, 0.3) + Math.PI / 2, ECO_R() * TAU, ecoRand(0.3, 0.7), 0.075, 0.018, 0.04))); }
  }
  const decoMesh = new THREE.Mesh(ecoMerge(deco), ecoMat('static', { rough: 0.85 })); decoMesh.receiveShadow = true; scene.add(decoMesh); Z.meshes.push(decoMesh);

  // ---------------- 水草（合并为一个摆动网格；dep = 基部水深，摆幅随水深递减） ----------------
  const plants = [], weedSpots = [];
  const add = (list, d) => { for (const g of list) plants.push(ecoDepAttr(g, Math.max(0, d))); };
  // 岸边挺水：芦苇（细茎 + 披针叶 + 顶端紫褐色圆锥花序）与香蒲（扁带叶 + 棕色蜡烛状花穗），成丛
  for (let c = 0; c < 16; c++) {
    const p = ecoLakePoint([-0.4, 0.9], [-0.4, 0.45]); if (!p) continue;
    const reed = ECO_R() < 0.55, n = reed ? 9 : 7;
    for (let k = 0; k < n; k++) {
      const x = p.x + ecoRand(-0.35, 0.35), z = p.z + ecoRand(-0.35, 0.35), y = gh(x, z), h = reed ? ecoRand(1.4, 2.3) : ecoRand(1.1, 1.7);
      if (reed) {
        const top = V3(x + ecoRand(-0.08, 0.08), y + h, z + ecoRand(-0.08, 0.08)), awf = (px, py) => clamp((py - y) / h, 0, 1);
        const list = [ecoRod(V3(x, y, z), top, 0.007, 0.004, 0x8a9a52, awf, 3)];
        for (let l = 0; l < 3; l++) list.push(ecoRibbon(x, y + h * (0.25 + l * 0.2), z, h * 0.35, 0.018, ECO_R() * TAU, 0.9, 0x6f8a3a, 3));
        for (let f = 0; f < 5; f++) list.push(ecoRod(top, V3(top.x + ecoRand(-0.08, 0.08), top.y + ecoRand(0.12, 0.22), top.z + ecoRand(-0.08, 0.08)), 0.006, 0.001, 0x7a5a5a, 1, 3));
        add(list, p.d);
      } else {
        const list = []; for (let l = 0; l < 4; l++) list.push(ecoRibbon(x, y, z, h * ecoRand(0.8, 1.05), 0.03, ECO_R() * TAU, 0.35, 0x5f7a36, 4));
        if (k % 2 === 0) { list.push(ecoRod(V3(x, y, z), V3(x, y + h * 1.05, z), 0.006, 0.005, 0x6f7a3a, (px, py) => clamp((py - y) / h, 0, 1), 3)); const sp = new THREE.CylinderGeometry(0.018, 0.018, 0.16, 7); list.push(ecoPart(sp, 0x5a3a1e, 0.95, ecoM4(x, y + h * 0.9, z))); }
        add(list, p.d);
      }
    }
  }
  // 浮叶：睡莲（叶浮在水面带缺口，背面偏红；茎垂到湖底；少量粉白色花）
  for (let i = 0; i < 46; i++) {
    const p = ecoLakePoint([0.8, 99], [0.45, 1.9]); if (!p) continue;
    const r = ecoRand(0.12, 0.26), a0 = ECO_R() * TAU, y = lk.level + 0.012;
    const pad = new THREE.CircleGeometry(r, 14, a0, TAU - 0.35); add([ecoPart(pad, (x, yy, z) => ecoMix(0x2f5a22, 0x4f7a32, 0.5 + 0.5 * Math.sin((x + z) * 30)), 0.12, ecoM4(p.x, y, p.z, -Math.PI / 2, 0, 0))], 0);
    add([ecoRod(V3(p.x + ecoRand(-0.1, 0.1), p.y, p.z + ecoRand(-0.1, 0.1)), V3(p.x, y - 0.01, p.z), 0.004, 0.004, 0x5a6a3a, (px, py) => clamp((py - p.y) / (y - p.y) * 0.4, 0, 0.4), 3)], p.d);
    if (i % 5 === 0) { const fl = []; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, g = new THREE.ConeGeometry(0.02, 0.07, 4); fl.push(ecoPart(g, k % 2 ? 0xf2c4d0 : 0xf7eef0, 0.1, ecoM4(p.x + Math.cos(a) * 0.035, y + 0.035, p.z + Math.sin(a) * 0.035, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9))); } const c = new THREE.SphereGeometry(0.018, 6, 4); fl.push(ecoPart(c, 0xf2c23a, 0.1, ecoM4(p.x, y + 0.03, p.z))); add(fl, 0); }
  }
  // 沉水：苦草（丝带状长叶）、金鱼藻（细密轮生羽状叶）、黑藻（轮生小披针叶）、狐尾藻（羽状叶，近水面叶尖泛红）——各成斑块
  const weedKinds = ['vall', 'vall', 'horn', 'hydr', 'myri', 'vall', 'horn', 'myri', 'hydr', 'vall'];
  for (let c = 0; c < weedKinds.length; c++) {
    const kind = weedKinds[c], p = ecoLakePoint([1.2, 99], kind === 'vall' ? [0.5, 2.4] : [0.6, 2.2]); if (!p) continue;
    const rad = ecoRand(0.6, 1.5), cnt = kind === 'vall' ? 22 : 16; weedSpots.push({ x: p.x, y: p.y + Math.min(p.d, 1) * 0.5, z: p.z, r: rad, kind });
    for (let k = 0; k < cnt; k++) {
      const a = ECO_R() * TAU, rr = Math.sqrt(ECO_R()) * rad, x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr, y = gh(x, z), d = lk.level - y; if (d < 0.35 || lakeSD(x, z, lk, 0.1) < 0.6) continue;
      const hmax = Math.max(0.2, d - 0.08);
      if (kind === 'vall') { const list = []; for (let l = 0; l < 6; l++) list.push(ecoRibbon(x, y, z, Math.min(hmax, ecoRand(0.5, 1.3)), 0.012, ECO_R() * TAU, 0.35, ecoMix(0x4f8a2a, 0x7aa84a, ECO_R()), 6)); add(list, d); }
      else if (kind === 'horn') add(ecoWhorlPlant(x, y, z, Math.min(hmax, ecoRand(0.3, 0.8)), 7, 8, 0.05, 0.0025, 0x2f4a1e, 0x2a4f1c, null, true), d);
      else if (kind === 'hydr') add(ecoWhorlPlant(x, y, z, Math.min(hmax, ecoRand(0.3, 0.7)), 8, 5, 0.022, 0.004, 0x3a5a22, 0x4f8a2e, null, false), d);
      else add(ecoWhorlPlant(x, y, z, Math.min(hmax, ecoRand(0.35, 0.9)), 7, 5, 0.045, 0.0022, 0x4a5a26, 0x4a7a2e, 0x8a3a2a, true), d);
    }
  }
  const plantMat = ecoMat('sway', { freq: 1.1, amp: 0.1, depthFade: 0.6, rough: 0.7, side: THREE.DoubleSide });
  const plantMesh = new THREE.Mesh(ecoMerge(plants), plantMat); plantMesh.frustumCulled = true; scene.add(plantMesh); Z.meshes.push(plantMesh);

  // ---------------- 生物 ----------------
  const inLake = (x, z, d0 = 0.15) => lakeSD(x, z, lk, 0.1) > 0.25 && lk.level - gh(x, z) > d0;
  // 小龙虾（克氏原螯虾）：暗红色，多在石缝与水草根部；受惊时尾部猛弹向后倒退
  const cray = ecoCrustGeo.bind(null, { len: 0.11, c1: 0x6a1a12, c2: 0x9a2a18, claw: { arm: 0.28, r: 0.035, palm: 0.16, col: 0x7a1c12 }, antenna: 1.3, h: 0.12, w: 0.14, band: 0x3a0e08 });
  const crayLod = new EcoLod(scene, [cray(false), cray(true)], ecoMat('crawl', { freq: 9, amp: 0.004, rough: 0.5 }), 14, 10, 45);
  const homes = stones.filter(s => s.s > 0.09).concat(weedSpots.map(w => ({ x: w.x, z: w.z, y: w.y, s: 0.2 })));
  const crays = []; for (let i = 0; i < 80 && crays.length < 14; i++) { const h = homes[Math.floor(ECO_R() * homes.length)] || { x: lk.x, z: lk.z }; const x = h.x + ecoRand(-0.2, 0.2), z = h.z + ecoRand(-0.2, 0.2); if (!inLake(x, z)) continue; crays.push({ x, z, y: gh(x, z), yaw: ECO_R() * TAU, s: ecoRand(0.8, 1.2), ph: ECO_R(), state: 'idle', tm: ecoRand(0, 8), home: h, flee: 0 }); }
  new EcoCritters(crayLod, crays, (c, dt) => {
    if (c.flee > 0) { c.flee -= dt; const sp = 2.4 * c.flee / 0.35; c.x -= Math.cos(c.yaw) * sp * dt; c.z += Math.sin(c.yaw) * sp * dt; c.pitch = 0.5 * Math.sin(Math.PI * c.flee / 0.35); if (!inLake(c.x, c.z)) { c.x += Math.cos(c.yaw) * sp * dt; c.z -= Math.sin(c.yaw) * sp * dt; } c.y = gh(c.x, c.z) + 0.02 * Math.sin(Math.PI * c.flee / 0.35); if (c.flee <= 0) { c.pitch = 0; c.state = 'idle'; c.tm = ecoRand(3, 8); } return; }
    if (ecoPlayerNear(c, 1.3) || (c.state === 'walk' && ECO_R() < dt * 0.02)) { c.flee = 0.35; return; }
    ecoCrawl(c, dt, 0.05, (cc) => { const x = cc.home.x + ecoRand(-0.5, 0.5), z = cc.home.z + ecoRand(-0.5, 0.5); return inLake(x, z) ? { x, z } : null; }); c.y = gh(c.x, c.z);
  });
  // 罗氏沼虾：青蓝色半透明；雄虾有细长的蓝色大钳（雌虾钳短）
  const prawn = (male, lo) => ecoCrustGeo({ len: 0.17, c1: 0x5f8aa8, c2: 0x9ac0d8, claw: male ? { arm: 0.9, r: 0.018, palm: 0.28, col: 0x1f4fd0 } : { arm: 0.3, r: 0.014, palm: 0.1, col: 0x5f8aa8 }, antenna: 1.8, h: 0.1, w: 0.09, rostrum: true, curl: -0.12, antCol: 0x7a9ab8 }, lo);
  const pMat = ecoMat('crawl', { freq: 8, amp: 0.003, rough: 0.25, metal: 0.1, opacity: 0.82 });
  const prawns = [];
  for (const male of [true, false]) {
    const lod = new EcoLod(scene, [prawn(male, false), prawn(male, true)], pMat, 5, 10, 45), list = [];
    for (let i = 0; i < 5; i++) { const p = ecoLakePoint([1, 99], [0.6, 2.8]); if (!p) continue; list.push({ x: p.x, z: p.z, y: p.y, yaw: ECO_R() * TAU, s: male ? ecoRand(1, 1.2) : ecoRand(0.8, 0.95), ph: ECO_R(), state: 'idle', tm: ecoRand(0, 6), hop: 0 }); }
    new EcoCritters(lod, list, (c, dt) => {
      // 贴底爬行，偶尔用腹肢短距离游动（离底 0.1～0.3 m）
      if (c.hop > 0) { c.hop -= dt; c.x += Math.cos(c.yaw) * 0.25 * dt; c.z -= Math.sin(c.yaw) * 0.25 * dt; if (!inLake(c.x, c.z, 0.5)) c.yaw += Math.PI; c.y = gh(c.x, c.z) + 0.2 * Math.sin(Math.PI * clamp(c.hop / 2.2, 0, 1)); return; }
      if (c.state === 'walk' && ECO_R() < dt * 0.05) { c.hop = 2.2; return; }
      if (ecoPlayerNear(c, 1.2) && c.hop <= 0) { c.yaw += Math.PI; c.hop = 1.2; return; }
      ecoCrawl(c, dt, 0.04, (cc) => { const x = cc.x + ecoRand(-0.8, 0.8), z = cc.z + ecoRand(-0.8, 0.8); return inLake(x, z, 0.5) ? { x, z } : null; }); c.y = gh(c.x, c.z);
    });
    prawns.push(...list);
  }
  // 溪蟹：褐色，躲在鹅卵石下（只露出前半身），偶尔横向爬到另一块石头
  const crab = (lo) => ecoCrabGeo({ w: 0.065, c1: 0x5a3a22, c2: 0x7a5232, cc: 0x6a4428, tip: 0x2a1a10 }, lo);
  const crabLod = new EcoLod(scene, [crab(false), crab(true)], ecoMat('crawl', { freq: 12, amp: 0.004, rough: 0.55 }), 8, 8, 40);
  const bigStones = stones.filter(s => s.s > 0.1 && inLake(s.x, s.z, 0.2)), crabs = [];   // 只用水下的大卵石（岸边水线以上的卵石不能当溪蟹的窝）
  for (let i = 0; i < 8 && bigStones.length; i++) { const st = bigStones[Math.floor(ECO_R() * bigStones.length)]; crabs.push({ x: st.x, z: st.z, y: st.y, yaw: ECO_R() * TAU, s: ecoRand(0.8, 1.2), ph: ECO_R(), state: 'idle', tm: ecoRand(4, 20), st, sideDir: 1 }); }
  new EcoCritters(crabLod, crabs, (c, dt) => {
    const moving = ecoCrawl(c, dt, 0.09, (cc) => { const st = bigStones[Math.floor(ECO_R() * bigStones.length)]; if (Math.hypot(st.x - cc.x, st.z - cc.z) > 2.5) return null; cc.st = st; cc.sideDir = ECO_R() < 0.5 ? 1 : -1; return { x: st.x, z: st.z }; }, true);
    // 横行：身体朝向与前进方向垂直；停在石下时身体压低一半
    c.y = gh(c.x, c.z) - (moving ? 0 : 0.012); if (ecoPlayerNear(c, 1.0) && c.state === 'idle') { c.state = 'walk'; c.tm = 2; const a = ECO_R() * TAU; c.gx = c.x + Math.cos(a) * 0.6; c.gz = c.z + Math.sin(a) * 0.6; if (!inLake(c.gx, c.gz)) { c.gx = c.x; c.gz = c.z; } }
  });
  // 鱼：鲫鱼（银灰偏橄榄绿）在水草丛间游动；罗非鱼（灰橄榄色带暗横纹）成小群巡游
  const crucian = { len: 0.17, h: 0.07, w: 0.03, c1: 0x5f6a4a, c2: 0xc9c6a6, fin: 0x6a6a52, tail: 'fork', dorsal: 0.3, pat: (t, a, c) => { if (Math.sin(a) > -0.2) c.lerp(new THREE.Color(0x8a7a4a), 0.25); } };
  const tilapia = { len: 0.22, h: 0.085, w: 0.035, c1: 0x5a6250, c2: 0xb9b8a0, fin: 0x5a5a4a, tail: 'round', dorsal: 0.45, pat: (t, a, c) => { if (Math.sin(t * 18) > 0.75 && Math.sin(a) > -0.4) c.multiplyScalar(0.72); } };
  const predL = () => { const p = ECO.player; return p && p.under ? [{ x: p.x, y: p.y, z: p.z, r: 2.2 }] : []; };
  const fishAnchors = weedSpots.map(w => ({ x: w.x, y: Math.min(w.y + 0.3, lk.level - 0.5), z: w.z }));
  const f1 = new EcoFlock({ zone: 'lake', n: 12, lod: ecoFishLod(scene, crucian, 12, 12, 45), mode: fishAnchors.length ? 'reef' : 'school', anchors: fishAnchors.length ? fishAnchors : null, home: { x: lk.x, y: lk.level - 1, z: lk.z }, range: 9, rangeZ: 0.6, spawn: 0.8, speed: 0.35, maxSpeed: 1.2, per: 0.5, flee: 2.2, minDepth: 0.5, floorGap: 0.15, ceilGap: 0.25, predators: predL, size: 1 });
  const f2 = new EcoFlock({ zone: 'lake', n: 12, lod: ecoFishLod(scene, tilapia, 12, 12, 45), mode: 'school', home: { x: lk.x - 2, y: lk.level - 1.2, z: lk.z }, range: 9, rangeZ: 0.6, spawn: 1.2, speed: 0.45, maxSpeed: 1.4, per: 0.6, minDepth: 0.7, floorGap: 0.2, ceilGap: 0.3, predators: predL, size: 1, band: 0.45 });
  Z.flocks = [f1, f2]; Z.critters = ECO.critters.slice(c0);
  ECO.zones.lake = Z;
  ECO.lakeInfo = { stones: stones.length, logs: logs.length, crays: crays.length, prawns: prawns.length, crabs: crabs.length, weeds: weedSpots.length, weedSpots, logPts: logs, crabHomes: bigStones };
}
