// 测试用模拟库：复刻主循环的单步推进，并提供各类检测器。由 harness.py 在页面加载完成后注入。
// 依赖 #still 调试模式暴露的 window.__fp / __dbg / __island / __statics。
(() => {
  const fp = __fp, st = fp._st, D = __dbg, I = __island, T = fp._test;
  const { COLL, DRIVE, BOAT, HELI, GATE, gh } = D;
  const cam = I.camera;
  let simT = 0;

  // ---------- 确定性随机数 ----------
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  // ---------- 静态碰撞体空间索引 ----------
  const CELL = 8, grid = new Map(), key = (i, j) => i * 100003 + j;
  const put = (o, x0, z0, x1, z1) => { for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) { const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(o); } };
  // 用漫游物理实际使用的完整碰撞列表（setupFP 在 COLL 之外还追加了住宅楼、牛棚、圈舍、大棚、光伏排等整体实心体）
  const SOL = { segs: T.segs || COLL.segs, rects: T.rects || COLL.rects, circles: T.circles || COLL.circles };
  SOL.segs.forEach(g => put({ t: 's', o: g }, Math.min(g.ax, g.bx), Math.min(g.az, g.bz), Math.max(g.ax, g.bx), Math.max(g.az, g.bz)));
  SOL.rects.forEach(r => { const e = Math.hypot(r.hw, r.hd); put({ t: 'r', o: r }, r.x - e, r.z - e, r.x + e, r.z + e); });
  SOL.circles.forEach(c => put({ t: 'c', o: c }, c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r));
  const near = (x0, z0, x1 = x0, z1 = z0) => { const out = new Set(); for (let i = Math.floor((Math.min(x0, x1) - 1) / CELL); i <= Math.floor((Math.max(x0, x1) + 1) / CELL); i++) for (let j = Math.floor((Math.min(z0, z1) - 1) / CELL); j <= Math.floor((Math.max(z0, z1) + 1) / CELL); j++) { const l = grid.get(key(i, j)); if (l) l.forEach(o => out.add(o)); } return out; };
  const inBand = (o, y) => (!o.cond || o.cond()) && y <= (o.top === undefined ? 1e9 : o.top) && y >= (o.bottom === undefined ? -1e9 : o.bottom);
  const cross = (ax, az, bx, bz, cx, cz, dx, dz) => { const d = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx); if (Math.abs(d) < 1e-9) return false; const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / d, u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / d; return t > 1e-6 && t < 1 - 1e-6 && u >= 0 && u <= 1; };
  const rectSD = (x, z, o) => { const c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0), dx = x - o.x, dz = z - o.z; const lx = Math.abs(c * dx - s * dz) - o.hw, lz = Math.abs(s * dx + c * dz) - o.hd; return Math.max(lx, lz); };
  // 两点之间是否穿过了某堵墙（高度带内的线段）
  function wallCrossed(x0, z0, x1, z1, y) {
    for (const e of near(x0, z0, x1, z1)) if (e.t === 's' && inBand(e.o, y) && cross(x0, z0, x1, z1, e.o.ax, e.o.az, e.o.bx, e.o.bz)) return e.o;
    return null;
  }
  // 是否嵌在实心碰撞体内部（矩形/圆柱，留 5 cm 余量）
  function insideSolid(x, z, y) {
    for (const e of near(x, z)) { if (!inBand(e.o, y)) continue;
      if (e.t === 'r' && rectSD(x, z, e.o) < -0.05) return e.o;
      if (e.t === 'c' && Math.hypot(x - e.o.x, z - e.o.z) < e.o.r - 0.05) return e.o; }
    return null;
  }

  // ---------- 单步推进（与 10_main.js 主循环一致，不渲染） ----------
  function step(dt, keys) {
    st.keys = new Set(keys || []);
    const prev = D.updateBoat(dt, simT, st.keys); if (BOAT.moved) { if (fp.on) D.carryOnBoat(st, prev); D.syncBoat(simT); }
    D.updateHeli(dt, st.keys, fp.on ? cam : null);
    if (DRIVE.active === HELI) st.pos.set(HELI.x, HELI.y + 1.5, HELI.z);
    else if (DRIVE.active === BOAT) {}
    else if (DRIVE.active) { D.updateDrive(dt, st.keys, cam, fp); st.pos.set(DRIVE.active.x, DRIVE.active.y + 1.5, DRIVE.active.z); }
    else fp.update(dt);
    D.updateGate(dt, fp);                                        // 与主循环同一个函数（水闸转移与门叶动画）
    simT += dt;
  }
  const press = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code }));

  // ---------- 状态快照 ----------
  const r2 = (v) => Math.round(v * 100) / 100;
  function snap() {
    const a = DRIVE.active;
    return { t: r2(simT), x: r2(st.pos.x), z: r2(st.pos.z), feet: r2(st.feet), mode: st.mode, onBoat: !!st.onBoat, veh: a ? (a === BOAT ? 'boat' : a === HELI ? 'heli' : a.sp ? a.sp.name : 'car') : null };
  }
  const finite = (...v) => v.every(Number.isFinite);

  // ---------- 检测器：每步调用，返回问题列表 ----------
  // 问题格式：{ kind, msg, x, z, y, extra }
  function makeMonitor(ctx) {
    let px = st.pos.x, pz = st.pos.z, pf = st.feet, freeCheckT = 0, stillT = 0, lastMoveX = st.pos.x, lastMoveZ = st.pos.z;
    const issues = [];
    const add = (kind, msg, extra) => issues.push({ kind, msg, x: r2(st.pos.x), z: r2(st.pos.z), y: r2(st.feet), t: r2(simT), extra: extra || null });
    return {
      issues,
      check(dt, keys) {
        const a = DRIVE.active;
        const x = st.pos.x, z = st.pos.z, f = st.feet;
        if (!finite(x, z, f, st.pos.y)) { add('非数值位置', `位置出现 NaN/Infinity：x=${x} z=${z} feet=${f}`); px = 0; pz = 0; return false; }
        const jump = Math.hypot(x - px, z - pz);
        if (!a) {
          // 游戏卡住保护会把人传送回起点：一步跳出 3 米以上即视为卡住事件
          if (jump > 3 && !ctx.teleported) add('卡住', `卡住保护触发，被传送回起点（前一位置 ${r2(px)}, ${r2(pz)}）`, { from: [r2(px), r2(pz), r2(pf)] });
          else if (jump > 1e-4) {
            const w = wallCrossed(px, pz, x, z, pf + 0.3);
            if (w && !st.onBoat) add('穿墙', `一步内穿过了墙体线段 (${r2(w.ax)},${r2(w.az)})→(${r2(w.bx)},${r2(w.bz)}) 高度带 ${r2(w.bottom)}~${r2(w.top)}`, { from: [r2(px), r2(pz), r2(pf)] });
          }
          const s = insideSolid(x, z, f + 0.3);
          if (s && !st.onBoat) add('穿墙', `人物中心嵌在碰撞体内部（${s.r ? '圆柱 r=' + r2(s.r) : '矩形 ' + r2(s.hw * 2) + '×' + r2(s.hd * 2)}，中心 ${r2(s.x)},${r2(s.z)}）`);
          // 穿地：既低于地形、又低于任何登记的可行走面
          const g = gh(x, z), w0 = T.waterAt(x, z);
          if (st.mode !== 'swim' && !st.onBoat && !(w0 && w0.pool)) { const fl = T.floorAt(x, z, f + 0.5); if (f < Math.min(g, fl) - 0.3) add('穿地', `脚底 ${r2(f)} 低于地面 ${r2(g)} 与可行走面 ${r2(fl)}`); }
          if (st.mode === 'swim' && w0 && f < w0.bottom - 0.3) add('穿地', `潜水时脚底 ${r2(f)} 低于水底 ${r2(w0.bottom)}`);
          if (!st.onBoat && (Math.abs(x) > 372 || Math.abs(z) > 222)) add('越界', `人物走出漫游边界（|x|≤372、|z|≤222）`);
          // 卡住：每 0.5 秒按游戏移动规则（canStep + 实心体）试探 8 个方向，全部走不动即为困住
          freeCheckT += dt;
          if (freeCheckT > 0.5 && st.grounded !== false && st.mode === 'walk' && !st.seat) { freeCheckT = 0; let free = 0;
            for (let k = 0; k < 8; k++) { const ang = k / 8 * Math.PI * 2, nx = x + Math.cos(ang) * 0.3, nz = z + Math.sin(ang) * 0.3; if (T.canStep(x, z, nx, nz, f, false) && !insideSolid(nx, nz, f + 0.3)) free++; }
            if (free === 0) add('卡住', '四周 8 个方向都无法迈步（被困）'); }
        } else {
          const v = a, vx = v.x, vz = v.z, vy = v.y;
          if (!finite(vx, vz, vy)) { add('非数值位置', `载具 ${ctx.vehicle} 位置出现 NaN`); return false; }
          const g = gh(vx, vz);
          if (a === HELI) {
            if (vy < g - 0.2) add('穿地', `直升机高度 ${r2(vy)} 低于地面 ${r2(g)}`);
            const b = ctx.bboxHit ? ctx.bboxHit(vx, vy, vz) : null; if (b) add('穿墙', `直升机进入建筑包围盒：${b}`);
          } else if (a === BOAT) {
            if (BOAT.hit && ctx.boatHitIsIssue) add('碰撞', `游艇撞上障碍：${BOAT.hit}`);
            if (!st.onBoat && ctx.expectOnBoat) add('掉船', '驾驶游艇时人物不在船上');
          } else {
            // 车身高度取四轮着地点平均：坡顶处中心会略低于地面（车底入地，视觉问题）；低 1.5 m 以上才算穿地
            if (vy < g - 1.5) add('穿地', `${ctx.vehicle} 车身高度 ${r2(vy)} 低于地面 ${r2(g)}`);
            else if (vy < g - 0.5) add('车底入地', `${ctx.vehicle} 车身中心比地面低 ${r2(g - vy)} m（坡顶处车底陷入地面）`);
            const w = wallCrossed(ctx.lvx ?? vx, ctx.lvz ?? vz, vx, vz, vy + 0.5); if (w) add('穿墙', `${ctx.vehicle} 一步内穿过墙体线段 (${r2(w.ax)},${r2(w.az)})→(${r2(w.bx)},${r2(w.bz)})`);
            if (Math.abs(vx) > 372 || Math.abs(vz) > 222) add('越界', `${ctx.vehicle} 驶出边界`);
            // 载具卡住：有油门却 3 秒几乎不动
            // 被障碍挡住属正常；车身中心嵌进碰撞体才算卡住
            const pushing = keys && (keys.includes('KeyW') || keys.includes('KeyS'));
            if (pushing && Math.hypot(vx - lastMoveX, vz - lastMoveZ) < 0.3) { stillT += dt; if (stillT > 3) { const s = insideSolid(vx, vz, vy + 0.5); if (s) add('卡住', `${ctx.vehicle} 车身嵌在碰撞体内无法脱出（中心 ${r2(s.x)},${r2(s.z)}）`); stillT = -1e9; } } else { stillT = 0; lastMoveX = vx; lastMoveZ = vz; }
            ctx.lvx = vx; ctx.lvz = vz;
          }
        }
        ctx.teleported = false; px = st.pos.x; pz = st.pos.z; pf = st.feet;
        return true;
      },
    };
  }

  // ---------- 构件包围盒索引（用于直升机穿楼检测）：逐个构件，而非整栋建筑 ----------
  let MB = null;
  function meshBoxes() {
    if (MB) return MB; MB = new Map();
    const TH = __statics.THREE, box = new TH.Box3(), sz = new TH.Vector3();
    __statics.groups.forEach((g, gi) => { g.updateMatrixWorld(true); g.traverse(o => {
      if (!o.isMesh || !o.geometry || (o.material && o.material.transparent)) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.getSize(sz);
      if (sz.x * sz.y * sz.z < 0.05) return;
      const b = { gi, min: box.min.clone(), max: box.max.clone() };
      for (let i = Math.floor(b.min.x / CELL); i <= Math.floor(b.max.x / CELL); i++) for (let j = Math.floor(b.min.z / CELL); j <= Math.floor(b.max.z / CELL); j++) { const k = key(i, j); if (!MB.has(k)) MB.set(k, []); MB.get(k).push(b); }
    }); });
    return MB;
  }
  // 机舱中心（离地 1.2 米）半径 0.8 米的球与构件包围盒相交即视为撞楼
  function bboxHit(x, y, z) {
    const cy = y + 1.2, R = 0.8, l = meshBoxes().get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || [];
    for (const b of l) { const dx = Math.max(b.min.x - x, 0, x - b.max.x), dy = Math.max(b.min.y - cy, 0, cy - b.max.y), dz = Math.max(b.min.z - z, 0, z - b.max.z);
      if (dx * dx + dy * dy + dz * dz < R * R) return `构件（分组#${b.gi}）x ${r2(b.min.x)}~${r2(b.max.x)} z ${r2(b.min.z)}~${r2(b.max.z)} y ${r2(b.min.y)}~${r2(b.max.y)}`; }
    return null;
  }

  window.__sim = { SOL, rng, step, press, snap, makeMonitor, wallCrossed, insideSolid, meshBoxes, bboxHit, get t() { return simT; }, st, D, T, fp };
})();
