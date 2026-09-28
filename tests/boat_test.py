import os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.join(ROOT, 'node_modules', 'three')
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'island.html')
def handle(route):
    u = route.request.url
    if 'cdn.jsdelivr.net/npm/three@0.160.0/' in u: route.fulfill(path=os.path.join(NM, u.split('three@0.160.0/')[1]), content_type='application/javascript')
    elif 'fonts.g' in u: route.fulfill(body='', content_type='text/css')
    else: route.continue_()
JS = r'''() => {
  const fp = __fp, st = fp._st, D = window.__dbg, B = D.BOAT, out = {}, cam = __island.camera;
  let T = 0;
  const frame = (keys) => { st.keys = new Set(keys || []); const prev = D.updateBoat(1/60, T, st.keys); if (B.moved) { D.carryOnBoat(st, prev); D.syncBoat(T); } if (D.DRIVE.active !== B) fp.update(1/60); T += 1/60; };
  const walkTo = (x, z, maxT = 10) => { let t = 0; while (t < maxT) { const dx = x - st.pos.x, dz = z - st.pos.z; if (Math.hypot(dx, dz) < 0.25) break; st.yaw = Math.atan2(-dx, -dz); frame(['KeyW']); t += 1/60; } for (let i = 0; i < 10; i++) frame([]); return { x: +st.pos.x.toFixed(2), z: +st.pos.z.toFixed(2), feet: +st.feet.toFixed(2), onBoat: !!st.onBoat, mode: st.mode }; };
  fp.teleport(58.6, 84.0, Math.PI / 2); for (let i = 0; i < 10; i++) frame([]);
  // 船上路线用船体局部坐标（x 向船首，z 向右舷），绕开后甲板沙发/茶几、沙龙茶几、电视柜、餐桌
  const toW = (lx, lz) => [B.x + lx * Math.cos(B.yaw) + lz * Math.sin(B.yaw), B.z - lx * Math.sin(B.yaw) + lz * Math.cos(B.yaw)];
  const walkL = (lx, lz) => walkTo(...toW(lx, lz));
  const keyF = () => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' })); for (let i = 0; i < 10; i++) frame([]); };
  const pose = () => { const [lx, lz] = D.wToBoat(st.pos.x, st.pos.z); return { x: +st.pos.x.toFixed(2), z: +st.pos.z.toFixed(2), lx: +lx.toFixed(2), lz: +lz.toFixed(2), feet: +st.feet.toFixed(2), onBoat: !!st.onBoat, mode: st.mode }; };
  // 船体四周是空气墙：不按 F 直接从登岸浮台往船上走，被挡在船体轮廓外（船尾游泳平台外沿局部 x = -27.7）
  out.landing = walkTo(58.6, 83.9); walkTo(...toW(-24, 0), 4); out.wallIn = pose();
  // 在登岸浮台按 F 登船
  walkTo(58.6, 83.9); out.boardPrompt = document.getElementById('fpprompt').textContent; keyF();
  out.boarded = pose(); { const [tx, tz] = toW(-11.52, 0), dx = tx - st.pos.x, dz = tz - st.pos.z, l = Math.hypot(dx, dz); out.boardFaceTV = +((-Math.sin(st.yaw) * dx - Math.cos(st.yaw) * dz) / l).toFixed(3); }
  // 船上不按 F 往船外走，被挡在船上；靠泊时站到船尾边按 F，落回登岸浮台；再按 F 登船（从登船点绕开后甲板沙发，经右舷梯级下到游泳平台再往船外走）
  walkL(-22.6, 1.6); walkL(-22.9, 3.2); walkL(-26.0, 3.2); walkTo(...toW(-31, 0), 4); out.wallOut = pose(); out.leavePrompt = document.getElementById('fpprompt').textContent; keyF(); out.leftToDock = pose(); keyF(); out.reboard = pose();
  // 从船尾游泳平台（0.9）经右舷梯级上后甲板（2.26）
  walkL(-22.6, 1.6); walkL(-22.9, 3.2); walkL(-26.0, 3.2); out.platStair = walkL(-22.9, 3.2);
  out.aftDeck = walkL(-22.6, 1.6); walkL(-19.8, 1.6); out.door = walkL(-19.4, 0);
  walkL(-17.2, 0); walkL(-16.8, -1.6); out.salon = walkL(-12.8, -1.6); walkL(-10.4, -1.8);
  walkL(-6, -2.1); out.dining = walkL(-6, 2.1);
  out.stairUpFoot = walkL(0.8, 1.6); out.bridge = walkL(5.9, 1.6); out.helmSpot = walkL(6.4, 0.9);
  out.prompt = document.getElementById('fpprompt').textContent;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); out.driving = D.DRIVE.active === B;
  D.GATE.open = 1; D.GATE.target = 1;
  // 自动驾驶：先西行离开泊位，再左转驶向闸口西半孔中线 x≈-19，最后正南驶出峡谷
  const steerTo = (tx, tz, secs, thr) => { for (let i = 0; i < 60 * secs; i++) { const want = Math.atan2(-(tz - B.z), tx - B.x); let da = ((want - B.yaw + Math.PI * 3) % (2 * Math.PI)) - Math.PI; const keys = [], tt = Math.abs(da) > 0.35 ? 0 : thr; if (B.thr < tt) keys.push('KeyW'); else if (B.thr > tt + 0.05) keys.push('KeyS'); if (da > 0.05) keys.push('KeyA'); else if (da < -0.05) keys.push('KeyD'); frame(keys); if (Math.hypot(tx - B.x, tz - B.z) < 6) break; } return { bx: +B.x.toFixed(1), bz: +B.z.toFixed(1), yaw: +B.yaw.toFixed(2), kn: +(B.v * 1.944).toFixed(1), hit: B.hit }; };
  out.leg1 = steerTo(-33, 87, 60, 0.3); out.leg2 = steerTo(-19, 108, 80, 0.25); out.leg3 = steerTo(-19, 150, 80, 0.35); out.leg4 = steerTo(-19, 300, 80, 0.8);
  out.carried = { px: +st.pos.x.toFixed(1), pz: +st.pos.z.toFixed(1), pfeet: +st.feet.toFixed(2), onBoat: !!st.onBoat };
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); out.exited = D.DRIVE.active === null;
  // 停船后：鸣笛召唤（外海）；下到主甲板走过下层船舱舱盖（已封闭，不会掉下去）；上甲板后部经楼梯上日光甲板
  B.v = 0; B.thr = 0; B.rud = 0;
  out.horn = D.boatHorn(); out.showNear = D.ECO_SHOW.moved ? D.ECO_SHOW.moved.length : 0;
  walkTo(...toW(5.9, 1.6)); out.downMain = walkTo(...toW(0.9, 1.6)); walkTo(...toW(0.5, -1.7)); walkTo(...toW(4.4, -2.0)); out.hatch = walkTo(...toW(5.3, -2.9));
  walkTo(...toW(0.5, -1.7)); walkTo(...toW(0.8, 1.6)); walkTo(...toW(5.9, 1.6)); walkTo(...toW(3, 0)); walkTo(...toW(-9, 0)); walkTo(...toW(-13, 0)); walkTo(...toW(-15.2, 3.3)); out.sunStairFoot = walkTo(...toW(-15.6, 3.3));
  out.sunDeck = walkTo(...toW(-21.2, 3.3)); out.sunDeckIn = walkTo(...toW(-22.2, 1.5));
  // 行驶中站在后甲板右舷边按 F：直接跳入附近海域
  B.thr = 0.4; B.v = 4;
  { const [x, z] = toW(-23.4, 4.1); fp.teleport(x, z, B.yaw, 2.26 + B.y, true); for (let i = 0; i < 5; i++) frame([]); }
  out.jumpPrompt = document.getElementById('fpprompt').textContent;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' })); out.jumped = pose();
  B.thr = 0; B.v = 0; for (let i = 0; i < 60; i++) frame([]); out.afterJump = pose();
  return out;
}'''
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':320,'height':180}); pg.route('**/*', handle)
    logs=[]; pg.on('pageerror', lambda e: logs.append(str(e)))
    pg.goto(PAGE + '#fp,still,q=low')
    pg.wait_for_function("document.title.startsWith('done')", timeout=600000)
    try:
        for k,v in pg.evaluate(JS).items(): print(k, v)
    except Exception as e: print('ERR', e)
    print(logs[:3]); b.close()
