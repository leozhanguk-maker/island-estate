// ======================= 17e 水域生态·编排与每帧更新 =======================
function buildEcology(scene) {
  ECO.scene = scene; ecoRaysInit(scene); buildEcoLake(scene);
  if (typeof buildEcoLagoon === 'function') buildEcoLagoon(scene);
  if (typeof buildEcoOcean === 'function') buildEcoOcean(scene);
  ECO.built = true;
}
// 每帧：只推进相机附近水域的生物（远处水域整体隐藏、不计算）；player 为漫游中的玩家（潜水时作为鱼群的“捕食者”）
function updateEcology(dt, t, camera, player) {
  if (!ECO.built) return;
  dt = Math.min(dt, 0.05); ECO.t = t; ECO.cam = camera.position; ECO.player = player;
  const c = camera.position;
  for (const [name, Z] of Object.entries(ECO.zones)) {
    if (!Z) continue;
    const d = Math.hypot(c.x - Z.center.x, c.z - Z.center.z), on = d < Z.radius + (Z.view ?? 140);
    if (on !== Z.on) { Z.on = on; for (const m of Z.meshes) m.visible = on; if (!on) { for (const f of Z.flocks || []) f.lod.hide(); for (const k of Z.critters || []) k.lod.hide(); for (const w of Z.whales || []) w.lod.hide(); } }
    if (!on) continue;
    for (const f of Z.flocks || []) { if (f.near(c, 20)) { f.update(dt, t); f.draw(); } else f.lod.hide(); }
    for (const k of Z.critters || []) { k.update(dt, t); k.draw(); }
    if (Z.update) Z.update(dt, t);
  }
  ecoSprayUpdate(dt);
  // 章鱼墨汁：扩散变大、逐渐变淡，约 4 秒后消失
  if (ECO.ink && ECO.ink.t < 4) { const k = (ECO.ink.t += dt) / 4; ECO.ink.m.scale.setScalar(0.2 + 1.3 * Math.sqrt(k)); ECO.ink.m.material.opacity = 0.8 * (1 - k); ECO.ink.m.visible = k < 1; }
}

// ---------------- 三个水域的水下观感：雾色、能见度（指数雾密度）、随深度变暗 ----------------
// 淡水湖：略带黄绿、能见度 3～5 m，深处墨绿；潟湖：绿松石到浅蓝、能见度 15 m 以上；外海：深蓝，向下迅速变暗、远处雾化
const ECO_LOOK = {
  lake: { top: new THREE.Color(0x6f8440), deep: new THREE.Color(0x1d3620), k: 2.2, dens: 0.25, over: 'radial-gradient(ellipse at 50% 18%,rgba(170,190,110,.16),rgba(24,44,20,.62))' },
  lagoon: { top: new THREE.Color(0x52c9c8), deep: new THREE.Color(0x2a92ac), k: 9, dens: 0.068, over: 'radial-gradient(ellipse at 50% 18%,rgba(160,240,235,.10),rgba(10,70,80,.35))' },
  ocean: { top: new THREE.Color(0x1f5ea6), deep: new THREE.Color(0x03122a), k: 16, dens: 0.05, over: 'radial-gradient(ellipse at 50% 12%,rgba(120,170,230,.10),rgba(2,12,34,.62))' },
};
const ecoLookTmp = { c: new THREE.Color(), c2: new THREE.Color() };
// 返回相机所在位置的目标雾色与密度；海水在水闸附近（闸内 8 m 到闸外 40 m）从潟湖渐变到外海
function ecoWaterLook(x, y, z, kind) {
  const T = ecoLookTmp;
  if (kind === 'lake') { const A = ECO_LOOK.lake, d = Math.max(0, L.lake.level - y); T.c.copy(A.top).lerp(A.deep, 1 - Math.exp(-d / A.k)); return { color: T.c, density: A.dens * (1 + d * 0.08), over: A.over, zone: 'lake' }; }
  const lag = (1 - smoothstep(L.gateZ - 8, L.gateZ + 40, z)) * (z > 18 ? 1 : 0) * (1 - smoothstep(70, 80, Math.abs(x))), d = Math.max(0, -y);
  const A = ECO_LOOK.lagoon, B = ECO_LOOK.ocean;
  T.c.copy(A.top).lerp(A.deep, 1 - Math.exp(-d / A.k)); T.c2.copy(B.top).lerp(B.deep, 1 - Math.exp(-d / B.k)); T.c2.lerp(T.c, lag);
  return { color: T.c2, density: lerp(B.dens * (1 + d * 0.02), A.dens, lag), over: lag > 0.5 ? A.over : B.over, zone: lag > 0.5 ? 'lagoon' : 'ocean', lag };
}
// 丁达尔光束：若干竖直的发光面片，围绕相机分布并朝向相机，上亮下暗、随时间轻微摆动闪烁（一个实例化网格、一次绘制）
function ecoRaysInit(scene) {
  const n = 18, g = new THREE.PlaneGeometry(1, 1, 1, 8); g.translate(0, -0.5, 0);
  const uT = { value: 0 }, uI = { value: 0 }; TIME_U.push(uT);
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uTime: uT, uI },
    vertexShader: `attribute float iPh; varying vec2 vUv; varying float vPh; varying vec3 vW; uniform float uTime; void main(){ vUv = uv; vPh = iPh; vec3 p = position; p.x += sin(uTime * 0.4 + iPh * 6.3) * 0.25 * (1.0 - uv.y); vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime, uI; varying vec2 vUv; varying float vPh; varying vec3 vW;
      void main(){ float edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x); float fall = pow(vUv.y, 1.6); float fl = 0.65 + 0.35 * sin(uTime * (0.6 + vPh) + vPh * 20.0);
        float d = length(cameraPosition - vW); float near = smoothstep(1.5, 5.0, d) * (1.0 - smoothstep(20.0, 42.0, d));
        gl_FragColor = vec4(vec3(0.62, 0.8, 0.95) * edge * fall * fl * near * uI * 0.16, 1.0); }` });
  const ph = new THREE.InstancedBufferAttribute(new Float32Array(n).map(() => ECO_R()), 1); g.setAttribute('iPh', ph);
  const im = new THREE.InstancedMesh(g, m, n); im.frustumCulled = false; im.visible = false; scene.add(im);
  { const far = new THREE.Matrix4().makeTranslation(0, -1000, 0); for (let i = 0; i < n; i++) im.setMatrixAt(i, far); }   // 未启用时停在极远处（与其他隐藏实例的约定一致）
  // 水下背景：跟随相机的反面大球，完全被雾覆盖，保证远处与水面、海底的雾色一致（清屏色不经色调映射，直接露出会形成一道硬边）
  const bg = new THREE.Mesh(new THREE.SphereGeometry(160, 24, 12), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, depthWrite: false }));
  bg.frustumCulled = false; bg.renderOrder = -10; bg.visible = false; scene.add(bg); ECO.uwBack = bg;
  ECO.rays = { im, n, uI, seeds: Array.from({ length: n }, () => [ECO_R() * TAU, 4 + ECO_R() * 22, 1.2 + ECO_R() * 3.2]) };
}
// 水面背面（水下仰视）远处融入当前水域的雾色；fog 为空时恢复默认。与 three.js 场景雾一致，雾色取输出色彩空间（sRGB）的值
function ecoSurfaceFog(fog) {
  for (const m of ECO.waterMats || []) { const u = m.uniforms; if (!u || !u.uUwC) continue; if (fog) { fog.color.getRGB(u.uUwC.value, THREE.SRGBColorSpace); u.uUwD.value = fog.density; u.uUwE.value = 1; } else { u.uUwC.value.setRGB(0.07, 0.28, 0.30); u.uUwD.value = 0.08; u.uUwE.value = 0; } }
}
// 每帧由主循环的水下判定调用：under 为相机是否在水下，kind 为 lake / sea / pool
function ecoUnderwater(camera, under, kind, fog, renderer, uw) {
  const c = camera.position, R = ECO.rays;
  const B = ECO.uwBack; if (B) { B.visible = under && kind !== 'pool'; if (B.visible) B.position.copy(c); }
  if (!under || kind === 'pool') { if (R) R.im.visible = false; ecoSurfaceFog(null); return; }
  const L_ = ecoWaterLook(c.x, c.y, c.z, kind);
  // 雾色与能见度平滑过渡（镜头穿过水闸、下潜时能感到变化）
  fog.color.lerp(L_.color, 0.08); fog.density = lerp(fog.density, L_.density, 0.08); renderer.setClearColor(fog.color); ecoSurfaceFog(fog);
  if (uw && uw.dataset.zone !== L_.zone) { uw.dataset.zone = L_.zone; uw.style.background = L_.over; }
  if (R) {
    const inten = kind === 'lake' ? 0 : lerp(1, 0.45, L_.lag ?? 0) * Math.exp(-Math.max(0, -c.y) / 30);
    R.uI.value = inten; R.im.visible = inten > 0.02;
    if (R.im.visible) { for (let i = 0; i < R.n; i++) { const [a, r, w] = R.seeds[i], x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r, yaw = Math.atan2(c.x - x, c.z - z); R.im.setMatrixAt(i, ecoPose(x, -0.05, z, yaw, 0, 0.18, w, 40, 1)); } R.im.instanceMatrix.needsUpdate = true; }
  }
}
