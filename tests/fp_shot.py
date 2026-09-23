import os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.join(ROOT, 'node_modules', 'three')
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'island.html')
def handle(route):
    u = route.request.url
    if 'cdn.jsdelivr.net/npm/three@0.160.0/' in u: route.fulfill(path=os.path.join(NM, u.split('three@0.160.0/')[1]), content_type='application/javascript')
    elif 'fonts.g' in u: route.fulfill(body='', content_type='text/css')
    else: route.continue_()
def at(x, z, yaw, pitch=-0.15, third='false'):
    return "() => { const fp=__fp, st=fp._st, T=fp._test; st.pos.x=%s; st.pos.z=%s; st.feet=T.floorAt(%s,%s,99); st.vy=0; st.mode='walk'; st.third=%s; st.yaw=%s; st.pitch=%s; for(let i=0;i<30;i++) fp.update(1/60); }" % (x, z, x, z, third, yaw, pitch)
def tp(x, z, yaw, y, pitch=-0.1, keys='', frames=30, boat='false'):
    # boat='true'：传送到游艇上（启用船上可行走面，否则会落水）
    return "() => { const fp=__fp, st=fp._st; fp.teleport(%s,%s,%s,%s,%s); st.pitch=%s; st.third=false; st.keys=new Set([%s]); for(let i=0;i<%d;i++) fp.update(1/60); st.keys=new Set(); }" % (x, z, yaw, y, boat, pitch, keys, frames)
SC = {
 'villaIn': tp(176.5, -43.5, 0.35, 'undefined', -0.05), 'hangarIn': tp(-211.5, -133.5, -0.873 + 3.14159, 'undefined', 0.0),
 'deck': tp(53.6, 87.0, 1.5708, 2.26, -0.05, boat='true'), 'towerView': tp(216.9, -143.9, 2.3, 77.33, -0.3),
 'under': tp(0, 70, 3.14159, 'undefined', 0.05, "'KeyC'", 240),
 'beach': at(-10, 22, 2.6, -0.2), 'lawn': at(150, -30, 0.5, -0.2), 'road': at(-110, 24, 1.57, -0.25), 'paddy': at(50, -90, 3.14, -0.3),
 'pasture': at(-200, 20, 0.2, -0.2), 'meadow': at(-40, -8, -2.4, -0.18), 'sky': at(0, 8, 3.14, 0.35), 'forest': at(-150, 130, 0.0, -0.05), 'forest2': at(-60, 150, 1.2, 0.05), 'banana': at(-150, -78, -1.57, -0.2), 'orchard': at(80, -96, -0.5, -0.15), 'vine': at(-66.5, -20, 0.0, -0.1), 'veg': at(-150, -44, -1.57, -0.35), 'cliffE': at(208, -50, -1.3, 0.25), 'coast': at(-318, 30, 2.0, -0.3),
 'start': "() => { const fp=__fp, st=fp._st; st.third=false; for(let i=0;i<20;i++) fp.update(1/60); }",
 'swim': "() => { const fp=__fp, st=fp._st; st.pos.x=183; st.pos.z=-78; st.feet=8; st.third=true; st.yaw=-0.5; st.pitch=-0.25; st.keys=new Set(['KeyW']); for(let i=0;i<40;i++) fp.update(1/60); st.keys=new Set(); }",
 'deckX': "() => { const fp=__fp, st=fp._st; st.pos.x=110; st.pos.z=64; st.feet=__fp._test.floorAt(110,64,99); st.third=true; st.yaw=Math.atan2(-(122-96),-(61-71)); st.pitch=-0.2; for(let i=0;i<20;i++) fp.update(1/60); }",
}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':1280,'height':720}); pg.route('**/*', handle)
    pg.goto(PAGE + '#fp,still,q=high')
    pg.wait_for_function("document.title.startsWith('done')", timeout=600000)
    import sys
    only = sys.argv[1].split(',') if len(sys.argv) > 1 else list(SC)
    for name, js in [(k,v) for k,v in SC.items() if k in only]:
        pg.evaluate(js)
        pg.evaluate("() => { const I=__island; if (I.grass) I.grass.update(__fp); I.shadowFollow(1); I.underwaterCheck && I.underwaterCheck(); for (const u of []) {} I.renderer.render(I.scene, I.camera); }")
        pg.screenshot(path=os.path.join(os.environ.get('SHOT_DIR', '.'), f'fp_{name}.png'), timeout=300000); print('shot', name)
    b.close()
