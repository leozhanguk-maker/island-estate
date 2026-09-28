# 厨房馆走查：别墅客厅 → 西门 → 连廊 → 展示厨房 → 玻璃隔断 → 中式热厨 → 干货储藏间 / 冷库（进不去）→ 洗碗间 → 后勤门 → 后勤院 → 石阶下到场地
#            展示厨房 → 南侧玻璃门 → 户外餐台 → 石阶下到高尔夫球场；基座外地面上的人不能从挡土墙下钻进基座；别墅西墙除西门外仍是实墙
# 只打印数据，通过与否由 tests/check_baselines.py 的 'kitchen' 断言判定
# 用法：python3 tests/kitchen_test.py
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))
from harness import Session

JS = r'''() => {
  const fp = __fp, st = fp._st, D = __dbg, K = D.KITCHEN, out = {};
  const frame = (keys) => { st.keys = new Set(keys || []); fp.update(1 / 60); };
  const Kw = (x, z) => [K.x + x, K.z + z], Vw = (x, z) => [180 + x, -46 + z];   // 厨房馆 / 别墅局部坐标 → 世界坐标
  const pose = () => ({ x: +(st.pos.x - K.x).toFixed(2), z: +(st.pos.z - K.z).toFixed(2), feet: +st.feet.toFixed(2), mode: st.mode });
  const walkTo = ([x, z], maxT = 12) => { let t = 0; while (t < maxT) { const dx = x - st.pos.x, dz = z - st.pos.z; if (Math.hypot(dx, dz) < 0.2) break; st.yaw = Math.atan2(-dx, -dz); frame(['KeyW']); t += 1 / 60; } for (let i = 0; i < 20; i++) frame([]); return pose(); };
  const settle = () => { for (let i = 0; i < 30; i++) frame([]); return pose(); };
  // 1. 别墅客厅西北角 → 楼梯西侧过道 → 西门 → 连廊 → 展示厨房
  fp.teleport(...Vw(-8.6, -3.0), 0); settle();
  walkTo(Vw(-9.9, -2.3)); out.villaAisle = walkTo(Vw(-9.9, 0));
  out.villaDoor = walkTo(Vw(-11.2, 0)); out.corridor = walkTo(Kw(8, 0)); out.showIn = walkTo(Kw(5.6, 0.3));
  // 2. 中岛南侧 → 玻璃隔断推拉门 → 中式热厨（地面低 2 cm）
  walkTo(Kw(5.6, 1.4)); walkTo(Kw(1.8, 1.6)); out.hot = walkTo(Kw(0.3, 1.6));
  // 3. 热厨 → 干货储藏间（门在隔墙北段）
  walkTo(Kw(0.5, -1.5)); walkTo(Kw(-2.4, -2.15)); out.dry = walkTo(Kw(-4.4, -2.3));
  // 4. 冷库不可进入：从热厨正对冷库门往西走
  walkTo(Kw(-2.4, -2.15)); walkTo(Kw(-2.4, -0.1)); out.cold = walkTo(Kw(-4.5, -0.1), 3);
  // 5. 洗碗间 → 西侧后勤门 → 后勤院 → 西侧出入口石阶 → 场地
  walkTo(Kw(-2.4, 2.8)); out.dish = walkTo(Kw(-4.2, 2.9)); out.yard = walkTo(Kw(-7.5, 2.9));
  walkTo(Kw(-12.5, 1.5)); out.gate = walkTo(Kw(-14.3, 1.5)); out.yardStairs = walkTo(Kw(-18.6, 1.5));
  out.yardGround = +D.gh(st.pos.x, st.pos.z).toFixed(2);
  // 6. 展示厨房 → 南侧玻璃门 → 户外餐台 → 南沿石阶 → 高尔夫球场
  fp.teleport(...Kw(5.4, 1.5), Math.PI); settle();
  walkTo(Kw(5.4, 3.9)); out.deck = walkTo(Kw(5.4, 5.3)); walkTo(Kw(-1.5, 5.4)); out.deckStair = walkTo(Kw(-1.5, 8.3));
  out.golf = walkTo(Kw(-1.5, 13.5)); out.golfGround = +D.gh(st.pos.x, st.pos.z).toFixed(2);
  // 7. 基座外地面上的人不能从挡土墙下钻进基座（西南角外往东走）
  fp.teleport(150, -38.8, -Math.PI / 2); settle(); out.podiumOut = walkTo([156, -38.8], 4);
  // 8. 别墅西墙除西门外仍是实墙：楼梯西侧过道南段往西走
  fp.teleport(...Vw(-10.1, 3.0), Math.PI / 2); settle(); out.villaWall = walkTo(Vw(-12.5, 3.0), 3);
  out.villaWallX = +(st.pos.x - 180).toFixed(2);
  // 9. 座位与碰撞登记
  const inK = (q) => Math.abs(q.x - K.x) < 8 && q.z > K.z - 5 && q.z < K.z + 9;
  out.seats = D.SEATS.filter(inK).length;
  return out;
}'''

with Session('#fp,still,q=low') as s:
    for k, v in s.js(JS).items():
        print(k, v)
    print(s.errors[:3])
