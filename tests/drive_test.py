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
  const fp = __fp, st = fp._st, D = window.__dbg, out = {}, cam = __island.camera;
  const car = D.DRIVE.cars[0];
  const step = (keys, secs) => { st.keys = new Set(keys); for (let t = 0; t < secs; t += 1/60) D.updateDrive(1/60, st.keys, cam, fp); st.keys = new Set(); return { x: +car.x.toFixed(2), z: +car.z.toFixed(2), y: +car.y.toFixed(2), yaw: +car.yaw.toFixed(2), kmh: Math.round(car.v * 3.6), pitch: +car.pitch.toFixed(3) }; };
  out.start = { x: car.x, z: car.z, yaw: car.yaw };
  fp.teleport(car.x - 2.8, car.z, 0); for (let i = 0; i < 5; i++) fp.update(1/60);
  out.prompt = document.getElementById('fpprompt').textContent;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); out.active = !!D.DRIVE.active;
  out.walkBlock = (() => { const s0 = { x: st.pos.x, z: st.pos.z }; return s0; })();
  out.accel = step(['KeyW'], 3); out.cruise = step(['KeyW'], 4); out.turnL = step(['KeyW', 'KeyA'], 3); out.brake = step(['KeyS'], 2);
  out.reverse = step(['KeyS'], 2); out.stop = step([], 2);
  // 撞向别墅外墙：把车摆到别墅南侧朝北开
  car.x = 181; car.z = -28; car.yaw = Math.PI / 2; car.v = 0; out.toVilla = step(['KeyW'], 5);
  // 驶向泊港水边：应被水阻挡
  car.x = 0; car.z = 12; car.yaw = -Math.PI / 2; car.v = 0; out.toWater = step(['KeyW'], 8);
  D.exitCar(fp); out.afterExit = { active: !!D.DRIVE.active, px: +st.pos.x.toFixed(2), pz: +st.pos.z.toFixed(2) };
  // 拖拉机
  const tr = D.DRIVE.cars[1]; D.DRIVE.active = tr; tr.v = 0; const t0 = { x: tr.x, z: tr.z }; st.keys = new Set(['KeyW']); for (let t = 0; t < 4; t += 1/60) D.updateDrive(1/60, st.keys, cam, fp); out.tractor = { moved: +Math.hypot(tr.x - t0.x, tr.z - t0.z).toFixed(2), kmh: Math.round(tr.v * 3.6) }; D.DRIVE.active = null;
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
    print(logs[:3])
    b.close()
