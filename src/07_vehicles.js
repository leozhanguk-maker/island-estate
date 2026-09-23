// ======================= 07 载具：Heesen 50m 游艇 / H125 / Cybertruck / Solectrac e70N =======================
function planShape(pts) { const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], -p[1]) : s.moveTo(p[0], -p[1])); s.closePath(); return s; }
function extrudePlan(pts, h, mat, y, parent, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(planShape(pts), { depth: h, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); m.position.y = y; parent.add(m); return m;
}
// 甲板室平面：后端方正、前端收尖圆润
function housePlan(xa, xb, hw, nose = 0.35) {
  const pts = [[xa, -hw], [xb - (xb - xa) * nose, -hw]];
  for (let i = 1; i < 10; i++) { const t = i / 10, a = t * Math.PI / 2; pts.push([xb - (xb - xa) * nose * (1 - Math.sin(a)), -hw * Math.cos(a) * (1 - 0.2 * t)]); }
  pts.push([xb, 0]);
  const half = pts.slice(); for (let i = half.length - 2; i >= 0; i--) pts.push([half[i][0], -half[i][1]]);
  return pts;
}
function offsetPlan(pts, d) { const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length; return pts.map(p => { const dx = p[0] - cx, dz = p[1], l = Math.hypot(dx, dz) || 1; return [p[0] + dx / l * d, p[1] + dz / l * d]; }); }
function buildYacht() {
  const Y = new THREE.Group(), LOA = 49.8, B = 9.2;
  // ---- 船体放样 ----
  const NS = 34, sec = [];
  const hb = (u) => u < 0.5 ? 4.6 * (0.93 + 0.07 * Math.sin(u / 0.5 * Math.PI / 2)) : 4.6 * Math.pow(Math.max(0, 1 - Math.pow((u - 0.5) / 0.5, 2.2)), 0.62) + 0.05;
  const deck = (u) => 2.2 + 1.5 * Math.pow(u, 2.4);
  const keel = (u) => -2.1 + 0.25 * (1 - u) + 2.7 * Math.pow(smoothstep(0.62, 1.0, u), 1.6);
  for (let s = 0; s <= NS; s++) {
    const u = s / NS, x = -LOA / 2 + u * LOA + (u > 0.9 ? (u - 0.9) * 2.5 : 0), b = hb(u), d = deck(u), k = keel(u);
    const pts = [[0, k], [0.5 * b, k + 0.12], [0.85 * b, k + 0.55], [0.98 * b, k + Math.min(1.4, (d - k) * 0.4)], [b, d]];
    sec.push({ x, pts });
  }
  const pos = [], idx = [], ring = 9;
  for (const s of sec) { const full = [...s.pts.slice().reverse().map(p => [-p[0], p[1]]), ...s.pts.slice(1)]; for (const p of full) pos.push(s.x, p[1], p[0]); }
  for (let s = 0; s < NS; s++) for (let k = 0; k < ring - 1; k++) { const a = s * ring + k, b = a + 1, c = a + ring, d = c + 1; idx.push(a, b, c, b, d, c); }
  const tb = pos.length / 3; pos.push(-LOA / 2, 1.2, 0);
  for (let k = 0; k < ring - 1; k++) idx.push(tb, k + 1, k);
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setIndex(idx); hg.computeVertexNormals();
  const hull = new THREE.Mesh(hg, M.yachtWhite); Y.add(hull);
  // 甲板面
  const dpts = []; for (let s = 0; s <= NS; s++) dpts.push([sec[s].x, -sec[s].pts[4][0] + 0.12]); for (let s = NS; s >= 0; s--) dpts.push([sec[s].x, sec[s].pts[4][0] - 0.12]);
  const dshape = planShape(dpts); const dgeo = new THREE.ShapeGeometry(dshape); dgeo.rotateX(-Math.PI / 2);
  const dp = dgeo.attributes.position; for (let i = 0; i < dp.count; i++) { const u = clamp((dp.getX(i) + LOA / 2) / LOA, 0, 1); dp.setY(i, deck(u) + 0.02); } dgeo.computeVertexNormals();
  Y.add(new THREE.Mesh(dgeo, M.teak));
  // 舷墙
  for (const sgn of [-1, 1]) for (let s = 12; s < NS; s++) { const a = sec[s], b = sec[s + 1]; const za = sgn * a.pts[4][0], zb = sgn * b.pts[4][0]; const m = box(Y, Math.hypot(b.x - a.x, zb - za) + 0.05, 0.9, 0.1, M.yachtWhite, (a.x + b.x) / 2, (deck(s / NS) + deck((s + 1) / NS)) / 2 + 0.45, (za + zb) / 2, -Math.atan2(zb - za, b.x - a.x)); }
  box(Y, 1.2, 0.12, 0.1, M.metalDark, 0, 0, 0).visible = false;
  // 水线深色腰线 + 尾部游泳平台
  for (const sgn of [-1, 1]) for (let s = 0; s < NS - 4; s++) { const a = sec[s], b = sec[s + 1]; box(Y, b.x - a.x + 0.05, 0.28, 0.06, M.metalDark, (a.x + b.x) / 2, 0.35, sgn * (a.pts[3][0] + 0.01)); }
  box(Y, 2.4, 0.3, 8.2, M.teak, -LOA / 2 - 1.1, 0.75, 0); box(Y, 2.4, 0.4, 8.2, M.yachtWhite, -LOA / 2 - 1.1, 0.5, 0);
  // ---- 上层建筑（可进入的外壳）：墙体分窗下/窗带/窗上三段，门洞留空 ----
  const YL = { walks: [], segs: [], rects: [], interact: [], seats: [] };
  const ySeat = (x, y, z, yaw, type = 'sit') => YL.seats.push({ x, y, z, yaw, type });   // 船体局部坐标的碰撞与可行走面
  const CEIL_DS = std(0xf2efe8, 0.9, 0, { emissive: 0xf2efe8, emissiveIntensity: 0.28, side: THREE.DoubleSide });
  const ySeg = (ax, az, bx, bz, b0, b1) => YL.segs.push({ ax, az, bx, bz, bottom: b0, top: b1 });
  const glassY = std(0x1a2a36, 0.05, 0.3, { transparent: true, opacity: 0.55, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
  const wallQuad = (p, a, b, y0, y1, mat) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.01 || y1 - y0 < 0.01) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(L, y1 - y0), mat); m.position.set((a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2); m.rotation.y = -Math.atan2(dz, dx); p.add(m); };
  const shell = (pts, y0, h, band, door) => {
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], isAft = Math.abs(a[0] - b[0]) < 1e-6 && a[0] === pts[0][0];
      const pieces = isAft && door ? [[a, [a[0], Math.sign(a[1]) * door]], [[a[0], -Math.sign(a[1]) * door], b]] : [[a, b]];
      for (const [p0, p1] of pieces) { wallQuad(Y, p0, p1, y0, y0 + band[0], M.yachtWhite); wallQuad(Y, p0, p1, y0 + band[0], y0 + band[1], glassY); wallQuad(Y, p0, p1, y0 + band[1], y0 + h, M.yachtWhite); ySeg(p0[0], p0[1], p1[0], p1[1], y0 - 0.3, y0 + 2.2); }
      if (isAft && door) wallQuad(Y, [a[0], -door], [a[0], door], y0 + 2.2, y0 + h, M.yachtWhite);
    }
  };
  const flat = (pts, y, mat, holes = [], walk = true, wy = y) => {
    const sh = new THREE.Shape(); pts.forEach(([x, z], i) => i ? sh.lineTo(x, -z) : sh.moveTo(x, -z));
    for (const hq of holes) { const hp = new THREE.Path(); hq.forEach(([x, z], i) => i ? hp.lineTo(x, -z) : hp.moveTo(x, -z)); sh.holes.push(hp); }
    const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, walk ? mat : CEIL_DS); m.position.y = y; Y.add(m);
    if (walk) YL.walks.push({ kind: 'poly', pts, holes, y: wy });
  };
  const rectPts = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  const mainH = housePlan(-19, 13.5, 3.85, 0.3), upH = housePlan(-12.5, 9.5, 3.55, 0.36);
  const HOLE_UP = rectPts(1.5, 5.6, 1.15, 2.05), HOLE_DN = rectPts(2.2, 5.9, -3.35, -2.45), HOLE_SUN = rectPts(-20.5, -16.0, 2.85, 3.75);
  // 主甲板室：地板、天花、外壳（后墙居中门）
  flat(offsetPlan(mainH, -0.05), 2.45, M.teak, [HOLE_DN]);
  flat(mainH, 5.12, M.ceiling, [HOLE_UP], false);
  shell(mainH, 2.45, 2.7, [0.85, 2.1], 1.1);
  // 上甲板：主甲板室屋顶即上甲板地面（含室外后甲板）；上层甲板室外壳
  flat(mainH, 5.15, M.teak, [HOLE_UP]);
  flat(upH, 7.62, M.ceiling, [], false);
  shell(upH, 5.15, 2.5, [0.8, 1.95], 1.0);
  flat(upH, 7.65, M.teak, [], true);                                               // 日光甲板
  // 上甲板后部遮阳顶（兼作日光甲板后段），楼梯处开洞
  for (const [x0, x1, z0, z1] of [[-23, -8, -4.3, 2.85], [-23, -8, 3.75, 4.3], [-23, -20.5, 2.85, 3.75], [-16.0, -8, 2.85, 3.75]]) { box(Y, x1 - x0, 0.25, z1 - z0, M.yachtWhite, (x0 + x1) / 2, 7.75, (z0 + z1) / 2); YL.walks.push({ kind: 'poly', pts: rectPts(x0, x1, z0, z1), y: 7.88 }); }
  for (const z of [-3.9, 3.9]) for (const x of [-21.5, -17]) box(Y, 0.12, 2.3, 0.12, M.yachtWhite, x, 6.5, z);
  const sunH = housePlan(-5.5, 6.5, 3.2, 0.45);
  extrudePlan(sunH, 1.5, M.yachtWhite, 7.65, Y); extrudePlan(offsetPlan(sunH, 0.04), 0.7, M.yachtGlass, 8.05, Y);
  YL.rects.push({ x: 0.5, z: 0, hw: 6.1, hd: 3.2, rot: 0, bottom: 7.3, top: 9 });
  box(Y, 12, 0.22, 7.8, M.yachtWhite, -2.5, 10.4, 0);
  for (const z of [-3.4, 3.4]) for (const x of [-7.5, -2]) box(Y, 0.12, 1.3, 0.12, M.yachtWhite, x, 9.75, z);
  box(Y, 1.2, 2.2, 0.35, M.yachtWhite, 1.5, 11.6, 0); box(Y, 0.3, 0.2, 3.2, M.metalDark, 1.5, 12.7, 0);
  cyl(Y, 0.35, 0.35, 0.35, M.white, 1.2, 13.0, 0.9, 12); cyl(Y, 0.35, 0.35, 0.35, M.white, 1.2, 13.0, -0.9, 12);
  // 日光甲板躺椅（后段遮阳顶上）
  for (const z of [-2.4, -0.8, 0.8, 2.4]) { lounger(Y, -20.5, 7.88, z, -Math.PI / 2, 0xf2eee6); YL.rects.push({ x: -20.5, z, hw: 1.05, hd: 0.38, rot: 0, bottom: 7.4, top: 9 }); ySeat(-20.5, 7.88 + 0.42, z, Math.PI / 2, 'lie'); }
  // 日光甲板按摩池
  cyl(Y, 1.25, 1.3, 0.55, M.white, -9.5, 7.93, 0, 24); cyl(Y, 1.1, 1.1, 0.05, M.pool, -9.5, 8.2, 0, 24); YL.rects.push({ x: -9.5, z: 0, hw: 1.3, hd: 1.3, rot: 0, bottom: 7.3, top: 9 });
  // ---- 楼梯：主甲板 → 上甲板、主甲板 → 下甲板、上甲板后部 → 日光甲板；船尾游泳平台 → 后甲板 ----
  const yStairs = (x0, z, x1, y0, y1, w, rails = true) => {
    const n = Math.round(Math.abs(y1 - y0) / 0.19), run = (x1 - x0) / n, rise = (y1 - y0) / n;
    for (let i = 0; i < n; i++) box(Y, Math.abs(run) + 0.02, 0.05, w, M.teak, x0 + run * (i + 0.5), y0 + rise * (i + 1) - 0.025, z);
    if (rails) for (const sz of [-1, 1]) railing(Y, [new THREE.Vector3(x0, y0, z + sz * w / 2), new THREE.Vector3(x1, y1, z + sz * w / 2)], 0.9, M.alu, 1.2, 0.02);
    YL.walks.push({ kind: 'ramp', x0, z0: z, x1, z1: z, hw: w / 2, y0: y0 + 0.02, y1: y1 + 0.02 });
    const b0 = Math.min(y0, y1) - 0.3, b1 = Math.max(y0, y1) - 0.4; ySeg(x0, z - w / 2 - 0.05, x1, z - w / 2 - 0.05, b0, b1); ySeg(x0, z + w / 2 + 0.05, x1, z + w / 2 + 0.05, b0, b1);
  };
  yStairs(1.5, 1.6, 5.6, 2.45, 5.15, 0.9);
  yStairs(5.9, -2.9, 2.2, 2.45, 0.3, 0.9);
  yStairs(-20.5, 3.3, -16.0, 5.15, 7.88, 0.9);
  for (const z of [-3.2, 3.2]) yStairs(-25.3, z, -23.0, 0.9, 2.26, 0.9, false);
  // ---- 下甲板：走廊 + 4 间客舱（床、床头柜、灯） ----
  box(Y, 18.4, 0.3, 6.8, M.floorWood, -2.9, 0.15, 0); YL.walks.push({ kind: 'poly', pts: rectPts(-12, 6.2, -3.4, 3.4), y: 0.3 });
  for (const [x0, x1, z0, z1] of [[-12, 6.2, -3.4, -3.4], [-12, 6.2, 3.4, 3.4], [-12, -12, -3.4, 3.4], [6.2, 6.2, -3.4, 3.4]]) { wallQuad(Y, [x0, z0], [x1, z1], 0.1, 2.4, M.yachtWhite); ySeg(x0, z0, x1, z1, -0.3, 2.0); }
  for (const sz of [-1, 1]) {
    for (const [x0, x1] of [[-12, -7], [-7, -2]]) {
      const zc = sz * 0.75; wallQuad(Y, [x0, zc], [x1 - 1.3, zc], 0.1, 2.4, M.wallLight); wallQuad(Y, [x1 - 0.3, zc], [x1, zc], 0.1, 2.4, M.wallLight); wallQuad(Y, [x1 - 1.3, zc], [x1 - 0.3, zc], 2.1, 2.4, M.wallLight);
      ySeg(x0, zc, x1 - 1.3, zc, -0.3, 2.0); ySeg(x1 - 0.3, zc, x1, zc, -0.3, 2.0);
      wallQuad(Y, [x1, zc], [x1, sz * 3.4], 0.1, 2.4, M.wallLight); ySeg(x1, zc, x1, sz * 3.4, -0.3, 2.0);
      const bx = (x0 + x1) / 2 - 0.6, bz = sz * 2.2; bedF(Y, bx, 0.3, bz, Math.PI / 2, 1.5, 2.0, sz > 0 ? 0xe9e4da : 0xdfe6ea); ySeat(bx + 0.2, 0.3 + 0.62, bz, -Math.PI / 2, 'lie');
      YL.rects.push({ x: bx, z: bz, hw: 1.05, hd: 0.8, rot: 0, bottom: -0.5, top: 1.5 }); box(Y, 0.8, 0.03, 0.2, M.lamp, bx, 2.36, bz);
    }
  }
  for (let i = 0; i < 4; i++) box(Y, 1.2, 0.03, 0.2, M.lamp, -10 + i * 4, 2.36, 0);
  box(Y, 18.4, 0.04, 6.8, M.ceiling, -2.9, 2.38, 0);
  // ---- 主甲板室内：主沙龙、餐区、厨房/楼梯厅、船东套房 ----
  // 主沙龙：两组沙发相对、茶几、地毯、酒吧台（高脚凳）、电视柜
  box(Y, 5, 0.02, 3.4, M.rug, -14, 2.47, 0);
  sofaF(Y, -14.5, 2.45, 2.95, Math.PI, 4.0, 0xe8e2d6, [0x2f5f86, 0xb5a07a, 0x2f5f86]); sofaF(Y, -14.5, 2.45, -2.95, 0, 4.0, 0xe8e2d6, [0xb5a07a, 0x2f5f86]);
  tableF(Y, -14.5, 2.45, 0, 0, 1.8, 0.9, 0.42, M.woodDark, M.alu); cyl(Y, 0.1, 0.07, 0.25, std(0xdfe8ee, 0.1, 0.1, { transparent: true, opacity: 0.6 }), -14.2, 3.0, 0.1, 12);
  box(Y, 0.6, 1.1, 2.6, M.woodDark, -9.6, 3.0, 2.2); box(Y, 0.7, 0.05, 2.7, M.stone, -9.6, 3.57, 2.2);
  for (const z of [1.4, 2.2, 3.0]) { cyl(Y, 0.18, 0.18, 0.06, M.cushionDark, -10.35, 3.2, z, 12); cyl(Y, 0.02, 0.02, 0.72, M.alu, -10.35, 2.83, z, 6); }
  box(Y, 0.4, 0.5, 2.2, M.woodDark, -18.5, 2.7, 0); box(Y, 0.05, 0.9, 1.6, std(0x0b0d10, 0.2, 0.2), -18.6, 3.55, 0);
  YL.rects.push({ x: -14.5, z: 2.95, hw: 2.0, hd: 0.45, rot: 0, bottom: 2, top: 4 }, { x: -14.5, z: -2.95, hw: 2.0, hd: 0.45, rot: 0, bottom: 2, top: 4 }, { x: -14.5, z: 0, hw: 0.9, hd: 0.45, rot: 0, bottom: 2, top: 4 }, { x: -9.6, z: 2.2, hw: 0.35, hd: 1.3, rot: 0, bottom: 2, top: 4 }, { x: -18.5, z: 0, hw: 0.2, hd: 1.1, rot: 0, bottom: 2, top: 4 });
  for (const x of [-15.9, -14.5, -13.1]) { ySeat(x, 2.45 + 0.42, 2.8, 0); ySeat(x, 2.45 + 0.42, -2.8, Math.PI); }
  for (const z of [1.4, 2.2, 3.0]) ySeat(-10.35, 3.23, z, -Math.PI / 2);
  tableF(Y, -2.5, 2.45, 0, 0, 3.6, 1.2, 0.76, M.woodDark, M.woodDark); for (let i = 0; i < 4; i++) for (const sz of [-1, 1]) { chair(Y, -3.9 + i * 0.95, 2.45, sz * 0.95, sz > 0 ? Math.PI : 0); ySeat(-3.9 + i * 0.95, 2.45 + 0.48, sz * 0.95, sz > 0 ? 0 : Math.PI); }
  for (const x of [-3.5, -1.5]) cyl(Y, 0.12, 0.08, 0.14, std(0xe8e2d6, 0.4), x, 3.28, 0, 14);
  YL.rects.push({ x: -2.5, z: 0, hw: 2.1, hd: 1.3, rot: 0, bottom: 2, top: 4 });
  box(Y, 2.2, 0.95, 0.7, M.stone, 3.6, 2.95, -0.6); YL.rects.push({ x: 3.6, z: -0.6, hw: 1.1, hd: 0.35, rot: 0, bottom: 2, top: 4 });
  wallQuad(Y, [6.6, -3.7], [6.6, -0.6], 2.45, 5.1, M.wallLight); wallQuad(Y, [6.6, 0.6], [6.6, 2.2], 2.45, 5.1, M.wallLight); ySeg(6.6, -3.7, 6.6, -0.6, 2.2, 4.6); ySeg(6.6, 0.6, 6.6, 2.2, 2.2, 4.6);
  bedF(Y, 10.2, 2.45, 0, -Math.PI / 2, 1.9, 2.1); YL.rects.push({ x: 10.2, z: 0, hw: 1.15, hd: 1.2, rot: 0, bottom: 2, top: 4 }); ySeat(10.0, 2.45 + 0.62, 0, Math.PI / 2, 'lie');
  for (const [x, z] of [[-15, 0], [-8, 0], [-2.5, 0], [3.5, 1.5], [10, 0]]) box(Y, 1.4, 0.03, 0.25, M.lamp, x, 5.08, z);
  // ---- 上层甲板室：天空酒廊 + 驾驶台（舵轮、操控台、屏幕、船长椅） ----
  sofaF(Y, -9, 5.15, 2.6, Math.PI, 3.6, 0x8f949a, [0xb54a3a, 0xe0d6c4]); tableF(Y, -9, 5.15, 1.3, 0, 1.2, 0.7, 0.4, M.woodDark, M.alu); YL.rects.push({ x: -9, z: 2.6, hw: 1.8, hd: 0.45, rot: 0, bottom: 4.8, top: 6.8 }, { x: -9, z: 1.3, hw: 0.6, hd: 0.35, rot: 0, bottom: 4.8, top: 6.8 });
  for (const x of [-10.2, -9, -7.8]) ySeat(x, 5.15 + 0.42, 2.45, 0);
  ySeat(6.0, 5.15 + 0.5, 0, -Math.PI / 2);
  box(Y, 1.0, 0.9, 3.0, M.metalDark, 7.6, 5.6, 0); for (let k = 0; k < 3; k++) { const sc = box(Y, 0.04, 0.45, 0.85, std(0x0e1216, 0.2, 0, { emissive: k === 1 ? 0x2f6a8a : 0x3a5a3a, emissiveIntensity: 0.7 }), 7.12, 6.22, -0.95 + k * 0.95); sc.rotation.z = -0.3; }
  { const wh = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 24), M.woodDark); wh.position.set(6.95, 6.1, 0); wh.rotation.y = Math.PI / 2; wh.rotation.x = 0.35; Y.add(wh); }
  box(Y, 0.7, 0.5, 0.7, M.cushionDark, 6.0, 5.45, 0); box(Y, 0.12, 0.8, 0.7, M.cushionDark, 5.65, 5.95, 0);
  YL.rects.push({ x: 7.6, z: 0, hw: 0.5, hd: 1.5, rot: 0, bottom: 4.8, top: 6.8 });
  YL.interact.push({ x: 6.4, z: 0.9, r: 1.4, y: 5.15, label: '驾驶游艇（舵位）', boatHelm: true });
  for (const [x, z] of [[-9, 0], [-3, 0], [4, 0]]) box(Y, 1.4, 0.03, 0.25, M.lamp, x, 7.58, z);
  // ---- 甲板边界：舷墙/栏杆（按高度带） ----
  railing(Y, [new THREE.Vector3(-19, 5.15, -3.85), new THREE.Vector3(-19, 5.15, 3.85)], 1.0, M.alu, 1.2, 0.025);
  for (const sz of [-1, 1]) { railing(Y, [new THREE.Vector3(-19, 5.15, sz * 3.85), new THREE.Vector3(-12.5, 5.15, sz * 3.85)], 1.0, M.alu, 1.2, 0.025); railing(Y, [new THREE.Vector3(-23, 7.88, sz * 4.3), new THREE.Vector3(9.5, 7.88, sz * 4.3)], 1.0, M.alu, 1.5, 0.025); }
  ySeg(-19, -3.85, -19, 3.85, 4.8, 7); ySeg(-19, -3.85, -12.5, -3.85, 4.8, 7); ySeg(-19, 3.85, -12.5, 3.85, 4.8, 7);
  for (const sz of [-1, 1]) { ySeg(-12.5, sz * 3.6, 9.5, sz * 3.6, 7.3, 9.5); ySeg(-23, sz * 4.3, -12.5, sz * 4.3, 7.5, 9.5); }
  ySeg(-23, -4.3, -23, 4.3, 7.5, 9.5); ySeg(9.5, -3.6, 9.5, 3.6, 7.3, 9.5);
  // 主甲板：后甲板、两舷通道、前甲板；外侧舷墙
  YL.walks.push({ kind: 'poly', pts: rectPts(-24.7, -19, -4.2, 4.2), y: 2.26 });
  for (const sz of [-1, 1]) YL.walks.push({ kind: 'ramp', x0: -19.2, z0: sz * 4.2, x1: 13.8, z1: sz * 4.15, hw: 0.33, y0: 2.26, y1: 3.05 });
  YL.walks.push({ kind: 'ramp', x0: 13.4, z0: 0, x1: 21, z1: 0, hw: 3.2, y0: 3.05, y1: 3.55 });
  YL.walks.push({ kind: 'poly', pts: rectPts(-27.4, -24.9, -4.1, 4.1), y: 0.9 });
  // 后甲板：左右两组沙发 + 柚木茶几
  sofaF(Y, -21.2, 2.26, -3.5, 0, 3.0, 0xefe9dc, [0x2f5f86, 0xd9c29a]); sofaF(Y, -21.2, 2.26, 3.5, Math.PI, 3.0, 0xefe9dc, [0x2f5f86, 0xd9c29a]); tableF(Y, -21.2, 2.26, 0, 0, 1.6, 0.8, 0.42, M.teak, M.alu);
  YL.rects.push({ x: -21.2, z: -3.5, hw: 1.5, hd: 0.45, rot: 0, bottom: 1.8, top: 3.5 }, { x: -21.2, z: 3.5, hw: 1.5, hd: 0.45, rot: 0, bottom: 1.8, top: 3.5 }, { x: -21.2, z: 0, hw: 0.8, hd: 0.4, rot: 0, bottom: 1.8, top: 3.5 });
  for (const x of [-22.2, -21.2, -20.2]) { ySeat(x, 2.26 + 0.42, -3.35, Math.PI); ySeat(x, 2.26 + 0.42, 3.35, 0); }
  box(Y, 3.2, 0.3, 4.6, M.cushionDark, 17.5, deck(0.85) + 0.2, 0);
  for (const sz of [-1, 1]) { ySeg(-24.7, sz * 4.55, 21.5, sz * (hb(0.93) + 0.1), 1.8, 4.5); }
  ySeg(21.5, -hb(0.93) - 0.1, 21.5, hb(0.93) + 0.1, 2.6, 4.5);
  ySeg(-27.45, -4.1, -27.45, 4.1, 0.4, 2.0);                                      // 游泳平台尾缘：不能直接走上浮台
  for (const sz of [-1, 1]) ySeg(-24.85, sz * 2.7, -24.85, sz * 4.2, 1.8, 3.5);
  YL.rects.push({ x: 0, z: 0, hw: 26, hd: 4.8, rot: 0, bottom: -9, top: -0.4 });  // 水下船体（只挡游泳者，不影响下甲板行走）
  // 舷窗、舷梯
  for (const sgn of [-1, 1]) for (let i = 0; i < 8; i++) box(Y, 1.2, 0.35, 0.05, M.yachtGlass, -14 + i * 3.4, 1.35, sgn * (hb(0.2 + i * 0.07) + 0.02));
  box(Y, 1.8, 0.08, 0.9, M.alu, -LOA / 2 - 2.6, 0.9, 0);
  Y.userData.YL = YL;
  Y.position.set(L.yacht.x, 0.0, L.yacht.z); Y.rotation.y = Math.PI;  // 船首朝西，船尾靠东侧登岸浮台
  return Y;
}
// ---------------- Airbus H125（主旋翼直径 10.69m，全长 12.94m） ----------------
function buildH125() {   // 空客 H125（AS350 B3e）：机身长 10.93 m，含旋翼 12.94 m，高 3.34 m，主旋翼直径 10.69 m（3 桨），尾桨 1.86 m（2 桨，尾梁左侧）
  const H = new THREE.Group();
  const white = std(0xf4f5f5, 0.3, 0.1), blue = std(0x163a66, 0.35, 0.2), gold = std(0xc8a24a, 0.35, 0.5), dark = std(0x1b1d20, 0.5, 0.3), glass = std(0x1a2733, 0.05, 0.4, { envMapIntensity: 1.8 });
  // 机身：沿 x 的一系列椭圆截面放样（机头 +x）；上前方为玻璃，下部与腰线涂装
  const secs = [[2.55, 1.18, 0.06, 0.06], [2.42, 1.2, 0.46, 0.44], [2.15, 1.34, 0.74, 0.68], [1.65, 1.5, 0.9, 0.8], [0.9, 1.6, 0.97, 0.86], [0.1, 1.66, 0.98, 0.86], [-0.7, 1.7, 0.92, 0.8], [-1.45, 1.76, 0.74, 0.6], [-2.05, 1.86, 0.44, 0.32], [-2.55, 1.92, 0.22, 0.17]];
  const RING = 24, pos = [], col = [], idx = [];
  const cW = new THREE.Color(0xf4f5f5), cB = new THREE.Color(0x163a66), cG = new THREE.Color(0xc8a24a), cGl = new THREE.Color(0x1a2733);
  secs.forEach(([x, cy, hy, hw], i) => { for (let k = 0; k < RING; k++) { const a = k / RING * TAU, y = cy + Math.sin(a) * hy, z = Math.cos(a) * hw; pos.push(x, y, z);
    let c = cW; const up = Math.sin(a);
    if (x > 0.55 && up > -0.15 && (x > 1.5 || up > 0.25)) c = cGl;                     // 大弧面风挡与顶窗
    else if (x > -1.3 && x < 0.55 && up > 0.05 && up < 0.7 && Math.abs(Math.cos(a)) > 0.4) c = cGl;   // 侧窗
    else if (up < -0.55) c = cB; else if (up < -0.4) c = cG;
    col.push(c.r, c.g, c.b); }
    if (i < secs.length - 1) for (let k = 0; k < RING; k++) { const a = i * RING + k, b = a + RING, a1 = i * RING + (k + 1) % RING, b1 = a1 + RING; idx.push(a, a1, b, a1, b1, b); } });
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); fg.setIndex(idx); fg.computeVertexNormals();
  H.add(new THREE.Mesh(fg, std(0xffffff, 0.25, 0.15, { vertexColors: true, envMapIntensity: 1.4 })));
  for (const sz of [-1, 1]) { box(H, 0.01, 1.05, 0.01, dark, 0.55, 1.75, sz * 0.84); box(H, 0.01, 1.05, 0.01, dark, -0.55, 1.78, sz * 0.84); box(H, 0.01, 1.0, 0.01, dark, -1.25, 1.8, sz * 0.72); box(H, 0.05, 0.02, 0.18, M.alu, -0.1, 1.45, sz * 0.86); }
  // 发动机整流罩与排气管
  { const cw = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.6, 6, 12), white); cw.rotation.z = Math.PI / 2; cw.scale.set(0.9, 1, 1); cw.position.set(-1.1, 2.62, 0); H.add(cw); box(H, 1.2, 0.08, 0.6, dark, -1.2, 2.3, 0); for (let i = 0; i < 5; i++) box(H, 0.02, 0.18, 0.3, dark, -1.7 + i * 0.08, 2.72, 0.42); const ex = cyl(H, 0.12, 0.15, 0.5, dark, -2.05, 2.55, 0.35, 12); ex.rotation.z = Math.PI / 2; ex.rotation.y = -0.4; }
  // 尾梁、平尾（端板）、上下垂尾、尾撬
  { const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 4.9, 12), white); tb.rotation.z = Math.PI / 2; tb.position.set(-4.95, 2.0, 0); tb.rotation.x = 0; H.add(tb); box(H, 4.9, 0.04, 0.04, blue, -4.95, 2.1, 0.17); }
  box(H, 0.55, 0.05, 2.2, white, -6.2, 2.05, 0); for (const sz of [-1, 1]) { const ep = box(H, 0.5, 0.55, 0.04, blue, -6.25, 2.1, sz * 1.1); ep.rotation.z = 0.1; }
  { const vf = new THREE.Shape(); vf.moveTo(0, 0); vf.lineTo(-0.75, 0); vf.lineTo(-0.95, 1.1); vf.lineTo(-0.6, 1.1); vf.closePath(); const g = new THREE.ExtrudeGeometry(vf, { depth: 0.05, bevelEnabled: false }); g.translate(0, 0, -0.025); const m = new THREE.Mesh(g, white); m.position.set(-6.9, 2.05, 0); H.add(m);
    const lf = new THREE.Shape(); lf.moveTo(0, 0); lf.lineTo(-0.6, 0); lf.lineTo(-0.8, -0.65); lf.lineTo(-0.5, -0.65); lf.closePath(); const g2 = new THREE.ExtrudeGeometry(lf, { depth: 0.05, bevelEnabled: false }); g2.translate(0, 0, -0.025); const m2 = new THREE.Mesh(g2, white); m2.position.set(-6.9, 2.0, 0); H.add(m2); rod(H, new THREE.Vector3(-7.4, 1.37, 0), new THREE.Vector3(-7.0, 1.5, 0), 0.015, dark, 4); }
  // 滑橇起落架：两根滑管（前端上翘）+ 两根弧形横管
  for (const sz of [-1, 1]) { const sk = cyl(H, 0.045, 0.045, 3.3, M.alu, -0.1, 0.06, sz * 1.14, 10); sk.rotation.z = Math.PI / 2; rod(H, new THREE.Vector3(1.55, 0.06, sz * 1.14), new THREE.Vector3(1.9, 0.3, sz * 1.14), 0.045, M.alu, 10);
    for (const x of [0.75, -0.95]) { rod(H, new THREE.Vector3(x, 0.08, sz * 1.14), new THREE.Vector3(x, 0.55, sz * 0.95), 0.05, M.alu, 8); rod(H, new THREE.Vector3(x, 0.55, sz * 0.95), new THREE.Vector3(x, 0.78, sz * 0.45), 0.05, M.alu, 8); } box(H, 0.7, 0.05, 0.18, M.alu, 0.2, 0.62, sz * 0.9); }
  // 主旋翼（可转动）：桨毂 + 3 片桨叶；尾桨 2 片（尾梁左侧）
  cyl(H, 0.09, 0.12, 0.45, dark, -0.25, 3.05, 0, 10);
  const rotor = new THREE.Group(); rotor.position.set(-0.25, 3.32, 0); H.add(rotor);
  cyl(rotor, 0.28, 0.28, 0.12, dark, 0, 0, 0, 3); cyl(rotor, 0.08, 0.1, 0.25, dark, 0, 0.15, 0, 8);
  for (let k = 0; k < 3; k++) { const bl = new THREE.Group(); bl.rotation.y = k / 3 * TAU; rotor.add(bl); const b1 = box(bl, 5.1, 0.04, 0.35, dark, 2.85, -0.03, 0); b1.rotation.z = -0.012; box(bl, 0.3, 0.05, 0.36, std(0xd8b43a, 0.5), 5.25, -0.09, 0); }
  const trotor = new THREE.Group(); trotor.position.set(-7.25, 2.2, -0.2); H.add(trotor);
  for (let k = 0; k < 2; k++) { const bl = box(trotor, 0.12, 0.93, 0.02, dark, 0, 0, 0); bl.rotation.z = k * Math.PI; bl.geometry.translate(0, 0.465, 0); }
  cyl(trotor, 0.07, 0.07, 0.1, dark, 0, 0, 0, 8).rotation.x = Math.PI / 2;
  // 灯：左红右绿航行灯、红色防撞灯（机腹与尾部）
  cyl(H, 0.04, 0.04, 0.03, std(0xff2020, 0.3, 0, { emissive: 0xff2020, emissiveIntensity: 2 }), -6.25, 2.4, -1.12, 8); cyl(H, 0.04, 0.04, 0.03, std(0x20ff40, 0.3, 0, { emissive: 0x20ff40, emissiveIntensity: 2 }), -6.25, 2.4, 1.12, 8);
  cyl(H, 0.06, 0.06, 0.08, std(0xff2020, 0.3, 0, { emissive: 0xff1010, emissiveIntensity: 1.5 }), -0.4, 0.68, 0, 10);
  // 驾驶舱内饰（第一人称）：仪表板、座椅、周期杆
  box(H, 0.3, 0.3, 1.3, dark, 1.8, 1.25, 0); box(H, 0.02, 0.2, 0.9, std(0x0e1216, 0.2, 0, { emissive: 0x2f6a8a, emissiveIntensity: 0.5 }), 1.64, 1.33, 0).rotation.z = 0.3;
  for (const sz of [-1, 1]) { box(H, 0.5, 0.12, 0.5, std(0x3a3c40, 0.8), 0.9, 0.95, sz * 0.4); box(H, 0.1, 0.65, 0.5, std(0x3a3c40, 0.8), 0.62, 1.3, sz * 0.4); }
  rod(H, new THREE.Vector3(1.3, 0.85, 0.4), new THREE.Vector3(1.35, 1.35, 0.4), 0.02, dark, 5);
  H.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  H.userData = { rotor, trotor };
  return H;
}

// ---------------- Tesla Cybertruck（1:1：长 5.683 宽 2.027 高 1.791 m，轴距 3.665 m，35 英寸轮胎） ----------------
function buildCybertruck() {
  const C = new THREE.Group(), body = new THREE.Group(); C.add(body);
  const steel = std(0xb9bec2, 0.34, 0.9, { envMapIntensity: 1.25 }), dark = std(0x1c1d1f, 0.7, 0.2), glass = M.yachtGlass;
  const Lh = 5.683 / 2, Wb = 2.027, WB = 3.665;
  // 车身侧视轮廓：前保险杠—前舱盖—风挡—车顶尖点—直线尾斜面（货箱盖）—尾门
  const prof = [[-Lh, 0.52], [-Lh, 1.12], [-0.25, 1.791], [1.05, 1.25], [Lh - 0.05, 1.02], [Lh, 0.92], [Lh, 0.52], [Lh - 0.35, 0.4], [-Lh + 0.35, 0.4]];
  const shape = new THREE.Shape(); prof.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath();
  const eg = new THREE.ExtrudeGeometry(shape, { depth: Wb - 0.16, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.05, bevelSegments: 1 });
  eg.translate(0, 0, -(Wb - 0.16) / 2);
  { const p = eg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); const k = 1 - 0.1 * smoothstep(1.0, 1.791, y); p.setZ(i, z * k); } eg.computeVertexNormals(); }   // 上部内收
  body.add(new THREE.Mesh(eg, steel));
  // 侧窗（梯形）与风挡、天窗
  const win = new THREE.Shape(); [[-1.55, 1.2], [-0.25, 1.72], [0.95, 1.26], [0.95, 1.18], [-1.55, 1.12]].forEach(([x, y], i) => i ? win.lineTo(x, y) : win.moveTo(x, y)); win.closePath();
  for (const s of [-1, 1]) { const wg = new THREE.ShapeGeometry(win); const m = new THREE.Mesh(wg, glass); m.position.z = s * (Wb / 2 - 0.02 - 0.05); m.scale.z = 1; if (s < 0) m.rotation.y = Math.PI, m.position.x = 0, m.scale.x = -1; body.add(m); }
  { const wsd = new THREE.Vector3(1.05 - -0.25, 1.25 - 1.791, 0), len = wsd.length(); const m = box(body, len, 0.02, Wb * 0.84, glass, (1.05 - 0.25) / 2, (1.25 + 1.791) / 2 + 0.01, 0); m.rotation.z = Math.atan2(1.25 - 1.791, 1.05 + 0.25); }
  { const m = box(body, 1.1, 0.02, Wb * 0.8, glass, -0.85, 1.52 + 0.02, 0); m.rotation.z = Math.atan2(1.791 - 1.12, Lh - 0.25) * 0.93; }
  // 灯带、刮水器、后视镜、门缝、防撞梁、货箱盖分缝
  box(body, 0.04, 0.035, Wb * 0.98, std(0xffffff, 0.3, 0, { emissive: 0xf4f6ff, emissiveIntensity: 1.6 }), Lh + 0.02, 1.0, 0);
  box(body, 0.04, 0.05, Wb * 0.98, std(0xb81c1c, 0.4, 0, { emissive: 0x9a0f0f, emissiveIntensity: 1.2 }), -Lh - 0.02, 1.08, 0);
  box(body, 1.25, 0.02, 0.03, dark, 0.45, 1.53, 0).rotation.z = -0.36;
  for (const s of [-1, 1]) { const mg = box(body, 0.18, 0.1, 0.2, steel, 0.95, 1.2, s * (Wb / 2 + 0.1)); mg.rotation.y = s * 0.2; box(body, 0.02, 0.12, 0.2, dark, 0.95, 0.72, s * (Wb / 2 - 0.02)); }
  for (const s of [-1, 1]) for (const x of [-1.1, 0.5]) box(body, 0.01, 0.62, 0.01, dark, x, 0.95, s * (Wb / 2 - 0.035));
  box(body, 0.02, 0.01, Wb * 0.86, dark, -1.7, 1.4, 0);
  box(body, 0.3, 0.16, Wb * 0.9, dark, Lh - 0.12, 0.48, 0); box(body, 0.3, 0.16, Wb * 0.9, dark, -Lh + 0.12, 0.48, 0);
  // 梯形黑色轮拱饰板
  for (const s of [-1, 1]) for (const x of [WB / 2, -WB / 2]) {
    const arch = new THREE.Shape(); [[-0.66, 0.36], [-0.44, 0.98], [0.44, 0.98], [0.66, 0.36], [0.56, 0.36], [0.36, 0.88], [-0.36, 0.88], [-0.56, 0.36]].forEach(([ax, ay], i) => i ? arch.lineTo(ax, ay) : arch.moveTo(ax, ay)); arch.closePath();
    const ag = new THREE.ExtrudeGeometry(arch, { depth: 0.06, bevelEnabled: false }); const m = new THREE.Mesh(ag, dark); m.position.set(x, 0, s * (Wb / 2 - 0.01) - (s < 0 ? 0.06 : 0)); body.add(m);
  }
  box(body, 5.1, 0.25, Wb * 0.86, dark, 0, 0.36, 0);
  // 车轮：35 英寸轮胎 + 20 英寸气动轮罩；前轮可转向
  const wheels = [];
  for (const [x, s, front] of [[WB / 2, 1, true], [WB / 2, -1, true], [-WB / 2, 1, false], [-WB / 2, -1, false]]) {
    const piv = new THREE.Group(); piv.position.set(x, 0.445, s * 0.86); C.add(piv);
    const spin = new THREE.Group(); piv.add(spin);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.445, 0.445, 0.29, 28), M.rubber); tire.rotation.x = Math.PI / 2; spin.add(tire);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.3, 24), std(0x2a2c2f, 0.45, 0.6)); cap.rotation.x = Math.PI / 2; spin.add(cap);
    for (let k = 0; k < 6; k++) { const sp = box(spin, 0.02, 0.26, 0.012, std(0x9ea3a8, 0.4, 0.8), 0, 0, s * 0.152); sp.rotation.z = k * Math.PI / 3; }
    wheels.push({ piv, spin, front });
  }
  // 驾驶位视角用的座舱（隐藏外壳时显示）：前舱盖、A 柱、仪表台、中控屏、方向盘（Yoke）、玻璃车顶、座椅
  const cab = new THREE.Group(); cab.visible = false; C.add(cab);
  { const hood = box(cab, Math.hypot(Lh - 1.05, 0.23), 0.04, Wb * 0.94, steel, (1.05 + Lh) / 2, 1.13, 0); hood.rotation.z = -Math.atan2(1.25 - 1.02, Lh - 1.05); box(cab, Lh - 1.0, 0.62, Wb * 0.98, steel, (1.0 + Lh) / 2, 0.78, 0); box(cab, 0.04, 0.03, Wb * 0.95, std(0xffffff, 0.3, 0, { emissive: 0xf4f6ff, emissiveIntensity: 1.6 }), Lh, 1.0, 0); }
  for (const s of [-1, 1]) { const a = new THREE.Vector3(1.05, 1.25, s * 0.93), b = new THREE.Vector3(-0.25, 1.78, s * 0.8); rod(cab, a, b, 0.045, dark, 6); rod(cab, b, new THREE.Vector3(-1.9, 1.35, s * 0.9), 0.04, dark, 6); rod(cab, new THREE.Vector3(1.0, 1.1, s * 0.95), new THREE.Vector3(-1.9, 1.1, s * 0.95), 0.03, dark, 5); }
  box(cab, 0.5, 0.14, Wb * 0.9, std(0x2a2b2e, 0.7), 0.95, 1.08, 0);
  const scr = box(cab, 0.02, 0.26, 0.42, std(0x0e1216, 0.2, 0, { emissive: 0x3a5a78, emissiveIntensity: 0.6 }), 0.78, 1.26, 0.02); scr.rotation.z = 0.35;
  { const yk = new THREE.Group(); yk.position.set(0.66, 1.16, -0.42); yk.rotation.z = 0.35; cab.add(yk); box(yk, 0.05, 0.2, 0.32, dark, 0, 0, 0); for (const s of [-1, 1]) box(yk, 0.06, 0.24, 0.07, dark, 0, 0.02, s * 0.17); box(yk, 0.03, 0.08, 0.1, std(0x33373c, 0.4, 0.6), 0.03, 0, 0); }
  { const roof = new THREE.Mesh(new THREE.PlaneGeometry(1.7, Wb * 0.82), std(0x14202a, 0.1, 0.2, { transparent: true, opacity: 0.55, side: THREE.DoubleSide })); roof.rotation.set(Math.PI / 2, 0, 0); roof.rotateY(Math.atan2(1.78 - 1.4, 1.65)); roof.position.set(-1.05, 1.6, 0); cab.add(roof); }
  box(cab, 0.55, 0.5, 0.55, std(0xf0ede6, 0.8), -0.2, 0.75, 0.42); box(cab, 0.12, 0.7, 0.55, std(0xf0ede6, 0.8), -0.5, 1.1, 0.42);
  box(cab, 1.5, 0.05, Wb * 0.9, dark, 0.2, 0.55, 0);
  C.userData = { body, cab, wheels, spec: { name: 'Cybertruck', L: 5.683, W: 2.03, wb: WB, track: 1.72, r: 0.445, vmax: 30, acc: 5.2, brake: 9, steer: 0.52, eye: [0.05, 1.32, -0.42], chase: [7.8, 2.6] } };
  C.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return C;
}
// ---------------- Solectrac e70N 纯电窄体拖拉机（宽约 1.37m，蓝色涂装） ----------------
function buildTractor() {
  const T = new THREE.Group(), blue = std(0x1f5aa6, 0.45, 0.2), dark = M.metalDark;
  box(T, 1.9, 0.75, 0.95, blue, 0.75, 1.05, 0);          // 电池/引擎盖
  box(T, 0.3, 0.6, 0.9, dark, 1.75, 1.0, 0);             // 前格栅
  box(T, 1.6, 0.35, 0.8, dark, 0.2, 0.6, 0);
  box(T, 0.9, 0.5, 1.0, blue, -0.6, 1.0, 0);             // 挡泥板/座椅底座
  box(T, 0.45, 0.5, 0.45, M.dark, -0.55, 1.45, 0);
  box(T, 0.1, 0.55, 0.45, M.dark, -0.8, 1.75, 0);
  cyl(T, 0.02, 0.02, 0.5, dark, -0.1, 1.55, 0, 5, 0, 0.5); cyl(T, 0.18, 0.18, 0.03, dark, 0.0, 1.8, 0, 12, 0, 0.5);
  for (const s of [-1, 1]) { box(T, 0.07, 1.25, 0.07, dark, -0.95, 1.95, s * 0.58); box(T, 0.8, 0.7, 0.04, blue, -0.55, 1.2, s * 0.62); }
  box(T, 0.07, 0.07, 1.23, dark, -0.95, 2.55, 0);
  box(T, 1.2, 0.06, 1.3, blue, -0.6, 2.6, 0);            // 遮阳顶
  for (const [x, z, r, w] of [[-0.75, 0.62, 0.62, 0.34], [-0.75, -0.62, 0.62, 0.34], [1.25, 0.56, 0.38, 0.24], [1.25, -0.56, 0.38, 0.24]]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 18), M.rubber); wh.rotation.x = Math.PI / 2; wh.position.set(x, r, z); T.add(wh);
    cyl(T, r * 0.6, r * 0.6, w + 0.02, M.yellow, x, r, z, 12, Math.PI / 2);
  }
  box(T, 0.3, 0.2, 0.7, dark, -1.35, 0.55, 0);          // 三点悬挂
  T.userData = { wheels: [], spec: { name: 'Solectrac e70N', L: 3.3, W: 1.37, wb: 2.0, track: 1.2, r: 0.5, vmax: 8, acc: 2.2, brake: 5, steer: 0.62, eye: [-0.55, 1.9, 0], chase: [7, 3] } };
  T.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return T;
}
