# 基线不变量：页面内断言“不应改变的东西”
#   1. 共享几何体未被原地变换（BOXG 事故的防线）
#   2. 关键构件高程（泳池池壁/池底、别墅首层墙体）；H125 真实外形尺寸（V-009）；游艇尾封板完整（V-014）
#   3. 设施与交互数量、碰撞登记数量、三角面数（对照 tests/baseline/invariants.json）
# 用法：python3 tests/invariants.py [--update]   # --update 重写数量基线（须单独提交并说明原因）
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import Session, arg, ROOT

BASE = os.path.join(ROOT, 'tests', 'baseline', 'invariants.json')

JS = r'''() => {
  const TH = __statics.THREE, D = __dbg, I = __island, fails = [], r3 = (v) => Math.round(v * 1000) / 1000;
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
