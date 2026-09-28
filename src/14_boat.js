let FP_API = null;
// ======================= 14 游艇：移动平台 + 驾驶 =======================
const BOAT = { g: null, x: 0, z: 0, yaw: Math.PI, y: 0, v: 0, thr: 0, rud: 0, home: null, lines: [], moved: false, prev: null };
function setupBoat(scene, Y) {
  BOAT.g = Y; BOAT.x = L.yacht.x; BOAT.z = L.yacht.z; BOAT.yaw = Math.PI; BOAT.home = { x: BOAT.x, z: BOAT.z, yaw: BOAT.yaw };
  BOAT.YL = Y.userData.YL; BOAT.type = 'boat';
  // 缆绳：尾缆接登岸浮台（离开泊位时自动解缆）
  const lineMat = std(0x2a2622, 0.9);
  for (const [lx, lz, ly, wx, wz, wy] of [[-24.6, -3.6, 2.4, L.landing.x - 2.8, L.landing.z + 6.2, 2.2], [-24.6, 3.6, 2.4, L.landing.x - 2.8, L.landing.z - 6.2, 2.2]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 5), lineMat); scene.add(m); BOAT.lines.push({ m, l: [lx, ly, lz], w: new THREE.Vector3(wx, wy, wz) });
  }
  BOAT.seats = BOAT.YL.seats.map(s0 => ({ type: s0.type, boat: true, get x() { return boatToW(s0.x, s0.z)[0]; }, get z() { return boatToW(s0.x, s0.z)[1]; }, get y() { return s0.y + BOAT.y; }, get yaw() { return s0.yaw + BOAT.yaw; } }));
  // 登船、离船改为 F 键（boatFAction）：船体四周是空气墙，不能直接走上走下
  syncBoat(0);
}
const boatToW = (lx, lz, x = BOAT.x, z = BOAT.z, yaw = BOAT.yaw) => [x + lx * Math.cos(yaw) + lz * Math.sin(yaw), z - lx * Math.sin(yaw) + lz * Math.cos(yaw)];
function syncBoat(t) {
  const Y = BOAT.g, by = BOAT.y;
  Y.position.set(BOAT.x, by, BOAT.z); Y.rotation.set(0, BOAT.yaw, 0);
  Y.rotation.x = 0; Y.updateMatrixWorld(true);
  // 局部碰撞 → 世界
  const YL = BOAT.YL, T = (p) => boatToW(p[0], p[1]);
  DYN.walks = YL.walks.map(w => w.kind === 'poly' ? { kind: 'poly', boat: true, pts: w.pts.map(T), holes: (w.holes || []).map(h => h.map(T)), y: w.y + by }
    : (() => { const a = T([w.x0, w.z0]), b = T([w.x1, w.z1]); return { kind: 'ramp', boat: true, x0: a[0], z0: a[1], x1: b[0], z1: b[1], hw: w.hw, y0: w.y0 + by, y1: w.y1 + by }; })());
  DYN.segs = YL.segs.map(sg => { const a = T([sg.ax, sg.az]), b = T([sg.bx, sg.bz]); return { ax: a[0], az: a[1], bx: b[0], bz: b[1], bottom: sg.bottom + by, top: sg.top + by }; });
  DYN.hull = BOAT_HULL.map((p, i) => { const q = BOAT_HULL[(i + 1) % BOAT_HULL.length], A = T(p), B = T(q); return { ax: A[0], az: A[1], bx: B[0], bz: B[1] }; });
  DYN.rects = YL.rects.map(r => { const c = T([r.x, r.z]); return { x: c[0], z: c[1], hw: r.hw, hd: r.hd, rot: BOAT.yaw + (r.rot || 0), bottom: r.bottom + by, top: r.top + by }; });
  DYN.interact = [];
  { const c = T([5.2, -2.9]); DYN.interact.push({ x: c[0], z: c[1], r: 1.0, y: 2.45 + by, label: '下层船舱舱盖（船员通道，暂不开放）', fn: () => {} }); }
  { const c = T([6.75, -0.55]); DYN.interact.push({ x: c[0], z: c[1], r: 0.9, y: 5.15 + by, label: '按喇叭（在闸外海域可召唤鲸群与鱼群）', fn: () => boatHorn() }); }
  for (const sv of BOAT.seats) DYN.interact.push({ x: sv.x, z: sv.z, r: sv.type === 'lie' ? 1.8 : 1.3, y: sv.y - (sv.type === 'lie' ? 0.62 : 0.45), label: sv.type === 'lie' ? '躺下休息' : '坐下', fn: () => FP_API.sitDown(sv) });
  DYN.interact.push(...YL.interact.map(it => { const c = T([it.x, it.z]); return { x: c[0], z: c[1], r: it.r, y: it.y + by, label: () => BOAT.auto ? '接管手动驾驶（按 C 取消自动巡航）' : '手动驾驶游艇，按 C 自动巡航（开闸 → 绕岛一周 → 回港）', fn: () => { BOAT.auto = null; DRIVE.active = BOAT; BOAT.thr = 0; document.body.classList.add('driving'); }, cruise: startCruise }; }));
  const atHome = Math.hypot(BOAT.x - BOAT.home.x, BOAT.z - BOAT.home.z) < 0.6 && Math.abs(BOAT.yaw - BOAT.home.yaw) < 0.03; BOAT.atHome = atHome;
  for (const ln of BOAT.lines) {
    ln.m.visible = atHome; if (!atHome) continue;
    const a = new THREE.Vector3(...ln.l).applyMatrix4(Y.matrixWorld), d = new THREE.Vector3().subVectors(ln.w, a), L_ = d.length();
    ln.m.position.copy(a).addScaledVector(d, 0.5); ln.m.scale.set(1, L_, 1); ln.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  }
}
// ---------------- 船体空气墙与 F 键登船/离船 ----------------
// 船体外轮廓（局部坐标：x 向船首，z 向右舷；含船尾游泳平台），略大于船体。人不能直接走上走下（双向阻挡），只能按 F
const BOAT_HULL = [[24.9, 0], [18, 3.6], [8, 4.9], [-8, 4.9], [-20, 4.8], [-25.2, 4.5], [-27.7, 4.3], [-27.7, -4.3], [-25.2, -4.5], [-20, -4.8], [-8, -4.9], [8, -4.9], [18, -3.6]];
// 登船落脚点（局部坐标与甲板高度）：船尾游泳平台、后甲板、两舷通道、前甲板；按 F 时落到离人最近的一处
const BOAT_ENTRY = [-19.8, 0, 2.26], BOAT_TV = [-11.52, 0];   // 登船落点（主甲板室后墙门洞外 0.8 m，后甲板面 2.26）与沙龙电视屏幕（船体局部坐标）
const wToBoat = (wx, wz) => { const dx = wx - BOAT.x, dz = wz - BOAT.z, c = Math.cos(BOAT.yaw), s = Math.sin(BOAT.yaw); return [dx * c - dz * s, dx * s + dz * c]; };
// 点到船体轮廓的最近距离与最近边的外法线（局部坐标）
function boatEdge(lx, lz) {
  let best = 1e9, nx = 0, nz = 0, px = 0, pz = 0;
  for (let i = 0; i < BOAT_HULL.length; i++) { const [ax, az] = BOAT_HULL[i], [bx, bz] = BOAT_HULL[(i + 1) % BOAT_HULL.length], [d, t] = segDist(lx, lz, ax, az, bx, bz);
    if (d < best) { best = d; px = ax + (bx - ax) * t; pz = az + (bz - az) * t; const ex = bx - ax, ez = bz - az, el = Math.hypot(ex, ez) || 1; nx = ez / el; nz = -ex / el; } }
  // 轮廓按“船首 → 右舷 → 船尾 → 左舷”排列，(ez, -ex) 指向轮廓外侧；保险起见按中心方向校正
  if (nx * px + nz * pz < 0) { nx = -nx; nz = -nz; }
  return { d: best, inside: pointInPoly(lx, lz, BOAT_HULL), px, pz, nx, nz };
}
const boatMoving = () => !!BOAT.auto || Math.abs(BOAT.v) > 0.3;
// 当前可用的 F 键动作：{ label, fn }；没有则返回 null。drive 为玩家正在驾驶的载具
function boatFAction(st) {
  if (!BOAT.g || st.seat || (DRIVE.active && DRIVE.active !== BOAT)) return null;
  const [lx, lz] = wToBoat(st.pos.x, st.pos.z), E = boatEdge(lx, lz), deck = 2.26 + BOAT.y;
  if (!st.onBoat && DRIVE.active !== BOAT) {
    // 岸上、浮台上或水里：离船体轮廓 3 米以内、高度与船相近即可登船
    if (E.inside || E.d > 3.0 || st.feet > deck + 3 || st.feet < -4) return null;
    // 无论从哪一侧登船，都落到主甲板后甲板上的固定位置：一楼（主甲板室）舱门口，面朝船首，正对沙龙前端的电视
    return { label: '登上游艇', fn: () => {
      const [x, z] = boatToW(BOAT_ENTRY[0], BOAT_ENTRY[1]), [tx, tz] = boatToW(BOAT_TV[0], BOAT_TV[1]), yaw = Math.atan2(-(tx - x), -(tz - z));
      FP_API.teleport(x, z, yaw, BOAT_ENTRY[2] + BOAT.y, true); } };
  }
  // 船上：站在船四周边缘（离轮廓 1.6 米以内）才能离船；驾驶中直接跳船
  if (DRIVE.active !== BOAT && (!E.inside || E.d > 1.6)) return null;
  const moving = boatMoving();
  return { label: moving ? '跳入附近海域（游艇行驶中）' : '离开游艇', fn: () => {
    if (DRIVE.active === BOAT) exitCar({ teleport: FP_API.teleport });
    const e = boatEdge(...wToBoat(st.pos.x, st.pos.z));
    // 落点：沿最近一侧的外法线离开船体；未行驶时优先落到旁边的浮台、岸上等可站立处，否则落水
    const drop = (k) => boatToW(e.px + e.nx * k, e.pz + e.nz * k), away = (x, z) => Math.atan2(-(x - BOAT.x), -(z - BOAT.z));   // 面朝离开船的方向
    if (!moving) for (const k of [1.2, 2, 3, 4]) { const [x, z] = drop(k), f = FP_API._test.floorAt(x, z, deck + 1); if (f > 0.2) { FP_API.teleport(x, z, away(x, z), f, false); return; } }
    const [x, z] = drop(moving ? 3.5 : 2.5); FP_API.teleport(x, z, away(x, z), -0.6, false); } };
}
// 船体与环境碰撞：搁浅（水深不足）、水闸（关闭时）、闸墩、登岸浮台
function boatBlocked(x, z, yaw) {
  const P = [[24.5, 0], [18, 3.3], [18, -3.3], [8, 4.6], [8, -4.6], [-8, 4.6], [-8, -4.6], [-20, 4.5], [-20, -4.5], [-25, 4.2], [-25, -4.2], [-25, 0]];
  for (const [lx, lz] of P) {
    const [wx, wz] = boatToW(lx, lz, x, z, yaw);
    if (gh(wx, wz) > -2.6) return 'shallow';
    if (wz > 122.8 && wz < 133.2 && (Math.abs(wx) < 2.4 || (Math.abs(wx) > 36.4 && Math.abs(wx) < 44))) return 'pier';
    if (GATE.open < 0.98 && Math.abs(wx) < 38.5 && wz > 126.3 && wz < 129.7) return 'gate';
    if (wx > L.landing.x - 3.2 && wx < L.landing.x + 3.2 && wz > L.landing.z - 6.7 && wz < L.landing.z + 6.7) return 'dock';
  }
  return null;
}
function updateBoat(dt, t, keys) {
  const prev = { x: BOAT.x, z: BOAT.z, yaw: BOAT.yaw, y: BOAT.y };
  let hit = null;
  if (BOAT.auto) autopilot(dt);
  else if (DRIVE.active === BOAT) {
    const fw = keys.has('KeyW') || keys.has('ArrowUp'), bk = keys.has('KeyS') || keys.has('ArrowDown');
    BOAT.thr = clamp(BOAT.thr + ((fw ? 1 : 0) - (bk ? 1 : 0)) * dt * 0.5, -0.35, 1);
    BOAT.rud = lerp(BOAT.rud, (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0), Math.min(1, dt * 2));
    if (keys.has('Space')) BOAT.thr = lerp(BOAT.thr, 0, Math.min(1, dt * 2));
  }
  const vmax = 9.5, target = BOAT.thr * vmax;
  BOAT.v += clamp(target - BOAT.v, -0.9 * dt, 0.55 * dt);
  if (Math.abs(BOAT.v) > 0.01 || Math.abs(BOAT.rud) > 0.05) {
    // 双桨 + 艏侧推：低速也能原地转向
    const nyaw = BOAT.yaw + BOAT.rud * (0.07 + 0.012 * Math.abs(BOAT.v)) * dt * (BOAT.v < -0.05 ? -1 : 1), nx = BOAT.x + Math.cos(nyaw) * BOAT.v * dt, nz = BOAT.z - Math.sin(nyaw) * BOAT.v * dt;
    hit = boatBlocked(nx, nz, nyaw);
    if (hit) { if (BOAT.auto) { BOAT.auto.back = 2.5; BOAT.auto.backDir = BOAT.v >= 0 ? -1 : 1; } BOAT.v = -BOAT.v * 0.2; BOAT.thr = 0; } else { BOAT.x = nx; BOAT.z = nz; BOAT.yaw = nyaw; }
  }
  BOAT.y = 0.05 * Math.sin(t * 0.8) * Math.min(1, 0.3 + Math.abs(BOAT.v) / 5);
  BOAT.moved = prev.x !== BOAT.x || prev.z !== BOAT.z || prev.yaw !== BOAT.yaw || prev.y !== BOAT.y;
  BOAT.prev = prev; BOAT.hit = hit;
  return prev;
}
// 船上的人随船移动
function carryOnBoat(st, prev) {
  if (!st.onBoat || !BOAT.moved) return;
  const dx = st.pos.x - prev.x, dz = st.pos.z - prev.z, c = Math.cos(prev.yaw), s = Math.sin(prev.yaw);
  const lx = c * dx - s * dz, lz = s * dx + c * dz;
  const [nx, nz] = boatToW(lx, lz);
  st.pos.x = nx; st.pos.z = nz; st.yaw += BOAT.yaw - prev.yaw; st.feet += BOAT.y - prev.y; st.pos.y = st.feet + 1.68;
}
function boatCamera(dt, camera) {
  const f = new THREE.Vector3(Math.cos(BOAT.yaw), 0, -Math.sin(BOAT.yaw));
  if (DRIVE.cam === 'chase') {
    const want = new THREE.Vector3(BOAT.x, 19, BOAT.z).addScaledVector(f, -52);
    camera.position.lerp(want, Math.min(1, dt * 3)); camera.lookAt(BOAT.x + f.x * 18, 4, BOAT.z + f.z * 18);
  } else {
    const [ex, ez] = boatToW(6.0, 0); camera.position.set(ex, BOAT.y + 5.15 + 1.62, ez); camera.lookAt(ex + f.x * 30, BOAT.y + 5.2, ez + f.z * 30);
  }
}
// ======================= 自动巡航：开闸 → 出港 → 离岸绕岛一周 → 回港倒车靠泊 → 关闸 =======================
function cruisePlan() {
  const P = [{ t: 'gate', open: 1, label: '开启水闸' }, { t: 'goto', x: -33, z: 87, thr: 0.3, tol: 6, label: '离开泊位' }, { t: 'goto', x: -19, z: 108, thr: 0.25, tol: 6, label: '转向闸口' },
    { t: 'goto', x: -19, z: 150, thr: 0.35, tol: 6, label: '驶出水闸' }, { t: 'goto', x: -19, z: 280, thr: 0.6, tol: 12, label: '驶出峡谷' }];
  const a = 470, b = 330, N = 24;   // 离岸约 120 米的航线（岛屿 700×400）
  for (let k = 1; k < N; k++) { const th = Math.PI / 2 + 0.12 + k * (TAU - 0.24) / N; P.push({ t: 'goto', x: a * Math.cos(th), z: b * Math.sin(th), thr: 1, tol: 30, label: '环岛巡航', loop: k / N }); }
  P.push({ t: 'goto', x: 19, z: 280, thr: 0.5, tol: 12, label: '返航入峡' }, { t: 'goto', x: 19, z: 150, thr: 0.35, tol: 6, label: '驶入水闸' }, { t: 'goto', x: 19, z: 108, thr: 0.25, tol: 6, label: '进入泊港' }, { t: 'goto', x: 6, z: 68, thr: 0.25, tol: 7, label: '泊港内回转' },
    { t: 'goto', x: -30, z: 87, thr: 0.2, tol: 4, label: '驶向泊位西侧' }, { t: 'align', yaw: Math.PI, label: '调整艏向' }, { t: 'reverse', x: BOAT.home.x - 4, label: '倒车靠泊' },
    { t: 'dock', label: '系泊' }, { t: 'gate', open: 0, label: '关闭水闸' });
  return P;
}
function startCruise() { if (BOAT.auto) { BOAT.auto = null; BOAT.thr = 0; return; } DRIVE.active = null; document.body.classList.remove('driving'); BOAT.auto = { plan: cruisePlan(), i: 0, t: 0, back: 0 }; }
function autopilot(dt) {
  const A = BOAT.auto, ph = A.plan[A.i]; if (!ph) { BOAT.auto = null; BOAT.thr = 0; BOAT.rud = 0; return; }
  A.t += dt;
  const next = () => { A.i++; A.t = 0; };
  const angTo = (x, z) => { const want = Math.atan2(-(z - BOAT.z), x - BOAT.x); return ((want - BOAT.yaw + Math.PI * 3) % TAU) - Math.PI; };
  if (A.back > 0) { A.back -= dt; BOAT.thr = A.backDir * 0.25; BOAT.rud = 0; return; }        // 碰撞后反向脱离再重试
  if (ph.t === 'gate') { BOAT.thr = 0; BOAT.rud = 0; GATE.target = ph.open; if ((ph.open && GATE.open > 0.99) || (!ph.open && A.t > 1)) next(); return; }
  if (ph.t === 'goto') {
    const da = angTo(ph.x, ph.z), d = Math.hypot(ph.x - BOAT.x, ph.z - BOAT.z);
    BOAT.rud = clamp(da * 2.2, -1, 1);
    const tgt = Math.abs(da) > 0.35 ? 0 : ph.thr * (d < 25 && ph.tol < 10 ? 0.6 : 1);
    BOAT.thr += clamp(tgt - BOAT.thr, -dt * 0.6, dt * 0.4);
    if (d < ph.tol) next();
  } else if (ph.t === 'align') {
    const da = ((ph.yaw - BOAT.yaw + Math.PI * 3) % TAU) - Math.PI;
    BOAT.thr += clamp(0 - BOAT.thr, -dt * 0.6, dt * 0.6); BOAT.rud = clamp(da * 3, -1, 1);
    if (Math.abs(da) < 0.02 && Math.abs(BOAT.v) < 0.2) { BOAT.rud = 0; next(); }
  } else if (ph.t === 'reverse') {
    const da = ((Math.PI - BOAT.yaw + Math.PI * 3) % TAU) - Math.PI, dz = BOAT.home.z - BOAT.z;
    BOAT.rud = 0; BOAT.yaw += da * Math.min(1, dt * 1.2);                    // 艏艉侧推：保持艏向并横移对准泊位中线
    BOAT.z += clamp(dz, -0.35, 0.35) * dt;
    BOAT.thr = Math.abs(dz) > 0.6 ? 0 : (BOAT.x > ph.x - 12 ? -0.08 : -0.2);
    if (BOAT.x >= ph.x) next();
  } else if (ph.t === 'dock') {
    BOAT.thr = 0; BOAT.rud = 0; BOAT.v *= Math.max(0, 1 - dt * 2);
    const k = Math.min(1, dt * 0.8); BOAT.x = lerp(BOAT.x, BOAT.home.x, k); BOAT.z = lerp(BOAT.z, BOAT.home.z, k); BOAT.yaw = lerp(BOAT.yaw, BOAT.home.yaw, k);
    if (Math.hypot(BOAT.x - BOAT.home.x, BOAT.z - BOAT.home.z) < 0.05) { BOAT.x = BOAT.home.x; BOAT.z = BOAT.home.z; BOAT.yaw = BOAT.home.yaw; BOAT.v = 0; next(); }
  }
}
