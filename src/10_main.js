// ======================= 10 主流程 / 相机 / 界面 =======================
const lbar = document.getElementById('lbar'), lstep = document.getElementById('lstep');
const tick = () => new Promise(r => setTimeout(r, 0));
const __timing = window.__timing = []; let __t0 = performance.now();
async function stage(p, text) { window.__timing.push([text, Math.round(performance.now() - __t0)]); lbar.style.width = (p * 100).toFixed(0) + '%'; lstep.textContent = text; await tick(); }
const HASH = decodeURIComponent(location.hash.slice(1)).split(',');
const DEBUG = HASH.includes('debug') || HASH.includes('still');
try {
  // ---------------- 画质分档 ----------------
  const QS = detectQuality();
  document.documentElement.dataset.q = QS.tier;
  // ---------------- 后台生成（失败时回退到主线程） ----------------
  await stage(0.03, '地形与海岸线');
  const genP = generateIsland(QS.texW, (p, t) => { __timing.push(['w:' + t, Math.round(performance.now() - __t0)]); lbar.style.width = (p * 100).toFixed(0) + '%'; lstep.textContent = t; });
  const renderer = setupRenderer(QS);
  const { scene, sun, sky } = setupScene(renderer, QS);
  const GR = await genP;
  const X = GR.X;
  gh = (x, z) => sampleGrid(X.H, x, z);
  window.__timing.push(['生成完成(' + GR.via + ')', Math.round(performance.now() - __t0)]);
  await stage(0.45, '地表贴图');
  const mkTex = (img, srgb) => { const t = img instanceof HTMLCanvasElement ? new THREE.CanvasTexture(img) : new THREE.DataTexture(img.data, img.w, img.h, THREE.RGBAFormat); t.flipY = false; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };
  const gtex = mkTex(GR.ground, true); gtex.anisotropy = renderer.capabilities.getMaxAnisotropy(); gtex.generateMipmaps = true; gtex.minFilter = THREE.LinearMipmapLinearFilter;
  const mtex = mkTex(GR.mask, false);
  const detTex = GR.det.map(d => { const t = new THREE.DataTexture(d.data, d.w, d.h, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8; t.needsUpdate = true; return t; });
  const matTex = new THREE.DataTexture(GR.matMap.data, GR.matMap.w, GR.matMap.h, THREE.RGBAFormat); matTex.flipY = false; matTex.magFilter = THREE.LinearFilter; matTex.minFilter = THREE.LinearFilter; matTex.needsUpdate = true;
  scene.add(buildTerrainMesh(X, gtex, mtex, QS.terrainStep, { mat: matTex, det: detTex }, QS));
  await stage(0.52, '海水与湖泊');
  const W = buildWater(X, buildWaterData(X), QS); scene.add(W.group);
  await stage(0.6, '建筑与设施');
  const statics = [buildVilla(), buildDorm(), buildTennis(), buildParking(), buildBarn(), buildPens(), buildGreenhouses(),
    buildEastTower(), buildWestTower(), buildGate(), buildGateTower(), buildAirfield(), buildSolar(),
    buildPowerwalls(L.pwEast.x, L.pwEast.z, Math.PI / 2 + 0.0), buildPowerwalls(L.pwWest.x, L.pwWest.z, -0.35),
    buildBoardwalk(), buildBeachSets(), buildGolfFlags(), buildVineyard(), buildDuckArea(),
    fenceLoop(L.pasture, 1.3, M.galv, M.galv, 3.2)];
  for (const t of L.turbines) buildTurbine(t[0], t[1], scene);
  for (const lf of GATE.leaves) scene.add(lf);
  if (GATE.lever) scene.attach(GATE.lever);   // 水闸拉手（整组随开关转动，不参与烘焙）
  await stage(0.7, '游艇与载具');
  const yacht = buildYacht(); scene.add(yacht); const heliG = buildH125();
  const ct = buildCybertruck(); scene.add(ct); makeCar(ct, L.parking.x - 2.15, L.parking.z - 5.2, Math.PI / 2);   // 车头朝北停入车位
  const tr = buildTractor(); scene.add(tr); makeCar(tr, L.parking.x + 2.15, L.parking.z - 5.8, Math.PI / 2);
  for (const [a, b] of [[-4, -3.1], [4, -3.1], [-4, 3.1], [4, 3.1], [0, -3.1]]) collC(L.parking.x + a, L.parking.z - 5.5 + b, 0.15);
  setHeliObstacles(statics);   // 直升机与建筑构件的碰撞（须在烘焙前，构件仍在分组中）
  statics.forEach(bake);
  ECO.waterMats = W.mats;
  if (DEBUG) window.__statics = { groups: statics, THREE, TIME_U, waterMats: W.mats };   // 调试：烘焙前的构件分组（供场景体检逐个检查）与动画时间 uniform（供截图固定时刻）
  { const live = []; for (const g of statics) g.traverse(o => { if (o.isMesh && o.userData.live && !(o.parent && o.parent.userData.live)) live.push(o); }); live.forEach(o => { o.castShadow = !o.material.transparent; scene.attach(o); }); }
  flushBatches(scene);
  await stage(0.8, '雨林与作物');
  const veg = buildVegetation(X, scene, QS); buildCrops(scene); veg.rice = buildRice(scene, QS).hills; buildPots(scene); buildMarine(scene, X); buildAnimals(scene); buildEcology(scene);
  await stage(0.92, '光影');
  // ---------------- 相机与视角 ----------------
  const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 3, 20000);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.47; controls.minDistance = 25; controls.maxDistance = 2600;
  controls.screenSpacePanning = false;
  const VIEWS = [
    { name: '南侧鸟瞰', pos: [0, 600, 715], tgt: [5, 0, -10] },
    { name: '正上俯视', pos: [0, 1180, 1], tgt: [0, 0, -4] },
    { name: '东北方向', pos: [620, 520, -560], tgt: [0, 0, -10] },
    { name: '西北方向', pos: [-640, 500, -520], tgt: [0, 0, -10] },
    { name: '港口与水闸', pos: [55, 175, 285], tgt: [18, 0, 95] },
    { name: '别墅与瀑布', pos: [140, 62, -118], tgt: [184, 16, -62] },
    { name: '西山机场', pos: [-150, 115, -40], tgt: [-228, 40, -122] },
    { name: '停车场', pos: [250, 55, 70], tgt: [205, 8, 30] },
    { name: '住宅楼', pos: [-45, 60, -70], tgt: [0, 26, -148] },
    { name: '农业区', pos: [-40, 150, 90], tgt: [-60, 5, -40] },
  ];
  // 宽高比自适应：保证全岛完整入画
  const fitDist = (v) => { const a = camera.aspect; return a < 1.5 && v.name !== '港口与水闸' && v.name !== '别墅与瀑布' && v.name !== '西山机场' && !['农业区', '停车场', '住宅楼'].includes(v.name) ? Math.min(2.4, 1.5 / a * 1.08) : 1; };
  const nav = document.getElementById('views');
  let anim = null;
  function goView(i, instant) {
    const v = VIEWS[i], k = fitDist(v), tgt = new THREE.Vector3(...v.tgt), pos = new THREE.Vector3(...v.pos).sub(tgt).multiplyScalar(k).add(tgt);
    [...nav.children].forEach((b, j) => b.classList.toggle('on', j === i));
    if (instant) { camera.position.copy(pos); controls.target.copy(tgt); controls.update(); return; }
    anim = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: tgt };
  }
  VIEWS.forEach((v, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = v.name; b.onclick = () => goView(i); nav.appendChild(b); });
  setupBoat(scene, yacht);
  const fp = setupFP({ scene, camera, controls, renderer, X }); FP_API = fp; setupHeli(scene, heliG, (x, z) => { const f = fp._test.floorAt(x, z, 60); return f; }); const grass = buildGrass(X, GR, QS, scene);
  { // 小地图底图：地表贴图降采样到 1 像素/米
    const mb = document.createElement('canvas'); mb.width = TX.w; mb.height = TX.h; const mc = mb.getContext('2d'), id = mc.createImageData(TX.w, TX.h), g = GR.ground, k = g.w / TX.w;
    const src = g.data || null;
    if (src) { for (let y = 0; y < TX.h; y++) for (let x = 0; x < TX.w; x++) { const o = (Math.floor(y * k) * g.w + Math.floor(x * k)) * 4, p = (y * TX.w + x) * 4; id.data[p] = src[o]; id.data[p + 1] = src[o + 1]; id.data[p + 2] = src[o + 2]; id.data[p + 3] = 255; } mc.putImageData(id, 0, 0); }
    else mc.drawImage(g, 0, 0, TX.w, TX.h);
    fp.setMapBase(mb);
  }
  const fogAir = scene.fog, fogWater = new THREE.FogExp2(0x1f6a68, 0.06); let under = false, underKind = '';
  function underwaterCheck() {
    let u = false;
    if (fp.on) { const w = fp._test.waterAt(camera.position.x, camera.position.z); u = !!(w && camera.position.y < w.level - 0.05); if (u) { const kind = w.pool ? 'pool' : w.level > 5 ? 'lake' : 'sea'; if (kind !== underKind) { underKind = kind; fogWater.color.set(kind === 'pool' ? 0x5fb8c6 : kind === 'lake' ? 0x2e6a52 : 0x1f6a68); fogWater.density = kind === 'pool' ? 0.045 : kind === 'lake' ? 0.11 : 0.06; if (under) renderer.setClearColor(fogWater.color); } } }
    ecoUnderwater(camera, u, underKind, fogWater, renderer, document.getElementById('uw'));
    if (u === under) return; under = u;
    scene.fog = u ? fogWater : fogAir; sky.visible = !u; renderer.setClearColor(u ? fogWater.color : 0x000000);
    document.body.classList.toggle('under', u);
  }
    if (DEBUG) { window.__fp = fp; window.__dbg = { HELI, HELI_SPOTS, updateHeli, heliAutoToggle, MARINE, updateMarine, ECO, updateEcology, ecoZone, SEATS, POTS, COLL, BOARDWALK, gh, G, L, INTERACT, GATE, ANIMALS, updateAnimals, DRIVE, updateDrive, exitCar, BOAT, DYN, updateBoat, syncBoat, carryOnBoat, startCruise, updateGate }; }
  const fpBtn = document.createElement('button'); fpBtn.type = 'button'; fpBtn.textContent = '第一人称漫游'; fpBtn.style.color = 'var(--accent)';
  fpBtn.onclick = () => { fp.enter(false); document.getElementById('fpgate').classList.add('show'); }; nav.appendChild(fpBtn);
  const hashParts = decodeURIComponent(location.hash.slice(1)).split(','); const hashView = VIEWS.findIndex(v => hashParts.includes(v.name));
  goView(Math.max(0, hashView), true);
  const qsel = document.getElementById('qsel');
  for (const [t, n] of [['high', '高'], ['mid', '中'], ['low', '低']]) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.className = t === QS.tier ? 'on' : ''; b.title = '画质：' + n;
    b.onclick = () => { try { localStorage.setItem('islandQ', t); } catch (e) { } const hp = HASH.filter(x => x && !x.startsWith('q=')); hp.push('q=' + t); location.hash = hp.join(','); location.reload(); };
    qsel.appendChild(b);
  }
  const toggleUI = () => document.body.classList.toggle('clean');
  document.getElementById('hideui').onclick = toggleUI; document.getElementById('showui').onclick = toggleUI;
  window.addEventListener('keydown', e => { if (fp.on) { if (e.key === 'h' || e.key === 'H') toggleUI(); return; } if (e.code === 'KeyF') { fpBtn.click(); return; } if (e.key === 'h' || e.key === 'H') toggleUI(); const n = parseInt(e.key, 10); if (n >= 1 && n <= Math.min(9, VIEWS.length)) goView(n - 1); });
  if (location.hash.includes('clean')) { document.body.classList.add('clean'); document.querySelectorAll('.ui,#showui').forEach(e => e.style.display = 'none'); }
  controls.addEventListener('start', () => { anim = null; [...nav.children].forEach(b => b.classList.remove('on')); });
  if (hashParts.includes('fp')) fp.enter(true);
  if (hashParts.includes('tp')) { fp.enter(true); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' })); }
  function resize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }
  window.addEventListener('resize', resize);
  renderer.shadowMap.needsUpdate = true;
  // ---- 阴影：鸟瞰用全岛静态阴影；漫游时切换为跟随玩家的 ±70 米高精度阴影 ----
  const SH0 = { l: -430, r: 430, t: 330, b: -330, n: 600, f: 2300, nb: sun.shadow.normalBias, bias: sun.shadow.bias };
  const shadowState = { mode: 'island', cx: 1e9, cz: 1e9, lastT: 0 };
  const Lu = new THREE.Vector3().crossVectors(SUN_DIR, new THREE.Vector3(0, 1, 0)).normalize(), Lv = new THREE.Vector3().crossVectors(Lu, SUN_DIR).normalize();
  function shadowFollow(t) {
    const sc = sun.shadow.camera;
    if (fp.on && QS.fpShadow) {
      const p = fp.pos, near = L.turbines.some(q => Math.hypot(q[0] - p.x, q[1] - p.z) < 90);
      const moved = Math.hypot(p.x - shadowState.cx, p.z - shadowState.cz);
      if (shadowState.mode !== 'fp' || moved > 3 || (near && t - shadowState.lastT > 0.5)) {
        const R = 70, texel = 2 * R / sun.shadow.mapSize.x, c = new THREE.Vector3(p.x, gh(p.x, p.z), p.z);
        const cu = c.dot(Lu), cv = c.dot(Lv);                // 吸附到纹素网格，避免行走时阴影闪烁
        c.addScaledVector(Lu, Math.round(cu / texel) * texel - cu).addScaledVector(Lv, Math.round(cv / texel) * texel - cv);
        sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 1; sc.far = 900; sc.updateProjectionMatrix();
        sun.position.copy(c).addScaledVector(SUN_DIR, 400); sun.target.position.copy(c); sun.target.updateMatrixWorld();
        sun.shadow.normalBias = 0.04; sun.shadow.bias = -0.0003;
        renderer.shadowMap.needsUpdate = true; shadowState.mode = 'fp'; shadowState.cx = p.x; shadowState.cz = p.z; shadowState.lastT = t;
      }
    } else if (shadowState.mode !== 'island') {
      sc.left = SH0.l; sc.right = SH0.r; sc.top = SH0.t; sc.bottom = SH0.b; sc.near = SH0.n; sc.far = SH0.f; sc.updateProjectionMatrix();
      sun.position.copy(SUN_DIR).multiplyScalar(1400); sun.target.position.set(0, 0, 0); sun.target.updateMatrixWorld();
      sun.shadow.normalBias = SH0.nb; sun.shadow.bias = SH0.bias;
      renderer.shadowMap.needsUpdate = true; shadowState.mode = 'island'; shadowState.cx = 1e9;
    }
  }
  const needle = document.getElementById('needle');
  const clock = new THREE.Clock(); let frames = 0, slow = 0;
  function loop() {
    const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
    if (anim) { anim.t = Math.min(1, anim.t + dt / 1.6); const e = anim.t < 0.5 ? 4 * anim.t ** 3 : 1 - Math.pow(-2 * anim.t + 2, 3) / 2; camera.position.lerpVectors(anim.p0, anim.p1, e); controls.target.lerpVectors(anim.t0, anim.t1, e); if (anim.t >= 1) anim = null; }
    { const prev = updateBoat(dt, t, fp._st.keys); if (BOAT.moved) { if (fp.on) carryOnBoat(fp._st, prev); syncBoat(t); } }
    { const hr = updateHeli(dt, fp._st.keys, fp.on ? camera : null);
      if (fp.on && DRIVE.active === HELI) { fp._st.pos.set(HELI.x, HELI.y + 1.5, HELI.z); fp.mapTick(t); document.getElementById('fphud').textContent = HELI.auto ? `H125 自动飞行：${HELI.auto.to === 'roof' ? '前往别墅屋顶' : '返回停机坪'}（${({ spool: '旋翼起转', lift: '起飞', cruise: '超低空巡航', approach: '进近', align: '悬停对准', land: '垂直降落', shutdown: '关车' })[HELI.auto.phase]}）  速度 ${hr.kmh} 公里/小时  离地 ${hr.agl} 米  G 取消` : `H125  速度 ${hr.kmh} 公里/小时  离地 ${hr.agl} 米  空格 上升  Shift 下降  W/S 前后  A/D 转向  V 视角  G 自动飞往${Math.hypot(HELI.x - HELI_SPOTS.roof.x, HELI.z - HELI_SPOTS.roof.z) < 30 ? '停机坪' : '别墅屋顶'}  ${HELI.ground ? 'E 下机' : ''}`; } }
    if (fp.on && DRIVE.active === HELI) {}
    else if (fp.on && DRIVE.active === BOAT) { boatCamera(dt, camera); document.getElementById('fphud').textContent = `驾驶游艇  航速 ${(Math.abs(BOAT.v) * 1.944).toFixed(1)} 节${BOAT.v < -0.05 ? '（倒车）' : ''}  油门 ${Math.round(BOAT.thr * 100)}%  ${BOAT.hit ? '【' + ({ shallow: '水浅搁浅风险', pier: '碰撞闸墩', gate: '水闸未开启', pile: '碰撞系缆桩', dock: '碰撞浮台' })[BOAT.hit] + '】' : ''}  W/S 油门  A/D 舵  空格 收油  V 视角  E 离开舵位`; }
    else if (fp.on && DRIVE.active) { const r = updateDrive(dt, fp._st.keys, camera, fp); fp._st.pos.set(DRIVE.active.x, DRIVE.active.y + 1.5, DRIVE.active.z); document.getElementById('fphud').textContent = `驾驶 ${DRIVE.active.sp.name}  ${Math.abs(r.kmh)} 公里/小时${r.kmh < 0 ? '（倒车）' : ''}  W/S 油门制动  A/D 转向  空格 手刹  V 视角  E 下车`; }
    else if (!fp.update(dt)) controls.update();
    for (const m of W.mats) if (m.uniforms && m.uniforms.uTime) m.uniforms.uTime.value = t;
    for (const u of TIME_U) u.value = t;
    if (grass) grass.update(fp);
    shadowFollow(t); underwaterCheck(); if (fp.on) fp.mapTick(t);
    updateAnimals(dt, fp.on ? fp.pos : null);
    { const st_ = fp._st, w_ = fp.on ? fp._test.waterAt(st_.pos.x, st_.pos.z) : null; updateEcology(dt, t, camera, fp.on ? { x: st_.pos.x, y: camera.position.y, z: st_.pos.z, inWater: st_.mode === 'swim' || !!(w_ && w_.level - st_.feet > 0.3), under: !!(w_ && camera.position.y < w_.level) } : null); }
    { const st_ = fp._st, w_ = fp.on ? fp._test.waterAt(st_.pos.x, st_.pos.z) : null; updateMarine(dt, t, fp.on ? { x: st_.pos.x, z: st_.pos.z, inWater: st_.mode === 'swim' || !!(w_ && w_.level - st_.feet > 1), under: camera.position.y < (w_ ? w_.level : -99), lagoon: st_.pos.z < L.gateZ && Math.abs(st_.pos.x) < 70 && st_.pos.z > 30 } : null); }
    if (updateGate(dt, fp)) renderer.shadowMap.needsUpdate = true;   // 水闸：开闸转移门顶上的人 + 门叶动画
    for (const l of LIVE) if (l.type === 'rotor') l.obj.rotation.z -= dt * l.speed;
    const az = fp.on ? fp.yaw : Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
    needle.setAttribute('transform', `rotate(${(az * 180 / Math.PI).toFixed(1)} 27 27)`);
    renderer.render(scene, camera);
    frames++;
    if (frames === 3) { document.getElementById('loading').classList.add('done'); if (location.hash.includes('still')) document.getElementById('loading').style.display = 'none'; if (location.hash.includes('still')) document.title = 'done:私人海岛庄园 三维鸟瞰'; }
    if (frames > 20 && frames < 140) { if (dt > 0.05) slow++; if (frames === 139 && slow > 80 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); resize(); } }
    if (location.hash.includes('still') && frames >= 3) return;
    requestAnimationFrame(loop);
  }
  if (DEBUG) window.__island = { scene, camera, controls, renderer, X, veg, goView, QS, grass, shadowFollow, underwaterCheck }; if (location.hash.includes('still')) { let tri = 0; scene.traverse(o => { if (o.isMesh) { const g = o.geometry, n = g.index ? g.index.count / 3 : g.attributes.position.count / 3; tri += n * (o.isInstancedMesh ? o.count : 1); } }); console.log('veg', JSON.stringify(veg), 'tris', Math.round(tri / 1000) + 'k'); }
  await stage(1, '');
  loop();
} catch (err) {
  console.error(err); lstep.textContent = '生成失败：' + (err && err.message ? err.message : err); document.title = 'error:' + err;
}
