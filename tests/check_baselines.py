# 物理/载具基线断言：运行现有的 5 个浏览器测试，解析输出并对照基线数值（HANDOVER“当前测试基线”）
# 这些脚本本身只打印数据，本文件负责判定通过/失败。
# 用法：python3 tests/check_baselines.py [phys drive boat cruise heli]
import os, sys, ast, subprocess, time

HERE = os.path.dirname(os.path.abspath(__file__))


def parse(text):
    out = {}
    for line in text.splitlines():
        k, _, v = line.partition(' ')
        if not k or not v:
            continue
        try:
            out[k] = ast.literal_eval(v.strip())
        except Exception:
            out[k] = v.strip()
    return out


def near(v, want, tol):
    return isinstance(v, (int, float)) and abs(v - want) <= tol


# 每条断言：(说明, 取值函数, 判定函数)
CHECKS = {
    'phys': [
        ('别墅屋顶脚底 22.45', lambda r: r['v_roof']['feet'], lambda v: near(v, 22.45, 0.05)),
        ('东峰塔平台 77.93', lambda r: r['t_platform']['feet'], lambda v: near(v, 77.93, 0.05)),
        ('闸顶步道 4.53', lambda r: r['g_walk']['feet'], lambda v: near(v, 4.53, 0.05)),
        ('机库地坪高出地面 0.3', lambda r: r['hangarFloorVsGround'], lambda v: near(v, 0.3, 0.05)),
        ('瞭望塔顶 56.7', lambda r: r['towerTop']['feet'], lambda v: near(v, 56.7, 0.1)),
        ('网球场 13.3', lambda r: r['tennis']['feet'], lambda v: near(v, 13.3, 0.1)),
        ('入水后为游泳状态', lambda r: r['swim']['mode'], lambda v: v == 'swim'),
        ('下潜到 -6', lambda r: r['dive']['feet'], lambda v: near(v, -6, 0.1)),
        ('潜水时相机在水下', lambda r: r['camUnder'], lambda v: isinstance(v, (int, float)) and v < 0),
    ],
    'drive': [
        ('上车成功', lambda r: r['active'], lambda v: v is True),
        ('加速 3 秒车速 ≥ 30 km/h', lambda r: r['accel']['kmh'], lambda v: isinstance(v, int) and v >= 30),
        ('撞别墅南墙被挡住（z > -39）', lambda r: r['toVilla']['z'], lambda v: isinstance(v, (int, float)) and v > -39),
        ('开向水边被挡在岸上（y > 0）', lambda r: r['toWater']['y'], lambda v: isinstance(v, (int, float)) and v > 0),
        ('下车成功', lambda r: r['afterExit']['active'], lambda v: v is False),
        ('拖拉机 4 秒行驶 ≥ 5 m', lambda r: r['tractor']['moved'], lambda v: isinstance(v, (int, float)) and v >= 5),
    ],
    'boat': [
        ('按 E 登船后在船上', lambda r: r['boarded']['onBoat'], lambda v: v is True),
        ('走到驾驶台舵位（上层 5.16）', lambda r: r['helmSpot']['feet'], lambda v: near(v, 5.16, 0.1)),
        ('舵位可接管驾驶', lambda r: r['driving'], lambda v: v is True),
        ('出港四段零碰撞', lambda r: [r[k]['hit'] for k in ('leg1', 'leg2', 'leg3', 'leg4')], lambda v: all(h is None for h in v)),
        ('驶出峡谷（bz > 250）', lambda r: r['leg4']['bz'], lambda v: isinstance(v, (int, float)) and v > 250),
        ('航行中人随船移动', lambda r: r['carried']['onBoat'], lambda v: v is True),
        ('海上下到客舱（下甲板 0.29）', lambda r: (r['cabin']['onBoat'], r['cabin']['feet']), lambda v: v[0] is True and near(v[1], 0.29, 0.1)),
    ],
    'cruise': [
        ('自动巡航完成', lambda r: r['done'], lambda v: v is True),
        ('全程零碰撞', lambda r: r['hits'], lambda v: v == 0),
        ('用时约 10.4 分钟', lambda r: r['minutes'], lambda v: near(v, 10.4, 0.4)),
        ('回到泊位 (30, 87, π)', lambda r: (r['final']['x'], r['final']['z'], r['final']['yaw']), lambda v: near(v[0], 30, 0.5) and near(v[1], 87, 0.5) and near(v[2], 3.142, 0.05)),
        ('人仍在船上', lambda r: r['player']['onBoat'], lambda v: v is True),
    ],
    'heli': [
        ('登机', lambda r: r['inHeli'], lambda v: v is True),
        ('去程约 71 s 落在别墅屋顶', lambda r: (r['toRoof']['t'], r['toRoof']['x'], r['toRoof']['z'], r['toRoof']['ground']), lambda v: near(v[0], 71, 5) and near(v[1], 181.4, 0.5) and near(v[2], -45.7, 0.5) and v[3] is True),
        ('屋顶下机脚底 22.45', lambda r: r['exitOnRoof']['feet'], lambda v: near(v, 22.45, 0.05)),
        ('回程约 72 s 落回停机坪', lambda r: (r['toPad']['t'], r['toPad']['x'], r['toPad']['z']), lambda v: near(v[0], 72, 5) and near(v[1], -242, 0.5) and near(v[2], -109, 0.5)),
        ('手动爬升离地 > 20 m', lambda r: r['climb']['agl'], lambda v: isinstance(v, (int, float)) and v > 20),
    ],
}


def main():
    names = sys.argv[1:] or list(CHECKS)
    failed = 0
    for n in names:
        t0 = time.time()
        p = subprocess.run([sys.executable, os.path.join(HERE, f'{n}_test.py')], capture_output=True, text=True, timeout=1800)
        r = parse(p.stdout)
        errs = r.get('[]') is None and [l for l in p.stdout.splitlines() if l.startswith('[') and l != '[]']
        print(f'== {n}（{round(time.time() - t0)} s）')
        if p.returncode != 0:
            print('  ✗ 脚本异常退出：', (p.stderr or p.stdout)[-400:]); failed += 1; continue
        for desc, get, ok in CHECKS[n]:
            try:
                v = get(r); good = ok(v)
            except Exception as e:
                v, good = f'取值失败：{e!r}', False
            print(f"  {'✓' if good else '✗'} {desc}：{v}")
            failed += 0 if good else 1
        if errs:
            print('  ✗ 页面报错：', errs[:3]); failed += 1
    print('\n基线断言全部通过' if not failed else f'\n{failed} 项基线断言失败')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
