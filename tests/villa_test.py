# 别墅走查（2026-09-29 调整后的布局）：
#   首层客厅经东侧楼梯上二层 → 楼梯厅北门到阳台 → 宽过道进主卧 → 主卧西门进主卫；客卫只能从东门进、与主卫之间是隔离墙；衣帽间只能从东门进
#   → 走廊到 S2 上三层 → 两间卧室的门都靠近中间墙 → 洗浴室门朝北 → 公共卫生间男女各从北门进、与厨房和彼此都不互通 → 高尔夫小路石阶
# 只打印数据，通过与否由 tests/check_baselines.py 的 'villa' 断言判定
# 用法：python3 tests/villa_test.py
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))
from harness import Session

JS = r'''() => {
  const fp = __fp, st = fp._st, D = __dbg, K = D.KITCHEN, out = {};
  const frame = (keys) => { st.keys = new Set(keys || []); fp.update(1 / 60); };
  const V = (x, z) => [180 + x, -46 + z], Kw = (x, z) => [K.x + x, K.z + z];   // 别墅 / 厨房馆局部坐标 → 世界坐标
  const pose = () => ({ x: +(st.pos.x - 180).toFixed(2), z: +(st.pos.z + 46).toFixed(2), feet: +st.feet.toFixed(2) });
  const walkTo = ([x, z], maxT = 12) => { let t = 0; while (t < maxT) { const dx = x - st.pos.x, dz = z - st.pos.z; if (Math.hypot(dx, dz) < 0.2) break; st.yaw = Math.atan2(-dx, -dz); frame(['KeyW']); t += 1 / 60; } for (let i = 0; i < 20; i++) frame([]); return pose(); };
  const settle = () => { for (let i = 0; i < 30; i++) frame([]); return pose(); };
  // 1. 正门进客厅 → 东侧楼梯 S1 上二层
  fp.teleport(...V(1.5, 9.0), 0); settle(); out.hall = walkTo(V(1.5, 4.0)); walkTo(V(8.0, 5.6)); walkTo(V(9.8, 5.6)); out.s1 = walkTo(V(9.8, -2.4));
  // 2. 楼梯厅北门 → 阳台
  walkTo(V(8.1, -6.4)); out.balcony = walkTo(V(8.1, -8.6)); walkTo(V(8.1, -6.4));
  // 3. 楼梯厅 → 宽过道 → 主卧门 → 主卧；主卧 → 西门 → 主卫
  walkTo(V(7.1, -2.1)); out.corridor = walkTo(V(3.0, -2.1)); out.bedroom = walkTo(V(-1.6, -2.1)); walkTo(V(-0.4, -4.0)); out.masterBath = walkTo(V(1.6, -4.0));
  // 4. 主卫往东走被隔离墙挡住（客卫不与主卫相通）
  walkTo(V(1.6, -3.9)); out.masterToGuest = walkTo(V(6.0, -3.9), 4);
  // 5. 客卫只能从东门进
  walkTo(V(1.6, -4.0)); walkTo(V(-0.4, -4.0)); walkTo(V(-1.6, -2.1)); walkTo(V(3.0, -2.1)); walkTo(V(6.95, -2.1)); walkTo(V(6.95, -4.15)); out.guest = walkTo(V(5.75, -4.15));
  // 6. 衣帽间：从过道往南走被墙挡住；从东门进
  walkTo(V(6.95, -4.15)); walkTo(V(6.95, -2.1)); walkTo(V(3.0, -2.1)); out.closetWall = walkTo(V(3.0, 1.5), 4);
  walkTo(V(3.0, -2.1)); walkTo(V(6.95, -2.1)); walkTo(V(6.95, 0.1)); out.closet = walkTo(V(4.6, 0.1));
  // 7. 走廊 → S2 下端（南端）→ 三层
  walkTo(V(6.95, 0.1)); walkTo(V(7.1, 4.3)); walkTo(V(8.45, 4.3)); out.s2 = walkTo(V(8.45, -3.3));
  // 8. 三层：书房 → 北卧（门靠近中间墙）；南卧；洗浴室（门朝北）
  walkTo(V(6.3, -3.0)); walkTo(V(2.2, -1.2)); walkTo(V(2.1, -0.7)); out.northBed = walkTo(V(0.2, -0.7));
  walkTo(V(2.1, -0.7)); walkTo(V(2.1, 0.7)); out.southBed = walkTo(V(0.2, 0.7));
  walkTo(V(2.1, 0.7)); walkTo(V(4.85, 0.75)); out.bath3 = walkTo(V(4.85, 2.6));
  // 9. 三层 → S3（由北向南上）→ 屋顶
  walkTo(V(4.85, 0.75)); walkTo(V(5.2, -3.2)); walkTo(V(7.25, -3.5)); out.roof = walkTo(V(7.25, 4.6));
  // 10. 公共卫生间：从门前小路进男卫、女卫；男卫往南走不进厨房；男卫往东走不进女卫
  fp.teleport(...Kw(-2.8, -10.7), 0); settle(); out.men = walkTo(Kw(-2.8, -8.2)); out.menToKitchen = walkTo(Kw(-1.6, -3.0), 4);
  walkTo(Kw(-2.8, -8.2)); walkTo(Kw(-0.6, -8.2)); out.menToWomen = walkTo(Kw(1.5, -8.2), 3);
  fp.teleport(...Kw(2.8, -10.7), 0); settle(); out.women = walkTo(Kw(2.8, -8.2));
  // 11. 小路：连廊北沿沿厨房东侧向北绕到卫生间门前；门前小路向西经石阶下到高尔夫球场
  fp.teleport(...Kw(7.1, -1.8), Math.PI); settle(); walkTo(Kw(7.1, -10.7)); out.pathFront = walkTo(Kw(-2.8, -10.7));
  out.golf = walkTo(Kw(-9.2, -10.7)); out.golfGround = +D.gh(st.pos.x, st.pos.z).toFixed(2);
  const inV = (q) => Math.abs(q.x - 180) < 11.5 && Math.abs(q.z + 46) < 8 && q.y < 21;
  out.seats = D.SEATS.filter(inV).length;
  return out;
}'''

with Session('#fp,still,q=low') as s:
    for k, v in s.js(JS).items():
        print(k, v)
    print(s.errors[:3])
