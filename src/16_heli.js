// ======================= 16 直升机 H125：手动飞行 + 停机坪 ⇄ 别墅屋顶 超低空自动飞行 =======================
const HELI = { g: null, x: 0, y: 0, z: 0, yaw: 0, vx: 0, vy: 0, vz: 0, rpm: 0, ground: true, pitch: 0, roll: 0, auto: null, type: 'heli' };
const HELI_SPOTS = { pad: null, roof: { x: 181.4, z: -45.7, y: 0, yaw: Math.PI / 2 } };
function setupHeli(scene, H, floorAt) {
  HELI.g = H; scene.add(H); HELI.floorAt = floorAt;
  HELI_SPOTS.pad = { x: L.helipad.x, z: L.helipad.z, y: L.plateau.h + 0.24, yaw: Math.PI * 0.92 };
  HELI_SPOTS.roof.y = 11.35 + 11.12;
  Object.assign(HELI, { x: HELI_SPOTS.pad.x, y: HELI_SPOTS.pad.y, z: HELI_SPOTS.pad.z, yaw: HELI_SPOTS.pad.yaw });
  INTERACT.push({ get x() { return HELI.ground && !DRIVE.active ? HELI.x : 1e9; }, get z() { return HELI.z; }, r: 4.5, get y() { return HELI.y; }, label: '登上 H125 直升机', fn: () => { DRIVE.active = HELI; DRIVE.cam = 'chase'; document.body.classList.add('driving'); } });
  placeHeli(0);
}
// 建筑构件包围盒（世界坐标），任何高度都参与直升机水平碰撞；由主流程在建筑构建后调用 setHeliObstacles 填入
const HELI_OBS = new Map(), HELI_OBS_CELL = 8;
function setHeliObstacles(groups) {
  const bb = new THREE.Box3(), sz = new THREE.Vector3();
  for (const g of groups) { g.updateMatrixWorld(true); g.traverse(o => {
    if (!o.isMesh || !o.geometry || (o.material && o.material.transparent)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); bb.getSize(sz);
    if (sz.y < 1.0 || sz.x * sz.z < 0.5 || sz.x * sz.y * sz.z < 1.0) return;          // 只要墙体、楼身、柱等有体量的构件
    const b = { x0: bb.min.x, x1: bb.max.x, y0: bb.min.y, y1: bb.max.y, z0: bb.min.z, z1: bb.max.z };
    for (let i = Math.floor(b.x0 / HELI_OBS_CELL); i <= Math.floor(b.x1 / HELI_OBS_CELL); i++) for (let j = Math.floor(b.z0 / HELI_OBS_CELL); j <= Math.floor(b.z1 / HELI_OBS_CELL); j++) { const k = i * 100003 + j; if (!HELI_OBS.has(k)) HELI_OBS.set(k, []); HELI_OBS.get(k).push(b); }
  }); }
}
// 机舱（离地 1.2 m、半径 1 m 的球）是否碰到建筑构件
function heliHitsBuilding(x, y, z) {
  const cy = y + 1.2, R = 1.0, l = HELI_OBS.get(Math.floor(x / HELI_OBS_CELL) * 100003 + Math.floor(z / HELI_OBS_CELL)); if (!l) return false;
  for (const b of l) { const dx = Math.max(b.x0 - x, 0, x - b.x1), dy = Math.max(b.y0 - cy, 0, cy - b.y1), dz = Math.max(b.z0 - z, 0, z - b.z1); if (dx * dx + dy * dy + dz * dz < R * R) return true; }
  return false;
}
function heliFloor(x, z) { return Math.max(gh(x, z), HELI.floorAt ? HELI.floorAt(x, z) : -99, 0.3); }
function placeHeli(dt) {
  const g = HELI.g; g.position.set(HELI.x, HELI.y, HELI.z); g.rotation.order = 'YZX'; g.rotation.set(HELI.roll, HELI.yaw, HELI.pitch);
  const u = g.userData; u.rotor.rotation.y -= HELI.rpm * 38 * dt; u.trotor.rotation.z += HELI.rpm * 190 * dt;
}
// 自动航线：沿直线插值，巡航高度 = 沿途地形 + 25 米（超低空），平滑
function heliRoute(to) {
  const A = { x: HELI.x, z: HELI.z }, B = HELI_SPOTS[to], pts = [];
  const mids = to === 'roof' ? [[-150, -62], [-40, -40], [80, -38], [150, -40]] : [[150, -40], [80, -38], [-40, -40], [-150, -62]];
  const path = [[A.x, A.z], ...mids, [B.x, B.z]];
  return { to, path, i: 1, phase: 'spool', t: 0 };
}
function heliCruiseAlt(x, z) { let h = 0; for (let k = 0; k <= 4; k++) { const a = k / 4 * TAU; h = Math.max(h, gh(x + Math.cos(a) * 25, z + Math.sin(a) * 25)); } return Math.max(h, gh(x, z)) + 25; }
function updateHeli(dt, keys, camera) {
  const f = new THREE.Vector3(Math.cos(HELI.yaw), 0, -Math.sin(HELI.yaw)), r = new THREE.Vector3(Math.sin(HELI.yaw), 0, Math.cos(HELI.yaw));
  let ax = 0, az = 0, ay = 0, yawRate = 0;
  const A = HELI.auto;
  if (A) {
    const B = HELI_SPOTS[A.to]; A.t += dt;
    if (A.phase === 'spool') { HELI.rpm = Math.min(1, HELI.rpm + dt / 4); if (HELI.rpm >= 1) A.phase = 'lift'; }
    else if (A.phase === 'lift') { ay = 3; if (HELI.y > heliFloor(HELI.x, HELI.z) + 12) A.phase = 'cruise'; }
    else if (A.phase === 'cruise' || A.phase === 'approach') {
      const [tx, tz] = A.path[A.i], dx = tx - HELI.x, dz = tz - HELI.z, d = Math.hypot(dx, dz);
      const last = A.i === A.path.length - 1, want = Math.atan2(-dz, dx); let da = ((want - HELI.yaw + Math.PI * 3) % TAU) - Math.PI; yawRate = clamp(da * 1.2, -0.7, 0.7);
      const vmax = last ? clamp(d * 0.35, 1.5, 32) : 32, v = Math.hypot(HELI.vx, HELI.vz);
      const along = HELI.vx * f.x + HELI.vz * f.z; ax += f.x * clamp(vmax * Math.max(0, Math.cos(da)) - along, -6, 4); az += f.z * clamp(vmax * Math.max(0, Math.cos(da)) - along, -6, 4);
      const tgtY = last && d < 60 ? Math.max(B.y + 8, heliCruiseAlt(HELI.x, HELI.z) - 15 * (1 - d / 60)) : heliCruiseAlt(HELI.x + f.x * 40, HELI.z + f.z * 40);
      ay = clamp((tgtY - HELI.y) * 0.8 - HELI.vy, -4, 4);
      if (!last && d < 18) A.i++;
      if (last && d < 25) A.phase = 'approach';
      if (A.phase === 'approach') {                     // 悬停进近：直接对目标点给速度（可侧移），与机头朝向无关
        ax = clamp(dx * 0.35, -7, 7) - HELI.vx * 0.6 + HELI.vx * 0.35; az = clamp(dz * 0.35, -7, 7) - HELI.vz * 0.6 + HELI.vz * 0.35; yawRate *= 0.5;
        ax = (clamp(dx * 0.35, -8, 8) - HELI.vx) * 1.5 + HELI.vx * 0.35; az = (clamp(dz * 0.35, -8, 8) - HELI.vz) * 1.5 + HELI.vz * 0.35;
        if (d < 1.2 && v < 0.8) A.phase = 'align';
      }
    } else if (A.phase === 'align') {
      let da = ((B.yaw - HELI.yaw + Math.PI * 3) % TAU) - Math.PI; yawRate = clamp(da * 1.5, -0.5, 0.5);
      HELI.x = lerp(HELI.x, B.x, dt * 1.5); HELI.z = lerp(HELI.z, B.z, dt * 1.5); HELI.vx *= 0.9; HELI.vz *= 0.9; ay = clamp((B.y + 6 - HELI.y) * 0.8 - HELI.vy, -3, 3);
      if (Math.abs(da) < 0.02) A.phase = 'land';
    } else if (A.phase === 'land') {
      HELI.x = lerp(HELI.x, B.x, dt * 2); HELI.z = lerp(HELI.z, B.z, dt * 2); HELI.vx = HELI.vz = 0; ay = clamp(-1.2 - HELI.vy, -2, 2);
      if (HELI.ground) { A.phase = 'shutdown'; }
    } else if (A.phase === 'shutdown') { HELI.rpm = Math.max(0, HELI.rpm - dt / 6); if (HELI.rpm <= 0) HELI.auto = null; }
  } else {
    const on = DRIVE.active === HELI;
    HELI.rpm = on ? Math.min(1, HELI.rpm + dt / 4) : Math.max(0, HELI.rpm - dt / 6);
    if (on && HELI.rpm > 0.95) {
      if (keys.has('Space')) ay += 5; if (keys.has('ShiftLeft') || keys.has('ShiftRight')) ay -= 5;
      if (keys.has('KeyW')) { ax += f.x * 7; az += f.z * 7; } if (keys.has('KeyS')) { ax -= f.x * 5; az -= f.z * 5; }
      if (keys.has('KeyA')) yawRate = 0.9; if (keys.has('KeyD')) yawRate = -0.9;
      if (!keys.has('Space') && !keys.has('ShiftLeft')) ay += -HELI.vy * 1.5;       // 自动保持高度
    }
  }
  // 积分：阻力 + 旋翼升力不足时下落
  const lift = HELI.rpm >= 0.95;
  HELI.vx += (ax - HELI.vx * 0.35) * dt; HELI.vz += (az - HELI.vz * 0.35) * dt;
  HELI.vy += (lift ? ay : -9.8) * dt; if (lift && !A && DRIVE.active !== HELI) HELI.vy *= 0.9;
  HELI.yaw += yawRate * dt;
  const nx = HELI.x + HELI.vx * dt, nz = HELI.z + HELI.vz * dt;
  // 贴地（< 4 m）沿用碰撞登记（含树木、礁石）；任何高度都检查建筑构件，避免穿过住宅楼等高楼
  const blocked = !HELI.ground && ((HELI.y - heliFloor(nx, nz) < 4 && FP_API && FP_API.hitsSolid(nx, nz, HELI.y + 0.5)) || (heliHitsBuilding(nx, HELI.y, nz) && !heliHitsBuilding(HELI.x, HELI.y, HELI.z)));
  if (blocked) { HELI.vx *= -0.3; HELI.vz *= -0.3; } else { HELI.x = nx; HELI.z = nz; }
  HELI.y += HELI.vy * dt;
  const fl = heliFloor(HELI.x, HELI.z) + 0.02;
  if (HELI.y <= fl) { HELI.y = fl; if (HELI.vy < 0) HELI.vy = 0; HELI.vx *= 0.8; HELI.vz *= 0.8; HELI.ground = true; } else HELI.ground = HELI.y < fl + 0.05;
  // 姿态：随加速度俯仰、随转弯横滚
  const fa = ax * f.x + az * f.z, ra = (HELI.vx * r.x + HELI.vz * r.z);
  HELI.pitch = lerp(HELI.pitch, HELI.ground ? 0 : clamp(-fa * 0.03, -0.25, 0.2), dt * 2); HELI.roll = lerp(HELI.roll, HELI.ground ? 0 : clamp(yawRate * Math.hypot(HELI.vx, HELI.vz) * 0.02 + ra * 0.01, -0.3, 0.3), dt * 2);
  placeHeli(dt);
  if (DRIVE.active === HELI && camera) {
    if (DRIVE.cam === 'chase') { const want = new THREE.Vector3(HELI.x, HELI.y + 5, HELI.z).addScaledVector(f, -17); want.y = Math.max(want.y, gh(want.x, want.z) + 2); camera.position.lerp(want, Math.min(1, dt * 4)); camera.lookAt(HELI.x + f.x * 6, HELI.y + 1.5, HELI.z + f.z * 6); }
    else { const p = new THREE.Vector3(1.05, 1.95, 0.4).applyEuler(HELI.g.rotation).add(HELI.g.position); camera.position.copy(p); camera.lookAt(p.x + f.x * 20, p.y - 3, p.z + f.z * 20); }
  }
  return { kmh: Math.round(Math.hypot(HELI.vx, HELI.vz) * 3.6), agl: Math.round(HELI.y - heliFloor(HELI.x, HELI.z)) };
}
function heliAutoToggle() {
  if (HELI.auto) { HELI.auto = null; return; }
  const dPad = Math.hypot(HELI.x - HELI_SPOTS.pad.x, HELI.z - HELI_SPOTS.pad.z), dRoof = Math.hypot(HELI.x - HELI_SPOTS.roof.x, HELI.z - HELI_SPOTS.roof.z);
  HELI.auto = heliRoute(dRoof < dPad ? 'pad' : 'roof');
}
