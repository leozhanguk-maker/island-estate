import os
import sys, time, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.join(ROOT, 'node_modules', 'three')
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'island.html')
def handle(route):
    u = route.request.url
    if 'cdn.jsdelivr.net/npm/three@0.160.0/' in u:
        route.fulfill(path=os.path.join(NM, u.split('three@0.160.0/')[1]), content_type='application/javascript')
    elif 'fonts.g' in u: route.fulfill(body='', content_type='text/css')
    else: route.continue_()
JS = r'''
() => {
  const fp = window.__fp, st = fp._st, T = fp._test, out = {}; const { COLL, BOARDWALK, gh } = window.__dbg;
  const run = (keys, secs, yaw) => { if (yaw !== undefined) st.yaw = yaw; st.keys = new Set(keys); for (let t = 0; t < secs; t += 1/60) fp.update(1/60); st.keys = new Set(); return { x: +st.pos.x.toFixed(2), z: +st.pos.z.toFixed(2), feet: +st.feet.toFixed(2), mode: st.mode }; };
  const setp = (x, z) => { st.pos.x = x; st.pos.z = z; st.feet = T.floorAt(x, z, Math.max(gh(x, z), 0) + 1.0); st.vy = 0; st.mode = 'walk'; };
  out.spawn = run([], 0.5);
  out.northToPool = run(['KeyW'], 3.5, 0);
  // tree
  // 找一棵东侧 5 米内无其他障碍、地面平缓的树
  let tree = null;
  for (const c of COLL.circles) { if (c.r < 0.3 || c.r > 1.2 || c.z < 100) continue; const ok = !COLL.circles.some(o => o !== c && Math.abs(o.z - c.z) < 1.5 && o.x > c.x && o.x < c.x + 6); if (!ok) continue; const hh = [0,1,2,3,4,5].map(d => gh(c.x + d, c.z)); if (Math.max(...hh) - Math.min(...hh) > 2) continue; tree = c; break; }
  setp(tree.x + 4, tree.z); out.treeBefore = { x: +tree.x.toFixed(2), z: +tree.z.toFixed(2) };
  const tr = run(['KeyW'], 3, Math.PI / 2);   // yaw=pi/2 -> 面向 -x
  out.tree = Object.assign(tr, { dist: +Math.hypot(st.pos.x - tree.x, st.pos.z - tree.z).toFixed(2), passed: st.pos.x < tree.x });
  // boardwalk: from landing platform go along east path
  setp(61.5, 85); out.landing = run([], 0.3);
  const e = BOARDWALK.east; const yawE = Math.atan2(-(e[2][0] - e[1][0]), -(e[2][1] - e[1][1]));
  out.bw1 = run(['KeyW'], 6, yawE);
  out.bwFloorVsGround = +(st.feet - gh(st.pos.x, st.pos.z)).toFixed(2);
  const side = run(['KeyD'], 3); out.bwSideways = Object.assign(side, { offGround: +(st.feet - gh(st.pos.x, st.pos.z)).toFixed(2) });
  // swim in lagoon from beach
  setp(0, 30); out.beach = run([], 0.3);
  out.lagoon = run(['KeyS'], 12, 0);
  out.lagoonFar = run(['KeyS','ShiftLeft'], 25, 0);
  // exit back to beach
  out.backToBeach = run(['KeyW','ShiftLeft'], 40, 0);
  // lake swim from villa lawn
  setp(172, -66); out.lakeEdge = run([], 0.3);
  out.lake = run(['KeyW'], 6, 0);
  // cliff climb test: from basin under east cliff walk east
  setp(205, -60); out.cliffStart = run([], 0.3);
  out.cliff = run(['KeyW','ShiftLeft'], 6, -Math.PI/2);
  // wall of villa: walk south from start
  st.keys.add('KeyR'); window.dispatchEvent(new KeyboardEvent('keydown', {code:'KeyR'})); window.dispatchEvent(new KeyboardEvent('keyup', {code:'KeyR'}));
  out.reset = run([], 0.2);
  out.intoVilla = run(['KeyS'], 3, 0);
  // pasture fence
  setp(-200, 22); out.pastureOut = run([], 0.2); out.pasture = run(['KeyW'], 5, 0);
  // vineyard rows crossing east-west
  setp(-66, -50); out.vineIn = run(['KeyA'], 3, Math.PI);   // yaw=pi faces +z, KeyA -> moves +x? check
  const E = () => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' })); };
  const lab = () => document.getElementById('fpprompt').textContent;
  const { GATE, L } = window.__dbg;
  const walkTo = (x, z, maxT = 8, fast = false) => { let t = 0; while (t < maxT) { const dx = x - st.pos.x, dz = z - st.pos.z; if (Math.hypot(dx, dz) < 0.25) break; st.yaw = Math.atan2(-dx, -dz); st.keys = new Set(fast ? ['KeyW', 'ShiftLeft'] : ['KeyW']); fp.update(1 / 60); t += 1 / 60; } st.keys = new Set(); for (let i = 0; i < 10; i++) fp.update(1 / 60); return { x: +st.pos.x.toFixed(2), z: +st.pos.z.toFixed(2), feet: +st.feet.toFixed(2) }; };
  // ---- 别墅：楼梯逐层上到屋顶 ----
  setp(171.4, -39.4); run([], 0.1); out.v_gf = walkTo(171.4, -39.6);
  out.v_1f = walkTo(171.4, -46.9); out.v_1fdoorApproach = walkTo(180, -50.5); out.v_balcony = walkTo(180, -55.2);
  out.v_back = walkTo(180, -50.5); out.v_s2a = walkTo(176.2, -41.0); out.v_s2 = walkTo(174.8, -41.0); out.v_2f = walkTo(174.8, -48.8);
  out.v_2fdoor = walkTo(178.5, -50.2); out.v_terrace = walkTo(178.5, -52.5); out.v_in2 = walkTo(178.5, -49.5);
  out.v_s3a = walkTo(187.2, -40.8); out.v_s3 = walkTo(188.4, -40.8); out.v_roof = walkTo(188.4, -48.3); out.v_roofMid = walkTo(182, -46);
  // ---- 塔：东峰塔沿折返楼梯登顶 ----
  { const rot = -0.38, cx = L.eastTower.x, cz = L.eastTower.z, toW = (lx, lz) => [cx + lx * Math.cos(rot) + lz * Math.sin(rot), cz - lx * Math.sin(rot) + lz * Math.cos(rot)];
    const H = 20, Lf = 2.4, n0 = Math.ceil(H / (Lf * 0.72)), n = n0 % 2 ? n0 : n0 + 1, zA = -Lf / 2, zB = Lf / 2;
    let p = toW(0.65, zB + 1.5); setp(p[0], p[1]); run([], 0.1);
    for (let k = 0; k < n; k++) { const lane = k % 2 === 0 ? 0.65 : -0.65, up = k % 2 === 0; p = toW(lane, (up ? zA - 0.35 : zB + 0.35)); walkTo(p[0], p[1], 10); if (k < n - 1) { p = toW(-lane, (up ? zA - 0.35 : zB + 0.35)); walkTo(p[0], p[1], 4); } }
    out.t_cabin = walkTo(...toW(0, zA - 0.4), 3); out.t_door = walkTo(...toW(0, -2.5), 4); out.t_platform = walkTo(...toW(-2.6, -2.6), 3); out.t_expected = +(L.summitPad.h + 0.6 + H + 0.125).toFixed(2); }
  // ---- 水闸：码头台阶上墩顶，走上闸顶步道；闸控室开关开闸 ----
  setp(42.4, 116.8); run([], 0.1); out.g_stair = walkTo(42.4, 124.5); walkTo(40.5, 128); walkTo(37.5, 128); out.g_walk = walkTo(30, 128);
  setp(46.5, 116.0); run([], 0.1); out.g_room = walkTo(46.5, 119.8); out.g_panel = walkTo(45.6, 119.5); out.g_prompt = lab(); E(); out.g_target = GATE.target;
  // 开闸全流程（走主循环同款逻辑 __sim.step）：门叶开始下沉、门顶可行走面尚未消失时走上闸门，应被移到就近桥墩而不是随门落水
  { const S = __sim; let g = 0; while (GATE.open < 0.01 && g++ < 600) S.step(1 / 60, []);
    setp(20, 128); st.feet = 4.53; st.grounded = true; for (let i = 0; i < 60 * 16; i++) S.step(1 / 60, []);
    out.g_openWalk = { x: +st.pos.x.toFixed(2), z: +st.pos.z.toFixed(2), feet: +st.feet.toFixed(2), mode: st.mode, gate: +GATE.open.toFixed(2) }; }
  setp(15, 110); run(['KeyS'], 1, 0); out.g_swimThrough = run(['KeyS', 'ShiftLeft'], 12, 0); GATE.open = 0; GATE.target = 0;
  // ---- 栈道北段：浮台垂直向北接到道路 ----
  setp(61.2, 79.8); run([], 0.1); out.bwNorth = walkTo(61.2, 18.5, 30, true); out.bwNorthGround = +gh(61.2, 18.5).toFixed(2);
  // 别墅：从北门推拉门洞进入室内
  setp(175.3, -55.4); run([], 0.1); out.villaIn = run(['KeyS'], 2.5, 0);
  setp(170.1, -39.9); run([], 0.1); out.stairPrompt = lab(); E(); out.balcony = run([], 0.2);
  out.balconyRail = run(['KeyW'], 2, 0);
  E(); out.backDown = run([], 0.2);
  // 机库：从开启的门扇进入
  setp(-223.38, -132.65); run([], 0.1); out.hangarOut = run([], 0.1); out.hangarIn = run(['KeyW'], 3, -0.873); out.hangarFloorVsGround = +(st.feet - gh(st.pos.x, st.pos.z)).toFixed(2);
  // 游艇
  // 水闸步道
  setp(42.5, 123.8); run([], 0.1); out.gatePrompt = lab(); E(); out.gateWalk = run(['KeyW', 'ShiftLeft'], 12, Math.PI / 2);
  // 东峰塔
  setp(215.5, -140.1); run([], 0.1); out.towerPrompt = lab(); E(); out.towerTop = run(['KeyW'], 3);
  // 网球场：从东侧南端门进入
  setp(12, -100.8); run([], 0.1); out.tennis = run(['KeyW'], 2.5, Math.PI / 2);
  // 潜水
  setp(0, 60); run(['KeyS'], 4, 0); out.swim = run([], 1); out.dive = run(['KeyC'], 3); out.camUnder = +(window.__island.camera.position.y).toFixed(2); out.surface = run([], 4);
  return out;
}
'''
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':320,'height':180})
    logs=[]; pg.on('console', lambda m: logs.append(m.text)); pg.on('pageerror', lambda e: logs.append('ERR '+str(e)))
    pg.route('**/*', handle)
    pg.goto(PAGE + '#fp,still,q=high')
    pg.wait_for_function("document.title.startsWith('done')", timeout=600000)
    try:
        pg.evaluate(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'sim.js'), encoding='utf8').read())   # 主循环单步推进（开闸全流程用）
        r = pg.evaluate(JS)
        for k,v in r.items(): print(k, v)
    except Exception as e: print('EVAL ERR', e)
    for l in logs[-8:]: print(l)
    b.close()
