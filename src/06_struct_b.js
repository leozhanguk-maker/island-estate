// ======================= 06b 瞭望塔 / 水闸 / 机场 / 能源 / 栈桥 / 小品 =======================
function lattice(p, base, top, h, sections, legR, braceR, mat) {
  const lv = [];
  for (let s = 0; s <= sections; s++) { const t = s / sections, hw = lerp(base, top, t) / 2, y = t * h; lv.push([[-hw, y, -hw], [hw, y, -hw], [hw, y, hw], [-hw, y, hw]].map(a => new THREE.Vector3(...a))); }
  for (let c = 0; c < 4; c++) for (let s = 1; s <= sections; s++) rod(p, lv[s - 1][c], lv[s][c], legR, mat, 6);
  for (let s = 1; s <= sections; s++) for (let c = 0; c < 4; c++) {
    const a0 = lv[s - 1][c], b0 = lv[s - 1][(c + 1) % 4], a1 = lv[s][c], b1 = lv[s][(c + 1) % 4];
    rod(p, a1, b1, braceR, mat, 4); rod(p, a0, b1, braceR * 0.8, mat, 4); rod(p, b0, a1, braceR * 0.8, mat, 4);
  }
}
// 观察室：四面玻璃（+z 面留门）、窗下墙、屋顶；平台在楼梯井处开洞
function cabin(p, w, h, y, roofOver = 0.5, shaft = null) {
  const P = w + 1.6, hw = P / 2;
  if (shaft) { const [sx0, sx1, sz0, sz1] = shaft; for (const [x0, x1, z0, z1] of [[-hw, hw, -hw, sz0], [-hw, hw, sz1, hw], [-hw, sx0, sz0, sz1], [sx1, hw, sz0, sz1]]) box(p, x1 - x0, 0.25, z1 - z0, M.metalDark, (x0 + x1) / 2, y, (z0 + z1) / 2);
    for (const [a0, b0, a1, b1] of [[sx0, sz0 + 0.02, sx0, sz1], [sx0, sz1, sx1, sz1]]) { const v0 = new THREE.Vector3(a0, y + 0.12, b0), v1 = new THREE.Vector3(a1, y + 0.12, b1); railing(p, [v0, v1], 1.0, M.galv, 0.8, 0.025); } }
  else box(p, P, 0.25, P, M.metalDark, 0, y, 0);
  railing(p, [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([a, b]) => new THREE.Vector3(a * (w / 2 + 0.75), y + 0.12, b * (w / 2 + 0.75))), 1.05, M.galv, 1.2, 0.028);
  for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const g = new THREE.Group(); g.rotation.y = r; p.add(g);
    if (r === Math.PI) { for (const sx of [-1, 1]) { box(g, w / 2 - 0.5, 0.9, 0.12, M.metalDark, sx * (w / 4 + 0.25), y + 0.57, w / 2); box(g, w / 2 - 0.5, h - 1.3, 0.08, M.glass, sx * (w / 4 + 0.25), y + 1.02 + (h - 1.3) / 2, w / 2 - 0.02); } box(g, 1.0, 0.3, 0.12, M.metalDark, 0, y + h - 0.05, w / 2); }
    else { box(g, w, 0.9, 0.12, M.metalDark, 0, y + 0.57, w / 2); box(g, w - 0.2, h - 1.3, 0.08, M.glass, 0, y + 1.02 + (h - 1.3) / 2, w / 2 - 0.02); }
  }
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(p, 0.14, h, 0.14, M.metalDark, a * (w / 2 - 0.05), y + h / 2 + 0.12, b * (w / 2 - 0.05));
  box(p, w + roofOver * 2, 0.3, w + roofOver * 2, M.metalDark, 0, y + h + 0.25, 0);
  box(p, w - 0.2, 0.05, w - 0.2, M.ceiling, 0, y + h + 0.08, 0);
  return y + h + 0.4;
}
// 塔内折返楼梯（沿局部 z 往返两条梯段），顶部通入观察室；返回楼梯井范围
function towerStairs(p, toW, baseY, H, depth, name) {
  const Lf = depth - 1.2, n0 = Math.ceil(H / (Lf * 0.72)), n = n0 % 2 ? n0 : n0 + 1, r = H / n, zA = -Lf / 2, zB = Lf / 2;
  for (let k = 0; k < n; k++) {
    const lane = k % 2 === 0 ? 0.65 : -0.65, up = k % 2 === 0, yb = k * r, yt = (k + 1) * r;
    stairs(p, toW, baseY, lane, up ? zB : zA, up ? zA : zB, yb, yt, 1.2, { mat: M.galv, frame: M.galv, railSides: [lane > 0 ? 1 : -1], railMat: M.galv });
    // 两梯段之间的隔离：stairs() 已在梯段内侧边（x=0）登记同一线段与高度带，这里不再重复登记
    if (k < n - 1) {                                                                                           // 中间休息平台
      const zz = up ? zA - 0.3 : zB + 0.3, yl = yt; box(p, 2.6, 0.12, 0.6, M.galv, 0, yl - 0.06, zz);
      const q = toW(0, zz); COLL.walks.push({ kind: 'rect', x: q[0], z: q[1], hw: 1.3, hd: 0.3, rot: TOWER_ROT, y: baseY + yl });
      const e0 = toW(-1.3, up ? zA - 0.6 : zB + 0.6), e1 = toW(1.3, up ? zA - 0.6 : zB + 0.6); collS(e0[0], e0[1], e1[0], e1[1], baseY + yl - 0.3, baseY + yl + r - 0.1);
      for (const sx of [-1.3, 1.3]) { const f0 = toW(sx, up ? zA - 0.6 : zB), f1 = toW(sx, up ? zA : zB + 0.6); collS(f0[0], f0[1], f1[0], f1[1], baseY + yl - 0.3, baseY + yl + r - 0.1); }
    }
  }
  for (const [x, z] of [[-1.35, zA - 0.6], [1.35, zA - 0.6], [-1.35, zB + 0.6], [1.35, zB + 0.6]]) box(p, 0.1, H, 0.1, M.galv, x, H / 2, z);
  return { zA, zB, r };
}
let TOWER_ROT = 0;
// 塔顶平台（含观察室地面）：楼梯井开洞；外圈栏杆；观察室墙体（-z 门）
function towerTop(cx, cz, rot, y, w, depth) {
  const toW = (lx, lz) => [cx + lx * Math.cos(rot) + lz * Math.sin(rot), cz - lx * Math.sin(rot) + lz * Math.cos(rot)];
  const hw = w / 2 + 0.75, zA = -(depth - 1.2) / 2, zB = -zA, sh = [0.0, 1.3, zA, zB];   // 仅最后一跑（+x 侧）上方开洞
  for (const [x0, x1, z0, z1] of [[-hw, hw, -hw, sh[2]], [-hw, hw, sh[3], hw], [-hw, sh[0], sh[2], sh[3]], [sh[1], hw, sh[2], sh[3]]]) { const q = toW((x0 + x1) / 2, (z0 + z1) / 2); COLL.walks.push({ kind: 'rect', x: q[0], z: q[1], hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, rot, y }); }
  const C = [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]].map(p => toW(...p));
  for (let i = 0; i < 4; i++) { const a = C[i], b = C[(i + 1) % 4]; collS(a[0], a[1], b[0], b[1], y - 1); }
  const c = w / 2;   // 观察室墙：+z 面中间留 1 米门
  const segs = [[[-c, c], [c, c]], [[-c, -c], [-c, c]], [[c, -c], [c, c]], [[-c, -c], [-0.5, -c]], [[0.5, -c], [c, -c]]];   // -z 面留门（楼梯到达侧）
  for (const [p0, p1] of segs) { const a = toW(...p0), b = toW(...p1); collS(a[0], a[1], b[0], b[1], y - 0.5, y + 2.2); }
  // 井口护栏（最后一段上行梯段所在的 +x 侧留口）
  for (const [p0, p1] of [[[0, sh[2] + 0.02], [0, sh[3]]], [[1.3, sh[2] + 0.02], [1.3, sh[3]]], [[0, sh[3]], [1.3, sh[3]]]]) { const a = toW(...p0), b = toW(...p1); collS(a[0], a[1], b[0], b[1], y - 0.2, y + 2); }
}
function dish(p, r, x, y, z, tilt, yaw) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(r * 1.6, 20, 8, 0, TAU, 0, 0.66); geo.scale(1, 0.55, 1);
  const d = new THREE.Mesh(geo, M.white); d.rotation.x = Math.PI; d.position.y = r * 0.55; g.add(d);
  rod(g, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, r * 1.25, 0), 0.03, M.metalMid, 4);
  box(g, 0.14, 0.14, 0.2, M.metalDark, 0, r * 1.28, 0);
  const holder = new THREE.Group(); holder.add(g); g.rotation.x = -tilt; holder.rotation.y = yaw;
  const post = new THREE.Group(); post.add(holder); holder.position.y = 1.0; cyl(post, 0.09, 0.12, 1.0, M.metalMid, 0, 0.5, 0, 8);
  post.position.set(x, y, z); p.add(post);
}
function buildEastTower() {
  const T = new THREE.Group(), H = 20, base = L.summitPad.h + 0.6, rot = -0.38;
  box(T, 7.5, 0.6, 7.5, M.concrete, 0, 0.3, 0);
  const I = new THREE.Group(); I.position.y = 0.6; T.add(I);
  lattice(I, 6.2, 3.8, H, 5, 0.16, 0.06, M.galv);
  const toW = (lx, lz) => [L.eastTower.x + lx * Math.cos(rot) + lz * Math.sin(rot), L.eastTower.z - lx * Math.sin(rot) + lz * Math.cos(rot)];
  TOWER_ROT = rot; towerStairs(I, toW, base, H, 3.6, '东峰');
  const top = cabin(I, 4.4, 3.1, H, 0.5, [0, 1.3, -1.2, 1.2]);
  towerTop(L.eastTower.x, L.eastTower.z, rot, base + H + 0.125, 4.4, 3.6);
  box(I, 0.6, 0.8, 1.6, M.metalDark, -1.8, H + 0.5, 0); box(I, 0.05, 0.5, 1.2, M.yachtGlass, -2.08, H + 1.15, 0);   // 控制台靠西墙（原位置压在楼梯出口）
  { const q = toW(-1.8, 0); collR(q[0], q[1], 0.3, 0.8, rot, base + H + 1.6, base + H - 0.3); }
  box(I, 5.2, 0.18, 5.2, M.metalDark, 0, top + 0.1, 0);
  railing(I, [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([a, b]) => new THREE.Vector3(a * 2.55, top + 0.18, b * 2.55)), 1.0, M.galv, 1.2, 0.025);
  dish(I, 1.25, -1.1, top + 0.2, 0.9, 0.75, Math.PI * 0.85);   // 卫星接收天线
  dish(I, 0.8, 1.35, top + 0.2, -1.0, 0.9, Math.PI * 1.15);
  cyl(I, 0.06, 0.08, 6, M.galv, 1.6, top + 3.1, 1.6, 6);
  for (let k = 0; k < 3; k++) box(I, 0.9 - k * 0.2, 0.05, 0.05, M.galv, 1.6, top + 3.6 + k * 1.1, 1.6);
  for (const [a, b] of [[-3.1, -3.1], [3.1, -3.1], [3.1, 3.1], [-3.1, 3.1]]) { const q = toW(a, b); collC(q[0], q[1], 0.25); }
  COLL.walks.push({ kind: 'rect', x: L.eastTower.x, z: L.eastTower.z, hw: 3.75, hd: 3.75, rot, y: base });
  T.position.set(L.eastTower.x, L.summitPad.h, L.eastTower.z); T.rotation.y = rot; return T;
}
function buildWestTower() {
  const T = new THREE.Group(), H = 12, base = 20.5, rot = 0.3;
  box(T, 5.5, 0.5, 5.5, M.concrete, 0, 0.25, 0);
  const I = new THREE.Group(); I.position.y = 0.5; T.add(I);
  lattice(I, 4.4, 3.2, H, 3, 0.13, 0.05, M.galv);
  const toW = (lx, lz) => [L.westTower.x + lx * Math.cos(rot) + lz * Math.sin(rot), L.westTower.z - lx * Math.sin(rot) + lz * Math.cos(rot)];
  TOWER_ROT = rot; towerStairs(I, toW, base, H, 3.0, '西端');
  const top = cabin(I, 3.4, 2.7, H, 0.4, [0, 1.3, -0.9, 0.9]);
  towerTop(L.westTower.x, L.westTower.z, rot, base + H + 0.125, 3.4, 3.0);
  cyl(I, 0.05, 0.06, 3.5, M.galv, 1.1, top + 1.8, 1.1, 6);
  for (const [a, b] of [[-2.2, -2.2], [2.2, -2.2], [2.2, 2.2], [-2.2, 2.2]]) { const q = toW(a, b); collC(q[0], q[1], 0.2); }
  COLL.walks.push({ kind: 'rect', x: L.westTower.x, z: L.westTower.z, hw: 2.75, hd: 2.75, rot, y: base });
  T.position.set(L.westTower.x, 20, L.westTower.z); T.rotation.y = rot; return T;
}
// 水闸：两扇底轴翻板闸门。开启时门叶向海侧放倒至水下（低于游艇吃水），闸顶步道随门叶转动
const GATE = { open: 0, target: 0, leaves: [], lamp: null, lever: null, get closed() { return this.open < 0.02; } };
// 每帧更新水闸（主循环与测试共用）：开闸期间门顶可行走面消失前（open < 0.02），把站在门顶的人移到就近桥墩；再推进门叶动画。返回门叶是否移动
function updateGate(dt, fp) {
  if (GATE.target > 0.5 && GATE.closed && fp.on) {
    const p = fp.pos, ft = fp._st.feet; if (Math.abs(p.z - L.gateZ) < 1.4 && Math.abs(p.x) < 37 && ft > 4 && ft < 5.2) fp.teleport(Math.sign(p.x || 1) * 40.2, L.gateZ, p.x > 0 ? -Math.PI / 2 : Math.PI / 2, 5.0);
  }
  if (GATE.open === GATE.target) return false;
  GATE.open = GATE.target > GATE.open ? Math.min(GATE.target, GATE.open + dt / 14) : Math.max(GATE.target, GATE.open - dt / 14);   // 约 14 秒完成
  const e = GATE.open * GATE.open * (3 - 2 * GATE.open);
  for (const lf of GATE.leaves) lf.position.y = -3.0 - e * 7.6;             // 下沉至海底（顶面低于游艇吃水）
  if (GATE.lamp) GATE.lamp.material = GATE.open > 0.98 ? M.green : GATE.open < 0.02 ? M.red : M.yellow;
  if (GATE.lever) GATE.lever.rotation.x = -GATE.target * 2.2;   // 拉手：关闸时朝上，开闸时向外拉下
  return true;
}
function buildGate() {
  const G1 = new THREE.Group(), zc = L.gateZ, span = L.notch.x1 - L.notch.x0;
  for (const sx of [-1, 1]) {
    box(G1, 7, 9, 10, M.rockMat, sx * (span / 2 + 2.2), 0.5, zc);
    box(G1, 4.2, 3.2, 4.6, M.metalDark, sx * (span / 2 + 1.2), 6.6, zc);
    box(G1, 4.4, 0.25, 4.8, M.metalMid, sx * (span / 2 + 1.2), 8.3, zc);
    collR(sx * (span / 2 + 2.2), zc, 3.5, 5, 0, 4.3);
    COLL.walks.push({ kind: 'rect', x: sx * (span / 2 + 2.2), z: zc, hw: 3.5, hd: 5, rot: 0, y: 5.0 });
  }
  // 水闸开关：东闸墩闸机箱北立面上的拉手式开关（拉下＝开闸，推上＝关闸），上方指示灯，墙顶挑出雨棚
  { const px = span / 2 + 1.2, fz = zc - 2.3, y0 = 5.0;                              // 闸机箱北立面 z = 125.7，墩顶 5.0
    box(G1, 0.7, 0.9, 0.22, M.metalMid, px, y0 + 1.35, fz - 0.11);                     // 开关箱
    box(G1, 0.5, 0.08, 0.1, M.metalDark, px, y0 + 1.84, fz - 0.07);                    // 箱顶檐
    const lv = new THREE.Group(); lv.position.set(px, y0 + 1.35, fz - 0.26); lv.userData.live = true; G1.add(lv);   // 转轴在开关箱正面中部
    const add = (m) => { m.userData.live = true; return m; };
    add(cyl(lv, 0.035, 0.035, 0.5, M.metalDark, 0, 0, 0, 8)).rotation.z = Math.PI / 2;  // 横轴
    for (const sx of [-0.18, 0.18]) add(box(lv, 0.04, 0.5, 0.05, M.galv, sx, 0.25, -0.03));   // 两根拉杆
    add(cyl(lv, 0.03, 0.03, 0.44, M.yellow, 0, 0.5, -0.03, 8)).rotation.z = Math.PI / 2;        // 黄色把手
    GATE.lever = lv;
    GATE.lamp = add(box(G1, 0.14, 0.14, 0.08, M.red, px, y0 + 2.05, fz - 0.05));
    // 雨棚：闸机箱顶下沿挑出 1.4 m、外低内高，两根斜撑
    const cv = box(G1, 2.4, 0.08, 1.5, M.metalMid, px, 7.95, fz - 0.72); cv.rotation.x = -0.18;
    for (const sx of [-1.0, 1.0]) { const br = box(G1, 0.06, 0.06, 1.55, M.metalDark, px + sx, 7.5, fz - 0.62); br.rotation.x = 0.55; }
    INTERACT.push({ x: px, z: fz - 0.9, r: 1.2, y: y0, label: () => GATE.target > 0.5 ? '推上拉手，关闭水闸' : '拉下拉手，打开水闸', fn: () => { GATE.target = GATE.target > 0.5 ? 0 : 1; } }); }
  { const sb = Math.min(gh(0, zc - 4.5), gh(0, zc + 4.5), gh(0, zc)) - 0.3, top = 4.95; box(G1, 4, top - sb, 9, M.concreteDark, 0, (top + sb) / 2, zc); }   // 中央墩落到海底
  collR(0, zc, 2, 4.5, 0, 4.3);
  box(G1, 3.8, 2.6, 4.2, M.metalDark, 0, 6.2, zc);
  box(G1, span + 2, 0.8, 3, M.concreteDark, 0, -3.4, zc + 0.4);        // 底槛
  // 东侧桥墩：从闸塔码头上墩顶的台阶
  stairs(G1, (x, z) => [x, z], 0, 42.4, 118.0, zc - 5, 2.6, 5.0, 1.3, { solid: true, mat: M.concreteDark, rail: false });   // 从警戒塔塔基顶面（2.6）起步
  // 下沉式门叶（通透栅栏式，形如铁窗）：一排竖向圆钢栅条＋上下框梁与两道横向扁钢箍，海水与海浪可自由穿过；
  // 关闭时顶面高出水面 4.4 米、栅条间隙 0.36 米挡住人和船，开启时整体沉入海底
  const barN = Math.round((span / 2 - 3.6) / 0.56) + 1, barH = 6.3;
  for (const sx of [-1, 1]) {
    const leaf = new THREE.Group(); leaf.position.set(sx * (span / 4 + 0.5), -3.0, zc); leaf.userData.live = true;
    const w = span / 2 - 3, add = (mesh) => { mesh.userData.live = true; return mesh; };
    add(box(leaf, w + 0.4, 0.55, 1.1, M.metalDark, 0, 6.93, 0));                        // 上框梁（承托门顶步道）
    add(box(leaf, w, 0.45, 0.9, M.metalDark, 0, 0.23, 0));                               // 下框梁
    for (const ex of [-1, 1]) add(box(leaf, 0.42, 7.2, 1.0, M.metalDark, ex * (w / 2 - 0.21), 3.6, 0));   // 两端立柱
    for (const y of [2.35, 4.6]) add(box(leaf, w - 0.4, 0.14, 0.42, M.metalMid, 0, y, 0));              // 横向扁钢箍（栅条从中穿过）
    // 竖向圆钢栅条：一个实例化网格（新建几何体，不共用 BOXG）
    const bg = new THREE.CylinderGeometry(0.1, 0.1, barH, 10), bars = new THREE.InstancedMesh(bg, M.metalMid, barN), m4 = new THREE.Matrix4();
    for (let i = 0; i < barN; i++) bars.setMatrixAt(i, m4.makeTranslation(-w / 2 + 0.6 + i * (w - 1.2) / (barN - 1), 0.45 + barH / 2, 0));
    bars.castShadow = true; bars.receiveShadow = true; add(bars); leaf.add(bars);
    add(box(leaf, w + 0.4, 0.22, 2.2, M.galv, 0, 7.31, 0));                            // 门顶面（无围栏）
    for (let k = 0; k < 18; k++) add(box(leaf, 0.08, 0.01, 2.1, M.metalDark, -w / 2 + 1 + k * (w - 2) / 17, 7.43, 0));
    GATE.leaves.push(leaf);
  }
  const gc = () => GATE.closed;
  for (const sx of [-1, 1]) COLL.walks.push({ kind: 'rect', x: sx * (span / 4 + 0.5), z: zc, hw: span / 4 - 1.3, hd: 1.1, rot: 0, y: 4.53, cond: gc });
  COLL.walks.push({ kind: 'rect', x: 0, z: zc, hw: 2, hd: 4.5, rot: 0, y: 4.95 });
  COLL.rects.push({ x: 0, z: zc, hw: span / 2, hd: 1.2, rot: 0, top: 3.2, bottom: -1e9, cond: gc });
  return G1;
}
function buildGateTower() {
  const T = new THREE.Group(), H = 11, S = 2.1, base = 2.6, cx = L.gateTower.x, cz = L.gateTower.z;
  box(T, 9.5, 0.4, 9.5, M.concrete, 0, 0.2, 0);
  const I = new THREE.Group(); I.position.y = 0.4; T.add(I);
  for (const [a, b] of [[-S, -S], [S, -S], [S, S], [-S, S]]) { box(I, 0.26, H, 0.26, M.galv, a, H / 2, b); collC(cx + a, cz + b, 0.25); }
  for (let s2 = 1; s2 <= 3; s2++) { const y = s2 * H / 3; for (const r of [0, 1, 2, 3]) { const g = new THREE.Group(); g.rotation.y = r * Math.PI / 2; I.add(g); box(g, 2 * S + 0.2, 0.14, 0.14, M.galv, 0, y, S); } }
  // 一层闸控室：金属墙板围合，北侧门，室内配电柜（水闸开关已移到东闸墩，见 buildGate）
  const rh = 2.5, toW = (lx, lz) => [cx + lx, cz + lz];
  for (const [w, d, x, z] of [[2 * S, 0.12, 0, S], [0.12, 2 * S, -S, 0], [0.12, 2 * S, S, 0], [S - 0.55, 0.12, -(S + 0.55) / 2, -S], [S - 0.55, 0.12, (S + 0.55) / 2, -S]]) box(I, w, rh, d, M.cladGray, x, rh / 2, z);
  box(I, 1.1, rh - 2.2, 0.12, M.cladGray, 0, 2.2 + (rh - 2.2) / 2, -S);
  for (const [p0, p1] of [[[-S, S], [S, S]], [[-S, -S], [-S, S]], [[S, -S], [S, S]], [[-S, -S], [-0.55, -S]], [[0.55, -S], [S, -S]]]) collS(cx + p0[0], cz + p0[1], cx + p1[0], cz + p1[1], -1e9, base + 1.5);
  box(I, 0.5, 1.8, 1.4, M.metalMid, -S + 0.35, 0.9, -1.0); box(I, 0.03, 0.5, 0.9, M.yachtGlass, -S + 0.61, 1.35, -1.0);
  collR(cx - S + 0.35, cz - 1.0, 0.3, 0.75, 0, base + 1);
  COLL.walks.push({ kind: 'rect', x: cx, z: cz, hw: 4.75, hd: 4.75, rot: 0, y: base });   // 混凝土塔基顶面（含闸控室地面）
  // 塔内楼梯：每层一跑直梯。楼层 0 / 2.65 / 5.3 / 7.95 / 10.6（观察室），梯段在东西两条车道交替、方向交替，
  // 上一跑的到达端就是下一跑的起步端；一楼第一跑从北门内侧起步，门洞前不再有横跨的休息平台
  const F = [0, 2.65, 5.3, 7.95, H - 0.4], zE = 1.45, lane = (k) => k % 2 === 0 ? -0.65 : 0.65, dir = (k) => k % 2 === 0 ? 1 : -1;
  for (let k = 0; k < 4; k++) stairs(I, toW, base, lane(k), -dir(k) * zE, dir(k) * zE, F[k], F[k + 1], 1.2, { mat: M.galv, frame: M.galv, railSides: [lane(k) > 0 ? 1 : -1], railMat: M.galv });
  for (let j = 1; j <= 3; j++) {
    const y = F[j], L0 = lane(j - 1), d = dir(j - 1);
    // 楼板开洞：到达本层那一跑的车道，从梯段四分之一处到到达端（保证下方梯段净高）
    const hx0 = L0 < 0 ? -1.3 : 0, hx1 = L0 < 0 ? 0 : 1.3, hz0 = d > 0 ? -zE + 0.5 * zE : -zE, hz1 = d > 0 ? zE : zE - 0.5 * zE;
    for (const [x0, x1, z0, z1] of [[-S, S, -S, hz0], [-S, S, hz1, S], [-S, hx0, hz0, hz1], [hx1, S, hz0, hz1]]) {
      if (x1 - x0 < 0.01 || z1 - z0 < 0.01) continue;
      box(I, x1 - x0, 0.08, z1 - z0, M.galv, (x0 + x1) / 2, y - 0.04, (z0 + z1) / 2);
      const q = toW((x0 + x1) / 2, (z0 + z1) / 2); COLL.walks.push({ kind: 'rect', x: q[0], z: q[1], hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, rot: 0, y: base + y });
    }
    // 外圈护栏与井口护栏（井口到达端敞开，下梯后转到另一条车道继续上楼）
    const ox = L0 < 0 ? hx0 : hx1, ix = L0 < 0 ? hx1 : hx0, fz = d > 0 ? hz0 : hz1;
    for (const [p0, p1] of [[[-S, -S], [S, -S]], [[S, -S], [S, S]], [[S, S], [-S, S]], [[-S, S], [-S, -S]], [[ox, hz0], [ox, hz1]], [[hx0, fz], [hx1, fz]], [[ix, hz0], [ix, hz1]]]) {
      railing(I, [new THREE.Vector3(p0[0], y, p0[1]), new THREE.Vector3(p1[0], y, p1[1])], 1.0, M.galv, 1.2, 0.025);
      const e0 = toW(...p0), e1 = toW(...p1); collS(e0[0], e0[1], e1[0], e1[1], base + y - 0.3, base + y + 1.1);
    }
  }
  const top = cabin(I, 3.6, 2.8, H - 0.4, 0.5, [0, 1.3, -zE, zE]);
  towerTop(cx, cz, 0, base + H - 0.4 + 0.125, 3.6, 2 * zE + 1.2);
  cyl(I, 0.05, 0.06, 4, M.galv, -1.2, top + 2, -1.2, 6);
  T.position.set(cx, 2.2, cz); return T;
}
// ---------------- 机库 + 停机坪 ----------------
function buildAirfield() {
  const A = new THREE.Group(), y = L.plateau.h;
  // 机库：门朝向降落场
  const hx = L.hangar.x, hz = L.hangar.z, dx = L.helipad.x - hx, dz = L.helipad.z - hz, rot = Math.atan2(dx, dz);
  const Hg = new THREE.Group(), W = 20, D = 17, Hh = 6.6, T = 0.2;
  box(Hg, W + 0.4, 0.3, D + 0.4, M.concrete, 0, 0.15, 0);
  // 外壳：后墙、两侧墙、门楣；前门四扇中一扇推开叠到相邻扇后方
  box(Hg, W, Hh, T, M.cladGray, 0, Hh / 2, -D / 2);
  for (const sx of [-1, 1]) box(Hg, T, Hh, D, M.cladGray, sx * W / 2, Hh / 2, 0);
  box(Hg, W, Hh - 5.2, T, M.cladGray, 0, 5.2 + (Hh - 5.2) / 2, D / 2);
  box(Hg, 1.8, 5.2, T, M.cladGray, -W / 2 + 0.9, 2.6, D / 2); box(Hg, 1.8, 5.2, T, M.cladGray, W / 2 - 0.9, 2.6, D / 2);
  for (let i = 0; i <= 20; i++) box(Hg, 0.06, Hh - 0.2, 0.08, M.alu, -W / 2 + i, Hh / 2, -D / 2 - 0.1);
  for (const sx of [-1, 1]) for (let i = 0; i <= 17; i++) box(Hg, 0.08, Hh - 0.2, 0.06, M.alu, sx * (W / 2 + 0.1), Hh / 2, -D / 2 + i);
  const roofA = Math.atan2(0.7, W / 2);
  for (const sx of [-1, 1]) box(Hg, W / 2 + 0.7, 0.2, D + 0.8, M.roofDark, sx * W / 4, Hh + 0.35, 0, 0, 0, -sx * roofA);
  box(Hg, W, 0.1, D, M.cladGray, 0, Hh - 0.05, 0);                                   // 吊顶
  for (let k = 1; k < 4; k++) { box(Hg, 4.1, 5.2, 0.18, k % 2 ? M.metalMid : M.alu, -6.15 + k * 4.1, 2.75, D / 2 + 0.12); for (let r = 0; r < 4; r++) box(Hg, 4.0, 0.06, 0.05, M.metalDark, -6.15 + k * 4.1, 0.9 + r * 1.3, D / 2 + 0.22); }
  box(Hg, 4.1, 5.2, 0.18, M.alu, -2.05, 2.75, D / 2 + 0.34);                         // 推开的门扇
  box(Hg, 17, 0.25, 0.3, M.metalDark, 0, 5.45, D / 2 + 0.18);
  box(Hg, W - 2, 0.5, 0.08, M.glassLight, 0, Hh - 0.6, -D / 2 - 0.12);
  // 室内：工作台、工具柜、货架、顶灯、地面标线
  box(Hg, 4, 0.9, 0.9, M.metalMid, -6, 0.75, -D / 2 + 0.8); box(Hg, 4, 0.06, 1.0, M.woodDark, -6, 1.23, -D / 2 + 0.8);
  for (let i = 0; i < 4; i++) box(Hg, 0.9, 1.9, 0.6, i % 2 ? M.red : M.metalDark, 1 + i * 1.0, 1.25, -D / 2 + 0.5);
  for (const zz of [-4, 0, 4]) { box(Hg, 0.6, 2.4, 2.8, M.galv, W / 2 - 0.6, 1.5, zz); for (const hh of [0.8, 1.6, 2.4]) box(Hg, 0.62, 0.05, 2.8, M.metalDark, W / 2 - 0.6, hh, zz); }
  for (const [lx, lz] of [[-5, -3], [5, -3], [-5, 3], [5, 3]]) box(Hg, 2.4, 0.08, 0.4, M.lamp, lx, Hh - 0.15, lz);
  box(Hg, 12, 0.02, 0.15, M.yellow, 0, 0.32, 2); box(Hg, 0.15, 0.02, 10, M.yellow, 0, 0.32, 0);
  // 碰撞：墙段（前门开口）、内部设施；可行走地坪
  const toW = (lx, lz) => [hx + lx * Math.cos(rot) + lz * Math.sin(rot), hz - lx * Math.sin(rot) + lz * Math.cos(rot)];
  const seg = (a, b) => { const p = toW(...a), q = toW(...b); collS(p[0], p[1], q[0], q[1]); };
  seg([-W / 2, -D / 2], [W / 2, -D / 2]); seg([-W / 2, -D / 2], [-W / 2, D / 2]); seg([W / 2, -D / 2], [W / 2, D / 2]);
  seg([-W / 2, D / 2], [-8.2, D / 2]); seg([-4.1, D / 2], [W / 2, D / 2]);
  const cw = (lx, lz, hw, hd) => { const p = toW(lx, lz); collR(p[0], p[1], hw, hd, rot); };
  cw(-6, -D / 2 + 0.8, 2.1, 0.55); cw(2.5, -D / 2 + 0.5, 2.1, 0.45); cw(W / 2 - 0.6, 0, 0.45, 5.6);
  { const p = toW(0, 0); COLL.walks.push({ kind: 'rect', x: p[0], z: p[1], hw: W / 2, hd: D / 2, rot, y: y + 0.3 }); }
  Hg.position.set(hx, y, hz); Hg.rotation.y = rot; A.add(Hg);
  // 停机坪：24m 方形混凝土坪 + 黄色接地离地区圆 + 白色 H
  const P = new THREE.Group();
  box(P, 24, 0.22, 24, M.concrete, 0, 0.11, 0);
  const ring = new THREE.Mesh(new THREE.RingGeometry(6.0, 6.5, 64), M.yellow); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.235; P.add(ring);
  box(P, 0.7, 0.02, 4.5, M.white, -1.3, 0.235, 0); box(P, 0.7, 0.02, 4.5, M.white, 1.3, 0.235, 0); box(P, 1.9, 0.02, 0.7, M.white, 0, 0.235, 0);
  for (let i = 0; i < 8; i++) { const t = -11 + i * 22 / 7; for (const [a, b] of [[t, -11.6], [t, 11.6], [-11.6, t], [11.6, t]]) box(P, (a === -11.6 || a === 11.6) ? 0.4 : 1.8, 0.02, (a === -11.6 || a === 11.6) ? 1.8 : 0.4, M.white, a, 0.235, b); }
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; box(P, 0.22, 0.16, 0.22, M.green, Math.cos(a) * 12.4, 0.2, Math.sin(a) * 12.4); }
  P.position.set(L.helipad.x, y, L.helipad.z); P.rotation.y = rot; A.add(P);
  COLL.walks.push({ kind: 'rect', x: L.helipad.x, z: L.helipad.z, hw: 12, hd: 12, rot, y: y + 0.22 });
  collC(L.helipad.x + 14, L.helipad.z + 12, 0.15);
  // 风向袋
  const ws = new THREE.Group(); cyl(ws, 0.06, 0.08, 6, M.galv, 0, 3, 0, 6);
  const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.2, 2.4, 10, 1, true), M.orange); sock.rotation.z = Math.PI / 2; sock.position.set(-1.2, 5.7, 0); ws.add(sock);
  ws.position.set(L.helipad.x + 14, y, L.helipad.z + 12); ws.rotation.y = 0.9; A.add(ws);
  return A;
}
// ---------------- 风机 ----------------
const LIVE = [];  // 需要动画的对象
function buildTurbine(x, z, scene) {
  const y = gh(x, z), T = new THREE.Group(), H = 30;
  cyl(T, 3.4, 3.6, 0.5, M.concrete, 0, 0.25, 0, 20);
  cyl(T, 0.55, 0.9, H, M.steelWhite, 0, H / 2, 0, 18);
  const face = new THREE.Vector2(0.6, -0.8).normalize(), yaw = Math.atan2(face.x, face.y);
  const N = new THREE.Group(); N.position.y = H + 0.6; N.rotation.y = yaw; T.add(N);
  const nac = new THREE.Mesh(new THREE.CapsuleGeometry ? new THREE.CylinderGeometry(0.75, 0.9, 4.2, 14) : BOXG, M.steelWhite); nac.rotation.x = Math.PI / 2; N.add(nac);
  T.position.set(x, y, z); scene.add(T);
  const rotor = new THREE.Group(); rotor.position.set(x, y + H + 0.6, z); rotor.rotation.y = yaw; scene.add(rotor);
  const spin = new THREE.Group(); spin.position.z = 2.5; rotor.add(spin);
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.6, 14), M.steelWhite); hub.rotation.x = Math.PI / 2; hub.position.z = 0.6; spin.add(hub);
  const bg = new THREE.BufferGeometry();
  { // 锥形叶片
    const Lb = 11.8, pts = [];
    const sec = (s) => { const w = lerp(0.95, 0.22, s) * (s < 0.12 ? lerp(0.6, 1, s / 0.12) : 1), t = lerp(0.22, 0.05, s); return [w, t]; };
    const n = 8, pos = [], idx = [];
    for (let i = 0; i <= n; i++) { const s = i / n, [w, t] = sec(s), yv = 0.6 + s * Lb, tw = lerp(0.35, 0.05, s); for (const [a, b] of [[-w * 0.35, -t], [w * 0.65, -t * 0.3], [w * 0.65, t * 0.3], [-w * 0.35, t]]) { pos.push(a * Math.cos(tw) - b * Math.sin(tw), yv, a * Math.sin(tw) + b * Math.cos(tw)); } }
    for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) { const a = i * 4 + k, b = i * 4 + (k + 1) % 4, c = a + 4, d = b + 4; idx.push(a, c, b, b, c, d); }
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setIndex(idx); bg.computeVertexNormals();
  }
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(bg, M.steelWhite); b.rotation.z = k * TAU / 3; spin.add(b); }
  spin.rotation.z = rand() * TAU;
  rotor.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
  LIVE.push({ type: 'rotor', obj: spin, speed: 1.1 + rand() * 0.3 });
  return T;
}
// ---------------- 光伏阵列 ----------------
function panelTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#1c2c48'; g.fillRect(0, 0, 128, 256);
  g.strokeStyle = 'rgba(160,180,210,0.45)'; g.lineWidth = 1;
  for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(i * 128 / 6, 0); g.lineTo(i * 128 / 6, 256); g.stroke(); }
  for (let i = 1; i < 12; i++) { g.beginPath(); g.moveTo(0, i * 256 / 12); g.lineTo(128, i * 256 / 12); g.stroke(); }
  g.strokeStyle = '#c9ced3'; g.lineWidth = 4; g.strokeRect(0, 0, 128, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function buildSolar() {
  const S = new THREE.Group(), so = L.solar, tilt = 0.21;
  const nx = 16, pw = 1.134, ph = 2.28, tw = nx * pw, td = 2 * ph;
  const tex = panelTexture(); tex.repeat.set(nx, 2);
  const pmat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.18, metalness: 0.3, envMapIntensity: 1.3 });
  const pgeo = new THREE.PlaneGeometry(tw, td); pgeo.rotateX(-Math.PI / 2);
  for (let r = 0; r < 6; r++) {
    const z = so.z0 + 4 + r * 6.6;
    for (let c = 0; c < 2; c++) {
      const x = 251 + c * (tw + 1.4) + tw / 2, y = gh(x, z);
      const T = new THREE.Group();
      const pan = new THREE.Mesh(pgeo, pmat); pan.rotation.x = tilt; pan.position.y = 1.35; T.add(pan);
      box(T, tw, 0.06, 0.08, M.alu, 0, 1.35 - Math.sin(tilt) * td / 2 - 0.05, Math.cos(tilt) * td / 2);
      for (let k = 0; k <= 6; k++) { const px = -tw / 2 + 0.4 + k * (tw - 0.8) / 6; box(T, 0.08, 1.8, 0.08, M.galv, px, 0.9, -1.6); box(T, 0.08, 0.95, 0.08, M.galv, px, 0.47, 1.6); rod(T, new THREE.Vector3(px, 0.2, 1.6), new THREE.Vector3(px, 1.7, -1.6), 0.03, M.galv, 4); }
      T.position.set(x, y, z); S.add(T);
    }
  }
  // 设备带：汇流/逆变柜
  const ex = so.x0 + 3.5; box(S, 1.8, 1.9, 0.9, M.pw, ex, gh(ex, -42) + 0.95, -42); box(S, 1.8, 1.9, 0.9, M.pw, ex, gh(ex, -44) + 0.95, -44);
  collR(ex, -42, 0.9, 0.45); collR(ex, -44, 0.9, 0.45);   // 设备柜实心
  return S;
}
// ---------------- Tesla Powerwall 3 组（低矮安装墙） ----------------
function buildPowerwalls(x, z, ry, n = 6) {
  const P = new THREE.Group(), y = gh(x, z);
  const len = n * 0.95 + 0.6;
  box(P, len + 0.8, 0.2, 2.4, M.concrete, 0, 0.1, 0.5);
  COLL.walks.push({ kind: 'rect', x: x + 0.5 * Math.sin(ry), z: z + 0.5 * Math.cos(ry), hw: (len + 0.8) / 2, hd: 1.2, rot: ry, y: y + 0.2 });   // 底座可站立
  box(P, len, 1.5, 0.28, M.concreteWarm, 0, 0.95, -0.2);
  box(P, len + 0.2, 0.08, 0.5, M.metalDark, 0, 1.74, -0.1);
  for (let i = 0; i < n; i++) {
    const px = -len / 2 + 0.6 + i * 0.95;
    box(P, 0.609, 1.099, 0.193, M.pw, px, 0.3 + 0.55, -0.2 + 0.14 + 0.1);
    box(P, 0.04, 0.5, 0.01, M.pwDark, px, 0.95, -0.2 + 0.14 + 0.2);
  }
  box(P, 0.4, 0.6, 0.15, M.pw, len / 2 + 0.15, 1.0, -0.05);  // 网关
  P.position.set(x, y, z); P.rotation.y = ry; return P;
}
// ---------------- 木栈桥与登岸浮台 ----------------
// 栈道走向 BOARDWALK 定义在 02_layout（地形生成要沿栈道削平侵入的岩石）
function buildBoardwalk() {
  const B = new THREE.Group(), w = 2.4;
  // 登岸浮台
  const lx = L.landing.x, lz = L.landing.z;
  box(B, 6, 0.55, 13, M.metalMid, lx, 0.1, lz); box(B, 6.1, 0.12, 13.1, M.teak, lx, 0.44, lz);
  for (const [a, b] of [[-2.7, -6], [-2.7, 6], [2.7, -6], [2.7, 6], [-2.7, 0]]) cyl(B, 0.15, 0.18, 0.5, M.metalDark, lx + a, 0.75, lz + b, 8);
  for (const [a, b] of [[-2.8, -6.2], [-2.8, 6.2]]) cyl(B, 0.3, 0.3, 5, M.metalDark, lx + a, 0.3, lz + b, 10);   // 靠海侧系缆柱
  // endY：末端桥面中心高度；'ground' 表示末端贴地（桥面底面落在地面上），数值表示接到该高度的平台
  const path = (pts, startY, endY) => {
    const P = smoothOpen(pts, 1.0);
    const ys = P.map((p, i) => Math.max(gh(p[0], p[1]) + 0.55, 0.9));
    if (startY !== undefined) for (let i = 0; i < Math.min(6, ys.length); i++) ys[i] = lerp(startY, ys[i], i / 6);
    for (let pass = 0; pass < 3; pass++) for (let i = 1; i < ys.length - 1; i++) ys[i] = (ys[i - 1] + ys[i] + ys[i + 1]) / 3;
    if (endY !== undefined) { const n = ys.length, K = Math.min(8, n - 1);   // 末端 8 m 渐变到目标高度，贴地时全程不低于地面
      for (let d = 0; d <= K; d++) { const i = n - 1 - d, g = gh(P[i][0], P[i][1]) + 0.07, want = endY === 'ground' ? g : endY;
        ys[i] = lerp(want, ys[i], smoothstep(0, K, d)); if (endY === 'ground') ys[i] = Math.max(ys[i], g); } }
    const V = P.map((p, i) => new THREE.Vector3(p[0], ys[i], p[1]));
    for (let i = 1; i < V.length; i++) {
      const a = V[i - 1], b = V[i], m = a.clone().add(b).multiplyScalar(0.5), len = a.distanceTo(b), ang = Math.atan2(b.x - a.x, b.z - a.z);
      const dk = box(B, w, 0.12, len + 0.05, M.wood, m.x, m.y, m.z, ang); dk.rotation.x = -Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z)); dk.rotation.order = 'YXZ';
      if (i % 3 === 0) for (const s of [-1, 1]) { const px = m.x + Math.cos(ang) * s * w / 2, pz = m.z - Math.sin(ang) * s * w / 2, gy = Math.min(gh(px, pz), m.y); box(B, 0.14, m.y - gy + 0.3, 0.14, M.woodDark, px, (m.y + gy) / 2 - 0.1, pz); }
    }
    const side = (s) => V.map((v, i) => { const a = V[Math.max(i - 1, 0)], b = V[Math.min(i + 1, V.length - 1)], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; return new THREE.Vector3(v.x - dz / l * s * (w / 2 - 0.05), v.y + 0.06, v.z + dx / l * s * (w / 2 - 0.05)); });
    for (const s of [-1, 1]) {
      const full = side(s), sp = full.filter((_, i) => i % 2 === 0); railing(B, sp, 0.95, M.woodDark, 2.0, 0.035);
      for (let i = 1; i < full.length; i++) collS(full[i - 1].x, full[i - 1].z, full[i].x, full[i].z);
    }
    COLL.walks.push({ kind: 'path', pts: V.map(v => ({ x: v.x, y: v.y + 0.06, z: v.z })), hw: w / 2 });
  };
  COLL.walks.push({ kind: 'rect', x: lx, z: lz, hw: 3.05, hd: 6.55, rot: 0, y: 0.5 });
  path(BOARDWALK.south.concat([[51.0, 118.1]]), 0.5, 2.54);   // 南端伸进警戒塔塔基 0.2 m，桥面与塔基顶面（2.6）齐平
  path(BOARDWALK.east, 0.5, 'ground');                         // 北端落到沙面上
  // 泊位系缆桩（船首两根钢桩）与缆绳
  for (const dz of [-6.5, 6.5]) { const sb = gh(3.5, L.yacht.z + dz) - 0.3, top = 3.25; cyl(B, 0.35, 0.35, top - sb, M.metalDark, 3.5, (top + sb) / 2, L.yacht.z + dz, 10); collC(3.5, L.yacht.z + dz, 0.4); }   // 钢桩打到海底
  for (const [a, b] of [[-2.8, -6.2], [-2.8, 6.2]]) collC(lx + a, lz + b, 0.35);
  return B;
}
// ---------------- 沙滩椅伞 / 果岭旗 / 葡萄行 / 鸭舍 ----------------
function buildBeachSets() {
  const B = new THREE.Group();
  for (const [x, z] of [[30, 26], [42, 23]]) {
    const y = gh(x, z);
    // 正对闸内海面（朝南），可看海豚来回游
    for (const dx of [-0.85, 0.85]) { lounger(B, x + dx, gh(x + dx, z + 0.6), z + 0.6, 0, 0xf2eee6); collR(x + dx, z + 0.6, 0.38, 1.05, 0, gh(x, z) + 1.5); addSeat(x + dx, gh(x + dx, z + 0.6) + 0.42, z + 0.6, Math.PI, 'lie'); }
    parasol(B, x, y, z - 0.6, 1.4, 2.4, 0xeae3d2); collC(x, z - 0.6, 0.25);
  }
  return B;
}
function buildGolfFlags() {
  const F = new THREE.Group();
  for (const h of L.golf) {
    const [x, z] = h.green, y = gh(x, z);
    cyl(F, 0.025, 0.025, 2.2, M.white, x, y + 1.1, z, 5);
    box(F, 0.02, 0.36, 0.55, M.red, x, y + 2.0, z + 0.28);
    cyl(F, 0.06, 0.06, 0.02, M.dark, x, y + 0.01, z, 8);
  }
  return F;
}
function buildVineyard() {
  const V = new THREE.Group(), vy = L.vineyard;
  const vc = document.createElement('canvas'); vc.width = vc.height = 256; const g = vc.getContext('2d'); g.fillStyle = '#3c5e28'; g.fillRect(0, 0, 256, 256);
  const R = mulberry32(333);
  for (let i = 0; i < 420; i++) { const x = R() * 256, y = R() * 256, s = 7 + R() * 9, a = R() * TAU; for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) { g.save(); g.translate(x + dx, y + dy); g.rotate(a); g.fillStyle = `hsl(${85 + R() * 20},${40 + R() * 15}%,${30 + R() * 22}%)`; for (const d of [-0.9, 0, 0.9]) { g.save(); g.rotate(d); g.beginPath(); g.ellipse(s * 0.5, 0, s * 0.55, s * 0.28, 0, 0, TAU); g.fill(); g.restore(); } g.restore(); } }
  for (let i = 0; i < 30; i++) { const x = R() * 256, y = R() * 256; g.fillStyle = 'rgba(70,40,70,0.85)'; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(x + (k % 3) * 4, y + Math.floor(k / 3) * 4 + (k % 3), 2.4, 0, TAU); g.fill(); } }
  const vt = new THREE.CanvasTexture(vc); vt.colorSpace = THREE.SRGBColorSpace; vt.wrapS = vt.wrapT = THREE.RepeatWrapping; vt.repeat.set(5, 1); vt.anisotropy = 8;
  const mat = std(0xffffff, 0.85, 0, { map: vt }), matL = std(0xdfe8cf, 0.85, 0, { map: vt });
  for (let x = vy.x0 + 1.4, i = 0; x < vy.x1 - 0.8; x += 2.6, i++) {
    const z0 = vy.z0 + 1.8, z1 = vy.z1 - 1.8, n = 8;
    collS(x - 0.4, z0, x - 0.4, z1); collS(x + 0.4, z0, x + 0.4, z1); collS(x - 0.4, z0, x + 0.4, z0); collS(x - 0.4, z1, x + 0.4, z1);
    for (let s = 0; s < n; s++) {
      const za = lerp(z0, z1, s / n), zb = lerp(z0, z1, (s + 1) / n), zm = (za + zb) / 2, y = gh(x, zm);
      box(V, 0.75 + 0.1 * Math.sin(s * 3 + i), 1.25, zb - za - 0.15, (s + i) % 3 ? mat : matL, x, y + 0.95, zm);
      box(V, 0.08, 1.6, 0.08, M.woodDark, x, y + 0.8, za + 0.1);
    }
  }
  return V;
}
function buildDuckArea() {
  const D = new THREE.Group(), x = L.duck.x - 8, z = L.duck.z - 2, y = gh(x, z);
  box(D, 3.2, 1.6, 2.2, M.wood, x, y + 0.8, z); collR(x, z, 1.7, 1.2); box(D, 3.6, 0.12, 2.6, M.roofDark, x, y + 1.72, z, 0, 0, 0.1);
  box(D, 0.8, 0.9, 0.05, M.dark, x, y + 0.5, z + 1.12);
  const zN = L.duck.z - 4.3;
  D.add(fenceLoop([[L.duck.x - 12, L.duck.z + 3.5], [L.duck.x - 12, zN], [L.duck.x + 12, zN], [L.duck.x + 12, L.duck.z + 3.5]], 0.85, M.galv, M.galv, 2.5, false));
  return D;
}
