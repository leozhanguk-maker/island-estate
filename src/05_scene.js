// ======================= 05 渲染器 / 天空 / 光照 / 地形与水体 =======================
const SUN_DIR = new THREE.Vector3(-0.42, 0.74, 0.52).normalize();
const SKY = { zenith: new THREE.Color(0x3f7fc4), horizon: new THREE.Color(0xc9dde8), fog: new THREE.Color(0xb9d0de) };
const GLSL_NOISE = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
float fbm3(vec2 p){ return 0.55*vnoise(p) + 0.3*vnoise(p*2.03+7.1) + 0.15*vnoise(p*4.01-3.7); }
`;
const TIME_U = [];   // 所有需要时间驱动的着色器 uniform
const CLOUD = { h: 950, cov: 0.5, scale: 0.0024, wind: new THREE.Vector2(6.0, 2.5) };
const GLSL_CLOUD = `
uniform float uCloudOn;
float cloudDen(vec2 q, float t){
  vec2 p = q * ${CLOUD.scale.toFixed(5)} + vec2(${CLOUD.wind.x.toFixed(2)}, ${CLOUD.wind.y.toFixed(2)}) * t * ${CLOUD.scale.toFixed(5)};
  p += 0.9 * vec2(vnoise(p * 0.45 + 3.7), vnoise(p * 0.45 - 8.1)) - 0.45;
  mat2 rm = mat2(0.8, -0.6, 0.6, 0.8);
  float n = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { n += a * vnoise(p); p = rm * p * 2.07 + 11.3; a *= 0.5; }
  return smoothstep(${CLOUD.cov.toFixed(2)}, ${(CLOUD.cov + 0.2).toFixed(2)}, n / 0.97) * uCloudOn;
}
float cloudShadow(vec3 wp, vec3 sunDir, float t){
  vec2 q = wp.xz + sunDir.xz / max(sunDir.y, 0.2) * (${CLOUD.h.toFixed(1)} - wp.y);
  return cloudDen(q, t);
}`;
function setupRenderer(QS) {
  const renderer = new THREE.WebGLRenderer({ antialias: QS.aa, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QS.pr));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  document.getElementById('app').appendChild(renderer.domElement);
  return renderer;
}
function makeSkyMaterial(cloudsOn, env) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uZen: { value: SKY.zenith }, uHor: { value: SKY.horizon }, uSun: { value: SUN_DIR }, uTime: { value: 0 }, uCloudOn: { value: cloudsOn ? 1 : 0 }, uEnv: { value: env ? 1 : 0 } },
    vertexShader: `varying vec3 vDir; varying vec3 vWorld; void main(){ vDir = normalize(position); vec4 w = modelMatrix*vec4(position,1.0); vWorld = w.xyz; vec4 p = projectionMatrix*viewMatrix*w; gl_Position = p; gl_Position.z = gl_Position.w*0.99999; }`,
    fragmentShader: `uniform vec3 uZen, uHor, uSun; uniform float uTime, uEnv; varying vec3 vDir; varying vec3 vWorld;
      ${GLSL_NOISE}
      ${GLSL_CLOUD}
      void main(){ vec3 d = normalize(vDir); float y = clamp(d.y, -0.2, 1.0);
        vec3 c = mix(uHor, uZen, pow(max(y,0.0), 0.55));
        c = mix(c, uHor*0.92, smoothstep(0.0,-0.2,y));
        float s = max(dot(d, uSun), 0.0);
        c += vec3(1.0,0.93,0.8)*(pow(s, 900.0)*6.0 + pow(s, 12.0)*0.12);
        // 云层：投影到固定高度的云平面，随相机视差
        if (d.y > 0.015) {
          vec3 camP = uEnv > 0.5 ? vec3(0.0) : cameraPosition;
          vec2 q = camP.xz + d.xz / d.y * (${CLOUD.h.toFixed(1)} - camP.y);
          float den = cloudDen(q, uTime);
          float den2 = cloudDen(q + uSun.xz * 60.0, uTime);
          float lit = clamp(0.62 + 0.55 * (den - den2) + 0.25 * pow(s, 4.0), 0.35, 1.25);
          vec3 cc = mix(vec3(0.62,0.66,0.72), vec3(1.0,0.99,0.96), lit);
          float fadeH = smoothstep(0.015, 0.16, d.y);
          c = mix(c, cc, den * 0.92 * fadeH);
          // 高空卷云
          vec2 q2 = d.xz / d.y * 3.0 + vec2(uTime*0.004, 0.0);
          float ci = smoothstep(0.55, 0.9, vnoise(q2*vec2(1.0, 4.0)) * vnoise(q2*0.7+2.0)*1.6);
          c = mix(c, vec3(0.97,0.98,1.0), ci * 0.25 * fadeH * (1.0 - den));
        }
        c += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
        gl_FragColor = vec4(c,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  if (!env) TIME_U.push(m.uniforms.uTime);
  return m;
}
function setupScene(renderer, QS) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(SKY.fog, 0.00021);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), makeSkyMaterial(QS.clouds, false));
  sky.frustumCulled = false; scene.add(sky);
  // 环境光照（PMREM）
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), makeSkyMaterial(QS.clouds, true));
  envScene.add(envSky);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(100, 32), new THREE.MeshBasicMaterial({ color: 0x3d5a34 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -30; envScene.add(ground);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(envScene, 0.02).texture;
  // 太阳与天光
  const sun = new THREE.DirectionalLight(0xfff0db, 2.35 * Math.PI);
  sun.position.copy(SUN_DIR).multiplyScalar(1400);
  sun.castShadow = true;
  sun.shadow.mapSize.set(QS.shadow, QS.shadow);
  const sc = sun.shadow.camera; sc.left = -430; sc.right = 430; sc.top = 330; sc.bottom = -330; sc.near = 600; sc.far = 2300;
  sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.35;
  scene.add(sun); scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xcfe2f3, 0x8a8c78, 0.5 * Math.PI);
  scene.add(hemi);
  return { scene, sun, hemi, sky };
}
function buildTerrainMesh(X, groundTex, maskTex, step = 1, D = null, QS = {}) {
  // step=2 时为低档：隔点取样，网格面数降为四分之一
  const nx = Math.floor((G.nx - 1) / step) + 1, nz = Math.floor((G.nz - 1) / step) + 1, NV = nx * nz;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(NV * 3), nrm = new Float32Array(NV * 3), ao = new Float32Array(NV);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const v = j * nx + i, k = (j * step) * G.nx + i * step;
    pos[v * 3] = G.x0 + i * step; pos[v * 3 + 1] = X.H[k]; pos[v * 3 + 2] = G.z0 + j * step;
    nrm[v * 3] = X.normals[k * 3]; nrm[v * 3 + 1] = X.normals[k * 3 + 1]; nrm[v * 3 + 2] = X.normals[k * 3 + 2]; ao[v] = X.ao[k];
  }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    // 按高差较小的对角线剖分，消除陡崖脚的锯齿
    if (Math.abs(pos[a * 3 + 1] - pos[d * 3 + 1]) < Math.abs(pos[b * 3 + 1] - pos[c * 3 + 1])) { idx[q++] = a; idx[q++] = c; idx[q++] = d; idx[q++] = a; idx[q++] = d; idx[q++] = b; }
    else { idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('ao', new THREE.BufferAttribute(ao, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  const mat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.93, metalness: 0.0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uMask = { value: maskTex };
    sh.uniforms.uMat = { value: D.mat }; sh.uniforms.uDG = { value: D.det[0] }; sh.uniforms.uDS = { value: D.det[1] }; sh.uniforms.uDV = { value: D.det[2] }; sh.uniforms.uDO = { value: D.det[3] }; sh.uniforms.uDR = { value: D.det[4] };
    sh.uniforms.uTime = { value: 0 }; sh.uniforms.uCloudOn = { value: QS.clouds ? 1 : 0 }; sh.uniforms.uSunD = { value: SUN_DIR }; TIME_U.push(sh.uniforms.uTime);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float ao; varying float vAO; varying vec3 vWP; varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAO = ao; vWP = (modelMatrix*vec4(transformed,1.0)).xyz; vWN = normalize(mat3(modelMatrix)*normal);')
      .replace('#include <uv_vertex>', '');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uMask, uMat, uDG, uDS, uDV, uDO, uDR; uniform float uTime; uniform vec3 uSunD; varying float vAO; varying vec3 vWP; varying vec3 vWN;\n' + GLSL_NOISE + GLSL_CLOUD)
      .replace('#include <map_fragment>', `
        vec3 detailN = vec3(0.0); float wetSand = 0.0;
        vec2 guv = vec2((vWP.x - (${TX.x0.toFixed(1)})) / ${TX.w.toFixed(1)}, (vWP.z - (${TX.z0.toFixed(1)})) / ${TX.h.toFixed(1)});
        vec4 gcol = texture2D(map, guv);
        float slope = 1.0 - vWN.y;
        float nA = fbm3(vWP.xz * 0.06);
        float band = 0.5 + 0.5 * sin((vWP.y + nA * 9.0) * 0.9 + vnoise(vWP.xz*0.35)*2.5);
        vec3 an = abs(vWN); an /= (an.x + an.z + 1e-3);
        vec2 px_ = vec2(vWP.z, vWP.y), pz_ = vec2(vWP.x, vWP.y);
        float streak = mix(vnoise(pz_ * vec2(0.5, 0.07)), vnoise(px_ * vec2(0.5, 0.07)), an.x);
        float grain = mix(fbm3(pz_ * 0.55), fbm3(px_ * 0.55), an.x);
        float fine = mix(vnoise(pz_ * 2.4), vnoise(px_ * 2.4), an.x);
        vec3 rock = mix(vec3(0.10,0.092,0.08), vec3(0.26,0.235,0.20), 0.25*band + 0.35*streak + 0.4*grain);
        rock *= 0.78 + 0.35 * fine;
        float rdet = mix(texture2D(uDR, pz_ * 0.18).r, texture2D(uDR, px_ * 0.18).r, an.x) * 0.6 + 0.4 * mix(texture2D(uDR, pz_ * 0.045).r, texture2D(uDR, px_ * 0.045).r, an.x);
        float rfine = mix(texture2D(uDR, pz_ * 0.75).r, texture2D(uDR, px_ * 0.75).r, an.x);
        rock *= (0.42 + 1.1 * rdet) * (0.75 + 0.5 * rfine) * 0.85;
        rock = mix(rock, rock * vec3(0.9, 0.78, 0.62), smoothstep(0.6, 0.8, vnoise(pz_ * 0.08 + px_ * 0.05)) * 0.6);
        float moss = smoothstep(0.55, 0.75, fbm3(vec2(vWP.x*0.12 + vWP.y*0.2, vWP.z*0.12 - vWP.y*0.15))) * smoothstep(0.85, 0.5, slope);
        rock = mix(rock, vec3(0.05,0.09,0.03), moss * 0.85);
        rock = mix(rock, vec3(0.06,0.10,0.04), smoothstep(0.62, 0.45, slope) * 0.6);
        float rm = smoothstep(0.30, 0.52, slope + (vnoise(vWP.xz*0.7)-0.5)*0.16) * step(-0.5, vWP.y);
        // 陡坡上的土石：即使未完全转为岩石，也叠加岩石细节，避免宏观贴图的模糊
        float steepD = smoothstep(0.22, 0.45, slope) * (1.0 - rm);
        vec3 col = mix(gcol.rgb, rock, rm);
        col *= mix(1.0, 0.55 + 0.9 * rdet, steepD);
        col *= 0.9 + 0.2 * vnoise(vWP.xz * 2.3);
        // ---- 近景细节：材质权重 × 可平铺细节纹理（双尺度，随距离淡出） ----
        vec4 mw = texture2D(uMat, guv);
        float camD = length(vWP - cameraPosition);
        float dfade = (1.0 - smoothstep(60.0, 240.0, camD)) * (1.0 - rm);
        vec2 u1 = vWP.xz / 1.6, u2 = mat2(0.8, -0.6, 0.6, 0.8) * vWP.xz / 6.7;
        vec4 tG = mix(texture2D(uDG, u1), texture2D(uDG, u2), 0.35), tS = mix(texture2D(uDS, u1 * 0.8), texture2D(uDS, u2), 0.3);
        vec4 tV = mix(texture2D(uDV, u1 * 1.25), texture2D(uDV, u2), 0.25), tO = mix(texture2D(uDO, u1), texture2D(uDO, u2), 0.35);
        float grassW = mw.r > 0.02 ? 1.0 : 0.0; float gW = min(mw.r * 1.6, 1.0);
        float wsum = gW + mw.g + mw.b + mw.a;
        float L = (gW * tG.r + mw.g * tS.r + mw.b * tV.r + mw.a * tO.r + max(0.0, 1.0 - wsum) * 0.5) / max(wsum, 1.0);
        vec2 dn2 = (gW * (tG.gb - 0.5) + mw.g * (tS.gb - 0.5) + mw.b * (tV.gb - 0.5) * 1.4 + mw.a * (tO.gb - 0.5)) / max(wsum, 1.0);
        col *= mix(1.0, 0.3 + 1.4 * L, dfade * 0.95);
        detailN = vec3(dn2.x, 0.0, dn2.y) * 2.4 * dfade;
        vec2 rnA = mix(texture2D(uDR, pz_ * 0.18).gb, texture2D(uDR, px_ * 0.18).gb, an.x) - 0.5, rnB = mix(texture2D(uDR, pz_ * 0.75).gb, texture2D(uDR, px_ * 0.75).gb, an.x) - 0.5;
        vec2 rn = rnA + 0.6 * rnB;
        detailN += vec3(rn.x * (1.0 - an.x), rn.y, rn.x * an.x) * 2.2 * max(rm, steepD);
        wetSand = mw.g * smoothstep(0.9, 0.2, vWP.y) * step(-0.3, vWP.y);
        col *= 1.0 - 0.28 * wetSand;
        // ---- 海边沙滩：银白细沙（颗粒、深色矿物点、阳光闪点、干沙风纹）与冲岸浪（薄水层周期涌上沙面，前沿泡沫，退后留湿沙） ----
        float beachS = mw.g * step(-0.6, vWP.y) * (1.0 - smoothstep(2.6, 4.0, vWP.y)) * (1.0 - rm), sandGlint = 0.0;
        if (beachS > 0.05) {
          float nearD = 1.0 - smoothstep(18.0, 70.0, camD);
          float gc = hash12(floor(vWP.xz * 55.0)), gn = vnoise(vWP.xz * 9.0);
          col *= mix(1.0, 0.94 + 0.09 * gn + 0.04 * gc, beachS * nearD);
          col = mix(col, col * 0.6, step(0.988, gc) * beachS * nearD * 0.55);
          float dry = smoothstep(0.55, 1.3, vWP.y);
          vec2 rd = vec2(0.93, 0.37); float ra = dot(vWP.xz, rd) * 7.5 + vnoise(vWP.xz * 0.6) * 5.0;
          detailN += vec3(rd.x, 0.0, rd.y) * cos(ra) * 0.09 * dry * beachS * nearD;
          // 冲岸浪：沿岸各段相位错开，run 为此刻水层上沿的高度（海面 0 以上）
          float ph = uTime * 0.62 + vWP.x * 0.045 + vnoise(vWP.xz * 0.08) * 3.0, cyc = 0.5 + 0.5 * sin(ph);
          float run = 0.05 + 0.42 * cyc * cyc, dS = run + (vnoise(vWP.xz * 1.6 + uTime * 0.2) - 0.5) * 0.05 - vWP.y;
          float film = smoothstep(0.0, 0.035, dS) * beachS;
          float lace = (smoothstep(-0.012, 0.008, dS) - smoothstep(0.012, 0.07, dS)) * beachS * smoothstep(0.3, 0.7, vnoise(vWP.xz * 3.5 + uTime * 0.3) + 0.3);
          col = mix(col, col * vec3(0.6, 0.8, 0.84), film * 0.7);
          col = mix(col, vec3(0.95, 0.97, 0.98), clamp(lace, 0.0, 1.0) * 0.9);
          float wetB = beachS * smoothstep(0.55, 0.38, vWP.y) * (1.0 - film);
          col *= 1.0 - 0.2 * wetB;
          wetSand = max(wetSand, max(film, wetB * 0.7));
          // 闪点：少数沙粒在太阳镜面方向上闪亮（干沙、近处）
          vec3 Vs = normalize(cameraPosition - vWP), Hs = normalize(uSunD + Vs);
          float cell = hash12(floor(vWP.xz * 80.0) + 7.0);
          sandGlint = step(0.993, cell) * pow(max(dot(Hs, normalize(vWN + vec3(cell - 0.5, 0.0, fract(cell * 13.7) - 0.5) * 0.6)), 0.0), 60.0) * beachS * nearD * (1.0 - film) * 1.6;
        }
        // 云影
        col *= 1.0 - 0.22 * cloudShadow(vWP, uSunD, uTime);
        // 水下：焦散光纹 + 水体染色（海/泊港、淡水湖、山顶小湖）
        float lvl = -99.0;
        if (vWP.y < 0.05) lvl = 0.0;
        vec2 dl = (vWP.xz - vec2(${L.lake.x.toFixed(1)}, ${L.lake.z.toFixed(1)})) / vec2(${(L.lake.a * 1.35).toFixed(2)}, ${(L.lake.b * 1.45).toFixed(2)}); if (dot(dl, dl) < 1.0 && vWP.y < ${L.lake.level.toFixed(2)}) lvl = ${L.lake.level.toFixed(2)};
        vec2 du = (vWP.xz - vec2(${L.upperLake.x.toFixed(1)}, ${L.upperLake.z.toFixed(1)})) / vec2(${(L.upperLake.a * 1.35).toFixed(2)}, ${(L.upperLake.b * 1.45).toFixed(2)}); if (dot(du, du) < 1.0 && vWP.y < ${L.upperLake.level.toFixed(2)}) lvl = ${L.upperLake.level.toFixed(2)};
        if (lvl > -50.0) {
          float wd = max(lvl - vWP.y, 0.0);
          vec2 cq = vWP.xz * 0.42;
          float ca = vnoise(cq + vec2(uTime * 0.31, uTime * 0.17)), cb = vnoise(cq * 1.63 - vec2(uTime * 0.23, -uTime * 0.29));
          float caus = pow(clamp(1.0 - abs(ca - cb) * 3.2, 0.0, 1.0), 7.0) + 0.5 * pow(clamp(1.0 - abs(vnoise(cq * 2.7 + uTime * 0.4) - ca) * 3.5, 0.0, 1.0), 9.0);
          // 三个水域的水体染色与焦散强度各不相同：淡水湖黄绿、焦散弱、深处墨绿；闸内港口绿松石、焦散最强；外海深蓝、焦散弱且随深度迅速消失并变暗
          float isLake = step(1.0, lvl), lagW = (1.0 - isLake) * (1.0 - smoothstep(${(L.gateZ - 8).toFixed(1)}, ${(L.gateZ + 40).toFixed(1)}, vWP.z)) * step(18.0, vWP.z) * (1.0 - smoothstep(70.0, 80.0, abs(vWP.x)));
          float oceW = (1.0 - isLake) * (1.0 - lagW);
          vec3 tint = isLake * mix(vec3(0.95, 0.99, 0.95), vec3(0.74, 0.88, 0.82), smoothstep(0.5, 2.8, wd)) + lagW * mix(vec3(0.82, 0.97, 0.96), vec3(0.62, 0.86, 0.9), smoothstep(1.0, 8.0, wd)) + oceW * mix(vec3(0.7, 0.84, 0.98), vec3(0.16, 0.26, 0.45), smoothstep(3.0, 28.0, wd));
          col *= tint;
          float causK = isLake * 0.7 * (1.0 - smoothstep(0.3, 3.5, wd)) + lagW * 1.15 * (1.0 - smoothstep(0.3, 9.0, wd)) + oceW * 0.5 * exp(-wd / 7.0);
          vec3 causC = isLake * vec3(0.6, 0.66, 0.56) + (1.0 - isLake) * vec3(0.55, 0.64, 0.6);
          col += causC * caus * causK * (1.0 - 0.7 * cloudShadow(vWP, uSunD, uTime));
        }
        float wetband = smoothstep(2.4, 0.2, vWP.y) * step(-0.3, vWP.y) * rm;
        col *= 1.0 - 0.35 * wetband;
        diffuseColor.rgb *= col;
        float wetMask = texture2D(uMask, guv).r;
      `)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.32, wetMask); roughnessFactor = mix(roughnessFactor, 0.35, wetSand); diffuseColor.rgb *= mix(1.0, 0.8, wetMask);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(normal + (viewMatrix * vec4(detailN, 0.0)).xyz);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.98, 0.94) * sandGlint;')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= vAO; reflectedLight.indirectSpecular *= vAO * mix(1.0, 1.6, wetMask);');
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true; mesh.castShadow = true;
  return mesh;
}
function buildWaterData(X) {
  // R=地形高程 G=离岸距离 B=闸内静水 A=沙滩（水底为白沙）
  const land = new Uint8Array(GN); for (let k = 0; k < GN; k++) land[k] = X.H[k] > 0.05 ? 1 : 0;
  const dLand = edt(land, 1);
  const data = new Uint16Array(GN * 4), h2f = THREE.DataUtils.toHalfFloat;
  for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
    const k = j * G.nx + i, x = G.x0 + i, z = G.z0 + j;
    const calm = (z < L.notch.zGate + 0.5 && X.sdW[k] > -3) ? 1 : smoothstep(L.notch.zGate + 18, L.notch.zGate, z) * (X.sdW[k] > 0 ? 0.4 : 0);
    data[k * 4] = h2f(X.H[k]); data[k * 4 + 1] = h2f(Math.min(dLand[k], 60)); data[k * 4 + 2] = h2f(calm); data[k * 4 + 3] = h2f(X.beachW(x, z));
  }
  const tex = new THREE.DataTexture(data, G.nx, G.nz, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
  return tex;
}
function makeWaterMaterial(dataTex, opts) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true,
    uniforms: {
      uTime: { value: 0 }, uData: { value: dataTex }, uGrid: { value: new THREE.Vector4(G.x0, G.z0, G.nx - 1, G.nz - 1) },
      uSun: { value: SUN_DIR }, uZen: { value: SKY.zenith }, uHor: { value: SKY.horizon }, uFog: { value: SKY.fog },
      uFogD: { value: 0.00021 }, uLevel: { value: opts.level || 0 }, uFresh: { value: opts.fresh ? 1 : 0 },
      uPlunge: { value: new THREE.Vector2(FALL.plunge.x, FALL.plunge.z) }, uCloudOn: { value: opts.clouds ? 1 : 0 },
      // 水下仰视水面时远处融入的水色与衰减（由生态模块按所在水域每帧设置）
      uUwC: { value: new THREE.Color(0.07, 0.28, 0.30) }, uUwD: { value: 0.08 }, uUwE: { value: 0 }
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `
      uniform float uTime, uFogD, uLevel, uFresh, uUwD, uUwE; uniform vec3 uUwC; uniform sampler2D uData; uniform vec4 uGrid;
      uniform vec3 uSun, uZen, uHor, uFog; uniform vec2 uPlunge; varying vec3 vW;
      ${GLSL_NOISE}
      ${GLSL_CLOUD}
      vec2 waveGrad(vec2 p, float t, float amp, float fade){
        vec2 g = vec2(0.0);
        vec2 d1 = normalize(vec2(0.8, 0.6)), d2 = normalize(vec2(-0.3, 1.0)), d3 = normalize(vec2(1.0,-0.2)), d4 = normalize(vec2(-0.7,-0.7));
        g += d1 * cos(dot(p,d1)*0.11 + t*0.9) * 0.11*0.35;
        g += d2 * cos(dot(p,d2)*0.19 + t*1.3) * 0.19*0.2;
        g += d3 * cos(dot(p,d3)*0.37 + t*1.8) * 0.37*0.08;
        g += d4 * cos(dot(p,d4)*0.61 + t*2.3) * 0.61*0.045 * fade;
        float e = 0.6; vec2 q = p*0.45 + vec2(t*0.35, t*0.22);
        float n0 = vnoise(q), nx = vnoise(q+vec2(e,0.0)), nz = vnoise(q+vec2(0.0,e));
        g += vec2(nx-n0, nz-n0)/e*0.45*0.35*fade;
        // 细碎涟漪：两组反向滚动的高频噪声
        float f2 = fade * (1.0 - smoothstep(60.0, 260.0, length(cameraPosition.xz - p)));
        vec2 q2 = p * 1.7 + vec2(-t * 0.6, t * 0.45), q3 = p * 3.1 + vec2(t * 0.5, t * 0.8);
        float m0 = vnoise(q2), mx = vnoise(q2 + vec2(0.3, 0.0)), mz = vnoise(q2 + vec2(0.0, 0.3));
        float k0 = vnoise(q3), kx = vnoise(q3 + vec2(0.2, 0.0)), kz = vnoise(q3 + vec2(0.0, 0.2));
        g += (vec2(mx - m0, mz - m0) / 0.3 * 0.05 + vec2(kx - k0, kz - k0) / 0.2 * 0.022) * f2;
        return g*amp;
      }
      void main(){
        vec2 uv = (vW.xz - uGrid.xy + 0.5) / (uGrid.zw + 1.0);
        float inside = step(0.0,uv.x)*step(uv.x,1.0)*step(0.0,uv.y)*step(uv.y,1.0);
        vec4 dt = texture2D(uData, clamp(uv, 0.0, 1.0));
        float ground = mix(-40.0, dt.r, inside);
        float depth = max(uLevel - ground, 0.0);
        float shore = mix(60.0, dt.g, inside);
        float calm = dt.b * inside;
        vec3 V = normalize(cameraPosition - vW);
        float dist = length(cameraPosition - vW);
        if (!gl_FrontFacing) {                       // 水下仰视水面：明亮的波动光面
          float rip = vnoise(vW.xz * 0.6 + uTime * 0.4) * 0.6 + vnoise(vW.xz * 1.7 - uTime * 0.7) * 0.4;
          vec3 cu = mix(vec3(0.10, 0.36, 0.38), vec3(0.70, 0.90, 0.88), smoothstep(0.3, 0.95, rip) * exp(-dist * 0.04));
          // 生态水域：与场景雾相同的指数平方雾，并与 three.js 一样在色调映射之后混合，远处才能与海底、背景的雾色严丝合缝
          float uf = uUwE > 0.5 ? 0.0 : 1.0 - exp(-dist * uUwD);
          gl_FragColor = vec4(mix(cu, uUwC, uf), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          if (uUwE > 0.5) gl_FragColor.rgb = mix(gl_FragColor.rgb, uUwC, 1.0 - exp(-dist * dist * uUwD * uUwD));
          return;
        }
        float fade = 1.0 - smoothstep(250.0, 1200.0, dist);
        // 闸门为通透栅栏，闸内外海浪一致：浪高只在淡水湖减弱（calm 仅用于闸内港口水色）
        float amp = mix(1.0, 0.3, uFresh);
        vec2 gr = waveGrad(vW.xz, uTime, amp, fade);
        if (uFresh > 0.5) { float dp = length(vW.xz - uPlunge); gr += normalize(vW.xz - uPlunge + 1e-3) * sin(dp*2.2 - uTime*6.0) * 0.18 * exp(-dp*0.28); }
        // 近岸涌浪：沿离岸距离场的梯度（指向外海）朝岸推进，水越浅浪越陡（闸内同样涌进来）
        vec2 cellUV = 1.0 / (uGrid.zw + 1.0);
        vec2 sg = vec2(texture2D(uData, clamp(uv + vec2(cellUV.x, 0.0), 0.0, 1.0)).g - texture2D(uData, clamp(uv - vec2(cellUV.x, 0.0), 0.0, 1.0)).g,
                       texture2D(uData, clamp(uv + vec2(0.0, cellUV.y), 0.0, 1.0)).g - texture2D(uData, clamp(uv - vec2(0.0, cellUV.y), 0.0, 1.0)).g);
        vec2 toSea = length(sg) > 1e-4 ? normalize(sg) : vec2(0.0);
        float surfZone = smoothstep(28.0, 3.0, shore) * smoothstep(0.0, 1.2, shore) * inside * (1.0 - uFresh) * fade;
        float swPh = shore * 0.85 + uTime * 1.5 + vnoise(vW.xz * 0.05) * 4.0;
        float steep = mix(0.12, 0.32, smoothstep(12.0, 2.0, shore));
        gr += toSea * cos(swPh) * steep * surfZone;
        vec3 n = normalize(vec3(-gr.x, 1.0, -gr.y));
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
        vec3 R = reflect(-V, n);
        vec3 sky = mix(uHor, uZen, pow(clamp(R.y, 0.0, 1.0), 0.5));
        vec3 Rc = reflect(-V, normalize(mix(n, vec3(0.0, 1.0, 0.0), 0.9)));
        if (Rc.y > 0.02) { vec2 cq = vW.xz + Rc.xz / Rc.y * (${CLOUD.h.toFixed(1)} - vW.y); float cd = cloudDen(cq, uTime); sky = mix(sky, vec3(0.9,0.93,0.96), cd * 0.45 * smoothstep(0.05, 0.3, Rc.y)); }
        // 海：浅水青绿 → 深蓝；淡水湖：清澈见底的浅青绿；闸内港口整体偏绿松石
        vec3 shallow = mix(vec3(0.051, 0.445, 0.402), vec3(0.2, 0.46, 0.4), uFresh);
        vec3 mid = mix(vec3(0.013, 0.188, 0.305), vec3(0.08, 0.3, 0.26), uFresh);
        vec3 deep = mix(vec3(0.006, 0.058, 0.165), vec3(0.04, 0.17, 0.15), uFresh);
        shallow = mix(shallow, vec3(0.09, 0.62, 0.6), calm * 0.6 * (1.0 - uFresh)); mid = mix(mid, vec3(0.04, 0.42, 0.56), calm * 0.6 * (1.0 - uFresh));
        vec3 body = mix(shallow, mid, smoothstep(0.4, mix(7.0, 2.2, uFresh), depth));
        body = mix(body, deep, smoothstep(6.0, 30.0, depth) * (1.0 - uFresh));
        vec3 sand = mix(vec3(0.62, 0.54, 0.38), vec3(0.86, 0.85, 0.80), dt.a * inside * (1.0 - uFresh));   // 沙滩前的浅水透出白沙，其余岸边与淡水湖为沙褐色水底
        body = mix(sand * 0.8, body, smoothstep(0.0, 1.2, depth));
        float diff = max(dot(n, uSun), 0.0);
        float csh = cloudShadow(vW, uSun, uTime);
        vec3 col = body * (0.6 + 0.5 * diff) * (1.0 - 0.3 * csh);
        // 浪峰透光（次表面散射近似）：背光一侧浪面泛青绿
        float sss = pow(max(dot(V, -uSun + n * 0.6), 0.0), 3.0) * smoothstep(0.02, 0.12, length(gr));
        col += mix(vec3(0.05, 0.35, 0.3), vec3(0.06, 0.32, 0.26), uFresh) * sss * 0.35 * (1.0 - csh * 0.6);
        col = mix(col, sky, fres * 0.85);
        float sd = max(dot(R, uSun), 0.0);
        col += vec3(1.0, 0.95, 0.85) * (pow(sd, 700.0) * 7.0 + pow(sd, 80.0) * 0.18) * (1.0 - 0.85 * csh);
        // 浪花与岸线泡沫
        float nz1 = vnoise(vW.xz * 0.32 + vec2(uTime * 0.15, -uTime*0.1));
        float nz2 = vnoise(vW.xz * 1.1 - vec2(uTime * 0.3, 0.0));
        float edge = smoothstep(2.6, 0.2, shore + (nz1 - 0.5) * 2.5);
        // 浪带朝岸推进（相位随时间增加、浪峰向离岸距离减小的方向移动）；近岸涌浪浪峰处卷起白沫
        float bands = pow(0.5 + 0.5 * sin(shore * 1.15 + uTime * 1.4 + nz1 * 5.0), 7.0) * smoothstep(12.0, 2.0, shore);
        // 浪只在浅滩上破碎：浪峰白沫随水深渐隐（码头墙、深水岸边不起沫）
        float crest = pow(0.5 + 0.5 * sin(swPh + 1.2), 6.0) * smoothstep(10.0, 1.2, shore) * surfZone * smoothstep(2.5, 0.3, depth);
        float foam = (edge * 0.8 + bands * 0.55) * smoothstep(0.25, 0.65, nz2 + edge * 0.4);
        foam += crest * smoothstep(0.2, 0.6, nz2 * 0.7 + nz1 * 0.5);
        if (uFresh > 0.5) { float dp = length(vW.xz - uPlunge); foam = smoothstep(4.5, 0.5, dp + (nz2-0.5)*2.5) * 0.9 + smoothstep(0.35, 0.0, depth) * 0.25; }
        col = mix(col, vec3(0.9, 0.94, 0.95), clamp(foam, 0.0, 0.9));
        float ff = 1.0 - exp(-uFogD * uFogD * dist * dist);
        col = mix(col, uFog, ff);
        // 浅水半透明：可见水底（沙、礁石、焦散），深水不透明；掠射角由菲涅尔接管
        float alpha = mix(mix(0.2, 0.14, uFresh), 1.0, smoothstep(0.15, 14.0, depth));   // 三个水域都清澈：14 m 以内能透过水面看到水底
        alpha = max(alpha, fres * 0.95); alpha = max(alpha, clamp(foam, 0.0, 1.0));
        alpha = mix(alpha, 1.0, ff);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}
function buildWater(X, dataTex, QS = {}) {
  const group = new THREE.Group(), mats = [];
  const seaMat = makeWaterMaterial(dataTex, { level: 0, clouds: QS.clouds }); mats.push(seaMat);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000, 120, 120), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.y = 0; group.add(sea);
  // 淡水湖与山顶小湖：用略大的椭圆面片（地形遮挡岸线以外部分）
  for (const lk of [L.lake, L.upperLake]) {
    const m = makeWaterMaterial(dataTex, { level: lk.level, fresh: true, clouds: QS.clouds }); mats.push(m);
    const geo = new THREE.CircleGeometry(1, 48); geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, m); mesh.scale.set(lk.a * 1.35, 1, lk.b * 1.45); mesh.position.set(lk.x, lk.level, lk.z);
    mesh.receiveShadow = false; group.add(mesh);
  }
  // 瀑布水幕
  const lip = FALL.lip, pl = FALL.plunge, segs = 40, pts = [];
  const dir = new THREE.Vector2(pl.x - lip.x, pl.z - lip.z); const hd = dir.length(); dir.normalize();
  const drop = lip.y - pl.y, tFall = Math.sqrt(2 * drop / 9.8), v0 = hd / tFall;
  for (let s = 0; s <= segs; s++) {
    const t = (s / segs) * tFall, h = Math.min(v0 * t, hd), y = lip.y - 0.5 * 9.8 * t * t;
    pts.push(new THREE.Vector3(lip.x + dir.x * h, y, lip.z + dir.y * h));
  }
  pts.unshift(new THREE.Vector3(FALL.src.x, lip.y + 0.25, FALL.src.z));
  const side = new THREE.Vector3(-dir.y, 0, dir.x);
  const fpos = [], fuv = [], fidx = [];
  for (let s = 0; s < pts.length; s++) {
    const p = pts[s], v = s / (pts.length - 1), w = lerp(2.2, 4.2, v) * 0.5;
    for (const u of [0, 1]) { const q = p.clone().addScaledVector(side, (u * 2 - 1) * w); fpos.push(q.x, q.y, q.z); fuv.push(u, v * drop / 6); }
    if (s < pts.length - 1) { const a = s * 2; fidx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(fuv, 2)); fg.setIndex(fidx); fg.computeVertexNormals();
  const fallMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv; ${GLSL_NOISE}
      void main(){ float u = vUv.x, v = vUv.y;
        float s = fbm3(vec2(u*7.0, v*2.2 - uTime*2.8)); float s2 = vnoise(vec2(u*21.0, v*5.0 - uTime*4.0));
        float edge = smoothstep(0.0, 0.18, u) * smoothstep(1.0, 0.82, u);
        float a = edge * (0.55 + 0.45*s) * (0.75 + 0.25*s2);
        vec3 c = mix(vec3(0.62,0.74,0.76), vec3(0.97,0.99,1.0), smoothstep(0.35, 0.8, s));
        gl_FragColor = vec4(c, a*0.92);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  mats.push(fallMat);
  const fall = new THREE.Mesh(fg, fallMat); fall.renderOrder = 3; group.add(fall);
  // 落水雾气
  const mistMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(0.0,0.0,0.0,1.0); mv.xy += position.xy; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv; ${GLSL_NOISE}
      void main(){ vec2 p = vUv*2.0-1.0; float r = length(p); float n = fbm3(vUv*3.0 + vec2(0.0,-uTime*0.4));
        float a = smoothstep(1.0, 0.1, r) * (0.35 + 0.45*n); gl_FragColor = vec4(vec3(0.95,0.97,0.98), a*0.55);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  mats.push(mistMat);
  const mist = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), mistMat); mist.position.set(pl.x - 0.5, pl.y + 2.4, pl.z); mist.renderOrder = 4; group.add(mist);
  // ---- 瀑布拟真：更多雾团 + 下落水滴粒子 + 落水点飞溅 ----
  for (const [dx, dy, dz, w, h] of [[1.5, 1.2, 1.8, 7, 4], [-2, 3.6, -1.5, 11, 6], [0.5, 6, 0.5, 8, 5]]) { const m2 = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mistMat); m2.position.set(pl.x + dx, pl.y + dy, pl.z + dz); m2.renderOrder = 4; group.add(m2); }
  {
    const uT = { value: 0 }; TIME_U.push(uT);
    const mkPts = (n, vs) => { const g = new THREE.BufferGeometry(), a = new Float32Array(n * 4), R = mulberry32(n * 7 + 3); for (let i = 0; i < n; i++) { a[i * 4] = R(); a[i * 4 + 1] = R() - 0.5; a[i * 4 + 2] = R(); a[i * 4 + 3] = R(); } g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('seed', new THREE.BufferAttribute(a, 4)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(pl.x, pl.y + 8, pl.z), 40);
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: uT }, vertexShader: vs,
        fragmentShader: 'varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25) discard; gl_FragColor = vec4(vec3(0.93, 0.97, 1.0), vA * (1.0 - d * 4.0)); }' });
      const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 5; group.add(p); };
    const L0 = `vec3(${lip.x.toFixed(2)}, ${lip.y.toFixed(2)}, ${lip.z.toFixed(2)})`, D0 = `vec2(${dir.x.toFixed(4)}, ${dir.y.toFixed(4)})`, SIDE = `vec2(${(-dir.y).toFixed(4)}, ${dir.x.toFixed(4)})`;
    // 下落水滴：沿水幕抛物线，横向随下落逐渐散开
    mkPts(1400, `attribute vec4 seed; uniform float uTime; varying float vA;
      void main(){ float T = ${tFall.toFixed(3)}; float ph = fract(seed.x + uTime / (T * (0.9 + seed.z * 0.3))); float t = ph * T;
        float h = min(${v0.toFixed(3)} * t * (0.85 + seed.w * 0.3), ${hd.toFixed(2)} + 1.5);
        vec3 p = ${L0} + vec3(${D0}.x * h, -4.9 * t * t, ${D0}.y * h) + vec3(${SIDE}.x, 0.0, ${SIDE}.y) * seed.y * (2.4 + ph * 3.0) + vec3(0.0, 0.0, 0.0);
        vA = 0.55 * smoothstep(0.0, 0.08, ph) * (1.0 - smoothstep(0.85, 1.0, ph));
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (0.07 + seed.z * 0.08) * 800.0 / -mv.z; }`);
    // 落水点飞溅：向上抛出后回落
    mkPts(700, `attribute vec4 seed; uniform float uTime; varying float vA;
      void main(){ float life = 1.1 + seed.z * 0.9; float ph = fract(seed.x + uTime / life); float t = ph * life;
        float a = seed.y * 6.2831, sp = 1.2 + seed.w * 3.5, up = 3.0 + seed.z * 4.0;
        vec3 p = vec3(${pl.x.toFixed(2)}, ${pl.y.toFixed(2)}, ${pl.z.toFixed(2)}) + vec3(cos(a) * sp * t, up * t - 4.9 * t * t, sin(a) * sp * t);
        p.y = max(p.y, ${pl.y.toFixed(2)});
        vA = 0.5 * (1.0 - ph);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (0.08 + seed.w * 0.1) * 800.0 / -mv.z; }`);
  }
  return { group, mats };
}
