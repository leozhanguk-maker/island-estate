// ======================= 00 画质分档与后台生成调度 =======================
function detectQuality() {
  const H = decodeURIComponent(location.hash.slice(1)).split(',');
  let tier = null;
  for (const t of ['high', 'mid', 'low']) if (H.includes('q=' + t)) tier = t;
  if (!tier) { try { tier = localStorage.getItem('islandQ'); } catch (e) { } }
  let gpu = '';
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    const lose = gl && gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
  } catch (e) { }
  if (!['high', 'mid', 'low'].includes(tier)) {
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    const small = Math.min(screen.width, screen.height) < 900;
    const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
    const soft = /swiftshader|llvmpipe|software/i.test(gpu);
    const weak = /intel|mali|adreno|powervr|apple gpu/i.test(gpu);
    if ((coarse && small) || mem <= 3 || soft) tier = 'low';
    else if (weak || mem <= 4 || cores <= 4) tier = 'mid';
    else tier = 'high';
  }
  const P = {
    high: { terrainStep: 1, pr: 2, shadow: 4096, density: 1.0, texW: 4096, aa: true, clouds: true, grassR: 60, fpShadow: true },
    mid: { terrainStep: 1, pr: 1.5, shadow: 4096, density: 0.8, texW: 4096, aa: true, clouds: true, grassR: 40, fpShadow: true },
    low: { terrainStep: 2, pr: 1, shadow: 2048, density: 0.45, texW: 2048, aa: false, clouds: false, grassR: 0, fpShadow: false },
  }[tier];
  return Object.assign({ tier, gpu }, P);
}
// 在后台线程中生成地形与地表；不可用时回退到主线程
function generateIsland(texW, onProgress) {
  const finish = (d, via) => {
    const roads = d.roads; roads.dist = d.roadDist;
    const X = { H: d.H, normals: d.normals, ao: d.ao, sdB: d.sdB, sdC: d.sdC, sdW: d.sdW, roads,
      beachW: (x, z) => smoothstep(58, 44, z) * smoothstep(72, 58, Math.abs(x)) };
    return { X, ground: d.ground, mask: d.mask, matMap: d.matMap, det: d.det, via };
  };
  const onMain = () => {
    const X = buildTerrain(); X.normals = terrainNormals(X.H); X.ao = terrainAO(X.H);
    const GT = makeGround(X, texW);
    const matMap = makeMaterialMap(X), det = ['grass', 'sand', 'gravel', 'soil', 'rock'].map(k => makeDetailTex(k));
    // 与后台线程输出同一格式 {data, w, h}：近景草叶取色、小地图底图都按像素数据读取，直接传 canvas 会得到 NaN 下标（P-012）
    const px = (cv) => { const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height); return { data: d.data, w: d.width, h: d.height }; };
    return finish({ matMap, det, H: X.H, normals: X.normals, ao: X.ao, sdB: X.sdB, sdC: X.sdC, sdW: X.sdW, roads: X.roads, roadDist: X.roads.dist, ground: px(GT.canvas), mask: px(GT.mask) }, 'main');
  };
  return new Promise((resolve) => {
    let w = null, w2 = null, done = false, timer = null, main = null, det = null;
    const kill = () => { try { w && w.terminate(); w2 && w2.terminate(); } catch (e) { } };
    const fallback = (why) => { if (done) return; done = true; clearTimeout(timer); kill(); console.warn('后台生成不可用，回退主线程：', why); setTimeout(() => resolve(onMain()), 0); };
    const tryFinish = () => { if (!main || !det || done) return; done = true; clearTimeout(timer); kill(); main.det = det; resolve(finish(main, 'worker')); };
    try {
      if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return fallback('no worker/offscreen');
      if (location.hash.includes('noworker')) return fallback('forced');
      const url = URL.createObjectURL(new Blob([document.getElementById('gensrc').textContent], { type: 'text/javascript' }));
      w = new Worker(url); w2 = new Worker(url);     // 两个线程并行：地形/地表 与 细节纹理
      timer = setTimeout(() => fallback('timeout'), 4000);
      w.onerror = w2.onerror = (e) => fallback(e.message || 'worker error');
      w.onmessage = (e) => {
        const d = e.data;
        if (d.type === 'progress') { clearTimeout(timer); timer = setTimeout(() => fallback('stall'), 15000); onProgress(d.p, d.t); }
        else if (d.type === 'error') fallback(d.msg);
        else if (d.type === 'done') { main = d; tryFinish(); }
      };
      w2.onmessage = (e) => { if (e.data.type === 'detail') { det = e.data.det; tryFinish(); } else if (e.data.type === 'error') fallback(e.data.msg); };
      w.postMessage({ task: 'terrain', texW }); w2.postMessage({ task: 'detail' });
    } catch (err) { fallback(err.message); }
  });
}
