// ======================= 13 驾驶：Cybertruck / 拖拉机（地面车辆） =======================
const DRIVE = { cars: [], active: null, cam: 'chase' };
function makeCar(group, x, z, yaw) {
  const sp = group.userData.spec, car = { group, sp, x, z, yaw, v: 0, steer: 0, y: gh(x, z), pitch: 0, roll: 0, spin: 0 };
  DRIVE.cars.push(car); placeCar(car);
  INTERACT.push({ get x() { return car.x + Math.sin(car.yaw) * 0 - Math.sin(car.yaw + Math.PI / 2) * (sp.W / 2 + 0.6) * 0; }, get z() { return car.z; }, r: sp.L / 2 + 1.2, label: '驾驶 ' + sp.name, fn: () => enterCar(car) });
  return car;
}
// 车身局部 → 世界：本模型车头朝 +x
function carToW(car, lx, lz) { const c = Math.cos(car.yaw), s = Math.sin(car.yaw); return [car.x + lx * c + lz * s, car.z - lx * s + lz * c]; }
function placeCar(car) {
  const sp = car.sp, hw = sp.track / 2, hb = sp.wb / 2;
  const hFL = gh(...carToW(car, hb, hw)), hFR = gh(...carToW(car, hb, -hw)), hRL = gh(...carToW(car, -hb, hw)), hRR = gh(...carToW(car, -hb, -hw));
  const tp = Math.atan2((hFL + hFR) / 2 - (hRL + hRR) / 2, sp.wb), tr = Math.atan2((hFR + hRR) / 2 - (hFL + hRL) / 2, sp.track);
  car.pitch = lerp(car.pitch, tp, 0.35); car.roll = lerp(car.roll, tr, 0.35);
  const hC = Math.max(gh(car.x, car.z), gh(...carToW(car, hb * 0.5, 0)), gh(...carToW(car, -hb * 0.5, 0)));   // 车身中线地面最高点
  car.y = lerp(car.y, Math.max((hFL + hFR + hRL + hRR) / 4, hC - sp.r * 0.75), 0.5);                        // 越过坡顶、田埂时车底不入地
  const g = car.group; g.position.set(car.x, car.y, car.z); g.rotation.order = 'YZX'; g.rotation.set(car.roll, car.yaw, car.pitch);
  for (const w of g.userData.wheels) { w.spin.rotation.z = -car.spin; if (w.front) w.piv.rotation.y = car.steer; }
}
function enterCar(car) { DRIVE.active = car; car.v = 0; document.body.classList.add('driving'); }
function exitCar(fp) {
  const car = DRIVE.active; if (!car) return;
  if (car === BOAT) { DRIVE.active = null; document.body.classList.remove('driving'); return; }
  for (const side of [1, -1]) { const p = carToW(car, 0.2, side * (car.sp.W / 2 + 0.9)); if (gh(p[0], p[1]) > 0.3) { fp.teleport(p[0], p[1], car.yaw - Math.PI / 2); break; } }
  DRIVE.active = null; car.v = 0; document.body.classList.remove('driving');
  if (car.group.userData.cab) { car.group.userData.cab.visible = false; car.group.userData.body.visible = true; }
}
// 车辆与静态障碍的碰撞：沿车身轮廓采样若干点
function carBlocked(car, nx, nz, nyaw, fpApi) {
  const sp = car.sp, c = Math.cos(nyaw), s = Math.sin(nyaw), hl = sp.L / 2, hw = sp.W / 2;
  const pts = [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw], [hl, 0], [-hl, 0], [0, hw], [0, -hw], [hl * 0.5, hw], [hl * 0.5, -hw], [-hl * 0.5, hw], [-hl * 0.5, -hw]];
  const y0 = gh(nx, nz);
  for (const [lx, lz] of pts) {
    const x = nx + lx * c + lz * s, z = nz - lx * s + lz * c, h = gh(x, z);
    if (h < 0.15) return 'water';
    if (Math.abs(h - y0) > Math.max(1.2, sp.L * 0.33)) return 'steep';
    if (fpApi.hitsSolid(x, z, y0)) return 'solid';
  }
  for (const a of ANIMALS) if (a.coll && Math.hypot(a.x - nx, a.z - nz) < hl + a.coll) { const lx = (a.x - nx) * c - (a.z - nz) * s; const lz = (a.x - nx) * s + (a.z - nz) * c; if (Math.abs(lx) < hl + a.coll && Math.abs(lz) < hw + a.coll) return 'animal'; }
  return null;
}
function updateDrive(dt, keys, camera, fpApi) {
  const car = DRIVE.active, sp = car.sp;
  const th = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0), br = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0), hb = keys.has('Space');
  const st = (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0);
  // 纵向：油门/制动/倒车 + 阻力；坡度影响
  let a = 0;
  if (th) a += sp.acc * (1 - Math.max(0, car.v) / sp.vmax);
  if (br) a -= car.v > 0.5 ? sp.brake : sp.acc * 0.6 * (1 + Math.min(0, car.v) / (sp.vmax * 0.3));
  a -= 0.012 * car.v * Math.abs(car.v) + 0.25 * Math.sign(car.v) * (Math.abs(car.v) > 0.05 ? 1 : 0);
  a -= 9.8 * Math.sin(car.pitch) * 0.6;
  if (hb) a -= Math.sign(car.v) * sp.brake * 1.2;
  car.v += a * dt; if (!th && !br && Math.abs(car.v) < 0.08) car.v = 0;
  car.v = clamp(car.v, -sp.vmax * 0.3, sp.vmax);
  const smax = sp.steer / (1 + Math.abs(car.v) / 14);
  car.steer += clamp(st * smax - car.steer, -2.2 * dt, 2.2 * dt);
  const yawRate = car.v / sp.wb * Math.tan(car.steer) * (hb ? 1.35 : 1);
  const nyaw = car.yaw + yawRate * dt, nx = car.x + Math.cos(nyaw) * car.v * dt, nz = car.z - Math.sin(nyaw) * car.v * dt;
  const hit = Math.abs(car.v) > 0.01 ? carBlocked(car, nx, nz, nyaw, fpApi) : null;
  if (hit) car.v = -car.v * 0.25; else { car.x = nx; car.z = nz; car.yaw = nyaw; }
  car.spin += car.v * dt / sp.r;
  placeCar(car);
  // 相机：尾随或驾驶位
  const f = new THREE.Vector3(Math.cos(car.yaw), 0, -Math.sin(car.yaw)), ud = car.group.userData;
  if (ud.cab) { ud.cab.visible = DRIVE.cam === 'seat'; ud.body.visible = DRIVE.cam !== 'seat'; }
  if (DRIVE.cam === 'chase') {
    const tgt = new THREE.Vector3(car.x, car.y + 1.4, car.z), want = tgt.clone().addScaledVector(f, -sp.chase[0]).add(new THREE.Vector3(0, sp.chase[1], 0));
    want.y = Math.max(want.y, gh(want.x, want.z) + 1.2);
    camera.position.lerp(want, Math.min(1, dt * 5)); camera.lookAt(tgt.x + f.x * 4, tgt.y, tgt.z + f.z * 4);
  } else {
    const e = sp.eye, p = new THREE.Vector3(e[0], e[1], e[2]).applyEuler(car.group.rotation).add(car.group.position);
    camera.position.copy(p); camera.lookAt(p.x + f.x * 10, p.y - 0.9 + Math.sin(car.pitch) * 10, p.z + f.z * 10);
  }
  return { kmh: Math.round(car.v * 3.6), hit };
}
