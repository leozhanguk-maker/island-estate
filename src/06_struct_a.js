// ======================= 06a 材质 / 批处理 / 盆地建筑 =======================
const std = (color, rough = 0.8, metal = 0, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: metal }, extra));
const M = {
  concrete: std(0xd2cfc7, 0.88), concreteDark: std(0xa7a49c, 0.9), concreteWarm: std(0xcfc6b8, 0.85),
  wallWarm: std(0xeee9e0, 0.72), wallGray: std(0xcdcdc8, 0.78), wallLight: std(0xe4e3de, 0.75),
  metalDark: std(0x3a3f45, 0.45, 0.6), metalMid: std(0x6c737a, 0.42, 0.65), galv: std(0xb3babf, 0.36, 0.85),
  alu: std(0xd3d7da, 0.3, 0.8), glass: std(0x1c2a33, 0.05, 0.25, { envMapIntensity: 1.5 }),
  glassLight: std(0x6f8f9c, 0.06, 0.2, { transparent: true, opacity: 0.45, envMapIntensity: 1.4 }),
  film: std(0xeef4f5, 0.3, 0.0, { transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false }),
  wood: std(0x9b7453, 0.82), woodDark: std(0x6f5139, 0.85), white: std(0xf4f5f5, 0.4),
  yachtWhite: std(0xf6f7f7, 0.22, 0.05, { envMapIntensity: 1.2, side: THREE.DoubleSide }), yachtGlass: std(0x0f171e, 0.04, 0.35, { envMapIntensity: 1.6 }),
  teak: std(0xa9825a, 0.7), rubber: std(0x1c1c1c, 0.85), steelWhite: std(0xf1f2f2, 0.42),
  solar: std(0x1b2a44, 0.16, 0.3, { envMapIntensity: 1.3 }), pw: std(0xe9ebec, 0.5), pwDark: std(0x2a2e33, 0.5),
  roofDark: std(0x4b5054, 0.55, 0.45), roofRust: std(0x74604f, 0.72, 0.35), cladGray: std(0xb9bdbf, 0.5, 0.55),
  court: std(0x3c7a61, 0.85), courtOut: std(0x5b8a70, 0.88), line: std(0xf4f4ef, 0.8), dark: std(0x222426, 0.8),
  fence: std(0x2f3a33, 0.7, 0.3, { transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
  mesh: std(0x9aa3a8, 0.5, 0.6, { transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
  yellow: std(0xf2c230, 0.6), red: std(0xc9302c, 0.6), orange: std(0xe8702a, 0.7), green: std(0x2f7d4f, 0.7),
  pool: std(0x39b7cc, 0.05, 0.0, { emissive: 0x0b3a44, emissiveIntensity: 0.35, envMapIntensity: 1.5 }),
  stone: std(0xd8d3c7, 0.85), cushion: std(0xefe9dc, 0.9), canvasWhite: std(0xf3efe6, 0.9), cushionDark: std(0x34383c, 0.9),
  soil: std(0x7a5f45, 0.95), floorWood: std(0xb08a62, 0.6), rug: std(0xd8cfbf, 0.95), sofa: std(0x8f949a, 0.9),
  lamp: std(0xffffff, 0.5, 0, { emissive: 0xfff2d6, emissiveIntensity: 2.2 }), ceiling: std(0xf2efe8, 0.9, 0, { emissive: 0xf2efe8, emissiveIntensity: 0.28 }),
  glassClear: std(0xb8ccd2, 0.04, 0.1, { transparent: true, opacity: 0.22, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide }), gravel: std(0xb9b19c, 0.95), rockMat: std(0x8a8377, 0.9),
};
const BOXG = new THREE.BoxGeometry(1, 1, 1);
// 漫游碰撞登记：圆柱体、矩形实体、线段（栏杆/围栏/葡萄行）、可行走面
const COLL = { circles: [], rects: [], segs: [], walks: [] };
const collC = (x, z, r) => COLL.circles.push({ x, z, r });
const collR = (x, z, hw, hd, rot = 0, top = 1e9, bottom = -1e9) => COLL.rects.push({ x, z, hw, hd, rot, top, bottom });
// 楼梯：可视踏步 + 可行走坡面 + 两侧扶手（带高度带的碰撞线段）
// toW：局部 (lx, lz) → 世界 [x, z]；baseY：局部 y=0 对应的世界高度；沿局部 z 从 z0（底）到 z1（顶）
function stairs(p, toW, baseY, lx, z0, z1, yb, yt, w, opt = {}) {
  const n = Math.max(3, Math.round((yt - yb) / 0.18)), run = (z1 - z0) / n, rise = (yt - yb) / n, mat = opt.mat || M.floorWood;
  for (let i = 0; i < n; i++) box(p, w, Math.max(0.05, rise * (opt.solid ? i + 1 : 1)), Math.abs(run) + 0.02, mat, lx, yb + (opt.solid ? rise * (i + 1) / 2 : rise * (i + 0.5)), z0 + run * (i + 0.5));
  if (!opt.solid) for (const sx of [-1, 1]) { const g = new THREE.Group(); p.add(g); const L = Math.hypot(z1 - z0, yt - yb); const m = box(g, 0.06, 0.25, L, opt.frame || M.metalDark, lx + sx * w / 2, (yb + yt) / 2 - 0.1, (z0 + z1) / 2); m.rotation.x = -Math.atan2(yt - yb, z1 - z0); }
  if (opt.rail !== false) for (const sx of opt.railSides || [-1, 1]) railing(p, [new THREE.Vector3(lx + sx * w / 2, yb, z0), new THREE.Vector3(lx + sx * w / 2, yt, z1)], 0.95, opt.railMat || M.metalDark, 1.2, 0.025);
  const a = toW(lx, z0), b = toW(lx, z1);
  COLL.walks.push({ kind: 'ramp', x0: a[0], z0: a[1], x1: b[0], z1: b[1], hw: w / 2, y0: baseY + yb + 0.02, y1: baseY + yt + 0.02 });
  const band0 = baseY + Math.min(yb, yt) - 0.3, band1 = baseY + Math.max(yb, yt) - 0.1;
  for (const sx of [-1, 1]) { const c = toW(lx + sx * (w / 2 + 0.05), z0), d = toW(lx + sx * (w / 2 + 0.05), z1); if (!(opt.openSides || []).includes(sx)) collS(c[0], c[1], d[0], d[1], band0, band1); }
}
// 交互点：按 E 执行（传送到平台/甲板/楼上等）
const INTERACT = [];
const DYN = { walks: [], segs: [], rects: [], interact: [] };   // 随游艇移动的碰撞/可行走面（每帧由局部坐标换算）
const HIBISCUS = [];   // 扶桑植株位置（世界坐标）
const POTS = [];       // 盆栽花卉：{ kind: 'narcissus' | 'rose', x, y, z }
// 座位：type 'sit' 坐 / 'lie' 躺；yaw 为人面朝方向（three.js rotation.y 约定：人物正前方为 -z 旋转 yaw）
const SEATS = [];
function addSeat(x, y, z, yaw, type = 'sit', boatLocal = false) { SEATS.push({ x, y, z, yaw, type, boatLocal }); }
// ---------------- 精细家具构件（局部坐标，面朝 +z 为正面） ----------------
function g0(m) { return m; }
function slideDoor(p, x, y, z, w, h) { box(p, w, h, 0.04, M.glassClear, x, y, z); box(p, w, 0.05, 0.08, M.metalDark, x, y + h / 2, z); box(p, w, 0.05, 0.08, M.metalDark, x, y - h / 2, z); for (const sx of [-1, 1]) box(p, 0.05, h, 0.08, M.metalDark, x + sx * w / 2, y, z); box(p, 0.03, 0.4, 0.05, M.alu, x - w / 2 + 0.1, y, z + 0.05); }
function furn(p, x, y, z, ry) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g); return g; }
function sofaF(p, x, y, z, ry, w = 2.4, color = 0x8f949a, pillows = [0xc9b89a, 0x6f7f8a]) {
  const g = furn(p, x, y, z, ry), fab = std(color, 0.95), dark = std(0x2a2826, 0.6);
  box(g, w, 0.16, 0.9, dark, 0, 0.12, 0);
  const n = Math.max(2, Math.round(w / 0.8)), cw = (w - 0.3) / n;
  for (let i = 0; i < n; i++) { box(g, cw - 0.03, 0.18, 0.78, fab, -w / 2 + 0.15 + cw * (i + 0.5), 0.3, 0.03); box(g, cw - 0.05, 0.42, 0.2, fab, -w / 2 + 0.15 + cw * (i + 0.5), 0.6, -0.3).rotation.x = -0.12; }
  for (const sx of [-1, 1]) box(g, 0.15, 0.5, 0.9, fab, sx * (w / 2 - 0.075), 0.35, 0);
  box(g, w, 0.42, 0.16, fab, 0, 0.5, -0.38);
  pillows.forEach((c, i) => { const pl = box(g, 0.42, 0.4, 0.12, std(c, 0.95), (i ? 1 : -1) * (w / 2 - 0.45), 0.6, -0.18); pl.rotation.x = -0.25; pl.rotation.z = (i ? -1 : 1) * 0.12; });
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, 0.05, 0.05, 0.05, dark, a * (w / 2 - 0.08), 0.025, b * 0.38);
  return g;
}
function tableF(p, x, y, z, ry, w, d, h, top = M.woodDark, leg = M.metalDark) {
  const g = furn(p, x, y, z, ry); box(g, w, 0.04, d, top, 0, h - 0.02, 0);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, 0.05, h - 0.04, 0.05, leg, a * (w / 2 - 0.08), (h - 0.04) / 2, b * (d / 2 - 0.08));
  return g;
}
function bedF(p, x, y, z, ry, w = 1.8, L = 2.1, duvet = 0xf1ede4) {
  const g = furn(p, x, y, z, ry), wood = M.woodDark;
  box(g, w + 0.1, 0.25, L + 0.1, wood, 0, 0.2, 0);
  box(g, w, 0.22, L, std(0xfafaf8, 0.9), 0, 0.43, 0);
  box(g, w + 0.06, 0.08, L * 0.7, std(duvet, 0.95), 0, 0.57, L * 0.15);
  box(g, w + 0.08, 0.3, 0.04, std(duvet, 0.95), 0, 0.43, L / 2 + 0.03);
  box(g, w * 0.95, 0.03, 0.35, std(0x9aa7b0, 0.9), 0, 0.62, L * 0.15 - L * 0.35 + 0.2);
  for (const sx of [-1, 1]) { const pl = box(g, w / 2 - 0.15, 0.14, 0.4, std(0xffffff, 0.9), sx * w / 4, 0.62, -L / 2 + 0.3); pl.rotation.x = -0.2; }
  box(g, w + 0.2, 1.0, 0.12, std(0xcbbfae, 0.95), 0, 0.85, -L / 2 - 0.05);
  for (const sx of [-1, 1]) { box(g, 0.5, 0.5, 0.42, wood, sx * (w / 2 + 0.4), 0.25, -L / 2 + 0.25); cyl(g, 0.02, 0.06, 0.12, M.metalDark, sx * (w / 2 + 0.4), 0.56, -L / 2 + 0.25, 8); cyl(g, 0.15, 0.1, 0.2, M.canvasWhite, sx * (w / 2 + 0.4), 0.72, -L / 2 + 0.25, 12); }
  return g;
}
function shelfF(p, x, y, z, ry, w = 2.4, h = 2.2) {
  const g = furn(p, x, y, z, ry), R = mulberry32(Math.round(x * 13 + z * 7));
  box(g, w, h, 0.05, M.woodDark, 0, h / 2, -0.17); for (const sx of [-1, 1]) box(g, 0.04, h, 0.36, M.woodDark, sx * w / 2, h / 2, 0);
  for (let k = 0; k <= 4; k++) box(g, w, 0.03, 0.36, M.woodDark, 0, 0.02 + k * (h - 0.05) / 4, 0);
  const bc = [0x8a3b2e, 0x2e4a6a, 0xc9b27a, 0x3d5a3a, 0xe8e2d6, 0x5a3a5a, 0x1f1f1f];
  for (let k = 0; k < 4; k++) { let bx = -w / 2 + 0.06; while (bx < w / 2 - 0.12) { const bw = 0.025 + R() * 0.035, bh = 0.2 + R() * 0.14; if (R() < 0.12) { bx += 0.12; continue; } box(g, bw, bh, 0.22, std(bc[Math.floor(R() * bc.length)], 0.8), bx + bw / 2, 0.05 + k * (h - 0.05) / 4 + bh / 2, 0.02); bx += bw + 0.004; } }
  return g;
}
function lampF(p, x, y, z) { const g = furn(p, x, y, z, 0); cyl(g, 0.15, 0.18, 0.03, M.metalDark, 0, 0.015, 0, 12); cyl(g, 0.012, 0.012, 1.55, M.metalDark, 0, 0.8, 0, 6); cyl(g, 0.18, 0.24, 0.3, std(0xf4efe4, 0.9, 0, { emissive: 0xfff0d0, emissiveIntensity: 0.4, side: THREE.DoubleSide }), 0, 1.6, 0, 16); return g; }
function officeChairF(p, x, y, z, ry) {
  const g = furn(p, x, y, z, ry), dk = std(0x26282b, 0.6);
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; box(g, 0.32, 0.03, 0.05, M.alu, Math.cos(a) * 0.16, 0.06, Math.sin(a) * 0.16).rotation.y = -a; cyl(g, 0.025, 0.025, 0.04, dk, Math.cos(a) * 0.3, 0.025, Math.sin(a) * 0.3, 8); }
  cyl(g, 0.025, 0.03, 0.38, M.alu, 0, 0.26, 0, 8); box(g, 0.48, 0.07, 0.46, dk, 0, 0.47, 0); box(g, 0.46, 0.55, 0.05, std(0x3a3c40, 0.8), 0, 0.82, -0.23).rotation.x = 0.1;
  return g;
}
function imacF(p, x, y, z, ry) {   // 24 英寸 iMac + 妙控键盘 + 妙控鼠标
  const g = furn(p, x, y, z, ry), alu = std(0xd8dde0, 0.3, 0.8), back = std(0x7fa7c9, 0.35, 0.5);
  box(g, 0.547, 0.461, 0.0115, back, 0, 0.36, -0.05); box(g, 0.53, 0.3, 0.003, std(0x0a0d12, 0.15, 0, { emissive: 0x6a8fb8, emissiveIntensity: 0.55 }), 0, 0.39, -0.043);
  box(g, 0.547, 0.13, 0.013, std(0xbdd3e8, 0.35, 0.5), 0, 0.195, -0.049); box(g, 0.13, 0.2, 0.012, alu, 0, 0.1, -0.075).rotation.x = 0.25; box(g, 0.14, 0.006, 0.15, alu, 0, 0.003, -0.09);
  box(g, 0.279, 0.009, 0.115, alu, 0, 0.005, 0.18); for (let r = 0; r < 5; r++) for (let c = 0; c < 13; c++) box(g, 0.017, 0.003, 0.016, std(0xf4f4f2, 0.5), -0.12 + c * 0.02, 0.011, 0.14 + r * 0.019);
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), std(0xf2f2f0, 0.3)); mouse.scale.set(0.95, 0.35, 1.9); mouse.position.set(0.24, 0.008, 0.18); g.add(mouse);
  return g;
}
const collS = (ax, az, bx, bz, bottom = -1e9, top = 1e9) => COLL.segs.push({ ax, az, bx, bz, bottom, top });
const BATCH = new Map();
function addGeo(geo, mat, matrix) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.applyMatrix4(matrix);
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!BATCH.has(mat)) BATCH.set(mat, []);
  BATCH.get(mat).push(g);
}
function bake(group) {
  group.updateMatrixWorld(true);
  group.traverse(o => { if (o.isMesh && !o.userData.live) addGeo(o.geometry, o.material, o.matrixWorld); });
}
function flushBatches(scene) {
  const out = [];
  for (const [mat, list] of BATCH) {
    const merged = THREE.BufferGeometryUtils.mergeGeometries(list, false);
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = !mat.transparent; mesh.receiveShadow = true;
    scene.add(mesh); out.push(mesh);
    list.forEach(g => g.dispose());
  }
  BATCH.clear();
  return out;
}
function box(p, w, h, d, mat, x, y, z, ry = 0, rx = 0, rz = 0) { const m = new THREE.Mesh(BOXG, mat); m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); p.add(m); return m; }
function cyl(p, rt, rb, h, mat, x, y, z, seg = 12, rx = 0, rz = 0) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); p.add(m); return m; }
function place(g, x, y, z, ry = 0) { g.position.set(x, y, z); g.rotation.y = ry; return g; }
// 两点之间的细杆
function rod(p, a, b, r, mat, seg = 6) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); p.add(m); return m;
}
// 栏杆：沿折线的立柱+扶手
function railing(p, pts, h, mat, postGap = 2.0, r = 0.03) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    rod(p, new THREE.Vector3(a.x, a.y + h, a.z), new THREE.Vector3(b.x, b.y + h, b.z), r * 1.2, mat, 5);
    rod(p, new THREE.Vector3(a.x, a.y + h * 0.5, a.z), new THREE.Vector3(b.x, b.y + h * 0.5, b.z), r * 0.8, mat, 4);
    const n = Math.max(1, Math.round(a.distanceTo(b) / postGap));
    for (let k = 0; k <= n; k++) { const q = a.clone().lerp(b, k / n); rod(p, q, new THREE.Vector3(q.x, q.y + h, q.z), r, mat, 5); }
  }
}
let gh = null; // 地面高程函数，在主流程中赋值

// ---------------- 泳池：瓷砖（焦散）与水面 ----------------
function poolTileMaterial() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), R = mulberry32(3131);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = 0.92 + R() * 0.1; g.fillStyle = `rgb(${Math.round(120 * v)},${Math.round(205 * v)},${Math.round(215 * v)})`; g.fillRect(x * 16, y * 16, 16, 16); }
  g.strokeStyle = 'rgba(240,248,248,0.9)'; g.lineWidth = 1.5; for (let i = 0; i <= 16; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * 16); g.lineTo(256, i * 16); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 2); t.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.3 });
  const uT = { value: 0 }; TIME_U.push(uT);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvPW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; varying vec3 vPW;\n' + GLSL_NOISE)
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 cq = vPW.xz * 1.1; float ca = vnoise(cq + vec2(uTime * 0.5, uTime * 0.3)), cb = vnoise(cq * 1.6 - vec2(uTime * 0.35, -uTime * 0.45));
        float caus = pow(clamp(1.0 - abs(ca - cb) * 3.0, 0.0, 1.0), 6.0);
        diffuseColor.rgb *= vec3(0.82, 0.95, 1.0); diffuseColor.rgb += vec3(0.5, 0.6, 0.6) * caus * 0.7;`);
  };
  return m;
}
function poolWaterMaterial() {
  const m = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSun: { value: SUN_DIR }, uZen: { value: SKY.zenith }, uHor: { value: SKY.horizon } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uSun, uZen, uHor; varying vec3 vW; ${GLSL_NOISE}
      void main(){
        vec2 p = vW.xz * 2.2; float e = 0.15;
        float h0 = vnoise(p + uTime * vec2(0.4, 0.25)) + 0.5 * vnoise(p * 2.3 - uTime * vec2(0.3, 0.5));
        float hx = vnoise(p + vec2(e, 0.0) + uTime * vec2(0.4, 0.25)) + 0.5 * vnoise((p + vec2(e, 0.0)) * 2.3 - uTime * vec2(0.3, 0.5));
        float hz = vnoise(p + vec2(0.0, e) + uTime * vec2(0.4, 0.25)) + 0.5 * vnoise((p + vec2(0.0, e)) * 2.3 - uTime * vec2(0.3, 0.5));
        vec3 n = normalize(vec3(-(hx - h0) / e * 0.05, 1.0, -(hz - h0) / e * 0.05));
        vec3 V = normalize(cameraPosition - vW); if (!gl_FrontFacing) n = -n;
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
        vec3 R = reflect(-V, n); vec3 sky = mix(uHor, uZen, pow(clamp(R.y, 0.0, 1.0), 0.5));
        vec3 body = vec3(0.12, 0.5, 0.58);
        vec3 col = mix(body, sky, fres * 0.85);
        float sd = max(dot(R, uSun), 0.0); col += vec3(1.0, 0.96, 0.88) * (pow(sd, 400.0) * 4.0 + pow(sd, 40.0) * 0.1);
        gl_FragColor = vec4(col, clamp(0.28 + fres * 0.8, 0.0, 0.95));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  TIME_U.push(m.uniforms.uTime); return m;
}
// ---------------- 湖景别墅 ----------------
// 带框玻璃：面朝局部 +z，ry 旋转；nx 竖梃、ny 横档
function framedGlass(p, w, h, x, y, z, ry = 0, nx = 3, ny = 1, fr = 0.07, mat = M.metalDark) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g);
  box(g, w, h, 0.06, M.glass, 0, 0, 0);
  box(g, w + fr, fr, 0.14, mat, 0, h / 2, 0.02); box(g, w + fr, fr, 0.14, mat, 0, -h / 2, 0.02);
  box(g, fr, h, 0.14, mat, -w / 2, 0, 0.02); box(g, fr, h, 0.14, mat, w / 2, 0, 0.02);
  for (let i = 1; i < nx; i++) box(g, fr * 0.7, h, 0.1, mat, -w / 2 + i * w / nx, 0, 0.02);
  for (let j = 1; j <= ny - 1; j++) box(g, w, fr * 0.7, 0.1, mat, 0, -h / 2 + j * h / ny, 0.02);
  return g;
}
function planter(p, w, d, x, y, z, ry = 0, kind = 'shrub', off = null) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g);
  box(g, w, 0.5, d, M.concreteWarm, 0, 0.25, 0); box(g, w - 0.08, 0.04, d - 0.08, M.soil, 0, 0.49, 0);
  const n = Math.max(1, Math.round(w / (kind === 'shrub' ? 0.7 : 0.32)));
  for (let i = 0; i < n; i++) {
    const lx = -w / 2 + (i + 0.5) * w / n;
    if (kind === 'shrub') { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 0), std(0x4f7a34, 0.9)); m.position.set(lx, 0.72, 0); m.scale.set(1, 0.8, d / 0.8); g.add(m); }
    else if (off) for (const dz of (d > 0.7 ? [-d / 4, d / 4] : [0])) POTS.push({ kind, x: off[0] + x + lx * Math.cos(ry) + dz * Math.sin(ry), y: off[1] + y + 0.5, z: off[2] + z - lx * Math.sin(ry) + dz * Math.cos(ry), r: (i * 7 + dz * 3) % 1 });
  }
  return g;
}
function chair(p, x, y, z, ry, mat = M.metalDark) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g); box(g, 0.5, 0.06, 0.5, M.cushion, 0, 0.45, 0); box(g, 0.5, 0.45, 0.05, mat, 0, 0.7, -0.24); for (const [a, b] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) box(g, 0.04, 0.45, 0.04, mat, a, 0.22, b); return g; }
function buildVilla() {
  const V = new THREE.Group(), y0 = 11.35;
  // ---- 泳池与木平台（北侧，面湖） ----
  // 木平台（泳池处开洞）+ 石材压顶环
  for (const [x0, x1, z0, z1] of [[-13, 13, -17.45, -15.35], [-13, 13, -9.85, -6.95], [-13, -7.8, -15.35, -9.85], [7.8, 13, -15.35, -9.85]]) { box(V, x1 - x0, 0.25, z1 - z0, M.teak, (x0 + x1) / 2, -0.08, (z0 + z1) / 2); }
  for (let i = 0; i < 12; i++) { const x = -12.5 + i * 2.2; if (Math.abs(x) > 7.9) box(V, 0.02, 0.01, 10.4, M.woodDark, x, 0.06, -12.2); else { box(V, 0.02, 0.01, 2.1, M.woodDark, x, 0.06, -16.4); box(V, 0.02, 0.01, 2.9, M.woodDark, x, 0.06, -8.4); } }
  for (const [x0, x1, z0, z1] of [[-7.8, 7.8, -15.35, -14.85], [-7.8, 7.8, -10.35, -9.85], [-7.8, -7.3, -14.85, -10.35], [7.3, 7.8, -14.85, -10.35]]) box(V, x1 - x0, 0.14, z1 - z0, M.stone, (x0 + x1) / 2, 0.16, (z0 + z1) / 2);
  // 下沉池体：瓷砖池壁与池底（带焦散），入水台阶
  const tile = poolTileMaterial();
  box(V, 14.6, 0.05, 4.5, tile, 0, -1.4, -12.6);
  for (const [w, d, x, z] of [[14.6, 0.08, 0, -14.85], [14.6, 0.08, 0, -10.35], [0.08, 4.5, -7.3, -12.6], [0.08, 4.5, 7.3, -12.6]]) box(V, w, 1.55, d, tile, x, -0.6, z);
  for (let i = 0; i < 4; i++) box(V, 1.6, 0.3 * (i + 1), 0.4, tile, 6.3, -1.4 + 0.15 * (i + 1), -10.55 - (3 - i) * 0.4);
  const pw = new THREE.Mesh(new THREE.PlaneGeometry(14.6, 4.5, 1, 1), poolWaterMaterial()); pw.rotation.x = -Math.PI / 2; pw.position.set(0, 0.12, -12.6); pw.renderOrder = 2; pw.userData.live = true; V.add(pw);
  // 通往湖岸的汀步
  for (let i = 0; i < 4; i++) box(V, 1.4, 0.12, 0.8, M.stone, -8.5 - Math.sin(i) * 0.6, -0.1, -18 - i * 1.25);
  // 北门两侧扶桑花池（植株由植被模块按叶簇生成）
  for (const [px, len] of [[-8.6, 4.2], [-1.4, 2.6]]) { box(V, len, 0.5, 0.9, M.concreteWarm, px, 0.25, -7.85); for (let i = 0; i < Math.round(len / 0.9); i++) HIBISCUS.push([180 + px - len / 2 + 0.45 + i * 0.9, y0 + 0.5, -46 - 7.85]); }
  planter(V, 3.5, 0.8, 10.2, 0, -16.6, 0, 'narcissus', [180, y0, -46]);
  for (const x of [-12.6, 12.6]) for (const z of [-8, -16]) cyl(V, 0.06, 0.06, 0.7, M.metalDark, x, 0.35, z, 6);
  // ---- 首层：可进入的外壳（墙段 + 透明玻璃 + 门洞）与室内 ----
  box(V, 22.6, 0.25, 14.6, M.concrete, 0, -0.05, 0);
  box(V, 21.6, 0.06, 13.6, M.floorWood, 0, 0.1, 0);
  // 墙段：沿边线按 [起, 止, 类型] 生成；类型 w=实墙 g=玻璃 o=开口
  const wallRun = (axis, fixed, runs) => {
    for (const [a0, a1, t] of runs) {
      const len = a1 - a0, mid = (a0 + a1) / 2; if (t === 'o') continue;
      const [w, d, x, z] = axis === 'x' ? [len, 0.25, mid, fixed] : [0.25, len, fixed, mid];
      if (t === 'w') box(V, w, 3.6, d, M.wallWarm, x, 1.8, z);
      else { box(V, axis === 'x' ? len : 0.05, 3.2, axis === 'x' ? 0.05 : len, M.glassClear, x, 1.75, z); box(V, w, 0.25, d, M.wallWarm, x, 3.475, z);
        const n = Math.max(1, Math.round(len / 2.3)); for (let i = 0; i <= n; i++) { const p = a0 + i * len / n; box(V, axis === 'x' ? 0.08 : 0.12, 3.2, axis === 'x' ? 0.12 : 0.08, M.metalDark, axis === 'x' ? p : fixed, 1.75, axis === 'x' ? fixed : p); } }
    }
  };
  wallRun('x', -7, [[-11, -10, 'w'], [-10, -6, 'g'], [-6, -3.4, 'o'], [-3.4, 8.5, 'g'], [8.5, 11, 'w']]);   // 北：面湖落地窗，推拉门开启
  slideDoor(V, -2.1, 1.65, -7.14, 2.6, 3.1);                                                                   // 北侧推拉门（开启）
  wallRun('x', 7, [[-11, -6.8, 'w'], [-6.8, -1.6, 'g'], [-1.6, 0.4, 'w'], [0.4, 2.2, 'o'], [2.2, 11, 'w']]); // 南：入户门洞
  wallRun('z', 11, [[-7, -5, 'w'], [-5, 3, 'g'], [3, 7, 'w']]);
  wallRun('z', -11, [[-7, -0.5, 'w'], [-0.5, 5.5, 'g'], [5.5, 7, 'w']]);
  // 南立面木格栅（外侧）
  for (let i = 0; i < 26; i++) box(V, 0.07, 3.2, 0.12, M.wood, 3.4 + i * 0.26, 1.7, 7.22);
  // 室内：客厅（北侧面湖）——精细沙发、茶几、落地灯、地毯；座位可坐
  box(V, 5.2, 0.02, 3.6, M.rug, -4.5, 0.14, -3.0);
  sofaF(V, -4.5, 0.13, -1.35, Math.PI, 3.0); sofaF(V, -6.85, 0.13, -3.3, Math.PI / 2, 2.0, 0x8f949a, [0x6f7f8a, 0xc9b89a]);
  tableF(V, -4.5, 0.13, -3.3, 0, 1.2, 0.7, 0.4, M.woodDark, M.metalDark); box(V, 0.3, 0.05, 0.2, M.stone, -4.7, 0.55, -3.3); cyl(V, 0.08, 0.06, 0.18, M.white, -4.2, 0.62, -3.35, 12);
  lampF(V, -7.3, 0.13, -5.0);
  // 餐区：实木餐桌 + 6 把餐椅
  tableF(V, 3.2, 0.13, -3.2, 0, 2.4, 1.0, 0.76, M.woodDark, M.woodDark);
  for (const x of [2.4, 3.2, 4.0]) { chair(V, x, 0.1, -3.95, 0); chair(V, x, 0.1, -2.45, Math.PI); }
  cyl(V, 0.12, 0.08, 0.14, std(0xe8e2d6, 0.4), 3.2, 0.96, -3.2, 14);
  // 厨房：岛台（石材台面、嵌入水槽、龙头）、吧凳、橱柜（门缝把手）、冰箱、吊柜
  box(V, 3.6, 0.88, 1.1, std(0x3a3d40, 0.6), 5.5, 0.57, 1.8); box(V, 3.8, 0.05, 1.3, M.white, 5.5, 1.03, 1.8);
  box(V, 0.6, 0.02, 0.4, M.metalMid, 6.2, 1.05, 1.9); { const f = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 12, Math.PI), M.alu); f.position.set(6.2, 1.18, 2.12); g0(f); V.add(f); cyl(V, 0.012, 0.012, 0.18, M.alu, 6.08, 1.12, 2.12, 6); }
  for (const x of [4.3, 5.5, 6.7]) { cyl(V, 0.19, 0.19, 0.06, M.cushionDark, x, 0.78 + 0.13, 0.85, 12); cyl(V, 0.02, 0.02, 0.72, M.alu, x, 0.49, 0.85, 6); cyl(V, 0.18, 0.18, 0.02, M.alu, x, 0.14, 0.85, 12); }
  box(V, 6, 0.88, 0.62, std(0xf0ede6, 0.5), 4.4, 0.57, 5.6); box(V, 6.1, 0.04, 0.65, M.white, 4.4, 1.03, 5.55);
  for (let i = 0; i < 8; i++) { box(V, 0.01, 0.8, 0.01, M.metalMid, 1.8 + i * 0.75, 0.55, 5.28); box(V, 0.2, 0.015, 0.02, M.alu, 2.17 + i * 0.75, 0.9, 5.27); }
  box(V, 6, 0.8, 0.38, std(0xf0ede6, 0.5), 4.4, 2.6, 5.75); box(V, 0.9, 2.0, 0.7, M.alu, 7.9, 1.13, 5.5);
  // 电视墙（西墙）
  box(V, 0.06, 0.9, 1.6, std(0x0b0d10, 0.2, 0.2), -10.8, 1.6, -3.3); box(V, 0.45, 0.4, 2.2, M.woodDark, -10.6, 0.33, -3.3);
  const wx = (x) => 180 + x, wz = (z) => -46 + z, toW = (x, z) => [wx(x), wz(z)];
  // 通用：墙段（w 实墙 / g 玻璃 / o 开口）+ 带高度带的碰撞；楼板挖洞 + 可行走面
  const walls = (yb, h, axis, fixed, runs) => {
    for (const [a0, a1, t] of runs) {
      const len = a1 - a0, mid = (a0 + a1) / 2;
      if (t !== 'o') { const [ax, az, bx, bz] = axis === 'x' ? [a0, fixed, a1, fixed] : [fixed, a0, fixed, a1]; collS(wx(ax), wz(az), wx(bx), wz(bz), y0 + yb - 0.4, y0 + yb + h - 0.6); }
      if (t === 'o') continue;
      const [w, d, x, z] = axis === 'x' ? [len, 0.25, mid, fixed] : [0.25, len, fixed, mid];
      if (t === 'w') box(V, w, h, d, M.wallWarm, x, yb + h / 2, z);
      else {
        box(V, axis === 'x' ? len : 0.05, h - 0.45, axis === 'x' ? 0.05 : len, M.glassClear, x, yb + (h - 0.45) / 2 + 0.05, z);
        box(V, w, 0.4, d, M.wallWarm, x, yb + h - 0.2, z);
        const n = Math.max(1, Math.round(len / 2.2)); for (let i = 0; i <= n; i++) { const p = a0 + i * len / n; box(V, axis === 'x' ? 0.08 : 0.14, h - 0.4, axis === 'x' ? 0.14 : 0.08, M.metalDark, axis === 'x' ? p : fixed, yb + (h - 0.4) / 2, axis === 'x' ? fixed : p); }
      }
    }
  };
  const slab = (x0, x1, z0, z1, y, t, mat, hole, walkY) => {
    const parts = hole ? [[x0, x1, z0, hole[2]], [x0, x1, hole[3], z1], [x0, hole[0], hole[2], hole[3]], [hole[1], x1, hole[2], hole[3]]] : [[x0, x1, z0, z1]];
    for (const [a0, a1, b0, b1] of parts) {
      if (a1 - a0 < 0.05 || b1 - b0 < 0.05) continue;
      box(V, a1 - a0, t, b1 - b0, mat, (a0 + a1) / 2, y - t / 2, (b0 + b1) / 2);
      if (walkY !== undefined) COLL.walks.push({ kind: 'rect', x: wx((a0 + a1) / 2), z: wz((b0 + b1) / 2), hw: (a1 - a0) / 2, hd: (b1 - b0) / 2, rot: 0, y: y0 + walkY });
    }
  };
  // 上层楼板洞口护栏（到达端 z0 敞开）；skip 中的 -1/1 表示不在 x0/x1 侧加
  const wellRail = (S, fy, skip, vis = true) => {
    for (const [x0, z0, x1, z1, side] of [[S[0], S[2], S[0], S[3], -1], [S[1], S[2], S[1], S[3], 1], [S[0], S[3], S[1], S[3], 0]]) {
      if (skip.includes(side)) continue;
      collS(wx(x0), wz(z0), wx(x1), wz(z1), y0 + fy - 0.3, y0 + fy + 2);
      if (vis) box(V, Math.max(0.05, x1 - x0), 1.0, Math.max(0.05, z1 - z0), M.glassLight, (x0 + x1) / 2, fy + 0.5, (z0 + z1) / 2);
    }
  };
  // ---- 楼梯 S1：首层 → 二层室内（沿西侧） ----
  const S1 = [-9.2, -8.0, -0.3, 6.3], S2 = [-5.75, -4.65, -2.4, 4.6], S3 = [7.9, 8.9, -1.9, 4.8];
  stairs(V, toW, y0, -8.6, 6.3, -0.3, 0.13, 3.9, 1.1, { railSides: [1], openSides: [] });
  slab(-10.9, 10.9, -6.9, 6.9, 3.62, 0.04, M.ceiling, S1);                                   // 首层吊顶（楼梯处开洞）
  for (const [x, z] of [[-4.5, -3], [3.2, -3.2], [5.5, 1.8], [-1, 3]]) box(V, 1.6, 0.04, 0.25, M.lamp, x, 3.57, z);
  // 首层墙体碰撞
  const gt = y0 + 3.0;
  for (const [x0, x1] of [[-11, -6], [-3.4, 11]]) collS(wx(x0), wz(-7), wx(x1), wz(-7), -1e9, gt);
  for (const [x0, x1] of [[-11, 0.4], [2.2, 11]]) collS(wx(x0), wz(7), wx(x1), wz(7), -1e9, gt);
  collS(wx(11), wz(-7), wx(11), wz(7), -1e9, gt); collS(wx(-11), wz(-7), wx(-11), wz(7), -1e9, gt);
  const low = y0 + 3;
  collR(wx(-4.5), wz(-1.35), 1.5, 0.45, 0, low); collR(wx(-6.85), wz(-3.3), 0.45, 1.0, 0, low); collR(wx(-4.5), wz(-3.3), 0.6, 0.35, 0, low); collR(wx(-10.6), wz(-3.3), 0.25, 1.1, 0, low);
  collR(wx(3.2), wz(-3.2), 1.5, 1.0, 0, low); collR(wx(5.5), wz(1.8), 1.9, 0.6, 0, low); collR(wx(5), wz(5.6), 3, 0.35, 0, low); collR(wx(-7.3), wz(-5.0), 0.25, 0.25, 0, low); collR(wx(7.9), wz(5.5), 0.45, 0.35, 0, low);
  COLL.walks.push({ kind: 'rect', x: 180, z: -46, hw: 10.9, hd: 6.9, rot: 0, y: y0 + 0.13 });
  for (const x of [-5.5, -4.5, -3.5]) addSeat(wx(x), y0 + 0.55, wz(-1.2), 0);
  for (const z of [-3.8, -2.8]) addSeat(wx(-6.7), y0 + 0.55, wz(z), -Math.PI / 2);
  for (const x of [2.4, 3.2, 4.0]) { addSeat(wx(x), y0 + 0.58, wz(-3.95), Math.PI); addSeat(wx(x), y0 + 0.58, wz(-2.45), 0); }
  for (const x of [4.3, 5.5, 6.7]) addSeat(wx(x), y0 + 0.94, wz(0.85), Math.PI);
  // 外立面楼板檐口（环形，不遮楼梯洞）
  slab(-11.3, 11.3, -7.3, 7.3, 3.78, 0.2, M.metalDark, [-10.9, 10.9, -6.9, 6.9]);
  // ---- 二层（向湖悬挑）：外壳 + 卧室；北侧门通阳台 ----
  const F1 = 3.9, F1h = 3.3;
  slab(-9.4, 10.6, -7.7, 5.3, F1, 0.14, M.floorWood, [S1[0], S1[1], S1[2], 5.3], F1);
  wellRail(S1, F1, [-1]);
  walls(F1, F1h, 'x', -7.7, [[-9.4, -8, 'w'], [-8, -1.2, 'g'], [-1.2, 1.2, 'o'], [1.2, 9.2, 'g'], [9.2, 10.6, 'w']]);
  box(V, 2.4, 0.4, 0.25, M.wallWarm, 0, F1 + F1h - 0.2, -7.7); slideDoor(V, 2.4, F1 + 1.2, -7.52, 2.4, 2.4);   // 二层北门推拉门（开启）
  walls(F1, F1h, 'x', 5.3, [[-9.4, -6, 'w'], [-6, 6, 'g'], [6, 10.6, 'w']]);
  walls(F1, F1h, 'z', 10.6, [[-7.7, -6, 'w'], [-6, 3, 'g'], [3, 5.3, 'w']]);
  walls(F1, F1h, 'z', -9.4, [[-7.7, -5, 'w'], [-5, 1, 'g'], [1, 5.3, 'w']]);
  slab(-9.2, 10.4, -7.5, 5.1, F1 + F1h - 0.02, 0.04, M.ceiling, [S2[0], S2[1], S2[2], S2[3]]);
  for (const [x, z] of [[4, -3], [4, 2], [-2, -3]]) box(V, 1.6, 0.04, 0.25, M.lamp, x, F1 + F1h - 0.06, z);
  // 卧室：双人床（床头朝南）、床头柜台灯、衣柜（门缝把手）、休闲沙发；床可躺、沙发可坐
  bedF(V, 6.5, F1, -3.2, Math.PI, 1.8, 2.1);
  box(V, 3.2, 2.3, 0.6, M.woodDark, 7.6, F1 + 1.15, 4.7); for (let i = 1; i < 4; i++) box(V, 0.01, 2.2, 0.01, std(0x2a1f18, 0.8), 6.0 + i * 0.8, F1 + 1.15, 4.39); for (let i = 0; i < 4; i++) box(V, 0.02, 0.35, 0.03, M.alu, 6.3 + i * 0.8, F1 + 1.15, 4.37);
  sofaF(V, -1.5, F1, 3.9, Math.PI, 1.9, 0xb7aa98, [0x6f7f8a]); box(V, 1.4, 0.02, 1.8, M.rug, -1.5, F1 + 0.02, 2.6);
  lampF(V, -3.2, F1, 4.6);
  collR(wx(6.5), wz(-3.2), 1.2, 1.25, 0, y0 + F1 + 2, y0 + F1 - 0.5); collR(wx(7.6), wz(4.7), 1.7, 0.4, 0, y0 + F1 + 2, y0 + F1 - 0.5); collR(wx(-1.5), wz(3.9), 0.95, 0.5, 0, y0 + F1 + 2, y0 + F1 - 0.5);
  addSeat(wx(6.5), y0 + F1 + 0.62, wz(-3.9), 0, 'lie'); addSeat(wx(-1.9), y0 + F1 + 0.42, wz(3.75), 0); addSeat(wx(-1.1), y0 + F1 + 0.42, wz(3.75), 0);
  // 二层室内花盆（水仙）
  planter(V, 0.6, 0.6, 9.8, F1, -6.9, 0, 'narcissus', [180, y0, -46]);
  // 阳台（封闭式：只能经二层北门进入）
  box(V, 20.6, 0.25, 2.2, M.concrete, 0.6, 3.95, -8.6);
  box(V, 20.6, 1.0, 0.05, M.glassLight, 0.6, 4.6, -9.65); box(V, 20.6, 0.06, 0.1, M.metalDark, 0.6, 5.12, -9.65);
  for (const sx of [-1, 1]) box(V, 0.05, 1.0, 2.1, M.glassLight, 0.6 + sx * 10.25, 4.6, -8.6);
  sofaF(V, -4, 4.08, -8.2, Math.PI, 2.4, 0xefe9dc, [0x5f8aa0, 0xd9c29a]); tableF(V, -2.4, 4.08, -8.2, 0, 0.5, 0.5, 0.45, M.woodDark, M.alu);   // 靠墙布置，外侧留 1 米通道
  COLL.walks.push({ kind: 'rect', x: wx(0.6), z: wz(-8.65), hw: 10.2, hd: 0.95, rot: 0, y: y0 + 4.08 });
  const bb = y0 + 3.5;
  collS(wx(-9.7), wz(-9.6), wx(10.9), wz(-9.6), bb); collS(wx(-9.7), wz(-9.6), wx(-9.7), wz(-7.6), bb); collS(wx(10.9), wz(-9.6), wx(10.9), wz(-7.6), bb);
  collR(wx(-4), wz(-8.2), 1.2, 0.45, 0, bb + 2.5, bb); collR(wx(-2.4), wz(-8.2), 0.25, 0.25, 0, bb + 2.5, bb);
  for (const x of [-4.7, -3.9, -3.1]) addSeat(wx(x), y0 + 4.08 + 0.42, wz(-8.35), 0);
  // ---- 楼梯 S2：二层 → 三层 ----
  stairs(V, toW, y0, -5.2, 4.6, -2.4, F1, 7.45, 1.1, { railSides: [1, -1] });
  slab(-9.9, 11.1, -8.2, 5.8, 7.45, 0.2, M.metalDark, [-9.4, 10.6, -7.7, 5.3]);           // 二层顶檐口
  // 二层屋面（三层外围露台）：北侧露台 + 东西两侧窄台
  slab(-9.4, 10.6, -7.7, -5.0, 7.45, 0.12, M.stone, null, 7.45);
  slab(-9.4, -6.4, -5.0, 5.3, 7.45, 0.12, M.stone, null, 7.45); slab(9.2, 10.6, -5.0, 5.3, 7.45, 0.12, M.stone, null, 7.45);
  box(V, 20.6, 1.0, 0.05, M.glassLight, 0.6, 8.05, -7.62); box(V, 20.6, 0.06, 0.1, M.metalDark, 0.6, 8.57, -7.62);
  for (const [x0, x1, z0, z1] of [[-9.45, -9.45, -7.7, 5.3], [10.65, 10.65, -7.7, 5.3], [-9.4, -6.4, 5.35, 5.35], [9.2, 10.6, 5.35, 5.35]]) {
    box(V, Math.max(0.05, x1 - x0), 1.0, Math.max(0.05, z1 - z0), M.glassLight, (x0 + x1) / 2, 8.05, (z0 + z1) / 2); collS(wx(x0), wz(z0), wx(x1), wz(z1), y0 + 7);
  }
  collS(wx(-9.4), wz(-7.62), wx(10.6), wz(-7.62), y0 + 7);
  // 露台：户外餐桌 + 6 椅 + 花池
  box(V, 2.4, 0.06, 1.0, M.woodDark, -5.5, 8.25, -6.2); for (const x of [-6.5, -5.5, -4.5]) { chair(V, x, 7.5, -7.0, 0); chair(V, x, 7.5, -5.4, Math.PI); }
  for (const [a, b] of [[-6.5, -6.2], [-4.5, -6.2]]) box(V, 0.06, 0.72, 0.8, M.metalDark, a, 7.86, b);
  planter(V, 5, 0.6, 5, 7.5, -7.1, 0, 'rose', [180, y0, -46]);
  collR(wx(-5.5), wz(-6.2), 1.6, 1.2, 0, y0 + 9.5, y0 + 7);
  for (const x of [-6.5, -5.5, -4.5]) { addSeat(wx(x), y0 + 7.5 + 0.48, wz(-7.0), Math.PI); addSeat(wx(x), y0 + 7.5 + 0.48, wz(-5.4), 0); } collR(wx(5), wz(-7.1), 2.5, 0.35, 0, y0 + 9.5, y0 + 7);
  // ---- 三层（退台）：外壳 + 书房；北门通露台 ----
  const F2 = 7.45, F2h = 3.25;
  slab(-6.4, 9.2, -5.0, 5.6, F2, 0.12, M.floorWood, [S2[0], S2[1], S2[2], S2[3]], F2);
  wellRail(S2, F2, []);
  walls(F2, F2h, 'x', -5.0, [[-6.4, -5, 'w'], [-5, -2.4, 'g'], [-2.4, -0.6, 'o'], [-0.6, 7.9, 'g'], [7.9, 9.2, 'w']]);
  box(V, 1.8, 0.4, 0.25, M.wallWarm, -1.5, F2 + F2h - 0.2, -5.0); slideDoor(V, 0.3, F2 + 1.2, -4.83, 1.8, 2.4);   // 三层北门推拉门（开启）
  walls(F2, F2h, 'x', 5.6, [[-6.4, -3, 'w'], [-3, 3, 'g'], [3, 9.2, 'w']]);
  walls(F2, F2h, 'z', 9.2, [[-5, -3, 'w'], [-3, 3, 'g'], [3, 5.6, 'w']]);
  walls(F2, F2h, 'z', -6.4, [[-5, -3, 'w'], [-3, 3, 'g'], [3, 5.6, 'w']]);
  slab(-6.2, 9.0, -4.8, 5.4, F2 + F2h - 0.02, 0.04, M.ceiling, [S3[0], S3[1], S3[2], S3[3]]);
  for (const [x, z] of [[2, -2], [2, 2.5]]) box(V, 1.6, 0.04, 0.25, M.lamp, x, F2 + F2h - 0.06, z);
  // 书房：带腿书桌 + iMac/键盘/鼠标 + 人体工学椅；书架（满架书）；沙发；红玫瑰盆栽
  tableF(V, 2.5, F2, -3.6, 0, 1.6, 0.8, 0.75, M.woodDark, M.metalDark); imacF(V, 2.5, F2 + 0.75, -3.72, 0);
  cyl(V, 0.06, 0.05, 0.1, std(0xf4f4f0, 0.4), 3.1, F2 + 0.8, -3.85, 10);
  officeChairF(V, 2.5, F2, -2.85, Math.PI);
  shelfF(V, 3.5, F2, 5.3, Math.PI, 2.6, 2.2); sofaF(V, -2, F2, 3.9, Math.PI, 2.2, 0x8f949a, [0xb54a3a, 0xe0d6c4]);
  for (const [px, pz] of [[-5.7, -4.3], [8.4, -4.3], [-5.7, 4.9]]) planter(V, 0.55, 0.55, px, F2, pz, 0, 'rose', [180, y0, -46]);
  addSeat(wx(2.5), y0 + F2 + 0.5, wz(-2.85), 0); addSeat(wx(-2.5), y0 + F2 + 0.42, wz(3.75), 0); addSeat(wx(-1.5), y0 + F2 + 0.42, wz(3.75), 0);
  collR(wx(2.5), wz(-3.4), 1.0, 0.8, 0, y0 + F2 + 2, y0 + F2 - 0.5); collR(wx(3.5), wz(5.2), 1.6, 0.3, 0, y0 + F2 + 2, y0 + F2 - 0.5); collR(wx(-2), wz(3.9), 1.1, 0.5, 0, y0 + F2 + 2, y0 + F2 - 0.5);
  // ---- 楼梯 S3：三层 → 屋顶 ----
  stairs(V, toW, y0, 8.4, 4.8, -1.9, F2, 11.1, 1.0, { railSides: [-1] });
  // ---- 屋面：屋顶平台（玻璃栏板）+ 应急停机标识（不停放直升机） ----
  slab(-6.8, 9.6, -5.4, 6.0, 11.1, 0.4, M.concrete, [S3[0], S3[1], S3[2], S3[3]], 11.1);
  slab(-6.9, 9.7, -5.5, 6.1, 10.72, 0.15, M.metalDark, [-6.4, 9.2, -5.0, 5.6]);
  for (const [x0, x1, z0, z1] of [[-6.8, 9.6, -5.4, -5.4], [-6.8, 9.6, 6.0, 6.0], [-6.8, -6.8, -5.4, 6.0], [9.6, 9.6, -5.4, 6.0]]) {
    box(V, Math.max(0.05, x1 - x0), 1.0, Math.max(0.05, z1 - z0), M.glassLight, (x0 + x1) / 2, 11.6, (z0 + z1) / 2); collS(wx(x0), wz(z0), wx(x1), wz(z1), y0 + 10.5);
  }
  wellRail(S3, 11.1, [], true);
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.25, 4.7, 56), M.yellow); ring.rotation.x = -Math.PI / 2; ring.position.set(1.4, 11.12, 0.3); V.add(ring);
  box(V, 0.55, 0.03, 3.6, M.white, 1.4 - 1.2, 11.12, 0.3); box(V, 0.55, 0.03, 3.6, M.white, 1.4 + 1.2, 11.12, 0.3); box(V, 2.0, 0.03, 0.55, M.white, 1.4, 11.12, 0.3);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; box(V, 0.25, 0.08, 0.25, M.green, 1.4 + Math.cos(a) * 5.2, 11.13, 0.3 + Math.sin(a) * 5.2); }
  // ---- 入口雨篷 ----
  box(V, 5, 0.2, 3, M.metalDark, 2, 3.2, 8.5); cyl(V, 0.07, 0.07, 3.1, M.metalDark, 4.3, 1.6, 9.8, 8); cyl(V, 0.07, 0.07, 3.1, M.metalDark, -0.3, 1.6, 9.8, 8);
  planter(V, 3, 0.9, -3, 0, 9.5, 0, 'narcissus', [180, y0, -46]); planter(V, 3, 0.9, 7.5, 0, 9.5, 0, 'narcissus', [180, y0, -46]);
  for (const [px, pz] of [[-10.2, -6.2], [10.2, -6.2], [-10.2, 6.2], [9.8, -1.5]]) planter(V, 0.6, 0.6, px, 0.13, pz, 0, 'narcissus', [180, y0, -46]);
  // 泳池旁（靠别墅一侧）两把沙滩椅 + 遮阳伞
  // 泳池旁（靠别墅一侧）两把躺椅 + 遮阳伞：正对瀑布
  { const ry = Math.atan2(FALL.plunge.x - 184.5, FALL.plunge.z + 54.9), yaw = ry + Math.PI;
    for (const dx of [3.7, 5.3]) { lounger(V, dx, 0.05, -8.5, ry); collR(180 + dx, -46 - 8.5, 0.38, 1.05, ry, y0 + 1.5); addSeat(180 + dx, y0 + 0.05 + 0.42, -46 - 8.5, yaw, 'lie'); }
    parasol(V, 4.5, 0.05, -7.6, 1.35); collC(184.5, -53.6, 0.25); tableF(V, 4.5, 0.05, -8.9, 0, 0.35, 0.35, 0.45, M.teak, M.alu); }
  collR(171.4, -53.85, 2.1, 0.45, 0, y0 + 2); collR(178.6, -53.85, 1.3, 0.45, 0, y0 + 2); collR(190.2, -62.6, 1.75, 0.45);
  COLL.walks.push({ kind: 'rect', x: 180, z: -58.2, hw: 13, hd: 5.25, rot: 0, y: y0 + 0.05 });
  V.position.set(180, y0, -46); return V;
}
function lounger(p, x, y, z, ry, cushion = 0xefe9dc) {   // 精细躺椅：铝框、柚木板条、可调靠背、分段软垫、滚轮、浴巾
  const g = new THREE.Group(), cu = std(cushion, 0.95);
  for (const sx of [-1, 1]) { box(g, 0.04, 0.05, 1.95, M.alu, sx * 0.33, 0.3, 0.1); box(g, 0.04, 0.3, 0.04, M.alu, sx * 0.33, 0.15, 0.95); const w = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 14), M.rubber); w.rotation.z = Math.PI / 2; w.position.set(sx * 0.36, 0.07, -0.72); g.add(w); }
  for (let i = 0; i < 11; i++) box(g, 0.64, 0.02, 0.1, M.teak, 0, 0.33, -0.15 + i * 0.105);
  const back = new THREE.Group(); back.position.set(0, 0.33, -0.2); back.rotation.x = -0.75; g.add(back);
  for (const sx of [-1, 1]) box(back, 0.04, 0.04, 0.8, M.alu, sx * 0.33, 0, -0.4);
  for (let i = 0; i < 7; i++) box(back, 0.64, 0.02, 0.1, M.teak, 0, 0.01, -0.06 - i * 0.11);
  box(back, 0.6, 0.07, 0.78, cu, 0, 0.05, -0.4); box(back, 0.4, 0.1, 0.2, std(0xffffff, 0.9), 0, 0.12, -0.65);
  box(g, 0.6, 0.07, 1.18, cu, 0, 0.38, 0.4); for (const zz of [-0.18, 0.99]) box(g, 0.61, 0.075, 0.015, std(0xd8d0c0, 0.9), 0, 0.38, zz);
  box(g, 0.5, 0.03, 0.34, std(0x3e7fa6, 0.95), 0, 0.43, 0.7);
  g.position.set(x, y, z); g.rotation.y = ry; p.add(g); return g;
}
function parasol(p, x, y, z, r = 1.25, h = 2.4, fabric = 0xf3efe6) {   // 精细遮阳伞：八角伞面 + 垂边 + 伞骨 + 摇柄 + 石材伞座
  const g = new THREE.Group(), fab = std(fabric, 0.9, 0, { side: THREE.DoubleSide });
  box(g, 0.5, 0.08, 0.5, std(0x6a6862, 0.7), 0, 0.04, 0);
  cyl(g, 0.022, 0.026, h, M.alu, 0, h / 2, 0, 8); cyl(g, 0.035, 0.035, 0.1, M.metalDark, 0, 1.2, 0, 8); box(g, 0.14, 0.015, 0.02, M.metalDark, 0.07, 1.2, 0);
  const c = new THREE.Mesh(new THREE.ConeGeometry(r, 0.42, 8, 1, true), fab); c.position.y = h + 0.02; g.add(c);
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + Math.PI / 8; rod(g, new THREE.Vector3(0, h + 0.2, 0), new THREE.Vector3(Math.cos(a) * r * 0.97, h - 0.19, Math.sin(a) * r * 0.97), 0.008, M.alu, 4); rod(g, new THREE.Vector3(0, h - 0.35, 0), new THREE.Vector3(Math.cos(a) * r * 0.55, h - 0.05, Math.sin(a) * r * 0.55), 0.007, M.alu, 4);
    const a2 = a + Math.PI / 8, fl = box(g, 2 * r * Math.sin(Math.PI / 8), 0.14, 0.01, fab, Math.cos(a2) * r * 0.92, h - 0.26, Math.sin(a2) * r * 0.92); fl.rotation.y = -a2 + Math.PI / 2; }
  cyl(g, 0.03, 0.05, 0.12, M.alu, 0, h + 0.27, 0, 8);
  g.position.set(x, y, z); p.add(g); return g;
}
// ---------------- 12 层住宅楼（两梯四户，南北通透） ----------------
function buildDorm() {
  const D = new THREE.Group(), fl = 3.0, n = L.dorm.floors, W = 30, Dp = 20, y0 = 0.9;
  box(D, W + 1, y0, Dp + 1, M.concreteWarm, 0, y0 / 2, 0);                 // 石材基座
  box(D, W, n * fl, Dp, M.wallLight, 0, n * fl / 2 + y0, 0);
  const ux = [-11.85, -4.35, 4.35, 11.85];
  for (let f = 0; f < n; f++) {
    const y = y0 + f * fl;
    box(D, W + 0.1, 0.18, Dp + 0.1, M.concreteDark, 0, y + fl, 0);
    for (const cx of ux) {
      if (f === 0) continue;
      // 南向：落地窗 + 阳台
      framedGlass(D, 5.2, 2.3, cx, y + 1.35, Dp / 2 + 0.03, 0, 4, 1);
      box(D, 6.0, 0.16, 1.5, M.concrete, cx, y + 0.08, Dp / 2 + 0.75);
      box(D, 6.0, 1.0, 0.05, M.glassLight, cx, y + 0.66, Dp / 2 + 1.48);
      box(D, 6.0, 0.05, 0.08, M.metalDark, cx, y + 1.18, Dp / 2 + 1.48);
      // 北向窗（对流）
      framedGlass(D, 4.2, 1.6, cx, y + 1.55, -Dp / 2 - 0.03, Math.PI, 3, 1);
      box(D, 4.5, 0.08, 0.3, M.metalDark, cx, y + 0.7, -Dp / 2 - 0.12);
    }
    for (const sx of [-1, 1]) framedGlass(D, 3.2, 1.5, sx * (W / 2 + 0.03), y + 1.5, 4, sx * Math.PI / 2, 2, 1);
    if (f > 0) framedGlass(D, 3.0, 2.2, 0, y + 1.4, -Dp / 2 - 0.03, Math.PI, 2, 1);   // 交通核
  }
  // 南立面竖向分户墙鳍
  for (const x of [-15, -8.1, 0, 8.1, 15]) box(D, 0.35, n * fl - fl, 1.7, M.wallGray, x, y0 + fl + (n - 1) * fl / 2, Dp / 2 + 0.85);
  // 首层大堂与入口
  framedGlass(D, 8, 2.7, 0, y0 + 1.4, Dp / 2 + 0.03, 0, 4, 1);
  for (const cx of [-11.85, 11.85]) framedGlass(D, 5, 2.2, cx, y0 + 1.5, Dp / 2 + 0.03, 0, 3, 1);
  box(D, 9, 0.22, 3.2, M.metalDark, 0, y0 + 3.0, Dp / 2 + 1.6);
  for (const x of [-4.2, 4.2]) cyl(D, 0.08, 0.08, 3.0, M.metalDark, x, y0 + 1.5, Dp / 2 + 3.0, 8);
  // 屋面
  const top = y0 + n * fl;
  box(D, W + 0.3, 1.0, 0.25, M.wallLight, 0, top + 0.5, Dp / 2); box(D, W + 0.3, 1.0, 0.25, M.wallLight, 0, top + 0.5, -Dp / 2);
  box(D, 0.25, 1.0, Dp, M.wallLight, W / 2, top + 0.5, 0); box(D, 0.25, 1.0, Dp, M.wallLight, -W / 2, top + 0.5, 0);
  box(D, W + 0.4, 0.1, Dp + 0.4, M.metalDark, 0, top + 1.02, 0);
  box(D, 7.5, 3.4, 4.8, M.wallGray, 0, top + 1.7, -2.5); box(D, 7.9, 0.2, 5.2, M.metalDark, 0, top + 3.5, -2.5);
  box(D, 3, 1.4, 2, M.metalMid, -8, top + 0.7, 4); box(D, 3, 1.4, 2, M.metalMid, 8, top + 0.7, 4);
  // 前庭：绿篱、长椅、铺装步道
  for (const sx of [-1, 1]) { planter(D, 7, 1.0, sx * 10, 0, Dp / 2 + 5); box(D, 1.8, 0.45, 0.5, M.wood, sx * 5.5, 0.3, Dp / 2 + 5.5); }
  D.position.set(L.dorm.x, 15.0 - y0 + 0.9, L.dorm.z); return D;
}
// ---------------- 双人网球场 ----------------
function buildTennis() {
  const T = new THREE.Group(), w = L.tennis.w, d = L.tennis.d;
  box(T, w, 0.08, d, M.courtOut, 0, 0.04, 0);
  box(T, 10.97, 0.02, 23.77, M.court, 0, 0.09, 0);
  const lw = 0.08, y = 0.105;
  for (const x of [-5.485, 5.485, -4.115, 4.115]) box(T, lw, 0.01, 23.77, M.line, x, y, 0);
  for (const z of [-11.885, 11.885]) box(T, 10.97, 0.01, lw, M.line, 0, y, z);
  for (const z of [-6.4, 6.4]) box(T, 8.23, 0.01, lw, M.line, 0, y, z);
  box(T, lw, 0.01, 12.8, M.line, 0, y, 0);
  box(T, 12.8, 0.9, 0.03, M.dark, 0, 0.55, 0); box(T, 12.8, 0.06, 0.06, M.white, 0, 1.0, 0);
  cyl(T, 0.05, 0.05, 1.07, M.metalDark, -6.4, 0.55, 0, 6); cyl(T, 0.05, 0.05, 1.07, M.metalDark, 6.4, 0.55, 0, 6);
  const fh = 3.2;
  // 东侧围网南端开一道门
  const gz0 = d / 2 - 3.4, gz1 = d / 2 - 1.6;
  for (const [a, b, len, rot] of [[0, -d / 2, w, 0], [0, d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, (-d / 2 + gz0) / 2, gz0 + d / 2, Math.PI / 2], [w / 2, (gz1 + d / 2) / 2, d / 2 - gz1, Math.PI / 2]]) {
    box(T, len, fh, 0.02, M.fence, a, fh / 2, b, rot);
    const n = Math.round(len / 3);
    for (let k = 0; k <= n; k++) { const t = -len / 2 + k * len / n; const px = rot ? a : a + t, pz = rot ? b + t : b; cyl(T, 0.04, 0.04, fh, M.metalDark, px, fh / 2, pz, 5); }
  }
  const tx = L.tennis.x, tz = L.tennis.z;
  collS(tx - w / 2, tz - d / 2, tx + w / 2, tz - d / 2); collS(tx - w / 2, tz + d / 2, tx + w / 2, tz + d / 2); collS(tx - w / 2, tz - d / 2, tx - w / 2, tz + d / 2);
  collS(tx + w / 2, tz - d / 2, tx + w / 2, tz + gz0); collS(tx + w / 2, tz + gz1, tx + w / 2, tz + d / 2);
  collS(tx - 6.4, tz, tx + 6.4, tz);                                        // 球网
  COLL.walks.push({ kind: 'rect', x: tx, z: tz, hw: w / 2, hd: d / 2, rot: 0, y: 13.3 });
  T.position.set(L.tennis.x, 13.2, L.tennis.z); return T;
}
// ---------------- 停车场雨棚 ----------------
function buildParking() {
  const P = new THREE.Group();
  const cw = 8.6, cd = 6.8, h = 3.8;
  for (const [x, z] of [[-cw / 2 + 0.3, -cd / 2 + 0.3], [cw / 2 - 0.3, -cd / 2 + 0.3], [-cw / 2 + 0.3, cd / 2 - 0.3], [cw / 2 - 0.3, cd / 2 - 0.3], [0, -cd / 2 + 0.3]])
    box(P, 0.2, h, 0.2, M.metalDark, x, h / 2, z);
  box(P, cw + 0.8, 0.22, cd + 0.8, M.metalDark, 0, h + 0.11, 0);
  box(P, cw + 0.6, 0.06, cd + 0.6, M.alu, 0, h - 0.02, 0);
  for (let i = 0; i < 5; i++) box(P, 0.12, 0.3, cd + 0.6, M.metalDark, -cw / 2 + i * cw / 4, h - 0.12, 0);
  // 车位线
  for (const x of [-cw / 2, 0, cw / 2]) box(P, 0.1, 0.02, 5.8, M.line, x, 0.02, 0.4);
  box(P, 0.6, 1.2, 0.3, M.metalMid, cw / 2 - 0.4, 0.6, -cd / 2 - 0.1);   // 充电桩
  box(P, 0.6, 1.2, 0.3, M.metalMid, -cw / 2 + 0.4, 0.6, -cd / 2 - 0.1);
  P.position.set(L.parking.x, 8.62, L.parking.z - 5.5); return P;
}
// ---------------- 牛棚 ----------------
function buildBarn() {
  const B = new THREE.Group(), W = L.barn.w, Dp = L.barn.d;
  box(B, W + 1, 0.3, Dp + 1, M.concrete, 0, 0.15, 0);
  const hN = 6.4, hS = 4.8, n = 7;
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + i * W / (n - 1);
    box(B, 0.3, hN, 0.3, M.galv, x, hN / 2, -Dp / 2 + 0.2); box(B, 0.3, hS, 0.3, M.galv, x, hS / 2, Dp / 2 - 0.2);
    box(B, 0.25, 0.35, Dp + 0.5, M.galv, x, (hN + hS) / 2 + 0.1, 0, 0, Math.atan2(hN - hS, Dp));
  }
  const roof = box(B, W + 1.6, 0.18, Math.hypot(Dp + 1.6, hN - hS), M.roofRust, 0, (hN + hS) / 2 + 0.35, 0, 0, Math.atan2(hN - hS, Dp));
  box(B, W, hN - 0.8, 0.12, M.cladGray, 0, (hN - 0.8) / 2 + 0.3, -Dp / 2 + 0.05);
  for (const sx of [-1, 1]) box(B, 0.12, 2.6, Dp - 0.4, M.cladGray, sx * W / 2, 3.9, 0);
  for (let i = 0; i < 12; i++) box(B, 0.04, hN - 1, 0.14, M.galv, -W / 2 + 1 + i * (W - 2) / 11, (hN - 1) / 2 + 0.3, -Dp / 2 - 0.02);
  box(B, W - 2, 0.6, 0.8, M.concreteDark, 0, 0.6, -Dp / 2 + 1.2);  // 饲槽
  box(B, W, 1.1, 0.06, M.galv, 0, 0.9, Dp / 2 - 0.2);               // 南侧矮栏
  B.position.set(L.barn.x, 13.0, L.barn.z); return B;
}
// ---------------- 围栏（地形贴合） ----------------
function fenceLoop(pts, h, mat, postMat, gap = 3, closed = true, yOff = 0) {
  const F = new THREE.Group(), P = pts.map(p => new THREE.Vector3(p[0], gh(p[0], p[1]) + yOff, p[1]));
  const seq = closed ? [...P, P[0]] : P;
  for (let i = 1; i < seq.length; i++) collS(seq[i - 1].x, seq[i - 1].z, seq[i].x, seq[i].z);
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i], n = Math.max(1, Math.round(a.distanceTo(b) / gap));
    for (let k = 0; k < n; k++) {
      const q0 = a.clone().lerp(b, k / n), q1 = a.clone().lerp(b, (k + 1) / n);
      q0.y = gh(q0.x, q0.z) + yOff; q1.y = gh(q1.x, q1.z) + yOff;
      rod(F, q0, new THREE.Vector3(q0.x, q0.y + h, q0.z), 0.05, postMat, 5);
      for (const f of [0.45, 0.95]) rod(F, new THREE.Vector3(q0.x, q0.y + h * f, q0.z), new THREE.Vector3(q1.x, q1.y + h * f, q1.z), 0.022, mat, 4);
    }
  }
  return F;
}
// ---------------- 猪圈 / 鸡圈 ----------------
function buildPens() {
  const out = new THREE.Group();
  for (const [pen, kind] of [[L.pig, 'pig'], [L.chicken, 'chicken']]) {
    const x0 = pen.x - pen.w / 2, x1 = pen.x + pen.w / 2, z0 = pen.z - pen.d / 2, z1 = pen.z + pen.d / 2;
    out.add(fenceLoop([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], kind === 'pig' ? 1.1 : 1.9, M.galv, M.galv, 2.5));
    if (kind === 'chicken') { const mh = 1.9; for (const [a, b, len, r] of [[pen.x, z0, pen.w, 0], [pen.x, z1, pen.w, 0], [x0, pen.z, pen.d, Math.PI / 2], [x1, pen.z, pen.d, Math.PI / 2]]) box(out, len, mh, 0.02, M.mesh, a, gh(a, b) + mh / 2, b, r); }
    const S = new THREE.Group(), sy = gh(pen.x, z0 + 3);
    const sw = kind === 'pig' ? 8 : 6, sd = kind === 'pig' ? 4.5 : 3.6, sh = kind === 'pig' ? 2.6 : 2.4;
    box(S, sw, 0.2, sd, M.concrete, 0, 0.1, 0);
    box(S, sw, sh, 0.12, M.cladGray, 0, sh / 2, -sd / 2);
    for (const sx of [-1, 1]) box(S, 0.12, sh, sd, M.cladGray, sx * sw / 2, sh / 2, 0);
    if (kind === 'chicken') { box(S, sw, sh * 0.55, 0.12, M.wood, 0, sh * 0.3, sd / 2); for (let i = 0; i < 3; i++) box(S, 0.7, 0.45, 0.05, M.glass, -2 + i * 2, sh * 0.72, sd / 2 + 0.03); }
    box(S, sw + 0.6, 0.15, sd + 0.8, M.roofDark, 0, sh + 0.12, 0.1, 0, -0.08);
    S.position.set(pen.x, sy, z0 + 3.2); out.add(S);
    if (kind === 'pig') { box(out, 3, 0.4, 0.8, M.concreteDark, pen.x + 5, gh(pen.x + 5, pen.z + 3) + 0.2, pen.z + 3); }
  }
  return out;
}
// ---------------- 农业大棚 ----------------
function buildGreenhouses() {
  const out = new THREE.Group(), gh0 = L.greenhouses, y0 = 5.9;
  const arch = (w, wall, top, n) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, a = Math.PI * t; const x = -Math.cos(a) * w / 2; const y = wall + Math.sin(a) * (top - wall) * (1 + 0.15 * Math.sin(a)) / 1.15; pts.push([x, y]); } return [[-w / 2, 0], ...pts, [w / 2, 0]]; };
  for (let i = 0; i < gh0.n; i++) {
    const cx = gh0.x0 + i * (gh0.w + gh0.gap) + gh0.w / 2, cz = gh0.z0 + gh0.len / 2, G1 = new THREE.Group();
    const prof = arch(gh0.w, 2.2, 4.3, 12);
    // 覆膜：截面挤出
    const shape = new THREE.Shape(); prof.forEach((p, k) => k ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1]));
    const eg = new THREE.ExtrudeGeometry(shape, { depth: gh0.len, bevelEnabled: false, curveSegments: 1 });
    const film = new THREE.Mesh(eg, M.film); film.position.z = -gh0.len / 2; G1.add(film);
    // 镀锌拱架
    for (let s = 0; s <= 12; s++) {
      const z = -gh0.len / 2 + s * gh0.len / 12;
      for (let k = 1; k < prof.length; k++) rod(G1, new THREE.Vector3(prof[k - 1][0], prof[k - 1][1], z), new THREE.Vector3(prof[k][0], prof[k][1], z), 0.035, M.galv, 4);
    }
    for (const x of [-gh0.w / 2, gh0.w / 2, 0]) { const yy = x === 0 ? 4.3 : 2.2; rod(G1, new THREE.Vector3(x, yy, -gh0.len / 2), new THREE.Vector3(x, yy, gh0.len / 2), 0.035, M.galv, 4); }
    box(G1, 1.6, 2.1, 0.06, M.alu, 0, 1.05, gh0.len / 2 + 0.02);
    G1.position.set(cx, y0, cz); out.add(G1);
  }
  return out;
}
