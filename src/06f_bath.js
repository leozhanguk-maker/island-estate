// ======================= 06f 高端卫浴洁具库（别墅主卫/客卫、三楼洗浴室、公共卫生间共用同一套款式） =======================
// 统一风格：白色釉面陶瓷 + 拉丝香槟金五金 + 白色岩板台面/墙面 + 柚木浴室柜 + 背光镜（造型参照一线卫浴品牌的极简系列，不画任何品牌标识）。
// 构件函数都在局部坐标里建模：背靠 -z 墙面、正面朝 +z，原点在墙面与地面交线的中点；ry 旋转后挂到父分组。
let BX = null;
function bathMats() {
  if (BX) return BX;
  const slab = kitchenMats().slab;
  BX = {
    china: std(0xf8f8f6, 0.16, 0, { envMapIntensity: 1.3 }),          // 釉面陶瓷
    gold: std(0xc8a26a, 0.3, 1.0, { envMapIntensity: 1.4 }),          // 拉丝香槟金
    goldDark: std(0x8e7148, 0.4, 1.0),
    slab,                                                               // 白色岩板
    stoneDark: std(0x3b3c3e, 0.35, 0.1),                                // 深灰石材（淋浴地台、隔板）
    teak: kitchenMats().teak,
    mirror: std(0xdfe6ea, 0.03, 1.0, { envMapIntensity: 1.7 }),
    glow: std(0xffffff, 0.5, 0, { emissive: 0xfff0d8, emissiveIntensity: 1.6 }),
    towel: std(0xf2eee6, 0.95), towelGrey: std(0xb9b6ae, 0.95),
    water: std(0xcfe6ea, 0.05, 0, { transparent: true, opacity: 0.55, envMapIntensity: 1.5 }),
    sensor: std(0x111315, 0.1, 0.3),
  };
  return BX;
}
// 旋转体（车削）几何：pts 为 [半径, 高] 列表；sx、sz 把圆截面拉成椭圆（几何体新建，不共用）
function latheMesh(p, pts, mat, x, y, z, sx = 1, sz = 1, seg = 28) {
  const g = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.scale.set(sx, 1, sz); p.add(m); return m;
}
// 壁挂式马桶：隐藏水箱（岩板包覆）+ 金色冲水面板（大小双键）+ 椭圆坐便 + 缓降盖板；侧墙纸巾架与马桶刷
function wcF(p, x, y, z, ry, side = 1) {
  // 落地一体式马桶（敦实款）：陶瓷底座落地、加大坐便、方正水箱 + 金色冲水键；侧墙纸巾架与马桶刷
  const B = bathMats(), g = furn(p, x, y, z, ry);
  box(g, 0.46, 0.42, 0.2, B.china, 0, 0.62, 0.12); box(g, 0.48, 0.04, 0.22, B.china, 0, 0.85, 0.12);                 // 水箱与盖
  box(g, 0.14, 0.03, 0.02, B.gold, 0, 0.76, 0.225); cyl(g, 0.025, 0.025, 0.02, B.goldDark, 0, 0.87, 0.12, 12);        // 冲水键
  latheMesh(g, [[0, 0], [0.17, 0.0], [0.2, 0.06], [0.18, 0.2], [0.2, 0.3], [0.0, 0.3]], B.china, 0, 0, 0.4, 1, 1.25);  // 落地底座（上宽下收）
  latheMesh(g, [[0.0, 0], [0.16, 0.0], [0.22, 0.06], [0.235, 0.12], [0.22, 0.13], [0.18, 0.1]], B.china, 0, 0.3, 0.44, 1, 1.4);   // 坐便
  box(g, 0.4, 0.3, 0.2, B.china, 0, 0.3, 0.2);                                                                        // 与水箱相接
  latheMesh(g, [[0.16, 0], [0.235, 0.0], [0.235, 0.03], [0.16, 0.03]], B.china, 0, 0.43, 0.44, 1, 1.4);              // 坐圈
  latheMesh(g, [[0, 0.025], [0.235, 0.025], [0.235, 0.0], [0, 0.0]], B.china, 0, 0.462, 0.44, 1, 1.4);               // 盖板（合上）
  box(g, 0.02, 0.02, 0.14, B.gold, side * 0.45, 0.72, 0.07); cyl(g, 0.055, 0.055, 0.11, B.towel, side * 0.45, 0.66, 0.13, 14, 0, Math.PI / 2);   // 纸巾架与纸卷
  cyl(g, 0.055, 0.05, 0.3, B.gold, side * 0.42, 0.15, 0.3, 12); cyl(g, 0.012, 0.012, 0.2, B.goldDark, side * 0.42, 0.4, 0.3, 6);   // 马桶刷筒
  return g;
}
// 蹲便器（公共卫生间）：石材踏台（高 0.15）+ 嵌入式陶瓷蹲盆（带防滑踏脚）+ 墙上金色延时冲水阀 + 两侧金色扶手，结实耐用
function squatF(p, x, y, z, ry) {
  const B = bathMats(), g = furn(p, x, y, z, ry);
  box(g, 0.9, 0.15, 1.25, B.stoneDark, 0, 0.075, 0.8);                                                                 // 踏台
  box(g, 0.46, 0.012, 0.66, B.china, 0, 0.152, 0.86);                                                                  // 蹲盆沿
  { const d = new THREE.Mesh(new THREE.CircleGeometry(0.19, 24), std(0xb9c0c2, 0.2)); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.1595, 0.9); d.scale.set(1, 1.45, 1); g.add(d);   // 盆体下凹（深色椭圆表现凹面）
    const r = new THREE.Mesh(new THREE.RingGeometry(0.19, 0.23, 24), B.china); r.rotation.x = -Math.PI / 2; r.position.set(0, 0.162, 0.9); r.scale.set(1, 1.45, 1); g.add(r); }
  box(g, 0.1, 0.012, 0.28, B.china, 0, 0.158, 0.54); box(g, 0.24, 0.004, 0.08, B.stoneDark, 0, 0.163, 0.47);       // 前端导水 + 出水孔
  for (const s of [-1, 1]) { box(g, 0.12, 0.014, 0.28, B.china, s * 0.26, 0.16, 1.02); for (let k = 0; k < 4; k++) box(g, 0.1, 0.004, 0.02, B.stoneDark, s * 0.26, 0.169, 0.92 + k * 0.06); }   // 防滑踏脚
  box(g, 0.2, 0.26, 0.02, B.gold, 0, 1.1, 0.01); cyl(g, 0.04, 0.04, 0.04, B.goldDark, 0, 1.1, 0.04, 16, Math.PI / 2);   // 延时冲水阀
  cyl(g, 0.018, 0.018, 0.6, B.gold, 0, 0.75, 0.02, 8);                                                                  // 冲水管
  for (const s of [-1, 1]) { box(g, 0.03, 0.03, 0.62, B.gold, s * 0.6, 0.9, 0.6); for (const zz of [0.3, 0.9]) box(g, 0.03, 0.03, 0.06, B.gold, s * 0.63, 0.9, zz); }   // 两侧扶手（固定在隔板上）
  box(g, 0.02, 0.02, 0.14, B.gold, 0.35, 0.72, 0.07); cyl(g, 0.055, 0.055, 0.11, B.towel, 0.35, 0.66, 0.13, 14, 0, Math.PI / 2);   // 纸巾架
  return g;
}
// 悬挂式浴室柜：柚木柜体（两抽屉、金色拉手）+ 岩板台面 + 台上盆 + 台面立式金色龙头 + 背光镜 + 两盏壁灯 + 皂液器；双盆时正中放方形纸巾盒
function vanityF(p, x, y, z, ry, w = 1.2, basins = 1) {
  const B = bathMats(), g = furn(p, x, y, z, ry);
  box(g, w, 0.42, 0.5, B.teak, 0, 0.62, 0.25); box(g, w + 0.02, 0.03, 0.54, B.slab, 0, 0.845, 0.27);
  for (const s of [-1, 1]) { box(g, w / 2 - 0.02, 0.4, 0.006, B.teak, s * w / 4, 0.62, 0.503); box(g, 0.16, 0.012, 0.02, B.gold, s * w / 4, 0.78, 0.515); }
  for (let i = 0; i < basins; i++) {
    const bx = basins === 1 ? 0 : (i - (basins - 1) / 2) * (w / basins);
    latheMesh(g, [[0, 0], [0.16, 0.0], [0.2, 0.04], [0.22, 0.13], [0.21, 0.135], [0.19, 0.05], [0.0, 0.03]], B.china, bx, 0.86, 0.3, 1.2, 0.8);   // 台上盆（椭圆）
    // 台面立式龙头：底座 + 立柱 + 弧形出水嘴（伸到盆中心上方）+ 单把手
    cyl(g, 0.03, 0.035, 0.02, B.gold, bx, 0.87, 0.08, 16); cyl(g, 0.018, 0.018, 0.3, B.gold, bx, 1.02, 0.08, 12);
    { const a = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.016, 8, 16, Math.PI), B.gold); a.rotation.y = Math.PI / 2; a.position.set(bx, 1.17, 0.18); g.add(a); }
    cyl(g, 0.012, 0.012, 0.06, B.gold, bx, 1.14, 0.28, 8); box(g, 0.1, 0.012, 0.018, B.gold, bx + 0.06, 1.1, 0.08);
    const mw = Math.min(0.9, w / basins - 0.1);
    box(g, mw, 0.9, 0.03, B.mirror, bx, 1.72, 0.045); box(g, mw + 0.04, 0.94, 0.012, B.glow, bx, 1.72, 0.024);   // 背光镜（镜后灯带外溢；离开墙面饰板，不共面）
  }
  for (const s of [-1, 1]) { cyl(g, 0.035, 0.035, 0.26, B.glow, s * (w / 2 + 0.08), 1.72, 0.08, 12); cyl(g, 0.04, 0.04, 0.02, B.gold, s * (w / 2 + 0.08), 1.86, 0.08, 12); cyl(g, 0.04, 0.04, 0.02, B.gold, s * (w / 2 + 0.08), 1.58, 0.08, 12); }   // 壁灯
  cyl(g, 0.03, 0.032, 0.14, B.goldDark, w / 2 - 0.07, 0.93, 0.07, 12); cyl(g, 0.006, 0.006, 0.05, B.gold, w / 2 - 0.07, 1.02, 0.07, 6);   // 皂液器（台面后角，不挡盆）
  if (basins > 1) { box(g, 0.2, 0.08, 0.12, B.goldDark, 0, 0.9, 0.3); box(g, 0.08, 0.02, 0.04, B.towel, 0, 0.945, 0.3); }   // 双盆正中的方形纸巾盒（小）
  return g;
}
// 独立式浴缸（1.7 m 椭圆）+ 落地式金色龙头（带手持花洒）+ 柚木浴缸托盘 + 挂毛巾
function tubF(p, x, y, z, ry, wallBar = true) {
  const B = bathMats(), g = furn(p, x, y, z, ry);
  latheMesh(g, [[0, 0], [0.34, 0.0], [0.4, 0.1], [0.43, 0.5], [0.45, 0.58], [0.42, 0.6], [0.39, 0.52], [0.37, 0.14], [0.0, 0.1]], B.china, 0, 0, 0.5, 1.95, 1, 36);
  { const w = new THREE.Mesh(new THREE.CircleGeometry(0.38, 28), B.water); w.rotation.x = -Math.PI / 2; w.position.set(0, 0.42, 0.5); w.scale.set(1.95, 1, 1); g.add(w); }   // 水面
  box(g, 0.3, 0.02, 0.9, B.teak, 0.1, 0.61, 0.5);                                  // 横跨浴缸的柚木托盘
  cyl(g, 0.02, 0.018, 0.1, B.glow, 0.05, 0.66, 0.35, 8); box(g, 0.14, 0.03, 0.1, B.towel, 0.18, 0.635, 0.6);   // 托盘上的蜡烛、小毛巾
  const fx = 0.35, fz = 1.02; cyl(g, 0.025, 0.025, 0.95, B.gold, fx, 0.475, fz, 12); cyl(g, 0.07, 0.07, 0.01, B.gold, fx, 0.005, fz, 16);   // 落地龙头立柱与底座（浴缸正面外侧）
  { const a = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 16, Math.PI), B.gold); a.rotation.y = Math.PI / 2; a.position.set(fx, 0.95, fz - 0.12); g.add(a); }   // 鹅颈出水（越过缸沿）
  box(g, 0.06, 0.03, 0.03, B.gold, fx + 0.05, 0.75, fz); box(g, 0.035, 0.16, 0.035, B.gold, fx - 0.05, 0.62, fz + 0.03);   // 调节杆、手持花洒
  if (wallBar) { box(g, 0.45, 0.02, 0.03, B.gold, -0.2, 0.62, 0.02); box(g, 0.42, 0.5, 0.02, B.towel, -0.2, 0.37, 0.035); }   // 墙上挂杆与浴巾（浴缸背后有墙时）
  return g;
}
// 小便斗（壁挂、感应冲水面板）与隔板
function urinalF(p, x, y, z, ry) {
  const B = bathMats(), g = furn(p, x, y, z, ry);
  latheMesh(g, [[0, 0], [0.14, 0.02], [0.2, 0.2], [0.21, 0.55], [0.18, 0.62], [0.16, 0.6], [0.17, 0.25], [0.12, 0.08], [0, 0.07]], B.china, 0, 0.45, 0.16, 1, 0.8);
  box(g, 0.12, 0.16, 0.012, B.gold, 0, 1.25, 0.006); box(g, 0.05, 0.03, 0.006, B.sensor, 0, 1.28, 0.014);
  box(g, 0.03, 1.2, 0.5, B.stoneDark, 0.42, 1.0, 0.25);    // 小便斗隔板
  return g;
}
// 毛巾电热架（金色）
function towelRailF(p, x, y, z, ry) {
  const B = bathMats(), g = furn(p, x, y, z, ry);
  for (const s of [-1, 1]) { box(g, 0.025, 0.9, 0.025, B.gold, s * 0.25, 1.15, 0.08); for (const y of [0.78, 1.52]) { box(g, 0.02, 0.02, 0.07, B.gold, s * 0.25, y, 0.035); cyl(g, 0.025, 0.025, 0.012, B.gold, s * 0.25, y, 0.006, 12, Math.PI / 2); } }   // 立柱 + 墙上安装支座
  for (let k = 0; k < 6; k++) box(g, 0.5, 0.018, 0.018, B.gold, 0, 0.75 + k * 0.16, 0.08);
  box(g, 0.44, 0.5, 0.02, B.towel, 0, 1.05, 0.1);
  return g;
}
// 湿区洗浴室（二楼主卫、三楼卫生间共用）：淋浴隔间占满一整面墙（深灰石材地台、线性地漏、无框玻璃隔断留入口），
// 浴缸南北向放在隔间一端、落地龙头在浴缸东侧；另一端为顶喷雨淋 + 升降杆手持花洒 + 恒温阀 + 壁龛。
// 参数都在别墅局部坐标：隔间 x 范围 [ex0, ex1]、z 范围 [z0, z1]；wall 为靠墙一侧（'e' 或 'w'）；tubEnd 为浴缸所在一端（'n' 或 's'）；
// open 为玻璃隔断上的入口 [za, zb]；reg(x0, x1, z0, z1) 登记碰撞；ceil 为吊顶离地高度（顶喷吊杆接到吊顶）
function wetRoomF(V, fy, ex0, ex1, z0, z1, wall, tubEnd, open, reg, ceil = 3.2) {
  const B = bathMats(), cx = (ex0 + ex1) / 2, gx = wall === 'e' ? ex0 : ex1, wxf = wall === 'e' ? ex1 : ex0, ws = wall === 'e' ? -1 : 1;
  box(V, ex1 - ex0, 0.04, z1 - z0, B.stoneDark, cx, fy + 0.02, (z0 + z1) / 2);                                     // 隔间石材地台
  kPanel(V, z1 - z0, 2.4, B.slab, wxf + ws * 0.012, fy + 1.2, (z0 + z1) / 2, 0, ws > 0 ? Math.PI / 2 : -Math.PI / 2, 1.2);   // 墙面岩板
  for (const [a, b] of [[z0, open[0]], [open[1], z1]]) if (b - a > 0.05) {                                        // 玻璃隔断（入口处断开）
    box(V, 0.012, 2.05, b - a, M.glassClear, gx, fy + 1.06, (a + b) / 2); box(V, 0.025, 0.025, b - a, B.gold, gx, fy + 2.09, (a + b) / 2); box(V, 0.025, 0.04, b - a, B.gold, gx, fy + 0.06, (a + b) / 2);
    reg(gx - 0.03, gx + 0.03, a, b); }
  for (const zz of open) box(V, 0.03, 2.1, 0.03, B.gold, gx, fy + 1.05, zz);
  box(V, 0.06, 0.006, z1 - z0 - 0.3, B.gold, gx + ws * 0.12, fy + 0.042, (z0 + z1) / 2);                         // 线性地漏（沿玻璃一侧）
  // 浴缸：南北向，龙头在东侧（tubF 局部 +z 朝世界 +x）
  const tz = tubEnd === 's' ? z1 - 0.95 : z0 + 0.95;
  tubF(V, cx - 0.5, fy + 0.04, tz, Math.PI / 2, false); reg(cx - 0.47, cx + 0.62, tz - 0.9, tz + 0.9);
  // 淋浴区（另一端）：顶喷雨淋、升降杆手持花洒、恒温阀、壁龛
  const sz = tubEnd === 's' ? (z0 + tz - 0.9) / 2 : (z1 + tz + 0.9) / 2, wf = wxf + ws * 0.02;
  cyl(V, 0.012, 0.012, ceil - 2.27, B.gold, cx, fy + (2.27 + ceil) / 2, sz, 6); cyl(V, 0.035, 0.035, 0.015, B.gold, cx, fy + ceil - 0.008, sz, 12);   // 吊杆接到吊顶（带底座） box(V, 0.34, 0.015, 0.34, B.gold, cx, fy + 2.27, sz); box(V, 0.3, 0.004, 0.3, B.goldDark, cx, fy + 2.255, sz);
  box(V, 0.02, 0.9, 0.02, B.gold, wf + ws * 0.01, fy + 1.35, sz + 0.35); box(V, 0.04, 0.2, 0.04, B.gold, wf + ws * 0.03, fy + 1.6, sz + 0.35); for (const y of [0.9, 1.8]) box(V, 0.05, 0.03, 0.03, B.gold, wf, fy + y, sz + 0.35);
  box(V, 0.012, 0.3, 0.16, B.gold, wf, fy + 1.1, sz - 0.25); for (const h of [1.18, 1.02]) cyl(V, 0.028, 0.028, 0.04, B.goldDark, wf + ws * 0.02, fy + h, sz - 0.25, 12, 0, Math.PI / 2);
  box(V, 0.1, 0.3, 0.5, B.stoneDark, wf + ws * 0.04, fy + 1.4, sz - 0.8); for (const [dz, c] of [[-0.15, 0xf1ede4], [0, 0x2e3a33], [0.15, 0xc8a26a]]) cyl(V, 0.028, 0.028, 0.18, std(c, 0.4), wf + ws * 0.06, fy + 1.34, sz - 0.8 + dz, 10);
  box(V, 1.4, 0.03, 0.12, B.glow, cx, fy + 2.95, (z0 + z1) / 2);
}
