// ======================= 17d 水域生态·环岛外海（热带大洋，禁止任何淡水物种） =======================
// 分区出现：南侧峡谷出海口——金梭鱼龙卷；东南——虎鲸家族与沙丁鱼饵球；西南——座头鲸母子群；北侧——大眼鲹鱼墙、鲸鲨（独行）
// 虎鲸与座头鲸分在东南、西南两区，相距约 500 m，不会并行出现
const ECO_OCEAN = { S: { x: 20, z: 212 }, SE: { x: 240, z: 202 }, SW: { x: -250, z: 200 }, N: { x: 10, z: -212 } };
// 鲸类几何（头朝 +x）：kind = humpback 座头鲸 / orca 虎鲸 / shark 鲸鲨；aw = 到头部距离（尾部摆动用）
function ecoWhaleGeo(kind, lo, o = {}) {
  const seg = lo ? 7 : 18, ring = lo ? 6 : 12, parts = [];
  if (kind === 'humpback') {
    const L_ = o.len ?? 13, top = new THREE.Color(0x24282d), belly = new THREE.Color(0x9aa0a6);
    parts.push(ecoBody(L_, (t) => { const k = t < 0.35 ? 0.55 + 0.45 * Math.sin(Math.PI / 2 * t / 0.35) : 1 - Math.pow((t - 0.35) / 0.65, 1.4) * 0.9; return [L_ * 0.1 * k * (t < 0.12 ? 0.75 + t * 2 : 1), L_ * 0.1 * k]; },
      (t, a) => { const c = top.clone().lerp(belly, clamp(-Math.sin(a) * 1.4 - 0.1, 0, 1)); if (Math.sin(a) < -0.3 && t < 0.45 && Math.sin(Math.cos(a) * 60) > 0.2) c.multiplyScalar(0.8); if (!lo && t < 0.2 && Math.sin(a) > 0.4 && Math.sin(t * 90) * Math.sin(a * 20) > 0.7) c.multiplyScalar(0.6); return c; }, seg, ring));
    // 极长的胸鳍（约体长 1/3，下表面白色，前缘有瘤状突起）
    const pl = L_ * 0.32; for (const sd of [-1, 1]) { const b = [L_ * 0.22, -L_ * 0.05, sd * L_ * 0.07]; parts.push(ecoFin([b, [b[0] + L_ * 0.02, b[1] - 0.2, sd * L_ * 0.1], [b[0] - pl * 0.35, b[1] - pl * 0.35, sd * (L_ * 0.07 + pl * 0.8)], [b[0] - pl * 0.45, b[1] - pl * 0.4, sd * (L_ * 0.07 + pl * 0.82)], [b[0] - L_ * 0.08, b[1] - 0.05, sd * L_ * 0.08]], (x, y) => ecoMix(0x2a2e33, 0xe0e4e2, 0.6 + (b[1] - y) * 0.3), 0.3)); }
    parts.push(ecoFin([[-L_ * 0.18, L_ * 0.085, 0], [-L_ * 0.22, L_ * 0.12, 0], [-L_ * 0.28, L_ * 0.07, 0]], top, 0.7));   // 小背鳍（驼峰）
    const tx = -L_ / 2; for (const sd of [-1, 1]) parts.push(ecoFin([[tx + 0.2, 0, 0], [tx - L_ * 0.05, 0, sd * L_ * 0.17], [tx - L_ * 0.12, 0, sd * L_ * 0.15], [tx - L_ * 0.07, 0, sd * 0.2]], (x, y, z) => ecoMix(0x24282d, 0xd8dcd8, y < 0 ? 0.8 : 0.1), 1.25));
  } else if (kind === 'orca') {
    const L_ = o.len ?? 7, blk = new THREE.Color(0x0c0d10), wht = new THREE.Color(0xf2f2ee), gry = new THREE.Color(0x6a6e74);
    parts.push(ecoBody(L_, (t) => { const k = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.08)), 0.7) * (1 - 0.7 * t * t); return [L_ * 0.11 * k, L_ * 0.095 * k]; },
      (t, a) => { const s = Math.sin(a), cs = Math.cos(a); if (s < -0.45 && t < 0.62) return wht.clone(); if (t > 0.1 && t < 0.2 && s > 0.05 && s < 0.5 && Math.abs(cs) > 0.6) return wht.clone(); if (t > 0.42 && t < 0.55 && s > 0.75) return gry.clone(); if (s < -0.2 && t > 0.55 && t < 0.7 && Math.abs(cs) > 0.5) return wht.clone(); return blk.clone(); }, seg, ring));
    const dh = o.dorsal ?? 1.1; parts.push(ecoFin([[-L_ * 0.02, L_ * 0.09, 0], [-L_ * 0.06, L_ * 0.09 + dh, 0], [-L_ * 0.16, L_ * 0.08, 0]], blk, 0.55));
    for (const sd of [-1, 1]) parts.push(ecoFin([[L_ * 0.25, -L_ * 0.06, sd * L_ * 0.06], [L_ * 0.12, -L_ * 0.12, sd * L_ * 0.18], [L_ * 0.18, -L_ * 0.07, sd * L_ * 0.08]], blk, 0.3));
    const tx = -L_ / 2; for (const sd of [-1, 1]) parts.push(ecoFin([[tx + 0.15, 0, 0], [tx - L_ * 0.06, 0, sd * L_ * 0.14], [tx - L_ * 0.1, 0, sd * L_ * 0.11], [tx - L_ * 0.05, 0, sd * 0.1]], blk, 1.25));
  } else {
    // 鲸鲨：宽扁的头、口在前端、深蓝灰底色布满白色斑点与纵纹；尾鳍竖直（左右摆动）
    const L_ = o.len ?? 10, top = new THREE.Color(0x34465a), bel = new THREE.Color(0xd8dcd8);
    parts.push(ecoBody(L_, (t) => { const k = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.02 + 0.1)), 0.6) * (1 - 0.75 * t * t); return [L_ * 0.075 * k, L_ * (t < 0.2 ? 0.11 : 0.09) * k]; },
      (t, a) => { const s = Math.sin(a); if (s < -0.35) return bel.clone(); if (t < 0.03 && Math.abs(s) < 0.25) return new THREE.Color(0x1a1a1e); const c = top.clone(); if (!lo && Math.sin(t * 120) * Math.sin(a * 24) > 0.8) c.set(0xe8ecea); else if (Math.abs(Math.sin(a * 6)) < 0.05) c.lerp(bel, 0.5); return c; }, seg, ring));
    const tx = -L_ / 2; parts.push(ecoFin([[tx + 0.3, 0, 0], [tx - L_ * 0.1, L_ * 0.16, 0], [tx - L_ * 0.06, 0, 0], [tx - L_ * 0.07, -L_ * 0.09, 0]], top, 1.2));
    parts.push(ecoFin([[-L_ * 0.05, L_ * 0.07, 0], [-L_ * 0.12, L_ * 0.15, 0], [-L_ * 0.2, L_ * 0.06, 0]], top, 0.6));
    for (const sd of [-1, 1]) parts.push(ecoFin([[L_ * 0.18, -L_ * 0.05, sd * L_ * 0.07], [L_ * 0.02, -L_ * 0.07, sd * L_ * 0.25], [L_ * 0.1, -L_ * 0.05, sd * L_ * 0.08]], top, 0.3));
  }
  return ecoMerge(parts);
}
// 喷气与水花：白色半透明小球粒子池（一个实例化网格）
function ecoSprayInit(scene) {
  const n = 160, im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xf2f6f8, transparent: true, opacity: 0.55, roughness: 1, depthWrite: false }), n);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.count = 0; scene.add(im);
  ECO.spray = { im, p: [], n };
}
function ecoSpray(x, y, z, kind) {   // kind：blow 换气喷出的水雾柱 / splash 跃身落水的水花
  const S = ECO.spray; if (!S) return;
  const cnt = kind === 'blow' ? 18 : 40;
  for (let i = 0; i < cnt && S.p.length < S.n; i++) S.p.push(kind === 'blow' ? { x: x + ecoRand(-0.2, 0.2), y, z: z + ecoRand(-0.2, 0.2), vx: ecoRand(-0.3, 0.3), vy: ecoRand(5, 8), vz: ecoRand(-0.3, 0.3), t: 0, life: ecoRand(1.6, 2.6), r: ecoRand(0.25, 0.5), g: 2.5 }
    : { x: x + ecoRand(-2, 2), y: 0, z: z + ecoRand(-2, 2), vx: ecoRand(-3, 3), vy: ecoRand(3, 8), vz: ecoRand(-3, 3), t: 0, life: ecoRand(1.2, 2), r: ecoRand(0.3, 0.8), g: 9.8 });
}
function ecoSprayUpdate(dt) {
  const S = ECO.spray; if (!S) return; let k = 0;
  for (let i = S.p.length - 1; i >= 0; i--) { const p = S.p[i]; p.t += dt; if (p.t > p.life) { S.p.splice(i, 1); continue; } p.vy -= p.g * dt; p.x += p.vx * dt; p.y = Math.max(-0.2, p.y + p.vy * dt); p.z += p.vz * dt; const s = p.r * (1 + p.t * 1.5) * (1 - p.t / p.life * 0.5); S.im.setMatrixAt(k++, ecoPose(p.x, p.y, p.z, 0, 0, 0, s)); }
  S.im.count = k; S.im.visible = k > 0; if (k) S.im.instanceMatrix.needsUpdate = true;
}
// 鲸群：领头个体在分区内按航点巡游，其余按编队槽位跟随；定时上浮换气；座头鲸偶尔跃身击浪；虎鲸定时冲击饵球
class EcoPod {
  constructor(o) { Object.assign(this, o); this.lead = this.a[0]; this.wp = { x: this.home.x, z: this.home.z }; this.wt = 0; ECO.whales.push(this); }
  pick() { for (let k = 0; k < 40; k++) { const a = ECO_R() * TAU, r = Math.sqrt(ECO_R()) * this.range, x = this.home.x + Math.cos(a) * r, z = this.home.z + Math.sin(a) * r; if (gh(x, z) < -this.minFloor && ecoIn('ocean', x, z)) return { x, z }; } return { x: this.home.x, z: this.home.z }; }
  update(dt, t) {
    const L0 = this.lead; this.wt -= dt;
    if (this.chaseT !== undefined) { this.chaseT -= dt; if (this.chaseT <= 0 && this.prey) { this.wp = { x: this.prey.cx, z: this.prey.cz, y: this.prey.cy }; this.chasing = 6; this.chaseT = ecoRand(40, 70); } }
    if (this.chasing > 0) { this.chasing -= dt; if (this.prey) { this.wp.x = this.prey.cx; this.wp.z = this.prey.cz; } }
    if (this.wt <= 0 || Math.hypot(this.wp.x - L0.x, this.wp.z - L0.z) < 6) { if (!(this.chasing > 0)) this.wp = this.pick(); this.wt = ecoRand(25, 50); }
    for (let i = 0; i < this.a.length; i++) {
      const w = this.a[i]; let tx, tz, ty = w.cruiseY;
      if (i === 0) { tx = this.wp.x; tz = this.wp.z; if (this.chasing > 0 && this.prey) ty = this.prey.cy; }
      else { const f = w.follow || L0, ox = w.slot[0], oz = w.slot[1], c = Math.cos(f.yaw), s = Math.sin(f.yaw); tx = f.x + ox * c + oz * s; tz = f.z - ox * s + oz * c; if (w.follow) ty = f.y + 0.6; }
      const dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz), want = Math.atan2(-dz, dx);
      let da = ((want - w.yaw + Math.PI * 3) % TAU) - Math.PI; w.yaw += clamp(da, -w.turn * dt, w.turn * dt);
      const vWant = i === 0 ? (this.chasing > 0 ? this.chaseSpeed : this.speed) : clamp(d * 0.5, 0, this.speed * 1.6);
      w.v = lerp(w.v, vWant, dt * 0.5); w.x += Math.cos(w.yaw) * w.v * dt; w.z -= Math.sin(w.yaw) * w.v * dt;
      // 换气：定时上浮到水面、喷气，再下潜；跃身：加速冲出水面后落回，溅起水花
      w.breath -= dt;
      if (w.state === 'cruise') { if (w.breath <= 0) { w.state = 'rise'; } else if (this.breach && !w.follow && ECO_R() < dt / 150) { w.state = 'breach'; w.vy = Math.sqrt(2 * 9.8 * (4 - w.y)); } }
      if (w.state === 'rise') { ty = -w.surfY; if (Math.abs(w.y - ty) < 0.25) { w.state = 'surface'; w.st = ecoRand(4, 7); ecoSpray(w.x + Math.cos(w.yaw) * w.len * 0.3, 0.1, w.z - Math.sin(w.yaw) * w.len * 0.3, 'blow'); } }
      else if (w.state === 'surface') { ty = -w.surfY; w.st -= dt; if (w.st <= 0) { w.state = 'dive'; w.st = 4; } }
      else if (w.state === 'dive') { w.st -= dt; w.pitch = lerp(w.pitch, -0.35, dt); if (w.st <= 0) { w.state = 'cruise'; w.breath = w.breathEvery * ecoRand(0.8, 1.2); } }
      if (w.state === 'breach') {
        // 初速度按冲到水面上 4 m 计算，之后只受重力；冲出时身体上仰并侧转，落回水面溅起水花
        w.vy -= 9.8 * dt; w.y += w.vy * dt; w.pitch = clamp(w.vy * 0.12, -1.1, 1.25); w.roll = lerp(w.roll, w.vy > 0 ? 1.3 : 2.4, dt * 1.2);
        if (w.vy < 0 && w.y < -1) { ecoSpray(w.x, 0, w.z, 'splash'); w.state = 'dive'; w.st = 3; w.roll = 0; w.breath = w.breathEvery; }
      } else { w.y = lerp(w.y, ty, dt * 0.35); if (w.state !== 'dive') w.pitch = lerp(w.pitch, clamp((ty - w.y) * 0.08, -0.3, 0.3), dt); w.roll = lerp(w.roll, 0, dt); }
      w.y = Math.max(w.y, gh(w.x, w.z) + 2.5);
    }
  }
  draw() { const L_ = this.lod; L_.begin(); for (const w of this.a) L_.put(ecoPose(w.x, w.y, w.z, w.yaw, w.pitch, w.roll, w.s), w.x, w.y, w.z, w.ph); L_.end(); }
  preds(r) { return this.a.map(w => ({ x: w.x, y: w.y, z: w.z, r })); }
}
function buildEcoOcean(scene) {
  ecoSprayInit(scene);
  const mk = (name, c, view = 260) => (ECO.zones[name] = { center: c, radius: 60, view, meshes: [], flocks: [], critters: [], whales: [] });
  const predP = (r) => { const p = ECO.player; return p && p.under ? [{ x: p.x, y: p.y, z: p.z, r }] : []; };
  // ---- 南：金梭鱼龙卷（数百条银色细长的鱼，缓慢旋转的鱼柱） ----
  const zS = mk('oceanS', ECO_OCEAN.S);
  const barra = { len: 1.05, h: 0.12, w: 0.08, c1: 0x5a6a78, c2: 0xe2e8ec, fin: 0x6a7a88, tail: 'fork', dorsal: 0.6, round: 0.9, pat: (t, a, c) => { if (Math.sin(a) > 0 && Math.sin(t * 36 - Math.sin(a) * 3) > 0.7) c.multiplyScalar(0.7); } };
  zS.flocks.push(new EcoFlock({ zone: 'ocean', n: 260, lod: ecoFishLod(scene, barra, 260, 22, 170, { freq: 5, amp: 0.05 }), mode: 'tornado', home: { x: ECO_OCEAN.S.x, y: -13, z: ECO_OCEAN.S.z }, radius: 5.5, height: 13, range: 12, spawn: 5, speed: 1.4, maxSpeed: 2.4, per: 1.3, sep: 2.2, ali: 1.1, coh: 0.3, predators: () => predP(4), minDepth: 3, floorGap: 1.5, ceilGap: 2 }));
  // ---- 东南：沙丁鱼饵球 + 虎鲸家族（追逐饵球） ----
  const zSE = mk('oceanSE', ECO_OCEAN.SE);
  const sardine = { len: 0.17, h: 0.035, w: 0.02, c1: 0x2a4a6a, c2: 0xdfe8ee, fin: 0x6a8aa0, tail: 'fork', dorsal: 0.3 };
  let orcaPod = null;
  const ball = new EcoFlock({ zone: 'ocean', n: 380, lod: ecoFishLod(scene, sardine, 380, 14, 150, { freq: 14, amp: 0.02 }), mode: 'ball', home: { x: ECO_OCEAN.SE.x, y: -9, z: ECO_OCEAN.SE.z }, radius: 3.2, range: 10, spawn: 3, speed: 1.3, maxSpeed: 3.2, per: 0.5, sep: 1.4, ali: 1.2, coh: 0.4, predators: () => (orcaPod ? orcaPod.preds(7) : []).concat(predP(3)), minDepth: 3, floorGap: 2, ceilGap: 1.5 });
  zSE.flocks.push(ball);
  const orcaSpecs = [[7.8, 1.7, 1], [6.4, 0.95, 1], [6.2, 0.9, 1], [6.5, 1, 1], [6.0, 0.9, 1], [4.2, 0.7, 0.9], [3.6, 0.6, 0.85]];
  const orcaM = ecoMat('fluke', { freq: 1.6, amp: 0.35, rough: 0.35, metal: 0.05 });
  const oLodM = new EcoLod(scene, [ecoWhaleGeo('orca', false, { len: 7.8, dorsal: 1.75 }), ecoWhaleGeo('orca', true, { len: 7.8, dorsal: 1.75 })], orcaM, 1, 60, 380);
  const oLodF = new EcoLod(scene, [ecoWhaleGeo('orca', false, { len: 6.4, dorsal: 0.95 }), ecoWhaleGeo('orca', true, { len: 6.4, dorsal: 0.95 })], orcaM, 6, 60, 380);
  const slots = [[0, 0], [-6, 5], [-6, -5], [-12, 9], [-12, -9], [-9, 2.5], [-9, -2.5]];
  const orcas = orcaSpecs.map(([len, , sc], i) => ({ x: ECO_OCEAN.SE.x + slots[i][0], z: ECO_OCEAN.SE.z + slots[i][1], y: -6, cruiseY: ecoRand(-7, -4), yaw: ECO_R() * TAU, pitch: 0, roll: 0, v: 0, s: i === 0 ? 1 : len / 6.4, ph: ECO_R(), slot: slots[i], len, turn: 0.5, state: 'cruise', breath: ecoRand(10, 40), breathEvery: 35, surfY: 0.6 }));
  orcaPod = new EcoPod({ a: orcas, lod: null, home: ECO_OCEAN.SE, range: 45, speed: 2.2, chaseSpeed: 5.5, minFloor: 18, prey: ball, chaseT: ecoRand(15, 30) });
  orcaPod.draw = function () { oLodM.begin(); oLodF.begin(); this.a.forEach((w, i) => (i === 0 ? oLodM : oLodF).put(ecoPose(w.x, w.y, w.z, w.yaw, w.pitch, w.roll, w.s), w.x, w.y, w.z, w.ph)); oLodM.end(); oLodF.end(); };
  orcaPod.lod = { hide() { oLodM.hide(); oLodF.hide(); } };
  zSE.whales.push(orcaPod);
  // ---- 西南：座头鲸母子群（胸鳍极长；定时上浮换气喷气；偶尔跃出水面拍击） ----
  const zSW = mk('oceanSW', ECO_OCEAN.SW, 320);
  const hbLod = new EcoLod(scene, [ecoWhaleGeo('humpback', false), ecoWhaleGeo('humpback', true)], ecoMat('fluke', { freq: 0.9, amp: 0.8, rough: 0.45, side: THREE.DoubleSide }), 4, 80, 420);
  const hb = [0, 1, 2].map((i) => ({ x: ECO_OCEAN.SW.x - i * 14, z: ECO_OCEAN.SW.z + (i - 1) * 12, y: -8, cruiseY: ecoRand(-10, -6), yaw: 0, pitch: 0, roll: 0, v: 0, s: [1, 0.95, 0.9][i], ph: ECO_R(), slot: [[0, 0], [-16, 12], [-18, -10]][i], len: 13, turn: 0.18, state: 'cruise', breath: ecoRand(8, 30), breathEvery: 70, surfY: 0.9 }));
  const calf = { x: hb[1].x + 3, z: hb[1].z + 3, y: -7, cruiseY: -7, yaw: 0, pitch: 0, roll: 0, v: 0, s: 0.4, ph: ECO_R(), slot: [1.5, 5.5], follow: hb[1], len: 5.2, turn: 0.4, state: 'cruise', breath: 20, breathEvery: 30, surfY: 0.5 };
  zSW.whales.push(new EcoPod({ a: [...hb, calf], lod: hbLod, home: ECO_OCEAN.SW, range: 55, speed: 1.3, minFloor: 18, breach: true }));
  // ---- 北：大眼鲹鱼墙（密集银色，整体同步转向）+ 鲸鲨（独行，缓慢滤食） ----
  const zN = mk('oceanN', ECO_OCEAN.N);
  const trev = { len: 0.6, h: 0.22, w: 0.07, c1: 0x6f8494, c2: 0xe6ecee, fin: 0x3a4652, tail: 'fork', dorsal: 0.35, round: 0.7 };
  zN.flocks.push(new EcoFlock({ zone: 'ocean', n: 220, lod: ecoFishLod(scene, trev, 220, 18, 160, { freq: 7, amp: 0.05 }), mode: 'wall', home: { x: ECO_OCEAN.N.x + 30, y: -11, z: ECO_OCEAN.N.z + 4 }, range: 18, spawn: 5, speed: 1.1, maxSpeed: 2.6, per: 1.1, sep: 1.6, ali: 1.6, coh: 0.5, predators: () => predP(4), minDepth: 4, floorGap: 2, ceilGap: 2 }));
  const wsLod = new EcoLod(scene, [ecoWhaleGeo('shark', false), ecoWhaleGeo('shark', true)], ecoMat('swim', { freq: 1.0, amp: 0.9, rough: 0.5, side: THREE.DoubleSide }), 1, 60, 380);
  zN.whales.push(new EcoPod({ a: [{ x: ECO_OCEAN.N.x - 40, z: ECO_OCEAN.N.z + 2, y: -7, cruiseY: -6, yaw: 0, pitch: 0, roll: 0, v: 0, s: 1, ph: 0.3, slot: [0, 0], len: 10, turn: 0.12, state: 'cruise', breath: 1e9, breathEvery: 1e9, surfY: 1.5 }], lod: wsLod, home: { x: ECO_OCEAN.N.x - 30, z: ECO_OCEAN.N.z }, range: 40, speed: 0.8, minFloor: 14 }));
  for (const z of ['oceanS', 'oceanSE', 'oceanSW', 'oceanN']) ECO.zones[z].update = (dt, t) => { for (const w of ECO.zones[z].whales) { w.update(dt, t); w.draw(); } };
}
