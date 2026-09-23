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
  const fp = __fp, st = fp._st, D = window.__dbg, H = D.HELI, S = D.HELI_SPOTS, out = { log: [] }, cam = __island.camera;
  fp.teleport(H.x + 3, H.z + 1, 0); for (let i = 0; i < 5; i++) fp.update(1/60); out.prompt = document.getElementById('fpprompt').textContent;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); out.inHeli = D.DRIVE.active === H;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG' })); out.auto = H.auto && H.auto.to;
  const fly = (maxS) => { let t = 0, ph = '', maxAgl = 0, minAgl = 1e9; while (t < maxS && H.auto) { const r = D.updateHeli(1/20, new Set(), cam); t += 1/20; if (H.auto && H.auto.phase !== ph) { ph = H.auto.phase; out.log.push([Math.round(t), ph, Math.round(H.x), Math.round(H.z), +H.y.toFixed(1)]); } if (H.auto && H.auto.phase === 'cruise') { maxAgl = Math.max(maxAgl, r.agl); minAgl = Math.min(minAgl, r.agl); } } return { t: Math.round(t), x: +H.x.toFixed(2), z: +H.z.toFixed(2), y: +H.y.toFixed(2), yaw: +H.yaw.toFixed(2), ground: H.ground, rpm: +H.rpm.toFixed(2), cruiseAGL: [minAgl, maxAgl] }; };
  out.toRoof = fly(400); out.roofSpot = S.roof;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); for (let i = 0; i < 5; i++) fp.update(1/60); out.exitOnRoof = { active: !!D.DRIVE.active, x: +st.pos.x.toFixed(1), z: +st.pos.z.toFixed(1), feet: +st.feet.toFixed(2) };
  fp.teleport(H.x + 2.5, H.z + 1.5, 0, H.y); for (let i = 0; i < 5; i++) fp.update(1/60); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG' })); out.auto2 = H.auto && H.auto.to;
  out.toPad = fly(400);
  // 手动：起飞、前飞、转向
  H.rpm = 1; const m = (keys, s) => { for (let t = 0; t < s; t += 1/20) D.updateHeli(1/20, new Set(keys), cam); return { x: +H.x.toFixed(1), z: +H.z.toFixed(1), agl: Math.round(H.y - D.gh(H.x, H.z)), kmh: Math.round(Math.hypot(H.vx, H.vz) * 3.6) }; };
  out.climb = m(['Space'], 4); out.fwd = m(['KeyW'], 6); out.turn = m(['KeyW', 'KeyA'], 4); out.descend = m(['ShiftLeft'], 12);
  return out;
}'''
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':320,'height':180}); pg.route('**/*', handle)
    logs=[]; pg.on('pageerror', lambda e: logs.append(str(e)[:200]))
    pg.goto(PAGE + '#fp,still,q=low')
    pg.wait_for_function("document.title.startsWith('done')", timeout=280000)
    try:
        r = pg.evaluate(JS)
        for k,v in r.items():
            if k == 'log':
                for l in v: print('  ', l)
            else: print(k, v)
    except Exception as e: print('ERR', str(e)[:300])
    print(logs[:3]); b.close()
