import os
import sys, time, os
from playwright.sync_api import sync_playwright
url = sys.argv[1]; out = sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv)>3 else 1280
h = int(sys.argv[4]) if len(sys.argv)>4 else 720
wait = sys.argv[5] if len(sys.argv)>5 else 'done'
timeout = int(sys.argv[6]) if len(sys.argv)>6 else 120
extra = sys.argv[7] if len(sys.argv)>7 else ''
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.join(ROOT, 'node_modules', 'three')
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'island.html')
def handle(route):
    u = route.request.url
    if 'cdn.jsdelivr.net/npm/three@0.160.0/' in u:
        p = u.split('three@0.160.0/')[1]
        route.fulfill(path=os.path.join(NM, p), content_type='application/javascript')
    elif 'fonts.googleapis' in u or 'fonts.gstatic' in u:
        route.fulfill(body='', content_type='text/css')
    else:
        route.continue_()
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width':w,'height':h})
    logs=[]
    pg.on('console', lambda m: logs.append(m.type+': '+m.text))
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: '+str(e)))
    pg.route('**/*', handle)
    t0=time.time()
    extra = (extra + ',q=high') if 'q=' not in extra else extra
    pg.goto(url + ('#'+extra))
    try:
        pg.wait_for_function(f"document.title.startsWith('{wait}')", timeout=timeout*1000)
    except Exception as e:
        logs.append('TIMEOUT '+str(e)[:200])
    print('title:', pg.title(), 'elapsed %.1fs'%(time.time()-t0))
    for l in logs[-40:]: print(l)
    pg.screenshot(path=out, timeout=300000)
    print('shot %.1fs'%(time.time()-t0))
    b.close()
