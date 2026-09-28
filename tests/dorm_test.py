# 住宅楼走查：从前庭进大堂 → 叫电梯、进轿厢、选 12 层 → 出电梯到 12 层楼道 → 不在本层的电梯井走不进
#            → 户门关着走不进、按 E 开门进户、走到客厅与主卧 → 经楼梯上屋顶
# 只打印数据，通过与否由 tests/check_baselines.py 的 'dorm' 断言判定
# 用法：python3 tests/dorm_test.py
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))
from harness import Session

JS = r'''() => {
  const fp = __fp, st = fp._st, D = __dbg, DM = D.DORM, out = {}, O = D.L.dorm;
  const frame = (keys) => { st.keys = new Set(keys || []); fp.update(1 / 60); D.updateDorm(1 / 60); };
  const W = (x, z) => [O.x + x, O.z + z];
  const pose = () => ({ x: +(st.pos.x - O.x).toFixed(2), z: +(st.pos.z - O.z).toFixed(2), feet: +st.feet.toFixed(2), mode: st.mode });
  const walkTo = ([x, z], maxT = 12) => { let t = 0; while (t < maxT) { const dx = x - st.pos.x, dz = z - st.pos.z; if (Math.hypot(dx, dz) < 0.2) break; st.yaw = Math.atan2(-dx, -dz); frame(['KeyW']); t += 1 / 60; } for (let i = 0; i < 20; i++) frame([]); return pose(); };
  const keyE = () => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' })); frame([]); };
  const wait = (cond, maxT) => { let t = 0; while (t < maxT && !cond()) { frame([]); t += 1 / 60; } return +t.toFixed(1); };
  const prompt = () => document.getElementById('fpprompt').textContent;
  const A = DM.lifts[0], B = DM.lifts[1], U = (sx, sz) => (u, v) => W(sx * (4 + u), sz * (1.25 + v));
  // 1. 前庭 → 入口台阶 → 大堂
  fp.teleport(...W(0, 15), 0); for (let i = 0; i < 20; i++) frame([]);
  // 0. 入口雨篷柱落地（柱底不高于柱下地面）；前庭花池种水仙
  { const TH = __statics.THREE; out.canopyCols = []; __statics.groups.forEach(g => { g.updateMatrixWorld(true); g.traverse(o => { if (!o.isMesh || o.geometry.type !== 'CylinderGeometry') return; const bb = new TH.Box3().setFromObject(o), cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
      for (const sx of [-1, 1]) if (Math.hypot(cx - (O.x + sx * 4.2), cz - (O.z + 13)) < 0.3) out.canopyCols.push(+(bb.min.y - D.gh(cx, cz)).toFixed(2)); }); });
    out.frontPots = D.POTS.filter(p => p.kind === 'narcissus' && Math.abs(p.z - (O.z + 11.4)) < 0.6 && Math.abs(Math.abs(p.x - O.x) - 10) < 3.6).length; }
  out.court = pose(); walkTo(W(0, 12.6)); out.lobby = walkTo(W(0, 7));
  // 1b. 1 层西南户：门关着走不进；按 E 开门进户（1 层四户与楼上相同）
  walkTo(W(0, 1.0)); walkTo(W(-5.0, 0.6)); out.door1Prompt = prompt(); out.door1Closed = walkTo(W(-5.0, 2.8), 3);
  walkTo(W(-5.0, 0.6)); keyE(); wait(() => DM.doors.find(d => d.f === 0 && d.sx < 0 && d.sz > 0).ang > 1.4, 3);
  out.in1 = walkTo(W(-5.0, 3.0)); walkTo(W(-5.0, 0.3));
  // 2. 楼道 → 西梯厅，按 E 叫电梯，门开后进轿厢
  walkTo(W(0.6, 0.2)); walkTo(W(1.78, -0.7)); out.callPrompt = prompt(); keyE();
  out.doorOpenT = wait(() => A.door > 0.98, 20); walkTo(W(1.0, -0.6)); out.inCar = walkTo(W(1.0, -3.0));
  // 3. 轿厢内按 E 选 12 层（连按 11 次），停手 1.5 秒后出发；到站开门后走出到 12 层楼道
  walkTo(W(1.35, -2.3)); out.carPrompt = prompt(); for (let k = 0; k < 11; k++) keyE(); out.sel = A.sel;
  out.rideT = wait(() => A.at === 11 && A.door > 0.98, 60); out.carTop = { ...pose(), at: A.at };
  out.corr12 = walkTo(W(1.0, -0.4));
  // 4. 东梯不在 12 层：厅门关着，走不进电梯井
  walkTo(W(3.0, -0.5)); out.shaftB = walkTo(W(3.0, -3.2), 3); out.bAt = B.at;
  // 5. 东北户（12 层北东户）：门关着走不进；按 E 开门进户，走到客厅、主卧
  walkTo(W(5.0, -0.55)); out.doorPrompt = prompt(); out.doorClosed = walkTo(W(5.0, -2.8), 3);
  walkTo(W(5.0, -0.55)); keyE(); wait(() => DM.doors.find(d => d.f === 11 && d.sx > 0 && d.sz < 0).ang > 1.4, 3);
  const u = U(1, -1); out.inUnit = walkTo(u(1.0, 1.8)); walkTo(u(1.3, 5.6)); walkTo(u(3.2, 5.9)); out.living = walkTo(u(5.6, 5.45)); out.master = walkTo(u(7.6, 5.45));
  // 6. 回楼道 → 楼梯间 → 两跑楼梯 → 屋顶平台 → 出屋面门到屋顶
  walkTo(u(5.6, 5.45)); walkTo(u(3.2, 5.9)); walkTo(u(1.3, 5.6)); walkTo(u(1.0, 1.8)); walkTo(W(5.0, -0.4)); walkTo(W(-1.05, -0.5));
  out.stairFoot = walkTo(W(-1.05, -2.3)); out.midLanding = walkTo(W(-1.05, -6.4)); walkTo(W(-2.95, -6.4)); out.roofLanding = walkTo(W(-2.95, -2.2));
  // 6b. 屋面楼梯间：从楼梯口往东侧梯井（下一层第一跑上方）走，被 1.25 m 高的墙挡住，不会掉下去
  walkTo(W(-1.05, -2.2)); out.roofVoid = walkTo(W(-1.05, -4.2), 3); walkTo(W(-2.95, -2.2));   // 从楼梯口东半边笔直往北（下一层第一跑上方）走
  out.roof = walkTo(W(-2.0, 1.5)); out.roofEdge = walkTo(W(-2.0, 12), 4);
  return out;
}'''

with Session('#fp,still,q=low') as s:
    for k, v in s.js(JS).items():
        print(k, v)
    print(s.errors[:3])
