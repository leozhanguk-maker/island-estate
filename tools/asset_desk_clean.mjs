// 清理：去掉摄影棚道具（墙地、反光板、书架、目标点）、悬空的 USB-C、原点处的键帽模板与重复桌腿；脚垫移到各自桌腿/椅腿下
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const drop = [/^Room_/, /^Refl_/, /^Shelf_/, /^PanTarget/, /^KB_USBC$/, /^KeyCap_Tpl$/, /^Desk_Leg_\d\.001$/];
let n = 0;
for (const node of doc.getRoot().listNodes()) if (drop.some(r => r.test(node.getName()))) { node.dispose(); n++; }
const pads = { Desk_FootPad_0: [0.7205, 0.3005], Desk_FootPad_1: [0.7205, -0.3005], Desk_FootPad_2: [-1.4405, 0.3005], Desk_FootPad_3: [-1.4405, -0.3005],
  Chair_FootPad_0: [-0.14, 0.56], Chair_FootPad_1: [0.24, 0.56], Chair_FootPad_2: [-0.14, 0.96], Chair_FootPad_3: [0.24, 0.96] };
for (const node of doc.getRoot().listNodes()) { const p = pads[node.getName()]; if (p) { const t = node.getTranslation(); node.setTranslation([p[0], t[1], p[1]]); } }
// 透射材质（玻璃）改为普通半透明：透射需要整场景额外渲染一遍，且会影响岛上其它物体的画面
for (const m of doc.getRoot().listMaterials()) { const tr = m.getExtension('KHR_materials_transmission'); if (tr) { const f = tr.getTransmissionFactor(); m.setExtension('KHR_materials_transmission', null); if (f > 0) { m.setAlphaMode('BLEND'); const c = m.getBaseColorFactor(); m.setBaseColorFactor([c[0], c[1], c[2], Math.min(c[3], 1 - 0.8 * f)]); } } }
await doc.transform(prune());
await io.write(process.argv[3], doc);
console.log('删除节点', n);
