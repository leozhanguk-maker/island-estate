// ======================= 15 潟湖海豚：两只可互动的宽吻海豚（鱼群见 17_eco） =======================
const MARINE = { schools: [], dolphins: [], pet: null };
// 鱼：沿 +x 的旋转体身体 + 尾鳍 + 背/臀鳍 + 胸鳍；顶点色做花纹；attribute bend=到头部的距离（用于摆尾）
function fishGeo(kind) {
  const P = { sardine: { L: 1, H: 0.18, W: 0.1, c1: 0x3a5a78, c2: 0xdfe6ea, stripe: null }, damsel: { L: 1, H: 0.5, W: 0.16, c1: 0xe8d23a, c2: 0xf2f0d0, stripe: 0x1a1a1a },
    parrot: { L: 1, H: 0.34, W: 0.2, c1: 0x2a9a8a, c2: 0x5fc0b0, stripe: 0xd46aa0 }, trevally: { L: 1, H: 0.36, W: 0.13, c1: 0x6f8a9a, c2: 0xe6ecee, stripe: null },
    tilapia: { L: 1, H: 0.36, W: 0.14, c1: 0x6f7a4a, c2: 0xc9c7a0, stripe: 0x4a5436 }, carp: { L: 1, H: 0.3, W: 0.16, c1: 0xd87a2a, c2: 0xf2d8b0, stripe: 0xf4f0e8 } }[kind];
  const pos = [], col = [], bend = [], idx = [], SEG = 12, RING = 8, C1 = new THREE.Color(P.c1), C2 = new THREE.Color(P.c2), CS = P.stripe ? new THREE.Color(P.stripe) : null;
  const prof = (t) => Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.02)), 0.8) * (1 - 0.55 * t * t);
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG, x = 0.5 - t * 0.82, h = P.H / 2 * prof(t), w = P.W / 2 * prof(t);
    for (let k = 0; k < RING; k++) {
      const a = k / RING * TAU, y = Math.sin(a) * h, z = Math.cos(a) * w; pos.push(x, y, z); bend.push(t);
      let c = C1.clone().lerp(C2, clamp(0.5 - Math.sin(a) * 0.8, 0, 1));
      if (CS && kind === 'damsel' && Math.sin(t * 22) > 0.6 && Math.sin(a) > -0.3) c = CS.clone();
      if (CS && kind === 'parrot' && Math.abs(Math.sin(t * 9 + a)) > 0.93) c = CS.clone();
      if (CS && kind === 'carp' && SNoise(t * 5, a * 2) > 0.3) c = CS.clone();
      if (CS && kind === 'tilapia' && Math.sin(t * 16) > 0.7) c.lerp(CS, 0.5);
      if (t < 0.1 && Math.abs(Math.sin(a)) < 0.4 && Math.cos(a) > 0.3) c = new THREE.Color(0x111111);   // 眼
      col.push(c.r, c.g, c.b);
    }
    if (i < SEG) for (let k = 0; k < RING; k++) { const a = i * RING + k, b = a + RING, a1 = i * RING + (k + 1) % RING, b1 = a1 + RING; idx.push(a, b, a1, a1, b, b1); }
  }
  const fin = (pts, c, bnd) => { const b = pos.length / 3, cc = new THREE.Color(c); for (const p of pts) { pos.push(...p); col.push(cc.r, cc.g, cc.b); bend.push(bnd(p)); } for (let i = 1; i < pts.length - 1; i++) idx.push(b, b + i, b + i + 1, b, b + i + 1, b + i); };
  const tx = 0.5 - 0.82, fc = kind === 'carp' ? 0xe8904a : P.c1;
  fin([[tx + 0.02, 0, 0], [tx - 0.2, P.H * 0.55, 0], [tx - 0.14, 0, 0], [tx - 0.2, -P.H * 0.55, 0]], fc, p => 1 + (tx - p[0]) * 2);
  fin([[0.15, P.H * 0.45, 0], [-0.1, P.H * 0.72, 0], [-0.22, P.H * 0.3, 0]], fc, p => 0.5 - p[0]);
  fin([[-0.05, -P.H * 0.42, 0], [-0.22, -P.H * 0.55, 0], [-0.25, -P.H * 0.25, 0]], fc, p => 0.5 - p[0]);
  for (const s of [-1, 1]) fin([[0.28, -P.H * 0.1, s * P.W * 0.4], [0.12, -P.H * 0.25, s * P.W * 1.4], [0.18, -P.H * 0.05, s * P.W * 0.5]], fc, () => 0.25);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('bend', new THREE.Float32BufferAttribute(bend, 1)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function fishMaterial(freq) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.25, side: THREE.DoubleSide });
  const uT = { value: 0 }; TIME_U.push(uT);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\nattribute float bend; attribute float iPh; uniform float uTime;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n float sw = sin(uTime * ${freq.toFixed(1)} + iPh * 6.283 - bend * 3.2) * 0.16 * bend * bend; transformed.z += sw;`);
  };
  return m;
}
// 海豚：宽吻海豚（长约 2.6 米）：纺锤体 + 喙 + 额隆 + 背鳍 + 胸鳍 + 水平尾叶；背深灰腹浅灰
function dolphinGeo() {
  const pos = [], col = [], bend = [], idx = [], SEG = 28, RING = 14, L = 2.6, top = new THREE.Color(0x4f5a63), belly = new THREE.Color(0xd6dde0);
  const r = (t) => t < 0.1 ? 0.05 + t * 0.8 : t < 0.2 ? 0.13 + (t - 0.1) * 1.6 : 0.29 * Math.pow(Math.sin(Math.PI * Math.min(1, (t - 0.12) / 0.95)), 0.7) * (1 - 0.6 * t * t) + 0.02;
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG, x = L / 2 - t * L, rr = r(t), ry = rr * (t < 0.2 ? 0.9 : 1.05), rz = rr * 0.9 * (t > 0.8 ? 0.6 : 1);
    for (let k = 0; k < RING; k++) { const a = k / RING * TAU; pos.push(x, Math.sin(a) * ry + (t > 0.12 && t < 0.2 ? 0.03 : 0), Math.cos(a) * rz); bend.push(t); const c = top.clone().lerp(belly, clamp(-Math.sin(a) * 1.4 + 0.3, 0, 1)); if (t < 0.17 && t > 0.14 && Math.abs(Math.sin(a)) < 0.3 && Math.cos(a) > 0.5) c.set(0x111111); col.push(c.r, c.g, c.b); }
    if (i < SEG) for (let k = 0; k < RING; k++) { const a = i * RING + k, b = a + RING, a1 = i * RING + (k + 1) % RING, b1 = a1 + RING; idx.push(a, b, a1, a1, b, b1); }
  }
  const fin = (pts, bnd) => { const b = pos.length / 3; for (const p of pts) { pos.push(...p); col.push(top.r, top.g, top.b); bend.push(bnd(p)); } for (let i = 1; i < pts.length - 1; i++) idx.push(b, b + i, b + i + 1, b, b + i + 1, b + i); };
  fin([[0.05, 0.26, 0], [-0.25, 0.62, 0], [-0.32, 0.6, 0], [-0.4, 0.25, 0]], p => 0.5 - p[0] / L);
  for (const s of [-1, 1]) fin([[0.55, -0.12, s * 0.2], [0.25, -0.28, s * 0.55], [0.18, -0.24, s * 0.52], [0.35, -0.1, s * 0.2]], () => 0.3);
  fin([[-1.2, 0, 0], [-1.52, 0, 0.42], [-1.6, 0, 0.36], [-1.45, 0, 0], [-1.6, 0, -0.36], [-1.52, 0, -0.42]], p => 1 + (-1.2 - p[0]));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('bend', new THREE.Float32BufferAttribute(bend, 1)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function dolphinMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.1, side: THREE.DoubleSide });
  const uT = { value: 0 }; TIME_U.push(uT);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\nattribute float bend; attribute float iPh; uniform float uTime;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n float sw = sin(uTime * 3.2 + iPh * 6.283 - bend * 2.6) * 0.22 * bend * bend; transformed.y += sw;`);
  };
  return m;
}
// ---------------- 行为：鱼群（群中心漫游 + 个体跟随/分离） ----------------
function marineRegionLagoon(x, z, y) { const h = gh(x, z); return h < y - 0.5 && z < L.gateZ - 3 && X_SD_W(x, z) > 2; }
let X_SD_W = () => 0;
function buildMarine(scene, X) {
  X_SD_W = (x, z) => { const k = Math.round(clamp(z - G.z0, 0, G.nz - 1)) * G.nx + Math.round(clamp(x - G.x0, 0, G.nx - 1)); return X.sdW[k]; };
  const R = mulberry32(8080);
  // 鱼群已迁到 17_eco（三个水域分开、物种符合各自水体：湖里鲫鱼与罗非鱼，潟湖为礁鱼，沙丁鱼与鲹鱼移到外海），这里只保留海豚
  const SPEC = [];
  for (const [kind, n, size, ok, level, speed, tight] of SPEC) {
    const geo = fishGeo(kind), ph = new THREE.InstancedBufferAttribute(new Float32Array(n), 1); geo.setAttribute('iPh', ph);
    const im = new THREE.InstancedMesh(geo, fishMaterial(kind === 'sardine' ? 14 : 9), n); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.castShadow = false; scene.add(im);
    let cx = 0, cz = 0, cy = 0; for (let k = 0; k < 500; k++) { const x = level ? L.lake.x + (R() - 0.5) * 24 : (R() - 0.5) * 90, z = level ? L.lake.z + (R() - 0.5) * 16 : 55 + R() * 60, y = level - 0.8; if (ok(x, z, y)) { cx = x; cz = z; cy = y; break; } }
    const fish = []; for (let i = 0; i < n; i++) { fish.push({ x: cx + (R() - 0.5) * 3, y: cy - R() * 0.5, z: cz + (R() - 0.5) * 3, vx: 0, vy: 0, vz: 0 }); ph.setX(i, R()); }
    MARINE.schools.push({ kind, im, fish, size, ok, level, speed, tight, c: { x: cx, y: cy, z: cz }, tgt: { x: cx, y: cy, z: cz }, t: 0 });
  }
  // 海豚两只
  const dg = dolphinGeo(), dph = new THREE.InstancedBufferAttribute(new Float32Array([0.1, 0.6]), 1); dg.setAttribute('iPh', dph);
  const dm = new THREE.InstancedMesh(dg, dolphinMaterial(), 2); dm.instanceMatrix.setUsage(THREE.DynamicDrawUsage); dm.frustumCulled = false; dm.castShadow = true; scene.add(dm);
  for (let i = 0; i < 2; i++) MARINE.dolphins.push({ im: dm, i, x: -30 + i * 8, y: -1.2, z: 62 + i * 3, yaw: 0, v: 3, dir: i ? -1 : 1, jump: 0, jt: 6 + i * 5, mode: 'patrol', t: 0 });
  // 抚摸海豚交互（靠近时出现）
  INTERACT.push({ get x() { const d = MARINE.near; return d ? d.x : 1e9; }, get z() { const d = MARINE.near; return d ? d.z : 1e9; }, r: 4.5, get y() { return MARINE.near ? MARINE.near.y + 0.3 : -99; }, label: '抚摸海豚', fn: () => { const d = MARINE.near; if (d) { d.jump = 0.001; d.mode = 'escort'; d.t = 25; } } });
  updateMarine(0, 0, null);
}
function updateMarine(dt, t, player) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler(0, 0, 0, 'YZX');
  for (const S of MARINE.schools) {
    S.t -= dt;
    const dc = Math.hypot(S.tgt.x - S.c.x, S.tgt.z - S.c.z);
    if (S.t <= 0 || dc < 1.5) { for (let k = 0; k < 60; k++) { const rr = S.level ? 9 : 26, x = S.c.x + (Math.random() - 0.5) * rr * 2, z = S.c.z + (Math.random() - 0.5) * rr * 2, bot = gh(x, z), y = S.level - 0.5 - Math.random() * Math.max(0.3, (S.level - bot) - 1.2); if (S.ok(x, z, y)) { S.tgt = { x, y, z }; break; } } S.t = 6 + Math.random() * 8; }
    // 玩家潜到附近时鱼群回避
    let fx = 0, fz = 0; if (player && player.under && Math.hypot(player.x - S.c.x, player.z - S.c.z) < 5) { fx = S.c.x - player.x; fz = S.c.z - player.z; }
    const dx = S.tgt.x - S.c.x + fx * 2, dz = S.tgt.z - S.c.z + fz * 2, dy = S.tgt.y - S.c.y, dl = Math.hypot(dx, dz) || 1;
    const nx = S.c.x + dx / dl * S.speed * dt, nz = S.c.z + dz / dl * S.speed * dt, ny = S.c.y + clamp(dy, -0.5, 0.5) * dt;
    if (S.ok(nx, nz, ny)) { S.c.x = nx; S.c.z = nz; S.c.y = ny; } else S.t = 0;
    const F = S.fish, n = F.length;
    for (let i = 0; i < n; i++) {
      const f = F[i]; let ax = (S.c.x - f.x) * 0.6 / S.tight, ay = (S.c.y - f.y) * 0.8, az = (S.c.z - f.z) * 0.6 / S.tight;
      for (let j = Math.max(0, i - 4); j < Math.min(n, i + 5); j++) if (j !== i) { const g = F[j], ex = f.x - g.x, ey = f.y - g.y, ez = f.z - g.z, d2 = ex * ex + ey * ey + ez * ez; if (d2 < S.size * S.size * 4 && d2 > 1e-6) { ax += ex / d2 * 0.04; ay += ey / d2 * 0.02; az += ez / d2 * 0.04; } }
      ax += dx / dl * S.speed * 0.5; az += dz / dl * S.speed * 0.5;
      f.vx = lerp(f.vx, ax, dt * 2); f.vy = lerp(f.vy, ay, dt * 2); f.vz = lerp(f.vz, az, dt * 2);
      const sp = Math.hypot(f.vx, f.vz); if (sp > S.speed * 1.6) { f.vx *= S.speed * 1.6 / sp; f.vz *= S.speed * 1.6 / sp; }
      const px = f.x + f.vx * dt, pz = f.z + f.vz * dt, py = clamp(f.y + f.vy * dt, gh(px, pz) + 0.25, S.level - 0.3);
      if (S.ok(px, pz, py + 0.2) || !S.ok(f.x, f.z, f.y + 0.2)) { f.x = px; f.z = pz; } f.y = py;
      e.set(0, Math.atan2(-f.vz, f.vx), clamp(f.vy * 0.5, -0.4, 0.4)); q.setFromEuler(e); m4.compose(v.set(f.x, f.y, f.z), q, sc.set(S.size, S.size, S.size)); S.im.setMatrixAt(i, m4);
    }
    S.im.instanceMatrix.needsUpdate = true;
  }
  // 海豚：沙滩前来回巡游；不时跃出水面；玩家下水靠近时伴游/绕游
  MARINE.near = null; let best = 1e9;
  for (const D of MARINE.dolphins) {
    D.t -= dt; D.jt -= dt;
    let tx, tz;
    const pn = player && player.inWater && player.lagoon ? Math.hypot(player.x - D.x, player.z - D.z) : 1e9;
    if (pn < 14 && D.mode !== 'escort') { D.mode = 'visit'; D.t = 12; }
    if ((D.mode === 'visit' || D.mode === 'escort') && player && player.inWater) {
      const a = t * 0.6 + D.i * Math.PI; tx = player.x + Math.cos(a) * (D.mode === 'escort' ? 3 : 4.5); tz = player.z + Math.sin(a) * (D.mode === 'escort' ? 3 : 4.5);
      if (D.t <= 0) D.mode = 'patrol';
    } else { if (D.mode !== 'patrol') D.mode = 'patrol'; tx = D.dir > 0 ? 42 : -42; tz = 60 + D.i * 5 + Math.sin(t * 0.2 + D.i) * 4; if ((D.dir > 0 && D.x > 38) || (D.dir < 0 && D.x < -38)) D.dir = -D.dir; }
    const want = Math.atan2(-(tz - D.z), tx - D.x); let da = ((want - D.yaw + Math.PI * 3) % TAU) - Math.PI; D.yaw += clamp(da, -1.4 * dt, 1.4 * dt);
    const sp = D.mode === 'patrol' ? 3.2 : 2.4, nx = D.x + Math.cos(D.yaw) * sp * dt, nz = D.z - Math.sin(D.yaw) * sp * dt;
    if (gh(nx, nz) < -1.6 && nz < L.gateZ - 4) { D.x = nx; D.z = nz; } else D.yaw += 1.2 * dt;
    let y = -1.3 + Math.sin(t * 0.5 + D.i * 2) * 0.35, pitch = 0;
    if (D.jt <= 0 && D.jump === 0 && gh(D.x, D.z) < -3) D.jump = 0.001;
    if (D.jump > 0) { D.jump += dt / 1.6; const k = D.jump; y = -1.3 + Math.sin(Math.PI * k) * 3.6; pitch = Math.cos(Math.PI * k) * 0.9; if (k >= 1) { D.jump = 0; D.jt = 8 + Math.random() * 10; } }
    D.y = y;
    e.set(0, D.yaw, pitch); q.setFromEuler(e); m4.compose(v.set(D.x, y, D.z), q, sc.set(1, 1, 1)); D.im.setMatrixAt(D.i, m4);
    if (player) { const dd = Math.hypot(player.x - D.x, player.z - D.z); if (dd < best && dd < 4.5 && player.inWater) { best = dd; MARINE.near = D; } }
  }
  if (MARINE.dolphins.length) MARINE.dolphins[0].im.instanceMatrix.needsUpdate = true;
}
