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
  const fp = __fp, st = fp._st, D = window.__dbg, B = D.BOAT, G = D.GATE, out = { log: [] };
  const toW = (lx, lz) => [B.x + lx * Math.cos(B.yaw) + lz * Math.sin(B.yaw), B.z - lx * Math.sin(B.yaw) + lz * Math.cos(B.yaw)];
  const [hx, hz] = toW(6.4, 0.9); fp.teleport(hx, hz, 0, 5.15, true); for (let i = 0; i < 10; i++) fp.update(1/60);
  out.prompt = document.getElementById('fpprompt').textContent;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC' })); out.auto = !!B.auto;
  const dt = 1 / 20; let T = 0, lastPh = -1, maxHit = 0, minDepth = 99;
  for (let i = 0; i < 20 * 60 * 25 && B.auto; i++) {
    if (G.open !== G.target) G.open = G.target > G.open ? Math.min(1, G.open + dt / 14) : Math.max(0, G.open - dt / 14);
    const prev = D.updateBoat(dt, T, new Set()); if (B.moved) { D.carryOnBoat(st, prev); D.syncBoat(T); } fp.update(dt); T += dt;
    if (B.hit) maxHit++;
    if (B.auto && B.auto.i !== lastPh) { lastPh = B.auto.i; const ph = B.auto.plan[B.auto.i]; if (ph && !ph.loop || lastPh % 6 === 0) out.log.push([Math.round(T), ph.label, Math.round(B.x), Math.round(B.z), +(B.v * 1.944).toFixed(1)]); }
  }
  out.done = !B.auto; out.minutes = +(T / 60).toFixed(1); out.hits = maxHit;
  out.final = { x: +B.x.toFixed(2), z: +B.z.toFixed(2), yaw: +B.yaw.toFixed(3), gate: +G.open.toFixed(2) };
  out.player = { onBoat: !!st.onBoat, feet: +st.feet.toFixed(2), dx: +(st.pos.x - hx).toFixed(1), dz: +(st.pos.z - hz).toFixed(1) };
  return out;
}'''
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':320,'height':180}); pg.route('**/*', handle)
    logs=[]; pg.on('pageerror', lambda e: logs.append(str(e)))
    pg.goto(PAGE + '#fp,still,q=low')
    pg.wait_for_function("document.title.startsWith('done')", timeout=600000)
    try:
        r = pg.evaluate(JS)
        for k,v in r.items():
            if k == 'log':
                for l in v: print('  ', l)
            else: print(k, v)
    except Exception as e: print('ERR', e)
    print(logs[:3]); b.close()
