// ======================= 08b 叶片贴图集与树冠几何 =======================
// 贴图集 4×2 格：0 阔叶簇 1 小叶簇 2 灌木簇 3 蕨叶 4 苹果枝（带果） 5 香蕉叶（撕裂） 6 葡萄叶簇 7 菜叶莲座
function leafAtlas() {
  const C = 512, cv = document.createElement('canvas'); cv.width = C * 4; cv.height = C * 3;
  const g = cv.getContext('2d'), R = mulberry32(2024);
  const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
  function leaf(x, y, len, wid, ang, h, s, l, rib = true) {
    g.save(); g.translate(x, y); g.rotate(ang);
    const gr = g.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, hsl(h, s, l - 10)); gr.addColorStop(0.6, hsl(h, s, l)); gr.addColorStop(1, hsl(h + 6, s - 5, l + 8));
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(len * 0.25, -wid, len * 0.7, -wid * 0.9, len, 0); g.bezierCurveTo(len * 0.7, wid * 0.9, len * 0.25, wid, 0, 0); g.fill();
    if (rib) { g.strokeStyle = hsl(h, s - 10, l - 16, 0.6); g.lineWidth = Math.max(1, wid * 0.12); g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.95, 0); g.stroke(); }
    g.restore();
  }
  function cluster(ox, oy, n, lmin, lmax, wr, hue, light, spread = 225) {
    for (let i = 0; i < n; i++) {
      const t = Math.sqrt(R()), a = R() * TAU, r = t * (spread - lmax * 0.5);
      const x = ox + C / 2 + Math.cos(a) * r, y = oy + C / 2 + Math.sin(a) * r, len = lerp(lmin, lmax, R());
      leaf(x, y, len, len * wr, a + (R() - 0.5) * 1.6, hue + (R() - 0.5) * 16, 38 + R() * 18, light + (R() - 0.5) * 22 - (1 - t) * 8);
    }
  }
  cluster(0, 0, 150, 40, 95, 0.28, 102, 40);                 // 0 阔叶
  cluster(C, 0, 520, 16, 34, 0.32, 96, 42);                  // 1 小叶
  cluster(C * 2, 0, 380, 18, 40, 0.38, 88, 42, 230);         // 2 灌木
  // 3 蕨叶：中轴 + 成对小羽片
  { const ox = C * 3; for (let f = 0; f < 3; f++) { const bx = ox + 150 + f * 110, by = 500, ang = -Math.PI / 2 + (f - 1) * 0.25; g.strokeStyle = hsl(95, 35, 30); g.lineWidth = 4; g.beginPath(); g.moveTo(bx, by); const ex = bx + Math.cos(ang) * 470, ey = by + Math.sin(ang) * 470; g.lineTo(ex, ey); g.stroke();
      for (let t = 0.05; t < 0.97; t += 0.035) { const px = lerp(bx, ex, t), py = lerp(by, ey, t), ll = 70 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 8; for (const sd of [-1, 1]) leaf(px, py, ll, ll * 0.18, ang + sd * 1.25, 100, 45, 48 + (R() - 0.5) * 10, false); } } }
  // 4 苹果枝：小叶簇 + 红果
  cluster(0, C, 420, 16, 32, 0.34, 96, 50);
  for (let i = 0; i < 26; i++) { const a = R() * TAU, r = Math.sqrt(R()) * 200, x = C / 2 + Math.cos(a) * r, y = C + C / 2 + Math.sin(a) * r, rr = 9 + R() * 5; const gr = g.createRadialGradient(x - rr * 0.3, y - rr * 0.3, 1, x, y, rr); gr.addColorStop(0, '#ff8a70'); gr.addColorStop(0.5, '#c8231e'); gr.addColorStop(1, '#7a1310'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
  // 5 香蕉叶：整片长叶 + 边缘撕裂
  { const ox = C, oy = C; g.save(); leaf(ox + 20, oy + C / 2, C - 40, 150, 0, 98, 55, 45); g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000';
    for (let i = 0; i < 16; i++) { const x = ox + 70 + i * 26 + R() * 10, sd = R() < 0.5 ? -1 : 1; g.lineWidth = 2 + R() * 2; g.beginPath(); g.moveTo(x, oy + C / 2 + sd * 160); g.lineTo(x + 18, oy + C / 2 + sd * (18 + R() * 50)); g.stroke(); } g.restore(); }
  // 6 葡萄叶：掌状三裂叶簇
  for (let i = 0; i < 90; i++) { const a = R() * TAU, r = Math.sqrt(R()) * 200, x = C * 2 + C / 2 + Math.cos(a) * r, y = C + C / 2 + Math.sin(a) * r, s = 24 + R() * 18, rot = R() * TAU; for (const d of [-0.9, 0, 0.9]) leaf(x, y, s * (d ? 0.8 : 1), s * 0.45, rot + d, 85, 45, 46 + (R() - 0.5) * 12); }
  // 7 菜叶莲座
  for (let i = 0; i < 22; i++) { const a = i / 22 * TAU * 2.3, r = 20 + i * 8; leaf(C * 3 + C / 2 + Math.cos(a) * r * 0.3, C + C / 2 + Math.sin(a) * r * 0.3, 150 + i * 3, 80, a, 105, 40, 55 + i * 0.6); }
  // 8 椰子叶：中轴 + 两侧长条小叶（向下斜垂）
  { const ox = 0, oy = C * 2; g.strokeStyle = hsl(60, 40, 38); g.lineWidth = 6; g.beginPath(); g.moveTo(ox + C / 2, oy + C - 4); g.lineTo(ox + C / 2, oy + 6); g.stroke();
    for (let y = oy + C - 30; y > oy + 14; y -= 7) { const t = 1 - (y - oy) / C, ll = 235 * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.95)) + 20; for (const sd of [-1, 1]) { g.save(); g.translate(ox + C / 2, y); g.rotate(sd * (1.25 + 0.15 * R())); leaf(0, 0, ll, 12 + 5 * R(), 0, 88 + R() * 14, 42 + R() * 10, 36 + R() * 14, false); g.restore(); } } }
  // 9 扶桑：卵形锯齿叶 + 红色五瓣大花
  cluster(C, C * 2, 230, 26, 50, 0.45, 110, 30);
  for (let i = 0; i < 16; i++) { const a = R() * TAU, r = Math.sqrt(R()) * 190, x = C + C / 2 + Math.cos(a) * r, y = C * 2 + C / 2 + Math.sin(a) * r, rr = 22 + R() * 12, rot = R() * TAU;
    for (let k = 0; k < 5; k++) { g.save(); g.translate(x, y); g.rotate(rot + k * TAU / 5); const gr = g.createRadialGradient(0, 0, 2, rr * 0.5, 0, rr); gr.addColorStop(0, '#6e0610'); gr.addColorStop(0.3, '#d0141e'); gr.addColorStop(1, '#f2403c'); g.fillStyle = gr; g.beginPath(); g.ellipse(rr * 0.5, 0, rr * 0.55, rr * 0.42, 0, 0, TAU); g.fill(); g.restore(); }
    g.strokeStyle = '#f5d24a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(rot) * rr * 0.9, y + Math.sin(rot) * rr * 0.9); g.stroke(); }
  // 10 榕树：密集小椭圆亮绿叶簇
  cluster(C * 2, C * 2, 900, 12, 26, 0.5, 104, 34, 238);
  // 11 垂叶榕：细长下垂小叶
  for (let i = 0; i < 700; i++) { const x = C * 3 + 20 + R() * (C - 40), y = C * 2 + 10 + R() * (C - 60); leaf(x, y, 18 + R() * 14, 5, Math.PI / 2 + (R() - 0.5) * 0.8, 96 + R() * 14, 40, 32 + R() * 18, false); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}
const ATLAS_UV = (cell) => { const cx = cell % 4, cy = Math.floor(cell / 4); return [cx / 4 + 0.004, 1 - (cy + 1) / 3 + 0.004, (cx + 1) / 4 - 0.004, 1 - cy / 3 - 0.004]; };
// 叶片材质：透明测试 + 距离自适应阈值（远处降低阈值避免树冠变稀） + 轻微风摆
function leafMaterial(atlas) {
  const m = new THREE.MeshStandardMaterial({ map: atlas, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.82, vertexColors: true });
  m.alphaToCoverage = true;
  const uT = { value: 0 }; TIME_U.push(uT);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; varying float vCamD;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
        vec3 ipos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
        vec3 ipos = vec3(0.0);
        #endif
        float sway = sin(uTime * 1.3 + ipos.x * 0.21 + ipos.z * 0.17) * 0.04 * max(position.y, 0.0);
        transformed.x += sway; transformed.z += sway * 0.6;`)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vec4 wq = vec4(transformed, 1.0);\n #ifdef USE_INSTANCING\n wq = instanceMatrix * wq;\n #endif\n vCamD = length((modelMatrix * wq).xyz - cameraPosition);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vCamD;')
      .replace('#include <alphatest_fragment>', 'if (diffuseColor.a < mix(0.5, 0.18, smoothstep(40.0, 600.0, vCamD))) discard;')
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
  };
  return m;
}
// 树冠：低面数内核（组 0）+ 外壳叶簇面片（组 1）。法线按球面外向，获得柔和体积感
function crownCardsGeo(seed, opt) {
  const { lobes = 2, detail = 1, flat = 0.85, cards = 16, cell = 0, cardSize = 0.95, shell = 0.78 } = opt;
  const core = crownGeo(seed, lobes, flat, detail); core.scale(0.82, 0.82, 0.82);
  const cp = core.attributes.position, cc = core.attributes.color;
  const pos = Array.from(cp.array), nrm = Array.from(core.attributes.normal.array), col = Array.from(cc.array), uv = new Array(cp.count * 2).fill(0.5);
  const idx = Array.from(core.index.array), coreCount = idx.length;
  for (let i = 0; i < col.length; i++) col[i] = 0.4 + col[i] * 0.45;   // 内核偏暗但底部不至于死黑
  const R = mulberry32(Math.floor(seed * 977)), [u0, v0, u1, v1] = ATLAS_UV(cell);
  const n = new THREE.Vector3(), t = new THREE.Vector3(), b = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < cards; k++) {
    // 球面近似均匀分布（上半球略多）
    const yy = 1 - 1.85 * (k + 0.5) / cards, rr = Math.sqrt(Math.max(0, 1 - yy * yy)), ph = k * 2.39996 + R() * 0.4;
    n.set(Math.cos(ph) * rr, clamp(yy, -0.85, 1), Math.sin(ph) * rr).normalize();
    const c = n.clone().multiplyScalar(shell); c.y *= flat;
    t.crossVectors(Math.abs(n.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : up, n).normalize(); b.crossVectors(n, t).normalize();
    const roll = R() * TAU, cr = Math.cos(roll), sr = Math.sin(roll), T = t.clone().multiplyScalar(cr).addScaledVector(b, sr), B = b.clone().multiplyScalar(cr).addScaledVector(t, -sr);
    const s = cardSize * (0.8 + R() * 0.4), base = pos.length / 3;
    for (const [a, bb, uu, vv] of [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, 1, u0, v1]]) {
      const p = c.clone().addScaledVector(T, a * s * 0.5).addScaledVector(B, bb * s * 0.5);
      pos.push(p.x, p.y, p.z);
      const sn = p.clone().normalize().multiplyScalar(0.75).addScaledVector(up, 0.35).normalize(); nrm.push(sn.x, sn.y, sn.z);
      const sh = 0.55 + 0.55 * clamp((p.y + 0.6) / 1.3, 0, 1); col.push(sh, sh, sh); uv.push(uu, vv);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.addGroup(0, coreCount, 0); g.addGroup(coreCount, idx.length - coreCount, 1);
  return g;
}
// 蕨类/树蕨叶丛：放射状叶片面片
function frondGeo(n = 8, len = 1.6, cell = 3, droop = 0.5, lift = 0) {
  const pos = [], nrm = [], col = [], uv = [], idx = [], [u0, v0, u1, v1] = ATLAS_UV(cell);
  for (let k = 0; k < n; k++) {
    const a = k / n * TAU + (k % 2) * 0.3, dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, base = pos.length / 3, w = len * 0.42;
    const segs = 3;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, r = t * len, y = lift + Math.sin(t * 1.2) * len * 0.55 - t * t * droop * len;
      for (const s of [-1, 1]) { pos.push(dx * r + px * s * w * 0.5, y, dz * r + pz * s * w * 0.5); nrm.push(0, 1, 0); const sh = 0.75 + 0.35 * t; col.push(sh, sh, sh); uv.push(s < 0 ? u0 : u1, lerp(v0, v1, t)); }
      if (i < segs) { const q = base + i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
// 树干：带主枝；板根型用于突出层大树
function barkTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d'), R = mulberry32(77);
  g.fillStyle = '#6a5a49'; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 160; i++) { const x = R() * 128, w = 1 + R() * 4, l = R() < 0.5 ? 25 : 45 + R() * 20; g.fillStyle = `rgba(${l},${l - 8},${l - 16},${0.35 + R() * 0.4})`; for (const dx of [-128, 0, 128]) g.fillRect(x + dx, 0, w, 256); }
  for (let i = 0; i < 400; i++) { const x = R() * 128, y = R() * 256; g.fillStyle = `rgba(${R() < 0.5 ? '150,140,120' : '40,34,28'},0.35)`; g.fillRect(x, y, 2 + R() * 5, 1 + R() * 3); }
  for (let i = 0; i < 70; i++) { const x = R() * 128, y = R() * 256; g.fillStyle = 'rgba(90,120,60,0.35)'; g.beginPath(); g.arc(x, y, 3 + R() * 8, 0, TAU); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 5); t.anisotropy = 8; return t;
}
function trunkGeo(kind) {
  const parts = [];
  const add = (g) => { parts.push(g.index ? g.toNonIndexed() : g); };
  const cyl = (rt, rb, h, x, y, z, rx = 0, rz = 0) => { const g = new THREE.CylinderGeometry(rt, rb, h, 7, 1); g.translate(0, h / 2, 0); g.rotateX(rx); g.rotateZ(rz); g.translate(x, y, z); add(g); };
  if (kind === 'emergent') {
    cyl(0.45, 0.8, 1, 0, 0, 0);
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU, g = new THREE.BoxGeometry(0.12, 0.28, 1.1); g.translate(0, 0.12, 0.5); g.rotateY(a); g.scale(1, 1, 1); add(g); }
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + 0.4; const g = new THREE.CylinderGeometry(0.08, 0.16, 0.45, 5, 1); g.translate(0, 0.22, 0); g.rotateZ(0.9); g.rotateY(a); g.translate(0, 0.78, 0); add(g); }
  } else {
    cyl(0.5, 0.75, 1, 0, 0, 0);
    for (let k = 0; k < 2; k++) { const a = k * Math.PI + 0.7; const g = new THREE.CylinderGeometry(0.12, 0.22, 0.4, 5, 1); g.translate(0, 0.2, 0); g.rotateZ(0.7); g.rotateY(a); g.translate(0, 0.72, 0); add(g); }
  }
  const m = THREE.BufferGeometryUtils.mergeGeometries(parts); m.computeVertexNormals(); return m;
}

// ======================= 椰子树与榕树 =======================
function palmBarkTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'), R = mulberry32(515);
  g.fillStyle = '#8a7a64'; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 7 + R() * 5) { g.fillStyle = `rgba(60,50,40,${0.5 + R() * 0.3})`; g.fillRect(0, y, 64, 1.5 + R() * 1.5); g.fillStyle = 'rgba(180,165,140,0.35)'; g.fillRect(0, y + 2, 64, 1); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '70,60,48' : '160,148,128'},0.3)`; g.fillRect(R() * 64, R() * 256, 1 + R() * 3, 1 + R() * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 4); return t;
}
// 椰子树：弯曲环纹树干 + 椰果（组 0），羽状叶（组 1）。单位高度 1（实例缩放为树高）
function palmGeo(seed) {
  const R = mulberry32(seed * 131 + 7), lean = 0.08 + R() * 0.16, bend = 0.05 + R() * 0.1;
  const pos = [], nrm = [], uv = [], col = [], idx = [];
  const trunkAt = (t) => [lean * t + bend * t * t, t, 0];
  const SEG = 8, SIDES = 6;
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG, c = trunkAt(t), r = (0.024 - 0.01 * t) * (1 + 0.5 * Math.exp(-t * 18));
    for (let k = 0; k <= SIDES; k++) { const a = k / SIDES * TAU; pos.push(c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r); nrm.push(Math.cos(a), 0, Math.sin(a)); uv.push(k / SIDES, t * 3); col.push(1, 1, 1); }
    if (i < SEG) for (let k = 0; k < SIDES; k++) { const a = i * (SIDES + 1) + k, b = a + SIDES + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  const top = trunkAt(1);
  for (let k = 0; k < 3; k++) {   // 椰果
    const a = k / 3 * TAU, cx = top[0] + Math.cos(a) * 0.018, cy = 0.975, cz = Math.sin(a) * 0.018, base = pos.length / 3, sg = new THREE.IcosahedronGeometry(0.011, 0), p = sg.attributes.position;
    for (let i = 0; i < p.count; i++) { pos.push(cx + p.getX(i), cy + p.getY(i) * 1.1, cz + p.getZ(i)); const n = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize(); nrm.push(n.x, n.y, n.z); uv.push(0.5, 0.2); col.push(0.55, 0.62, 0.3); idx.push(base + i); }
  }
  const trunkCount = idx.length;
  const [u0, v0, u1, v1] = ATLAS_UV(8), NF = 14;
  for (let f = 0; f < NF; f++) {
    const az = f / NF * TAU + R() * 0.3, el = f < 4 ? 0.9 - R() * 0.2 : 0.35 - R() * 0.5, L0 = 0.3 + R() * 0.08, W0 = 0.12;
    const dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az)), side = new THREE.Vector3(-dir.z, 0, dir.x), S = 5, base = pos.length / 3;
    for (let i = 0; i <= S; i++) {
      const t = i / S, d = t * L0, h = Math.sin(el) * d - 0.9 * t * t * L0 * (1 - Math.sin(el) * 0.4), w = W0 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08)), fold = w * 0.35;
      const cx = top[0] + dir.x * d * Math.cos(el * 0.5), cy = 0.99 + h, cz = dir.z * d * Math.cos(el * 0.5);
      for (const sgn of [-1, 0, 1]) { pos.push(cx + side.x * sgn * w, cy - Math.abs(sgn) * fold, cz + side.z * sgn * w); nrm.push(0, 1, 0); uv.push(sgn < 0 ? u0 : sgn > 0 ? u1 : (u0 + u1) / 2, lerp(v0, v1, t)); const sh = 0.75 + 0.35 * t; col.push(sh, sh, sh); }
      if (i < S) { const a = base + i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  g.addGroup(0, trunkCount, 0); g.addGroup(trunkCount, idx.length - trunkCount, 1);
  return g;
}
// 榕树树冠：伞形分布的若干小叶簇（无暗色大内核），组 0 为小内核、组 1 为叶片；单位半径 1
function banyanCrownGeo(seed, opt) {
  const { clumps = 11, flat = 0.42, cell = 10, cards = 6, spread = 0.78 } = opt, R = mulberry32(seed * 97 + 3), parts = [];
  const pos = [], nrm = [], uv = [], col = [], idx0 = [], idx1 = [];
  for (let k = 0; k < clumps; k++) {
    const a = k * 2.39996 + R() * 0.5, r = Math.sqrt((k + 0.5) / clumps) * spread, cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = (1 - r * r) * 0.35 * flat / 0.42 + (R() - 0.5) * 0.08, s = 0.32 + R() * 0.14;
    const cg = crownCardsGeo(seed * 13 + k, { lobes: 1, detail: 0, flat: 0.8, cards, cell, cardSize: 1.25, shell: 0.72 });
    cg.scale(s, s * 0.85, s); cg.translate(cx, cy, cz);
    const p = cg.attributes.position, n = cg.attributes.normal, u = cg.attributes.uv, c = cg.attributes.color, base = pos.length / 3;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nrm.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u.getX(i), u.getY(i)); const v = Math.min(1.1, c.getX(i) * 1.25); col.push(v, v, v); }
    const ix = cg.index.array, g0 = cg.groups[0];
    for (let i = 0; i < ix.length; i++) (i < g0.start + g0.count ? idx0 : idx1).push(ix[i] + base);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex([...idx0, ...idx1]); g.addGroup(0, idx0.length, 0); g.addGroup(idx0.length, idx1.length, 1);
  return g;
}
// 榕树枝干：短粗主干 + 放射主枝 + 下垂气生根（单位：冠幅半径 1、冠底高度 1）
function banyanWoodGeo(seed, roots = 12) {
  const R = mulberry32(seed * 71 + 5), parts = [];
  const rod2 = (a, b, r0, r1, seg = 6) => { const d = new THREE.Vector3().subVectors(b, a), L = d.length(); const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); parts.push(g.toNonIndexed()); };
  const trunkTop = new THREE.Vector3(0, 0.42, 0);
  rod2(new THREE.Vector3(0, -0.05, 0), trunkTop, 0.11, 0.08, 9);
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + R() * 0.5, r = 0.35 + R() * 0.3; rod2(trunkTop, new THREE.Vector3(Math.cos(a) * r, 0.95 + R() * 0.1, Math.sin(a) * r), 0.06, 0.025); }
  for (let k = 0; k < 4; k++) { const a = R() * TAU, r = 0.08 + R() * 0.05; rod2(new THREE.Vector3(Math.cos(a) * r, -0.05, Math.sin(a) * r), new THREE.Vector3(Math.cos(a) * 0.03, 0.3, Math.sin(a) * 0.03), 0.035, 0.02, 5); }  // 板状支柱根
  for (let k = 0; k < roots; k++) { const a = R() * TAU, r = 0.25 + R() * 0.5, len = 0.5 + R() * 0.5, thick = R() < 0.3; rod2(new THREE.Vector3(Math.cos(a) * r, 0.98, Math.sin(a) * r), new THREE.Vector3(Math.cos(a) * r + (R() - 0.5) * 0.03, thick ? -0.02 : 0.98 - len, Math.sin(a) * r), thick ? 0.02 : 0.006, thick ? 0.028 : 0.004, 4); }
  const m = THREE.BufferGeometryUtils.mergeGeometries(parts); m.computeVertexNormals(); return m;
}
// 榕树整株（树干/主枝/气生根 + 叶簇，同一坐标系，保证枝叶相连）。单位：冠幅半径 = 1，组 0 树皮 / 组 1 叶簇内核 / 组 2 叶片
function banyanTreeGeo(seed, opt) {
  const { clumps = 10, spread = 0.82, flat = 0.42, cell = 10, cards = 6, hb = 0.7, roots = 12 } = opt, R = mulberry32(seed * 131 + 17);
  const G = [[], [], []];
  const push = (g, gi) => { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.color) { const a = new Float32Array(n.attributes.position.count * 3).fill(1); n.setAttribute('color', new THREE.BufferAttribute(a, 3)); } if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2).fill(0.5), 2)); G[gi].push(n); };
  const limb = (a, b, r0, r1, seg = 6) => { const d = new THREE.Vector3().subVectors(b, a), L = d.length(); const g = new THREE.CylinderGeometry(r1, r0, L * 1.04, seg, 1, true); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); push(g, 0); };
  // 叶簇位置
  const C = [];
  for (let k = 0; k < clumps; k++) { const a = k * 2.39996 + R() * 0.5, r = Math.sqrt((k + 0.5) / clumps) * spread; C.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: hb + 0.12 + (1 - r * r) * 0.3 * flat / 0.42 + (R() - 0.5) * 0.06, s: 0.3 + R() * 0.14 }); }
  // 主干（基部外扩的板根）→ 分叉点
  const fork = new THREE.Vector3(0, hb * 0.62, 0);
  limb(new THREE.Vector3(0, -0.05, 0), fork, 0.1, 0.075, 10);
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + R() * 0.4; limb(new THREE.Vector3(Math.cos(a) * 0.16, -0.03, Math.sin(a) * 0.16), new THREE.Vector3(Math.cos(a) * 0.04, 0.2, Math.sin(a) * 0.04), 0.03, 0.02, 5); }
  // 主枝伸入每个叶簇中心，并分出小枝
  for (const c of C) {
    const mid = new THREE.Vector3(c.x * 0.5, lerp(fork.y, c.y, 0.55) - 0.02, c.z * 0.5), end = new THREE.Vector3(c.x, c.y - c.s * 0.15, c.z);
    limb(fork, mid, 0.045 + c.s * 0.04, 0.03); limb(mid, end, 0.03, 0.012);
    for (let t = 0; t < 2; t++) { const a = R() * TAU; limb(end, new THREE.Vector3(c.x + Math.cos(a) * c.s * 0.6, c.y + c.s * 0.2, c.z + Math.sin(a) * c.s * 0.6), 0.012, 0.004, 4); }
    const cg = crownCardsGeo(seed * 13 + C.indexOf(c), { lobes: 1, detail: 0, flat: 0.8, cards, cell, cardSize: 1.25, shell: 0.72 });
    cg.scale(c.s, c.s * 0.85, c.s); cg.translate(c.x, c.y, c.z);
    const col = cg.attributes.color; for (let i = 0; i < col.count; i++) { const v = Math.min(1.1, col.getX(i) * 1.25); col.setXYZ(i, v, v, v); }
    const g0 = cg.groups[0], ix = cg.index.array;
    const sub = (st, ct) => { const g = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'uv', 'color']) g.setAttribute(k, cg.attributes[k]); g.setIndex(Array.from(ix.slice(st, st + ct))); return g; };
    push(sub(g0.start, g0.count), 1); push(sub(g0.start + g0.count, ix.length - g0.count), 2);
    // 气生根：自主枝下垂，部分落地成支柱根
    if (R() < roots / clumps) { const p = new THREE.Vector3().lerpVectors(mid, end, 0.6 + R() * 0.3), thick = R() < 0.3; limb(new THREE.Vector3(p.x, p.y - 0.01, p.z), new THREE.Vector3(p.x + (R() - 0.5) * 0.02, thick ? -0.02 : p.y - 0.25 - R() * 0.35, p.z), thick ? 0.014 : 0.004, thick ? 0.02 : 0.003, 4); }
  }
  const parts = G.map(list => THREE.BufferGeometryUtils.mergeGeometries(list));
  const g = THREE.BufferGeometryUtils.mergeGeometries(parts, true); g.computeVertexNormals();
  return g;
}
