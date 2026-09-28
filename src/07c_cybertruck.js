// ======================= 07c Cybertruck 外观：用户提供的 GLB 模型（cybertruck_cybertruck_googlepoly.glb） =======================
// 原始文件约 1 MB；焊接顶点后 meshopt 压缩为 assets/cybertruck.glb（约 340 KB），构建时以 base64 内嵌为 ASSET_CT_GLB。
// 模型只有外壳（单面、无座椅与内饰），所以只替换车外观；驾驶位视角仍用 buildCybertruck() 里的程序化座舱。
// 模型坐标：y 向上，车头朝 -z，横向为 x；车身 x -2.46～6.23、z -9.92～8.17，四个车轮是 Sphere.001～.004 节点（轮胎 + 轮毂两个材质）。
// 换算到车辆局部坐标（x 向前、z 横向、y 向上、原点在四轮中心的地面）：
//   纵向按实车长 5.683 m 等比缩放（高度同比例，保留模型原有造型），横向缩到 0.25（车身宽约 2.17 m，与实车 2.03 m + 门把手相近）；
//   车轮从模型里拆出，按车轮半径 0.445 m 等比放大后挂进原有的转向/滚动节点，驾驶时照常滚动、转向。
const CT_GLB = { lat: 0.25, rWheel: 0.445, car: null };
// meshopt 压缩后顶点是归一化 Int16（KHR_mesh_quantization，反量化缩放放在节点矩阵里），直接 applyMatrix4 会被截断到 ±1；
// 先复制成 Float32 再烘焙变换
function ctFloatGeo(src) {
  const g = src.clone();
  for (const k of ['position', 'normal', 'tangent']) {
    const a = g.getAttribute(k); if (!a) continue;
    const f = new Float32Array(a.count * a.itemSize), get = ['getX', 'getY', 'getZ', 'getW'];   // getX 等会按 normalized 反量化（含交错缓冲）
    for (let i = 0; i < a.count; i++) for (let j = 0; j < a.itemSize; j++) f[i * a.itemSize + j] = a[get[j]](i);
    g.setAttribute(k, new THREE.BufferAttribute(f, a.itemSize));
  }
  return g;
}
async function loadCybertruckModel(C) {
  const ud = C.userData;
  const bin = Uint8Array.from(atob(ASSET_CT_GLB), c => c.charCodeAt(0)).buffer;
  const loader = new THREE.GLTFLoader().setMeshoptDecoder(THREE.MeshoptDecoder);
  const gltf = await new Promise((res, rej) => loader.parse(bin, '', res, rej));
  const src = gltf.scene; src.updateMatrixWorld(true);
  // 材质修正：模型里所有材质都是金属度 0.4、粗糙度 0.2 左右，黑色轮胎在场景环境光下反射天空发灰；
  // 轮胎改橡胶、轮毂盖改哑光金属（与原程序化车轮一致），前灯带（Material.005）与尾灯（Material.004）自发光
  const fix = { tire: () => std(0x1a1a1a, 0.9, 0), plates: () => std(0x2a2c2f, 0.45, 0.6),
    'Material.005': () => std(0xffffff, 0.3, 0, { emissive: 0xf4f6ff, emissiveIntensity: 1.6 }), 'Material.004': () => std(0xb81c1c, 0.4, 0, { emissive: 0x9a0f0f, emissiveIntensity: 1.2 }) };
  const fixed = {};
  src.traverse(o => { if (o.isMesh && fix[o.material.name]) o.material = fixed[o.material.name] || (fixed[o.material.name] = fix[o.material.name]()); });
  // 1. 找出车身（Cube）与四个车轮节点，量出车身包围盒与各车轮中心（模型坐标）
  const cube = src.getObjectByName('Cube'), hits = [];
  src.traverse(o => { if (/^Sphere/.test(o.name)) hits.push(o); });
  const wheelNodes = hits.filter(o => !hits.includes(o.parent));                // 多材质网格会拆成同名前缀的子网格，只取最外层节点
  if (!cube) throw new Error('Cybertruck 模型缺少车身节点 Cube');
  const bodyBox = new THREE.Box3().setFromObject(cube);                        // 只量车身，不含后视镜与车轮
  if (wheelNodes.length !== 4) throw new Error('Cybertruck 模型车轮节点数不是 4：' + wheelNodes.length);
  const wheels = wheelNodes.map(n => { const b = new THREE.Box3().setFromObject(n); return { n, c: b.getCenter(new THREE.Vector3()), size: b.getSize(new THREE.Vector3()) }; });
  const kLen = ud.spec.L / (bodyBox.max.z - bodyBox.min.z);                  // 纵向（及高度）缩放
  const cz = (bodyBox.max.z + bodyBox.min.z) / 2, cx = (bodyBox.max.x + bodyBox.min.x) / 2;
  const wy = wheels.reduce((s, w) => s + w.c.y, 0) / 4, wr = wheels.reduce((s, w) => s + w.size.y, 0) / 8;
  const wz = wheels.reduce((s, w) => s + w.c.z, 0) / 4;                        // 前后轴中点（模型坐标）
  // 模型坐标 → 车辆局部坐标：x_car = -(z - wz)·kLen，z_car = (x - cx)·lat，y_car = (y - wy)·kLen + 0.445（车轮中心高度对齐）
  const W = new THREE.Group(); W.rotation.y = -Math.PI / 2; W.scale.set(CT_GLB.lat, kLen, kLen);
  src.position.set(-cx, -wy + CT_GLB.rWheel / kLen, -wz); W.add(src);
  // 2. 车轮：拆下后烘焙到以轮心为原点的几何体（clone 后再变换，不动原几何体），按轮胎半径等比放大
  const kW = CT_GLB.rWheel / wr;
  for (const w of wheels) {
    const front = w.c.z < wz, side = w.c.x < cx ? -1 : 1;                    // 模型车头朝 -z；模型 x 小的一侧对应车辆 z 负侧
    const slot = ud.wheels.find(s => s.front === front && Math.sign(s.piv.position.z) === side);
    const inv = new THREE.Matrix4().makeTranslation(-w.c.x, -w.c.y, -w.c.z);
    const g = new THREE.Group(); g.rotation.y = -Math.PI / 2; g.scale.set(CT_GLB.lat, kW, kW);
    w.n.updateMatrixWorld(true);
    w.n.traverse(o => { if (!o.isMesh) return; const m = new THREE.Mesh(ctFloatGeo(o.geometry).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)), o.material); g.add(m); });
    w.n.removeFromParent();
    slot.spin.clear(); slot.spin.add(g);
    slot.piv.position.set(-(w.c.z - wz) * kLen, CT_GLB.rWheel, (w.c.x - cx) * CT_GLB.lat);   // 轮心挪到模型轮拱正中
  }
  // 3. 车身：程序化外壳整组换成模型（座舱 cab 不动，驾驶位视角照旧）
  ud.body.clear(); ud.body.add(W);
  C.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  C.updateMatrixWorld(true);
  ud.glb = true; CT_GLB.car = C;
  return C;
}
