let FP_API = null;
// ======================= 14 游艇：移动平台 + 驾驶 =======================
const BOAT = { g: null, x: 0, z: 0, yaw: Math.PI, y: 0, v: 0, thr: 0, rud: 0, home: null, lines: [], moved: false, prev: null };
function setupBoat(scene, Y) {
  BOAT.g = Y; BOAT.x = L.yacht.x; BOAT.z = L.yacht.z; BOAT.yaw = Math.PI; BOAT.home = { x: BOAT.x, z: BOAT.z, yaw: BOAT.yaw };
  BOAT.YL = Y.userData.YL; BOAT.type = 'boat';
  // 缆绳：首缆接系缆钢桩，尾缆接登岸浮台（离开泊位时自动解缆）
  const lineMat = std(0x2a2622, 0.9);
  for (const [lx, lz, ly, wx, wz, wy] of [[22, -1.2, 3.8, 3.5, L.yacht.z - 6.5, 2.6], [22, 1.2, 3.8, 3.5, L.yacht.z + 6.5, 2.6], [-24.6, -3.6, 2.4, L.landing.x - 2.8, L.landing.z + 6.2, 2.2], [-24.6, 3.6, 2.4, L.landing.x - 2.8, L.landing.z - 6.2, 2.2]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 5), lineMat); scene.add(m); BOAT.lines.push({ m, l: [lx, ly, lz], w: new THREE.Vector3(wx, wy, wz) });
  }
  BOAT.seats = BOAT.YL.seats.map(s0 => ({ type: s0.type, boat: true, get x() { return boatToW(s0.x, s0.z)[0]; }, get z() { return boatToW(s0.x, s0.z)[1]; }, get y() { return s0.y + BOAT.y; }, get yaw() { return s0.yaw + BOAT.yaw; } }));
  // 靠近游艇按 E 登船（直接到后甲板）；船上按 E 下船（仅靠泊时）
  INTERACT.push({ get x() { return BOAT.atHome ? L.landing.x - 0.5 : 1e9; }, z: L.landing.z, r: 3.5, y: 0.5, label: '登上游艇（到达后甲板）', fn: () => { const [x, z] = boatToW(-24.2, 1.6); FP_API.teleport(x, z, BOAT.yaw, 2.26 + BOAT.y, true); } });
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
  DYN.rects = YL.rects.map(r => { const c = T([r.x, r.z]); return { x: c[0], z: c[1], hw: r.hw, hd: r.hd, rot: BOAT.yaw + (r.rot || 0), bottom: r.bottom + by, top: r.top + by }; });
  DYN.interact = [];
  { const c = T([-24.2, 1.6]); DYN.interact.push({ x: c[0], z: c[1], r: 1.6, y: 2.26 + by, label: () => BOAT.atHome ? '下船回到登岸浮台' : '游艇未靠泊，暂不能下船', fn: () => { if (BOAT.atHome) FP_API.teleport(L.landing.x + 1, L.landing.z, -Math.PI / 2, 0.5, false); } }); }
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
// 船体与环境碰撞：搁浅（水深不足）、水闸（关闭时）、闸墩、系缆桩、登岸浮台
function boatBlocked(x, z, yaw) {
  const P = [[24.5, 0], [18, 3.3], [18, -3.3], [8, 4.6], [8, -4.6], [-8, 4.6], [-8, -4.6], [-20, 4.5], [-20, -4.5], [-25, 4.2], [-25, -4.2], [-25, 0]];
  for (const [lx, lz] of P) {
    const [wx, wz] = boatToW(lx, lz, x, z, yaw);
    if (gh(wx, wz) > -2.6) return 'shallow';
    if (wz > 122.8 && wz < 133.2 && (Math.abs(wx) < 2.4 || (Math.abs(wx) > 36.4 && Math.abs(wx) < 44))) return 'pier';
    if (GATE.open < 0.98 && Math.abs(wx) < 38.5 && wz > 126.3 && wz < 129.7) return 'gate';
    for (const pz of [L.yacht.z - 6.5, L.yacht.z + 6.5]) if (Math.hypot(wx - 3.5, wz - pz) < 0.9) return 'pile';
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
