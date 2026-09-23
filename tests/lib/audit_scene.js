// 场景体检（页面端）：在 #still 调试模式下，基于烘焙前的构件分组 __statics 与碰撞登记 COLL 做静态检查。
// 返回 { checks: { 名称: [问题...] }, stats }；每个问题带坐标与说明。
(() => {
  const TH = __statics.THREE, D = __dbg, T = __fp._test, S = __sim, gh = D.gh;
  const r2 = (v) => Math.round(v * 100) / 100;
  const out = {}, stats = {};
  const add = (check, it) => (out[check] = out[check] || []).push(it);
  const hex = (m) => (m && m.color ? '#' + m.color.getHexString() : '?');

  // ---------- 收集构件 ----------
  const meshes = [];
  __statics.groups.forEach((g, gi) => { g.updateMatrixWorld(true); g.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    meshes.push({ o, gi, bb, mat: o.material, tr: !!(o.material && o.material.transparent), live: !!o.userData.live });
  }); });
  stats.meshes = meshes.length;
  const sz = new TH.Vector3();
  const vol = (b) => { b.getSize(sz); return sz.x * sz.y * sz.z; };
  // 空间索引
  const CELL = 6, idx = new Map(), key = (i, j) => i * 100003 + j;
  meshes.forEach((m, k) => { for (let i = Math.floor(m.bb.min.x / CELL); i <= Math.floor(m.bb.max.x / CELL); i++) for (let j = Math.floor(m.bb.min.z / CELL); j <= Math.floor(m.bb.max.z / CELL); j++) { const q = key(i, j); if (!idx.has(q)) idx.set(q, []); idx.get(q).push(k); } });
  const nearMeshes = (b, pad = 0) => { const s = new Set(); for (let i = Math.floor((b.min.x - pad) / CELL); i <= Math.floor((b.max.x + pad) / CELL); i++) for (let j = Math.floor((b.min.z - pad) / CELL); j <= Math.floor((b.max.z + pad) / CELL); j++) { const l = idx.get(key(i, j)); if (l) l.forEach(k => s.add(k)); } return s; };
  // 地形在包围盒投影范围内的最低/最高
  const terr = (b) => { let lo = 1e9, hi = -1e9; for (const [x, z] of [[b.min.x, b.min.z], [b.max.x, b.min.z], [b.min.x, b.max.z], [b.max.x, b.max.z], [(b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2]]) { const h = gh(x, z); lo = Math.min(lo, h); hi = Math.max(hi, h); } return [lo, hi]; };
  const where = (b) => ({ x: r2((b.min.x + b.max.x) / 2), z: r2((b.min.z + b.max.z) / 2), y: r2(b.min.y) });
  const desc = (m) => `${m.o.geometry.type.replace('Geometry', '')} ${hex(m.mat)}（分组#${m.gi}，${r2(m.bb.max.x - m.bb.min.x)}×${r2(m.bb.max.y - m.bb.min.y)}×${r2(m.bb.max.z - m.bb.min.z)} m）`;

  // ---------- 1. 悬空 / 埋地：按包围盒接触关系分连通块，整块都不着地即悬空 ----------
  {
    const par = meshes.map((_, i) => i), find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    const e = 0.06, tb = new TH.Box3();   // 接触容差 6 cm
    meshes.forEach((m, i) => { tb.copy(m.bb).expandByScalar(e); for (const k of nearMeshes(tb)) if (k > i && meshes[k].gi === m.gi && tb.intersectsBox(meshes[k].bb)) { const a = find(i), b = find(k); if (a !== b) par[a] = b; } });
    const comp = new Map();
    meshes.forEach((m, i) => { const r = find(i); if (!comp.has(r)) comp.set(r, []); comp.get(r).push(m); });
    stats.components = comp.size;
    for (const list of comp.values()) {
      let grounded = false; const cb = new TH.Box3();
      for (const m of list) { cb.union(m.bb); const [, hi] = terr(m.bb); if (m.bb.min.y <= hi + 0.08) grounded = true; }
      const [lo, hi] = terr(cb); cb.getSize(sz);
      if (!grounded && vol(cb) > 0.01) add('悬空', { ...where(cb), gap: r2(cb.min.y - hi), n: list.length, msg: `${list.length} 个构件组成的整体离地 ${r2(cb.min.y - hi)} m，没有接触地面或其他构件：${desc(list[0])}` });
      if (cb.max.y < lo - 0.05 && !T.waterAt(where(cb).x, where(cb).z)) add('埋地', { ...where(cb), n: list.length, msg: `${list.length} 个构件整体埋在地面以下 ${r2(lo - cb.max.y)} m：${desc(list[0])}` });
      else if (sz.y < 3 && sz.x * sz.z < 30 && cb.min.y < lo - 0.3 && !T.waterAt(where(cb).x, where(cb).z)) add('下沉入地', { ...where(cb), n: list.length, msg: `构件底部低于地面 ${r2(lo - cb.min.y)} m（高 ${r2(sz.y)} m）：${desc(list[0])}` });
    }
  }

  // ---------- 2. 碰撞体重叠 / 重复 ----------
  {
    const inBandOverlap = (a, b) => { const a0 = a.bottom ?? -1e9, a1 = a.top ?? 1e9, b0 = b.bottom ?? -1e9, b1 = b.top ?? 1e9; return Math.min(a1, b1) - Math.max(a0, b0) > 0.1; };
    const segs = S.SOL.segs, seen = new Map();
    segs.forEach((g, i) => { const k = [g.ax, g.az, g.bx, g.bz].map(v => Math.round(v * 20)).sort((a, b) => a - b).join(',') + '|' + Math.round((g.bottom ?? -1e9) * 10) + '|' + Math.round((g.top ?? 1e9) * 10);
      if (seen.has(k)) add('碰撞体重叠', { x: r2((g.ax + g.bx) / 2), z: r2((g.az + g.bz) / 2), y: r2(g.bottom ?? 0), msg: `重复登记的墙线段 (${r2(g.ax)},${r2(g.az)})→(${r2(g.bx)},${r2(g.bz)}) 高度带 ${r2(g.bottom)}~${r2(g.top)}` }); else seen.set(k, i); });
    // 矩形/圆柱：小的一方有 90% 以上落在另一方内部
    const solids = S.SOL.rects.map(r => ({ t: 'r', o: r, R: Math.hypot(r.hw, r.hd) })).concat(S.SOL.circles.map(c => ({ t: 'c', o: c, R: c.r })));
    const inside = (s, x, z) => s.t === 'c' ? Math.hypot(x - s.o.x, z - s.o.z) < s.o.r : (() => { const c = Math.cos(s.o.rot || 0), n = Math.sin(s.o.rot || 0), dx = x - s.o.x, dz = z - s.o.z; return Math.abs(c * dx - n * dz) < s.o.hw && Math.abs(n * dx + c * dz) < s.o.hd; })();
    const samples = (s) => { const p = []; for (let i = 0; i < 25; i++) { const u = (i % 5) / 4 - 0.5, v = Math.floor(i / 5) / 4 - 0.5; if (s.t === 'c') { if (u * u + v * v <= 0.25) p.push([s.o.x + u * 2 * s.o.r * 0.95, s.o.z + v * 2 * s.o.r * 0.95]); } else { const c = Math.cos(s.o.rot || 0), n = Math.sin(s.o.rot || 0), lx = u * 2 * s.o.hw * 0.95, lz = v * 2 * s.o.hd * 0.95; p.push([s.o.x + c * lx + n * lz, s.o.z - n * lx + c * lz]); } } return p; };
    const grid = new Map(); solids.forEach((s, i) => { const k = key(Math.floor(s.o.x / 4), Math.floor(s.o.z / 4)); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
    let pairs = 0;
    solids.forEach((a, i) => { const gx = Math.floor(a.o.x / 4), gz = Math.floor(a.o.z / 4);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const k of grid.get(key(gx + di, gz + dj)) || []) { if (k <= i) continue; const b = solids[k];
        if (Math.hypot(a.o.x - b.o.x, a.o.z - b.o.z) > a.R + b.R || !inBandOverlap(a.o, b.o)) continue;
        const [sm, lg] = a.R <= b.R ? [a, b] : [b, a], ps = samples(sm); const f = ps.filter(([x, z]) => inside(lg, x, z)).length / Math.max(1, ps.length);
        if (f >= 0.9) { pairs++; add('碰撞体重叠', { x: r2(sm.o.x), z: r2(sm.o.z), y: r2(sm.o.bottom ?? 0), msg: `${sm.t === 'c' ? '圆柱 r=' + r2(sm.o.r) : '矩形 ' + r2(sm.o.hw * 2) + '×' + r2(sm.o.hd * 2)} 有 ${Math.round(f * 100)}% 落在另一个${lg.t === 'c' ? '圆柱 r=' + r2(lg.o.r) : '矩形 ' + r2(lg.o.hw * 2) + '×' + r2(lg.o.hd * 2)}内部（冗余碰撞体）` }); } } });
    stats.solidPairs = pairs;
  }

  // ---------- 3. 可踏上 / 可走入的构件未登记可行走面或碰撞 ----------
  //   对每个不透明立方体构件取顶面中心与内缩点：
  //   · 顶面比脚下可行走面高 0.12~0.65 m、且从外侧能迈进来 → 人会“陷进”构件（未登记可行走面）
  //   · 构件高过膝盖、人能直接走进它的范围 → 可穿过（未登记碰撞）
  {
    const up = new TH.Vector3(), c = new TH.Vector3(), q = new TH.Quaternion(), s3 = new TH.Vector3();
    let n1 = 0, n2 = 0;
    for (const m of meshes) {
      if (m.tr || m.live || m.o.geometry.type !== 'BoxGeometry') continue;
      m.o.matrixWorld.decompose(c, q, s3); up.set(0, 1, 0).applyQuaternion(q);
      if (up.y < 0.995) continue;                                  // 只看水平放置的
      const p = m.o.geometry.parameters, w = p.width * s3.x, h = p.height * s3.y, d = p.depth * s3.z;
      if (w * d < 0.35 || Math.min(w, d) < 0.45) continue;
      const top = c.y + h / 2, bot = c.y - h / 2;
      if (top > 200) continue;
      const fl = T.floorAt(c.x, c.z, top + 0.05);                   // 站在顶面高度时脚下的可行走面
      const base = T.floorAt(c.x, c.z, bot + 0.3);                   // 构件底部所在的地面/楼面
      if (Math.abs(fl - top) < 0.12) continue;                       // 顶面已登记为可行走面
      if (S.insideSolid(c.x, c.z, base + 0.3) || S.insideSolid(c.x, c.z, top - 0.05)) continue;   // 有实心碰撞体
      // 构件四周是否能走过来：从各边外 0.45 m 处朝中心迈步
      const yaw = Math.atan2(-(2 * (q.x * q.z + q.w * q.y)), 1 - 2 * (q.y * q.y + q.z * q.z));
      const ax = [Math.cos(yaw), -Math.sin(yaw)], az = [Math.sin(yaw), Math.cos(yaw)];
      let reach = null;
      for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ox = c.x + (ax[0] * u * (w / 2 + 0.45)) + (az[0] * v * (d / 2 + 0.45)), oz = c.z + (ax[1] * u * (w / 2 + 0.45)) + (az[1] * v * (d / 2 + 0.45));
        const of = T.floorAt(ox, oz, top + 0.05);
        if (Math.abs(of - base) > 0.3 && Math.abs(of - fl) > 0.3) continue;   // 外侧不在同一楼层
        // 外侧点本身落在另一个实体构件里（如成排藤架的相邻段），不算“能走过来”
        let blocked = false; for (const k of nearMeshes({ min: { x: ox, z: oz }, max: { x: ox, z: oz } })) { const o = meshes[k]; if (o !== m && !o.tr && o.o.geometry.type === 'BoxGeometry' && ox > o.bb.min.x && ox < o.bb.max.x && oz > o.bb.min.z && oz < o.bb.max.z && o.bb.max.y > of + 0.3 && o.bb.min.y < of + 1.5) { blocked = true; break; } }
        if (blocked) continue;
        const ix = c.x + (ax[0] * u * (w / 2 - 0.2)) + (az[0] * v * (d / 2 - 0.2)), iz = c.z + (ax[1] * u * (w / 2 - 0.2)) + (az[1] * v * (d / 2 - 0.2));
        if (T.canStep(ox, oz, ix, iz, of, false) && !S.insideSolid(ix, iz, of + 0.3)) { reach = [r2(ox), r2(oz), r2(of)]; break; }
      }
      if (!reach) continue;
      const rise = top - reach[2];
      if (rise > 0.12 && rise <= 0.65) { n1++; add('可行走面未登记', { x: r2(c.x), z: r2(c.z), y: r2(top), msg: `顶面比旁边地面高 ${r2(rise)} m、可以迈上去，但没有登记可行走面（人会陷进构件）：${desc(m)}`, from: reach }); }
      else if (rise > 0.65 && h > 0.4 && top - reach[2] < 2.2) { n2++; add('构件无碰撞', { x: r2(c.x), z: r2(c.z), y: r2(bot), msg: `高 ${r2(h)} m 的构件没有碰撞体，人可以直接穿过：${desc(m)}`, from: reach }); }
    }
    stats.walkMissing = n1; stats.noCollision = n2;
  }

  // ---------- 4. 座位不可达：从室外地面出发做广度搜索，看能否走到座位交互范围 ----------
  {
    const seats = D.SEATS; const unreach = [];
    const G = 0.35;
    for (const [si, s] of seats.entries()) {
      const r = s.type === 'lie' ? 1.8 : 1.35, fy = s.y - (s.type === 'lie' ? 0.45 : 0.5);
      // 起点：座位外 6~40 m 的室外地面
      let start = null;
      for (let R = 6; R <= 40 && !start; R += 2) for (let k = 0; k < 16 && !start; k++) { const a = k / 16 * Math.PI * 2, x = s.x + Math.cos(a) * R, z = s.z + Math.sin(a) * R, g = gh(x, z); if (g < 0.3 || T.waterAt(x, z)) continue; const f = T.floorAt(x, z, g + 1.0); if (Math.abs(f - g) > 0.05 || S.insideSolid(x, z, g + 0.3)) continue; start = [x, z, g]; }
      if (!start) { unreach.push([si, '找不到室外起点']); continue; }
      const seen = new Set(), qu = [start]; let found = null, n = 0;
      const k3 = (x, z, f) => Math.round(x / G) + ',' + Math.round(z / G) + ',' + Math.round(f * 3);
      seen.add(k3(...start));
      while (qu.length && n < 60000 && !found) {
        const [x, z, f] = qu.shift(); n++;
        if (Math.hypot(x - s.x, z - s.z) < r * 0.9 && Math.abs(f - fy) < 1.7) { found = [x, z, f]; break; }
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, nx = x + Math.cos(a) * G, nz = z + Math.sin(a) * G;
          if (Math.hypot(nx - s.x, nz - s.z) > 48) continue;
          if (!T.canStep(x, z, nx, nz, f, false) || S.insideSolid(nx, nz, f + 0.3)) continue;
          const nf = T.floorAt(nx, nz, f); const kk = k3(nx, nz, nf); if (seen.has(kk)) continue; seen.add(kk); qu.push([nx, nz, nf]); }
      }
      if (!found) add('座位不可达', { x: r2(s.x), z: r2(s.z), y: r2(s.y), msg: `${s.type === 'lie' ? '躺椅/床' : '座位'}（朝向 ${Math.round(s.yaw * 57.3)}°）从室外步行搜索 ${n} 个位置仍无法进入交互范围`, from: [r2(start[0]), r2(start[1]), r2(start[2])] });
    }
    stats.seats = seats.length;
  }

  // ---------- 5. 共面闪烁：两个不同材质的面处在同一平面且重叠 ----------
  {
    const faces = [], c = new TH.Vector3(), q = new TH.Quaternion(), s3 = new TH.Vector3();
    const axes = [new TH.Vector3(1, 0, 0), new TH.Vector3(0, 1, 0), new TH.Vector3(0, 0, 1)];
    for (const m of meshes) {
      const g = m.o.geometry; if (m.tr) continue;
      if (g.type !== 'BoxGeometry' && g.type !== 'PlaneGeometry') continue;
      m.o.matrixWorld.decompose(c, q, s3);
      const P = g.parameters, half = g.type === 'BoxGeometry' ? [P.width * s3.x / 2, P.height * s3.y / 2, P.depth * s3.z / 2] : [P.width * s3.x / 2, P.height * s3.y / 2, 0];
      const A = axes.map(a => a.clone().applyQuaternion(q));
      const list = g.type === 'BoxGeometry' ? [0, 1, 2].flatMap(i => [1, -1].map(sg => [i, sg])) : [[2, 1]];
      for (const [i, sg] of list) { const n = A[i].clone().multiplyScalar(sg), j = (i + 1) % 3, k = (i + 2) % 3;
        if (half[j] * half[k] * 4 < 0.0025) continue;
        const fc = c.clone().addScaledVector(A[i], sg * half[i]);
        faces.push({ m, n, d: n.dot(fc), fc, u: A[j], v: A[k], hu: half[j], hv: half[k] }); }
    }
    const buck = new Map(), bk = (f) => [Math.round(f.n.x * 200), Math.round(f.n.y * 200), Math.round(f.n.z * 200), Math.round(f.d * 100)].join(',');
    faces.forEach((f, i) => { const k = bk(f); if (!buck.has(k)) buck.set(k, []); buck.get(k).push(i); });
    const done = new Set(); let zf = 0;
    const ov = (a, b) => { // 在 a 的面内坐标系中，求 b 的投影包围矩形与 a 的重叠面积
      const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([p, r]) => b.fc.clone().addScaledVector(b.u, p * b.hu).addScaledVector(b.v, r * b.hv).sub(a.fc));
      const us = corners.map(p => p.dot(a.u)), vs = corners.map(p => p.dot(a.v));
      const ou = Math.min(a.hu, Math.max(...us)) - Math.max(-a.hu, Math.min(...us)), ovv = Math.min(a.hv, Math.max(...vs)) - Math.max(-a.hv, Math.min(...vs));
      return ou > 0 && ovv > 0 ? ou * ovv : 0; };
    for (const [k, l] of buck) {
      const [nx, ny, nz, d] = k.split(',').map(Number); const cand = [];
      for (let dd = -1; dd <= 1; dd++) { const l2 = buck.get([nx, ny, nz, d + dd].join(',')); if (l2) cand.push(...l2); }
      for (const i of l) for (const j of cand) { if (j <= i) continue; const a = faces[i], b = faces[j];
        if (a.m === b.m || Math.abs(a.d - b.d) > 0.004 || a.n.dot(b.n) < 0.9999) continue;
        const sameLook = hex(a.m.mat) === hex(b.m.mat) && (a.m.mat.map || null) === (b.m.mat.map || null); if (sameLook) continue;
        const area = ov(a, b); if (area < 0.05) continue;   // 小于 0.05 m² 的重合肉眼难以察觉
        const pk = [a.m.o.id, b.m.o.id].sort().join('-'); if (done.has(pk)) continue; done.add(pk); zf++;
        add('共面闪烁', { x: r2(a.fc.x), z: r2(a.fc.z), y: r2(a.fc.y), msg: `${hex(a.m.mat)} 与 ${hex(b.m.mat)} 两个面重合 ${r2(area)} m²（法线 ${r2(a.n.x)},${r2(a.n.y)},${r2(a.n.z)}），会闪烁：${desc(a.m)} / ${desc(b.m)}` }); }
    }
    stats.faces = faces.length; stats.zfight = zf;
  }

  // ---------- 6. 物体误沉水下：整个构件都在水面以下（泳池、水闸等水工构件除外） ----------
  {
    for (const m of meshes) { if (m.tr || vol(m.bb) < 0.05) continue; const w = where(m.bb), wa = T.waterAt(w.x, w.z); if (!wa || wa.pool) continue;
      if (m.bb.max.y < wa.level - 0.05 && m.bb.min.y > wa.bottom - 3) add('误沉水下', { ...w, msg: `构件完全没在水下 ${r2(wa.level - m.bb.max.y)} m（水面 ${r2(wa.level)}）：${desc(m)}` }); }
  }

  // ---------- 7. 植被 / 实例化物体悬空或埋地 ----------
  {
    const mb = S.meshBoxes ? S.meshBoxes() : null; let n = 0, bad = 0;
    const mtx = new TH.Matrix4(), p = new TH.Vector3();
    __island.scene.traverse(o => { if (!o.isInstancedMesh) return; o.updateMatrixWorld(true);
      const step = Math.max(1, Math.floor(o.count / 3000));
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const gy0 = o.geometry.boundingBox.min.y, gy1 = o.geometry.boundingBox.max.y, sc = new TH.Vector3(), qq = new TH.Quaternion();
      for (let i = 0; i < o.count; i += step) { o.getMatrixAt(i, mtx); mtx.decompose(p, qq, sc); const top = p.y + gy1 * sc.y; p.y += gy0 * sc.y; p.applyMatrix4(o.matrixWorld); n++;   // p 取模型实际底面；树木根部常故意伸入地下，埋地只看整株是否没入
        if (!Number.isFinite(p.x + p.y + p.z)) { add('悬空', { x: 0, z: 0, y: 0, msg: `实例化物体 ${o.name || o.geometry.type} 第 ${i} 个位置为 NaN` }); continue; }
        const g = gh(p.x, p.z); if (p.y < -50 || p.y > 300) continue;       // 隐藏的实例（放到极远处）
        const fl = T.floorAt(p.x, p.z, p.y + 0.3);
        let sup = Math.abs(p.y - g) < 0.35 || Math.abs(p.y - fl) < 0.35;
        if (!sup && mb) { const l = mb.get(Math.floor(p.x / 8) * 100003 + Math.floor(p.z / 8)) || []; sup = l.some(b => p.x >= b.min.x - 0.1 && p.x <= b.max.x + 0.1 && p.z >= b.min.z - 0.1 && p.z <= b.max.z + 0.1 && Math.abs(b.max.y - p.y) < 0.35); }
        if (!sup && T.waterAt(p.x, p.z)) sup = true;                         // 水生/水面物体另行检查
        if (!sup && p.y > g + 0.35) { bad++; if (bad <= 200) add('植被悬空', { x: r2(p.x), z: r2(p.z), y: r2(p.y), msg: `实例化物体（${o.name || o.geometry.type}，${o.count} 个中的第 ${i} 个）底部离地 ${r2(p.y - g)} m` }); }
        else if (top + (o.matrixWorld.elements[13] || 0) < g + 0.05 && top < fl) { bad++; if (bad <= 200) add('植被埋地', { x: r2(p.x), z: r2(p.z), y: r2(p.y), msg: `实例化物体（${o.name || o.geometry.type}）整株没入地面（顶部 ${r2(top)}，地面 ${r2(g)}）` }); }
      } });
    stats.instancesChecked = n;
  }
  return { checks: out, stats };
})()
