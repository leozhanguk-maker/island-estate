# 巡逻机器人：自动漫游、游泳、驾驶汽车/拖拉机、游艇、直升机，检测
#   报错、非数值位置、穿地、越界、卡住、穿墙、掉帧
# 输出带坐标与复现步骤的问题清单：reports/patrol/report.md 与 report.json
#
# 用法：
#   python3 tests/patrol.py                 # 默认种子（按日期），完整巡逻
#   python3 tests/patrol.py --quick         # 快速巡逻（约 1/3 计划）
#   python3 tests/patrol.py --seed=42       # 指定种子
#   python3 tests/patrol.py --repro=walk-07 --seed=42   # 只重放一个计划
#   python3 tests/patrol.py --strict        # 有未登记的新问题时以退出码 1 结束
import os, sys, json, math, time, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import Session, report_dir, write_json, load_known, arg

SEED = int(arg('seed', datetime.date.today().strftime('%Y%m%d')))
QUICK = bool(arg('quick'))
ONLY = arg('repro')

# 固定起点：取自早期的游戏内传送按钮（11_fp.js TP 之后有改名和增删，这里保持不变，以免改变固定种子的巡逻计划）
TP = [('别墅北门', 180, -32, 0), ('登岸浮台', 60, 87, math.pi / 2), ('水闸步道', 30, 126.4, math.pi / 2), ('沙滩', 0, 20, math.pi),
      ('西山机场', -228, -98, 0.9), ('农业区', -40, -8, 0), ('住宅楼', 0, -128, 0)]


class Rng:
    def __init__(self, s): self.a = s & 0xffffffff
    def __call__(self):
        self.a = (self.a * 1664525 + 1013904223) & 0xffffffff
        return self.a / 4294967296
    def pick(self, l): return l[int(self() * len(l)) % len(l)]
    def uni(self, a, b): return a + (b - a) * self()


# ---------------- 页面端执行器 ----------------
RUN_JS = r'''(plan) => {
  const S = __sim, st = S.st, D = S.D, T = S.T, fp = S.fp, { DRIVE, BOAT, HELI, GATE } = D;
  // 复位
  if (st.seat) fp.standUp(); DRIVE.active = null; document.body.classList.remove('driving'); BOAT.auto = null; HELI.auto = null;
  const ctx = { vehicle: plan.type, bboxHit: S.bboxHit, expectOnBoat: plan.type === 'boat' || plan.type === 'cruise' };
  const s0 = plan.start;
  const toW = (lx, lz) => [BOAT.x + lx * Math.cos(BOAT.yaw) + lz * Math.sin(BOAT.yaw), BOAT.z - lx * Math.sin(BOAT.yaw) + lz * Math.cos(BOAT.yaw)];
  if (plan.type === 'car' || plan.type === 'tractor') {
    const c = DRIVE.cars[plan.type === 'car' ? 0 : 1]; c.x = s0.x; c.z = s0.z; c.yaw = s0.yaw; c.v = 0; c.y = D.gh(s0.x, s0.z); c.pitch = 0; c.roll = 0; DRIVE.active = c; fp.teleport(s0.x, s0.z, 0);
  } else if (plan.type === 'boat' || plan.type === 'cruise') {
    BOAT.x = BOAT.home.x; BOAT.z = BOAT.home.z; BOAT.yaw = BOAT.home.yaw; BOAT.v = 0; BOAT.thr = 0; BOAT.rud = 0; D.syncBoat(0);
    const [hx, hz] = toW(6.4, 0.9); fp.teleport(hx, hz, 0, 5.15 + BOAT.y, true); for (let i = 0; i < 5; i++) fp.update(1 / 60);
    if (plan.type === 'boat') { GATE.target = 1; GATE.open = 1; DRIVE.active = BOAT; } else { D.startCruise(); }
  } else if (plan.type === 'heli' || plan.type === 'heliAuto') {
    const sp = D.HELI_SPOTS.pad; HELI.x = sp.x; HELI.z = sp.z; HELI.y = sp.y; HELI.yaw = sp.yaw; HELI.vx = HELI.vy = HELI.vz = 0; HELI.ground = true; HELI.rpm = plan.type === 'heli' ? 1 : 0;
    fp.teleport(HELI.x + 3, HELI.z + 1, 0); DRIVE.active = HELI; if (plan.type === 'heliAuto') D.heliAutoToggle();
  } else {
    fp.teleport(s0.x, s0.z, s0.yaw, s0.feet === undefined ? undefined : s0.feet);
  }
  ctx.teleported = true;
  const mon = S.makeMonitor(ctx);
  const dt = plan.dt, times = []; let steps = 0;
  const t0 = performance.now();
  for (const [yaw, keys, secs] of plan.actions) {
    if (yaw !== null && !DRIVE.active) st.yaw = yaw;
    const n = Math.round(secs / dt);
    for (let i = 0; i < n; i++) {
      const a = performance.now(); S.step(dt, keys); times.push(performance.now() - a); steps++;
      if (!mon.check(dt, keys)) break;
      if (plan.type === 'heliAuto' && !HELI.auto) break;
      if (plan.type === 'cruise' && !BOAT.auto) break;
    }
    if (mon.issues.length > 60) break;
  }
  if (plan.type === 'cruise' && BOAT.auto) mon.issues.push({ kind: '卡住', msg: `自动巡航超时未完成（阶段 ${BOAT.auto.i}）`, x: +BOAT.x.toFixed(1), z: +BOAT.z.toFixed(1), y: 0, t: +S.t.toFixed(1) });
  if (plan.type === 'heliAuto' && HELI.auto) mon.issues.push({ kind: '卡住', msg: `直升机自动飞行超时未完成（阶段 ${HELI.auto.phase}）`, x: +HELI.x.toFixed(1), z: +HELI.z.toFixed(1), y: +HELI.y.toFixed(1), t: +S.t.toFixed(1) });
  // 复位载具，避免影响下一个计划
  DRIVE.active = null; BOAT.auto = null; HELI.auto = null; BOAT.v = 0; BOAT.thr = 0; BOAT.rud = 0; GATE.target = 0; GATE.open = 0;
  times.sort((a, b) => a - b);
  return { issues: mon.issues, end: S.snap(), steps, wallMs: Math.round(performance.now() - t0), stepMs: { p50: +(times[times.length >> 1] || 0).toFixed(3), p99: +(times[Math.floor(times.length * 0.99)] || 0).toFixed(3), max: +(times[times.length - 1] || 0).toFixed(2) } };
}'''

# 取随机起点所需的场景数据
DATA_JS = r'''() => {
  const D = __dbg, T = __fp._test, X = __island.X;
  const walks = D.COLL.walks.filter(w => w.kind === 'rect' && w.hw * w.hd > 1.5).map(w => [w.x, w.z, w.hw, w.hd, w.rot || 0, w.y]);
  const roads = X.roads.map(r => r.pts.filter((p, i) => i % 8 === 0).map(p => [p[0], p[1], p[2]]));
  const cars = D.DRIVE.cars.map(c => [c.x, c.z, c.yaw]);
  return { walks, roads, cars, lake: [D.L.lake.x, D.L.lake.z], upper: [D.L.upperLake.x, D.L.upperLake.z] };
}'''
# 起点可用性：四周 8 个方向中能迈步的数量（起点落在夹缝里会被误判为被困）
FREE_JS = r'''([x, z, f]) => { const T = __fp._test, S = __sim; if (S.insideSolid(x, z, f + 0.3)) return 0; let n = 0; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, nx = x + Math.cos(a) * 0.3, nz = z + Math.sin(a) * 0.3; if (T.canStep(x, z, nx, nz, f, false) && !S.insideSolid(nx, nz, f + 0.3)) n++; } return n; }'''
PROBE_JS = r'''([x, z]) => { const T = __fp._test, g = __dbg.gh(x, z), w = T.waterAt(x, z); return { g, w: w ? { level: w.level, bottom: w.bottom, pool: !!w.pool } : null, solid: !!__sim.insideSolid(x, z, g + 0.3) || __fp.hitsSolid(x, z, g) }; }'''

# 渲染耗时：在若干机位各渲染 3 帧取中位数（软件渲染下只看相对值）
RENDER_JS = r'''([x, z, yaw]) => { const I = __island, fp = __fp, st = fp._st; fp.teleport(x, z, yaw); for (let i = 0; i < 5; i++) fp.update(1 / 60);
  const gl = I.renderer.getContext(), ts = []; I.renderer.info.autoReset = false;
  for (let i = 0; i < 3; i++) { I.renderer.info.reset(); const a = performance.now(); I.renderer.render(I.scene, I.camera); gl.finish(); ts.push(performance.now() - a); }
  ts.sort((a, b) => a - b); return { ms: +ts[1].toFixed(1), tris: I.renderer.info.render.triangles, calls: I.renderer.info.render.calls }; }'''


def make_plans(s, data, rng):
    plans = []
    def walk_actions(n, swim=False):
        acts = []
        for _ in range(n):
            keys = ['KeyW']
            r = rng()
            if r < 0.25: keys.append('ShiftLeft')
            elif r < 0.35 and not swim: keys.append('Space')
            if swim and rng() < 0.3: keys.append('KeyC')
            acts.append([round(rng.uni(-math.pi, math.pi), 3), keys, round(rng.uni(0.8, 2.5), 2)])
        return acts
    nW = 8 if QUICK else 20
    # 1) 固定传送点漫游
    for i, (name, x, z, yaw) in enumerate(TP):
        plans.append({'id': f'walk-tp{i}', 'type': 'walk', 'label': f'从「{name}」随机漫游', 'start': {'x': x, 'z': z, 'yaw': round(yaw, 3)}, 'dt': 1 / 60, 'actions': walk_actions(nW)})
    # 2) 随机陆地点漫游
    k, tries = 0, 0
    while k < (6 if QUICK else 16) and tries < 400:
        tries += 1
        x, z = round(rng.uni(-360, 360), 1), round(rng.uni(-210, 210), 1)
        p = s.js(PROBE_JS, [x, z])
        if p['g'] < 1 or p['w'] or p['solid']:
            continue
        plans.append({'id': f'walk-{k:02d}', 'type': 'walk', 'label': '随机陆地点漫游', 'start': {'x': x, 'z': z, 'yaw': 0}, 'dt': 1 / 60, 'actions': walk_actions(nW)})
        k += 1
    # 3) 建筑内可行走面（楼层、平台、甲板）上漫游
    walks = data['walks']
    i, tries = 0, 0
    while i < (6 if QUICK else 18) and tries < 600:
        tries += 1
        w = rng.pick(walks)
        c, sn = math.cos(w[4]), math.sin(w[4])
        lx, lz = rng.uni(-w[2], w[2]) * 0.8, rng.uni(-w[3], w[3]) * 0.8
        x, z = round(w[0] + c * lx + sn * lz, 2), round(w[1] - sn * lx + c * lz, 2)
        if s.js(FREE_JS, [x, z, w[5]]) < 6:
            continue
        i += 1
        plans.append({'id': f'floor-{i - 1:02d}', 'type': 'walk', 'label': f'楼面/平台漫游（y={round(w[5], 2)}）', 'start': {'x': x, 'z': z, 'yaw': 0, 'feet': round(w[5], 2)}, 'dt': 1 / 60, 'actions': walk_actions(nW)})
    # 4) 游泳潜水：湖、山顶湖、泊港、泳池、近海
    swims = [('淡水湖', *data['lake']), ('山顶小湖', *data['upper']), ('泊港', 0, 60), ('泳池', 180, -58.6)]
    k, tries = 0, 0
    while k < (2 if QUICK else 6) and tries < 400:
        tries += 1
        x, z = round(rng.uni(-360, 360), 1), round(rng.uni(-210, 210), 1)
        p = s.js(PROBE_JS, [x, z])
        if p['w'] and not p['w']['pool'] and p['w']['level'] - p['w']['bottom'] > 2.5:
            swims.append(('近海/水域', x, z)); k += 1
    for i, (name, x, z) in enumerate(swims):
        w = s.js(PROBE_JS, [x, z])['w']
        feet = round(w['level'] - 1.42, 2) if w and w['level'] - w['bottom'] > 1.5 else None
        st0 = {'x': x, 'z': z, 'yaw': 0}
        if feet is not None: st0['feet'] = feet            # 从水面出发（直接传送会落到水底）
        plans.append({'id': f'swim-{i:02d}', 'type': 'walk', 'label': f'{name} 游泳潜水', 'start': st0, 'dt': 1 / 60, 'actions': walk_actions(nW // 2, swim=True)})
    # 5) 汽车 / 拖拉机：停车位 + 随机道路点
    def drive_actions(n):
        acts = []
        for _ in range(n):
            r = rng()
            keys = ['KeyW'] if r < 0.55 else ['KeyW', 'KeyA'] if r < 0.7 else ['KeyW', 'KeyD'] if r < 0.85 else ['KeyS'] if r < 0.95 else ['Space']
            acts.append([None, keys, round(rng.uni(1, 4), 2)])
        return acts
    for vt, idx in (('car', 0), ('tractor', 1)):
        cx, cz, cy = data['cars'][idx]
        plans.append({'id': f'{vt}-park', 'type': vt, 'label': f'{"Cybertruck" if vt == "car" else "拖拉机"} 从车位出发', 'start': {'x': cx, 'z': cz, 'yaw': cy}, 'dt': 1 / 60, 'actions': drive_actions(10 if QUICK else 18)})
        for i in range(2 if QUICK else 5):
            road = rng.pick([r for r in data['roads'] if len(r) > 2])
            j = int(rng() * (len(road) - 1))
            a, b = road[j], road[j + 1]
            yaw = math.atan2(-(b[1] - a[1]), b[0] - a[0])
            plans.append({'id': f'{vt}-road{i}', 'type': vt, 'label': f'{"Cybertruck" if vt == "car" else "拖拉机"} 道路随机驾驶', 'start': {'x': round(a[0], 2), 'z': round(a[1], 2), 'yaw': round(yaw, 3)}, 'dt': 1 / 60, 'actions': drive_actions(10 if QUICK else 18)})
    # 6) 游艇：手动随机驾驶 + 自动巡航全程
    for i in range(1 if QUICK else 3):
        acts = []
        for _ in range(12):
            r = rng()
            keys = ['KeyW'] if r < 0.5 else ['KeyW', 'KeyA'] if r < 0.7 else ['KeyW', 'KeyD'] if r < 0.9 else ['KeyS']
            acts.append([None, keys, round(rng.uni(3, 8), 1)])
        plans.append({'id': f'boat-{i}', 'type': 'boat', 'label': '游艇手动随机驾驶（人在舵位）', 'start': {}, 'dt': 1 / 30, 'actions': acts})
    if not QUICK:
        plans.append({'id': 'cruise', 'type': 'cruise', 'label': '游艇自动巡航全程（人在舵位）', 'start': {}, 'dt': 1 / 20, 'actions': [[None, [], 900]]})
    # 7) 直升机：自动往返 + 手动随机飞行
    plans.append({'id': 'heli-auto', 'type': 'heliAuto', 'label': 'H125 自动飞往别墅屋顶', 'start': {}, 'dt': 1 / 20, 'actions': [[None, [], 200]]})
    for i in range(1 if QUICK else 3):
        acts = [[None, ['Space'], 4]]
        for _ in range(10):
            r = rng()
            keys = ['KeyW'] if r < 0.4 else ['KeyW', 'KeyA'] if r < 0.55 else ['KeyW', 'KeyD'] if r < 0.7 else ['ShiftLeft'] if r < 0.85 else ['Space']
            acts.append([None, keys, round(rng.uni(2, 6), 1)])
        acts.append([None, ['ShiftLeft'], 20])
        plans.append({'id': f'heli-{i}', 'type': 'heli', 'label': 'H125 手动随机飞行', 'start': {}, 'dt': 1 / 20, 'actions': acts})
    return plans


def repro_text(plan):
    """人类可读的复现步骤"""
    t = plan['type']
    s = plan['start']
    lines = ['打开 `dist/island.html#fp`（或在浏览器控制台里用 `#fp,still,debug` 调试模式）']
    if t == 'walk':
        lines.append(f"传送到 ({s['x']}, {s['z']})" + (f"，脚底高度 {s['feet']}" if 'feet' in s else '') + f"，朝向 {round(math.degrees(s['yaw']))}°（调试：`__fp.teleport({s['x']}, {s['z']}, {s['yaw']}{', ' + str(s['feet']) if 'feet' in s else ''})`）")
        for yaw, keys, secs in plan['actions'][:12]:
            lines.append(f"朝 {round(math.degrees(yaw))}° 按住 {'+'.join(k.replace('Key', '').replace('Left', '') for k in keys)} {secs} 秒")
        if len(plan['actions']) > 12:
            lines.append(f"……共 {len(plan['actions'])} 段，完整序列见 report.json")
    elif t in ('car', 'tractor'):
        lines.append(f"把{'Cybertruck' if t == 'car' else '拖拉机'}放到 ({s['x']}, {s['z']})，朝向 {round(math.degrees(s['yaw']))}°，上车")
        lines.append('依次：' + '；'.join(f"{'+'.join(k.replace('Key', '') for k in keys)} {secs}s" for _, keys, secs in plan['actions'][:10]) + ('……' if len(plan['actions']) > 10 else ''))
    elif t == 'boat':
        lines.append('登岸浮台按 E 登船 → 上驾驶台舵位按 E 驾驶（水闸已开）')
        lines.append('依次：' + '；'.join(f"{'+'.join(k.replace('Key', '') for k in keys)} {secs}s" for _, keys, secs in plan['actions']))
    elif t == 'cruise':
        lines.append('登船到舵位，按 C 启动自动巡航，等待全程结束')
    elif t == 'heliAuto':
        lines.append('西山机场登上 H125，按 G 自动飞往别墅屋顶')
    elif t == 'heli':
        lines.append('西山机场登上 H125（旋翼已起转）')
        lines.append('依次：' + '；'.join(f"{'+'.join(k.replace('Key', '').replace('Left', '') for k in keys)} {secs}s" for _, keys, secs in plan['actions']))
    lines.append(f"自动复现：`python3 tests/patrol.py --seed={SEED} --repro={plan['id']}`")
    return lines


def main():
    out_dir = report_dir('patrol')
    known = load_known()
    t_start = time.time()
    with Session('#fp,still,q=low') as s:
        data = s.js(DATA_JS)
        plans = make_plans(s, data, Rng(SEED))
        if ONLY:
            plans = [p for p in plans if p['id'] == ONLY]
            if not plans:
                print('找不到计划', ONLY); sys.exit(2)
        results = []
        for p in plans:
            r = s.js(RUN_JS, p)
            results.append((p, r))
            print(f"{p['id']:<12} {p['label'][:24]:<26} 步数 {r['steps']:>6}  问题 {len(r['issues']):>3}  单步 p99 {r['stepMs']['p99']} ms")
        # 渲染耗时热点（高档画质下另开会话测）
        render = []
    if not ONLY:
        with Session('#fp,still,q=high', size=(960, 540)) as s2:
            spots = [(name, x, z, yaw) for name, x, z, yaw in TP] + [('东峰瞭望塔', 221, -147.5, 0.4), ('别墅泳池', 180, -64, math.pi), ('游艇后甲板', 53, 86, math.pi / 2)]
            for name, x, z, yaw in spots:
                r = s2.js(RENDER_JS, [x, z, yaw]); r.update(name=name, x=x, z=z)
                render.append(r)
            console, errors = s2.console, s2.errors
    else:
        console, errors = [], []
    console += s.console
    errors += s.errors

    # ---------- 汇总、去重 ----------
    issues = {}
    def sig_of(kind, x, z, extra=''):
        return f"{kind}|{round(x / 5) * 5},{round(z / 5) * 5}{('|' + extra) if extra else ''}"
    for p, r in results:
        for it in r['issues']:
            sig = sig_of(it['kind'], it['x'], it['z'], p['type'] if p['type'] not in ('walk',) else '')
            if sig not in issues:
                issues[sig] = dict(it, sig=sig, plan=p['id'], label=p['label'], count=0, repro=repro_text(p))
            issues[sig]['count'] += 1
    for e in errors:
        sig = '报错|' + e[:80]
        issues.setdefault(sig, {'kind': '报错', 'msg': e, 'x': None, 'z': None, 'y': None, 'sig': sig, 'plan': '-', 'label': '页面未捕获异常', 'count': 0, 'repro': ['加载页面即出现']})['count'] += 1
    for typ, text in console:
        kind = '报错' if typ == 'error' else '控制台警告'
        sig = f'{kind}|' + text[:80]
        issues.setdefault(sig, {'kind': kind, 'msg': text, 'x': None, 'z': None, 'y': None, 'sig': sig, 'plan': '-', 'label': '控制台输出', 'count': 0, 'repro': ['加载页面或巡逻过程中出现']})['count'] += 1
    # 掉帧：逻辑单步耗时尖峰 + 渲染耗时热点
    for p, r in results:
        if r['stepMs']['max'] > 50:
            sig = f"掉帧|逻辑|{p['id']}"
            issues[sig] = {'kind': '掉帧', 'msg': f"逻辑单步最长 {r['stepMs']['max']} ms（p99 {r['stepMs']['p99']} ms），超过 50 ms 预算", 'x': p['start'].get('x'), 'z': p['start'].get('z'), 'y': None, 'sig': sig, 'plan': p['id'], 'label': p['label'], 'count': 1, 'repro': repro_text(p)}
    if render:
        med = sorted(r['ms'] for r in render)[len(render) // 2]
        for r in render:
            if r['ms'] > med * 2.5:
                sig = f"掉帧|渲染|{r['name']}"
                issues[sig] = {'kind': '掉帧', 'msg': f"渲染 {r['ms']} ms，为各机位中位数 {med} ms 的 {round(r['ms'] / med, 1)} 倍（{r['tris']} 三角面、{r['calls']} 次绘制）", 'x': r['x'], 'z': r['z'], 'y': None, 'sig': sig, 'plan': '-', 'label': f"机位「{r['name']}」渲染热点", 'count': 1, 'repro': [f"传送到「{r['name']}」({r['x']}, {r['z']})，观察帧率"]}

    new = [v for k, v in issues.items() if k not in known]
    old = [v for k, v in issues.items() if k in known]
    stale = [k for k in known if k not in issues and not k.startswith('报错') and k.split('|')[0] in ('穿地', '穿墙', '越界', '卡住', '掉船', '碰撞', '车底入地', '掉帧', '非数值位置')]
    order = ['报错', '非数值位置', '穿地', '穿墙', '越界', '掉船', '卡住', '碰撞', '车底入地', '掉帧', '控制台警告']
    new.sort(key=lambda v: (order.index(v['kind']) if v['kind'] in order else 99, -v['count']))

    rep = {'seed': SEED, 'quick': QUICK, 'date': datetime.datetime.now().isoformat(timespec='seconds'), 'seconds': round(time.time() - t_start),
           'plans': [{'id': p['id'], 'label': p['label'], 'type': p['type'], 'start': p['start'], 'actions': p['actions'], 'steps': r['steps'], 'stepMs': r['stepMs'], 'end': r['end']} for p, r in results],
           'render': render, 'new': new, 'known': old, 'stale_known': stale}
    write_json(os.path.join(out_dir, 'report.json'), rep)
    md = [f"# 巡逻报告\n\n种子 {SEED}{'（快速）' if QUICK else ''}，{len(results)} 个计划，用时 {rep['seconds']} 秒。新问题 {len(new)} 个，已知问题 {len(old)} 个。\n"]
    for v in new:
        loc = f"({v['x']}, {v['z']}, 高 {v['y']})" if v['x'] is not None else ''
        md.append(f"## [{v['kind']}] {v['msg']}\n\n- 位置：{loc}\n- 计划：{v['plan']}（{v['label']}），出现 {v['count']} 次\n- 签名：`{v['sig']}`\n- 复现步骤：\n" + '\n'.join(f'  {i + 1}. {l}' for i, l in enumerate(v['repro'])) + '\n')
    if render:
        md.append('## 各机位渲染耗时（软件渲染，只看相对值）\n\n| 机位 | 毫秒 | 三角面 | 绘制次数 |\n|---|---|---|---|\n' + '\n'.join(f"| {r['name']} | {r['ms']} | {r['tris']} | {r['calls']} |" for r in render) + '\n')
    with open(os.path.join(out_dir, 'report.md'), 'w', encoding='utf8') as f:
        f.write('\n'.join(md))
    print(f"\n新问题 {len(new)} 个，已知 {len(old)} 个；报告：reports/patrol/report.md")
    if stale and not QUICK and not ONLY:
        print(f'已登记但本轮未再出现 {len(stale)} 条（不同种子覆盖范围不同，核实后再从 known_issues.json 移除）')
    for v in new[:40]:
        print(f"  [{v['kind']}] {v['msg'][:90]} @ {v['x']},{v['z']} ×{v['count']} ({v['plan']})")
    # 门禁只拦确定性问题：掉帧在软件渲染下耗时波动大，照常报告与登记，但不判失败
    if arg('strict') and [v for v in new if v['kind'] != '掉帧']:
        sys.exit(1)


if __name__ == '__main__':
    main()
