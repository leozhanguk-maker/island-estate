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
 const I = __island, X = I.X, H = X.H, r = I.renderer, G = __dbg.G; const out = {};
 let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9; for (let j=0;j<G.nz;j++) for (let i=0;i<G.nx;i++){ if (H[j*G.nx+i] > 0.5){ const x=G.x0+i, z=G.z0+j; x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);} }
 out.landExtent = {ew: x1-x0, ns: z1-z0, x0,x1,z0,z1};
 // coast type: fraction of coastline cells with gentle slope (non-cliff) outside the harbor
 let coast=0, gentle=0; for (let j=1;j<G.nz-1;j++) for (let i=1;i<G.nx-1;i++){ const k=j*G.nx+i; if (H[k]>0 && (H[k-1]<=0||H[k+1]<=0||H[k-G.nx]<=0||H[k+G.nx]<=0)) { const x=G.x0+i,z=G.z0+j; if (Math.abs(x)<70 && z>30) continue; coast++; let mx=0; for (let d=1; d<=6; d++){ const kk=(j)*G.nx+i; } const up = Math.max(H[k+2]||0,H[k-2]||0,H[k+2*G.nx]||0,H[k-2*G.nx]||0); if (up < 3) gentle++; } }
 out.coast = {cells: coast, gentleFrac: +(gentle/coast).toFixed(3)};
 I.renderer.info.autoReset = false; I.renderer.info.reset(); I.renderer.render(I.scene, I.camera);
 out.render = { calls: r.info.render.calls, tris: r.info.render.triangles, geometries: r.info.memory.geometries, textures: r.info.memory.textures };
 let meshes=0, inst=0, transparent=0; I.scene.traverse(o=>{ if(o.isMesh){ meshes++; if(o.isInstancedMesh) inst++; if(o.material && o.material.transparent) transparent++; }});
 out.scene = { meshes, inst, transparent };
 out.coll = { circles: __dbg.COLL.circles.length, rects: __dbg.COLL.rects.length, segs: __dbg.COLL.segs.length };
 out.timing = window.__timing || null;
 return out;
}'''
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':1280,'height':720}); pg.route('**/*', handle)
    import sys
    pg.goto(PAGE + '#still,clean,' + (sys.argv[1] if len(sys.argv)>1 else 'q=high'))
    pg.wait_for_function("document.title.startsWith('done')", timeout=600000)
    print(json.dumps(pg.evaluate(JS), ensure_ascii=False, indent=1))
    b.close()
