// ======================= 17a 水域生态·核心：分区、部件几何、动画材质、分级实例、群集算法 =======================
// 三个水域：岛内淡水湖（lake）、水闸内浅海潟湖（lagoon）、闸外环岛外海（ocean）。全部为热带物种，淡水与海水物种严格分开。
// 渲染约定：静态底质与装饰按水域合并成少数网格；水草海藻合并后用顶点着色器摆动（幅度随水深递减）；
// 会动的生物每个物种一个实例化网格，按到相机距离分级（近处精细、远处简模、更远隐藏）；鱼群用群集算法（分离、对齐、聚合、躲避捕食者）。
const ECO = { zones: {}, flocks: [], critters: [], whales: [], lods: [], swayMats: [], rays: null, ink: null, t: 0, cam: null, player: null };
// 生态随机数：每个水域建造前用各自固定的种子重置（ecoSeed），改动一个水域的内容不会让另外两个水域的布置整体错位
let ECO_RNG = mulberry32(20260924);
const ECO_R = () => ECO_RNG();
function ecoSeed(n) { ECO_RNG = mulberry32(n); }
const ecoRand = (a, b) => a + (b - a) * ECO_R();
// 水域判定：淡水湖含湖岸 0.4 m（挺水植物）；潟湖为水闸以北的泊港与港口沙滩前的海水；其余海水（含闸外峡谷）为外海
function ecoZone(x, z) {
  if (lakeSD(x, z, L.lake, 0.1) > -0.4) return 'lake';
  if (gh(x, z) > 0.05) return null;
  return z < L.gateZ && z > 18 && Math.abs(x) < 75 ? 'lagoon' : 'ocean';
}
const ecoLevel = (zone) => zone === 'lake' ? L.lake.level : 0;
// 按指定水域判定（每帧大量调用，不做完整分区判断）
function ecoIn(zone, x, z) {
  if (zone === 'lake') return lakeSD(x, z, L.lake, 0.1) > 0.3;
  const lag = z < L.gateZ && z > 18 && Math.abs(x) < 75;
  return gh(x, z) < -0.3 && (zone === 'lagoon' ? lag : !lag);
}
const ecoDepth = (zone, x, z) => ecoLevel(zone) - gh(x, z);

// ---------------- 部件几何：统一转成非索引、带顶点色与动画权重 aw（含义由材质模式决定） ----------------
const ecoM4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));
// g 必须是本次新建的几何体（不能传共享几何体，见铁律 2）；color 可为颜色值或 (x, y, z) => Color；aw 可为数值或 (x, y, z) => 数值
function ecoPart(g, color, aw = 0, m = null) {
  g = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  if (m) g.applyMatrix4(m);
  const P = g.attributes.position, n = P.count, ca = new Float32Array(n * 3), wa = new Float32Array(n), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (typeof color === 'function') c.copy(color(x, y, z)); else c.set(color);
    ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; wa[i] = typeof aw === 'function' ? aw(x, y, z) : aw;
  }
  g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); g.setAttribute('aw', new THREE.BufferAttribute(wa, 1));
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}
function ecoMerge(parts) { const g = THREE.BufferGeometryUtils.mergeGeometries(parts, false); g.computeBoundingSphere(); return g; }
// 沿 +x 的旋转体（头在 +x）：长 len，prof(t) → [半高, 半宽]（t：0 头 → 1 尾），col(t, a) → Color（a 为截面角，sin a > 0 为背侧）
// aw 默认 = t（到头部的相对距离，用于摆尾）；seg/ring 决定精细程度（分级模型用）
function ecoBody(len, prof, col, seg = 12, ring = 8, aw = (t) => t) {
  const pos = [], cc = [], ww = [], idx = [], c = new THREE.Color();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, x = len / 2 - t * len, [h, w] = prof(t);
    for (let k = 0; k < ring; k++) { const a = k / ring * TAU; pos.push(x, Math.sin(a) * h, Math.cos(a) * w); c.copy(col(t, a)); cc.push(c.r, c.g, c.b); ww.push(aw(t)); }
    if (i < seg) for (let k = 0; k < ring; k++) { const a = i * ring + k, b = a + ring, a1 = i * ring + (k + 1) % ring, b1 = a1 + ring; idx.push(a, b, a1, a1, b, b1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const out = g.toNonIndexed(); g.dispose();
  const n = out.attributes.position.count, ca = new Float32Array(n * 3), wa = new Float32Array(n);
  // toNonIndexed 之后按顶点位置重新取色与权重（按 x 反推 t，按 y/z 反推截面角）
  const P = out.attributes.position;
  for (let i = 0; i < n; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), t = clamp((len / 2 - x) / len, 0, 1), [h, w] = prof(t), a = Math.atan2(h > 1e-5 ? y / h : 0, w > 1e-5 ? z / w : 1); c.copy(col(t, a)); ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; wa[i] = aw(t); }
  out.setAttribute('color', new THREE.BufferAttribute(ca, 3)); out.setAttribute('aw', new THREE.BufferAttribute(wa, 1));
  return out;
}
// 平面鳍（三角扇），pts 为 [x, y, z] 列表，首点为扇心
function ecoFin(pts, color, aw = 0) {
  const pos = []; for (let i = 1; i < pts.length - 1; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1], ...pts[0], ...pts[i + 1], ...pts[i]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return ecoPart(g, color, aw);
}
// 细杆（腿、触角、茎）：从 a 到 b 的锥台
function ecoRod(a, b, r0, r1, color, aw = 0, seg = 4) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length(), g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, true);
  g.translate(0, len / 2, 0); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, 1, 1)));
  return ecoPart(g, color, aw);
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const ecoMix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(t, 0, 1));

// ---------------- 动画材质 ----------------
// swim：沿身体的横向摆尾（aw = 到头部距离）；fluke：鲸类尾叶上下摆动；crawl：aw∈(0,1] 为步足（交替起落）、aw∈(1,2] 为触角/附肢（摆动）、aw∈(2,3] 为章鱼腕（波动）；
// sway：水草海藻（aw = 高度比例，dep 属性为基部水深，幅度随水深递减）；static：不动
function ecoMat(mode, o = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? 0.65, metalness: o.metal ?? 0.05, side: o.side ?? THREE.FrontSide, transparent: o.opacity !== undefined, opacity: o.opacity ?? 1, depthWrite: o.opacity === undefined });
  if (mode === 'static') return m;
  const uT = { value: 0 }; TIME_U.push(uT);
  const f = (o.freq ?? 6).toFixed(2), amp = (o.amp ?? 0.12).toFixed(3);
  const body = {
    swim: `float sw = sin(uTime * ${f} * (0.8 + 0.4 * iPh) + iPh * 6.283 - aw * 3.4) * ${amp} * aw * aw; transformed.z += sw;`,
    fluke: `float sw = sin(uTime * ${f} + iPh * 6.283 - aw * 2.6) * ${amp} * aw * aw; transformed.y += sw;`,
    crawl: `if (aw > 0.0 && aw <= 1.0) transformed.y += max(0.0, sin(uTime * ${f} + iPh * 6.283 + aw * 12.566)) * ${amp};
            else if (aw > 1.0 && aw <= 2.0) transformed.z += sin(uTime * 1.7 + iPh * 6.283 + (aw - 1.0) * 5.0) * ${amp} * 2.0 * (aw - 1.0);
            else if (aw > 2.0) { float k = aw - 2.0; transformed.y += sin(uTime * 2.2 + iPh * 6.283 + k * 7.0) * ${amp} * 1.6 * k; transformed.xz *= 1.0 + 0.12 * sin(uTime * 1.4 + k * 5.0 + iPh * 3.0) * k; }`,
    sway: `vec3 wp0 = transformed; float dfade = 1.0 / (1.0 + dep * ${(o.depthFade ?? 0.45).toFixed(2)});
           float ph = uTime * ${f} + wp0.x * 0.35 + wp0.z * 0.27;
           float s = aw * aw * ${amp} * dfade; transformed.x += sin(ph) * s + sin(ph * 2.3 + 1.7) * s * 0.35; transformed.z += cos(ph * 0.8 + 0.6) * s * 0.7;`,
  }[mode];
  const decl = mode === 'sway' ? 'attribute float aw; attribute float dep; uniform float uTime;' : 'attribute float aw; attribute float iPh; uniform float uTime;';
  m.onBeforeCompile = (sh) => { sh.uniforms.uTime = uT; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + decl).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + body); };
  m.customProgramCacheKey = () => 'eco-' + mode + f + amp + (o.depthFade ?? '');
  return m;
}

// ---------------- 分级实例：每个物种两级模型（精细 / 简模），按到相机距离每帧重新分配，超出远距离隐藏 ----------------
class EcoLod {
  constructor(scene, geos, mat, n, dHi, dFar) {
    this.dHi = dHi; this.dFar = dFar; this.ims = []; this.ph = []; this.cnt = [0, 0];
    for (const g of geos) {
      const ph = new THREE.InstancedBufferAttribute(new Float32Array(n), 1); ph.setUsage(THREE.DynamicDrawUsage); g.setAttribute('iPh', ph);
      const im = new THREE.InstancedMesh(g, mat, n); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.count = 0; im.visible = false; im.castShadow = false;
      scene.add(im); this.ims.push(im); this.ph.push(ph);
    }
    this.colored = false; ECO.lods.push(this);
  }
  color(i, k, c) { const im = this.ims[k]; if (!im.instanceColor) { im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(im.instanceMatrix.count * 3).fill(1), 3); im.instanceColor.setUsage(THREE.DynamicDrawUsage); } im.instanceColor.setXYZ(i, c.r, c.g, c.b); }
  begin() { this.cnt[0] = 0; this.cnt[1] = 0; }
  // 返回写入的级别（-1 表示超出距离未绘制）
  put(m4, x, y, z, ph, col) {
    const c = ECO.cam; const d = c ? Math.hypot(x - c.x, y - c.y, z - c.z) : 0; if (d > this.dFar) return -1;
    const k = d < this.dHi || this.ims.length < 2 ? 0 : 1, i = this.cnt[k]; if (i >= this.ims[k].instanceMatrix.count) return -1;
    this.ims[k].setMatrixAt(i, m4); this.ph[k].setX(i, ph); if (col) this.color(i, k, col); this.cnt[k]++; return k;
  }
  end() { for (let k = 0; k < this.ims.length; k++) { const im = this.ims[k]; im.count = this.cnt[k]; im.visible = this.cnt[k] > 0; if (im.visible) { im.instanceMatrix.needsUpdate = true; this.ph[k].needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } } }
  hide() { for (const im of this.ims) { im.count = 0; im.visible = false; } }
}
const ecoTmp = { m4: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, 'YZX'), v: new THREE.Vector3(), s: new THREE.Vector3() };
// 由位置、偏航（绕 y，0 朝 +x）、俯仰、横滚、缩放组成实例矩阵
function ecoPose(x, y, z, yaw, pitch = 0, roll = 0, sx = 1, sy = sx, sz = sx) { const T = ecoTmp; T.e.set(roll, yaw, pitch); T.q.setFromEuler(T.e); return T.m4.compose(T.v.set(x, y, z), T.q, T.s.set(sx, sy, sz)); }

// ---------------- 群集算法（Boids）：分离、对齐、聚合 + 目标行为 + 躲避捕食者 ----------------
// mode：school 巡游、reef 悬停在锚点（珊瑚/水草）附近、tornado 绕竖轴旋转的鱼柱、wall 同步转向的鱼墙、ball 饵球
class EcoFlock {
  constructor(o) {
    Object.assign(this, { sep: 1.4, ali: 0.9, coh: 0.6, per: 1.2, speed: 1, maxSpeed: 2, turn: 3, flee: 5, fleeK: 6, size: 1, anchors: null, predators: () => [], hide: 0 }, o);
    const n = this.n; this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.ph = new Float32Array(n); this.sc = new Float32Array(n);
    this.goal = { x: this.home.x, y: this.home.y, z: this.home.z }; this.gt = 0; this.head = ECO_R() * TAU; this.headT = 6; this.scatter = 0;
    for (let i = 0; i < n; i++) {
      const a = this.anchors ? this.anchors[i % this.anchors.length] : this.home;
      this.p[i * 3] = a.x + ecoRand(-1, 1) * this.spawn; this.p[i * 3 + 1] = a.y + ecoRand(-0.5, 0.5) * this.spawn * 0.5; this.p[i * 3 + 2] = a.z + ecoRand(-1, 1) * this.spawn;
      const hd = ECO_R() * TAU; this.v[i * 3] = Math.cos(hd) * this.speed; this.v[i * 3 + 2] = Math.sin(hd) * this.speed;
      this.ph[i] = ECO_R(); this.sc[i] = this.size * (0.85 + 0.3 * ECO_R());
    }
    ecoFlockInit(this); ECO.flocks.push(this);
  }
  near(cam, extra = 0) { return Math.hypot(this.home.x - cam.x, this.home.z - cam.z) < this.lod.dFar + this.range + extra; }
  update(dt, t) {
    const n = this.n, P = this.p, V = this.v, per = this.per, per2 = per * per, cell = per, grid = new Map();
    for (let i = 0; i < n; i++) { const k = Math.floor(P[i * 3] / cell) * 73856093 ^ Math.floor(P[i * 3 + 1] / cell) * 19349663 ^ Math.floor(P[i * 3 + 2] / cell) * 83492791; let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i); }
    // 巡游目标：到达或超时后在活动范围内换一个（固定种子随机数）
    this.gt -= dt; const gd = Math.hypot(this.goal.x - this.cx, this.goal.z - this.cz);
    if (this.mode === 'school' && (this.gt <= 0 || gd < 1)) { for (let k = 0; k < 30; k++) { const x = this.home.x + ecoRand(-1, 1) * this.range, z = this.home.z + ecoRand(-1, 1) * this.range * (this.rangeZ ?? 1); if (this.ok(x, z)) { this.goal.x = x; this.goal.z = z; this.goal.y = this.levelY(x, z); break; } } this.gt = ecoRand(6, 14); }
    if (this.mode === 'wall') { this.headT -= dt; if (this.headT <= 0) { this.head += ecoRand(-1, 1) * 1.6; this.headT = ecoRand(5, 11); } }
    const preds = this.predators(); this.scatter = Math.max(0, this.scatter - dt);
    let sx = 0, sy = 0, sz = 0;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3, px = P[i3], py = P[i3 + 1], pz = P[i3 + 2];
      let ax = 0, ay = 0, az = 0, cxs = 0, cys = 0, czs = 0, vx = 0, vy = 0, vz = 0, cnt = 0;
      const gx = Math.floor(px / cell), gy = Math.floor(py / cell), gz = Math.floor(pz / cell);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const l = grid.get((gx + dx) * 73856093 ^ (gy + dy) * 19349663 ^ (gz + dz) * 83492791); if (!l) continue;
        for (let m = 0; m < l.length && cnt < 10; m++) { const j = l[m]; if (j === i) continue; const j3 = j * 3, ex = px - P[j3], ey = py - P[j3 + 1], ez = pz - P[j3 + 2], d2 = ex * ex + ey * ey + ez * ez; if (d2 > per2 || d2 < 1e-8) continue;
          cnt++; const inv = 1 / d2; ax += ex * inv * this.sep * 0.25; ay += ey * inv * this.sep * 0.25; az += ez * inv * this.sep * 0.25; cxs += P[j3]; cys += P[j3 + 1]; czs += P[j3 + 2]; vx += V[j3]; vy += V[j3 + 1]; vz += V[j3 + 2]; }
      }
      if (cnt) { ax += (cxs / cnt - px) * this.coh + (vx / cnt - V[i3]) * this.ali; ay += (cys / cnt - py) * this.coh + (vy / cnt - V[i3 + 1]) * this.ali; az += (czs / cnt - pz) * this.coh + (vz / cnt - V[i3 + 2]) * this.ali; }
      // 目标行为
      const hx = this.home.x, hy = this.home.y, hz = this.home.z;
      if (this.mode === 'school') { const ex = this.goal.x - px, ey = this.goal.y - py, ez = this.goal.z - pz, el = Math.hypot(ex, ez) || 1; ax += ex / el * this.speed * 0.8; az += ez / el * this.speed * 0.8; ay += ey * 0.6; }
      else if (this.mode === 'reef') { const a = this.anchors[i % this.anchors.length], ex = a.x - px, ey = a.y - py, ez = a.z - pz, el = Math.hypot(ex, ey, ez); ax += ex * 0.8; ay += ey * 1.2; az += ez * 0.8; if (el < this.spawn) { ax += -ez * 0.6; az += ex * 0.6; } }
      else if (this.mode === 'tornado') { const rx = px - hx, rz = pz - hz, r = Math.hypot(rx, rz) || 1, hgt = clamp((py - (hy - this.height / 2)) / this.height, 0, 1), R0 = this.radius * (0.55 + 0.6 * Math.sin(Math.PI * hgt)); ax += (-rz / r) * this.speed * 1.2 - (r - R0) * rx / r * 1.4; az += (rx / r) * this.speed * 1.2 - (r - R0) * rz / r * 1.4; ay += (hy - py) * 0.08 + Math.sin(t * 0.3 + this.ph[i] * 6.3) * 0.25; }
      else if (this.mode === 'wall') { const lag = (px - hx) * 0.06 + (pz - hz) * 0.04, hd = this.head + Math.sin(t * 0.5 - lag) * 0.15, tx = Math.cos(hd), tz = Math.sin(hd); ax += (tx * this.speed - V[i3]) * 2.2; az += (tz * this.speed - V[i3 + 2]) * 2.2; ax += (this.cx - px) * 0.05 + (hx - this.cx) * 0.04; az += (this.cz - pz) * 0.05 + (hz - this.cz) * 0.04; ay += (hy - py) * 0.5; }
      else if (this.mode === 'ball') { const ex = px - this.cx, ey = py - this.cy, ez = pz - this.cz, r = Math.hypot(ex, ey, ez) || 1, k = this.scatter > 0 ? 0.15 : 1; ax += (-ex / r) * (r - this.radius) * 1.6 * k - ez / r * this.speed; ay += (-ey / r) * (r - this.radius) * 1.6 * k; az += (-ez / r) * (r - this.radius) * 1.6 * k + ex / r * this.speed; ax += (hx - this.cx) * 0.2; ay += (hy - this.cy) * 0.2; az += (hz - this.cz) * 0.2; }
      // 躲避捕食者（含潜水的玩家）：距离越近逃得越急；饵球被冲入时进入散开状态，之后重新聚合
      for (const pr of preds) { const ex = px - pr.x, ey = py - pr.y, ez = pz - pr.z, d = Math.hypot(ex, ey, ez); if (d < pr.r) { const k = this.fleeK * (1 - d / pr.r) / (d + 0.3); ax += ex * k; ay += ey * k * 0.5; az += ez * k; if (this.mode === 'ball' && d < pr.r * 0.5) this.scatter = 4; } }
      // 边界：离底 0.3 m 以上、水面以下，并留在本水域
      const floor = gh(px, pz) + (this.floorGap ?? 0.35), ceil = ecoLevel(this.zone) - (this.ceilGap ?? 0.4);
      if (py < floor + 0.3) ay += (floor + 0.3 - py) * 6; if (py > ceil) ay -= (py - ceil) * 6;
      if (!this.ok(px, pz)) { ax += (hx - px) * 1.5; az += (hz - pz) * 1.5; }
      // 积分、限速、转向平滑
      let nvx = V[i3] + ax * dt * this.turn, nvy = V[i3 + 1] + ay * dt * this.turn, nvz = V[i3 + 2] + az * dt * this.turn;
      const sp = Math.hypot(nvx, nvy, nvz), mx = this.maxSpeed * (this.scatter > 0 ? 1.8 : 1), mn = this.speed * 0.35;
      if (sp > mx) { nvx *= mx / sp; nvy *= mx / sp; nvz *= mx / sp; } else if (sp < mn && sp > 1e-6) { nvx *= mn / sp; nvy *= mn / sp; nvz *= mn / sp; }
      V[i3] = nvx; V[i3 + 1] = nvy * 0.8; V[i3 + 2] = nvz;
      let qx = px + nvx * dt, qy = py + V[i3 + 1] * dt, qz = pz + nvz * dt; const f2 = gh(qx, qz) + 0.25; if (qy < f2) qy = f2; if (qy > ceil + 0.2) qy = ceil + 0.2;
      P[i3] = qx; P[i3 + 1] = qy; P[i3 + 2] = qz; sx += qx; sy += qy; sz += qz;
    }
    this.cx = sx / n; this.cy = sy / n; this.cz = sz / n;
  }
  draw() {
    const n = this.n, P = this.p, V = this.v, L_ = this.lod; L_.begin();
    for (let i = 0; i < n; i++) { const i3 = i * 3, vx = V[i3], vy = V[i3 + 1], vz = V[i3 + 2], h = Math.hypot(vx, vz) || 1e-6, s = this.sc[i]; L_.put(ecoPose(P[i3], P[i3 + 1], P[i3 + 2], Math.atan2(-vz, vx), clamp(Math.atan2(vy, h), -0.6, 0.6), 0, s), P[i3], P[i3 + 1], P[i3 + 2], this.ph[i]); }
    L_.end();
  }
  levelY(x, z) { const top = ecoLevel(this.zone) - (this.ceilGap ?? 0.4), bot = gh(x, z) + (this.floorGap ?? 0.35) + 0.3; return bot < top ? lerp(bot, top, this.band ?? 0.5) : top; }
  ok(x, z) { return ecoIn(this.zone, x, z) && gh(x, z) < ecoLevel(this.zone) - (this.minDepth ?? 0.6) && (!this.bound || this.bound(x, z)); }
}
// 初始化群集中心（首帧前）
function ecoFlockInit(F) { let sx = 0, sy = 0, sz = 0; for (let i = 0; i < F.n; i++) { sx += F.p[i * 3]; sy += F.p[i * 3 + 1]; sz += F.p[i * 3 + 2]; } F.cx = sx / F.n; F.cy = sy / F.n; F.cz = sz / F.n; }

// ---------------- 通用鱼体：按物种参数生成两级模型 ----------------
// sp：{ len, h, w, c1 背色, c2 腹色, pat(t, a, c) 花纹, tail 尾鳍形状 'fork'|'round'|'lunate', dorsal 背鳍高, deep 体高系数 }
function ecoFishGeo(sp, lo) {
  const seg = lo ? 5 : 12, ring = lo ? 5 : 9, L_ = sp.len, H = sp.h, W = sp.w;
  const prof = sp.prof || ((t) => { const s = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.04 + 0.02)), sp.round ?? 0.8) * (1 - 0.6 * t * t); return [H / 2 * s, W / 2 * s]; });
  const C1 = new THREE.Color(sp.c1), C2 = new THREE.Color(sp.c2), c = new THREE.Color();
  const col = (t, a) => { c.copy(C1).lerp(C2, clamp(0.5 - Math.sin(a) * 0.9, 0, 1)); if (sp.pat) sp.pat(t, a, c); if (!lo && t > 0.05 && t < 0.13 && Math.abs(Math.sin(a) - 0.25) < 0.3 && Math.abs(Math.cos(a)) > 0.6) c.set(0x0d0d0d); return c.clone(); };
  const parts = [ecoBody(L_, prof, col, seg, ring)];
  const tx = -L_ / 2, fc = sp.fin ?? sp.c1, th = H * (sp.tailH ?? 0.6);
  if (sp.tail === 'fork' || sp.tail === 'lunate') parts.push(ecoFin([[tx + L_ * 0.03, 0, 0], [tx - L_ * 0.2, th, 0], [tx - L_ * (sp.tail === 'lunate' ? 0.08 : 0.1), 0, 0], [tx - L_ * 0.2, -th, 0]], fc, 1.15));
  else parts.push(ecoFin([[tx + L_ * 0.03, 0, 0], [tx - L_ * 0.13, th * 0.85, 0], [tx - L_ * 0.18, 0, 0], [tx - L_ * 0.13, -th * 0.85, 0]], fc, 1.12));
  if (!lo) {
    const dh = H * (sp.dorsal ?? 0.35);
    parts.push(ecoFin([[L_ * 0.2, H * 0.42, 0], [L_ * 0.05, H * 0.45 + dh, 0], [-L_ * 0.25, H * 0.35 + dh * 0.5, 0], [-L_ * 0.3, H * 0.25, 0]], fc, (x) => clamp((L_ / 2 - x) / L_, 0, 1)));
    parts.push(ecoFin([[-L_ * 0.05, -H * 0.4, 0], [-L_ * 0.2, -H * 0.4 - dh * 0.6, 0], [-L_ * 0.32, -H * 0.22, 0]], fc, (x) => clamp((L_ / 2 - x) / L_, 0, 1)));
    for (const s of [-1, 1]) parts.push(ecoFin([[L_ * 0.26, -H * 0.1, s * W * 0.42], [L_ * 0.1, -H * 0.28, s * W * 1.3], [L_ * 0.16, -H * 0.02, s * W * 0.5]], fc, 0.25));
    if (sp.extra) parts.push(...sp.extra());
  }
  return ecoMerge(parts);
}
function ecoFishLod(scene, sp, n, dHi = 18, dFar = 90, o = {}) {
  const mat = ecoMat('swim', { freq: o.freq ?? 9, amp: o.amp ?? 0.14 * sp.len, rough: o.rough ?? 0.35, metal: o.metal ?? 0.3, side: THREE.DoubleSide });
  return new EcoLod(scene, [ecoFishGeo(sp, false), ecoFishGeo(sp, true)], mat, n, dHi, dFar);
}
