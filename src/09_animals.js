// ======================= 09 牲畜与禽类：高精度模型 + 骨骼式肢体动画 + 自主游走 =======================
// 部件编号 limb：0 躯干 1–4 四肢（前左/前右/后左/后右）5 头颈 6 尾；pivot 为关节点（模型空间）
function animalModel(kind) {
  const parts = [], R = mulberry32(kind.length * 97);
  const part = (g, color, limb = 0, pivot = [0, 0, 0], tex = null) => {
    g = g.index ? g.toNonIndexed() : g; const n = g.attributes.position.count, c = [], l = [], pv = [];
    const p = g.attributes.position;
    for (let i = 0; i < n; i++) { const cc = typeof color === 'function' ? color(p.getX(i), p.getY(i), p.getZ(i)) : color; c.push(cc[0], cc[1], cc[2]); l.push(limb); pv.push(...pivot); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('limb', new THREE.Float32BufferAttribute(l, 1)); g.setAttribute('pivot', new THREE.Float32BufferAttribute(pv, 3));
    if (g.attributes.uv) g.deleteAttribute('uv'); parts.push(g);
  };
  const sph = (x, y, z, sx, sy, sz, w = 14, h = 10) => { const g = new THREE.SphereGeometry(1, w, h); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
  const seg = (a, b, r0, r1, sides = 8) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = new THREE.Vector3().subVectors(B, A), L = d.length(); const g = new THREE.CylinderGeometry(r1, r0, L, sides, 1); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(A.x, A.y, A.z); return g; };
  const hexC = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
  const legs = (fx, bx, hz, hy, r, lower, hoof, col, hoofCol) => {
    [[fx, hz, 1], [fx, -hz, 2], [bx, hz, 3], [bx, -hz, 4]].forEach(([x, z, li]) => {
      const pv = [x, hy, z];
      part(seg([x, hy, z], [x + 0.02, hy * 0.45, z], r, r * 0.8), col, li, pv);
      part(seg([x + 0.02, hy * 0.45, z], [x, 0.05, z], r * 0.75, r * 0.6), col, li, pv);
      part(seg([x, 0.05, z], [x + 0.02, 0.0, z], r * 0.7, r * 0.75), hoofCol, li, pv);
    });
  };
  if (kind === 'cow') {
    const white = hexC(0xf1ece2), black = hexC(0x1e1b19), pink = hexC(0xd8a095);
    const patch = (x, y, z) => SNoise(x * 2.2 + 3, y * 2.2 + z * 1.7) > 0.15 ? black : white;
    part(sph(0, 1.08, 0, 1.12, 0.52, 0.46, 18, 12), patch);
    part(sph(0.62, 1.02, 0, 0.55, 0.5, 0.44), patch); part(sph(-0.7, 1.1, 0, 0.5, 0.46, 0.44), patch);
    part(sph(-0.55, 0.62, 0, 0.2, 0.14, 0.2), pink);                                  // 乳房
    part(seg([0.95, 1.2, 0], [1.3, 1.3, 0], 0.26, 0.18), patch, 5, [0.95, 1.2, 0]);
    part(sph(1.45, 1.26, 0, 0.3, 0.2, 0.17), patch, 5, [0.95, 1.2, 0]); part(sph(1.66, 1.15, 0, 0.14, 0.12, 0.13), pink, 5, [0.95, 1.2, 0]);
    for (const s of [-1, 1]) { part(sph(1.38, 1.36, s * 0.2, 0.1, 0.04, 0.07), black, 5, [0.95, 1.2, 0]); part(seg([1.4, 1.42, s * 0.1], [1.42, 1.52, s * 0.2], 0.03, 0.012, 5), hexC(0xe8dcc0), 5, [0.95, 1.2, 0]); part(sph(1.58, 1.3, s * 0.1, 0.025, 0.025, 0.025, 6, 4), black, 5, [0.95, 1.2, 0]); }
    part(seg([-1.08, 1.28, 0], [-1.15, 0.55, 0], 0.03, 0.02, 5), black, 6, [-1.08, 1.28, 0]); part(sph(-1.16, 0.5, 0, 0.05, 0.1, 0.05, 6, 5), black, 6, [-1.08, 1.28, 0]);
    legs(0.72, -0.72, 0.22, 0.95, 0.085, 0.4, 0.05, patch, black);
  } else if (kind === 'sheep') {
    const wool = hexC(0xebe5d6), face = hexC(0x2a2522);
    const lump = (x, y, z) => { const v = 0.9 + 0.1 * SNoise(x * 9, y * 9 + z * 7); return [wool[0] * v, wool[1] * v, wool[2] * v]; };
    const body = new THREE.IcosahedronGeometry(1, 3); { const p = body.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = 1 + 0.07 * SNoise(x * 6, y * 6 + z * 5); p.setXYZ(i, x * 0.62 * f, 0.66 + y * 0.36 * f, z * 0.36 * f); } }
    part(body, lump);
    part(seg([0.5, 0.75, 0], [0.68, 0.82, 0], 0.13, 0.1), wool, 5, [0.5, 0.75, 0]);
    part(sph(0.8, 0.8, 0, 0.17, 0.12, 0.1), face, 5, [0.5, 0.75, 0]); for (const s of [-1, 1]) part(sph(0.72, 0.86, s * 0.12, 0.08, 0.025, 0.04), face, 5, [0.5, 0.75, 0]);
    part(sph(0.72, 0.9, 0, 0.12, 0.08, 0.11), wool, 5, [0.5, 0.75, 0]);
    part(sph(-0.62, 0.72, 0, 0.08, 0.1, 0.06), wool, 6, [-0.6, 0.78, 0]);
    legs(0.36, -0.36, 0.14, 0.5, 0.035, 0.2, 0.03, face, face);
  } else if (kind === 'pig') {
    const skin = hexC(0xe8ae9e), dark = hexC(0xa86a60);
    part(sph(0, 0.5, 0, 0.62, 0.3, 0.3, 16, 10), skin);
    part(sph(0.58, 0.52, 0, 0.22, 0.2, 0.2), skin, 5, [0.4, 0.5, 0]); part(seg([0.74, 0.5, 0], [0.84, 0.48, 0], 0.08, 0.08, 10), dark, 5, [0.4, 0.5, 0]);
    for (const s of [-1, 1]) part(sph(0.6, 0.68, s * 0.12, 0.07, 0.03, 0.07), skin, 5, [0.4, 0.5, 0]);
    for (let i = 0; i < 6; i++) { const t = i / 6; part(sph(-0.62 - 0.05 * Math.cos(t * TAU), 0.58 + 0.05 * Math.sin(t * TAU), 0, 0.02, 0.02, 0.02, 5, 4), skin, 6, [-0.6, 0.58, 0]); }
    legs(0.35, -0.35, 0.15, 0.32, 0.05, 0.14, 0.02, skin, dark);
  } else if (kind === 'chicken') {
    const feather = hexC(R() < 0.5 ? 0xb4652e : 0xf2eee4), red = hexC(0xd0231e), yel = hexC(0xe7b43a);
    part(sph(0, 0.3, 0, 0.19, 0.15, 0.13), feather);
    part(sph(0.15, 0.44, 0, 0.075, 0.08, 0.065), feather, 5, [0.12, 0.38, 0]);
    part(seg([0.21, 0.45, 0], [0.26, 0.43, 0], 0.02, 0.004, 5), yel, 5, [0.12, 0.38, 0]);
    for (let i = 0; i < 3; i++) part(sph(0.12 + i * 0.03, 0.52 - Math.abs(i - 1) * 0.01, 0, 0.018, 0.028, 0.008, 6, 4), red, 5, [0.12, 0.38, 0]);
    part(sph(0.2, 0.39, 0, 0.012, 0.022, 0.01, 5, 4), red, 5, [0.12, 0.38, 0]);
    part(seg([-0.14, 0.34, 0], [-0.24, 0.5, 0], 0.07, 0.02, 6), feather, 6, [-0.14, 0.34, 0]);
    for (const [z, li] of [[0.05, 3], [-0.05, 4]]) part(seg([0, 0.2, z], [0.01, 0.0, z], 0.012, 0.01, 4), yel, li, [0, 0.2, z]);
  } else if (kind === 'duck' || kind === 'goose') {
    const g_ = kind === 'goose', body = hexC(g_ ? 0xe9e7e2 : 0xf6f4ee), bill = hexC(0xe8892a), s = g_ ? 1.35 : 1;
    part(sph(0, 0.2 * s, 0, 0.26 * s, 0.14 * s, 0.15 * s), body);
    part(sph(-0.24 * s, 0.26 * s, 0, 0.06 * s, 0.04 * s, 0.07 * s), body, 6, [-0.2 * s, 0.24 * s, 0]);
    if (g_) { part(seg([0.2 * s, 0.26 * s, 0], [0.3 * s, 0.6 * s, 0], 0.045 * s, 0.035 * s, 7), body, 5, [0.2 * s, 0.26 * s, 0]); part(sph(0.33 * s, 0.63 * s, 0, 0.06 * s, 0.05 * s, 0.045 * s), body, 5, [0.2 * s, 0.26 * s, 0]); part(seg([0.37 * s, 0.62 * s, 0], [0.46 * s, 0.6 * s, 0], 0.022 * s, 0.012 * s, 6), bill, 5, [0.2 * s, 0.26 * s, 0]); }
    else { part(sph(0.22, 0.36, 0, 0.07, 0.065, 0.06), body, 5, [0.16, 0.28, 0]); part(sph(0.31, 0.34, 0, 0.055, 0.015, 0.03), bill, 5, [0.16, 0.28, 0]); }
    for (const [z, li] of [[0.05, 3], [-0.05, 4]]) part(seg([0, 0.1 * s, z], [0.01, 0.0, z], 0.012, 0.01, 4), bill, li, [0, 0.1 * s, z]);
  }
  const g = THREE.BufferGeometryUtils.mergeGeometries(parts); g.computeVertexNormals(); return g;
}
function animalMaterial(speed) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
  const uT = { value: 0 }; TIME_U.push(uT);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uT; sh.uniforms.uSpeed = { value: speed };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute float limb; attribute vec3 pivot; attribute vec3 iAnim; uniform float uTime, uSpeed;
      mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
      mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float ph = uTime * uSpeed * (0.6 + iAnim.x) + iAnim.z * 6.2831;
        float gait = iAnim.x, head = iAnim.y; mat3 Rl = mat3(1.0);
        if (limb > 0.5 && limb < 4.5) { float off = (limb < 1.5 || limb > 3.5) ? 0.0 : 3.14159; Rl = rotZ(sin(ph + off) * 0.55 * gait); }
        else if (limb > 4.5 && limb < 5.5) Rl = rotZ(-head * 0.95 + sin(ph * 2.0) * 0.05 * gait);
        else if (limb > 5.5) Rl = rotY(sin(uTime * 3.0 + iAnim.z * 9.0) * 0.35);
        objectNormal = Rl * objectNormal;`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n        transformed = Rl * (transformed - pivot) + pivot;\n        transformed.y += (limb < 0.5 ? abs(sin(ph)) * 0.02 * gait : 0.0);');
  };
  return m;
}
const ANIMALS = [];   // 运行时：{kind, mesh, i, x, z, yaw, tx, tz, state, t, speed, region}
function buildAnimals(scene) {
  const R = mulberry32(555);
  const inPasture = (x, z) => pointInPoly(x, z, L.pasture) && rectSD(x, z, L.barn.x, L.barn.z, L.barn.w / 2 + 1, L.barn.d / 2 + 1, 0) > 0;
  const rectReg = (pen, m = 1.2) => (x, z) => Math.abs(x - pen.x) < pen.w / 2 - m && z > pen.z - pen.d / 2 + 5.5 && z < pen.z + pen.d / 2 - m;
  const duckLand = (x, z) => Math.abs(x - L.duck.x) < 11 && z > L.duck.z - 3.8 && z < L.duck.z + 4;
  const lakeW = (x, z) => lakeSD(x, z, L.lake, 0.1) > 1.5 && Math.hypot(x - FALL.plunge.x, z - FALL.plunge.z) > 5;
  const REG = { pasture: [inPasture, [-236, -44, -164, 14]], pig: [rectReg(L.pig), [L.pig.x - 12, L.pig.z - 10, L.pig.x + 12, L.pig.z + 10]], chicken: [rectReg(L.chicken, 0.8), [L.chicken.x - 12, L.chicken.z - 10, L.chicken.x + 12, L.chicken.z + 10]], duckLand: [duckLand, [L.duck.x - 12, L.duck.z - 5, L.duck.x + 12, L.duck.z + 5]], lake: [lakeW, [L.lake.x - 16, L.lake.z - 11, L.lake.x + 16, L.lake.z + 11]] };
  const pick = (reg) => { const [f, b] = REG[reg]; for (let k = 0; k < 200; k++) { const x = lerp(b[0], b[2], R()), z = lerp(b[1], b[3], R()); if (f(x, z)) return [x, z]; } return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
  const SPECS = [
    ['cow', 7, 'pasture', 0.75, 4.2, 1.0], ['sheep', 11, 'pasture', 0.8, 5.5, 0.55], ['pig', 5, 'pig', 0.6, 6.5, 0.5],
    ['chicken', 18, 'chicken', 0.9, 12, 0], ['duck', 4, 'duckLand', 0.4, 9, 0], ['duck', 5, 'lake', 0.5, 4, 0], ['goose', 2, 'duckLand', 0.45, 7, 0], ['goose', 2, 'lake', 0.5, 3.5, 0],
  ];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), ps = new THREE.Vector3(), eu = new THREE.Euler();
  for (const [kind, n, reg, speed, gaitHz, coll] of SPECS) {
    const geo = animalModel(kind), mat = animalMaterial(gaitHz);
    const anim = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); anim.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('iAnim', anim);
    const im = new THREE.InstancedMesh(geo, mat, n); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
    for (let i = 0; i < n; i++) {
      const [x, z] = pick(reg), a = { kind, mesh: im, anim, i, x, z, yaw: R() * TAU, tx: x, tz: z, state: 'idle', t: R() * 4, speed, reg, coll, water: reg === 'lake', seed: R(), head: 0, gait: 0 };
      ANIMALS.push(a); anim.setXYZ(i, 0, 0, a.seed);
    }
  }
  ANIMALS.pick = pick; ANIMALS.REG = REG;
  updateAnimals(0, null);
}
// 行为：吃草/停歇 → 选目标游走 → 抵达；越界或受惊则转向；鸡在玩家靠近时四散
function updateAnimals(dt, player) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), ps = new THREE.Vector3(), eu = new THREE.Euler(), dirty = new Set();
  for (const a of ANIMALS) {
    const inReg = ANIMALS.REG[a.reg][0];
    a.t -= dt;
    const pd = player ? Math.hypot(player.x - a.x, player.z - a.z) : 1e9;
    if (player && pd < (a.kind === 'chicken' ? 3.5 : a.kind === 'cow' ? 2.2 : 2.8) && a.state !== 'flee') {
      const ang = Math.atan2(a.z - player.z, a.x - player.x); let tx = a.x + Math.cos(ang) * 5, tz = a.z + Math.sin(ang) * 5;
      if (inReg(tx, tz)) { a.tx = tx; a.tz = tz; a.state = 'flee'; a.t = 3; }
    }
    if (a.state === 'idle' && a.t <= 0) { [a.tx, a.tz] = ANIMALS.pick(a.reg); if (Math.hypot(a.tx - a.x, a.tz - a.z) > 18) { const k = 18 / Math.hypot(a.tx - a.x, a.tz - a.z); a.tx = a.x + (a.tx - a.x) * k; a.tz = a.z + (a.tz - a.z) * k; if (!inReg(a.tx, a.tz)) [a.tx, a.tz] = ANIMALS.pick(a.reg); } a.state = 'walk'; a.t = 25; }
    let targetGait = 0, targetHead = 0;
    if (a.state === 'walk' || a.state === 'flee') {
      const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
      if (d < 0.3 || a.t <= 0) { a.state = 'idle'; a.t = 2 + a.seed * 6 + Math.random() * 4; }
      else {
        const want = Math.atan2(-dz, dx); let da = ((want - a.yaw + Math.PI * 3) % TAU) - Math.PI; a.yaw += clamp(da, -2.5 * dt, 2.5 * dt);
        const sp = a.speed * (a.state === 'flee' ? 2.2 : 1) * (Math.abs(da) > 1.2 ? 0.3 : 1), nx = a.x + Math.cos(a.yaw) * sp * dt, nz = a.z - Math.sin(a.yaw) * sp * dt;
        if (inReg(nx, nz)) { a.x = nx; a.z = nz; } else { a.state = 'idle'; a.t = 0.5; }
        targetGait = a.state === 'flee' ? 1 : 0.75;
      }
    } else targetHead = (a.kind === 'cow' || a.kind === 'sheep' || a.kind === 'chicken' || (a.kind === 'duck' && !a.water)) && a.seed > 0.3 ? 1 : 0;
    for (const b of ANIMALS) if (b !== a && b.reg === a.reg) { const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz), m = (a.coll || 0.25) + (b.coll || 0.25); if (d < m && d > 1e-3) { const k = (m - d) * 0.5 / d; if (inReg(a.x + dx * k, a.z + dz * k)) { a.x += dx * k; a.z += dz * k; } } }
    a.gait = lerp(a.gait, targetGait, Math.min(1, dt * 4)); a.head = lerp(a.head, targetHead, Math.min(1, dt * 1.5));
    const y = a.water ? L.lake.level - 0.08 + Math.sin(performance.now() / 700 + a.seed * 9) * 0.02 : gh(a.x, a.z);
    eu.set(0, a.yaw, 0); q.setFromEuler(eu); m4.compose(ps.set(a.x, y, a.z), q, sc); a.mesh.setMatrixAt(a.i, m4);
    a.anim.setXYZ(a.i, a.gait, a.head, a.seed); dirty.add(a);
  }
  for (const a of dirty) { a.mesh.instanceMatrix.needsUpdate = true; a.anim.needsUpdate = true; }
}
