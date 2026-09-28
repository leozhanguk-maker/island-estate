// ======================= 06d 别墅书房：用户提供的 Blender 桌椅模型（mac_desk_claude.glb） =======================
// 原始文件 55 MB（约 79 万三角面、126 张贴图）。处理（工具在仓库外，见 docs/ASSETS.md）：去掉摄影棚道具（墙地、反光板、书架、目标点）、
// 悬空的 USB-C 小件、原点处的键帽模板与重复桌腿；8 个脚垫原先都堆在原点，移到各自的桌腿、椅腿下；玻璃透射材质改为普通半透明
// （透射要把整个场景额外渲染一遍）；网格简化到约 23 万三角面、贴图缩到 512、转 WebP、meshopt 压缩，得到 assets/mac_desk.glb（约 5 MB），
// 构建时以 base64 内嵌为 ASSET_DESK_GLB。
// 模型坐标：y 向上，桌面 x -1.6～0.8、z ±0.375、高 0.72，椅子在 +z 一侧面朝桌子（-z）；原点在地面。
// 摆放：别墅三层书房北侧，桌子背靠北面落地窗（与原书桌同位），整张桌子中心在别墅局部 (2.5, F2, -3.6)。
const DESK = { at: { x: 180 + 2.9, y: 11.35 + 7.45, z: -46 - 3.6 }, chair: { x: 0.05, z: 0.76 }, loaded: false, group: null };
async function loadDeskModel(scene) {
  const bin = Uint8Array.from(atob(ASSET_DESK_GLB), c => c.charCodeAt(0)).buffer;
  const loader = new THREE.GLTFLoader().setMeshoptDecoder(THREE.MeshoptDecoder);
  const gltf = await new Promise((res, rej) => loader.parse(bin, '', res, rej));
  const g = gltf.scene; g.position.set(DESK.at.x, DESK.at.y, DESK.at.z);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g); g.updateMatrixWorld(true); DESK.group = g; DESK.loaded = true;
  return g;
}
// 加载失败（浏览器不支持 WebP 等）时退回原先的程序化书桌、iMac 与办公椅，保证书房不空
function deskFallback(scene) {
  const g = new THREE.Group(); g.position.set(180, 11.35, -46); scene.add(g);
  tableF(g, 2.5, 7.45, -3.6, 0, 1.6, 0.8, 0.75, M.woodDark, M.metalDark); imacF(g, 2.5, 7.45 + 0.75, -3.72, 0); officeChairF(g, 2.5, 7.45, -2.85, Math.PI);
  return g;
}
