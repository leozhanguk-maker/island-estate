// ======================= 17d 水域生态·环岛外海（热带大洋，禁止任何淡水物种） =======================
// 分区出现：南侧峡谷出海口——金梭鱼龙卷；东南——虎鲸家族与沙丁鱼饵球；西南——座头鲸母子群；北侧——大眼鲹鱼墙、鲸鲨（独行）
// 虎鲸与座头鲸分在东南、西南两区，相距约 500 m，不会并行出现
const ECO_OCEAN = { S: { x: 20, z: 212 }, SE: { x: 240, z: 202 }, SW: { x: -250, z: 200 }, N: { x: 10, z: -212 } };
// 带厚度的鳍：轮廓 pts 围成的薄片，中部向两面各鼓起 th（透镜形截面，边缘法向平滑过渡，近看有体积）；lo 或 th = 0 时退回平面鳍
function ecoFinT(pts, color, aw, th, lo) {
  if (lo || !th) return ecoFin(pts, color, aw);
  const n = pts.length, c = [0, 0, 0], N = [0, 0, 0];
  for (const p of pts) for (let k = 0; k < 3; k++) c[k] += p[k] / n;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; N[0] += (a[1] - b[1]) * (a[2] + b[2]); N[1] += (a[2] - b[2]) * (a[0] + b[0]); N[2] += (a[0] - b[0]) * (a[1] + b[1]); }
  const nl = Math.hypot(N[0], N[1], N[2]) || 1; for (let k = 0; k < 3; k++) N[k] /= nl;
  // 顶点：外轮廓 n 个、上/下内圈各 n 个（向中心收 45%、沿法向鼓起 ±0.8 th）、上/下中心各 1 个
  const pos = [], ring = (s, k, h) => pts.map(p => [c[0] + (p[0] - c[0]) * k + N[0] * h * s, c[1] + (p[1] - c[1]) * k + N[1] * h * s, c[2] + (p[2] - c[2]) * k + N[2] * h * s]);
  for (const q of [...pts, ...ring(1, 0.55, th * 0.8), ...ring(-1, 0.55, th * 0.8)]) pos.push(...q);
  pos.push(c[0] + N[0] * th, c[1] + N[1] * th, c[2] + N[2] * th, c[0] - N[0] * th, c[1] - N[1] * th, c[2] - N[2] * th);
  const idx = [], T = 3 * n, B = 3 * n + 1;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, p0 = i, p1 = j, q0 = n + i, q1 = n + j, r0 = 2 * n + i, r1 = 2 * n + j;
    idx.push(p0, p1, q1, p0, q1, q0, q0, q1, T, p1, p0, r0, p1, r0, r1, r1, r0, B); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return ecoPart(g, color, aw);
}
// 贴在体表上的小球（眼睛、瘤突、藤壶）：sx/sy/sz 为各向缩放
function ecoKnob(x, y, z, r, color, aw, sx = 1, sy = 1, sz = 1) { const g = new THREE.SphereGeometry(r, 8, 6); g.scale(sx, sy, sz); g.translate(x, y, z); return ecoPart(g, color, aw); }
// 体表上一点：t（0 头 → 1 尾）、截面角 a（sin a > 0 为背侧，cos a 符号为左右）、径向外推 k 倍
const ecoSurf = (L_, prof, t, a, k = 1) => { const [h, w] = prof(t); return [L_ / 2 - t * L_, Math.sin(a) * h * k, Math.cos(a) * w * k]; };
// 确定性的伪随机斑驳（-1～1），用于体表花纹
const ecoHash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
// 鲸类几何（头朝 +x）：kind = humpback 座头鲸 / orca 虎鲸 / shark 鲸鲨；lo = 远景简模（不加细节件）
// 近景细节（2026-09-29 细节化）：鳍有厚度；眼睛、嘴线；座头鲸头部瘤突、喉腹褶沟、下颌藤壶、胸鳍前缘波状瘤突、尾鳍后缘锯齿与腹面白斑；
// 虎鲸眼斑、鞍斑、尾鳍腹面浅色、雄鲸三角形高背鳍/雌鲸镰刀形背鳍、桨形胸鳍；鲸鲨五对鳃裂、背部纵脊、白斑与横纹格
function ecoWhaleGeo(kind, lo, o = {}) {
  // 近景细分：虎鲸眼斑、鲸鲨斑点靠顶点色表现，网格要足够密；远景简模不变
  const seg = lo ? 7 : kind === 'shark' ? 72 : kind === 'orca' ? 48 : 34, ring = lo ? 6 : kind === 'shark' ? 40 : kind === 'orca' ? 28 : 20, parts = [];
  // 尾鳍摆动权重按到头部的相对距离连续取值（与身体 aw = t 衔接）；原先固定 1.2～1.25，摆尾时尾鳍比尾柄摆得多，看起来与身体脱开
  const tailAw = (L_) => (x) => Math.max(1, (L_ / 2 - x) / L_);
  if (kind === 'humpback') {
    const L_ = o.len ?? 13, top = new THREE.Color(0x24282d), belly = new THREE.Color(0xa4aaaf), white = new THREE.Color(0xe4e8e6);
    const prof = (t) => { const k = t < 0.35 ? 0.55 + 0.45 * Math.sin(Math.PI / 2 * t / 0.35) : 1 - Math.pow((t - 0.35) / 0.65, 1.4) * 0.9; return [L_ * 0.1 * k * (t < 0.12 ? 0.75 + t * 2 : 1), L_ * 0.1 * k]; };
    parts.push(ecoBody(L_, prof, (t, a) => {
      const s = Math.sin(a), cs = Math.cos(a), c = top.clone().lerp(belly, clamp(-s * 1.4 - 0.1, 0, 1));
      if (lo) return c;
      // 嘴线：吻端向后到 t≈0.24 的口角，略向下弯
      const ml = -0.1 - 0.22 * Math.pow(1 - clamp(t / 0.24, 0, 1), 1.5) + 0.12 * Math.sin(Math.PI * clamp(t / 0.24, 0, 1));
      if (t < 0.245 && Math.abs(s - ml) < 0.035 && Math.abs(cs) > 0.25) return c.set(0x0e1012);
      // 喉腹褶沟：下颌到肚脐（t 0.03～0.5）腹面浅色、一道道纵向深色细沟
      if (t > 0.03 && t < 0.5 && s < -0.3) { c.copy(white).lerp(top, clamp(0.25 + 0.3 * ecoHash(Math.round(t * 30), Math.round(cs * 6)), 0, 1)); if (((cs * 16) % 1 + 1) % 1 < 0.2) c.multiplyScalar(0.55); return c; }
      // 腹面其余部分黑白斑驳
      if (s < -0.5) return c.lerp(white, clamp(0.4 + 0.5 * ecoHash(Math.round(t * 18), Math.round(a * 4)), 0, 1));
      // 背部：两处喷气孔（深色）、头顶瘤突之间的细纹
      if (t > 0.19 && t < 0.215 && s > 0.94 && Math.abs(cs) > 0.06 && Math.abs(cs) < 0.22) return c.set(0x0a0b0c);
      if (s > 0.2 && ecoHash(Math.round(t * 60), Math.round(a * 9)) > 0.86) c.multiplyScalar(1.35);   // 背部浅色刮痕
      return c;
    }, seg, ring));
    const pl = L_ * 0.32, fw = L_ * 0.085;
    if (!lo) {
      // 眼睛：口角上方
      for (const sd of [-1, 1]) { const a = sd > 0 ? 0.02 : Math.PI - 0.02, p = ecoSurf(L_, prof, 0.235, a, 0.98); parts.push(ecoKnob(p[0], p[1], p[2], 0.08, 0x0a0b0c, 0.235, 1.3, 0.8, 0.6)); }
      // 头部瘤突：上颌背面三排、下颌吻端一圈（每个瘤突里有一根触须，此处只做鼓包）
      for (let i = 0; i < 9; i++) { const t = 0.012 + i * 0.022; for (const a of [Math.PI / 2, Math.PI / 2 + 0.42, Math.PI / 2 - 0.42]) { if (a !== Math.PI / 2 && i < 2) continue; const p = ecoSurf(L_, prof, t, a, 0.99); parts.push(ecoKnob(p[0], p[1], p[2], 0.085 + 0.02 * (i % 2), 0x1c1f23, t)); } }
      for (let k = -3; k <= 3; k++) { const p = ecoSurf(L_, prof, 0.02, -Math.PI / 2 + k * 0.28, 0.99); parts.push(ecoKnob(p[0], p[1], p[2], 0.09, 0x1c1f23, 0.02)); }
      // 下颌藤壶：浅灰白小簇
      for (let k = 0; k < 14; k++) { const t = 0.015 + 0.05 * Math.abs(ecoHash(k, 1)), a = -Math.PI / 2 + ecoHash(k, 2) * 0.9, p = ecoSurf(L_, prof, t, a, 1.0); parts.push(ecoKnob(p[0], p[1], p[2], 0.05 + 0.03 * Math.abs(ecoHash(k, 3)), 0xcfd2cc, t, 1, 0.6, 1)); }
    }
    // 极长的胸鳍（约体长 1/3）：前缘一串波状瘤突、后缘平滑，尖端变窄；鳍面白色、根部偏暗
    for (const sd of [-1, 1]) {
      const b = [L_ * 0.2, -L_ * 0.055, sd * L_ * 0.075], D = new THREE.Vector3(-0.32, -0.42, sd * 0.85).normalize(), Cd = new THREE.Vector3(1, 0, 0).addScaledVector(D, -D.x).normalize();
      const at = (u, off) => [b[0] + D.x * pl * u + Cd.x * off, b[1] + D.y * pl * u + Cd.y * off, b[2] + D.z * pl * u + Cd.z * off];
      const chord = (u) => fw * (1 - 0.8 * u) * (u < 0.08 ? 0.7 + u * 3.75 : 1), NB = lo ? 4 : 14, pts = [];
      for (let j = 0; j <= NB; j++) { const u = j / NB; pts.push(at(u, chord(u) * 0.4 + (!lo && j % 2 && u < 0.95 ? fw * 0.09 : 0))); }
      for (let j = NB; j >= 0; j--) { const u = j / NB; pts.push(at(u, -chord(u) * 0.6)); }
      parts.push(ecoFinT(pts, (x, y, z) => { const u = clamp(((x - b[0]) * D.x + (y - b[1]) * D.y + (z - b[2]) * D.z) / pl, 0, 1); return ecoMix(0x2a2e33, 0xe2e6e4, 0.35 + u * 1.2); }, 0.3, 0.1, lo));
    }
    // 小背鳍（驼峰上）
    parts.push(ecoFinT([[-L_ * 0.17, L_ * 0.083, 0], [-L_ * 0.2, L_ * 0.105, 0], [-L_ * 0.225, L_ * 0.122, 0], [-L_ * 0.25, L_ * 0.1, 0], [-L_ * 0.28, L_ * 0.07, 0]], top, 0.7, 0.08, lo));
    // 尾鳍：宽大、后缘锯齿、中间缺刻；背面深色、腹面白底黑斑（每头鲸花纹不同，这里固定一种）
    { const tx = -L_ / 2, sp = L_ * 0.17, pts = [[tx + 0.25, 0, 0]], NS = lo ? 2 : 9;
      for (const sd of [1, -1]) { const side = []; side.push([tx - L_ * 0.03, 0, sd * L_ * 0.06], [tx - L_ * 0.07, 0, sd * sp * 0.8], [tx - L_ * 0.12, 0, sd * sp]);
        for (let j = 0; j <= NS; j++) { const u = j / NS, z = sd * sp * (1 - u) * 0.98 + sd * 0.15 * u; side.push([tx - L_ * 0.11 + L_ * 0.015 * Math.sin(Math.PI * u) - (j % 2 && !lo ? 0.07 : 0), 0, z]); }
        side.push([tx - L_ * 0.085, 0, 0]); if (sd < 0) side.reverse(); if (sd > 0) pts.push(...side); else pts.push(...side.slice(1)); }
      pts.reverse();
      parts.push(ecoFinT(pts, (x, y, z) => y < -0.004 ? (ecoHash(Math.round(x * 1.6), Math.round(z * 1.6)) > 0.35 ? new THREE.Color(0x202326) : new THREE.Color(0xe0e4e0)) : new THREE.Color(0x24282d), tailAw(L_), 0.09, lo)); }
  } else if (kind === 'orca') {
    const L_ = o.len ?? 7, blk = new THREE.Color(0x0c0d10), wht = new THREE.Color(0xf2f2ee), gry = new THREE.Color(0x6a6e74), male = (o.dorsal ?? 1.1) > 1.3;
    const prof = (t) => { const k = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.08)), 0.7) * (1 - 0.7 * t * t); return [L_ * 0.11 * k, L_ * 0.095 * k]; };
    parts.push(ecoBody(L_, prof, (t, a) => {
      const s = Math.sin(a), cs = Math.cos(a);
      if (!lo && t < 0.11 && Math.abs(s + 0.12 + 0.2 * (1 - t / 0.11)) < 0.035 && Math.abs(cs) > 0.3) return blk.clone().multiplyScalar(0.5);   // 嘴线
      if (s < -0.45 && t < 0.62) return wht.clone();                                                 // 下颌到腹部白色
      // 眼斑：眼后上方的椭圆白斑
      if (t > 0.1 && t < 0.24 && Math.abs(cs) > 0.55) { const u = (t - 0.17) / 0.07, v = (s - 0.28) / 0.2; if (u * u + v * v < 1) return wht.clone(); }
      // 鞍斑：背鳍后方的灰色马鞍形
      if (t > 0.4 && t < 0.58 && s > 0.72 - 0.25 * Math.sin(Math.PI * (t - 0.4) / 0.18)) return gry.clone().lerp(wht, lo ? 0 : 0.1);
      // 体侧白色后延：腹部白色在后方向上翘成一块
      if (s < -0.2 + 0.35 * Math.sin(Math.PI * clamp((t - 0.52) / 0.2, 0, 1)) && t > 0.52 && t < 0.72 && Math.abs(cs) > 0.3) return wht.clone();
      return blk.clone();
    }, seg, ring));
    if (!lo) for (const sd of [-1, 1]) { const p = ecoSurf(L_, prof, 0.15, sd > 0 ? 0.08 : Math.PI - 0.08, 0.99); parts.push(ecoKnob(p[0], p[1], p[2], 0.035, 0x020203, 0.15, 1.3, 1, 0.6)); }
    // 背鳍：雄鲸笔直高耸的三角形，雌鲸与幼鲸为后缘内凹的镰刀形
    const dh = o.dorsal ?? 1.1, dy = L_ * 0.09;
    parts.push(ecoFinT(male ? [[-L_ * 0.0, dy, 0], [-L_ * 0.03, dy + dh * 0.5, 0], [-L_ * 0.06, dy + dh, 0], [-L_ * 0.085, dy + dh * 0.96, 0], [-L_ * 0.12, dy + dh * 0.35, 0], [-L_ * 0.16, dy - 0.02, 0]]
      : [[-L_ * 0.0, dy, 0], [-L_ * 0.04, dy + dh * 0.55, 0], [-L_ * 0.09, dy + dh * 0.92, 0], [-L_ * 0.13, dy + dh, 0], [-L_ * 0.11, dy + dh * 0.7, 0], [-L_ * 0.12, dy + dh * 0.35, 0], [-L_ * 0.16, dy - 0.02, 0]], blk, 0.55, lo ? 0 : 0.06 * L_ / 7, lo));
    // 胸鳍：宽大的桨形（圆头）
    for (const sd of [-1, 1]) { const cx = L_ * 0.18, cy = -L_ * 0.1, cz = sd * L_ * 0.13, NP = lo ? 5 : 12, pts = [[L_ * 0.25, -L_ * 0.06, sd * L_ * 0.06]];
      for (let k = 0; k <= NP; k++) { const th = Math.PI * 0.15 + k / NP * Math.PI * 1.1, r = L_ * 0.055; pts.push([cx + Math.cos(th) * r * 1.2 - L_ * 0.02, cy - Math.sin(th) * r * 0.4 - L_ * 0.01, cz + sd * Math.sin(th) * r * 0.9]); }
      pts.push([L_ * 0.16, -L_ * 0.065, sd * L_ * 0.07]); parts.push(ecoFinT(pts, blk, 0.3, 0.04 * L_ / 7, lo)); }
    // 尾鳍：中间缺刻、尖端略后掠；背面黑、腹面浅灰
    const tx = -L_ / 2, fl = [];
    for (const sd of [1, -1]) { const side = [[tx - L_ * 0.03, 0, sd * 0.12], [tx - L_ * 0.06, 0, sd * L_ * 0.1], [tx - L_ * 0.085, 0, sd * L_ * 0.145], [tx - L_ * 0.105, 0, sd * L_ * 0.14], [tx - L_ * 0.1, 0, sd * L_ * 0.08], [tx - L_ * 0.085, 0, sd * 0.1]]; if (sd < 0) side.reverse(); fl.push(...side); }
    fl.splice(6, 0, [tx - L_ * 0.075, 0, 0]); fl.unshift([tx + 0.15, 0, 0]);
    parts.push(ecoFinT(fl, (x, y) => y < -0.003 ? gry.clone().lerp(wht, 0.5) : blk.clone(), tailAw(L_), 0.05 * L_ / 7, lo));
  } else {
    // 鲸鲨：宽扁的头、口在前端、深蓝灰底色布满白色斑点与横纹格；五对鳃裂、背部三道纵脊；尾鳍竖直（左右摆动）
    const L_ = o.len ?? 10, top = new THREE.Color(0x34465a), bel = new THREE.Color(0xd8dcd8), spot = new THREE.Color(0xe8ecea);
    const prof = (t) => { const k = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.02 + 0.1)), 0.6) * (1 - 0.75 * t * t); return [L_ * 0.075 * k, L_ * (t < 0.2 ? 0.11 : 0.09) * k]; };
    parts.push(ecoBody(L_, prof, (t, a) => {
      const s = Math.sin(a), cs = Math.cos(a);
      if (s < -0.35) return bel.clone();
      if (t < 0.03 && Math.abs(s) < 0.25) return new THREE.Color(0x1a1a1e);
      const c = top.clone(); if (lo) return c;
      // 鳃裂：头后两侧五道竖向深色细缝
      if (t > 0.17 && t < 0.27 && Math.abs(cs) > 0.55 && s > -0.35 && s < 0.35) { const g = (t - 0.17) / 0.02; if (g % 1 < 0.22) return new THREE.Color(0x141a22); }
      // 背部纵脊：正中与两侧各一道浅色细线
      if (t > 0.15 && t < 0.85 && (Math.abs(s - 1) < 0.004 || Math.abs(s - 0.8) < 0.012)) return c.lerp(spot, 0.45);
      // 白色斑点：体前部密而小（点阵），体后部为横纹之间的点
      // 斑点周期约 0.5 m（体前部）/ 0.8 m（体后部），每个周期至少 3～4 个顶点，避免顶点色混叠成大块
      const ti = t * (t < 0.25 ? 40 : 24), ai = a * (t < 0.25 ? 14 : 10);
      if (t > 0.25 && Math.abs(Math.sin(t * 24 * Math.PI)) < 0.12) return c.lerp(spot, 0.7);
      if (Math.sin(ti * Math.PI) * Math.sin(ai) > 0.6) return spot.clone();
      return c;
    }, seg, ring));
    if (!lo) for (const sd of [-1, 1]) { const p = ecoSurf(L_, prof, 0.06, sd > 0 ? 0.05 : Math.PI - 0.05, 0.99); parts.push(ecoKnob(p[0], p[1], p[2], 0.04, 0x08090a, 0.06)); }
    const tx = -L_ / 2;
    parts.push(ecoFinT([[tx + 0.3, 0, 0], [tx - L_ * 0.05, L_ * 0.1, 0], [tx - L_ * 0.1, L_ * 0.16, 0], [tx - L_ * 0.08, L_ * 0.06, 0], [tx - L_ * 0.06, 0, 0], [tx - L_ * 0.07, -L_ * 0.09, 0], [tx - L_ * 0.02, -L_ * 0.04, 0]], top, tailAw(L_), 0.07, lo));
    parts.push(ecoFinT([[-L_ * 0.04, L_ * 0.07, 0], [-L_ * 0.09, L_ * 0.12, 0], [-L_ * 0.12, L_ * 0.15, 0], [-L_ * 0.15, L_ * 0.12, 0], [-L_ * 0.2, L_ * 0.06, 0]], top, 0.6, 0.06, lo));
    for (const sd of [-1, 1]) parts.push(ecoFinT([[L_ * 0.18, -L_ * 0.05, sd * L_ * 0.07], [L_ * 0.1, -L_ * 0.065, sd * L_ * 0.17], [L_ * 0.02, -L_ * 0.07, sd * L_ * 0.25], [L_ * 0.06, -L_ * 0.06, sd * L_ * 0.15], [L_ * 0.1, -L_ * 0.05, sd * L_ * 0.08]], top, 0.3, 0.05, lo));
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
  pick() { for (let k = 0; k < 40; k++) { const a = ECO_R() * TAU, r = Math.sqrt(ECO_R()) * this.range, x = this.home.x + Math.cos(a) * r, z = this.home.z + Math.sin(a) * r; if (ecoWhaleOk(x, z, this.minFloor)) return { x, z }; } return { x: this.home.x, z: this.home.z }; }
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
      w.v = lerp(w.v, vWant, dt * 0.5);
      // 前方水太浅、离岸不足 10 m 或进入水闸口/峡谷/闸内港口（编队位置或两航点之间的直线可能跨过去）：不前进，原地转向；领头的换一个航点（P-017）。
      // 已经处在禁区里（例如被召唤挪过来时编队展开）的，只要不变浅、不更靠岸、不进闸内就允许游出来
      { const nx = w.x + Math.cos(w.yaw) * w.v * dt, nz = w.z - Math.sin(w.yaw) * w.v * dt, m = this.minFloor * 0.6;
        const ok = ecoWhaleOk(nx, nz, m) || (!ecoWhaleOk(w.x, w.z, m) && gh(nx, nz) < -m && ecoIn('ocean', nx, nz) && !ecoGateArea(nx, nz) && gh(nx, nz) <= gh(w.x, w.z) && ecoShoreDist(nx, nz, ECO_SHORE + 2) >= ecoShoreDist(w.x, w.z, ECO_SHORE + 2));
        if (ok) { w.x = nx; w.z = nz; } else { w.yaw += w.turn * dt * 3; w.v *= 0.9; if (i === 0) this.wt = 0; } }
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
