// ======================= 11 第一人称漫游 =======================
function buildPerson() {
  const P = new THREE.Group();
  const skin = std(0xd6a07e, 0.62), shirt = std(0x9cc0d8, 0.85), shirtD = std(0x86aac4, 0.85), shorts = std(0xb9a27a, 0.88), belt = std(0x3a2b20, 0.6),
    shoe = std(0xf2f2ee, 0.6), sole = std(0x3a3a3a, 0.8), hair = std(0x1c1714, 0.75), eye = std(0x1a1512, 0.3), lip = std(0xb26d5e, 0.6);
  const mk = (g, m, x = 0, y = 0, z = 0, parent = P) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); parent.add(o); return o; };
  const lathe = (pts, seg = 16) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  // 躯干：胸-腰-臀轮廓（旋转体，前后略扁）
  const torso = mk(lathe([[0.0, 0.0], [0.16, 0.02], [0.17, 0.12], [0.155, 0.24], [0.175, 0.38], [0.2, 0.5], [0.19, 0.56], [0.08, 0.6], [0.0, 0.6]]), shirt, 0, 0.95); torso.scale.set(1, 1, 0.66);
  mk(new THREE.TorusGeometry(0.065, 0.018, 6, 14), shirtD, 0, 1.55, 0.01).rotation.x = Math.PI / 2;           // 领口
  for (let i = 0; i < 4; i++) mk(new THREE.SphereGeometry(0.008, 5, 4), std(0xf4f4f0, 0.4), 0, 1.48 - i * 0.09, 0.128);  // 纽扣
  const hips = mk(lathe([[0.0, 0.0], [0.17, 0.0], [0.175, 0.12], [0.16, 0.2], [0.0, 0.2]]), shorts, 0, 0.84); hips.scale.set(1, 1, 0.68);
  mk(new THREE.CylinderGeometry(0.162, 0.162, 0.04, 16), belt, 0, 1.02).scale.set(1, 1, 0.68);
  // 头颈：颈、下颌、头颅、鼻、耳、眼、眉、唇、短发
  mk(new THREE.CylinderGeometry(0.048, 0.055, 0.1, 10), skin, 0, 1.6);
  const Hd = new THREE.Group(); Hd.position.set(0, 1.64, 0); P.add(Hd);
  mk(new THREE.SphereGeometry(0.1, 20, 16), skin, 0, 0.12, 0, Hd).scale.set(0.92, 1.12, 1.02);
  mk(lathe([[0.0, 0.0], [0.05, 0.005], [0.075, 0.04], [0.085, 0.09], [0.0, 0.1]], 14), skin, 0, 0.02, 0.005, Hd).scale.set(1, 1, 1.05);
  const nose = mk(new THREE.ConeGeometry(0.016, 0.04, 6), skin, 0, 0.1, 0.1, Hd); nose.rotation.x = Math.PI / 2 + 0.25;
  for (const sx of [-1, 1]) {
    mk(new THREE.SphereGeometry(0.022, 8, 6), skin, sx * 0.092, 0.11, 0, Hd).scale.set(0.45, 1, 0.8);
    mk(new THREE.SphereGeometry(0.0105, 8, 6), eye, sx * 0.034, 0.135, 0.088, Hd);
    mk(new THREE.BoxGeometry(0.03, 0.006, 0.008), hair, sx * 0.035, 0.158, 0.092, Hd).rotation.z = -sx * 0.12;
  }
  mk(new THREE.BoxGeometry(0.03, 0.006, 0.008), lip, 0, 0.058, 0.094, Hd);
  const cap = mk(new THREE.SphereGeometry(0.106, 20, 12, 0, TAU, 0, Math.PI * 0.52), hair, 0, 0.14, -0.006, Hd); cap.scale.set(0.95, 1.08, 1.06);
  mk(new THREE.BoxGeometry(0.15, 0.03, 0.05), hair, 0, 0.215, 0.07, Hd).rotation.x = -0.35;
  // 手臂：短袖上臂 + 前臂（肘可弯）+ 手掌 + 拇指
  const arm = (sx) => {
    const A = new THREE.Group(); A.position.set(sx * 0.215, 1.5, 0); P.add(A);
    mk(new THREE.SphereGeometry(0.06, 10, 8), shirt, 0, 0, 0, A);
    const up = mk(new THREE.CylinderGeometry(0.058, 0.05, 0.16, 10), shirt, 0, -0.08, 0, A);
    mk(new THREE.CylinderGeometry(0.043, 0.04, 0.14, 10), skin, 0, -0.22, 0, A);
    const F = new THREE.Group(); F.position.set(0, -0.3, 0); A.add(F);
    mk(new THREE.SphereGeometry(0.038, 8, 6), skin, 0, 0, 0, F);
    mk(new THREE.CylinderGeometry(0.037, 0.03, 0.25, 10), skin, 0, -0.125, 0, F);
    mk(new THREE.BoxGeometry(0.05, 0.09, 0.028), skin, 0, -0.29, 0, F);
    const th = mk(new THREE.CylinderGeometry(0.009, 0.008, 0.045, 6), skin, 0, -0.27, 0.022, F); th.rotation.x = 0.6;
    A.rotation.z = sx * 0.06; return [A, F];
  };
  const [armL, foreL] = arm(-1), [armR, foreR] = arm(1);
  // 腿：短裤大腿 + 小腿（膝可弯）+ 运动鞋
  const leg = (sx) => {
    const Lg = new THREE.Group(); Lg.position.set(sx * 0.095, 0.9, 0); P.add(Lg);
    mk(new THREE.CylinderGeometry(0.085, 0.07, 0.3, 12), shorts, 0, -0.15, 0, Lg);
    mk(new THREE.CylinderGeometry(0.062, 0.056, 0.14, 12), skin, 0, -0.35, 0, Lg);
    const K = new THREE.Group(); K.position.set(0, -0.43, 0); Lg.add(K);
    mk(new THREE.SphereGeometry(0.056, 10, 8), skin, 0, 0, 0, K);
    mk(new THREE.CylinderGeometry(0.054, 0.038, 0.4, 12), skin, 0, -0.2, 0, K);
    mk(new THREE.BoxGeometry(0.1, 0.07, 0.26), shoe, 0, -0.43, 0.04, K); mk(new THREE.BoxGeometry(0.105, 0.025, 0.27), sole, 0, -0.468, 0.04, K);
    return [Lg, K];
  };
  const [legL, shinL] = leg(-1), [legR, shinR] = leg(1);
  P.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  P.userData = { legL, legR, armL, armR, shinL, shinR, foreL, foreR, head: Hd };
  return P;
}
function setupFP(ctx) {
  const { scene, camera, controls, renderer } = ctx;
  const EYE = 1.68, PR = 0.32, WALK = 4.2, RUN = 11, SWIM = 1.9, SWIM_FAST = 3.2, GRAV = 22, JUMP = 7;
  const START = { x: 181.3, z: -35.5, yaw: Math.PI };   // 出生点：别墅南门外 3.5 m（避开门边立柱），面朝正南
  const person = buildPerson(); person.visible = false; person.rotation.order = 'YXZ'; scene.add(person);
  const st = { drag: false, dragging: false, touchMove: null, touchLook: null, on: false, third: false, yaw: 0, pitch: 0,
    pos: new THREE.Vector3(), feet: 0, vy: 0, grounded: true, phase: 0, mode: 'walk', keys: new Set(), saved: null, stuckT: 0 };
  // ---- 碰撞数据：固定实体 + 各构件登记 ----
  const rects = COLL.rects.slice(), circles = COLL.circles, segs = COLL.segs;
  const R_ = (x, z, hw, hd, rot = 0, top = 1e9, bottom = -1e9) => rects.push({ x, z, hw, hd, rot, top, bottom });
  R_(L.dorm.x, L.dorm.z, 15.5, 10.5);
  R_(L.barn.x, L.barn.z, 13.3, 6.3);
  const gh0 = L.greenhouses; for (let i = 0; i < gh0.n; i++) R_(gh0.x0 + i * (gh0.w + gh0.gap) + gh0.w / 2, gh0.z0 + gh0.len / 2, gh0.w / 2 + 0.2, gh0.len / 2 + 0.2);
  for (const pen of [L.pig, L.chicken]) R_(pen.x, pen.z, pen.w / 2 + 0.1, pen.d / 2 + 0.1);
  for (const t of L.turbines) circles.push({ x: t[0], z: t[1], r: 1.0 });
  const tw = 16 * 1.134; for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) R_(251 + c * (tw + 1.4) + tw / 2, L.solar.z0 + 4 + r * 6.6, tw / 2, 2.3);
  R_(L.pwEast.x, L.pwEast.z, 0.5, 3.6, 0); R_(L.pwWest.x, L.pwWest.z, 3.6, 0.5, -0.35);
  // 空间哈希
  const CELL = 8, hash = new Map();
  const key = (i, j) => i * 100003 + j;
  const put = (o, x0, z0, x1, z1) => { for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) { const k = key(i, j); if (!hash.has(k)) hash.set(k, []); hash.get(k).push(o); } };
  circles.forEach(c => { c.t = 'c'; put(c, c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r); });
  rects.forEach(r => { r.t = 'r'; const e = Math.hypot(r.hw, r.hd); put(r, r.x - e, r.z - e, r.x + e, r.z + e); });
  segs.forEach(g => { g.t = 's'; put(g, Math.min(g.ax, g.bx), Math.min(g.az, g.bz), Math.max(g.ax, g.bx), Math.max(g.az, g.bz)); });
  function near(x, z) { const out = new Set(), i0 = Math.floor((x - 2) / CELL), i1 = Math.floor((x + 2) / CELL), j0 = Math.floor((z - 2) / CELL), j1 = Math.floor((z + 2) / CELL); for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const l = hash.get(key(i, j)); if (l) l.forEach(o => out.add(o)); } return out; }
  // ---- 水体与可行走面 ----
  const POOL = { x: 180, z: -58.6, hw: 7.3, hd: 2.25, level: 11.47, bottom: 9.95 };
  function waterAt(x, z) {
    if (Math.abs(x - POOL.x) < POOL.hw && Math.abs(z - POOL.z) < POOL.hd) return { level: POOL.level, bottom: POOL.bottom, pool: true };
    const h = gh(x, z);
    if (lakeSD(x, z, L.upperLake, 0.12) > -0.8 && h < L.upperLake.level) return { level: L.upperLake.level, bottom: h };
    if (lakeSD(x, z, L.lake, 0.1) > -0.8 && h < L.lake.level) return { level: L.lake.level, bottom: h };
    if (h < 0) return { level: 0, bottom: h };
    return null;
  }
  let lastDeck = false;
  function floorAt(x, z, feet) {
    lastDeck = false;
    const w = waterAt(x, z); if (w && w.pool) return w.bottom;
    let f = gh(x, z);
    st.onBoatCand = false;
    for (const s of (DYN.walks.length && st.onBoat ? COLL.walks.concat(DYN.walks) : COLL.walks)) {
      if (s.cond && !s.cond()) continue;
      let y = null;
      if (s.kind === 'poly') { if (pointInPoly(x, z, s.pts) && !(s.holes || []).some(h => pointInPoly(x, z, h))) y = s.y; }
      if (s.kind === 'rect') { if (rectSD(x, z, s.x, s.z, s.hw, s.hd, s.rot) < 0) y = s.y; }
      else if (s.kind === 'ramp') { const [d, t] = segDist(x, z, s.x0, s.z0, s.x1, s.z1); const along = ((x - s.x0) * (s.x1 - s.x0) + (z - s.z0) * (s.z1 - s.z0)) / Math.max(1e-6, (s.x1 - s.x0) ** 2 + (s.z1 - s.z0) ** 2); if (d < s.hw && along >= -0.02 && along <= 1.02) y = lerp(s.y0, s.y1, clamp(along, 0, 1)); }
      else {
        const P = s.pts;
        if (Math.abs(x - P[0].x) > 260 && Math.abs(x - P[P.length - 1].x) > 260) continue;
        for (let i = 1; i < P.length; i++) { const [d, t] = segDist(x, z, P[i - 1].x, P[i - 1].z, P[i].x, P[i].z); if (d < s.hw) { y = lerp(P[i - 1].y, P[i].y, t); break; } }
      }
      if (y !== null && y > f && y <= feet + 0.65) { f = y; lastDeck = true; st.onBoatCand = !!s.boat; }
      if (s.kind === 'ramp' && y !== null && y > f - 0.5 && y <= feet + 0.65) { f = Math.max(f, y); lastDeck = true; }
    }
    return f;
  }
  const cross = (ax, az, bx, bz, cx, cz, dx, dz) => { const d = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx); if (Math.abs(d) < 1e-9) return false; const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / d, u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / d; return t >= 0 && t <= 1 && u >= 0 && u <= 1; };
  // 单步移动：地形/水体可达性 + 线段不可穿越
  function canStep(x0, z0, x1, z1, feet, swimming) {
    // 陆地漫游边界；在船上时不限制（游艇巡航会驶出该范围，否则人在船上寸步难行）
    if (!st.onBoat && (x1 < -372 || x1 > 372 || z1 < -222 || z1 > 222)) return false;
    if (st.onBoat) for (const o of DYN.segs) if (inBand(o, feet) && cross(x0, z0, x1, z1, o.ax, o.az, o.bx, o.bz)) return false;
    for (const o of near(x1, z1)) if (o.t === 's' && inBand(o, feet) && cross(x0, z0, x1, z1, o.ax, o.az, o.bx, o.bz)) return false;
    const f = floorAt(x1, z1, feet), d = Math.hypot(x1 - x0, z1 - z0) + 1e-6;
    const w = waterAt(x1, z1);
    if (swimming) { const lvl = w ? w.level : (waterAt(x0, z0) || { level: feet }).level; return f <= lvl + 1.1; }
    if (w && w.level - f > 0.3) return true;                          // 下水：总是允许
    if (lastDeck) return f - feet <= 0.65;                               // 登上栈道/平台
    return f - feet <= 0.06 + d * 0.9;                                 // 约 42° 以上的坡不可攀
  }
  // 推出：圆柱与矩形
  const inBand = (o, feet) => (!o.cond || o.cond()) && feet <= (o.top === undefined ? 1e9 : o.top) && feet >= (o.bottom === undefined ? -1e9 : o.bottom);
  function pushOut(p, feet) {
    let hit = false;
    for (let it = 0; it < 3; it++) {
      let moved = false;
      for (const o of near(p.x, p.z)) {
        if (!inBand(o, feet)) continue;
        if (o.t === 'c') {
          const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), m = o.r + PR;
          if (d < m) { const n = d > 1e-4 ? 1 / d : 0; p.x = o.x + (d > 1e-4 ? dx * n : 1) * m; p.z = o.z + (d > 1e-4 ? dz * n : 0) * m; moved = hit = true; }
        } else if (o.t === 'r') {
          const c = Math.cos(o.rot), s = Math.sin(o.rot), dx = p.x - o.x, dz = p.z - o.z;
          let lx = c * dx - s * dz, lz = s * dx + c * dz;
          const ex = o.hw + PR - Math.abs(lx), ez = o.hd + PR - Math.abs(lz);
          if (ex > 0 && ez > 0) {
            if (ex < ez) lx = Math.sign(lx || 1) * (o.hw + PR); else lz = Math.sign(lz || 1) * (o.hd + PR);
            p.x = o.x + c * lx + s * lz; p.z = o.z - s * lx + c * lz; moved = hit = true;
          }
        } else if (o.t === 's') {
          const [d, t] = segDist(p.x, p.z, o.ax, o.az, o.bx, o.bz);
          if (d < PR * 0.8 && d > 1e-4) { const qx = o.ax + (o.bx - o.ax) * t, qz = o.az + (o.bz - o.az) * t; p.x = qx + (p.x - qx) / d * PR * 0.8; p.z = qz + (p.z - qz) / d * PR * 0.8; moved = hit = true; }
        }
      }
      for (const o of DYN.rects) { if (!inBand(o, feet)) continue; const c = Math.cos(o.rot), sn = Math.sin(o.rot), dx = p.x - o.x, dz = p.z - o.z; let lx = c * dx - sn * dz, lz = sn * dx + c * dz; const ex = o.hw + PR - Math.abs(lx), ez = o.hd + PR - Math.abs(lz); if (ex > 0 && ez > 0) { if (ex < ez) lx = Math.sign(lx || 1) * (o.hw + PR); else lz = Math.sign(lz || 1) * (o.hd + PR); p.x = o.x + c * lx + sn * lz; p.z = o.z - sn * lx + c * lz; moved = hit = true; } }
      for (const car of DRIVE.cars) {   // 车辆（可移动的定向矩形）
        const c = Math.cos(car.yaw), sn = Math.sin(car.yaw), dx = p.x - car.x, dz = p.z - car.z; let lx = c * dx - sn * dz, lz = sn * dx + c * dz;
        const hl = car.sp.L / 2 + PR, hw = car.sp.W / 2 + PR, ex = hl - Math.abs(lx), ez = hw - Math.abs(lz);
        if (ex > 0 && ez > 0) { if (ex < ez) lx = Math.sign(lx || 1) * hl; else lz = Math.sign(lz || 1) * hw; p.x = car.x + c * lx + sn * lz; p.z = car.z - sn * lx + c * lz; moved = hit = true; }
      }
      for (const a of ANIMALS) if (a.coll) { const dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz), m = a.coll + PR; if (d < m && d > 1e-4) { p.x = a.x + dx / d * m; p.z = a.z + dz / d * m; moved = hit = true; } }
      if (!moved) break;
    }
    return hit;
  }
  // ---- 界面 ----
  const gate = document.getElementById('fpgate'), hud = document.getElementById('fphud'), cvs = renderer.domElement;
  function toStart() { st.pos.set(START.x, 0, START.z); st.feet = floorAt(START.x, START.z, gh(START.x, START.z) + 0.5); st.yaw = START.yaw; st.pitch = -0.12; st.vy = 0; st.mode = 'walk'; st.grounded = true; }
  function enter(auto) {
    if (!st.on) { st.saved = { pos: camera.position.clone(), tgt: controls.target.clone() }; toStart(); }
    st.on = true; controls.enabled = false;
    camera.near = 0.12; camera.far = 8000; camera.fov = 70; camera.updateProjectionMatrix();
    document.body.classList.add('fp');
    if (auto) gate.classList.remove('show');
  }
  function exit() {
    st.on = false; controls.enabled = true; person.visible = false; st.keys.clear();
    camera.near = 3; camera.far = 20000; camera.fov = 30; camera.updateProjectionMatrix();
    document.body.classList.remove('fp'); gate.classList.remove('show');
    if (document.pointerLockElement) document.exitPointerLock();
    if (st.saved) { camera.position.copy(st.saved.pos); controls.target.copy(st.saved.tgt); controls.update(); }
  }
  function startRoam() {
    gate.classList.remove('show'); st.drag = false;
    try { const r = cvs.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) { }
    setTimeout(() => { if (document.pointerLockElement !== cvs && st.on) st.drag = true; }, 450);
  }
  document.addEventListener('pointerlockchange', () => { const locked = document.pointerLockElement === cvs; if (st.on && !st.drag) gate.classList.toggle('show', !locked); if (!locked) st.keys.clear(); });
  document.addEventListener('pointerlockerror', () => { if (st.on) { st.drag = true; gate.classList.remove('show'); } });
  document.getElementById('fpgo').onclick = (e) => { e.stopPropagation(); startRoam(); };
  document.getElementById('fpback').onclick = (e) => { e.stopPropagation(); exit(); };
  document.getElementById('fpreset').onclick = (e) => { e.stopPropagation(); toStart(); startRoam(); };
  cvs.addEventListener('mousedown', () => { if (st.on && st.drag) st.dragging = true; });
  window.addEventListener('mouseup', () => { st.dragging = false; });
  document.addEventListener('mousemove', (e) => {
    if (!st.on) return;
    if (document.pointerLockElement !== cvs && !(st.drag && st.dragging)) return;
    st.yaw -= e.movementX * 0.0022; st.pitch = clamp(st.pitch - e.movementY * 0.0022, -1.45, 1.35);
  });
  window.addEventListener('keydown', (e) => {
    if (!st.on) return;
    if (e.code === 'Escape' && st.drag) { gate.classList.add('show'); st.keys.clear(); return; }
    st.keys.add(e.code);
    if (e.code === 'Space' && st.grounded && st.mode === 'walk') { st.vy = JUMP; st.grounded = false; }
    if (e.code === 'KeyV' && !DRIVE.active) st.third = !st.third;
    if (e.code === 'KeyR') toStart();
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => st.keys.delete(e.code));
  cvs.addEventListener('touchstart', (e) => {
    if (!st.on) return; gate.classList.remove('show');
    for (const t of e.changedTouches) { if (t.clientX < window.innerWidth / 2 && !st.touchMove) st.touchMove = { id: t.identifier, x0: t.clientX, y0: t.clientY, dx: 0, dy: 0 }; else if (!st.touchLook) st.touchLook = { id: t.identifier, x: t.clientX, y: t.clientY }; }
    e.preventDefault();
  }, { passive: false });
  cvs.addEventListener('touchmove', (e) => {
    if (!st.on) return;
    for (const t of e.changedTouches) {
      if (st.touchMove && t.identifier === st.touchMove.id) { st.touchMove.dx = t.clientX - st.touchMove.x0; st.touchMove.dy = t.clientY - st.touchMove.y0; }
      if (st.touchLook && t.identifier === st.touchLook.id) { st.yaw -= (t.clientX - st.touchLook.x) * 0.005; st.pitch = clamp(st.pitch - (t.clientY - st.touchLook.y) * 0.005, -1.45, 1.35); st.touchLook.x = t.clientX; st.touchLook.y = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  const tend = (e) => { for (const t of e.changedTouches) { if (st.touchMove && t.identifier === st.touchMove.id) st.touchMove = null; if (st.touchLook && t.identifier === st.touchLook.id) st.touchLook = null; } };
  cvs.addEventListener('touchend', tend); cvs.addEventListener('touchcancel', tend);
  // ---- 座位：坐下 / 躺下 ----
  function sitDown(seat) { if (seat.boat) st.onBoat = true; st.seat = seat; st.seatStand = { x: st.pos.x, z: st.pos.z, feet: st.feet }; st.yaw = seat.yaw; st.pitch = seat.type === 'lie' ? 0.9 : -0.05; st.keys.clear(); }
  function standUp() { if (!st.seat) return; const sv = st.seat, s0 = sv.boat ? { x: sv.x - Math.sin(sv.yaw) * (sv.type === 'lie' ? 1.3 : 0.8), z: sv.z - Math.cos(sv.yaw) * (sv.type === 'lie' ? 1.3 : 0.8), feet: sv.y - (sv.type === 'lie' ? 0.62 : 0.45) } : st.seatStand; if (sv.boat) st.onBoat = true; st.seat = null; st.pos.x = s0.x; st.pos.z = s0.z; st.feet = s0.feet; st.vy = 0; st.grounded = true; st.pitch = -0.1; }
  for (const seat of SEATS) INTERACT.push({ x: seat.x, z: seat.z, r: seat.type === 'lie' ? 1.8 : 1.35, y: seat.y - (seat.type === 'lie' ? 0.45 : 0.5), label: seat.type === 'lie' ? '躺下休息' : '坐下', fn: () => sitDown(seat) });
  // ---- 传送、交互、小地图 ----
  const baseRef = (x, z) => Math.max(gh(x, z), 0) + 1.0;
  function teleport(x, z, yaw, y, boat = false) { st.onBoat = boat; st.pos.x = x; st.pos.z = z; st.feet = y !== undefined ? y : floorAt(x, z, baseRef(x, z)); st.vy = 0; st.mode = 'walk'; st.grounded = true; if (yaw !== undefined) st.yaw = yaw; st.pitch = -0.1; }
  // 三座塔：传送到顶层观察室外的环廊（宽 0.75 m），取最朝外海的一面，站在环廊中线上面朝外海（默认为岛心指向塔的方向）
  // 参数与 06_struct_b 中各塔一致：[名称, 塔心, 塔体旋转, 观察室半宽, 顶层地面高]
  function towerTP() {
    // 闸口警戒塔在出海峡谷东岸，“岛心→塔”方向正对峡谷东坡，改为朝峡谷出海口 (0, 300) 看出去
    return [['东峰瞭望塔', L.eastTower, -0.38, 2.2, L.summitPad.h + 20.725], ['西部瞭望塔', L.westTower, 0.3, 1.7, 32.625], ['闸口警戒塔', L.gateTower, 0, 1.8, 13.325, { x: 0, z: 300 }]].map(([name, c, rot, hw, y, sea]) => {
      const ex = sea ? sea.x - c.x : c.x, ez = sea ? sea.z - c.z : c.z, d = Math.hypot(ex, ez), dx = ex / d, dz = ez / d, co = Math.cos(rot), si = Math.sin(rot);
      const ux = dx * co - dz * si, uz = dx * si + dz * co, r = hw + TOWER_RING / 2;     // 外海方向换到塔的局部坐标，选主轴所在的一面；站在外圈走道中线
      const lx = Math.abs(ux) >= Math.abs(uz) ? Math.sign(ux) * r : 0, lz = Math.abs(ux) >= Math.abs(uz) ? 0 : Math.sign(uz) * r;
      return [name, c.x + lx * co + lz * si, c.z - lx * si + lz * co, Math.atan2(-dx, -dz), y];
    });
  }
  const TP = [
    ['湖畔泳池', 175.3, -55.4, 0], ['别墅南门', START.x, START.z, START.yaw], ['登岸浮台', 60, 87, Math.PI / 2], ['港口沙滩', 0, 20, Math.PI],
    ['西山机场', -228, -98, 0.9], ...towerTP(), ['山上湖泊', L.upperLake.x, L.upperLake.z + L.upperLake.b + 2.2, 0], ['农业区', -40, -8, 0], ['宿舍楼', 14.7, -132.0, Math.PI, 13.91],
  ];
  const tpBox = document.getElementById('fptp');
  for (const t of TP) { const b = document.createElement('button'); b.type = 'button'; b.textContent = t[0]; b.onclick = (e) => { e.stopPropagation(); teleport(t[1], t[2], t[3], t[4]); startRoam(); }; tpBox.appendChild(b); }
  const prompt = document.getElementById('fpprompt'), xyz = document.getElementById('fpxyz'); let act = null;
  function findInteract() {
    act = null; let best = 1e9;
    for (const it of (DYN.interact.length ? INTERACT.concat(DYN.interact) : INTERACT)) { const d = Math.hypot(st.pos.x - it.x, st.pos.z - it.z); const fy = it.y !== undefined ? it.y : gh(it.x, it.z); if (d < it.r && d < best && Math.abs(st.feet - fy) < 1.8) { best = d; act = it; } }
    prompt.textContent = act ? '按 E ' + (typeof act.label === 'function' ? act.label() : act.label) : ''; prompt.style.opacity = act ? 1 : 0;
  }
  window.addEventListener('keydown', (e) => { if (DRIVE.active === HELI) { if (e.code === 'KeyG') heliAutoToggle(); if (e.code === 'KeyV') DRIVE.cam = DRIVE.cam === 'chase' ? 'seat' : 'chase'; if (e.code === 'KeyE' && HELI.ground && !HELI.auto) { DRIVE.active = null; document.body.classList.remove('driving'); const s0 = Math.sin(HELI.yaw), c0 = Math.cos(HELI.yaw); teleport(HELI.x + s0 * 2.2, HELI.z + c0 * 2.2, HELI.yaw, HELI.y + 0.02); } return; }
  if (st.seat && st.on) { if (e.code === 'KeyE' || ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) { standUp(); e.stopImmediatePropagation && null; } return; } if (DRIVE.active) { if (e.code === 'KeyC' && DRIVE.active === BOAT) { startCruise(); return; } if (e.code === 'KeyH' && DRIVE.active === BOAT) { boatHorn(); return; } if (e.code === 'KeyE') exitCar({ teleport }); if (e.code === 'KeyV') DRIVE.cam = DRIVE.cam === 'chase' ? 'seat' : 'chase'; return; } if (st.on && e.code === 'KeyE' && act) { if (act.fn) act.fn(); else { const g = act.go; teleport(g.x, g.z, g.yaw, g.y); } } if (st.on && e.code === 'KeyC' && act && act.cruise && st.mode !== 'swim') act.cruise(); if (st.on && e.code === 'KeyM') st.mapR = st.mapR === 150 ? 400 : 150; });
  st.mapR = 150;
  const mm = document.getElementById('minimap'), mctx = mm.getContext('2d');
  let mapBase = null, lastMap = 0;
  function mapDraw(t) {
    if (!mapBase || t - lastMap < 0.1) return; lastMap = t;
    const S = mm.width, R = st.mapR, k = S / (2 * R);
    mctx.clearRect(0, 0, S, S); mctx.save(); mctx.beginPath(); mctx.arc(S / 2, S / 2, S / 2 - 1, 0, TAU); mctx.clip();
    mctx.fillStyle = '#123a52'; mctx.fillRect(0, 0, S, S);
    mctx.drawImage(mapBase, st.pos.x - R - TX.x0, st.pos.z - R - TX.z0, 2 * R, 2 * R, 0, 0, S, S);
    mctx.fillStyle = 'rgba(255,255,255,0.9)'; mctx.font = '10px sans-serif';
    for (const tp of TP) { const x = (tp[1] - st.pos.x) * k + S / 2, y = (tp[2] - st.pos.z) * k + S / 2; if (x < 0 || y < 0 || x > S || y > S) continue; mctx.beginPath(); mctx.arc(x, y, 2.5, 0, TAU); mctx.fill(); }
    const mk = (x, z, yaw, len, wid, colr) => { const px = (x - st.pos.x) * k + S / 2, py = (z - st.pos.z) * k + S / 2; if (px < -20 || py < -20 || px > S + 20 || py > S + 20) return; mctx.save(); mctx.translate(px, py); mctx.rotate(-yaw); mctx.fillStyle = colr; mctx.strokeStyle = 'rgba(10,20,26,.8)'; mctx.lineWidth = 1; const l = Math.max(4, len * k), w = Math.max(2.5, wid * k); mctx.beginPath(); mctx.moveTo(l / 2, 0); mctx.lineTo(l / 4, -w / 2); mctx.lineTo(-l / 2, -w / 2); mctx.lineTo(-l / 2, w / 2); mctx.lineTo(l / 4, w / 2); mctx.closePath(); mctx.fill(); mctx.stroke(); mctx.restore(); };
    mk(BOAT.x, BOAT.z, BOAT.yaw, 50, 9.2, '#f4f6f6');
    for (const c of DRIVE.cars) mk(c.x, c.z, c.yaw, c.sp.L, c.sp.W, '#c9d0d4');
    if (typeof HELI !== 'undefined' && HELI.x !== undefined) mk(HELI.x, HELI.z, HELI.yaw, 12.9, 3, '#f2c230');
    mctx.translate(S / 2, S / 2); mctx.rotate(Math.atan2(-Math.cos(st.yaw), -Math.sin(st.yaw)));
    mctx.fillStyle = '#c4df94'; mctx.strokeStyle = '#0c1c24'; mctx.lineWidth = 1.5; mctx.beginPath(); mctx.moveTo(9, 0); mctx.lineTo(-6, 6); mctx.lineTo(-3, 0); mctx.lineTo(-6, -6); mctx.closePath(); mctx.fill(); mctx.stroke();
    mctx.restore(); mctx.strokeStyle = 'rgba(226,238,232,0.35)'; mctx.lineWidth = 1; mctx.beginPath(); mctx.arc(S / 2, S / 2, S / 2 - 1, 0, TAU); mctx.stroke();
    mctx.fillStyle = 'rgba(232,239,236,0.8)'; mctx.font = '10px sans-serif'; mctx.textAlign = 'center'; mctx.fillText('北', S / 2, 12); mctx.fillText(R + ' 米', S / 2, S - 6);
    // 坐标：与程序内坐标一致（x 东、z 南、y 上；步行时 y 为脚底高度，即 teleport(x, z, yaw, y) 的参数；驾驶时为载具坐标）。朝向按罗盘方位，0° 为正北
    const V = DRIVE.active, cx = V ? V.x : st.pos.x, cy = V ? V.y : st.feet, cz = V ? V.z : st.pos.z, cyaw = V && V.yaw !== undefined ? V.yaw - Math.PI / 2 : st.yaw;
    xyz.textContent = `X ${cx.toFixed(1)}  Y ${cy.toFixed(2)}  Z ${cz.toFixed(1)}\n朝向 ${Math.round(((-cyaw * 180 / Math.PI) % 360 + 360) % 360)}°`;
  }
  function setMapBase(img) { mapBase = img; }
  // ---- 每帧更新 ----
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), tmp = { x: 0, z: 0 };
  function update(dt) {
    if (!st.on) return false;
    if (st.seat) {                                              // 坐/躺：固定身体，只转动视线
      const sv = st.seat, f = new THREE.Vector3(-Math.sin(sv.yaw), 0, -Math.cos(sv.yaw)), u = person.userData;
      person.rotation.order = 'YXZ'; person.rotation.y = sv.yaw + Math.PI;
      if (sv.type === 'lie') {
        person.rotation.x = -Math.PI / 2; person.position.set(sv.x + f.x * 0.9, sv.y + 0.13, sv.z + f.z * 0.9);
        for (const k of ['legL', 'legR', 'shinL', 'shinR']) u[k].rotation.x = 0; u.armL.rotation.x = u.armR.rotation.x = 0.15; u.foreL.rotation.x = u.foreR.rotation.x = -0.2;
        camera.position.set(sv.x - f.x * 0.55, sv.y + 0.42, sv.z - f.z * 0.55);
      } else {
        person.rotation.x = 0; person.position.set(sv.x - f.x * 0.12, sv.y + 0.02 - 0.9, sv.z - f.z * 0.12);
        u.legL.rotation.x = u.legR.rotation.x = -1.45; u.shinL.rotation.x = u.shinR.rotation.x = 1.5; u.armL.rotation.x = u.armR.rotation.x = -0.35; u.foreL.rotation.x = u.foreR.rotation.x = -0.7;
        camera.position.set(sv.x - f.x * 0.1, sv.y + 0.76, sv.z - f.z * 0.1);
      }
      person.visible = st.third;
      if (st.third) { const back = new THREE.Vector3(Math.sin(st.yaw), 0.35, Math.cos(st.yaw)).multiplyScalar(3.2); camera.position.set(sv.x, sv.y + 0.9, sv.z).add(back); }
      camera.rotation.order = 'YXZ'; camera.rotation.set(st.pitch, st.yaw, 0);
      st.pos.set(sv.x, sv.y + 0.8, sv.z);
      hud.textContent = `${sv.type === 'lie' ? '躺着休息' : '坐着'}  按 E 或移动键起身`; prompt.textContent = ''; prompt.style.opacity = 0;
      return true;
    }
    const k = st.keys, fast = k.has('ShiftLeft') || k.has('ShiftRight');
    let mf = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let ms = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    if (st.touchMove) { mf = clamp(-st.touchMove.dy / 60, -1, 1); ms = clamp(st.touchMove.dx / 60, -1, 1); }
    fwd.set(-Math.sin(st.yaw), 0, -Math.cos(st.yaw)); right.set(Math.cos(st.yaw), 0, -Math.sin(st.yaw));
    const mv = new THREE.Vector3().addScaledVector(fwd, mf).addScaledVector(right, ms);
    const moving = mv.lengthSq() > 0;
    const w0 = waterAt(st.pos.x, st.pos.z), depth0 = w0 ? w0.level - floorAt(st.pos.x, st.pos.z, st.feet) : 0;
    const swimming = st.mode === 'swim';
    const speed = swimming ? (fast ? SWIM_FAST : SWIM) : (fast ? RUN : WALK) * (w0 && depth0 > 0.35 ? 0.5 : 1);
    if (moving) {
      mv.normalize().multiplyScalar(speed * dt);
      const n = Math.max(1, Math.ceil(mv.length() / 0.25)), sx = mv.x / n, sz = mv.z / n;
      for (let i = 0; i < n; i++) {
        const x0 = st.pos.x, z0 = st.pos.z;
        if (canStep(x0, z0, x0 + sx, z0 + sz, st.feet, swimming)) { st.pos.x += sx; st.pos.z += sz; }
        else if (canStep(x0, z0, x0 + sx, z0, st.feet, swimming)) st.pos.x += sx;
        else if (canStep(x0, z0, x0, z0 + sz, st.feet, swimming)) st.pos.z += sz;
        tmp.x = st.pos.x; tmp.z = st.pos.z; pushOut(tmp, st.feet);
        if (canStep(st.pos.x, st.pos.z, tmp.x, tmp.z, st.feet, swimming) || Math.hypot(tmp.x - st.pos.x, tmp.z - st.pos.z) < 0.05) { st.pos.x = tmp.x; st.pos.z = tmp.z; }
        else { st.pos.x = x0; st.pos.z = z0; }   // 推出点不可达（如陡坡上的礁石）：退回本步起点，避免嵌进实心体
      }
      st.phase += dt * (swimming ? 4 : fast ? 11 : 7.5);
    } else { tmp.x = st.pos.x; tmp.z = st.pos.z; pushOut(tmp, st.feet); st.pos.x = tmp.x; st.pos.z = tmp.z; }
    // 竖向：水体状态机
    const floor = floorAt(st.pos.x, st.pos.z, st.feet), w0w = waterAt(st.pos.x, st.pos.z), w = (st.onBoatCand && floor > (w0w ? w0w.level : -99) - 1.2) ? null : w0w;
    st.onBoat = st.onBoatCand && st.feet - floor < 0.6 || (st.onBoat && st.onBoatCand);
    const depth = w ? w.level - floor : 0;
    if (w && depth > 1.45) {                                          // 水面没过头部附近：游泳
      st.mode = 'swim'; st.grounded = false;
      const diving = (k.has('KeyC') || k.has('ControlLeft'));
      const target = diving ? Math.max(w.bottom + 0.3, w.level - 6) : w.level - 1.42;   // 默认头部露出水面；按住 C 下潜
      st.diving = diving;
      if (st.feet > target + 0.05) { st.vy -= GRAV * 0.35 * dt; st.feet += st.vy * dt; if (st.feet < target) { st.feet = target; st.vy = 0; } }
      else { st.feet += clamp(target - st.feet, -2.2 * dt, 1.6 * dt); st.vy = 0; }
      if (st.feet < floor) { st.feet = floor; st.vy = 0; }             // 潜游横移到抬升的海底斜坡时不嵌入水底
    } else {
      if (st.mode === 'swim') { st.feet = Math.max(st.feet, floor); st.vy = 0; }
      st.mode = 'walk';
      st.vy -= GRAV * dt; st.feet += st.vy * dt;
      if (st.feet <= floor) { st.feet = floor; st.vy = 0; st.grounded = true; }
      else if (st.grounded && st.feet - floor < 0.5 && st.vy <= 0) { st.feet = floor; st.vy = 0; }
      else if (st.feet - floor > 0.3) st.grounded = false;
    }
    // 卡住保护：持续按键却原地不动，自动向开阔方向脱困
    if (moving && st.grounded) {
      const ins = [...near(st.pos.x, st.pos.z)].some(o => inBand(o, st.feet) && (o.t === 'r' && rectSD(st.pos.x, st.pos.z, o.x, o.z, o.hw, o.hd, o.rot) < -0.05) || (o.t === 'c' && Math.hypot(st.pos.x - o.x, st.pos.z - o.z) < o.r - 0.05));
      st.stuckT = ins ? st.stuckT + dt : 0;
      if (st.stuckT > 1.2) { toStart(); st.stuckT = 0; }
    }
    st.pos.y = st.feet + EYE;
    // ---- 角色姿态 ----
    const u = person.userData, swimNow = st.mode === 'swim';
    person.rotation.y = st.yaw + Math.PI;
    if (swimNow) {
      person.rotation.x = 1.3;
      const lvl = w ? w.level : st.feet + 1.42;
      person.position.set(st.pos.x - fwd.x * 1.65, Math.min(lvl - 0.44, st.feet + 1.0), st.pos.z - fwd.z * 1.65);
      const ph = st.phase;
      u.armL.rotation.x = ph % TAU; u.armR.rotation.x = (ph + Math.PI) % TAU;
      u.legL.rotation.x = Math.sin(ph * 3) * 0.25; u.legR.rotation.x = -Math.sin(ph * 3) * 0.25; u.shinL.rotation.x = u.shinR.rotation.x = 0.1; u.foreL.rotation.x = u.foreR.rotation.x = 0;
    } else {
      person.rotation.x = 0;
      person.position.set(st.pos.x, st.feet, st.pos.z);
      const sw = moving && st.grounded ? Math.sin(st.phase) * (fast ? 0.75 : 0.45) : 0;
      u.legL.rotation.x = sw; u.legR.rotation.x = -sw; u.armL.rotation.x = -sw * 0.8; u.armR.rotation.x = sw * 0.8;
      const ph2 = st.phase, amp = moving && st.grounded ? (fast ? 1.1 : 0.7) : 0;
      u.shinL.rotation.x = Math.max(0, -Math.sin(ph2 - 0.6)) * amp; u.shinR.rotation.x = Math.max(0, Math.sin(ph2 - 0.6)) * amp;
      u.foreL.rotation.x = -0.25 - (fast ? 0.9 : 0.35) * (moving ? 1 : 0); u.foreR.rotation.x = -0.25 - (fast ? 0.9 : 0.35) * (moving ? 1 : 0);
    }
    person.visible = st.third && !(DRIVE.active && DRIVE.active !== BOAT);
    camera.rotation.order = 'YXZ';
    const eyeY = swimNow ? (w ? Math.min(w.level + 0.26 + Math.sin(st.phase * 2) * 0.03, st.feet + 1.68) : st.pos.y) : st.pos.y + (st.grounded && moving ? Math.sin(st.phase * 2) * 0.035 : 0);
    if (st.third) {
      const back = new THREE.Vector3(Math.sin(st.yaw) * Math.cos(st.pitch), -Math.sin(st.pitch), Math.cos(st.yaw) * Math.cos(st.pitch)).multiplyScalar(3.6);
      const c = new THREE.Vector3(st.pos.x, (swimNow ? eyeY : st.pos.y) + 0.55, st.pos.z).add(back).add(right.clone().multiplyScalar(0.7));
      c.y = Math.max(c.y, gh(c.x, c.z) + 0.6, w ? w.level + 0.5 : -99);
      camera.position.copy(c);
    } else camera.position.set(st.pos.x, eyeY, st.pos.z);
    camera.rotation.set(st.pitch, st.yaw, 0);
    findInteract();
    const modeTxt = swimNow ? (st.diving ? '潜水' : fast ? '快速游泳' : '游泳') : (w && depth > 0.35 ? '涉水' : (fast ? '奔跑' : '步行'));
    const cr = BOAT.auto ? `  【自动巡航：${(BOAT.auto.plan[BOAT.auto.i] || {}).label || ''}${(BOAT.auto.plan[BOAT.auto.i] || {}).loop ? ' ' + Math.round(BOAT.auto.plan[BOAT.auto.i].loop * 100) + '%' : ''}，航速 ${(Math.abs(BOAT.v) * 1.944).toFixed(1)} 节】` : '';
    hud.textContent = `${modeTxt}  海拔 ${st.feet.toFixed(1)} 米  R 回到起点${st.drag ? '  按住鼠标拖动转向' : ''}${cr}`;
    document.querySelector('#fpui .cross').style.display = st.third ? 'none' : '';
    return true;
  }
  function hitsSolid(x, z, feet) {
    for (const o of near(x, z)) { if (!inBand(o, feet + 0.3)) continue;
      if (o.t === 'c' && Math.hypot(x - o.x, z - o.z) < o.r) return true;
      if (o.t === 'r' && rectSD(x, z, o.x, o.z, o.hw, o.hd, o.rot) < 0) return true;
      if (o.t === 's' && segDist(x, z, o.ax, o.az, o.bx, o.bz)[0] < 0.25) return true; }
    return false;
  }
  return { standUp, sitDown, update, enter, exit, setMapBase, teleport, hitsSolid, mapTick: (t) => mapDraw(t), get on() { return st.on; }, get third() { return st.third; }, get yaw() { return st.yaw; }, get pos() { return st.pos; }, _st: st, _test: { canStep, floorAt, waterAt, pushOut, rects, circles, segs } };
}
