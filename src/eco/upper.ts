// ======================= 17g 水域生态·瀑布上方的小水池（热带淡水，参照 17b 淡水湖的水族馆式布置） =======================
// @ts-nocheck —— 由拼接式全局脚本机械转换而来，类型尚未补齐（逐文件移除此行并补类型）
import { THREE } from '../three';
import { L } from '../core/layout';
import { ECO, ECO_R, EcoFlock, EcoLod, ecoFishLod, ecoMat, ecoMerge, ecoMix, ecoRand, ecoBuildLog } from './core';
import { TAU, clamp } from '../core/util';
import { lakeSD } from '../terrain/terrain';
import { gh } from '../structures/villa';
import { EcoCritters, ecoCrawl, ecoCrustGeo, ecoDepAttr, ecoPlayerNear, ecoRibbon, ecoWhorlPlant } from './lake';
// 小水池（L.upperLake，约 15 × 10 m、最深约 2.2 m）：湖底铺满沉水草与前景草坪；小鱼、小虾体型为下方淡水湖同种的一半
// 水域键名 'upper'（'pool' 已用于别墅泳池的水下判定）
export function ecoUpperPoint(inside, depth, tries = 60) {
  const lk = L.upperLake;
  for (let k = 0; k < tries; k++) {
    const a = ECO_R() * TAU, r = Math.sqrt(ECO_R()) * 1.1, x = lk.x + Math.cos(a) * lk.a * r, z = lk.z + Math.sin(a) * lk.b * r;
    const sd = lakeSD(x, z, lk, 0.12), d = lk.level - gh(x, z);
    if (sd >= inside[0] && sd <= inside[1] && d >= depth[0] && d <= depth[1]) return { x, z, d, y: gh(x, z) };
  }
  return null;
}
export function buildEcoUpper(scene) {
  ecoBuildLog('build', 'upper');
  const lk = L.upperLake, Z = { center: { x: lk.x, z: lk.z }, radius: 9, view: 60, meshes: [], lods: [] }, c0 = ECO.critters.length;
  const inUp = (x, z, d0 = 0.12) => lakeSD(x, z, lk, 0.12) > 0.25 && lk.level - gh(x, z) > d0;
  // ---------------- 水草：沉水草丛铺满池底，丛间铺前景草坪（与淡水湖同种，按池子大小减量） ----------------
  const plants = [], weedSpots = [], add = (list, d) => { for (const g of list) plants.push(ecoDepAttr(g, Math.max(0, d))); };
  // 池边挺水：几丛香蒲与芦苇
  for (let c = 0; c < 6; c++) {
    const p = ecoUpperPoint([-0.3, 0.7], [-0.3, 0.4]); if (!p) continue;
    for (let k = 0; k < 6; k++) { const x = p.x + ecoRand(-0.3, 0.3), z = p.z + ecoRand(-0.3, 0.3), y = gh(x, z), h = ecoRand(0.9, 1.5), list = [];
      for (let l = 0; l < 4; l++) list.push(ecoRibbon(x, y, z, h * ecoRand(0.8, 1.05), 0.026, ECO_R() * TAU, 0.35, 0x5f7a36, 4)); add(list, p.d); }
  }
  const kinds = ['vall', 'vall', 'horn', 'hydr', 'myri', 'vall', 'horn', 'myri', 'hydr', 'vall'];
  for (let c = 0; c < 28; c++) {
    const kind = kinds[c % kinds.length], p = ecoUpperPoint([0.6, 99], [0.35, 2.4]); if (!p) continue;
    const rad = ecoRand(0.6, 1.3), cnt = kind === 'vall' ? 34 : 8; weedSpots.push({ x: p.x, y: p.y + Math.min(p.d, 1) * 0.5, z: p.z, r: rad, kind });
    for (let k = 0; k < cnt; k++) {
      const a = ECO_R() * TAU, rr = Math.sqrt(ECO_R()) * rad, x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr, y = gh(x, z), d = lk.level - y; if (d < 0.3 || lakeSD(x, z, lk, 0.12) < 0.4) continue;
      const hmax = Math.max(0.15, d - 0.08);
      if (kind === 'vall') { const list = []; for (let l = 0; l < 6; l++) list.push(ecoRibbon(x, y, z, Math.min(hmax, ecoRand(0.4, 1.1)), 0.011, ECO_R() * TAU, 0.35, ecoMix(0x4f8a2a, 0x7aa84a, ECO_R()), 6)); add(list, d); }
      else if (kind === 'horn') add(ecoWhorlPlant(x, y, z, Math.min(hmax, ecoRand(0.3, 0.7)), 7, 8, 0.045, 0.0025, 0x2f4a1e, 0x2a4f1c, null, true), d);
      else if (kind === 'hydr') add(ecoWhorlPlant(x, y, z, Math.min(hmax, ecoRand(0.3, 0.6)), 8, 5, 0.02, 0.004, 0x3a5a22, 0x4f8a2e, null, false), d);
      else add(ecoWhorlPlant(x, y, z, Math.min(hmax, ecoRand(0.3, 0.8)), 7, 5, 0.04, 0.0022, 0x4a5a26, 0x4a7a2e, 0x8a3a2a, true), d);
    }
  }
  for (const w of weedSpots) if (w.kind !== 'vall') for (let k = 0; k < 12; k++) {   // 轮生叶水草丛之间补种苦草，连成一片
    const a = ECO_R() * TAU, rr = Math.sqrt(ECO_R()) * w.r * 1.2, x = w.x + Math.cos(a) * rr, z = w.z + Math.sin(a) * rr, y = gh(x, z), d = lk.level - y; if (d < 0.3 || lakeSD(x, z, lk, 0.12) < 0.4) continue;
    const list = []; for (let l = 0; l < 5; l++) list.push(ecoRibbon(x, y, z, Math.min(Math.max(0.15, d - 0.08), ecoRand(0.3, 0.9)), 0.01, ECO_R() * TAU, 0.35, ecoMix(0x4f8a2a, 0x7aa84a, ECO_R()), 5)); add(list, d);
  }
  for (let i = 0; i < 2800; i++) {                                           // 前景草坪
    const p = ecoUpperPoint([0.4, 99], [0.25, 2.4], 8); if (!p) continue; const n = 3 + Math.floor(ECO_R() * 3), list = [];
    for (let k = 0; k < n; k++) list.push(ecoRibbon(p.x + ecoRand(-0.04, 0.04), p.y, p.z + ecoRand(-0.04, 0.04), ecoRand(0.05, 0.12), 0.006, ECO_R() * TAU, 0.5, ecoMix(0x4f9a30, 0x86c050, ECO_R()), 2));
    add(list, p.d);
  }
  // 池底水草只在相机离池心 30 m 以内显示（远处、水面以上看不清池底），控制面数
  const plantMesh = new THREE.Mesh(ecoMerge(plants), ecoMat('sway', { freq: 1.1, amp: 0.09, depthFade: 0.6, rough: 0.7, side: THREE.DoubleSide }));
  plantMesh.frustumCulled = true; plantMesh.visible = false; scene.add(plantMesh);
  Z.update = () => { const c = ECO.cam; plantMesh.visible = !!c && Math.hypot(c.x - lk.x, c.z - lk.z) < 30; };
  ECO.upperNear = plantMesh;

  // ---------------- 小虾：罗氏沼虾与小龙虾，体型为淡水湖同种的一半 ----------------
  const prawn = (male, lo) => ecoCrustGeo({ len: 0.085, c1: 0x5f8aa8, c2: 0x9ac0d8, claw: male ? { arm: 0.9, r: 0.009, palm: 0.28, col: 0x1f4fd0 } : { arm: 0.3, r: 0.007, palm: 0.1, col: 0x5f8aa8 }, antenna: 1.8, h: 0.05, w: 0.045, rostrum: true, curl: -0.12, antCol: 0x7a9ab8 }, lo);
  const pMat = ecoMat('crawl', { freq: 8, amp: 0.0015, rough: 0.25, metal: 0.1, opacity: 0.82 }), prawns = [];
  for (const male of [true, false]) {
    const lod = new EcoLod(scene, [prawn(male, false), prawn(male, true)], pMat, 6, 8, 35), list = [];
    for (let i = 0; i < 6; i++) { const p = ecoUpperPoint([0.6, 99], [0.4, 2.3]); if (!p) continue; list.push({ x: p.x, z: p.z, y: p.y, yaw: ECO_R() * TAU, s: male ? ecoRand(1, 1.2) : ecoRand(0.8, 0.95), ph: ECO_R(), state: 'idle', tm: ecoRand(0, 6), hop: 0 }); }
    new EcoCritters(lod, list, (c, dt) => {
      if (c.hop > 0) { c.hop -= dt; c.x += Math.cos(c.yaw) * 0.15 * dt; c.z -= Math.sin(c.yaw) * 0.15 * dt; if (!inUp(c.x, c.z, 0.4)) c.yaw += Math.PI; c.y = gh(c.x, c.z) + 0.12 * Math.sin(Math.PI * clamp(c.hop / 2.2, 0, 1)); return; }
      if (c.state === 'walk' && ECO_R() < dt * 0.05) { c.hop = 2.2; return; }
      if (ecoPlayerNear(c, 1.0) && c.hop <= 0) { c.yaw += Math.PI; c.hop = 1.2; return; }
      ecoCrawl(c, dt, 0.025, (cc) => { const x = cc.x + ecoRand(-0.5, 0.5), z = cc.z + ecoRand(-0.5, 0.5); return inUp(x, z, 0.4) ? { x, z } : null; }); c.y = gh(c.x, c.z);
    });
    prawns.push(...list);
  }
  const cray = ecoCrustGeo.bind(null, { len: 0.055, c1: 0x6a1a12, c2: 0x9a2a18, claw: { arm: 0.28, r: 0.0175, palm: 0.16, col: 0x7a1c12 }, antenna: 1.3, h: 0.06, w: 0.07, band: 0x3a0e08 });
  const crayLod = new EcoLod(scene, [cray(false), cray(true)], ecoMat('crawl', { freq: 9, amp: 0.002, rough: 0.5 }), 6, 8, 35), crays = [];
  for (let i = 0; i < 40 && crays.length < 6 && weedSpots.length; i++) { const h = weedSpots[Math.floor(ECO_R() * weedSpots.length)], x = h.x + ecoRand(-0.2, 0.2), z = h.z + ecoRand(-0.2, 0.2); if (!inUp(x, z)) continue; crays.push({ x, z, y: gh(x, z), yaw: ECO_R() * TAU, s: ecoRand(0.8, 1.2), ph: ECO_R(), state: 'idle', tm: ecoRand(0, 8), home: h, flee: 0, pitch: 0 }); }
  new EcoCritters(crayLod, crays, (c, dt) => {
    if (c.flee > 0) { c.flee -= dt; const sp = 1.2 * c.flee / 0.35; c.x -= Math.cos(c.yaw) * sp * dt; c.z += Math.sin(c.yaw) * sp * dt; c.pitch = 0.5 * Math.sin(Math.PI * c.flee / 0.35); if (!inUp(c.x, c.z)) { c.x += Math.cos(c.yaw) * sp * dt; c.z -= Math.sin(c.yaw) * sp * dt; } c.y = gh(c.x, c.z); return; }
    if (ecoPlayerNear(c, 1.0)) { c.flee = 0.35; return; }
    ecoCrawl(c, dt, 0.03, (cc) => { const x = cc.home.x + ecoRand(-0.4, 0.4), z = cc.home.z + ecoRand(-0.4, 0.4); return inUp(x, z) ? { x, z } : null; }); c.y = gh(c.x, c.z);
  });
  // ---------------- 小鱼：鲫鱼与罗非鱼幼鱼，体长为淡水湖的一半，在水草丛间游动 ----------------
  const crucian = { len: 0.085, h: 0.035, w: 0.015, c1: 0x5f6a4a, c2: 0xc9c6a6, fin: 0x6a6a52, tail: 'fork', dorsal: 0.3, pat: (t, a, c) => { if (Math.sin(a) > -0.2) c.lerp(new THREE.Color(0x8a7a4a), 0.25); } };
  const tilapia = { len: 0.11, h: 0.0425, w: 0.0175, c1: 0x5a6250, c2: 0xb9b8a0, fin: 0x5a5a4a, tail: 'round', dorsal: 0.45, pat: (t, a, c) => { if (Math.sin(t * 18) > 0.75 && Math.sin(a) > -0.4) c.multiplyScalar(0.72); } };
  const predU = () => { const p = ECO.player; return p && p.under ? [{ x: p.x, y: p.y, z: p.z, r: 1.6 }] : []; };
  const anchors = weedSpots.map(w => ({ x: w.x, y: Math.min(w.y + 0.25, lk.level - 0.35), z: w.z }));
  const f1 = new EcoFlock({ zone: 'upper', n: 16, lod: ecoFishLod(scene, crucian, 16, 10, 35), mode: anchors.length ? 'reef' : 'school', anchors: anchors.length ? anchors : null, home: { x: lk.x, y: lk.level - 0.8, z: lk.z }, range: 4.5, rangeZ: 0.6, spawn: 0.6, speed: 0.25, maxSpeed: 0.8, per: 0.35, flee: 1.6, minDepth: 0.4, floorGap: 0.12, ceilGap: 0.2, predators: predU, size: 1 });
  const f2 = new EcoFlock({ zone: 'upper', n: 14, lod: ecoFishLod(scene, tilapia, 14, 10, 35), mode: 'school', home: { x: lk.x + 1, y: lk.level - 0.9, z: lk.z }, range: 4.5, rangeZ: 0.6, spawn: 0.8, speed: 0.3, maxSpeed: 0.9, per: 0.4, minDepth: 0.5, floorGap: 0.15, ceilGap: 0.25, predators: predU, size: 1, band: 0.45 });
  Z.flocks = [f1, f2]; Z.critters = ECO.critters.slice(c0);
  ECO.zones.upper = Z;
  ECO.upperInfo = { weeds: weedSpots.length, prawns: prawns.length, crays: crays.length, fish: f1.n + f2.n, fishLen: [crucian.len, tilapia.len], prawnLen: 0.085, crayLen: 0.055 };
}
