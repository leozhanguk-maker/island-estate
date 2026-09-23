// ======================= 12 近景草叶（仅漫游模式） =======================
function grassClumpGeo(nBlades = 8) {
  const pos = [], col = [], nrm = [], idx = []; const R = mulberry32(8080);
  for (let b = 0; b < nBlades; b++) {
    const a = R() * TAU, ox = (R() - 0.5) * 0.45, oz = (R() - 0.5) * 0.45, h = 0.55 + R() * 0.45, w = 0.022 + R() * 0.014, lean = (R() - 0.2) * 0.3;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, base = pos.length / 3;
    [0, 0.55, 1].forEach((t, i) => {
      const y = t * h, bend = lean * t * t, ww = w * (1 - t * 0.8), cx = ox + dx * bend, cz = oz + dz * bend;
      const c = [0.5 + 0.55 * t, 0.56 + 0.52 * t, 0.42 + 0.4 * t];
      if (i < 2) { pos.push(cx - px * ww, y, cz - pz * ww, cx + px * ww, y, cz + pz * ww); col.push(...c, ...c); nrm.push(0, 1, 0, 0, 1, 0); }
      else { pos.push(cx, y, cz); col.push(...c); nrm.push(0, 1, 0); }
    });
    idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3, base + 2, base + 4, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setIndex(idx);
  return g;
}
function buildGrass(X, GR, QS, scene) {
  if (!QS.grassR) return null;
  const RAD = QS.grassR, CELL = 0.62, MAX = 22000;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
  const uT = { value: 0 }; TIME_U.push(uT);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 ip = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
        float hh = position.y * position.y;
        float wv = sin(uTime * 1.6 + ip.x * 0.35 + ip.z * 0.21) * 0.6 + sin(uTime * 3.1 + ip.x * 1.3) * 0.25;
        transformed.x += wv * 0.12 * hh; transformed.z += wv * 0.07 * hh;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
  };
  const im = new THREE.InstancedMesh(grassClumpGeo(), mat, MAX);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  im.setColorAt(0, new THREE.Color()); im.instanceColor.setUsage(THREE.DynamicDrawUsage);
  im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; im.visible = false; im.count = 0;
  scene.add(im);
  const M = GR.matMap, gd = GR.ground, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler();
  const matAt = (x, z) => { const px = Math.floor((x - TX.x0) * M.w / TX.w), pz = Math.floor((z - TX.z0) * M.w / TX.w); if (px < 0 || pz < 0 || px >= M.w || pz >= M.h) return 0; return M.data[(pz * M.w + px) * 4] / 255; };
  const colAt = (x, z) => { const S = gd.w / TX.w, px = Math.floor((x - TX.x0) * S), pz = Math.floor((z - TX.z0) * S); const o = (clamp(pz, 0, gd.h - 1) * gd.w + clamp(px, 0, gd.w - 1)) * 4; return [gd.data[o] / 255, gd.data[o + 1] / 255, gd.data[o + 2] / 255]; };
  let cx = 1e9, cz = 1e9;
  function rebuild(px, pz) {
    cx = px; cz = pz; let n = 0;
    const i0 = Math.floor((px - RAD) / CELL), i1 = Math.floor((px + RAD) / CELL), j0 = Math.floor((pz - RAD) / CELL), j1 = Math.floor((pz + RAD) / CELL);
    for (let j = j0; j <= j1 && n < MAX; j++) for (let i = i0; i <= i1 && n < MAX; i++) {
      const r1 = phash(i, j, 1 << 20, 3), r2 = phash(i, j, 1 << 20, 4), r3 = phash(i, j, 1 << 20, 5);
      const x = (i + r1) * CELL, z = (j + r2) * CELL, d = Math.hypot(x - px, z - pz); if (d > RAD) continue;
      const w = matAt(x, z); if (w < 0.7 || r3 > (w - 0.55) * 2.2) continue;     // 修剪草坪（0.5）不生长长草
      if (phash(i, j, 1 << 20, 6) > 1 - 0.75 * smoothstep(12, RAD, d)) continue;  // 远处稀疏
      const k = Math.round(clamp(z - G.z0, 0, G.nz - 1)) * G.nx + Math.round(clamp(x - G.x0, 0, G.nx - 1));
      if (X.normals[k * 3 + 1] < 0.82 || X.roads.dist[k] < 0.6) continue;
      const y = sampleGrid(X.H, x, z); if (y < 0.4) continue;
      const edge = smoothstep(RAD, RAD - 10, d), tall = (w > 0.9 ? 0.62 : 0.38) * (0.65 + 0.6 * r3);
      e.set(0, r1 * TAU * 7, 0); q.setFromEuler(e); sc.set(0.8 + r2 * 0.5, tall * edge, 0.8 + r2 * 0.5);
      m4.compose(ps.set(x, y - 0.02, z), q, sc); im.setMatrixAt(n, m4);
      const c = colAt(x, z); col.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace).multiplyScalar(0.95 + r3 * 0.25); im.setColorAt(n, col);
      n++;
    }
    im.count = n; im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
  }
  return {
    mesh: im,
    update(fp) {
      im.visible = fp.on; if (!fp.on) return;
      const p = fp.pos; if (Math.hypot(p.x - cx, p.z - cz) > 7) rebuild(p.x, p.z);
    }
  };
}
