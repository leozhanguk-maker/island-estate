// ======================= 06c 12 层住宅楼：两梯四户、可进出（楼道、电梯、户门、楼梯、屋顶） =======================
// @ts-nocheck —— 由拼接式全局脚本机械转换而来，类型尚未补齐（逐文件移除此行并补类型）
import { THREE } from '../three';
import { L } from '../core/layout';
import { clamp } from '../core/util';
import { COLL, INTERACT, M, bedF, box, chair, collC, collR, cyl, gh, lampF, planter, rod, sofaF, std, tableF } from './villa';
// 平面（局部坐标，x 东、z 南，原点为楼中心；1 层地面高 0.9，层高 3.0）：
//   东西向楼道 z ∈ [-1.25, 1.25] 贯通全楼；楼道北侧中间为交通核：楼梯间 x ∈ [-4, 0]、两部电梯 x ∈ [0, 4]；南侧中间为楼道采光厅（1 层为入户大堂）
//   四户分居四角：西北、东北、西南、东南，每户 10.8 × 8.55 m，户型、门窗、内饰完全相同（按楼道与交通核镜像布置）
//   1～12 层每层四户（1 层四户与楼上户型、门窗、内饰相同，另有入户大堂）；楼梯从 1 层一直通到屋顶（顶层楼道进楼梯间上屋顶）；电梯服务 1～12 层
// 直升机按整栋楼体避让（窗是透明玻璃、窗洞 3～5 m，按构件逐个检查会从窗洞飞进楼里）：楼身（含阳台）一个实心盒，屋顶以上不限制（可以降落在屋顶）
export const HELI_SOLIDS = [];
export const DORM = { n: 12, fl: 3.0, y0: 0.9, W: 30, D: 20, doors: [], lifts: [], doorIM: null, handleIM: null, landIM: null, built: false };
export const dormY = (f) => DORM.y0 + f * DORM.fl;                       // 第 f 层（0 = 1 层）地面，局部高度
export const DWX = (x) => L.dorm.x + x, DWZ = (z) => L.dorm.z + z, DWY = (y) => 15.0 + y;   // 局部 → 世界
export const dormFloorName = (f) => `${f + 1} 层`;
// 竖向墙：沿 x（axis 'x'，墙面在 z = c）或沿 z（'z'，墙面在 x = c），范围 a0→a1、高度 y0→y1，扣掉洞口 [a0, a1, yb, yt]
export function dWall(p, axis, c, a0, a1, y0, y1, t, mat, holes = []) {
  const cuts = [a0, a1]; for (const h of holes) cuts.push(clamp(h[0], a0, a1), clamp(h[1], a0, a1)); cuts.sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i++) {
    const s0 = cuts[i], s1 = cuts[i + 1]; if (s1 - s0 < 1e-3) continue; const m = (s0 + s1) / 2;
    const hs = holes.filter(h => h[0] <= m && h[1] >= m).map(h => [h[2], h[3]]).sort((a, b) => a[0] - b[0]);
    let y = y0;
    for (const [hb, ht] of hs.concat([[y1, y1]])) { if (hb - y > 1e-3) { const len = s1 - s0, hh = hb - y, cy = (y + hb) / 2; if (axis === 'x') box(p, len, hh, t, mat, m, cy, c); else box(p, t, hh, len, mat, c, cy, m); } y = Math.max(y, ht); }
  }
}
// 水平板：矩形 [x0, x1] × [z0, z1] 扣掉矩形洞 [x0, x1, z0, z1]，按 x 切条后逐条扣洞
export function dSlab(p, x0, x1, z0, z1, y, t, mat, holes = []) {
  const cuts = [x0, x1]; for (const h of holes) cuts.push(clamp(h[0], x0, x1), clamp(h[1], x0, x1)); cuts.sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i++) {
    const s0 = cuts[i], s1 = cuts[i + 1]; if (s1 - s0 < 1e-3) continue; const m = (s0 + s1) / 2;
    const hs = holes.filter(h => h[0] <= m && h[1] >= m).map(h => [h[2], h[3]]).sort((a, b) => a[0] - b[0]);
    let z = z0; for (const [hb, ht] of hs.concat([[z1, z1]])) { if (hb - z > 1e-3) box(p, s1 - s0, t, hb - z, mat, m, y - t / 2, (z + hb) / 2); z = Math.max(z, ht); }
  }
}
// 窗：浅色透明玻璃 + 细铝框（室内外都能透过窗看到景色）
export function dWin(p, w, h, x, y, z, ry, nx = 2) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g);
  box(g, w, h, 0.02, M.glassLight, 0, 0, 0);
  for (const s of [-1, 1]) { box(g, w + 0.06, 0.06, 0.1, M.metalDark, 0, s * h / 2, 0.005); box(g, 0.06, h, 0.1, M.metalDark, s * w / 2, 0, 0.005); }
  for (let i = 1; i < nx; i++) box(g, 0.045, h, 0.08, M.metalDark, -w / 2 + i * w / nx, 0, 0.008);
  return g;
}
// 碰撞：局部坐标的线段，高度带为第 f0～f1 层（含）
export const dSeg = (ax, az, bx, bz, f0 = 0, f1 = DORM.n, cond) => { const s = { ax: DWX(ax), az: DWZ(az), bx: DWX(bx), bz: DWZ(bz), bottom: DWY(dormY(f0)) - 0.6, top: DWY(dormY(f1)) + 2.4 }; if (cond) s.cond = cond; COLL.segs.push(s); return s; };
// 沿线段的墙体碰撞，扣掉门洞 [a0, a1]
export function dSegRun(axis, c, a0, a1, f0, f1, gaps = []) {
  const cuts = [[a0, a1]]; let out = cuts;
  for (const [g0, g1] of gaps) out = out.flatMap(([s0, s1]) => (g1 <= s0 || g0 >= s1) ? [[s0, s1]] : [[s0, g0], [g1, s1]].filter(([a, b]) => b - a > 0.02));
  for (const [s0, s1] of out) axis === 'x' ? dSeg(s0, c, s1, c, f0, f1) : dSeg(c, s0, c, s1, f0, f1);
}
export const dRect = (x, z, hw, hd, f, h = 1.2) => collR(DWX(x), DWZ(z), hw, hd, 0, DWY(dormY(f)) + h, DWY(dormY(f)) - 0.5);

export function buildDorm() {
  const D = new THREE.Group(), fl = DORM.fl, n = DORM.n, W = DORM.W, Dp = DORM.D, y0 = DORM.y0, top = dormY(n);
  const HW = W / 2, HD = Dp / 2, IW = HW - 0.2, ID = HD - 0.2;        // 外墙外皮 / 内皮
  const CZ = 1.25;                                                       // 楼道半宽
  const STAIR = { x0: -3.9, x1: -0.1, zL: -2.85, zF: -5.65, zM: -7.25 }; // 楼梯间：楼层平台 z∈[zL, -CZ]，梯段 zL→zF，中间平台 zF→zM
  const LIFT = [{ cx: 1.0 }, { cx: 3.0 }], LZ0 = -4.6;                  // 电梯井 z∈[LZ0, -CZ]，轿厢中心 z = -3.0
  // 楼板洞：可行走面的洞按梯段/井道净空；可见楼板的洞边放在墙体中线（藏进墙里，洞边侧面不与墙面共面）
  const holes = (f) => f === 0 ? [[0.05, 3.95, LZ0, -CZ]] : [[STAIR.x0, STAIR.x1, STAIR.zM, STAIR.zL], [0.05, 3.95, LZ0, -CZ]];
  const holesV = (f) => f === 0 ? [[0, 4, LZ0, -CZ]] : [[-4, 0, STAIR.zM, STAIR.zL], [0, 4, LZ0, -CZ]];
  box(D, W + 1, y0, Dp + 1, M.concreteWarm, 0, y0 / 2, 0);                 // 石材基座
  // ---------------- 楼板、天花与可行走面 ----------------
  for (let f = 0; f <= n; f++) {
    const y = dormY(f), hs = holesV(f);
    if (f > 0) dSlab(D, -HW, HW, -HD, HD, y, 0.2, M.concreteDark, hs);                // 结构楼板（外露一圈即外立面的层间线）
    // 面层（厚 1 cm，底面高出结构板 2.5 cm，墙体从结构板起穿过面层，底面不共面）：户内木地板；楼道、采光厅（1 层大堂）、楼梯平台为石材；屋顶混凝土
    const pub = f === n ? [] : [[-IW, IW, -CZ - 0.06, CZ + 0.06], [-4, 4, CZ + 0.06, ID], [-4, 0, STAIR.zL, -CZ - 0.06]];   // 边界在墙体中线，彼此不重叠
    dSlab(D, -IW, IW, -ID, ID, y + 0.035, 0.01, f === n ? M.concrete : M.floorWood, hs.concat(pub));
    for (const [x0, x1, z0, z1] of pub) dSlab(D, x0, x1, z0, z1, y + 0.035, 0.01, M.stone, hs);
    if (f > 0) dSlab(D, -IW, IW, -ID, ID, y - 0.22, 0.008, M.ceiling, hs);                 // 下层天花（低于墙顶 2 cm，墙穿过天花层，顶面不共面）
    const pts = [[-IW, -ID], [IW, -ID], [IW, ID], [-IW, ID]].map(([x, z]) => [DWX(x), DWZ(z)]);
    const holesW = holes(f).map(([x0, x1, z0, z1]) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => [DWX(x), DWZ(z)]));
    COLL.walks.push({ kind: 'poly', pts, holes: holesW, y: DWY(y + 0.035) });
  }
  // ---------------- 外墙与窗（每层相同：四户同样的门窗） ----------------
  const unitsX = (sx) => [sx * 4, sx * IW];
  for (let f = 0; f < n; f++) {
    const y = dormY(f), yb = y, yt = y + fl - 0.2, wh = [y + 0.1, y + 2.55];   // 外墙到上层楼板底为止（避免墙顶与楼板顶面共面闪烁）
    for (const sz of [-1, 1]) {
      // 南北立面：每户客厅落地窗（通阳台）＋主卧窗；中间：南侧为楼道采光厅（1 层为大堂入口），北侧为楼梯间窗
      const c = sz * (HD - 0.125), hl = [];
      for (const sx of [-1, 1]) { const [a, b] = unitsX(sx), u = (k) => a + (b - a) * k / 10.8; hl.push([Math.min(u(0.8), u(5.8)), Math.max(u(0.8), u(5.8)), wh[0], wh[1]], [Math.min(u(7.2), u(10.2)), Math.max(u(7.2), u(10.2)), y + 0.9, y + 2.4]); }
      if (sz > 0) hl.push(f === 0 ? [-3.6, 3.6, y + 0.01, y + 2.7] : [-3.4, 3.4, y + 0.6, y + 2.5]); else hl.push([-3.2, -0.8, y + 1.0, y + 2.3]);
      dWall(D, 'x', c, -HW, HW, yb, yt, 0.25, M.wallLight, hl);
      for (const h of hl) { const w = h[1] - h[0], hh = h[3] - h[2]; if (f === 0 && sz > 0 && Math.abs(h[0]) < 4) continue; dWin(D, w, hh, (h[0] + h[1]) / 2, (h[2] + h[3]) / 2, c, sz > 0 ? 0 : Math.PI, Math.max(1, Math.round(w / 1.3))); }
    }
    for (const sx of [-1, 1]) {
      // 东西山墙：次卧窗、主卧侧窗；楼道尽端窗
      const c = sx * (HW - 0.125), hl = [];
      for (const sz of [-1, 1]) { const v = (k) => sz * (CZ + k); hl.push([Math.min(v(1.0), v(3.4)), Math.max(v(1.0), v(3.4)), y + 1.45, y + 2.45], [Math.min(v(5.2), v(7.6)), Math.max(v(5.2), v(7.6)), y + 1.45, y + 2.45]); }   // 卧室侧窗在床头板以上
      hl.push([-0.8, 0.8, y + 0.8, y + 2.4]);
      dWall(D, 'z', c, -HD + 0.25, HD - 0.25, yb, yt, 0.25, M.wallLight, hl);
      for (const h of hl) dWin(D, h[1] - h[0], h[3] - h[2], c, (h[2] + h[3]) / 2, (h[0] + h[1]) / 2, sx * Math.PI / 2);
    }
  }
  // 外墙碰撞（玻璃同样不可穿越）；1 层南面大堂入口留门洞
  dSeg(-HW, -HD, HW, -HD); dSeg(-HW, -HD, -HW, HD); dSeg(HW, -HD, HW, HD);
  dSeg(-HW, HD, -1.6, HD); dSeg(1.6, HD, HW, HD); dSeg(-1.6, HD, 1.6, HD, 1, n);
  // ---------------- 阳台：每户南北各一处（户型相同），玻璃栏板 ----------------
  for (let f = 1; f < n; f++) for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
    const y = dormY(f), cx = sx * (4 + 3.3), cz = sz * (HD + 0.75);
    box(D, 6.0, 0.16, 1.5, M.concrete, cx, y + 0.02, cz);
    box(D, 6.0, 1.0, 0.05, M.glassLight, cx, y + 0.62, sz * (HD + 1.48)); box(D, 6.06, 0.05, 0.08, M.metalDark, cx, y + 1.14, sz * (HD + 1.48));
    for (const s of [-1, 1]) box(D, 0.05, 1.0, 1.46, M.glassLight, cx + s * 3.0, y + 0.62, cz);
  }
  for (const sz of [-1, 1]) for (const x of [-HW, -4, 4, HW]) box(D, 0.35, (n - 1) * fl, 1.7, M.wallGray, x, dormY(1) + (n - 1) * fl / 2, sz * (HD + 0.85));   // 分户墙鳍
  // ---------------- 交通核：楼梯间、电梯井、设备间 ----------------
  const CW = 0.2;
  for (let f = 0; f <= n; f++) {
    const y = dormY(f), h = f === n ? 2.8 : fl - 0.2;
    // 楼梯间：东西墙、北墙；南侧敞开接楼道（屋顶层为楼梯出屋面间，南墙开门通屋面）
    dWall(D, 'z', -4, STAIR.zM, -CZ, y, y + h, CW, M.wallWarm);
    dWall(D, 'z', 0, STAIR.zM, -CZ, y, y + h, CW, M.wallWarm);
    dWall(D, 'x', STAIR.zM, -4, 0, y, y + h, CW, M.wallWarm);
    if (f === n) dWall(D, 'x', -CZ, -4, 0, y, y + h, CW, M.wallWarm, [[-3.0, -1.0, y, y + 2.2]]);
    // 电梯井：前墙开两个门洞，中间分隔墙，后墙
    if (f < n) dWall(D, 'x', -CZ, 0, 4, y, y + h, CW, M.wallWarm, LIFT.map(L_ => [L_.cx - 0.55, L_.cx + 0.55, y, y + 2.15]));
    if (f < n) { dWall(D, 'z', 2.0, LZ0, -CZ, y, y + h, 0.12, M.wallGray); dWall(D, 'z', 4, LZ0, -CZ, y, y + h, CW, M.wallWarm); dWall(D, 'x', LZ0, 0, 4, y, y + h, CW, M.wallWarm); }   // 屋顶层井道由电梯机房围合
    if (f < n) {
      // 设备间（电梯井北侧、楼梯间北侧）：封闭
      dWall(D, 'z', 4, -ID, LZ0, y, y + fl - 0.2, CW, M.wallWarm); dWall(D, 'z', -4, -ID, STAIR.zM, y, y + fl - 0.2, CW, M.wallWarm);
      // 电梯厅：门套、楼层号牌
      for (const L_ of LIFT) { box(D, 1.3, 0.12, 0.06, M.alu, L_.cx, y + 2.2, -CZ + 0.13); for (const s of [-1, 1]) box(D, 0.08, 2.2, 0.06, M.alu, L_.cx + s * 0.6, y + 1.1, -CZ + 0.13); box(D, 0.1, 0.18, 0.03, M.metalDark, L_.cx + 0.78, y + 1.15, -CZ + 0.12); box(D, 0.05, 0.05, 0.02, M.red, L_.cx + 0.78, y + 1.18, -CZ + 0.1); }
    }
  }
  // 交通核碰撞（全高）
  dSeg(-4, STAIR.zM, -4, -CZ); dSeg(0, STAIR.zM, 0, -CZ); dSeg(-4, STAIR.zM, 0, STAIR.zM);
  dSeg(0, -CZ, LIFT[0].cx - 0.55, -CZ); dSeg(LIFT[0].cx + 0.55, -CZ, LIFT[1].cx - 0.55, -CZ); dSeg(LIFT[1].cx + 0.55, -CZ, 4, -CZ);
  dSeg(2.0, LZ0, 2.0, -CZ); dSeg(4, LZ0, 4, -CZ); dSeg(0, LZ0, 4, LZ0);
  dSeg(4, -ID, 4, LZ0); dSeg(-4, -ID, -4, STAIR.zM);
  dSeg(-4, -CZ, -3.0, -CZ, n, n); dSeg(-1.0, -CZ, 0, -CZ, n, n);            // 屋面楼梯间南墙（门洞 x∈[-3, -1]）
  // ---------------- 楼梯：两跑折返，1 层直通屋顶 ----------------
  const laneE = -1.05, laneWs = -2.95, lw = 0.8;
  for (let f = 0; f < n; f++) {
    const y = dormY(f), ym = y + fl / 2, y2 = dormY(f + 1);
    // 第一跑（东侧）：楼层平台 → 中间平台；第二跑（西侧）：中间平台 → 上一层平台
    for (const [lx, za, zb, ya, yb2] of [[laneE, STAIR.zL, STAIR.zF, y, ym], [laneWs, STAIR.zF, STAIR.zL, ym, y2]]) {
      const N = 10; for (let k = 0; k < N; k++) { const t0 = k / N, t1 = (k + 1) / N, zz = za + (zb - za) * (t0 + t1) / 2, hy = ya + (yb2 - ya) * t1; box(D, 1.7, 0.19, Math.abs(zb - za) / N + 0.01, M.stone, lx, hy + 0.035 - 0.095, zz); }
      rod(D, new THREE.Vector3(-2.0 + (lx === laneE ? 0.06 : -0.06), ya + 0.95, za), new THREE.Vector3(-2.0 + (lx === laneE ? 0.06 : -0.06), yb2 + 0.95, zb), 0.025, M.metalDark);
      const a = DWZ(za), b = DWZ(zb); COLL.walks.push({ kind: 'ramp', x0: DWX(lx), z0: a, x1: DWX(lx), z1: b, hw: lw, y0: DWY(ya + 0.035), y1: DWY(yb2 + 0.035) });
    }
    box(D, 3.8, 0.2, STAIR.zF - STAIR.zM, M.stone, -2.0, ym + 0.035 - 0.1, (STAIR.zF + STAIR.zM) / 2);          // 中间平台
    COLL.walks.push({ kind: 'rect', x: DWX(-2.0), z: DWZ((STAIR.zF + STAIR.zM) / 2), hw: 1.9, hd: (STAIR.zF - STAIR.zM) / 2, rot: 0, y: DWY(ym + 0.035) });
    // 两跑之间的隔墙（梯段段落 zL→zF），1 层西跑下方封闭
    // 顶层上屋面的一跑：隔墙加高到屋面以上 1.25 m（比扶手高 0.3 m），人从屋面楼梯间不会翻落到下面的梯井
    const hDiv = fl - 0.03 + (f === n - 1 ? 0.03 + 0.035 + 1.25 : 0);
    box(D, 0.12, hDiv, STAIR.zL - STAIR.zF, M.wallWarm, -2.0, y + hDiv / 2, (STAIR.zL + STAIR.zF) / 2);
    dSeg(-2.0, STAIR.zL, -2.0, STAIR.zF, f, f);
  }
  dSeg(-3.9, STAIR.zL, -2.05, STAIR.zL, 0, 0);
  // 屋面楼梯间：东侧梯井（下一层第一跑与中间平台上方）临空边补 1.25 m 高的实墙，与加高的隔墙连成一体
  { const yr = dormY(n), hw = 0.035 + 1.25; box(D, 1.9, hw, 0.12, M.wallWarm, -1.05, yr + hw / 2, STAIR.zL); dSeg(-2.06, STAIR.zL, 0, STAIR.zL, n, n); dSeg(-2.0, STAIR.zL, -2.0, STAIR.zF, n, n); }                                              // 1 层西跑底下（净高不足）不可进入
  // ---------------- 楼道与户门：1～12 层每层四户 ----------------
  const doorGeo = new THREE.BoxGeometry(0.95, 2.1, 0.045); doorGeo.translate(0.475, 1.05, 0);   // 专用几何体（不改共享几何体）
  const handleGeo = new THREE.BoxGeometry(0.14, 0.03, 0.12); handleGeo.translate(0.82, 1.0, 0);
  const doorMat = std(0x7a5a3e, 0.6), total = n * 4;
  DORM.doorIM = new THREE.InstancedMesh(doorGeo, doorMat, total); DORM.handleIM = new THREE.InstancedMesh(handleGeo, M.alu, total);
  for (const im of [DORM.doorIM, DORM.handleIM]) { im.userData.live = true; im.castShadow = true; im.frustumCulled = false; D.add(im); }
  for (let f = 0; f < n; f++) {
    const y = dormY(f), yt = y + fl - 0.2;
    for (const sz of [-1, 1]) {
      const c = sz * CZ;
      // 楼道墙：每户一樘户门（门洞 u ∈ [0.525, 1.475]，即 |x| ∈ [4.525, 5.475]）；1 层与楼上相同
      const gaps = [[-5.475, -4.525], [4.525, 5.475]];
      for (const sx of [-1, 1]) {
        dWall(D, 'x', c + sz * 0.06, sx < 0 ? -IW : 4, sx < 0 ? -4 : IW, y, yt, 0.12, M.wallWarm, [[sx * 4.525, sx * 5.475].sort((a, b) => a - b).concat([y, y + 2.15])]);
        { const x0 = sx * 4.525, x1 = sx * 5.475; box(D, 1.07, 0.1, 0.16, M.woodDark, (x0 + x1) / 2, y + 2.17, c + sz * 0.06); for (const x of [x0, x1]) box(D, 0.06, 2.15, 0.16, M.woodDark, x, y + 1.075, c + sz * 0.06);
          box(D, 0.18, 0.1, 0.02, M.alu, (x0 + x1) / 2, y + 1.65, c - sz * 0.01); }   // 门套、门牌
      }
      dSegRun('x', c, -IW, -4, f, f, gaps); dSegRun('x', c, 4, IW, f, f, gaps);
      if (sz > 0) { dWall(D, 'z', -4, CZ, ID, y, yt, 0.12, M.wallWarm); dWall(D, 'z', 4, CZ, ID, y, yt, 0.12, M.wallWarm); dSeg(-4, CZ, -4, HD, f, f); dSeg(4, CZ, 4, HD, f, f); }
    }
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
      const i = DORM.doors.length, hx = sx * 4.525, hz = sz * CZ, d = { i, f, sx, sz, open: false, ang: 0, hx, hz, name: `${dormFloorName(f)}${sz < 0 ? '北' : '南'}${sx < 0 ? '西' : '东'}户` };
      DORM.doors.push(d);
      dSeg(hx, hz, sx * 5.475, hz, f, f, () => d.ang < 0.35);
      INTERACT.push({ x: DWX(sx * 5.0), z: DWZ(hz), y: DWY(y), r: 1.4, label: () => d.open ? `关上 ${d.name} 的门` : `开门进入 ${d.name}`, fn: () => { d.open = !d.open; } });
      dormUnit(D, f, sx, sz, CZ, IW, ID);
    }
  }
  dormDoorsUpdate(0);
  // ---------------- 电梯：两部，服务 1～12 层；厅门、轿厢门随停靠开合 ----------------
  const leafGeo = new THREE.BoxGeometry(0.56, 2.1, 0.04); leafGeo.translate(0, 1.05, 0);
  DORM.landIM = new THREE.InstancedMesh(leafGeo, M.alu, n * 2 * 2); DORM.landIM.userData.live = true; DORM.landIM.frustumCulled = false; D.add(DORM.landIM);
  for (const [k, L_] of LIFT.entries()) {
    const c = { k, cx: L_.cx, cz: -3.0, y: dormY(0), at: 0, target: 0, queue: [], state: 'idle', door: 0, hold: 0, sel: 0, selT: 0, g: null };
    const g = new THREE.Group(); g.userData.live = true; g.position.set(L_.cx, c.y, c.cz); D.add(g); c.g = g;
    const liv = (m) => { m.userData.live = true; return m; };
    liv(box(g, 1.7, 0.06, 2.9, M.stone, 0, 0.005, -0.05)); liv(box(g, 1.7, 0.06, 2.9, M.ceiling, 0, 2.33, -0.05));
    for (const s of [-1, 1]) liv(box(g, 0.05, 2.3, 2.9, M.alu, s * 0.85, 1.15, -0.05)); liv(box(g, 1.7, 2.3, 0.05, M.alu, 0, 1.15, -1.47));
    liv(box(g, 1.2, 1.6, 0.01, std(0xcfd8dc, 0.08, 0.9), 0, 1.3, -1.44));   // 镜面后壁
    liv(box(g, 1.6, 0.04, 0.05, M.metalDark, 0, 0.9, -1.42)); liv(box(g, 0.3, 0.02, 0.3, M.lamp, 0, 2.29, -0.1));
    liv(box(g, 0.05, 0.9, 0.22, M.metalDark, 0.8, 1.25, 1.05)); for (let b = 0; b < 12; b++) liv(box(g, 0.02, 0.04, 0.04, b % 3 ? M.alu : M.yellow, 0.77, 0.9 + b * 0.055, 1.02 + (b % 2) * 0.07));
    c.leaves = [-1, 1].map(s => liv(box(g, 0.56, 2.1, 0.04, M.alu, s * 0.28, 1.05, 1.36)));
    // 轿厢可行走面（跟随轿厢高度）与轿厢墙、轿厢门碰撞（高度带随轿厢）
    const wx = DWX(L_.cx), wz = DWZ(c.cz);
    COLL.walks.push({ kind: 'rect', x: wx, z: DWZ(-2.85), hw: 0.82, hd: 1.62, rot: 0, get y() { return DWY(c.y + 0.035); } });
    const band = (s) => Object.defineProperties(s, { bottom: { get: () => DWY(c.y) - 0.6 }, top: { get: () => DWY(c.y) + 2.2 } });
    for (const sg of [[-0.85, -1.45, -0.85, 1.4], [0.85, -1.45, 0.85, 1.4], [-0.85, -1.45, 0.85, -1.45]]) COLL.segs.push(band({ ax: wx + sg[0], az: wz + sg[1], bx: wx + sg[2], bz: wz + sg[3] }));
    COLL.segs.push(band({ ax: wx - 0.55, az: DWZ(-1.62), bx: wx + 0.55, bz: DWZ(-1.62), cond: () => c.door < 0.9 }));
    // 各层厅门：轿厢停在本层且门开足时才可通过
    for (let f = 0; f < n; f++) {
      dSeg(L_.cx - 0.55, -CZ, L_.cx + 0.55, -CZ, f, f, () => !(c.at === f && c.door > 0.9));
      INTERACT.push({ x: DWX(L_.cx + 0.78), z: DWZ(-CZ + 0.6), y: DWY(dormY(f)), r: 0.9, label: () => c.at === f && c.door > 0.5 ? `电梯已到 ${dormFloorName(f)}` : `按电梯按钮（${k ? '东' : '西'}梯，现在 ${c.at === null ? '运行中' : dormFloorName(c.at)}）`, fn: () => dormCall(c, f) });
    }
    // 轿厢内按钮：按 E 切换目标楼层，停手 1.5 秒后出发
    INTERACT.push({ get x() { return wx + 0.5; }, get z() { return DWZ(-2.2); }, get y() { return DWY(c.y); }, r: 1.1, label: () => `选择楼层：${dormFloorName(c.sel)}（再按 E 切换，停手 1.5 秒后出发）`, fn: () => { if (c.state === 'moving') return; c.sel = (c.sel + 1) % n; if (c.sel === c.at) c.sel = (c.sel + 1) % n; c.selT = 1.5; } });
    DORM.lifts.push(c);
  }
  dormLiftsUpdate(0);
  // ---------------- 屋顶：女儿墙、出屋面楼梯间、电梯机房、空调外机 ----------------
  box(D, W + 0.3, 1.0, 0.25, M.wallLight, 0, top + 0.5, HD); box(D, W + 0.3, 1.0, 0.25, M.wallLight, 0, top + 0.5, -HD);
  box(D, 0.25, 1.0, Dp, M.wallLight, HW, top + 0.5, 0); box(D, 0.25, 1.0, Dp, M.wallLight, -HW, top + 0.5, 0);
  for (const [a, b, c2, d2] of [[-HW, -HD, HW, -HD], [HW, -HD, HW, HD], [HW, HD, -HW, HD], [-HW, HD, -HW, -HD]]) COLL.segs.push({ ax: DWX(a), az: DWZ(b), bx: DWX(c2), bz: DWZ(d2), bottom: DWY(top) - 0.5, top: DWY(top) + 3 });
  box(D, 4.4, 0.2, -STAIR.zM - CZ + 0.4, M.metalDark, -2.0, top + 2.9, (STAIR.zM - CZ) / 2);        // 楼梯间屋面
  box(D, 4.05, 3.2, -LZ0 - CZ + 0.3, M.wallGray, 2.125, top + 1.6, (LZ0 - CZ) / 2);                  // 电梯机房（西侧贴楼梯间外墙，其余外皮略大于井道墙，不共面）
  box(D, 4.5, 0.2, -LZ0 - CZ + 0.5, M.metalDark, 2.0, top + 3.3, (LZ0 - CZ) / 2);
  for (const sx of [-1, 1]) { box(D, 3, 1.4, 2, M.metalMid, sx * 8, top + 0.7, 5); dRect(sx * 8, 5, 1.6, 1.1, n, 1.6); }
  // ---------------- 1 层大堂与入口 ----------------
  box(D, 9, 0.22, 3.2, M.metalDark, 0, y0 + 3.0, HD + 1.6);
  for (const x of [-4.2, 4.2]) { const gy = gh(DWX(x), DWZ(HD + 3.0)) - 15.0 - 0.15, yt = y0 + 3.0 - 0.11, h = yt - gy;   // 雨篷柱落到柱下地面以下 0.15 m，柱脚加方形底座
    cyl(D, 0.08, 0.08, h, M.metalDark, x, gy + h / 2, HD + 3.0, 8); box(D, 0.32, 0.25, 0.32, M.concreteWarm, x, gy + 0.15 + 0.125 - 0.1, HD + 3.0); collC(DWX(x), DWZ(HD + 3.0), 0.18); }
  for (const s of [-1, 1]) dWin(D, 1.9, 2.7, s * 2.6, y0 + 1.36, HD - 0.12, 0, 2);                    // 大堂玻璃（入口两侧，门洞 x∈[-1.6, 1.6] 敞开）
  { const gz = DWZ(HD + 0.5), g0 = gh(0, DWZ(HD + 2.6)) - 15.0, N = Math.max(1, Math.round((y0 - g0) / 0.15));   // 入口台阶：基座高出地面 y0 - g0
    for (let k = 0; k < N; k++) box(D, 3.4, 0.15 * (k + 1), 0.3, M.concreteWarm, 0, g0 + 0.075 * (k + 1), HD + 0.5 + 0.3 * (N - k));
    COLL.walks.push({ kind: 'ramp', x0: DWX(0), z0: DWZ(HD + 0.5 + 0.3 * N + 0.15), x1: DWX(0), z1: gz - 0.2, hw: 1.7, y0: DWY(g0), y1: DWY(y0 + 0.035) }); }
  // 大堂：信报箱、沙发、绿植
  box(D, 0.35, 1.6, 3.0, M.alu, -3.75, y0 + 0.035 + 0.8, 5.0); dRect(-3.75, 5.0, 0.2, 1.5, 0, 1.6);                 // 信报箱（靠大堂西墙）
  sofaF(D, 2.3, y0 + 0.035, 6.8, -Math.PI / 2, 2.0); dRect(2.3, 6.8, 0.5, 1.05, 0, 1.0);
  // ---------------- 前庭：绿篱、长椅（按所在地面最低点取高，避免悬空） ----------------
  const DY = 15.0, lowest = (cx, cz, hx, hz) => Math.min(gh(cx - hx, cz - hz), gh(cx + hx, cz - hz), gh(cx - hx, cz + hz), gh(cx + hx, cz + hz), gh(cx, cz));
  for (const sx of [-1, 1]) {
    const px = L.dorm.x + sx * 10, pz = L.dorm.z + Dp / 2 + 1.4, py = lowest(px, pz, 3.5, 0.5);
    collR(px, pz, 3.5, 0.5, 0, py + 1.7, py - 0.3); planter(D, 7, 1.0, sx * 10, py - DY, Dp / 2 + 1.4, 0, 'narcissus', [L.dorm.x, DY, L.dorm.z]);   // 花池种水仙（碰撞已登记，planter 不重复登记）
    const bx = L.dorm.x + sx * 5.5, bz = L.dorm.z + Dp / 2 + 2.0, by = lowest(bx, bz, 0.9, 0.25);
    box(D, 1.8, 0.45, 0.5, M.wood, sx * 5.5, by - DY + 0.225, Dp / 2 + 2.0); collR(bx, bz, 0.9, 0.25, 0, by + 1.7, by - 0.3); }
  HELI_SOLIDS.push({ x0: DWX(-HW - 0.2), x1: DWX(HW + 0.2), y0: DWY(0), y1: DWY(top + 1.0), z0: DWZ(-HD - 1.6), z1: DWZ(HD + 1.6) });
  DORM.built = true;
  D.position.set(L.dorm.x, 15.0, L.dorm.z); return D;
}
// 一户的隔墙与内饰（户型坐标 u：离交通核墙的距离 0→10.8；v：离楼道墙的距离 0→8.55；四户按 sx、sz 镜像，完全相同）
export function dormUnit(D, f, sx, sz, CZ, IW, ID) {
  const y = dormY(f), X = (u) => sx * (4 + u), Z = (v) => sz * (CZ + v), ry = (du, dv) => Math.atan2(sx * du, sz * dv);
  const T = 0.12, H = DORM.fl - 0.2;
  const wallU = (u, v0, v1, gaps = []) => { const a = Math.min(Z(v0), Z(v1)), b = Math.max(Z(v0), Z(v1)); dWall(D, 'z', X(u), a, b, y, y + H, T, M.wallWarm, gaps.map(([g0, g1]) => [Math.min(Z(g0), Z(g1)), Math.max(Z(g0), Z(g1)), y, y + 2.1]));
    dSegRun('z', X(u), a, b, f, f, gaps.map(([g0, g1]) => [Math.min(Z(g0), Z(g1)), Math.max(Z(g0), Z(g1))])); };
  const wallV = (v, u0, u1, gaps = []) => { const a = Math.min(X(u0), X(u1)), b = Math.max(X(u0), X(u1)); dWall(D, 'x', Z(v), a, b, y, y + H, T, M.wallWarm, gaps.map(([g0, g1]) => [Math.min(X(g0), X(g1)), Math.max(X(g0), X(g1)), y, y + 2.1]));
    dSegRun('x', Z(v), a, b, f, f, gaps.map(([g0, g1]) => [Math.min(X(g0), X(g1)), Math.max(X(g0), X(g1))])); };
  // 隔墙：卧室区（u ≥ 6.6，次卧、主卧），卫生间（u 4.2～6.6，v 0～2.4）
  wallU(6.6, 0, 8.55, [[2.6, 3.5], [5.0, 5.9]]); wallV(4.25, 6.6, 10.8); wallU(4.2, 0, 2.4); wallV(2.4, 4.2, 6.6, [[4.6, 5.5]]);
  const yF = y + 0.035;                                                      // 面层顶面：家具放在面层上
  const rect = (u, v, hu, hv, h = 1.0) => dRect((X(u - hu) + X(u + hu)) / 2, (Z(v - hv) + Z(v + hv)) / 2, hu, hv, f, h);
  // 玄关鞋柜
  box(D, 0.9, 1.0, 0.35, M.woodDark, X(2.3), yF + 0.5, Z(0.25)); rect(2.3, 0.25, 0.45, 0.18);
  // 厨房：沿交通核墙的一字形橱柜（台面、水槽、灶台、吊柜）与冰箱
  box(D, 0.62, 0.88, 2.8, M.white, X(0.31), yF + 0.44, Z(4.0)); box(D, 0.66, 0.04, 2.84, M.stone, X(0.33), yF + 0.9, Z(4.0));
  box(D, 0.4, 0.02, 0.5, M.alu, X(0.33), yF + 0.925, Z(3.3)); box(D, 0.5, 0.015, 0.6, M.dark, X(0.33), yF + 0.925, Z(4.8));
  box(D, 0.36, 0.7, 2.8, M.white, X(0.18), yF + 1.95, Z(4.0)); box(D, 0.72, 1.9, 0.72, M.aluWhite, X(0.36), yF + 0.95, Z(2.0));
  rect(0.33, 4.0, 0.33, 1.42); rect(0.36, 2.0, 0.36, 0.36, 1.9);
  // 餐桌与四把椅子
  tableF(D, X(2.6), yF, Z(4.0), ry(0, 1), 1.5, 0.9, 0.75); rect(2.6, 4.0, 0.45, 0.75, 0.8);
  for (const [du, dv] of [[-0.62, -0.3], [-0.62, 0.35], [0.62, -0.3], [0.62, 0.35]]) chair(D, X(2.6 + du), yF, Z(4.0 + dv), ry(-Math.sign(du), 0));
  // 客厅：电视柜（交通核墙）、沙发（背靠卧室墙方向）、茶几、地毯、落地灯
  box(D, 0.45, 0.45, 2.0, M.woodDark, X(0.25), yF + 0.225, Z(7.1)); box(D, 0.06, 0.7, 1.3, M.dark, X(0.1), yF + 1.3, Z(7.1));
  sofaF(D, X(4.4), yF, Z(7.1), ry(-1, 0), 2.4); rect(4.4, 7.1, 0.46, 1.22, 0.9);
  rect(0.25, 7.1, 0.23, 1.0, 0.6); rect(3.0, 7.1, 0.5, 0.3, 0.5);   // 电视柜、茶几：矮于 0.65 m，登记碰撞体（不能踩上去）
  tableF(D, X(3.0), yF, Z(7.1), ry(0, 1), 1.0, 0.6, 0.4, M.woodDark); box(D, 2.6, 0.01, 2.0, M.rug, X(3.5), yF + 0.027, Z(7.1)); lampF(D, X(5.4), yF, Z(8.1));
  // 卫生间：马桶、台盆柜与镜子、淋浴间
  box(D, 0.4, 0.4, 0.55, M.white, X(6.2), yF + 0.2, Z(0.45)); box(D, 0.42, 0.45, 0.16, M.white, X(6.2), yF + 0.6, Z(0.18));
  box(D, 1.0, 0.8, 0.5, M.woodDark, X(4.9), yF + 0.4, Z(0.3)); box(D, 0.5, 0.05, 0.4, M.white, X(4.9), yF + 0.83, Z(0.3)); box(D, 0.8, 0.7, 0.02, std(0xcfd8dc, 0.08, 0.9), X(4.9), yF + 1.5, Z(0.07));
  box(D, 0.02, 2.0, 1.0, M.glassLight, X(5.3), yF + 1.0, Z(1.4)); box(D, 0.9, 0.04, 1.0, M.stone, X(5.9), yF + 0.03, Z(1.4));
  rect(6.2, 0.4, 0.22, 0.35, 0.8); rect(4.9, 0.3, 0.5, 0.26, 0.9);
  // 次卧（v 0～4.25）：1.5 m 床（床头靠山墙）、床头柜、衣柜
  bedF(D, X(9.7), yF, Z(2.1), ry(-1, 0), 1.5, 2.0); rect(9.7, 2.1, 1.1, 1.0, 1.0);
  box(D, 1.8, 2.2, 0.6, M.woodDark, X(8.1), yF + 1.1, Z(0.36)); rect(8.1, 0.36, 0.9, 0.3, 2.2);
  // 主卧（v 4.25～8.55）：1.8 m 床、床头柜、衣柜、书桌
  bedF(D, X(9.6), yF, Z(6.7), ry(-1, 0), 1.8, 2.1); rect(9.6, 6.7, 1.15, 1.15, 1.0);
  box(D, 2.2, 2.2, 0.6, M.woodDark, X(8.6), yF + 1.1, Z(4.66)); rect(8.6, 4.66, 1.1, 0.3, 2.2);
  tableF(D, X(7.1), yF, Z(7.9), ry(0, -1), 1.2, 0.55, 0.75); chair(D, X(7.1), yF, Z(7.4), ry(0, 1));
}
// 呼叫：已停在本层且门开着就延长开门时间，否则排队
export function dormCall(c, f) {
  if (c.at === f && (c.state === 'open' || c.state === 'opening')) { c.hold = 5; return; }
  if (c.at === f && c.state === 'idle') { c.queue.unshift(f); return; }
  if (!c.queue.includes(f) && !(c.state === 'moving' && c.target === f)) c.queue.push(f);
}
// 状态：idle（门关、停在 at 层）→ moving（at = null）→ opening → open（保持 5 秒；有排队则缩短）→ closing → idle
export function dormLiftTick(c, dt) {
  if (c.selT > 0) { c.selT -= dt; if (c.selT <= 0 && c.sel !== c.at && !c.queue.includes(c.sel)) c.queue.push(c.sel); }
  if (c.state === 'idle') { if (c.queue.length) { c.target = c.queue.shift(); c.state = c.target === c.at ? 'opening' : 'moving'; if (c.state === 'moving') c.at = null; } }
  else if (c.state === 'closing') { c.door = Math.max(0, c.door - dt / 0.9); if (c.door === 0) c.state = 'idle'; }
  else if (c.state === 'moving') {
    const ty = dormY(c.target), d = ty - c.y, v = Math.min(Math.abs(d) * 1.6 + 0.25, 2.2) * dt;
    if (Math.abs(d) <= v) { c.y = ty; c.at = c.target; c.state = 'opening'; } else c.y += Math.sign(d) * v;
  }
  else if (c.state === 'opening') { c.door = Math.min(1, c.door + dt / 0.9); if (c.door === 1) { c.state = 'open'; c.hold = 5; } }
  else if (c.state === 'open') { if (c.queue.length || c.selT > 0) c.hold = Math.min(c.hold, 1.0); c.hold -= dt; if (c.hold <= 0 && !(c.selT > 0)) c.state = 'closing'; }
}
export const DORM_M4 = new THREE.Matrix4(), DORM_Q = new THREE.Quaternion(), DORM_V = new THREE.Vector3(), DORM_S = new THREE.Vector3(1, 1, 1), DORM_E = new THREE.Euler();
export function dormDoorsUpdate(dt) {
  if (!DORM.doorIM) return; let dirty = false;
  for (const d of DORM.doors) {
    const want = d.open ? 1.45 : 0, a0 = d.ang; d.ang = dt ? clamp(d.ang + Math.sign(want - d.ang) * dt * 2.6, Math.min(a0, want), Math.max(a0, want)) : want;
    if (d.ang === a0 && dt) continue; dirty = true;
    const rot = d.sx > 0 ? -d.sz * d.ang : Math.PI + d.sz * d.ang;       // 向户内开
    DORM_M4.compose(DORM_V.set(d.hx, dormY(d.f) + 0.012, d.hz), DORM_Q.setFromEuler(DORM_E.set(0, rot, 0)), DORM_S); DORM.doorIM.setMatrixAt(d.i, DORM_M4); DORM.handleIM.setMatrixAt(d.i, DORM_M4);
  }
  if (dirty) { DORM.doorIM.instanceMatrix.needsUpdate = true; DORM.handleIM.instanceMatrix.needsUpdate = true; }
}
export function dormLiftsUpdate(dt) {
  const n = DORM.n;
  for (const c of DORM.lifts) {
    if (dt) dormLiftTick(c, dt);
    // 轿厢（已挂到场景根下时按世界坐标摆放）
    if (c.g.parent && c.g.parent.isScene) c.g.position.set(DWX(c.cx), DWY(c.y), DWZ(c.cz)); else c.g.position.set(c.cx, c.y, c.cz);
    c.leaves.forEach((m, s) => { m.position.x = (s ? 1 : -1) * (0.28 + 0.56 * c.door); });
    for (let f = 0; f < n; f++) {
      const o = c.at === f ? c.door : 0;
      for (const s of [0, 1]) { const x = c.cx + (s ? 1 : -1) * (0.28 + 0.56 * o); DORM_M4.compose(DORM_V.set(x, dormY(f) + 0.012, -1.25 + 0.03), DORM_Q.identity(), DORM_S); DORM.landIM.setMatrixAt((f * 2 + c.k) * 2 + s, DORM_M4); }
    }
  }
  if (DORM.landIM) DORM.landIM.instanceMatrix.needsUpdate = true;
}
export function updateDorm(dt) { if (!DORM.built) return; dormDoorsUpdate(Math.min(dt, 0.05)); dormLiftsUpdate(Math.min(dt, 0.05)); }
