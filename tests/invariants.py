# 基线不变量：页面内断言“不应改变的东西”
#   1. 共享几何体未被原地变换（BOXG 事故的防线）
#   2. 关键构件高程（泳池池壁/池底、别墅首层墙体）；H125 真实外形尺寸（V-009）；游艇尾封板完整（V-014）；地表底色与草叶（P-013）；水闸为通透栅栏、闸内外海浪一致；栈道两端贴合、沿线无岩石侵入
#   3. 设施与交互数量、碰撞登记数量、三角面数（对照 tests/baseline/invariants.json）
# 用法：python3 tests/invariants.py [--update]   # --update 重写数量基线（须单独提交并说明原因）
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import Session, arg, ROOT

BASE = os.path.join(ROOT, 'tests', 'baseline', 'invariants.json')

JS = r'''() => {
  const TH = __statics.THREE, D = __dbg, I = __island, fails = [], r3 = (v) => Math.round(v * 1000) / 1000, L_LAKE = { x: 181, z: -78 };   // 淡水湖中心（02_layout L.lake）
  // ---- 1. 共享的基础几何体必须以原点为中心、尺寸与参数一致 ----
  const users = new Map();
  const visit = (o) => { if (o.isMesh && o.geometry) users.set(o.geometry, (users.get(o.geometry) || 0) + 1); };
  __statics.groups.forEach(g => g.traverse(visit)); I.scene.traverse(visit);
  let shared = 0;
  for (const [g, n] of users) {
    if (n < 2 || !g.parameters) continue;
    const P = g.parameters; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox, c = b.getCenter(new TH.Vector3()), s = b.getSize(new TH.Vector3());
    let exp = null;
    if (g.type === 'BoxGeometry') exp = [P.width, P.height, P.depth];
    else if (g.type === 'PlaneGeometry') exp = [P.width, P.height, 0];
    else if (g.type === 'SphereGeometry' && P.phiLength >= 6.28 && P.thetaLength >= 3.14) exp = [2 * P.radius, 2 * P.radius, 2 * P.radius];
    else if (g.type === 'CylinderGeometry') exp = [null, P.height, null];
    if (!exp) continue; shared++;
    // 创建时整体旋转过的几何体（如平面放平）尺寸分量会换位，只比较尺寸集合；平移（中心偏移）一律不允许
    const got = [s.x, s.y, s.z].sort((a, b) => a - b), want = exp.every(e => e !== null) ? [...exp].sort((a, b) => a - b) : null;
    const off = c.length(), bad = off > 1e-4 || (want ? want.some((e, i) => Math.abs(got[i] - e) > 1e-4) : exp.some((e, i) => e !== null && Math.abs(s.getComponent(i) - e) > 1e-4));
    if (bad) fails.push(`共享几何体 ${g.type}(${JSON.stringify(P).slice(0, 60)}) 被 ${n} 个网格共用，但已被原地变换：中心偏移 (${r3(c.x)}, ${r3(c.y)}, ${r3(c.z)})，尺寸 ${r3(s.x)}×${r3(s.y)}×${r3(s.z)}`);
  }
  // ---- 2. 关键构件高程 ----
  const villa = __statics.groups[0]; villa.updateMatrixWorld(true);
  const tiles = [], walls = [];
  villa.traverse(o => { if (!o.isMesh) return; const bb = new TH.Box3().setFromObject(o), s = bb.getSize(new TH.Vector3());
    if (o.material.map && o.material.map.repeat && o.material.map.repeat.x === 6 && o.material.map.repeat.y === 2) tiles.push(bb);
    if (o.material.color && o.material.color.getHexString() === 'eee9e0' && Math.abs(s.y - 3.6) < 0.01) walls.push(bb); });
  const exp2 = (name, v, want, tol) => { if (!(Math.abs(v - want) <= tol)) fails.push(`${name} = ${r3(v)}，应为 ${want} ± ${tol}`); };
  if (!tiles.length) fails.push('找不到泳池池砖构件');
  else { exp2('泳池池底顶面最低点', Math.min(...tiles.map(b => b.min.y)), 9.925, 0.01); exp2('泳池池壁顶面', Math.max(...tiles.map(b => b.max.y)), 11.525, 0.01); }
  if (!walls.length) fails.push('找不到别墅首层实墙（高 3.6 m）');
  else { exp2('别墅首层实墙底面', Math.min(...walls.map(b => b.min.y)), 11.35, 0.01); exp2('别墅首层实墙顶面', Math.max(...walls.map(b => b.max.y)), 14.95, 0.01); }
  // ---- 2b. H125 按真实比例（V-009）：机身长 10.93、旋翼转动全长 12.94、高 3.34、座舱宽 1.87、尾桨在尾梁右侧（+z） ----
  { const H = D.HELI.g, par = H.parent, keep = [H.position.clone(), H.rotation.clone()]; if (par) par.remove(H); H.position.set(0, 0, 0); H.rotation.set(0, 0, 0); H.updateMatrixWorld(true);
    const bb = (objs) => { const b = new TH.Box3(); for (const o of objs) o.traverse(m => { if (m.isMesh) b.union(new TH.Box3().setFromObject(m, true)); }); return b; };
    const ud = H.userData, all = bb([H]), body = bb(H.children.filter(c => c !== ud.rotor && c !== ud.trotor)), tr = bb([ud.trotor]);
    let fus = null; H.children.forEach(c => { if (c.isMesh && c.material.vertexColors) fus = new TH.Box3().setFromObject(c, true); });
    exp2('H125 机身长（机头到尾鳍）', body.max.x - body.min.x, 10.93, 0.05); exp2('H125 旋翼转动时全长', ud.rotor.position.x + 5.345 - all.min.x, 12.94, 0.05);
    exp2('H125 高度（桨毂顶）', all.max.y - all.min.y, 3.34, 0.05); if (fus) exp2('H125 座舱宽', fus.max.z - fus.min.z, 1.87, 0.02); else fails.push('找不到 H125 机身');
    if (!(tr.min.z > 0)) fails.push(`H125 尾桨应在尾梁右侧（+z），实际 z ${r3(tr.min.z)}～${r3(tr.max.z)}`);
    H.position.copy(keep[0]); H.rotation.copy(keep[1]); if (par) par.add(H); H.updateMatrixWorld(true); }
  // ---- 2c. 游艇尾封板完整（V-014）：从船尾正后方沿中线朝船首水平看，第一个命中的应是尾封板（x≈-24.9），而不是穿过缺口看到船体内部 ----
  { const Y = D.BOAT.g; Y.updateMatrixWorld(true); const o = new TH.Vector3(-32, 1.95, 0).applyMatrix4(Y.matrixWorld), d = new TH.Vector3(1, 0, 0).transformDirection(Y.matrixWorld);
    const h = new TH.Raycaster(o, d, 0, 30).intersectObject(Y, true)[0], lx = h ? Y.worldToLocal(h.point.clone()).x : null;
    if (lx === null || Math.abs(lx + 24.9) > 0.3) fails.push(`游艇尾封板有缺口：从船尾中线高 1.95 m 处看进去，第一个命中点在船体局部 x=${lx === null ? '无' : r3(lx)}，应为 -24.9 左右`); }
  // ---- 2d. 地表底色与近景草叶（P-013）：沙滩为银白细沙、草地为绿色、湖底为深色泥；草地上长出近景草叶 ----
  { let terr = null; I.scene.traverse(o => { if (!terr && o.isMesh && o.geometry.attributes.ao && o.material.map && o.material.map.image && o.material.map.image.data) terr = o; });
    if (!terr) fails.push('找不到地形网格的地表贴图');
    else { const img = terr.material.map.image, TX = { x0: -360, z0: -210, w: 720, h: 420 };
      const px = (x, z) => { const o = (Math.floor((z - TX.z0) / TX.h * img.height) * img.width + Math.floor((x - TX.x0) / TX.w * img.width)) * 4; return [img.data[o], img.data[o + 1], img.data[o + 2]]; };
      for (const [x, z] of [[0, 25], [-20, 30]]) { const c = px(x, z); if (Math.min(...c) < 200) fails.push(`港口沙滩 (${x}, ${z}) 地表色 ${c}，应为银白细沙（三通道都不低于 200）`); }
      for (const [x, z] of [[-100, -60], [120, 40]]) { const c = px(x, z); if (!(c[1] > c[0] + 15 && c[1] > c[2] + 30)) fails.push(`草地 (${x}, ${z}) 地表色 ${c}，应为绿色`); }
      { const c = px(L_LAKE.x, L_LAKE.z); if (c[0] + c[1] + c[2] > 270) fails.push(`湖底 (${L_LAKE.x}, ${L_LAKE.z}) 地表色 ${c}，应为深色泥`); } }
    if (I.grass) { const fp = __fp; fp.teleport(120, 40, 0); fp._st.on = true; I.grass.update(fp); const n = I.grass.mesh.count; fp._st.on = false; I.grass.update(fp);   // 恢复隐藏，免得计入三角面统计
      if (n < 200) fails.push(`草地 (120, 40) 周围近景草叶只有 ${n} 丛，材质权重图的草地权重可能被清零`); } }
  // ---- 2e. 水闸为通透栅栏式（铁窗风）：关闭状态下，沿闸门水平方向在水面上下各扫一排视线，大部分能穿过门叶；闸内外海浪一致（水面着色器不再按潟湖静水区压低浪高、浪陡与泡沫） ----
  { const G = D.GATE, keep = G.leaves.map(l => l.position.y); G.leaves.forEach(l => { l.position.y = -3.0; l.updateMatrixWorld(true); });
    for (const y of [2.5, -1.5]) { let pass = 0, n = 0; for (let x = -34; x <= 34; x += 0.37) { if (Math.abs(x) < 2.6) continue; n++;
        const h = new TH.Raycaster(new TH.Vector3(x, y, D.L.gateZ - 6), new TH.Vector3(0, 0, 1), 0, 12).intersectObjects(G.leaves, true)[0]; if (!h) pass++; }
      if (pass / n < 0.5) fails.push(`水闸门叶在高 ${y} m 处只有 ${Math.round(pass / n * 100)}% 的视线能穿过，应为通透栅栏（≥ 50%）`); }
    G.leaves.forEach((l, i) => { l.position.y = keep[i]; l.updateMatrixWorld(true); });
    const sea = (__statics.waterMats || []).find(m => m.uniforms && m.uniforms.uFresh && m.uniforms.uFresh.value === 0);
    if (!sea) fails.push('找不到海水材质');
    else for (const bad of ['max(calm', '0.35 * calm', '0.85 * calm']) if (sea.fragmentShader.includes(bad)) fails.push(`海水着色器仍按潟湖静水区压低海浪（含 “${bad}”），闸内外海浪应一致`); }
  // ---- 2f. 栈道：北端桥面落在沙面上、南端与闸口警戒塔塔基顶面（2.6）齐平并伸进塔基；沿线桥面两侧 1.7 m 内地形不高出桥面（岩石不侵入扶手）；塔基可站立 ----
  { const T2 = __fp._test, ws = D.COLL.walks.filter(w => w.kind === 'path'), tw = D.L.gateTower;
    if (ws.length !== 2) fails.push(`栈道可行走路径应为 2 条，实际 ${ws.length}`);
    for (const w of ws) { const P = w.pts, e = P.at(-1), g = D.gh(e.x, e.z), onPlinth = Math.abs(e.x - tw.x) < 4.75 && Math.abs(e.z - tw.z) < 4.75;
      if (onPlinth) { if (Math.abs(e.y - 2.6) > 0.03) fails.push(`栈道南端桥面 ${r3(e.y)}，应与塔基顶面 2.6 齐平`); }
      else if (e.y - g > 0.2 || e.y - g < 0.05) fails.push(`栈道北端桥面顶面 ${r3(e.y)} 高出地面 ${r3(e.y - g)} m，应贴地（桥板厚 0.12，顶面高出地面 0.05～0.2）`);
      for (let i = 1; i < P.length - 1; i++) { const dx = P[i + 1].x - P[i - 1].x, dz = P[i + 1].z - P[i - 1].z, l = Math.hypot(dx, dz) || 1;
        for (const s of [-1.7, -1.4, -1.15, 1.15, 1.4, 1.7]) { const x = P[i].x - dz / l * s, z = P[i].z + dx / l * s, over = D.gh(x, z) - (P[i].y - 0.06);
          if (over > 0.05 && !(Math.abs(x - tw.x) < 5.5 && Math.abs(z - tw.z) < 5.5)) { fails.push(`栈道 (${r3(P[i].x)}, ${r3(P[i].z)}) 旁 ${s} m 处地形高出桥面 ${r3(over)} m（岩石侵入）`); i = P.length; break; } } } }
    const pf = T2.floorAt(tw.x + 3.5, tw.z - 3.5, 3.0); if (Math.abs(pf - 2.6) > 0.02) fails.push(`闸口警戒塔塔基顶面可站立高度 ${r3(pf)}，应为 2.6`); }
  // ---- 3. 数量统计 ----
  let meshes = 0; __statics.groups.forEach(g => g.traverse(o => { if (o.isMesh) meshes++; }));
  let tris = 0; I.scene.traverse(o => { if (o.isMesh && o.visible) { const g = o.geometry, n = g.index ? g.index.count / 3 : g.attributes.position.count / 3; tris += n * (o.isInstancedMesh ? o.count : 1); } });
  const counts = { 建筑分组: __statics.groups.length, 建筑构件: meshes, 座位: D.SEATS.length, 交互点: D.INTERACT.length, 可行走面: D.COLL.walks.length, 墙线段: D.COLL.segs.length, 矩形碰撞体: D.COLL.rects.length, 圆柱碰撞体: D.COLL.circles.length, 动物: D.ANIMALS.length, 车辆: D.DRIVE.cars.length, 盆栽: D.POTS.length };
  return { fails, shared, counts, tris: Math.round(tris) };
}'''


def main():
    with Session('#fp,still,q=high') as s:
        r = s.js(JS)
        errors = s.errors
    fails = list(r['fails']) + [f'页面异常：{e}' for e in errors]
    counts = dict(r['counts'], 三角面_高档=r['tris'])
    if arg('update') or not os.path.exists(BASE):
        with open(BASE, 'w', encoding='utf8') as f:
            json.dump(counts, f, ensure_ascii=False, indent=1)
        print('已写入数量基线', BASE)
    else:
        base = json.load(open(BASE, encoding='utf8'))
        for k, v in base.items():
            cur = counts.get(k)
            if k.startswith('三角面'):
                if cur is None or abs(cur - v) > v * 0.02:
                    fails.append(f'{k} {cur}，基线 {v}（允许 ±2%）')
            elif cur != v:
                fails.append(f'{k} {cur}，基线 {v}（设施/碰撞数量属定稿，变动须更新基线并说明原因）')
    print(f"共享几何体检查 {r['shared']} 个；数量：{counts}")
    if fails:
        print('\n不变量失败：')
        for f in fails:
            print('  ✗', f)
        sys.exit(1)
    print('基线不变量全部通过')


if __name__ == '__main__':
    main()
