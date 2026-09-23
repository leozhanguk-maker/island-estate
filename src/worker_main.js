// ======================= 后台线程入口 =======================
self.onmessage = (e) => {
  try {
    if (e.data.task === 'detail') { const det = ['grass', 'sand', 'gravel', 'soil', 'rock'].map(k => makeDetailTex(k)); self.postMessage({ type: 'detail', det }, det.map(d => d.data.buffer)); return; }
    const post = (p, t) => self.postMessage({ type: 'progress', p, t });
    post(0.06, '地形与海岸线');
    const X = buildTerrain();
    post(0.28, '法线与遮蔽');
    X.normals = terrainNormals(X.H); X.ao = terrainAO(X.H);
    post(0.36, '地表与农田');
    const GT = makeGround(X, e.data.texW);
    post(0.4, '细节纹理与材质');
    const matMap = makeMaterialMap(X);
    post(0.42, '读取像素');
    const gi = GT.canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, GT.canvas.width, GT.canvas.height);
    const mi = GT.mask.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, GT.mask.width, GT.mask.height);
    const ground = { data: gi.data, w: gi.width, h: gi.height }, mask = { data: mi.data, w: mi.width, h: mi.height };
    post(0.44, '传回主线程');
    const roads = X.roads.map(r => ({ id: r.id, w: r.w, pts: r.pts, widths: r.widths, len: r.len }));
    const msg = { type: 'done', H: X.H, normals: X.normals, ao: X.ao, sdB: X.sdB, sdC: X.sdC, sdW: X.sdW, roadDist: X.roads.dist, roads, ground, mask, matMap };
    self.postMessage(msg, [X.H.buffer, X.normals.buffer, X.ao.buffer, X.sdB.buffer, X.sdC.buffer, X.sdW.buffer, X.roads.dist.buffer, gi.data.buffer, mi.data.buffer, matMap.data.buffer]);
  } catch (err) { self.postMessage({ type: 'error', msg: String(err && err.stack || err) }); }
};
