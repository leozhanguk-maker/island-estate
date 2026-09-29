# 回归测试：每个已修复的程序缺陷一条，问题复发即失败（编号对应 docs/ISSUES.md）
#   P-001 陡坡礁石吞人、P-002 潜水嵌入海底：用巡逻的精确复现计划严格重放
#   P-008 直升机高空穿楼：页面内脚本，直升机在 25 m 高度朝住宅楼平飞
#   P-007 离开舵位后船继续开/打转：页面内脚本，全速左满舵时按 E 离开舵位
#   传送点：漫游传送菜单的每个按钮都落在可站立的地面上，朝向与小地图下方坐标栏一致；宿舍楼传送点按用户指定位置 (14.7, 13.91, -132.0) 朝向 180°
#   P-014 植被随机数按位置独立：把一小块林地挖成海，只有附近的树和灌木变化，12 m 以外的撒点完全不变
#   P-018 驾驶时车影一顿一顿：驾驶中每帧都重绘阴影贴图，步行静止时不重绘（高档、低档各测一次）
#   载具喇叭：驾驶汽车、拖拉机、直升机、游艇时按 H 各自鸣笛（音色不同），ESC 暂停面板列出 H 键
#   P-012 后台线程不可用（Claude 网页预览）时漫游报错、主循环停止：强制主线程生成，高档画质下传送到沙滩草地并持续运行
#   V-022 海面：外海满海面白色碎片（泡沫毯在无泡沫处仍出白斑）、登岸浮台旁水面网格贴着岩石翻折显示成一整片青绿色背面：固定时刻截图按像素统计
#   （P-003～P-006 由 scene_audit --strict 守住；P-009 在 phys_test 的 g_openWalk 断言中）
# 用法：python3 tests/regression.py
import os, sys, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))
from harness import Session, report_dir
from views import RENDER_JS

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


TP_JS = r'''() => { const fp = __fp, st = fp._st, T = fp._test, out = []; document.body.classList.add('fp'); let t = 1e6;
  for (const b of document.querySelectorAll('#fptp button')) {
    b.click(); st.on = true; for (let i = 0; i < 3; i++) fp.update(1 / 60); fp.mapTick(t += 1);
    const floor = T.floorAt(st.pos.x, st.pos.z, st.feet + 0.3), txt = document.getElementById('fpxyz').textContent;
    const want = `X ${st.pos.x.toFixed(1)}  Y ${st.feet.toFixed(2)}  Z ${st.pos.z.toFixed(1)}`;
    out.push({ name: b.textContent, mode: st.mode, pos: [+st.pos.x.toFixed(1), +st.feet.toFixed(2), +st.pos.z.toFixed(1)], gap: +Math.abs(st.feet - floor).toFixed(2), nan: [st.pos.x, st.pos.z, st.feet, st.yaw].some(v => !isFinite(v)), xyzOk: txt.startsWith(want), txt }); }
  return out; }'''
VEG_JS = r'''() => { const D = __dbg, X = __island.X, G = D.G;
  if (typeof D.vegScatter !== 'function') return { err: '__dbg.vegScatter 不存在' };
  const a = D.vegScatter(X, X.H, X.normals, D.QS);
  // 取一棵林中的树为中心，把半径 6 m 内的地形挖到海平面以下（撒点在这里提前跳过、少用随机数）
  const c = a.trees[Math.floor(a.trees.length / 2)], H2 = Float32Array.from(X.H), r = 6;
  for (let z = Math.floor(c[2] - r); z <= c[2] + r; z++) for (let x = Math.floor(c[0] - r); x <= c[0] + r; x++) if (Math.hypot(x - c[0], z - c[2]) <= r) H2[(z - G.z0) * G.nx + (x - G.x0)] = -2;
  const b = D.vegScatter(X, H2, X.normals, D.QS);
  const far = (l) => l.filter(p => Math.hypot(p[0] - c[0], p[2] - c[2]) > 12).map(p => p.slice(0, 3).map(v => v.toFixed(3)).join(',')).sort().join(';');
  const near = (l) => l.filter(p => Math.hypot(p[0] - c[0], p[2] - c[2]) < 6).length;
  return { c: [+c[0].toFixed(1), +c[2].toFixed(1)], trees: [a.trees.length, b.trees.length], shrubs: [a.shrubs.length, b.shrubs.length],
    sameTrees: far(a.trees) === far(b.trees), sameShrubs: far(a.shrubs) === far(b.shrubs), nearA: near(a.trees) + near(a.shrubs), nearB: near(b.trees) + near(b.shrubs) }; }'''
HORN_JS = r'''() => { const D = __dbg, fp = __fp, out = {}; fp._st.on = true;
  const press = () => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyH' })); };
  const car = D.DRIVE.cars.find(c => c.sp && c.sp.horn === 'car'), tr = D.DRIVE.cars.find(c => c.sp && c.sp.horn === 'tractor');
  for (const [name, v] of [['car', car], ['tractor', tr], ['heli', D.HELI], ['boat', D.BOAT]]) { D.HORN.last = null; D.DRIVE.active = v || null; press(); out[name] = D.HORN.last && D.HORN.last.kind; }
  D.DRIVE.active = null; D.HORN.last = null; press(); out.walk = D.HORN.last && D.HORN.last.kind;
  out.esc = [...document.querySelectorAll('#fpgate dt')].some(dt => dt.textContent.trim() === 'H' && /鸣笛/.test(dt.nextElementSibling.textContent));
  return out; }'''
SHADOW_JS = r'''() => { const D = __dbg, fp = __fp, R = __island.renderer, S = D.SHADOW, out = {}; fp._st.on = true;
  const step = (n) => { const n0 = S.n; for (let i = 0; i < n; i++) { R.shadowMap.needsUpdate = false; __island.shadowFollow(i / 60); } return S.n - n0; };
  const car = D.DRIVE.cars.find(c => c.sp && c.sp.horn === 'car');
  fp.teleport(car.x + 4, car.z, 0); step(3); out.walk = step(60);            // 步行静止：不应重绘
  D.DRIVE.active = car; fp._st.pos.set(car.x, car.y + 1.5, car.z); step(3);
  let n0 = S.n; for (let i = 0; i < 60; i++) { car.x += 0.02; fp._st.pos.x = car.x; R.shadowMap.needsUpdate = false; __island.shadowFollow(i / 60); } out.drive = S.n - n0;
  car.x -= 1.2; D.DRIVE.active = null; return out; }'''
READY = "document.getElementById('loading').classList.contains('done')"
FALLBACK_JS = r'''async () => { const fp = __fp, I = __island; fp.enter(false); fp.teleport(0, 20, Math.PI); fp._st.on = true;
  // 直接触发近景草叶在沙滩草地处取色（旧代码在这里读 canvas 得到 NaN 下标并抛错）
  let err = null; try { I.grass.update(fp); } catch (e) { err = String(e); }
  // 主循环仍在运行：渲染帧计数继续增加（主循环因报错停止时计数不再变化）。
  // 软件渲染下高档一帧约 9 秒，固定 4 秒窗口可能一帧都等不到：改为等到计数至少增加 2 次，最多等 90 秒，与帧率快慢无关
  // 按主循环自身的帧数计（渲染调用计数会被海面 FFT 等离屏渲染抬高，主循环中途报错停下时仍会增加）
  const n = () => I.frames, f0 = n(), t0 = performance.now();
  while (n() - f0 < 2 && performance.now() - t0 < 90000) await new Promise(r => setTimeout(r, 500));
  return { err, frames: n() - f0, secs: Math.round((performance.now() - t0) / 1000) }; }'''


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
    with Session('#fp,still,q=low') as s:
        tps = s.js(TP_JS)
    bad = [t for t in tps if t['mode'] != 'walk' or t['gap'] > 0.3 or t['nan'] or not t['xyzOk']]
    print(f"  {'✓' if not bad else '✗'} 传送点 {len(tps)} 个：全部落在可站立地面、坐标栏与程序坐标一致" + ('' if not bad else '；异常：' + '；'.join(f"{t['name']} {t['mode']} 离地 {t['gap']} 坐标栏「{t['txt']}」" for t in bad)))
    failed += 0 if not bad else 1
    dorm = next((t for t in tps if t['name'] == '宿舍楼'), None)
    ok = dorm is not None and dorm['pos'] == [14.7, 13.91, -132.0] and '朝向 180°' in dorm['txt']
    print(f"  {'✓' if ok else '✗'} 宿舍楼传送点在 (14.7, 13.91, -132.0) 朝向 180°：实际 {dorm and dorm['pos']}「{dorm and dorm['txt']}」")
    failed += 0 if ok else 1
    with Session('#fp,still,q=high') as s:
        r = s.js(VEG_JS)
    ok = 'err' not in r and r['sameTrees'] and r['sameShrubs'] and r['nearA'] > r['nearB']
    print(f"  {'✓' if ok else '✗'} P-014 局部地形改动只影响附近植被：在 {r.get('c')} 挖出半径 6 m 的水坑，附近撒点 {r.get('nearA')} → {r.get('nearB')}，"
          f"12 m 外树木{'不变' if r.get('sameTrees') else '整体错位'}、灌木{'不变' if r.get('sameShrubs') else '整体错位'}（树 {r.get('trees')}，灌木 {r.get('shrubs')}）" + (f"：{r['err']}" if 'err' in r else ''))
    failed += 0 if ok else 1
    with Session('#fp,still,q=low') as s:
        r = s.js(HORN_JS)
    ok = r['car'] == 'car' and r['tractor'] == 'tractor' and r['heli'] == 'heli' and r['boat'] == 'boat' and r['walk'] is None and r['esc']
    print(f"  {'✓' if ok else '✗'} 载具喇叭：汽车 {r['car']}、拖拉机 {r['tractor']}、直升机 {r['heli']}、游艇 {r['boat']}，步行时按 H 不鸣笛（{r['walk']}），ESC 面板列出 H 键：{r['esc']}")
    failed += 0 if ok else 1
    for q in ('high', 'low'):
        with Session(f'#fp,still,q={q}') as s:
            r = s.js(SHADOW_JS)
        ok = r['drive'] == 60 and r['walk'] == 0
        print(f"  {'✓' if ok else '✗'} P-018 驾驶时阴影每帧重绘（{q} 档）：驾驶 60 帧重绘 {r['drive']} 次（应为 60），步行静止 60 帧重绘 {r['walk']} 次（应为 0）")
        failed += 0 if ok else 1
    with Session('#q=high,debug,noworker', size=(640, 360), ready=READY) as s:
        r = s.js(FALLBACK_JS)
        errs = list(s.errors) + ([r['err']] if r['err'] else [])
    ok = not errs and r['frames'] > 0
    print(f"  {'✓' if ok else '✗'} P-012 主线程生成（无后台线程）时漫游正常：报错 {errs[:1] or '无'}，{r['secs']} 秒内主循环渲染 {r['frames']} 帧")
    failed += 0 if ok else 1
    # V-022：固定海面时刻 23 秒，外海俯视的下半幅（全是海面）近白像素（三通道都 > 200）< 0.5%（修复前 4.55%）；
    # 登岸浮台机位里水面背面的青绿色（G、B 比 R 高 45 以上且 G > 150）< 5%（修复前 52%）
    import numpy as np
    from PIL import Image
    rj = RENDER_JS.replace('window.__sea.update(I.renderer, c, 0)', '(__sea.mat.uniforms.uTime.value = 23, window.__sea.update(I.renderer, c, 23))')
    out = report_dir('regression')
    with Session('#fp,still,q=high,clean', size=(960, 540)) as s:
        s.js("() => { const u = document.getElementById('fpui'); if (u) u.style.display = 'none'; }")
        s.js(rj, [200, 25, 260, 240, 0, 300]); s.shot(os.path.join(out, 'v022_外海.png'))
        s.js(rj, [66, 3.5, 79, 59.5, 0.4, 87]); s.shot(os.path.join(out, 'v022_浮台.png'))
    a = np.asarray(Image.open(os.path.join(out, 'v022_外海.png')).convert('RGB')).astype(int); white = (a[a.shape[0] // 2:].min(axis=2) > 200).mean() * 100
    b = np.asarray(Image.open(os.path.join(out, 'v022_浮台.png')).convert('RGB')).astype(int); teal = ((b[..., 1] - b[..., 0] > 45) & (b[..., 2] - b[..., 0] > 45) & (b[..., 1] > 150)).mean() * 100
    ok = white < 0.5 and teal < 5
    print(f"  {'✓' if ok else '✗'} V-022 外海没有满海面白色碎片（近白像素 {white:.2f}%，< 0.5%）；登岸浮台旁没有翻折的青绿色水面背面（{teal:.2f}%，< 5%）")
    failed += 0 if ok else 1
    print('\n回归测试全部通过' if not failed else f'\n{failed} 项回归测试失败')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
