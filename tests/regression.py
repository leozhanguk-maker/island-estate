# 回归测试：每个已修复的程序缺陷一条，问题复发即失败（编号对应 docs/ISSUES.md）
#   P-001 陡坡礁石吞人、P-002 潜水嵌入海底：用巡逻的精确复现计划严格重放
#   P-008 直升机高空穿楼：页面内脚本，直升机在 25 m 高度朝住宅楼平飞
#   P-007 离开舵位后船继续开/打转：页面内脚本，全速左满舵时按 E 离开舵位
#   （P-003～P-006 由 scene_audit --strict 守住；P-009 在 phys_test 的 g_openWalk 断言中）
# 用法：python3 tests/regression.py
import os, sys, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))
from harness import Session

REPROS = [
    ('P-001 陡坡礁石不再吞人（陆地）', ['--seed=7', '--repro=walk-12']),
    ('P-001 陡坡礁石不再吞人（水中）', ['--seed=7', '--repro=swim-05']),
    ('P-002 潜水不再嵌入海底斜坡', ['--seed=20260923', '--repro=swim-06']),
]

HELI_JS = r'''() => { const D = __dbg, H = D.HELI, fp = __fp, cam = __island.camera;
  // 住宅楼位于 (0, -150)，整栋是实心体；直升机在 z=-115、离地约 25 m 处以 15 m/s 朝北（-z）平飞 4 秒
  fp.teleport(0, -100, 0); D.DRIVE.active = H; H.auto = null; H.rpm = 1; H.ground = false;
  H.x = 0; H.z = -115; H.y = D.gh(0, -115) + 25; H.vx = 0; H.vy = 0; H.vz = -15; H.yaw = Math.PI / 2;
  let minZ = H.z; for (let i = 0; i < 80; i++) { D.updateHeli(1 / 20, new Set(), cam); minZ = Math.min(minZ, H.z); }
  D.DRIVE.active = null; return { minZ: +minZ.toFixed(2), y: +H.y.toFixed(1) }; }'''

BOAT_JS = r'''() => { const D = __dbg, B = D.BOAT, cam = __island.camera;
  // 在舵位按住 W+A 加速并左满舵 8 秒，然后按 E 离开舵位，再空推 20 秒
  // 挪到岛南开阔海面（环岛巡航航线外侧），避免撞到泊位
  B.x = 0; B.z = 420; B.yaw = 0; B.v = 0; B.thr = 0; B.rud = 0; D.syncBoat(); D.DRIVE.active = B; B.auto = null;
  const hold = new Set(['KeyW', 'KeyA']); for (let i = 0; i < 160; i++) D.updateBoat(1 / 20, i / 20, hold);
  const before = { thr: +B.thr.toFixed(2), rud: +B.rud.toFixed(2) };
  D.exitCar({ teleport: () => {} });
  const yaw0 = B.yaw; for (let i = 0; i < 400; i++) D.updateBoat(1 / 20, 8 + i / 20, new Set());
  return { before, thr: +B.thr.toFixed(3), rud: +B.rud.toFixed(3), v: +B.v.toFixed(3), turn: +Math.abs(B.yaw - yaw0).toFixed(3), driving: D.DRIVE.active === B }; }'''


def main():
    failed = 0
    for desc, args in REPROS:
        p = subprocess.run([sys.executable, os.path.join(HERE, 'patrol.py'), '--strict', *args], capture_output=True, text=True, timeout=1200)
        ok = p.returncode == 0
        tail = [l for l in p.stdout.splitlines() if l.strip().startswith('[')][:3]
        print(f"  {'✓' if ok else '✗'} {desc}" + ('' if ok else '：' + '；'.join(tail)))
        failed += 0 if ok else 1
    with Session('#fp,still,q=low') as s:
        r = s.js(HELI_JS)
    ok = r['minZ'] > -140.5          # 住宅楼北立面在 z ≈ -139.5
    print(f"  {'✓' if ok else '✗'} P-008 直升机高空不再穿过住宅楼：最南到达 z={r['minZ']}（高 {r['y']}）")
    failed += 0 if ok else 1
    with Session('#fp,still,q=low') as s:
        r = s.js(BOAT_JS)
    # 离开前确有油门和舵角；离开后两者归零，20 秒内船基本停住、不再原地打转
    ok = r['before']['thr'] > 0.5 and r['before']['rud'] > 0.5 and not r['driving'] and r['thr'] == 0 and r['rud'] == 0 and abs(r['v']) < 0.3 and r['turn'] < 0.5
    print(f"  {'✓' if ok else '✗'} P-007 离开舵位后油门、舵角归零：离开前 {r['before']}，离开后 thr={r['thr']} rud={r['rud']}，20 s 后航速 {r['v']} m/s、转角 {r['turn']} rad")
    failed += 0 if ok else 1
    print('\n回归测试全部通过' if not failed else f'\n{failed} 项回归测试失败')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
