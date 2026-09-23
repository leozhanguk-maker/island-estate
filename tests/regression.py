# 回归测试：每个已修复的程序缺陷一条，问题复发即失败（编号对应 docs/ISSUES.md）
#   P-001 陡坡礁石吞人、P-002 潜水嵌入海底：用巡逻的精确复现计划严格重放
#   P-008 直升机高空穿楼：页面内脚本，直升机在 25 m 高度朝住宅楼平飞
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
    print('\n回归测试全部通过' if not failed else f'\n{failed} 项回归测试失败')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
