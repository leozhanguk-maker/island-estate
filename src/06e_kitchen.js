// ======================= 06e 厨房馆：别墅西侧的独立式现代厨房（连廊接别墅西门，与别墅共用一体化基座） =======================
// 设计意图：把油烟、气味、食材进出与后勤动线隔离在主楼之外；平屋顶、深挑檐、落地玻璃、木格栅，与别墅同一设计语言，体量更低、更安静。
// 按岛上实际场地对用户提示词做的调整：
//   - 别墅在厨房馆东侧，提示词里"西→东"的分区整体镜像为"东→西"：东端面向连廊是展示厨房，往西依次是中式热厨、后勤区，后勤院在最西侧；
//   - 西北紧邻高尔夫 4 号洞果岭 (146, -54)，西南是 5 号洞发球台 (152, -34)：馆体由 14 m 缩为 12 m，后勤院 8×6 m，连廊 3.75 m（馆东墙到别墅西墙）；
//   - 一体化基座：馆体、连廊、后勤院、南侧木平台同坐在一块石材基座上，顶面与别墅所在平台齐平（西侧地面低 1～2 m，四周为石材挡土墙），
//     室内地面与别墅首层同高，从别墅西门经连廊进厨房全程无高差；
//   - 岛上没有昼夜切换，提示词里的时间预设、面光源、调试面板不做；室内灯具用自发光材质（与别墅一致）。
// 局部坐标：x 向东（朝别墅）、z 向南、y 向上；原点在馆体中心、别墅首层结构面高度 y0 = 11.35（室内地面 +0.13）。
const KITCHEN = { x: L.kitchen.x, z: L.kitchen.z, y0: 11.35, hw: 6, hd: 4.5, fy: 0.13, ceil: 4.33, roof: 4.63 };
function kitchenTex(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), R = mulberry32(kind.length * 977 + 13);
  if (kind === 'teak' || kind === 'deck') {   // 柚木：纵向木纹（沿贴图 v 方向）；平台再加 12.5 cm 宽的板缝
    g.fillStyle = '#9a6b45'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i++) { const x = R() * 256, a = 0.05 + R() * 0.16; g.strokeStyle = R() < 0.5 ? `rgba(70,42,22,${a})` : `rgba(190,140,95,${a})`; g.lineWidth = 0.6 + R() * 2.2; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 256; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 2.5, y); g.stroke(); }
    if (kind === 'deck') { g.fillStyle = 'rgba(40,24,12,0.75)'; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 2, 256); for (let k = 0; k < 8; k++) g.fillRect(k * 32, (k * 97) % 256, 32, 2); }
  } else if (kind === 'terrazzo') {           // 浅灰水磨石：随机彩色碎粒（一张贴图 1 m）
    g.fillStyle = '#cfcfcb'; g.fillRect(0, 0, 256, 256);
    const cols = ['#8d8f8c', '#f2f0ea', '#a88f76', '#6f7a80', '#b9a48a', '#e1dcd2', '#5d5f5c'];
    for (let i = 0; i < 1400; i++) { g.fillStyle = cols[Math.floor(R() * cols.length)]; const r = 0.6 + R() * R() * 3.2; g.beginPath(); g.ellipse(R() * 256, R() * 256, r, r * (0.6 + R() * 0.4), R() * 3, 0, TAU); g.fill(); }
  } else if (kind === 'tile') {               // 白色小方砖：10 cm 见方、灰色砖缝（一张贴图 1 m）
    g.fillStyle = '#b9bcbc'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) { const v = 243 + Math.floor(R() * 8); g.fillStyle = `rgb(${v},${v},${v - 2})`; g.fillRect(x * 25.6 + 1.2, y * 25.6 + 1.2, 23.2, 23.2); }
  } else if (kind === 'slab') {               // 白色岩板：灰色细纹
    g.fillStyle = '#f3f2ef'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(120,122,126,${0.08 + R() * 0.18})`; g.lineWidth = 0.5 + R() * 1.2; g.beginPath(); let x = R() * 256, y = 0; g.moveTo(x, y); while (y < 256) { x += (R() - 0.5) * 18; y += 8 + R() * 14; g.lineTo(x, y); } g.stroke(); }
  } else if (kind === 'paver') {              // 基座石材铺装：60 cm 见方、浅灰、细缝（一张贴图 1.2 m）
    g.fillStyle = '#9a9892'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const v = 196 + Math.floor(R() * 14); g.fillStyle = `rgb(${v},${v - 2},${v - 7})`; g.fillRect(x * 128 + 1.5, y * 128 + 1.5, 125, 125); }
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '120,118,112' : '235,232,226'},0.25)`; g.fillRect(R() * 256, R() * 256, 1.5, 1.5); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
let KM = null;   // 厨房馆材质（首次建造时创建，不改动全局共享材质）
function kitchenMats() {
  if (KM) return KM;
  const tex = (k) => kitchenTex(k);
  KM = {
    wall: std(0xede9e3, 0.85),                                          // 外墙：暖白微水泥
    frame: std(0x2b2b2b, 0.4, 0.6),                                     // 窗框、屋面封边：深灰金属
    teak: new THREE.MeshStandardMaterial({ map: tex('teak'), roughness: 0.7 }),
    deck: new THREE.MeshStandardMaterial({ map: tex('deck'), roughness: 0.75 }),
    terrazzo: new THREE.MeshStandardMaterial({ map: tex('terrazzo'), roughness: 0.55 }),
    tile: new THREE.MeshStandardMaterial({ map: tex('tile'), roughness: 0.35 }),
    slab: new THREE.MeshStandardMaterial({ map: tex('slab'), roughness: 0.3 }),
    paver: new THREE.MeshStandardMaterial({ map: tex('paver'), roughness: 0.9 }),
    cab: std(0x5a5e5c, 0.9),                                            // 柜体：烟灰色哑光
    steel: std(0xc3c7c9, 0.35, 1.0, { envMapIntensity: 1.2 }),          // 拉丝不锈钢
    panel: std(0xf2f3f1, 0.55),                                         // 冷库保温板
    stone: std(0xb9b4aa, 0.9),                                          // 基座挡土墙石材
    corten: std(0x8a4a24, 0.85, 0.3),                                   // 耐候钢种植箱
    herb: std(0x55803a, 0.9), blackGlass: std(0x0d0f11, 0.1, 0.4),
    wine: std(0x3a2418, 0.2, 0, { emissive: 0xffb070, emissiveIntensity: 0.9 }),   // 酒柜发光玻璃门
    strip: std(0xffffff, 0.5, 0, { emissive: 0xffe2b8, emissiveIntensity: 1.8 }),   // 暖光灯带、灯串、地埋灯
    flame: std(0x2a6cff, 0.4, 0, { emissive: 0x3a6cff, emissiveIntensity: 1.2 }),
  };
  return KM;
}
// 面板：贴图按实际尺寸平铺（tile 米一张）；几何体各自独立（不共用 BOXG）
function kPanel(p, w, h, mat, x, y, z, rx, ry, tile = 1) {
  const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile);
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); p.add(m); return m;
}
function buildKitchen() {
  const K = new THREE.Group(), Y0 = KITCHEN.y0, FY = KITCHEN.fy, CEIL = KITCHEN.ceil, ROOF = KITCHEN.roof, KX = KITCHEN.x, KZ = KITCHEN.z, T = kitchenMats();
  const wx = (x) => KX + x, wz = (z) => KZ + z, toW = (x, z) => [wx(x), wz(z)];
  const walk = (x0, x1, z0, z1, y) => COLL.walks.push({ kind: 'rect', x: wx((x0 + x1) / 2), z: wz((z0 + z1) / 2), hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, rot: 0, y: Y0 + y });
  const rect = (x0, x1, z0, z1, top = 3) => collR(wx((x0 + x1) / 2), wz((z0 + z1) / 2), (x1 - x0) / 2, (z1 - z0) / 2, 0, Y0 + top, Y0 - 0.5);
  const band = [Y0 - 0.3, Y0 + CEIL - 0.1];
  // ---- 墙段：沿边线按 [起, 止, 类型, 门洞高, 门洞以上类型, 材质] 生成 ----
  // 类型 w 实墙、g 通高玻璃（深灰框、竖梃间距 ≤1.5 m）、c 实墙顶部 0.6 m 通长高侧窗、o 门洞（门洞以上按第 5 项为 w 或 g）
  const run = (axis, fixed, runs, th = 0.25) => {
    for (const [a0, a1, t, dh = 2.7, over = 'w', mat = T.wall] of runs) {
      const len = a1 - a0, mid = (a0 + a1) / 2;
      const B = (w, h, y, m, dd = th, at = mid) => axis === 'x' ? box(K, w, h, dd, m, at, y, fixed) : box(K, dd, h, w, m, fixed, y, at);
      const seg = () => { const [ax, az, bx, bz] = axis === 'x' ? [a0, fixed, a1, fixed] : [fixed, a0, fixed, a1]; collS(wx(ax), wz(az), wx(bx), wz(bz), band[0], band[1]); };
      const glass = (y0, y1) => {
        B(len, y1 - y0, (y0 + y1) / 2, M.glassClear, 0.03);
        B(len, 0.06, y0 + 0.03, T.frame, 0.12); B(len, 0.06, y1 - 0.03, T.frame, 0.12);
        const n = Math.max(1, Math.ceil(len / 1.5 - 1e-6)); for (let i = 0; i <= n; i++) B(0.05, y1 - y0, (y0 + y1) / 2, T.frame, 0.12, a0 + i * len / n);
      };
      if (t === 'w') { B(len, CEIL, CEIL / 2, mat); seg(); }
      else if (t === 'g') { B(len, FY - 0.005, (FY - 0.005) / 2, T.wall); glass(FY, CEIL); seg(); }   // 窗台比室内地面低 5 mm（不与地面共面）
      else if (t === 'c') { B(len, CEIL - 0.6, (CEIL - 0.6) / 2, mat); glass(CEIL - 0.6, CEIL); seg(); }
      else if (t === 'o') { const y1 = FY + dh; if (over === 'g') { B(len, 0.1, y1 + 0.05, T.frame, 0.12); glass(y1 + 0.1, CEIL); } else B(len, CEIL - y1, (y1 + CEIL) / 2, mat); }
    }
  };
  // ---------------- 一体化基座：石材铺装 + 挡土墙（与别墅平台齐平，顶面 y = -0.02） ----------------
  const PADS = L.kitchen.pads.map(([x0, z0, x1, z1]) => [x0 - KX, x1 - KX, z0 - KZ, z1 - KZ]);
  const PT = -0.02;
  for (const [x0, x1, z0, z1] of PADS) {
    box(K, x1 - x0, 0.3, z1 - z0, T.stone, (x0 + x1) / 2, PT - 0.16, (z0 + z1) / 2);
    kPanel(K, x1 - x0, z1 - z0, T.paver, (x0 + x1) / 2, PT, (z0 + z1) / 2, -Math.PI / 2, 0, 1.2);
    walk(x0, x1, z0, z1, PT);
  }
  // 挡土墙：沿基座外轮廓，墙底埋入地面 0.3 m；人在地面上不能从墙下钻进基座（高度带只拦基座顶面以下 0.55 m 的人）
  const [A, B] = PADS, edges = [
    [A[0], A[2], A[1], A[2]], [A[1], A[2], A[1], A[3]], [A[1], A[3], A[0], A[3]], [A[0], A[3], A[0], B[3]], [A[0], B[2], A[0], A[2]],
    [B[0], B[2], A[0], B[2]], [B[0], B[3], B[0], B[2]], [A[0], B[3], B[0], B[3]],
  ];
  for (const [ax, az, bx, bz] of edges) {
    const len = Math.hypot(bx - ax, bz - az); if (len < 0.05) continue;
    let gmin = 1e9; for (let i = 0; i <= 8; i++) gmin = Math.min(gmin, gh(wx(ax + (bx - ax) * i / 8), wz(az + (bz - az) * i / 8)) - Y0);
    const yb = Math.min(gmin - 0.3, PT - 0.3), h = PT - 0.01 - yb, horiz = Math.abs(bz - az) < 1e-6;
    const nx = horiz ? 0 : Math.sign(ax - (A[0] + A[1]) / 2) * 0.15, nz = horiz ? Math.sign(az - (A[2] + A[3]) / 2) * 0.15 : 0;   // 墙厚 0.3，外皮与基座边齐平
    box(K, horiz ? len + 0.3 : 0.3, h, horiz ? 0.3 : len + 0.3, T.stone, (ax + bx) / 2 - nx, yb + h / 2, (az + bz) / 2 - nz);
    box(K, horiz ? len + 0.34 : 0.34, 0.06, horiz ? 0.34 : len + 0.34, T.frame, (ax + bx) / 2 - nx, PT - 0.035, (az + bz) / 2 - nz);   // 深灰压顶线
    if (gmin < PT - 0.5) collS(wx(ax), wz(az), wx(bx), wz(bz), -1e9, Y0 + PT - 0.55);
  }
  // ---------------- 馆体：楼板、外墙、屋面 ----------------
  const HW = KITCHEN.hw, HD = KITCHEN.hd;
  box(K, HW * 2 + 0.24, 0.095, HD * 2 + 0.24, M.concrete, 0, 0.0525, 0);                     // 结构楼板（顶面 0.10，低于热厨下沉地面 0.11；底面比墙底高 5 mm、四边比外墙外皮缩进 5 mm，都不共面）
  // 三个分区的可行走面在隔墙、门槛处相互搭接（边界上不留缝，否则过门时会掉到基座高度）
  kPanel(K, 5, 8.75, T.terrazzo, 3.5, FY, 0, -Math.PI / 2, 0, 1); walk(0.95, HW + 0.2, -HD, HD, FY);           // 展示厨房：水磨石
  kPanel(K, 4, 8.75, T.terrazzo, -1, FY - 0.02, 0, -Math.PI / 2, 0, 1); walk(-3.05, 1.05, -HD, HD, FY - 0.02);   // 中式热厨：地面低 2 cm
  kPanel(K, 3, 8.75, T.terrazzo, -4.5, FY, 0, -Math.PI / 2, 0, 1); walk(-HW - 0.2, -2.95, -HD, HD, FY);        // 后勤区
  // 北立面：实墙 + 顶部 0.6 m 通长高侧窗（采光、热厨排热）
  run('x', -HD, [[-HW - 0.125, HW + 0.125, 'c']]);
  // 南立面：东半段（展示厨房）通高玻璃；西半段（热厨、后勤）实墙外挂竖向木格栅
  run('x', HD, [[-HW - 0.125, 0, 'w'], [0, 4.8, 'g'], [4.8, 6.0, 'o', 2.7, 'g']]);   // 东端 1.2 m 玻璃门通南侧户外餐台（转角由东立面玻璃收口）
  box(K, 1.15, 2.66, 0.03, M.glassClear, 4.2, FY + 1.35, HD - 0.1); box(K, 0.05, 2.7, 0.06, T.frame, 4.78, FY + 1.35, HD - 0.1);   // 推拉门扇（开启，收在西侧玻璃内侧）
  for (let x = -HW + 0.05; x < -0.02; x += 0.12) box(K, 0.04, CEIL - 0.1, 0.12, T.teak, x, CEIL / 2 + 0.03, HD + 0.2);   // 格栅条 0.04×0.12、净距 0.08
  box(K, HW + 0.1, 0.06, 0.08, T.frame, -HW / 2, CEIL - 0.02, HD + 0.2); box(K, HW + 0.1, 0.06, 0.08, T.frame, -HW / 2, 0.16, HD + 0.2);
  // 东立面（面向连廊）：通高落地玻璃，中间 2.4 m 双扇推拉入口（开启状态，门扇收在两侧玻璃内侧）
  run('z', HW, [[-HD, -1.2, 'g'], [-1.2, 1.2, 'o', 2.7, 'g'], [1.2, HD, 'g']]);
  for (const s of [-1, 1]) { box(K, 0.03, 2.66, 1.2, M.glassClear, HW - 0.1, FY + 1.35, s * 1.85); box(K, 0.06, 2.7, 0.05, T.frame, HW - 0.1, FY + 1.35, s * 1.25); box(K, 0.06, 0.05, 1.2, T.frame, HW - 0.1, FY + 2.68, s * 1.85); }
  // 西立面：实墙，1.2 m 后勤门通后勤院（门扇开启贴在墙外）
  run('z', -HW, [[-HD, 2.3, 'w'], [2.3, 3.5, 'o', 2.3], [3.5, HD, 'w']]);
  box(K, 1.15, 2.25, 0.05, T.steel, -HW - 0.125 - 0.6, FY + 1.13, 2.27); collS(wx(-HW - 0.125), wz(2.27), wx(-HW - 0.125 - 1.2), wz(2.27), band[0], band[1]);   // 门扇向外开 90°，贴在门洞北侧
  // 屋面：挑檐南 1.8 / 东 1.2 / 北、西 0.6；展示厨房上方 1 m × 6 m 线性天窗；深灰金属封边
  const RX0 = -HW - 0.6, RX1 = HW + 1.2, RZ0 = -HD - 0.6, RZ1 = HD + 1.8, SK = [3.0, 4.0, -3, 3];
  for (const [a0, a1, b0, b1] of [[RX0, RX1, RZ0, SK[2]], [RX0, RX1, SK[3], RZ1], [RX0, SK[0], SK[2], SK[3]], [SK[1], RX1, SK[2], SK[3]]]) box(K, a1 - a0, ROOF - CEIL, b1 - b0, M.concrete, (a0 + a1) / 2, (CEIL + ROOF) / 2, (b0 + b1) / 2);
  box(K, SK[1] - SK[0], 0.04, SK[3] - SK[2], M.glassLight, (SK[0] + SK[1]) / 2, ROOF + 0.1, 0);
  for (const s of [-1, 1]) { box(K, SK[1] - SK[0] + 0.1, 0.16, 0.05, T.frame, (SK[0] + SK[1]) / 2, ROOF + 0.05, s * 3.02); box(K, 0.05, 0.16, 6.1, T.frame, SK[0] - 0.02 + (s > 0 ? SK[1] - SK[0] + 0.04 : 0), ROOF + 0.05, 0); }
  for (const [w, d, x, z] of [[RX1 - RX0 + 0.06, 0.03, (RX0 + RX1) / 2, RZ0 - 0.015], [RX1 - RX0 + 0.06, 0.03, (RX0 + RX1) / 2, RZ1 + 0.015], [0.03, RZ1 - RZ0, RX0 - 0.015, (RZ0 + RZ1) / 2], [0.03, RZ1 - RZ0, RX1 + 0.015, (RZ0 + RZ1) / 2]]) box(K, w, ROOF - CEIL + 0.06, d, T.frame, x, (CEIL + ROOF) / 2, z);
  // 吊顶（天窗处开洞）与暖光灯带
  for (const [a0, a1, b0, b1] of [[-HW, HW, -HD, SK[2]], [-HW, HW, SK[3], HD], [-HW, SK[0], SK[2], SK[3]], [SK[1], HW, SK[2], SK[3]]]) kPanel(K, a1 - a0, b1 - b0, M.ceiling, (a0 + a1) / 2, CEIL - 0.01, (b0 + b1) / 2, Math.PI / 2, 0);
  for (const s of [-1, 1]) box(K, 0.08, CEIL - ROOF + 0.3 + 0.01, 6, M.ceiling, (s < 0 ? SK[0] : SK[1]) - s * 0.04, CEIL + 0.15, 0);
  for (const [x, z, len] of [[-1, 2.6, 3.4], [-4.5, -3, 2.4], [-4.5, 2.9, 2.4]]) box(K, len, 0.03, 0.2, M.lamp, x, CEIL - 0.03, z);
  // ---------------- A. 展示厨房 / 西厨（x 1 → 6） ----------------
  // 北墙通长高柜（烟灰哑光）：双烤箱、蒸箱、发光玻璃门酒柜
  box(K, 4.4, 2.6, 0.62, T.cab, 3.6, FY + 1.3, -HD + 0.125 + 0.31);
  for (let i = 1; i < 7; i++) box(K, 0.008, 2.56, 0.01, std(0x3f4241, 0.9), 1.4 + i * 4.4 / 7, FY + 1.3, -HD + 0.125 + 0.625);
  for (const [x, y, h] of [[1.95, 0.95, 0.56], [1.95, 1.55, 0.56], [2.6, 1.25, 0.45]]) { box(K, 0.58, h, 0.02, T.blackGlass, x, FY + y, -HD + 0.75); box(K, 0.5, 0.025, 0.035, T.steel, x, FY + y + h / 2 - 0.06, -HD + 0.77); }
  box(K, 0.62, 1.9, 0.02, T.wine, 5.1, FY + 1.2, -HD + 0.75); for (let k = 0; k < 6; k++) box(K, 0.56, 0.012, 0.01, T.steel, 5.1, FY + 0.4 + k * 0.3, -HD + 0.765);
  box(K, 4.4, 1.0, 0.02, T.blackGlass, 3.6, FY + 3.1, -HD + 0.14);   // 高柜上方深色玻璃背板（到高侧窗窗台为止）
  rect(1.35, 5.85, -HD, -HD + 0.8);
  // 中岛 3.6×1.2×0.92：白色岩板台面厚 6 cm，南侧悬挑 0.35 m 作吧台，配 4 把高脚凳
  { const ix = 3.3, iz = -0.95;
    box(K, 3.4, 0.86, 1.0, T.cab, ix, FY + 0.43, iz);
    box(K, 3.6, 0.06, 1.55, T.slab, ix, FY + 0.89, iz + 0.175);
    box(K, 0.7, 0.02, 0.42, T.steel, ix - 0.8, FY + 0.93, iz - 0.1); { const f = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 12, Math.PI), T.steel); f.position.set(ix - 0.8, FY + 1.07, iz - 0.38); K.add(f); cyl(K, 0.012, 0.012, 0.16, T.steel, ix - 0.93, FY + 1.0, iz - 0.38, 6); }
    for (const x of [ix - 1.2, ix - 0.4, ix + 0.4, ix + 1.2]) { cyl(K, 0.19, 0.19, 0.06, M.cushionDark, x, FY + 0.78, 0.35, 12); cyl(K, 0.02, 0.02, 0.72, T.steel, x, FY + 0.39, 0.35, 6); cyl(K, 0.18, 0.18, 0.02, T.steel, x, FY + 0.01, 0.35, 12); addSeat(wx(x), Y0 + FY + 0.81, wz(0.35), 0); }
    rect(ix - 1.8, ix + 1.8, iz - 0.5, iz + 0.95);
    // 3 m 线性吊灯
    box(K, 3.0, 0.05, 0.1, T.frame, ix, FY + 2.75, iz); box(K, 2.9, 0.012, 0.07, T.strip, ix, FY + 2.72, iz);
    for (const s of [-1, 1]) cyl(K, 0.004, 0.004, CEIL - FY - 2.78, T.frame, ix + s * 1.3, (FY + 2.78 + CEIL) / 2, iz, 4); }
  // 靠南侧玻璃的 6 人餐桌
  tableF(K, 3.5, FY, 3.0, 0, 2.2, 0.95, 0.76, T.teak, T.frame);
  for (const x of [2.8, 3.5, 4.2]) { chair(K, x, FY - 0.03, 2.3, 0); chair(K, x, FY - 0.03, 3.7, Math.PI); addSeat(wx(x), Y0 + FY + 0.45, wz(2.3), Math.PI); addSeat(wx(x), Y0 + FY + 0.45, wz(3.7), 0); }
  box(K, 1.4, 0.03, 0.3, T.teak, 3.5, FY + 0.775, 3.0); for (const x of [3.0, 3.5, 4.0]) cyl(K, 0.05, 0.04, 0.14, M.white, x, FY + 0.86, 3.0, 10);
  rect(2.3, 4.7, 2.0, 4.0);
  // ---------------- 玻璃隔断（x = 1）：钢框玻璃 + 推拉门，隔油烟、视线通透 ----------------
  run('z', 1, [[-HD, 1.0, 'g'], [1.0, 2.2, 'o', 2.5, 'g'], [2.2, HD, 'g']], 0.08);   // 推拉门在中岛南侧（中岛西端离隔断只有 0.5 m）
  box(K, 0.03, 2.45, 1.2, M.glassClear, 1.08, FY + 1.25, 2.8); box(K, 0.05, 2.5, 0.05, T.frame, 1.08, FY + 1.25, 2.22);   // 推拉门扇（开启，收在隔断东侧）
  // ---------------- B. 中式热厨（x -3 → 1） ----------------
  const HF = FY - 0.02, NZ = -HD + 0.125;
  kPanel(K, 4, 2.2, T.tile, -1, HF + 1.1, NZ + 0.005, 0, 0, 1);                               // 北墙白色小方砖
  // 北墙一排：双头猛火灶、炖汤灶、蒸柜
  box(K, 1.5, 0.8, 0.75, T.steel, -2.2, HF + 0.4, NZ + 0.375);
  for (const x of [-2.55, -1.85]) { cyl(K, 0.2, 0.2, 0.03, M.dark, x, HF + 0.815, NZ + 0.4, 16); cyl(K, 0.08, 0.08, 0.01, T.flame, x, HF + 0.835, NZ + 0.4, 12); const wok = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, TAU, Math.PI * 0.62, Math.PI * 0.38), M.dark); wok.position.set(x, HF + 1.15, NZ + 0.4); K.add(wok); }
  box(K, 0.8, 0.5, 0.75, T.steel, -1.0, HF + 0.25, NZ + 0.375); cyl(K, 0.26, 0.26, 0.45, T.steel, -1.0, HF + 0.73, NZ + 0.4, 18); cyl(K, 0.27, 0.27, 0.03, T.steel, -1.0, HF + 0.97, NZ + 0.4, 18);
  box(K, 1.0, 1.8, 0.75, T.steel, 0.3, HF + 0.9, NZ + 0.375); for (let k = 0; k < 3; k++) { box(K, 0.9, 0.5, 0.01, std(0xa9adb0, 0.3, 1), 0.3, HF + 0.35 + k * 0.58, NZ + 0.755); box(K, 0.3, 0.03, 0.04, M.dark, 0.3, HF + 0.55 + k * 0.58, NZ + 0.77); }
  rect(-3, 0.85, -HD, NZ + 0.8);
  // 4 m 商用排烟罩（梯形截面：下口进深 1.2 m、上口 0.7 m），接屋顶烟囱
  { const hg = new THREE.BoxGeometry(3.9, 0.7, 1.2), p = hg.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0 && p.getZ(i) > 0) p.setZ(i, 0.6 - 0.5); hg.computeVertexNormals();
    const hood = new THREE.Mesh(hg, T.steel); hood.position.set(-1, HF + 2.45, NZ + 0.6); K.add(hood);
    box(K, 3.85, 0.04, 1.15, std(0x7d8185, 0.5, 0.9), -1, HF + 2.07, NZ + 0.6);   // 油网（比罩口低 1 cm，不共面）
    box(K, 0.55, CEIL - (HF + 2.8), 0.55, T.steel, -1, (HF + 2.8 + CEIL) / 2, NZ + 0.45); }
  // 中间不锈钢操作台、地面线性排水沟
  box(K, 2.4, 0.86, 0.8, T.steel, -1, HF + 0.43, 0.6); box(K, 2.3, 0.03, 0.7, T.steel, -1, HF + 0.2, 0.6); rect(-2.2, 0.2, 0.2, 1.0);
  box(K, 3.9, 0.012, 0.14, T.steel, -1, HF + 0.006, 2.0); for (let i = 0; i < 26; i++) box(K, 0.01, 0.004, 0.12, M.dark, -2.9 + i * 0.15, HF + 0.013, 2.0);
  // ---------------- C. 后勤区（x -6 → -3）：北干货储藏、中冷库、南洗碗间；后勤门朝西直通后勤院 ----------------
  run('z', -3, [[-HD, -2.6, 'w'], [-2.6, -1.7, 'o', 2.3], [-1.7, -1.5, 'w'], [-1.5, 1.3, 'w', 2.7, 'w', T.panel], [1.3, 2.0, 'w'], [2.0, 3.6, 'o', 2.3], [3.6, HD, 'w']], 0.15);
  run('x', -1.5, [[-HW, -3, 'w', 2.7, 'w', T.panel]], 0.15); run('x', 1.3, [[-HW, -3, 'w', 2.7, 'w', T.panel]], 0.15);
  rect(-HW, -3, -1.5, 1.3);   // 冷库（不可进入）
  box(K, 0.04, 2.1, 1.0, T.steel, -2.905, FY + 1.05, -0.1); box(K, 0.06, 0.5, 0.05, M.dark, -2.87, FY + 1.1, 0.3); box(K, 0.02, 0.1, 0.3, std(0x1e2a33, 0.3, 0, { emissive: 0x2a7fd0, emissiveIntensity: 0.8 }), -2.9, FY + 1.75, -0.35);   // 冷库不锈钢门、把手、温度屏
  // 干货储藏间：开放式金属层架（北墙、西墙），摆满罐、袋、瓶
  { const R = mulberry32(6060), cols = [0xc9302c, 0xe8b64a, 0xf1ede4, 0x6a8f3a, 0x8a5a3a, 0x2e4a6a, 0xd87a2a, 0xeee2c8];
    const shelfRun = (x0, x1, z0, z1) => {
      const along = x1 - x0 > z1 - z0, len = along ? x1 - x0 : z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, dep = along ? z1 - z0 : x1 - x0;
      for (const [s, t] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) box(K, 0.035, 2.0, 0.035, T.steel, along ? cx + s * (len / 2 - 0.02) : cx + t * (dep / 2 - 0.02), FY + 1.0, along ? cz + t * (dep / 2 - 0.02) : cz + s * (len / 2 - 0.02));
      for (let k = 0; k < 5; k++) {
        const y = FY + 0.12 + k * 0.45; box(K, along ? len : dep, 0.025, along ? dep : len, T.steel, cx, y, cz);
        if (k === 4) break;
        for (let u = -len / 2 + 0.1; u < len / 2 - 0.1; u += 0.14 + R() * 0.08) {
          const c = std(cols[Math.floor(R() * cols.length)], 0.7), r = R(), px = along ? cx + u : cx + (R() - 0.5) * dep * 0.4, pz = along ? cz + (R() - 0.5) * dep * 0.4 : cz + u;
          if (r < 0.4) cyl(K, 0.055, 0.055, 0.18, c, px, y + 0.1, pz, 10);                                  // 罐
          else if (r < 0.75) box(K, 0.16, 0.26, 0.11, c, px, y + 0.14, pz, R() * 0.4);                      // 米、面粉袋
          else { cyl(K, 0.035, 0.035, 0.24, c, px, y + 0.13, pz, 8); cyl(K, 0.012, 0.018, 0.05, c, px, y + 0.27, pz, 6); }   // 油、酱油瓶
        }
      }
      rect(x0, x1, z0, z1, 2.4);
    };
    shelfRun(-5.8, -3.2, -HD + 0.14, -HD + 0.6); shelfRun(-5.86, -5.4, -3.8, -1.7); }
  // 洗碗间：双槽水池、商用洗碗机
  box(K, 1.8, 0.86, 0.7, T.steel, -4.3, FY + 0.43, HD - 0.5); for (const x of [-4.75, -3.85]) box(K, 0.7, 0.02, 0.5, M.dark, x, FY + 0.87, HD - 0.5);
  cyl(K, 0.015, 0.015, 0.35, T.steel, -4.3, FY + 1.05, HD - 0.8, 6); rect(-5.2, -3.4, HD - 0.85, HD);
  box(K, 0.75, 1.5, 0.75, T.steel, -5.3, FY + 0.75, 1.9); box(K, 0.7, 0.02, 0.02, M.dark, -5.3, FY + 0.95, 2.28); rect(-5.68, -4.92, 1.35, 2.28);
  // ---------------- 屋顶：不锈钢排烟烟囱（0.8×0.8、出屋面 2.2 m、防雨帽）；西北角设备平台 + 1.2 m 木格栅遮挡 ----------------
  box(K, 0.8, 2.2, 0.8, T.steel, -1, ROOF + 1.1, NZ + 0.45);
  for (const [a, b] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) box(K, 0.04, 0.3, 0.04, T.steel, -1 + a * 0.36, ROOF + 2.35, NZ + 0.45 + b * 0.36);
  { const cap = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.3, 4), T.steel); cap.rotation.y = Math.PI / 4; cap.position.set(-1, ROOF + 2.65, NZ + 0.45); K.add(cap); }
  { const P = [-5.9, -3.1, -4.9, -2.3];   // 设备平台范围 x0 x1 z0 z1
    box(K, P[1] - P[0], 0.1, P[3] - P[2], T.frame, (P[0] + P[1]) / 2, ROOF + 0.05, (P[2] + P[3]) / 2);
    box(K, 1.0, 0.8, 0.45, M.pw, -5.2, ROOF + 0.5, -4.35); cyl(K, 0.28, 0.28, 0.02, M.dark, -5.2, ROOF + 0.55, -4.12, 16, Math.PI / 2);   // 空调外机
    box(K, 1.0, 0.8, 0.45, M.pw, -4.0, ROOF + 0.5, -4.35); cyl(K, 0.28, 0.28, 0.02, M.dark, -4.0, ROOF + 0.55, -4.12, 16, Math.PI / 2);
    box(K, 0.9, 0.5, 0.9, M.metalMid, -4.6, ROOF + 0.35, -3.05); cyl(K, 0.36, 0.36, 0.08, M.dark, -4.6, ROOF + 0.64, -3.05, 16);   // 排风机
    for (const [x0, z0, x1, z1] of [[P[0], P[2], P[1], P[2]], [P[0], P[3], P[1], P[3]], [P[0], P[2], P[0], P[3]], [P[1], P[2], P[1], P[3]]]) {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 0.12);
      for (let i = 0; i <= n; i++) { const t = i / n; box(K, 0.04, 1.2, 0.12, T.teak, x0 + (x1 - x0) * t, ROOF + 0.7, z0 + (z1 - z0) * t, z0 === z1 ? 0 : Math.PI / 2); }
    } }
  // ---------------- 连廊（馆东墙 → 别墅西门）：超薄平板雨棚 0.15 m + 两排 0.1 m 方钢柱；浅灰石材铺装高出基座 0.15 m ----------------
  { const CX0 = HW + 0.125, CX1 = 180 - 11.125 - KX, CW = 1.5;
    box(K, CX1 - CX0, 0.14, CW * 2, M.stone, (CX0 + CX1) / 2, PT + 0.07, 0); kPanel(K, CX1 - CX0, CW * 2, T.paver, (CX0 + CX1) / 2, FY, 0, -Math.PI / 2, 0, 1.2);
    walk(CX0 - 0.1, CX1 + 0.35, -CW, CW, FY);   // 两端伸进馆东门与别墅西门门槛（别墅首层可行走面从墙内皮起算）
    box(K, CX1 - CX0 + 0.1, 0.15, CW * 2 + 0.2, T.frame, (CX0 + CX1) / 2, 3.125, 0); box(K, CX1 - CX0, 0.02, CW * 2, M.ceiling, (CX0 + CX1) / 2, 3.04, 0);
    for (const x of [CX0 + 1.0, CX0 + 2.8]) for (const s of [-1, 1]) { box(K, 0.1, 3.05 - FY, 0.1, T.frame, x, (FY + 3.05) / 2, s * (CW - 0.05)); collC(wx(x), wz(s * (CW - 0.05)), 0.08); }
    for (let x = CX0 + 0.5; x < CX1; x += 0.9) for (const s of [-1, 1]) cyl(K, 0.05, 0.05, 0.012, T.strip, x, FY + 0.006, s * (CW - 0.25), 10);   // 地埋灯（发光圆片）
    // 连廊两侧：人不能从雨棚柱外侧跨上铺装以外（铺装只高出基座 0.15 m，可以直接走上去，不设栏杆）
  }
  // ---------------- 后勤院（馆体西侧南段 8×6 m）：2.8 m 竖向木格栅围合、燃气瓶柜、分类垃圾桶组、西侧独立后勤出入口 ----------------
  { const X0 = B[0], X1 = -HW - 0.125, Z0 = B[2], Z1 = B[3], GH = 2.8, gate = [0.9, 2.1];
    const screen = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / 0.12), vert = ax === bx;
      for (let i = 0; i <= n; i++) { const t = i / n; box(K, vert ? 0.12 : 0.04, GH, vert ? 0.04 : 0.12, T.teak, ax + (bx - ax) * t, PT + GH / 2, az + (bz - az) * t); }
      for (const y of [0.25, GH - 0.25]) box(K, vert ? 0.05 : len, 0.06, vert ? len : 0.05, T.frame, (ax + bx) / 2 + (vert ? 0.09 : 0), PT + y, (az + bz) / 2 + (vert ? 0 : Math.sign(az) * 0.09));
      collS(wx(ax), wz(az), wx(bx), wz(bz), Y0 - 1.5, Y0 + GH);
    };
    screen(X0, Z0 + 0.06, X1 - 0.05, Z0 + 0.06); screen(X0, Z1 - 0.08, X1 - 0.05, Z1 - 0.08);   // 格栅端头离馆体西墙 5 cm、南侧格栅外皮比西墙端面缩进 2 cm（不共面）
    screen(X0 + 0.06, Z0, X0 + 0.06, gate[0]); screen(X0 + 0.06, gate[1], X0 + 0.06, Z1);
    for (const z of gate) box(K, 0.1, GH + 0.1, 0.1, T.frame, X0 + 0.06, PT + (GH + 0.1) / 2, z);
    // 燃气瓶柜（百叶不锈钢柜）与分类垃圾桶组（厨余绿、可回收蓝、其他灰、有害红）
    box(K, 1.6, 1.4, 0.6, T.steel, -11.6, PT + 0.7, Z0 + 0.45); for (let k = 0; k < 8; k++) box(K, 1.5, 0.02, 0.02, M.dark, -11.6, PT + 0.3 + k * 0.13, Z0 + 0.76); rect(-12.45, -10.75, Z0, Z0 + 0.8, 2);
    [0x2f7d4f, 0x2e5e9e, 0x6c737a, 0xc9302c].forEach((c, i) => { const x = -9.6 + i * 0.72; box(K, 0.62, 0.95, 0.62, std(c, 0.6), x, PT + 0.475, Z0 + 0.45); box(K, 0.66, 0.05, 0.66, std(c, 0.5), x, PT + 0.97, Z0 + 0.45); });
    rect(-9.95, -7.2, Z0, Z0 + 0.8, 2);
    // 西侧后勤出入口：下到场地的石阶（食材进、垃圾出都走这里，与连廊完全不交叉）
    const SG = new THREE.Group(); SG.position.set(X0, 0, (gate[0] + gate[1]) / 2); SG.rotation.y = Math.PI / 2; K.add(SG);
    const toS = (lx, lz) => [wx(X0 + lz), wz((gate[0] + gate[1]) / 2 - lx)];
    const gy = Math.min(gh(wx(X0 - 3.6), wz(gate[0])), gh(wx(X0 - 3.6), wz(gate[1]))) - Y0, run2 = Math.max(1.2, Math.round((PT - gy) / 0.17) * 0.3);
    stairs(SG, toS, Y0, 0, -run2, 0, gy, PT, 1.2, { solid: true, mat: T.stone, railMat: T.frame });
  }
  // ---------------- 南侧户外餐台：柚木平台 12×4 m、5 m 实木长餐桌 + 10 把椅子、钢木格栅廊架、耐候钢香草种植箱 ----------------
  { const Z0 = HD + 0.125, Z1 = A[3], DY = 0.1;
    box(K, HW * 2 + 0.25, DY - PT - 0.01, Z1 - Z0, T.teak, 0, (PT + DY - 0.01) / 2, (Z0 + Z1) / 2); kPanel(K, HW * 2 + 0.25, Z1 - Z0, T.deck, 0, DY, (Z0 + Z1) / 2, -Math.PI / 2, 0, 1);
    walk(-HW - 0.125, HW + 0.125, Z0, Z1, DY);
    tableF(K, 2.5, DY, 7.1, 0, 5.0, 1.0, 0.76, T.teak, T.teak);
    for (const x of [0.5, 1.5, 2.5, 3.5, 4.5]) { chair(K, x, DY - 0.03, 6.4, 0, T.frame); chair(K, x, DY - 0.03, 7.8, Math.PI, T.frame); addSeat(wx(x), Y0 + DY + 0.45, wz(6.4), Math.PI); addSeat(wx(x), Y0 + DY + 0.45, wz(7.8), 0); }
    rect(-0.1, 5.1, 6.0, 8.2);
    // 廊架：接在南挑檐外沿，覆盖平台东半部
    const PZ0 = RZ1, PZ1 = Z1 - 0.15;
    for (const x of [-0.9, 2.55, 6.0]) { box(K, 0.1, CEIL - 0.2 - DY, 0.1, T.frame, x, (DY + CEIL - 0.2) / 2, PZ1); collC(wx(x), wz(PZ1), 0.08); }
    box(K, 7.0, 0.16, 0.1, T.frame, 2.55, CEIL - 0.28, PZ1); for (const x of [-0.9, 6.0]) box(K, 0.1, 0.16, PZ1 - PZ0, T.frame, x, CEIL - 0.28, (PZ0 + PZ1) / 2);
    for (let x = -0.75; x < 5.9; x += 0.3) box(K, 0.05, 0.15, PZ1 - PZ0 + 0.1, T.teak, x, CEIL - 0.12, (PZ0 + PZ1) / 2);
    for (let x = -0.6; x < 5.9; x += 0.45) { cyl(K, 0.003, 0.003, 0.25, T.frame, x, CEIL - 0.33, PZ1 - 0.05, 3); const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), T.strip); b.position.set(x, CEIL - 0.48, PZ1 - 0.05); K.add(b); }   // 户外灯串
    // 平台西南角：3 个 0.6 m 高耐候钢香草种植箱
    for (const x of [-5.4, -4.6, -3.8]) { box(K, 0.7, 0.6, 0.7, T.corten, x, DY + 0.3, Z1 - 0.6); box(K, 0.62, 0.02, 0.62, M.soil, x, DY + 0.58, Z1 - 0.6);
      for (let k = 0; k < 4; k++) { const h = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), T.herb); h.position.set(x + (k % 2 - 0.5) * 0.28, DY + 0.7, Z1 - 0.6 + (Math.floor(k / 2) - 0.5) * 0.28); h.scale.set(1, 0.8, 1); K.add(h); } }
    rect(-5.8, -3.4, Z1 - 1.0, Z1 - 0.2, 1.5);
    // 平台南沿、西沿玻璃栏板（南沿中段留出下到高尔夫球场的台阶口）
    const ST = [-2.9, -0.1];
    for (const [ax, az, bx, bz] of [[-HW - 0.125, Z1 - 0.05, ST[0], Z1 - 0.05], [ST[1], Z1 - 0.05, HW + 0.125, Z1 - 0.05], [-HW - 0.075, Z0, -HW - 0.075, Z1]]) {
      const len = Math.hypot(bx - ax, bz - az), vert = ax === bx; box(K, vert ? 0.03 : len, 1.0, vert ? len : 0.03, M.glassLight, (ax + bx) / 2, DY + 0.5, (az + bz) / 2); box(K, vert ? 0.06 : len, 0.05, vert ? len : 0.06, T.frame, (ax + bx) / 2, DY + 1.02, (az + bz) / 2);
      collS(wx(ax), wz(az), wx(bx), wz(bz), Y0 - 0.3, Y0 + 2);
    }
    // 下到高尔夫球场（5 号洞发球台方向）的石阶
    const gy = Math.min(gh(wx(ST[0]), wz(Z1 + 3.8)), gh(wx(ST[1]), wz(Z1 + 3.8))) - Y0, len = Math.max(1.2, Math.round((DY - gy) / 0.17) * 0.3);
    stairs(K, toW, Y0, (ST[0] + ST[1]) / 2, Z1 + len, Z1, gy, DY, ST[1] - ST[0], { solid: true, mat: T.stone, railMat: T.frame });
  }
  KITCHEN.group = K;
  K.position.set(KX, Y0, KZ); return K;
}
