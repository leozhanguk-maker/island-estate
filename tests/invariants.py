# 基线不变量：页面内断言“不应改变的东西”
#   1. 共享几何体未被原地变换（BOXG 事故的防线）
#   2. 关键构件高程（泳池池壁/池底、别墅首层墙体）
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
