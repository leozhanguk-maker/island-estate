// ======================= 17c 水域生态·水闸内浅海潟湖（热带海水，禁止任何淡水物种） =======================
// 底质：白色珊瑚砂（地表色见 04_ground），零星礁石与珊瑚丛（鹿角珊瑚、脑珊瑚、桌珊瑚）
// 海洋植物：海草床（泰来草、海菖蒲）成片带状随潮摆动；海藻（马尾藻带气囊、仙掌藻串珠状）
// 生物：锦绣龙虾（藏在礁洞只露触角）、锯缘青蟹、真蛸（变色、贴底、喷墨）、蓝绿光鳃鱼、黄高鳍刺尾鱼、蝴蝶鱼、鹦嘴鱼（啃珊瑚）、
//       小丑鱼（只在海葵附近）、海星、海胆、海参；浅滩沙滩：按潮线分布的贝壳（越近水线越密）与寄居蟹
function ecoLagoonPoint(depth, tries = 80, box = null) {
  for (let k = 0; k < tries; k++) {
    const x = box ? ecoRand(box[0], box[1]) : ecoRand(-48, 48), z = box ? ecoRand(box[2], box[3]) : ecoRand(38, 124);
    if (!ecoIn('lagoon', x, z)) continue; const d = -gh(x, z); if (d >= depth[0] && d <= depth[1]) return { x, z, d, y: gh(x, z) };
  }
  return null;
}
// 游动的单只生物（鹦嘴鱼、小丑鱼等）：朝 (gx, gy, gz) 游去，偏航与俯仰平滑
function ecoSwimTo(c, dt, speed) {
  const dx = c.gx - c.x, dy = c.gy - c.y, dz = c.gz - c.z, d = Math.hypot(dx, dz), want = Math.atan2(-dz, dx);
  let da = ((want - c.yaw + Math.PI * 3) % TAU) - Math.PI; c.yaw += clamp(da, -2.2 * dt, 2.2 * dt);
  const k = Math.min(d, speed * dt * (Math.abs(da) < 1 ? 1 : 0.3)); c.x += Math.cos(c.yaw) * k; c.z -= Math.sin(c.yaw) * k; c.y += clamp(dy, -0.3, 0.3) * dt * 1.5;
  c.pitch = clamp(dy * 0.8, -0.4, 0.4); return d;
}
// 鹿角珊瑚：递归分枝（米褐色，枝尖浅色或淡紫）
function ecoStaghorn(x, y, z, s, tip, parts) {
  const base = 0xb89a6a, grow = (p, dir, len, r, lv) => {
    const e = p.clone().addScaledVector(dir, len); parts.push(ecoRod(p, e, r, r * 0.7, lv >= 3 ? tip : ecoMix(base, tip, lv * 0.2), 0, 5));
    if (lv >= 3) return; const n = lv === 0 ? 4 : 2 + Math.floor(ECO_R() * 2);
    for (let k = 0; k < n; k++) { const d = dir.clone().add(V3(ecoRand(-0.8, 0.8), ecoRand(0.1, 0.6), ecoRand(-0.8, 0.8))).normalize(); grow(e, d, len * ecoRand(0.6, 0.85), r * 0.72, lv + 1); }
  };
  grow(V3(x, y - 0.03, z), V3(0, 1, 0), 0.22 * s, 0.028 * s, 0);
}
// 脑珊瑚：扁半球，表面回形沟纹（顶点色）
function ecoBrain(x, y, z, r, parts) {
  const g = new THREE.SphereGeometry(1, 20, 12, 0, TAU, 0, Math.PI / 2), c1 = new THREE.Color(ECO_R() < 0.5 ? 0xa89452 : 0x8a9a5a), c2 = c1.clone().multiplyScalar(0.62);
  parts.push(ecoPart(g, (px, py, pz) => { const u = Math.sin(px * 38 + 3 * Math.sin(pz * 17)) * Math.sin(pz * 36 + 3 * Math.sin(px * 15)); return u > 0.2 ? c1 : c2; }, 0, ecoM4(x, y - r * 0.12, z, 0, ECO_R() * TAU, 0, r, r * 0.72, r)));
}
// 桌珊瑚：短柄 + 平展的圆盘（边缘浅色、略呈波状）
function ecoTable(x, y, z, r, parts) {
  const h = r * 0.35; parts.push(ecoRod(V3(x, y - 0.05, z), V3(x, y + h, z), r * 0.12, r * 0.09, 0x8a7a58, 0, 6));
  const g = new THREE.CylinderGeometry(r, r * 0.35, r * 0.12, 22, 1), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const px = P.getX(i), pz = P.getZ(i), a = Math.atan2(pz, px), rr = Math.hypot(px, pz); P.setY(i, P.getY(i) + Math.sin(a * 7) * 0.03 * r * (rr / r)); }
  g.computeVertexNormals(); const cc = ECO_R() < 0.5 ? 0x9a8c62 : 0x7f9676;
  parts.push(ecoPart(g, (px, py, pz) => ecoMix(cc, 0xe0d8b8, (Math.hypot(px - x, pz - z) / r - 0.7) * 3), 0, ecoM4(x, y + h + r * 0.06, z, 0, ECO_R() * TAU, 0)));
}
function ecoRock(x, y, z, r, parts, seed) {
  // 多面体几何体是非索引的，先焊接顶点再扰动，法线才能平滑（否则呈现低多边形“晶体”外观）
  const g0 = new THREE.IcosahedronGeometry(1, 3); g0.deleteAttribute('normal'); g0.deleteAttribute('uv');
  const g = THREE.BufferGeometryUtils.mergeVertices(g0), P = g.attributes.position; g0.dispose();
  for (let i = 0; i < P.count; i++) { const px = P.getX(i), py = P.getY(i), pz = P.getZ(i), n = 1 + 0.25 * SNoise(px * 1.6 + seed, pz * 1.6 - seed) + 0.1 * SNoise(px * 4 + seed, py * 4); P.setXYZ(i, px * n * 1.2, py * n * 0.7, pz * n); }
  g.computeVertexNormals();
  parts.push(ecoPart(g, (px, py, pz) => { const u = SNoise(px * 3 + seed, pz * 3); const v = SNoise(px * 9 - seed, py * 9 + seed); return u > 0.55 && v > 0 ? ecoMix(0x8a7470, 0xa4767a, v) : u < -0.35 ? ecoMix(0x5a6448, 0x6a6a52, 0.5 + 0.5 * v) : ecoMix(0x6e675c, 0x938a7c, 0.5 + 0.35 * u + 0.15 * v); }, 0, ecoM4(x, y + r * 0.2, z, 0, ECO_R() * TAU, 0, r)));
}
function buildEcoLagoon(scene) {
  const Z = { center: { x: 0, z: 85 }, radius: 70, meshes: [], flocks: [], critters: [] }, c0 = ECO.critters.length;
  const deco = [], plants = [], rocks = [], reefs = [], coralTops = [], anemones = [];
  // ---------------- 礁石与珊瑚丛：6 处礁盘 + 零星礁石 ----------------
  for (let r = 0; r < 7; r++) {
    const p = ecoLagoonPoint([3, 6.8], 80, [-40, 40, 62, 120]); if (!p) continue; reefs.push(p);
    for (let k = 0; k < 3; k++) { const x = p.x + ecoRand(-2, 2), z = p.z + ecoRand(-2, 2), rr = ecoRand(0.4, 1.1); if (!ecoIn('lagoon', x, z)) continue; ecoRock(x, gh(x, z), z, rr, deco, r * 7 + k); rocks.push({ x, z, y: gh(x, z), r: rr }); }
    for (let k = 0; k < 7; k++) {
      const x = p.x + ecoRand(-3.5, 3.5), z = p.z + ecoRand(-3.5, 3.5); if (!ecoIn('lagoon', x, z)) continue; const y = gh(x, z), u = ECO_R();
      if (u < 0.45) { ecoStaghorn(x, y, z, ecoRand(1.4, 2.4), ECO_R() < 0.3 ? 0xb8a0d0 : 0xe8dcc0, deco); coralTops.push({ x, y: y + 0.9, z }); }
      else if (u < 0.75) { const rr = ecoRand(0.25, 0.6); ecoBrain(x, y, z, rr, deco); coralTops.push({ x, y: y + rr + 0.5, z }); }
      else { const rr = ecoRand(0.5, 1.1); ecoTable(x, y, z, rr, deco); coralTops.push({ x, y: y + rr * 0.5 + 0.5, z }); }
    }
  }
  for (let i = 0; i < 16; i++) { const p = ecoLagoonPoint([1.5, 7]); if (!p) continue; const rr = ecoRand(0.3, 0.8); ecoRock(p.x, p.y, p.z, rr, deco, 100 + i); rocks.push({ x: p.x, z: p.z, y: p.y, r: rr }); }
  // ---------------- 沙底：海星、海胆、海参 ----------------
  for (let i = 0; i < 40; i++) {
    const p = ecoLagoonPoint([0.8, 7]); if (!p) continue; const col = [0x2a5fd0, 0xd8502a, 0xc88a3a, 0xb8322a][i % 4], s = ecoRand(0.08, 0.16), yaw = ECO_R() * TAU;
    for (let a = 0; a < 5; a++) { const g = new THREE.ConeGeometry(0.22, 1, 5); g.rotateZ(-Math.PI / 2); g.translate(0.5, 0, 0); deco.push(ecoPart(g, col, 0, ecoM4(p.x, p.y + 0.012, p.z, 0, yaw + a / 5 * TAU, 0, s, s * 0.18, s))); }
    const c = new THREE.SphereGeometry(0.22, 8, 4); deco.push(ecoPart(c, col, 0, ecoM4(p.x, p.y + 0.012, p.z, 0, 0, 0, s, s * 0.4, s)));
  }
  for (let i = 0; i < 36; i++) {   // 长刺海胆：黑色球体 + 长刺，多在礁石边
    const rk = rocks.length && ECO_R() < 0.6 ? rocks[Math.floor(ECO_R() * rocks.length)] : null, p = rk ? { x: rk.x + ecoRand(-1, 1) * rk.r * 1.3, z: rk.z + ecoRand(-1, 1) * rk.r * 1.3 } : ecoLagoonPoint([1, 7]); if (!p || !ecoIn('lagoon', p.x, p.z)) continue;
    const y = gh(p.x, p.z) + 0.04, b = new THREE.SphereGeometry(0.045, 8, 6); deco.push(ecoPart(b, 0x141418, 0, ecoM4(p.x, y, p.z)));
    for (let k = 0; k < 22; k++) { const th = Math.acos(ecoRand(-0.2, 1)), ph = ECO_R() * TAU, d = V3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)); deco.push(ecoRod(V3(p.x, y, p.z), V3(p.x + d.x * 0.2, y + d.y * 0.2, p.z + d.z * 0.2), 0.004, 0.001, 0x1a1a22, 0, 3)); }
  }
  for (let i = 0; i < 24; i++) {   // 海参：长椭圆、表面疣足（暗褐 / 黑 / 灰褐带斑）
    const p = ecoLagoonPoint([1, 7]); if (!p) continue; const col = [0x2a2018, 0x141210, 0x6a5a44][i % 3], g = new THREE.SphereGeometry(1, 12, 6), P = g.attributes.position;
    for (let k = 0; k < P.count; k++) { const n = 1 + 0.08 * Math.sin(P.getX(k) * 23) * Math.sin(P.getZ(k) * 19); P.setXYZ(k, P.getX(k) * n, P.getY(k) * n, P.getZ(k) * n); } g.computeVertexNormals();
    deco.push(ecoPart(g, (x, y, z) => new THREE.Color(col).multiplyScalar(0.8 + 0.4 * Math.max(0, Math.sin(x * 60) * Math.sin(z * 50))), 0, ecoM4(p.x, p.y + 0.03, p.z, 0, ECO_R() * TAU, 0, ecoRand(0.14, 0.2), 0.035, 0.045)));
  }
  // ---------------- 浅滩沙滩：贝壳按潮线分布（越近水线越密），砗磲空壳较少 ----------------
  const beachPts = [];
  for (let i = 0; i < 4000 && beachPts.length < 380; i++) {
    const x = ecoRand(-58, 58), z = ecoRand(20, 58), h = gh(x, z); if (h < -0.05 || h > 2.2 || ecoZone(x, z) !== null && ecoZone(x, z) !== 'lagoon') continue;
    const k = Math.round(clamp(z - G.z0, 0, G.nz - 1)) * G.nx + Math.round(clamp(x - G.x0, 0, G.nx - 1)); if (X_SD_W(x, z) > 0.5) continue;
    if (ECO_R() > Math.exp(-Math.max(0, h - 0.05) / 0.45)) continue; beachPts.push({ x, z, y: h });
  }
  for (let i = 0; i < beachPts.length; i++) {
    const p = beachPts[i], u = ECO_R(), yaw = ECO_R() * TAU, y = p.y + 0.004;
    if (u < 0.3) { const g = new THREE.SphereGeometry(1, 10, 6, 0, TAU, 0, Math.PI / 2), s = ecoRand(0.02, 0.035); deco.push(ecoPart(g, (x, yy, z) => (Math.sin(x * 900) * Math.sin(z * 800) > 0.5 ? new THREE.Color(0x6a3a1a) : new THREE.Color(0xe8d8b8)), 0, ecoM4(p.x, y, p.z, 0, yaw, 0, s * 1.4, s * 0.8, s))); }
    else if (u < 0.5) { const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new THREE.Vector2(0.03 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - 0.5 * t) + 0.002, t * 0.09)); } const g = new THREE.LatheGeometry(pts, 8); deco.push(ecoPart(g, (x, yy) => ecoMix(0xe8c8a8, 0xc89a78, Math.sin(yy * 300) * 0.5 + 0.5), 0, ecoM4(p.x, y + 0.02, p.z, Math.PI / 2 - 0.3, yaw, 0))); deco.push(ecoFin([[p.x, y + 0.02, p.z], [p.x + Math.cos(yaw) * 0.05, y + 0.005, p.z - Math.sin(yaw) * 0.05], [p.x + Math.cos(yaw + 0.9) * 0.06, y + 0.004, p.z - Math.sin(yaw + 0.9) * 0.06], [p.x + Math.cos(yaw + 1.6) * 0.04, y + 0.004, p.z - Math.sin(yaw + 1.6) * 0.04]], 0xf2b8a8, 0)); }
    else if (u < 0.68) { const pts = []; for (let k = 0; k <= 7; k++) { const t = k / 7; pts.push(new THREE.Vector2(0.022 * (1 - t) * (1 + 0.3 * Math.sin(t * 9)) + 0.001, t * 0.03)); } deco.push(ecoPart(new THREE.LatheGeometry(pts, 9), (x, yy) => ecoMix(0x5a6a3a, 0xa89a6a, Math.sin(yy * 400) * 0.5 + 0.5), 0, ecoM4(p.x, y, p.z, ecoRand(0.4, 1.4), yaw, 0))); }
    else if (u < 0.97) { const s = ecoRand(0.025, 0.05), col = [0xe8844a, 0xf2b0b8, 0xf0ece4, 0xc86a5a][i % 4], g = new THREE.CircleGeometry(1, 12, Math.PI * 0.15, Math.PI * 0.7), P = g.attributes.position; for (let k = 0; k < P.count; k++) { const a = Math.atan2(P.getY(k), P.getX(k)), r = Math.hypot(P.getX(k), P.getY(k)); P.setZ(k, 0.08 * r * Math.cos(a * 18) + 0.25 * r * (1 - r)); } g.computeVertexNormals(); deco.push(ecoPart(g, (x, yy, z) => new THREE.Color(col).multiplyScalar(0.8 + 0.2 * Math.sin((x + z) * 700)), 0, ecoM4(p.x, y + 0.003, p.z, -Math.PI / 2, yaw, 0, s))); }
    else { const s = ecoRand(0.16, 0.26), g = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI, 0, Math.PI / 2), P = g.attributes.position; for (let k = 0; k < P.count; k++) { const a = Math.atan2(P.getZ(k), P.getX(k)); P.setY(k, P.getY(k) + 0.06 * Math.sin(a * 11) * (1 - P.getY(k))); } g.computeVertexNormals(); deco.push(ecoPart(g, (x, yy, z) => ecoMix(0xf4f0e6, 0xd8d0bc, Math.sin(Math.atan2(z - p.z, x - p.x) * 11) * 0.5 + 0.5), 0, ecoM4(p.x, y, p.z, 0, yaw, 0, s, s * 0.6, s * 0.75))); }
  }
  // ---------------- 海草床与海藻（合并摆动网格，随潮汐缓慢摆动） ----------------
  const add = (list, d) => { for (const g of list) plants.push(ecoDepAttr(g, Math.max(0, d))); };
  for (let b = 0; b < 520; b++) {   // 海草床：沿浅水带（水深 0.8～4 m）成片分布，用噪声切出带状斑块
    const x = ecoRand(-46, 46), z = ecoRand(40, 80); if (!ecoIn('lagoon', x, z)) continue; const d = -gh(x, z); if (d < 0.8 || d > 4.2 || SNoise(x * 0.09, z * 0.22) < 0.1) continue;
    const y = gh(x, z), enh = SNoise(x * 0.05 + 7, z * 0.05) > 0.35, list = [];
    if (enh) for (let l = 0; l < 5; l++) list.push(ecoRibbon(x, y, z, Math.min(d - 0.2, ecoRand(0.5, 1.1)), 0.016, ECO_R() * TAU, 0.3, ecoMix(0x3f6a2a, 0x5a7a32, ECO_R()), 6));
    else for (let l = 0; l < 7; l++) list.push(ecoRibbon(x + ecoRand(-0.04, 0.04), y, z + ecoRand(-0.04, 0.04), ecoRand(0.15, 0.35), 0.011, ECO_R() * TAU, 0.4, ecoMix(0x4f7a2e, 0x6f9a3e, ECO_R()), 4));
    add(list, d);
  }
  for (const rk of rocks) {   // 马尾藻（褐黄色、带气囊）长在礁石上；仙掌藻（绿色串珠状）长在礁盘缝隙
    if (ECO_R() < 0.55) { const x = rk.x + ecoRand(-0.3, 0.3), z = rk.z + ecoRand(-0.3, 0.3), y = rk.y + rk.r * 0.6, d = -y, h = Math.min(d - 0.3, ecoRand(0.5, 1.2)), list = []; if (h < 0.25) continue;
      for (let s = 0; s < 3; s++) { const top = V3(x + ecoRand(-0.2, 0.2), y + h * ecoRand(0.8, 1), z + ecoRand(-0.2, 0.2)), awf = (px, py) => clamp((py - y) / h, 0, 1); list.push(ecoRod(V3(x, y, z), top, 0.005, 0.003, 0x7a5a22, awf, 3));
        for (let k = 0; k < 6; k++) { const t = ecoRand(0.2, 1), q = V3(lerp(x, top.x, t), lerp(y, top.y, t), lerp(z, top.z, t)); list.push(ecoRibbon(q.x, q.y, q.z, 0.08, 0.02, ECO_R() * TAU, 1.2, 0x9a7a2a, 2)); const b = new THREE.SphereGeometry(0.012, 5, 3); list.push(ecoPart(b, 0xa88a3a, awf, ecoM4(q.x + ecoRand(-0.03, 0.03), q.y + 0.03, q.z + ecoRand(-0.03, 0.03)))); } }
      add(list, d); }
  }
  for (const rf of reefs) for (let k = 0; k < 12; k++) {
    const x = rf.x + ecoRand(-3, 3), z = rf.z + ecoRand(-3, 3); if (!ecoIn('lagoon', x, z)) continue; const y = gh(x, z), list = [];
    let q = V3(x, y, z); for (let s = 0; s < 7; s++) { const n = V3(q.x + ecoRand(-0.02, 0.02), q.y + 0.024, q.z + ecoRand(-0.02, 0.02)), g = new THREE.CylinderGeometry(0.014, 0.014, 0.006, 7); list.push(ecoPart(g, ecoMix(0x4f9a3a, 0x8ac06a, s / 7), s / 7, ecoM4(n.x, n.y, n.z, ecoRand(-0.4, 0.4), 0, ecoRand(-0.4, 0.4)))); q = n; }
    add(list, -y);
  }
  // 海葵（公主海葵）：短柱 + 密集触手（触手随水摆动）；小丑鱼只出现在海葵附近
  for (let a = 0; a < Math.min(4, reefs.length); a++) {
    const rf = reefs[a], x = rf.x + ecoRand(-1.5, 1.5), z = rf.z + ecoRand(-1.5, 1.5); if (!ecoIn('lagoon', x, z)) continue; const y = gh(x, z), list = [];
    const col = new THREE.CylinderGeometry(0.14, 0.18, 0.1, 12); deco.push(ecoPart(col, 0x9a2a4a, 0, ecoM4(x, y + 0.05, z)));
    for (let k = 0; k < 70; k++) { const r = Math.sqrt(ECO_R()) * 0.16, th = ECO_R() * TAU, b = V3(x + Math.cos(th) * r, y + 0.1, z + Math.sin(th) * r); list.push(ecoRod(b, V3(b.x + Math.cos(th) * 0.05, b.y + ecoRand(0.08, 0.14), b.z + Math.sin(th) * 0.05), 0.01, 0.006, 0xc8b86a, (px, py) => clamp((py - y - 0.1) / 0.14, 0, 1), 4)); }
    add(list, -y); anemones.push({ x, y: y + 0.18, z });
  }
  const decoMesh = new THREE.Mesh(ecoMerge(deco), ecoMat('static', { rough: 0.7 })); decoMesh.receiveShadow = true; scene.add(decoMesh); Z.meshes.push(decoMesh);
  const plantMesh = new THREE.Mesh(ecoMerge(plants), ecoMat('sway', { freq: 0.55, amp: 0.16, depthFade: 0.3, rough: 0.7, side: THREE.DoubleSide })); scene.add(plantMesh); Z.meshes.push(plantMesh);

  // ---------------- 生物 ----------------
  const inLag = (x, z, d0 = 0.5) => ecoIn('lagoon', x, z) && -gh(x, z) > d0;
  // 锦绣龙虾：蓝绿底色带黄黑花纹、两根极长的触角、无大钳；藏在礁石洞口，只露出头胸与触角
  const lob = (lo) => ecoCrustGeo({ len: 0.32, c1: 0x2a7a7a, c2: 0x5ab0a0, band: 0x1a1a10, antenna: 2.4, antR: 0.02, antCol: 0xe8c8c8, h: 0.13, w: 0.15, curl: -0.04 }, lo);
  const lobLod = new EcoLod(scene, [lob(false), lob(true)], ecoMat('crawl', { freq: 3, amp: 0.006, rough: 0.45 }), 6, 16, 60), lobs = [];
  for (const rk of rocks.filter(r => r.r > 0.45).slice(0, 6)) { const a = ECO_R() * TAU, off = rk.r * 0.9; lobs.push({ x: rk.x + Math.cos(a) * off, z: rk.z - Math.sin(a) * off, y: gh(rk.x + Math.cos(a) * off, rk.z - Math.sin(a) * off) + 0.02, yaw: a, base: a, rk, s: ecoRand(0.9, 1.15), ph: ECO_R(), tm: ecoRand(2, 8), out: 0 }); }
  new EcoCritters(lobLod, lobs, (c, dt) => {   // 在洞口前后微动（探出 / 缩回），受惊时缩进洞里
    c.tm -= dt; if (c.tm <= 0) { c.outT = ecoPlayerNear(c, 2) ? -0.1 : ecoRand(-0.05, 0.12); c.tm = ecoRand(3, 9); }
    c.out = lerp(c.out, c.outT ?? 0, dt * 1.5); const off = c.rk.r * 0.9 + c.out; c.x = c.rk.x + Math.cos(c.base) * off; c.z = c.rk.z - Math.sin(c.base) * off; c.yaw = c.base + Math.sin(ECO.t * 0.3 + c.ph * 6) * 0.1;
  });
  // 锯缘青蟹：体型大、青绿色、钳子粗壮，在礁石与沙底之间横行
  const scy = (lo) => ecoCrabGeo({ w: 0.2, c1: 0x3a5a3a, c2: 0x5a7a4a, cc: 0x4a6a3a, tip: 0xd86a2a, claw: 1.35 }, lo);
  const scyLod = new EcoLod(scene, [scy(false), scy(true)], ecoMat('crawl', { freq: 10, amp: 0.01, rough: 0.5 }), 5, 14, 55), scys = [];
  for (let i = 0; i < 5 && rocks.length; i++) { const rk = rocks[Math.floor(ECO_R() * rocks.length)], x = rk.x + rk.r * 1.2, z = rk.z; if (!inLag(x, z)) continue; scys.push({ x, z, y: gh(x, z), yaw: ECO_R() * TAU, s: ecoRand(0.85, 1.15), ph: ECO_R(), state: 'idle', tm: ecoRand(1, 6), sideDir: 1 }); }
  new EcoCritters(scyLod, scys, (c, dt) => { ecoCrawl(c, dt, 0.18, (cc) => { const rk = rocks[Math.floor(ECO_R() * rocks.length)]; if (Math.hypot(rk.x - cc.x, rk.z - cc.z) > 8) return null; cc.sideDir = ECO_R() < 0.5 ? 1 : -1; const x = rk.x + ecoRand(-1.5, 1.5), z = rk.z + ecoRand(-1.5, 1.5); return inLag(x, z) ? { x, z } : null; }, true); c.y = gh(c.x, c.z); });
  // 真蛸：外套膜 + 八条腕（aw∈(2,3] 波动）；贴底缓慢爬行，体色随所在底质变化（沙底浅、礁石暗）；玩家靠近时喷墨逃离
  const octoGeo = (lo) => {
    const parts = [ecoBody(0.22, (t) => { const k = Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.05)); return [0.09 * k, 0.08 * k]; }, (t, a) => ecoMix(0xd8c8b0, 0x9a8a78, 0.5 + 0.5 * Math.sin(t * 30 + a * 5)), lo ? 5 : 10, lo ? 5 : 8, () => 0)];
    parts[0].applyMatrix4(ecoM4(-0.1, 0.1, 0, 0, 0, 0.5));
    for (let a = 0; a < 8; a++) { const th = a / 8 * TAU + 0.2; let p = V3(0.02, 0.03, 0), dir = V3(Math.cos(th), -0.1, Math.sin(th)); const nseg = lo ? 2 : 5;
      for (let k = 0; k < nseg; k++) { const len = 0.12 * (1 - k * 0.12), e = p.clone().addScaledVector(dir, len); e.y = Math.max(0.005, e.y); parts.push(ecoRod(p, e, 0.018 * (1 - k / nseg), 0.018 * (1 - (k + 1) / nseg) + 0.002, ecoMix(0xd8c8b0, 0xe8dcc8, k / nseg), 2 + (k + 1) / nseg, 4)); dir.applyAxisAngle(V3(0, 1, 0), 0.35); p = e; } }
    return ecoMerge(parts);
  };
  const octoLod = new EcoLod(scene, [octoGeo(false), octoGeo(true)], ecoMat('crawl', { freq: 2, amp: 0.02, rough: 0.6 }), 2, 16, 60), octos = [];
  for (let i = 0; i < 2; i++) { const p = ecoLagoonPoint([2.5, 7.6], 120, [-30, 30, 66, 118]); if (p) octos.push({ x: p.x, z: p.z, y: p.y, yaw: ECO_R() * TAU, s: 1.6, ph: ECO_R(), state: 'idle', tm: ecoRand(2, 6), jet: 0, col: new THREE.Color(1, 1, 1), inkCd: 0 }); }
  const sandC = new THREE.Color(1.05, 1.02, 0.95), rockC = new THREE.Color(0.55, 0.45, 0.4);
  new EcoCritters(octoLod, octos, (c, dt) => {
    c.inkCd -= dt;
    if (c.jet > 0) { c.jet -= dt; const sp = 2.2 * clamp(c.jet / 1.4, 0.2, 1); c.x += Math.cos(c.yaw) * sp * dt; c.z -= Math.sin(c.yaw) * sp * dt; if (!inLag(c.x, c.z, 1)) c.yaw += Math.PI * dt * 2; c.y = lerp(c.y, gh(c.x, c.z) + 0.5, dt * 2); c.s = 1.6 * (0.9 + 0.1 * Math.sin(ECO.t * 12)); if (c.jet <= 0) { c.state = 'idle'; c.tm = 3; } return; }
    if (ecoPlayerNear(c, 2.5) && c.inkCd <= 0) { c.jet = 1.4; c.inkCd = 12; const p = ECO.player; c.yaw = Math.atan2(-(c.z - p.z), c.x - p.x); ecoInk(c.x, c.y + 0.1, c.z); return; }
    ecoCrawl(c, dt, 0.1, (cc) => { const x = cc.x + ecoRand(-3, 3), z = cc.z + ecoRand(-3, 3); return inLag(x, z, 1.5) ? { x, z } : null; });
    c.y = lerp(c.y, gh(c.x, c.z), dt * 3); c.s = 1.6;
    // 拟态变色：附近有礁石则偏暗褐，否则接近白沙
    let rk = 0; for (const r of rocks) if (Math.hypot(r.x - c.x, r.z - c.z) < r.r * 2) { rk = 1; break; }
    c.col.lerp(rk ? rockC : sandC, dt * 0.8);
  });
  // 鱼群：蓝绿光鳃鱼成群悬停在珊瑚上方；黄高鳍刺尾鱼、蝴蝶鱼在礁盘间游动
  const predG = () => { const out = []; const p = ECO.player; if (p && p.under) out.push({ x: p.x, y: p.y, z: p.z, r: 2.5 }); for (const d of MARINE.dolphins) out.push({ x: d.x, y: d.y, z: d.z, r: 4 }); return out; };
  const chromis = { len: 0.075, h: 0.035, w: 0.012, c1: 0x5fd8c8, c2: 0xa8f0e0, fin: 0x6ad8d0, tail: 'fork', dorsal: 0.35 };
  const tang = { len: 0.18, h: 0.16, w: 0.03, c1: 0xf2d21a, c2: 0xf6de3a, fin: 0xf2d21a, tail: 'lunate', dorsal: 0.5, round: 0.55, pat: (t, a, c) => { if (t > 0.86 && t < 0.9 && Math.abs(Math.sin(a)) < 0.3) c.set(0xffffff); } };
  const butter = { len: 0.14, h: 0.12, w: 0.025, c1: 0xf4f0e0, c2: 0xf8f4ea, fin: 0xf2d23a, tail: 'round', dorsal: 0.45, round: 0.55, pat: (t, a, c) => { if (t > 0.08 && t < 0.16) c.set(0x141414); else if (t > 0.6) c.lerp(new THREE.Color(0xf2c21a), 0.85); else if (Math.sin(t * 40 + a * 3) > 0.8) c.lerp(new THREE.Color(0x6a6a5a), 0.4); } };
  const tops = coralTops.filter(c => c.y < -0.6);
  for (let k = 0; k < 3 && tops.length; k++) { const an = tops.filter((_, i) => i % 3 === k); if (!an.length) continue; Z.flocks.push(new EcoFlock({ zone: 'lagoon', n: 18, lod: ecoFishLod(scene, chromis, 18, 14, 60), mode: 'reef', anchors: an, home: an[0], range: 20, spawn: 0.5, speed: 0.3, maxSpeed: 1.5, per: 0.4, sep: 1.2, predators: predG, floorGap: 0.2, ceilGap: 0.5 })); }
  Z.flocks.push(new EcoFlock({ zone: 'lagoon', n: 8, lod: ecoFishLod(scene, tang, 8, 16, 60), mode: 'school', home: { x: 0, y: -3, z: 90 }, range: 26, rangeZ: 1, spawn: 1.5, speed: 0.6, maxSpeed: 1.6, per: 1, predators: predG, band: 0.35 }));
  if (reefs.length) Z.flocks.push(new EcoFlock({ zone: 'lagoon', n: 10, lod: ecoFishLod(scene, butter, 10, 16, 60), mode: 'reef', anchors: reefs.map(r => ({ x: r.x, y: r.y + 1.2, z: r.z })), home: reefs[0], range: 26, spawn: 1.4, speed: 0.4, maxSpeed: 1.4, per: 0.6, predators: predG }));
  // 鹦嘴鱼：游到珊瑚前停下啃食（头部一点一点），再换下一处
  const parrot = { len: 0.42, h: 0.14, w: 0.07, c1: 0x2a9a8a, c2: 0x6ac8b0, fin: 0x3a8ab0, tail: 'lunate', dorsal: 0.3, pat: (t, a, c) => { if (Math.abs(Math.sin(t * 26 + a * 2)) > 0.93) c.set(0xd86aa0); if (t < 0.05) c.set(0xe8e0c8); } };
  const parLod = ecoFishLod(scene, parrot, 5, 18, 60), pars = [];
  for (let i = 0; i < 5 && tops.length; i++) { const tp = tops[Math.floor(ECO_R() * tops.length)]; pars.push({ x: tp.x + 1, y: tp.y, z: tp.z, yaw: ECO_R() * TAU, s: ecoRand(0.85, 1.15), ph: ECO_R(), tm: 0, gx: tp.x, gy: tp.y - 0.3, gz: tp.z, eat: 0 }); }
  new EcoCritters(parLod, pars, (c, dt, t) => {
    if (c.eat > 0) { c.eat -= dt; c.pitch = -0.25 + 0.12 * Math.sin(t * 9 + c.ph * 6); return; }
    const d = ecoSwimTo(c, dt, 0.7); if (ecoPlayerNear(c, 2.2)) { c.gx = c.x + (c.x - ECO.player.x) * 2; c.gz = c.z + (c.z - ECO.player.z) * 2; }
    if (d < 0.45) { c.eat = ecoRand(3, 7); const tp = tops[Math.floor(ECO_R() * tops.length)]; c.gx = tp.x + ecoRand(-0.3, 0.3); c.gy = tp.y - 0.35; c.gz = tp.z + ecoRand(-0.3, 0.3); }
    c.y = clamp(c.y, gh(c.x, c.z) + 0.2, -0.5);
  });
  // 小丑鱼：每个海葵 3 条，只在海葵上方 0.3 m 内游动，不成大群
  const clown = { len: 0.085, h: 0.04, w: 0.018, c1: 0xf2742a, c2: 0xf28a3a, fin: 0xf07a2a, tail: 'round', dorsal: 0.35, pat: (t, a, c) => { for (const b of [0.18, 0.5, 0.8]) { const d = Math.abs(t - b); if (d < 0.045) c.set(0xffffff); else if (d < 0.06) c.set(0x141414); } } };
  const clownLod = ecoFishLod(scene, clown, anemones.length * 3, 12, 50), clowns = [];
  for (const an of anemones) for (let k = 0; k < 3; k++) clowns.push({ x: an.x, y: an.y + 0.1, z: an.z, an, yaw: ECO_R() * TAU, s: ecoRand(0.85, 1.1), ph: ECO_R(), gx: an.x, gy: an.y + 0.1, gz: an.z, tm: 0 });
  new EcoCritters(clownLod, clowns, (c, dt) => { c.tm -= dt; if (c.tm <= 0) { const r = ecoPlayerNear(c, 2) ? 0.05 : 0.25; c.gx = c.an.x + ecoRand(-r, r); c.gy = c.an.y + ecoRand(0.02, 0.3); c.gz = c.an.z + ecoRand(-r, r); c.tm = ecoRand(0.8, 2.5); } ecoSwimTo(c, dt, 0.35); });
  // 寄居蟹：背着螺壳在沙滩上缓慢爬行，人走近时缩进壳里
  const hermit = (lo) => { const pts = []; for (let k = 0; k <= 7; k++) { const t = k / 7; pts.push(new THREE.Vector2(0.024 * (1 - t) * (1 + 0.3 * Math.sin(t * 9)) + 0.002, t * 0.035)); }
    const sh = new THREE.LatheGeometry(pts, lo ? 5 : 9); const parts = [ecoPart(sh, (x, y) => ecoMix(0x8a6a4a, 0xc8a878, Math.sin(y * 300) * 0.5 + 0.5), 0, ecoM4(-0.01, 0.018, 0, 0, 0, Math.PI / 2 + 0.3))];
    if (!lo) { for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) { const aw = 0.1 + ((i + (sd > 0 ? 0 : 1)) % 3) * 0.3; parts.push(ecoRod(V3(0.018, 0.012, sd * 0.006), V3(0.03 + i * 0.004, 0, sd * (0.018 + i * 0.004)), 0.003, 0.002, 0xc84a2a, aw, 3)); }
      parts.push(ecoRod(V3(0.02, 0.014, 0.004), V3(0.034, 0.01, 0.01), 0.005, 0.004, 0xd85a3a, 1.1, 4)); for (const sd of [-1, 1]) parts.push(ecoRod(V3(0.02, 0.016, sd * 0.004), V3(0.04, 0.03, sd * 0.012), 0.001, 0.001, 0x8a3a2a, 1.6, 3)); }
    return ecoMerge(parts); };
  const herLod = new EcoLod(scene, [hermit(false), hermit(true)], ecoMat('crawl', { freq: 7, amp: 0.002, rough: 0.5 }), 10, 10, 50), hers = [];
  for (let i = 0; i < 10 && beachPts.length; i++) { const p = beachPts[Math.floor(ECO_R() * beachPts.length)]; hers.push({ x: p.x, z: p.z, y: p.y, yaw: ECO_R() * TAU, s: ecoRand(0.9, 1.3), ph: ECO_R(), state: 'idle', tm: ecoRand(1, 6), hide: 0 }); }
  const onBeach = (x, z) => { const h = gh(x, z); return h > 0.02 && h < 2.2 && x > -58 && x < 58 && z > 20 && z < 60; };
  new EcoCritters(herLod, hers, (c, dt) => {
    const p = ECO.player, near = p && Math.hypot(p.x - c.x, p.z - c.z) < 1.5; if (near) { c.hide = 3; } if (c.hide > 0) { c.hide -= dt; c.state = 'idle'; return; }
    ecoCrawl(c, dt, 0.03, (cc) => { const x = cc.x + ecoRand(-1, 1), z = cc.z + ecoRand(-1, 1); return onBeach(x, z) ? { x, z } : null; }); c.y = gh(c.x, c.z);
  });
  ECO.critters[ECO.critters.length - 1].beach = true;   // 寄居蟹生活在沙滩上（生态测试据此把它按沙滩而非水中检查）
  Z.critters = ECO.critters.slice(c0);
  ECO.zones.lagoon = Z;
  ECO.lagoonPts = { reefs, anemones, rocks, octos, lobs };
  ECO.lagoonInfo = { reefs: reefs.length, rocks: rocks.length, corals: coralTops.length, anemones: anemones.length, shells: beachPts.length, lobsters: lobs.length, crabs: scys.length, octopus: octos.length, parrot: pars.length, clown: clowns.length, hermit: hers.length };
}
// 墨汁：一团深色云雾，扩散变大、逐渐变淡（全局只复用一个网格）
function ecoInk(x, y, z) {
  if (!ECO.ink) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0x0c0a10, transparent: true, opacity: 0.8, depthWrite: false })); m.visible = false; ECO.scene.add(m); ECO.ink = { m, t: 9 }; }
  ECO.ink.m.position.set(x, y, z); ECO.ink.t = 0; ECO.ink.m.visible = true;
}
