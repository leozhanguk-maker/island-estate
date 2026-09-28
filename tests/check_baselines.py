# 物理/载具基线断言：运行现有的 5 个浏览器测试，解析输出并对照基线数值（HANDOVER“当前测试基线”）
# 这些脚本本身只打印数据，本文件负责判定通过/失败。
# 用法：python3 tests/check_baselines.py [phys drive boat cruise heli dorm kitchen villa]
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
        ('别墅正门门洞左中右三条线都能从雨篷下走进首层大堂（z < -42.2、脚底 11.48）', lambda r: r['v_entry'], lambda v: isinstance(v, list) and len(v) == 6 and all(v[i] < -42.2 and near(v[i + 1], 11.48, 0.1) for i in range(0, 6, 2))),
        ('别墅屋顶脚底 22.45', lambda r: r['v_roof']['feet'], lambda v: near(v, 22.45, 0.05)),
        ('东峰塔平台 77.93', lambda r: r['t_platform']['feet'], lambda v: near(v, 77.93, 0.05)),
        ('闸顶步道 4.53', lambda r: r['g_walk']['feet'], lambda v: near(v, 4.53, 0.05)),
        ('闸口警戒塔每层一跑楼梯登顶（各层 5.25 / 7.9 / 10.55，观察室 13.32）', lambda r: r['gt_floors'] + [r['gt_top']['feet']], lambda v: all(near(a, b, 0.1) for a, b in zip(v, [5.25, 7.9, 10.55, 13.32, 13.32]))),
        ('闸口警戒塔北门进入一楼不被挡（2.6）', lambda r: (r['gt_room']['feet'], r['gt_room']['z']), lambda v: near(v[0], 2.6, 0.05) and v[1] > 118.3),
        ('闸口警戒塔顶层外圈可绕观察室走一整圈（各角误差 < 0.3 m、始终在顶层 13.32）', lambda r: r['gt_ring'], lambda v: isinstance(v, list) and len(v) == 10 and all(v[i] < 0.3 and near(v[i + 1], 13.32, 0.1) for i in range(0, 10, 2))),
        ('东闸墩拉手开闸', lambda r: (r['g_prompt'], r['g_target']), lambda v: '拉下拉手' in v[0] and v[1] == 1),
        ('机库地坪高出地面 0.3', lambda r: r['hangarFloorVsGround'], lambda v: near(v, 0.3, 0.05)),
        ('瞭望塔顶 56.7', lambda r: r['towerTop']['feet'], lambda v: near(v, 56.7, 0.1)),
        ('网球场 13.3', lambda r: r['tennis']['feet'], lambda v: near(v, 13.3, 0.1)),
        ('开闸时走上闸门被移到桥墩（P-009）', lambda r: (r['g_openWalk']['x'], r['g_openWalk']['feet'], r['g_openWalk']['mode']), lambda v: near(abs(v[0]), 40.2, 0.6) and near(v[1], 5.0, 0.3) and v[2] == 'walk'),
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
        ('不按 F 从浮台走不上船（被挡在船体轮廓外）', lambda r: (r['wallIn']['onBoat'], r['wallIn']['lx']), lambda v: v[0] is False and v[1] < -27.6),
        ('浮台上提示并按 F 登船后在船上', lambda r: (r['boardPrompt'], r['boarded']['onBoat']), lambda v: '按 F 登上游艇' in v[0] and v[1] is True),
        ('按 F 登船落在主甲板一楼舱门口（局部 -19.8, 0，脚底 2.26），正对沙龙电视', lambda r: (r['boarded']['lx'], r['boarded']['lz'], r['boarded']['feet'], r['boardFaceTV']), lambda v: near(v[0], -19.8, 0.15) and near(v[1], 0, 0.15) and near(v[2], 2.26, 0.05) and v[3] > 0.99),
        ('船上不按 F 走不下船', lambda r: (r['wallOut']['onBoat'], r['wallOut']['lx']), lambda v: v[0] is True and v[1] > -27.8),
        ('靠泊时船边按 F 离船落到登岸浮台', lambda r: (r['leavePrompt'], r['leftToDock']['onBoat'], r['leftToDock']['feet'], r['leftToDock']['lx']), lambda v: '按 F 离开游艇' in v[0] and v[1] is False and v[2] > 0.2 and v[3] < -27.7),
        ('再按 F 重新登船', lambda r: r['reboard']['onBoat'], lambda v: v is True),
        ('游泳平台经梯级上后甲板（2.26）', lambda r: (r['platStair']['onBoat'], r['platStair']['feet']), lambda v: v[0] is True and near(v[1], 2.26, 0.05)),
        ('走到驾驶台舵位（上层 5.16）', lambda r: r['helmSpot']['feet'], lambda v: near(v, 5.16, 0.1)),
        ('舵位可接管驾驶', lambda r: r['driving'], lambda v: v is True),
        ('出港四段零碰撞', lambda r: [r[k]['hit'] for k in ('leg1', 'leg2', 'leg3', 'leg4')], lambda v: all(h is None for h in v)),
        ('驶出峡谷（bz > 250）', lambda r: r['leg4']['bz'], lambda v: isinstance(v, (int, float)) and v > 250),
        ('航行中人随船移动', lambda r: r['carried']['onBoat'], lambda v: v is True),
        ('主甲板走过负一舱盖不掉下去（2.45）', lambda r: (r['hatch']['onBoat'], r['hatch']['feet']), lambda v: v[0] is True and near(v[1], 2.45, 0.05)),
        ('上甲板经楼梯上日光甲板（7.88）', lambda r: (r['sunDeck']['feet'], r['sunDeckIn']['feet']), lambda v: near(v[0], 7.88, 0.05) and near(v[1], 7.88, 0.05)),
        ('外海鸣笛召唤鲸群与鱼群', lambda r: (r['horn'], r['showNear']), lambda v: '正在游向游艇' in v[0] and v[1] == 4),
        ('行驶中船边按 F 跳入附近海域', lambda r: (r['jumpPrompt'], r['jumped']['onBoat'], r['afterJump']['mode'], r['afterJump']['feet']), lambda v: '跳入附近海域' in v[0] and v[1] is False and v[2] == 'swim' and v[3] < 0.3),
    ],
    'cruise': [
        ('自动巡航完成', lambda r: r['done'], lambda v: v is True),
        ('全程零碰撞', lambda r: r['hits'], lambda v: v == 0),
        ('用时约 10.4 分钟', lambda r: r['minutes'], lambda v: near(v, 10.4, 0.4)),
        ('回到泊位 (30, 87, π)', lambda r: (r['final']['x'], r['final']['z'], r['final']['yaw']), lambda v: near(v[0], 30, 0.5) and near(v[1], 87, 0.5) and near(v[2], 3.142, 0.05)),
        ('人仍在船上', lambda r: r['player']['onBoat'], lambda v: v is True),
    ],
    'dorm': [
        ('入口雨篷两根柱都落到地面（柱底不高于柱下地面，V-021）', lambda r: r['canopyCols'], lambda v: isinstance(v, list) and len(v) == 2 and all(x <= 0.0 for x in v)),
        ('前庭两处花池种水仙（每池至少 10 株）', lambda r: r['frontPots'], lambda v: isinstance(v, int) and v >= 20),
        ('1 层户门关着走不进；按 E 开门后进户（脚底 15.94）', lambda r: (r['door1Prompt'], r['door1Closed']['z'], r['in1']['z'], r['in1']['feet']), lambda v: '开门进入 1 层' in v[0] and v[1] < 1.3 and v[2] > 2.5 and near(v[3], 15.94, 0.03)),
        ('屋面楼梯间东侧梯井被墙挡住，不会掉下去（脚底保持 51.93）', lambda r: (r['roofVoid']['z'], r['roofVoid']['feet']), lambda v: v[0] > -2.85 and near(v[1], 51.93, 0.03)),
        ('前庭经入口台阶走进 1 层大堂（脚底 15.94）', lambda r: r['lobby']['feet'], lambda v: near(v, 15.94, 0.03)),
        ('梯厅按 E 叫电梯，门在 3 秒内打开', lambda r: (r['callPrompt'], r['doorOpenT']), lambda v: '电梯' in v[0] and v[1] < 3),
        ('走进轿厢（轿厢地面 15.94）', lambda r: (r['inCar']['z'], r['inCar']['feet']), lambda v: v[0] < -2.2 and near(v[1], 15.94, 0.03)),
        ('轿厢内按 E 选 12 层，60 秒内到站开门，人随轿厢到 48.93', lambda r: (r['sel'], r['rideT'], r['carTop']['at'], r['carTop']['feet']), lambda v: v[0] == 11 and v[1] < 60 and v[2] == 11 and near(v[3], 48.93, 0.05)),
        ('出电梯到 12 层楼道', lambda r: (r['corr12']['z'], r['corr12']['feet']), lambda v: v[0] > -1.25 and near(v[1], 48.93, 0.03)),
        ('另一部电梯不在本层：厅门关着走不进电梯井', lambda r: (r['bAt'], r['shaftB']['z']), lambda v: v[0] != 11 and v[1] > -1.3),
        ('户门关着走不进户', lambda r: (r['doorPrompt'], r['doorClosed']['z']), lambda v: '开门进入' in v[0] and v[1] > -1.3),
        ('按 E 开门后进户、走到客厅与主卧', lambda r: (r['inUnit']['z'], r['living']['x'], r['master']['x'], r['master']['feet']), lambda v: v[0] < -2.5 and v[1] > 9 and v[2] > 11 and near(v[3], 48.93, 0.03)),
        ('12 层楼梯经中间平台（50.43）上到屋顶（51.93）', lambda r: (r['midLanding']['feet'], r['roofLanding']['feet'], r['roof']['feet']), lambda v: near(v[0], 50.43, 0.05) and near(v[1], 51.93, 0.03) and near(v[2], 51.93, 0.03)),
        ('屋顶女儿墙挡住，不会走出楼外', lambda r: r['roofEdge']['z'], lambda v: isinstance(v, (int, float)) and v < 10),
    ],
    'kitchen': [
        ('别墅客厅经楼梯西侧过道走到西门，门槛处脚底保持首层 11.48（不掉到地面）', lambda r: (r['villaAisle']['feet'], r['villaDoor']['feet']), lambda v: near(v[0], 11.48, 0.02) and near(v[1], 11.48, 0.02)),
        ('经连廊进展示厨房，全程与别墅首层齐平（11.48）', lambda r: (r['corridor']['feet'], r['showIn']['x'], r['showIn']['feet']), lambda v: near(v[0], 11.48, 0.02) and v[1] < 6 and near(v[2], 11.48, 0.02)),
        ('中岛南侧经玻璃隔断推拉门进中式热厨（地面低 2 cm：11.46）', lambda r: (r['hot']['x'], r['hot']['feet']), lambda v: v[0] < 0.9 and near(v[1], 11.46, 0.015)),
        ('热厨经隔墙门进干货储藏间', lambda r: (r['dry']['x'], r['dry']['feet']), lambda v: v[0] < -3.3 and near(v[1], 11.48, 0.02)),
        ('冷库进不去（隔墙挡住）', lambda r: r['cold']['x'], lambda v: v > -3.0),
        ('洗碗间经西侧后勤门进后勤院（基座 11.33）', lambda r: (r['dish']['x'], r['yard']['x'], r['yard']['feet']), lambda v: v[0] < -3.3 and v[1] < -6.3 and near(v[2], 11.33, 0.02)),
        ('后勤院西侧出入口经石阶下到场地', lambda r: (r['yardStairs']['x'], r['yardStairs']['feet'], r['yardGround']), lambda v: v[0] < -17 and near(v[1], v[2], 0.1)),
        ('展示厨房经南侧玻璃门到户外餐台（11.45），经南沿石阶下到高尔夫球场', lambda r: (r['deck']['z'], r['deck']['feet'], r['golf']['z'], r['golf']['feet'], r['golfGround']), lambda v: v[0] > 4.7 and near(v[1], 11.45, 0.02) and v[2] > 12 and near(v[3], v[4], 0.1)),
        ('基座外地面上的人被挡土墙挡住，不会钻进基座', lambda r: (r['podiumOut']['x'], r['podiumOut']['feet']), lambda v: v[0] < -6.3 and v[1] < 10.5),
        ('别墅西墙除西门外仍是实墙', lambda r: r['villaWallX'], lambda v: v > -11.0),
        ('厨房馆座位 20 个（4 高脚凳 + 6 餐椅 + 10 户外餐椅）', lambda r: r['seats'], lambda v: v == 20),
    ],
    'villa': [
        ('正门进客厅，经东侧楼梯（扶手在西侧）上二层（15.25）', lambda r: (r['hall']['feet'], r['s1']['x'], r['s1']['feet']), lambda v: near(v[0], 11.48, 0.02) and v[1] > 9 and near(v[2], 15.25, 0.02)),
        ('二层楼梯厅北门到阳台（15.43）', lambda r: (r['balcony']['z'], r['balcony']['feet']), lambda v: v[0] < -8 and near(v[1], 15.43, 0.03)),
        ('宽过道经主卧门进主卧，主卧西门进主卫', lambda r: (r['corridor']['feet'], r['bedroom']['x'], r['masterBath']['x'], r['masterBath']['z']), lambda v: near(v[0], 15.25, 0.02) and v[1] < -1 and 0.8 < v[2] < 5.0 and v[3] < -3.4),
        ('主卫与客卫之间是隔离墙（往东走被挡住）', lambda r: r['masterToGuest']['x'], lambda v: v < 5.0),
        ('客卫从东门进入', lambda r: (r['guest']['x'], r['guest']['z']), lambda v: 5.2 < v[0] < 6.35 and v[1] < -3.4),
        ('衣帽间从过道进不去、只能从东门进入', lambda r: (r['closetWall']['z'], r['closet']['x'], r['closet']['z']), lambda v: v[0] < -0.8 and v[1] < 5.5 and v[2] > -0.7),
        ('走廊到 S2 南端上三层（18.8）', lambda r: (r['s2']['z'], r['s2']['feet']), lambda v: v[0] < -2.5 and near(v[1], 18.8, 0.02)),
        ('三层北卧、南卧的门都靠近中间墙，可以进入', lambda r: (r['northBed']['x'], r['northBed']['z'], r['southBed']['x'], r['southBed']['z']), lambda v: v[0] < 1.3 and v[1] < 0 and v[2] < 1.3 and v[3] > 0.2),
        ('三层洗浴室门朝北，可以进入', lambda r: r['bath3']['z'], lambda v: v > 1.4),
        ('S3 由北向南上屋顶（22.45）', lambda r: r['roof']['feet'], lambda v: near(v, 22.45, 0.03)),
        ('公共卫生间男卫、女卫都从北门进入（11.48）', lambda r: (r['men']['z'], r['men']['feet'], r['women']['z'], r['women']['feet']), lambda v: v[0] > -9.2 and near(v[1], 11.48, 0.02) and v[2] > -9.2 and near(v[3], 11.48, 0.02)),
        ('男卫走不进厨房、也走不进女卫', lambda r: (r['menToKitchen']['z'], r['menToWomen']['x']), lambda v: v[0] < -4.7 and v[1] < -21.0),
        ('连廊北沿沿厨房东侧的小路绕到卫生间门前；门前小路西端石阶下到高尔夫球场', lambda r: (r['pathFront']['x'], r['pathFront']['feet'], r['golf']['x'], r['golf']['feet'], r['golfGround']), lambda v: near(v[0], -23.8, 0.3) and near(v[1], 11.33, 0.02) and v[2] < -29 and near(v[3], v[4], 0.1)),
        ('别墅座位 46 个（首层两组会客区 21 + 阅读角 2 + 主卧 4 + 阳台 3 + 露台 6 + 三层 10）', lambda r: r['seats'], lambda v: v == 46),
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
