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
  const B = bathMats(), g = furn(p, x, y, z, ry);
  box(g, 0.62, 1.12, 0.2, B.slab, 0, 0.56, 0.1);                                   // 隐藏水箱包覆
  box(g, 0.24, 0.16, 0.012, B.gold, 0, 0.98, 0.206); box(g, 0.1, 0.12, 0.006, B.goldDark, -0.055, 0.98, 0.214); box(g, 0.1, 0.12, 0.006, B.goldDark, 0.055, 0.98, 0.214);
  latheMesh(g, [[0.0, 0], [0.12, 0.0], [0.17, 0.08], [0.19, 0.2], [0.185, 0.24], [0.15, 0.245], [0.14, 0.2]], B.china, 0, 0.18, 0.46, 1, 1.45);   // 坐便（前后拉长的椭圆）
  box(g, 0.34, 0.18, 0.12, B.china, 0, 0.33, 0.26);                                  // 与水箱相接的后段
  latheMesh(g, [[0.15, 0], [0.19, 0.0], [0.19, 0.02], [0.15, 0.02]], B.china, 0, 0.43, 0.46, 1, 1.45);                    // 坐圈
  { const lid = latheMesh(g, [[0, 0.02], [0.19, 0.02], [0.19, 0.0], [0, 0.0]], B.china, 0, 0.455, 0.46, 1, 1.45); lid.scale.y = 1; }   // 盖板（合上）
  box(g, 0.02, 0.02, 0.14, B.gold, side * 0.45, 0.72, 0.14); cyl(g, 0.055, 0.055, 0.11, B.towel, side * 0.45, 0.66, 0.2, 14, 0, Math.PI / 2);   // 纸巾架与纸卷
  cyl(g, 0.055, 0.05, 0.3, B.gold, side * 0.42, 0.15, 0.3, 12); cyl(g, 0.012, 0.012, 0.2, B.goldDark, side * 0.42, 0.4, 0.3, 6);   // 马桶刷筒
  return g;
}
// 悬挂式浴室柜：柚木柜体（两抽屉、金色拉手）+ 岩板台面 + 台上盆 + 入墙式金色龙头 + 背光镜 + 两盏壁灯 + 皂液器、叠放毛巾
function vanityF(p, x, y, z, ry, w = 1.2, basins = 1) {
  const B = bathMats(), g = furn(p, x, y, z, ry);
  box(g, w, 0.42, 0.5, B.teak, 0, 0.62, 0.25); box(g, w + 0.02, 0.03, 0.54, B.slab, 0, 0.845, 0.27);
  for (const s of [-1, 1]) { box(g, w / 2 - 0.02, 0.4, 0.006, B.teak, s * w / 4, 0.62, 0.503); box(g, 0.16, 0.012, 0.02, B.gold, s * w / 4, 0.78, 0.515); }
  for (let i = 0; i < basins; i++) {
    const bx = basins === 1 ? 0 : (i - (basins - 1) / 2) * (w / basins);
    latheMesh(g, [[0, 0], [0.16, 0.0], [0.2, 0.04], [0.22, 0.13], [0.21, 0.135], [0.19, 0.05], [0.0, 0.03]], B.china, bx, 0.86, 0.28, 1.3, 0.85);   // 台上盆（椭圆）
    cyl(g, 0.02, 0.02, 0.2, B.gold, bx, 1.12, 0.1, 10, Math.PI / 2); cyl(g, 0.03, 0.03, 0.02, B.gold, bx, 1.12, 0.005, 12, Math.PI / 2);   // 入墙出水口
    cyl(g, 0.018, 0.018, 0.08, B.gold, bx + 0.14, 1.12, 0.04, 10, Math.PI / 2);                                                           // 冷热调节杆
    const mw = Math.min(0.9, w / basins - 0.1);
    box(g, mw, 0.9, 0.03, B.mirror, bx, 1.72, 0.045); box(g, mw + 0.04, 0.94, 0.012, B.glow, bx, 1.72, 0.024);   // 背光镜（镜后灯带外溢；离开墙面饰板，不共面）
  }
  for (const s of [-1, 1]) { cyl(g, 0.035, 0.035, 0.26, B.glow, s * (w / 2 + 0.08), 1.72, 0.08, 12); cyl(g, 0.04, 0.04, 0.02, B.gold, s * (w / 2 + 0.08), 1.86, 0.08, 12); cyl(g, 0.04, 0.04, 0.02, B.gold, s * (w / 2 + 0.08), 1.58, 0.08, 12); }   // 壁灯
  cyl(g, 0.03, 0.032, 0.14, B.goldDark, w / 2 - 0.12, 0.93, 0.18, 12); cyl(g, 0.006, 0.006, 0.05, B.gold, w / 2 - 0.12, 1.02, 0.18, 6);   // 皂液器
  box(g, 0.28, 0.06, 0.2, B.towel, -w / 2 + 0.18, 0.89, 0.2); box(g, 0.26, 0.05, 0.19, B.towelGrey, -w / 2 + 0.18, 0.945, 0.2);           // 叠放毛巾
  return g;
}
// 独立式浴缸（1.7 m 椭圆）+ 落地式金色龙头（带手持花洒）+ 柚木浴缸托盘 + 挂毛巾
function tubF(p, x, y, z, ry) {
  const B = bathMats(), g = furn(p, x, y, z, ry);
  latheMesh(g, [[0, 0], [0.34, 0.0], [0.4, 0.1], [0.43, 0.5], [0.45, 0.58], [0.42, 0.6], [0.39, 0.52], [0.37, 0.14], [0.0, 0.1]], B.china, 0, 0, 0.5, 1.95, 1, 36);
  { const w = new THREE.Mesh(new THREE.CircleGeometry(0.38, 28), B.water); w.rotation.x = -Math.PI / 2; w.position.set(0, 0.42, 0.5); w.scale.set(1.95, 1, 1); g.add(w); }   // 水面
  box(g, 0.3, 0.02, 0.9, B.teak, 0.1, 0.61, 0.5);                                  // 横跨浴缸的柚木托盘
  cyl(g, 0.02, 0.018, 0.1, B.glow, 0.05, 0.66, 0.35, 8); box(g, 0.14, 0.03, 0.1, B.towel, 0.18, 0.635, 0.6);   // 托盘上的蜡烛、小毛巾
  const fx = 0.35, fz = 1.02; cyl(g, 0.025, 0.025, 0.95, B.gold, fx, 0.475, fz, 12); cyl(g, 0.07, 0.07, 0.01, B.gold, fx, 0.005, fz, 16);   // 落地龙头立柱与底座（浴缸正面外侧）
  { const a = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 16, Math.PI), B.gold); a.rotation.y = Math.PI / 2; a.position.set(fx, 0.95, fz - 0.12); g.add(a); }   // 鹅颈出水（越过缸沿）
  box(g, 0.06, 0.03, 0.03, B.gold, fx + 0.05, 0.75, fz); box(g, 0.035, 0.16, 0.035, B.gold, fx - 0.05, 0.62, fz + 0.03);   // 调节杆、手持花洒
  box(g, 0.45, 0.02, 0.03, B.gold, -0.2, 0.62, 0.02); box(g, 0.42, 0.5, 0.02, B.towel, -0.2, 0.37, 0.035);    // 墙上挂杆与浴巾
  return g;
}
// 步入式淋浴房：深灰石材地台 + 线性地漏 + 无框玻璃（固定扇 + 开启口）+ 顶喷方形雨淋花洒 + 升降杆手持花洒 + 恒温阀面板 + 岩板壁龛（瓶罐）
function showerF(p, x, y, z, ry, w = 1.1, d = 1.8, open = 1) {
  const B = bathMats(), g = furn(p, x, y, z, ry);
  box(g, w, 0.04, d, B.stoneDark, 0, 0.02, d / 2); box(g, w - 0.2, 0.006, 0.05, B.gold, 0, 0.042, 0.15);   // 地台、线性地漏
  box(g, w, 2.2, 0.012, B.slab, 0, 1.14, 0.007); box(g, 0.012, 2.2, d, B.slab, w / 2 - 0.007, 1.14, d / 2);   // 岩板墙面（背墙、+x 侧墙）
  box(g, 0.01, 2.0, d, M.glassClear, -w / 2 + 0.01, 1.04, d / 2); box(g, 0.02, 0.02, d, B.gold, -w / 2 + 0.01, 2.05, d / 2);   // -x 侧固定玻璃（与浴缸之间）
  box(g, w * (open ? 0.55 : 1), 2.0, 0.01, M.glassClear, open ? -w * 0.225 : 0, 1.04, d - 0.005); box(g, w * (open ? 0.55 : 1), 0.02, 0.02, B.gold, open ? -w * 0.225 : 0, 2.05, d - 0.005);   // 正面固定玻璃（+x 端留约 0.5 m 入口）
  cyl(g, 0.01, 0.01, 0.4, B.gold, 0, 2.3, 0.2, 6, Math.PI / 2); box(g, 0.32, 0.015, 0.32, B.gold, 0, 2.22, 0.45); box(g, 0.28, 0.004, 0.28, B.goldDark, 0, 2.203, 0.45);   // 顶喷雨淋（出水面板比花洒底面低 7 mm，不共面）
  box(g, 0.02, 0.9, 0.02, B.gold, w / 2 - 0.023, 1.35, 0.9); box(g, 0.04, 0.2, 0.04, B.gold, w / 2 - 0.05, 1.6, 0.9); cyl(g, 0.035, 0.035, 0.02, B.gold, w / 2 - 0.08, 1.72, 0.9, 12, 0, Math.PI / 2);   // 升降杆（贴在岩板侧墙上）与手持花洒
  box(g, 0.16, 0.3, 0.012, B.gold, 0.25, 1.1, 0.016); for (const h of [1.18, 1.02]) cyl(g, 0.028, 0.028, 0.04, B.goldDark, 0.25, h, 0.035, 12, Math.PI / 2);   // 恒温阀
  box(g, 0.5, 0.3, 0.1, B.stoneDark, -0.15, 1.35, 0.065); for (const [bx, c] of [[-0.3, 0xf1ede4], [-0.18, 0x2e3a33], [-0.06, 0xc8a26a]]) cyl(g, 0.028, 0.028, 0.18, std(c, 0.4), bx, 1.29, 0.07, 10);   // 壁龛与瓶罐
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
// 主卫套间（二楼主卫与三楼洗浴室共用，尺寸与设施完全相同）：室内 4.35 × 4.175 m。
// 局部坐标：u 沿背墙（0 → 4.35），v 离开背墙（0 → 4.175）；从 u=0 一端依次为马桶与洗手台、宽大浴缸、宽大淋浴室；
// 地面白色岩板、背墙岩板；(ox, oy, oz) 为背墙一端的室内角点、rot 为分组朝向；碰撞体由调用方的 reg(u0, u1, v0, v1) 换算登记。
function masterBathF(V, ox, oy, oz, rot, reg) {
  const B = bathMats(), g = new THREE.Group(); g.position.set(ox, oy, oz); g.rotation.y = rot; V.add(g);
  kPanel(g, 4.35, 4.175, B.slab, 2.175, 0.005, 2.0875, -Math.PI / 2, 0, 1.2);        // 岩板地面
  kPanel(g, 4.35, 2.6, B.slab, 2.175, 1.3, 0.012, 0, 0, 1.2);                          // 背墙岩板（离墙面 12 mm，不共面）
  wcF(g, 0.4, 0, 0, 0, -1); reg(0.08, 0.72, 0, 0.72);
  vanityF(g, 1.1, 0, 0, 0, 0.7, 1); reg(0.74, 1.46, 0, 0.55);
  tubF(g, 2.35, 0, 0.08, 0); reg(1.47, 3.23, 0.08, 1.2);
  showerF(g, 3.8, 0, 0, 0, 1.1, 1.8, 1);
  for (const [a0, a1, b0, b1] of [[3.25, 3.28, 0, 1.8], [3.25, 3.86, 1.78, 1.81]]) reg(a0, a1, b0, b1);   // 淋浴房玻璃：侧面整扇、正面留出靠墙一端约 0.5 m 入口
  towelRailF(g, 2.45, 0, 4.175, Math.PI);
  box(g, 1.2, 0.02, 0.8, B.towelGrey, 2.3, 0.015, 1.6);                                   // 浴缸前地垫
  box(g, 1.6, 0.03, 0.12, B.glow, 2.175, 2.95, 0.4);                                    // 顶部灯带
  return g;
}
