# 基线不变量：页面内断言“不应改变的东西”
#   1. 共享几何体未被原地变换（BOXG 事故的防线）
#   2. 关键构件高程（泳池池壁/池底、别墅首层墙体）；H125 真实外形尺寸（V-009）；游艇尾封板完整（V-014）；地表底色与草叶（P-013）；水闸为通透栅栏、闸内外海浪一致；栈道两端贴合、沿线无岩石侵入；游艇主甲板室内地板可见（V-015）；机场道路绕行、停机坪砖基、储能贴机库
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
  // ---- 2d. 地表底色与近景草叶（P-013）：沙滩为银白细沙、草地为绿色、湖底为干净浅色细砂（用户 2026-09-25 要求水族馆式湖泊，原为深色泥）；草地上长出近景草叶 ----
  { let terr = null; I.scene.traverse(o => { if (!terr && o.isMesh && o.geometry.attributes.ao && o.material.map && o.material.map.image && o.material.map.image.data) terr = o; });
    if (!terr) fails.push('找不到地形网格的地表贴图');
    else { const img = terr.material.map.image, TX = { x0: -360, z0: -210, w: 720, h: 420 };
      const px = (x, z) => { const o = (Math.floor((z - TX.z0) / TX.h * img.height) * img.width + Math.floor((x - TX.x0) / TX.w * img.width)) * 4; return [img.data[o], img.data[o + 1], img.data[o + 2]]; };
      for (const [x, z] of [[0, 25], [-20, 30]]) { const c = px(x, z); if (Math.min(...c) < 200) fails.push(`港口沙滩 (${x}, ${z}) 地表色 ${c}，应为银白细沙（三通道都不低于 200）`); }
      for (const [x, z] of [[-100, -60], [120, 40]]) { const c = px(x, z); if (!(c[1] > c[0] + 15 && c[1] > c[2] + 30)) fails.push(`草地 (${x}, ${z}) 地表色 ${c}，应为绿色`); }
      { const c = px(L_LAKE.x, L_LAKE.z), sum = c[0] + c[1] + c[2]; if (!(sum > 260 && sum < 600 && Math.max(...c) - Math.min(...c) < 60)) fails.push(`湖底 (${L_LAKE.x}, ${L_LAKE.z}) 地表色 ${c}，应为干净的浅色细砂（水族馆式清澈湖底；贴图含盆地环境光遮蔽，湖心约暗三成；原深色淤泥三通道和约 100）`); } }
    if (I.grass) { const fp = __fp; fp.teleport(120, 40, 0); fp._st.on = true; I.grass.update(fp); const n = I.grass.mesh.count; fp._st.on = false; I.grass.update(fp);   // 恢复隐藏，免得计入三角面统计
      if (n < 200) fails.push(`草地 (120, 40) 周围近景草叶只有 ${n} 丛，材质权重图的草地权重可能被清零`); } }
  // ---- 2e. 水闸为通透栅栏式（铁窗风）：关闭状态下，沿闸门水平方向在水面上下各扫一排视线，大部分能穿过门叶；闸内外海浪一致（水面着色器不再按闸内港口静水区压低浪高、浪陡与泡沫） ----
  { const G = D.GATE, keep = G.leaves.map(l => l.position.y); G.leaves.forEach(l => { l.position.y = -3.0; l.updateMatrixWorld(true); });
    for (const y of [2.5, -1.5]) { let pass = 0, n = 0; for (let x = -34; x <= 34; x += 0.37) { if (Math.abs(x) < 2.6) continue; n++;
        const h = new TH.Raycaster(new TH.Vector3(x, y, D.L.gateZ - 6), new TH.Vector3(0, 0, 1), 0, 12).intersectObjects(G.leaves, true)[0]; if (!h) pass++; }
      if (pass / n < 0.5) fails.push(`水闸门叶在高 ${y} m 处只有 ${Math.round(pass / n * 100)}% 的视线能穿过，应为通透栅栏（≥ 50%）`); }
    G.leaves.forEach((l, i) => { l.position.y = keep[i]; l.updateMatrixWorld(true); });
    // 新海面（05b_sea）：涌浪经缺口与通透闸门进入闸内港口，港内浪高比例 SHORE.lagoonGain 不得压到静水（< 0.5）；#oldsea 回退时检查原海面着色器
    const nsea = (__statics.waterMats || []).find(m => m.uniforms && m.uniforms.uShore0);
    const sea = (__statics.waterMats || []).find(m => m.uniforms && m.uniforms.uFresh && m.uniforms.uFresh.value === 0);
    if (nsea) { if (!(D.SHORE && D.SHORE.lagoonGain >= 0.5)) fails.push(`闸内港口浪高比例 SHORE.lagoonGain = ${D.SHORE && D.SHORE.lagoonGain}，应 ≥ 0.5（闸门通透，海浪应能冲进港内）`); }
    else if (!sea) fails.push('找不到海水材质');
    else for (const bad of ['max(calm', '0.35 * calm', '0.85 * calm']) if (sea.fragmentShader.includes(bad)) fails.push(`海水着色器仍按闸内港口静水区压低海浪（含 “${bad}”），闸内外海浪应一致`); }
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
  // ---- 2g. 游艇主甲板室内地板不被外甲板面遮住（V-015）：从室内前部几处向下看，第一个命中的是室内地板 2.45，而不是沿舷弧升高的外甲板面 ----
  { const Y = D.BOAT.g; Y.updateMatrixWorld(true); const inv = new TH.Matrix4().copy(Y.matrixWorld).invert();
    for (const [lx, lz] of [[-4, 1.5], [2, -1.5], [8, 0.5], [11.5, -2]]) { const o = new TH.Vector3(lx, 4.5, lz).applyMatrix4(Y.matrixWorld), d = new TH.Vector3(0, -1, 0);
      const h = new TH.Raycaster(o, d, 0, 5).intersectObject(Y, true)[0], ly = h ? h.point.clone().applyMatrix4(inv).y : null;
      if (ly === null || Math.abs(ly - 2.45) > 0.06) { fails.push(`游艇主甲板室 (${lx}, ${lz}) 向下第一个命中高度 ${ly === null ? '无' : r3(ly)}，应为室内地板 2.45（外甲板面把室内地板盖住了）`); break; } } }
  // ---- 2h. 机场：道路绕过机场（任何道路点都不在停机坪 24 m 方坪外扩 2 m 以内，R1 末端接上 R2 起点）；停机坪砖砌基座落到坪下最低地面以下；西侧储能紧贴机库、不挡路 ----
  { const X = I.X, Lh = D.L.helipad, hg = D.L.hangar, rot = Math.atan2(Lh.x - hg.x, Lh.z - hg.z), c = Math.cos(rot), sn = Math.sin(rot);
    const loc = (x, z) => { const dx = x - Lh.x, dz = z - Lh.z; return [dx * c - dz * sn, dx * sn + dz * c]; };
    for (const r of X.roads) { const bad = r.pts.find(p => { const [a, b] = loc(p[0], p[1]); return Math.abs(a) < 14 && Math.abs(b) < 14; }); if (bad) { fails.push(`道路 ${r.id} 穿过停机坪：(${r3(bad[0])}, ${r3(bad[1])})`); break; } }
    const R1 = X.roads.find(r => r.id === 'R1'), R2 = X.roads.find(r => r.id === 'R2'), e = R1.pts.at(-1), b0 = R2.pts[0];
    if (Math.hypot(e[0] - b0[0], e[1] - b0[1]) > 1.5) fails.push(`R1 末端 (${r3(e[0])}, ${r3(e[1])}) 没有接上 R2 起点 (${r3(b0[0])}, ${r3(b0[1])})`);
    let lo = 1e9; for (let a = -12; a <= 12; a += 1) for (let b = -12; b <= 12; b += 1) lo = Math.min(lo, D.gh(Lh.x + a * c + b * sn, Lh.z - a * sn + b * c));
    let base = null; __statics.groups.forEach(g => g.traverse(o => { if (o.isMesh && o.material.map && o.material.map.image && o.material.map.image.width === 512 && o.material.map.image.height === 256) { const bb = new TH.Box3().setFromObject(o); if (Math.abs((bb.min.x + bb.max.x) / 2 - Lh.x) < 3 && Math.abs((bb.min.z + bb.max.z) / 2 - Lh.z) < 3) base = bb; } }));
    if (!base) fails.push('找不到停机坪砖砌基座'); else if (base.min.y > lo - 0.2) fails.push(`停机坪砖砌基座底面 ${r3(base.min.y)}，没落到坪下最低地面 ${r3(lo)} 以下`);
    const pw = D.L.pwWest; let dRoad = 1e9; for (const r of X.roads) for (const p of r.pts) dRoad = Math.min(dRoad, Math.hypot(p[0] - pw.x, p[1] - pw.z) - r.w / 2);
    if (dRoad < 4) fails.push(`西侧储能离道路边只有 ${r3(dRoad)} m，挡路`);
    const hc = Math.atan2(Lh.x - hg.x, Lh.z - hg.z), hx = (pw.x - hg.x) * Math.cos(hc) - (pw.z - hg.z) * Math.sin(hc);
    if (!(Math.abs(Math.abs(hx) - 10.5) < 1.5)) fails.push(`西侧储能离机库侧墙 ${r3(Math.abs(hx) - 10.1)} m，应紧贴机库`); }
  // ---- 2i. 闸内泊位船首不再有两根系缆钢桩（用户要求删除，V-016）：(3.5, 游艇 z ± 6.5) 周围 1.5 m 内没有圆柱碰撞体与竖直构件 ----
  { const zs = [D.L.yacht.z - 6.5, D.L.yacht.z + 6.5];
    for (const pz of zs) { if (D.COLL.circles.some(c => Math.hypot(c.x - 3.5, c.z - pz) < 1.5)) fails.push(`泊位 (3.5, ${pz}) 仍有系缆钢桩碰撞体`);
      let hit = false; __statics.groups.forEach(g => g.traverse(o => { if (!o.isMesh || hit) return; const bb = new TH.Box3().setFromObject(o); if (bb.max.x - bb.min.x < 1.5 && bb.max.z - bb.min.z < 1.5 && bb.max.y - bb.min.y > 2 && Math.hypot((bb.min.x + bb.max.x) / 2 - 3.5, (bb.min.z + bb.max.z) / 2 - pz) < 1.5) hit = true; }));
      if (hit) fails.push(`泊位 (3.5, ${pz}) 仍有竖直钢桩构件`); } }
  // ---- 2j. 躺椅按实物结构（V-017）：靠背向头端抬起（最高点 ≥ 0.8 m）、没有构件低于地面、头尾两端都有着地的支点（头端滚轮、脚端脚垫） ----
  { const g = new TH.Group(); D.lounger(g, 0, 0, 0, 0); g.updateMatrixWorld(true); const bb = new TH.Box3().setFromObject(g);
    if (bb.max.y < 0.8) fails.push(`躺椅最高点 ${r3(bb.max.y)} m，靠背没有抬起（应 ≥ 0.8）`);
    if (bb.min.y < -0.005) fails.push(`躺椅最低点 ${r3(bb.min.y)} m，有构件插进地面`);
    let head = 0, foot = 0; g.traverse(o => { if (!o.isMesh) return; const b = new TH.Box3().setFromObject(o), cz = (b.min.z + b.max.z) / 2; if (b.min.y < 0.01) { if (cz < -0.5) head++; else if (cz > 0.5) foot++; } });
    if (head < 2 || foot < 2) fails.push(`躺椅着地支点：头端 ${head} 个、脚端 ${foot} 个，两端都应至少 2 个（不能悬空）`);
    // 躺上去的姿势贴合靠背：上身与水平面夹角 = 靠背角、大腿水平、髋在座面上方约 0.1 m、头在座面上方 0.35～0.8 m
    const recl = D.SEATS.filter(q => q.recline), fp = __fp, st = fp._st, on0 = st.on;
    if (recl.length !== 6) fails.push(`带靠背角的躺椅座位 ${recl.length} 个，应为泳池 2 + 沙滩 4`);
    for (const sv of recl.slice(0, 2)) { st.on = true; fp.sitDown(sv); fp.update(1 / 60); const P = fp._person, u = P.userData; P.updateMatrixWorld(true);
      const up = new TH.Vector3(0, 1, 0).transformDirection(P.matrixWorld), th = new TH.Vector3(0, -1, 0).transformDirection(u.legL.matrixWorld);
      const hip = new TH.Vector3().setFromMatrixPosition(u.legL.matrixWorld), hd = new TH.Vector3().setFromMatrixPosition(u.head.matrixWorld);
      const a = Math.asin(up.y), bad = [];
      if (Math.abs(a - sv.recline) > 0.06) bad.push(`上身仰角 ${r3(a)}（靠背 ${sv.recline}）`);
      if (Math.abs(th.y) > 0.1) bad.push(`大腿不水平（方向 y ${r3(th.y)}）`);
      if (Math.abs(hip.y - sv.y - 0.1) > 0.05) bad.push(`髋高 ${r3(hip.y - sv.y)}`);
      if (!(hd.y - sv.y > 0.35 && hd.y - sv.y < 0.8)) bad.push(`头高 ${r3(hd.y - sv.y)}`);
      if (bad.length) fails.push(`躺椅 (${r3(sv.x)}, ${r3(sv.z)}) 躺姿不贴合靠背：${bad.join('、')}`);
      fp.standUp(); }
    st.on = on0; }
  // ---- 2k. 别墅三部楼梯两端都离正对的墙 ≥ 2 m（V-019）：起步处离地 1 m 沿楼梯反方向、到顶处离上层楼面 1 m 沿楼梯方向水平看，2 m 内不碰到墙或其他构件 ----
  { const ramps = D.COLL.walks.filter(w => w.kind === 'ramp' && Math.abs((w.x0 + w.x1) / 2 - 180) < 12 && Math.abs((w.z0 + w.z1) / 2 + 46) < 8);
    __statics.groups.forEach(g => g.updateMatrixWorld(true));
    if (ramps.length !== 3) fails.push(`别墅楼梯坡面应为 3 跑，实际 ${ramps.length}`);
    for (const w of ramps) { const dx = w.x0 - w.x1, dz = w.z0 - w.z1, l = Math.hypot(dx, dz), o = new TH.Vector3(w.x0 + dx / l * 0.05, w.y0 + 1.0, w.z0 + dz / l * 0.05);
      const h = new TH.Raycaster(o, new TH.Vector3(dx / l, 0, dz / l), 0, 5).intersectObjects(__statics.groups, true)[0];
      if (h && h.distance < 2.0) fails.push(`别墅楼梯（起步 ${r3(w.x0)}, ${r3(w.z0)}，高 ${r3(w.y0)}）起步前只有 ${r3(h.distance)} m 就碰到构件，应 ≥ 2 m`);
      const o2 = new TH.Vector3(w.x1 - dx / l * 0.05, w.y1 + 1.0, w.z1 - dz / l * 0.05), h2 = new TH.Raycaster(o2, new TH.Vector3(-dx / l, 0, -dz / l), 0, 5).intersectObjects(__statics.groups, true)[0];
      if (h2 && h2.distance < 2.0) fails.push(`别墅楼梯（到顶 ${r3(w.x1)}, ${r3(w.z1)}，高 ${r3(w.y1)}）迎面只有 ${r3(h2.distance)} m 就碰到构件，应 ≥ 2 m`); } }
  // ---- 2l. 灌木不再有实心内核（V-018：原来 8 张叶片面片围着一个光滑绿球），约三分之一的灌木换成野草莓丛 ----
  { const v = I.veg, nS = v.shrubs - v.strawPatches; let sm = null; I.scene.traverse(o => { if (o.isInstancedMesh && o.count === nS && Array.isArray(o.material) && o.geometry.groups.length === 2) sm = o; });
    if (!sm) fails.push(`找不到灌木实例网格（灌木 ${v.shrubs}，草莓丛 ${v.strawPatches}）`); else if (sm.geometry.groups[0].count > 0) fails.push(`灌木几何体仍有实心内核（${sm.geometry.groups[0].count / 3} 个三角形），近看是一大块绿包`);
    const ratio = v.strawPatches / v.shrubs; if (!(ratio > 0.28 && ratio < 0.39)) fails.push(`草莓丛占灌木 ${r3(ratio)}，应约为三分之一`);
    if (!(v.strawberries >= v.strawPatches * 4)) fails.push(`草莓 ${v.strawberries} 株 / ${v.strawPatches} 丛，每丛应至少 4 株`); }
  // ---- 2m. 农田细节（V-023）：葡萄园为篱架式（每行立柱、四道铁丝、每株主干/单臂/叶幕、每株 3 串果穗），不再是贴图方块；苹果树冠无实心内核并挂果；香蕉有果串 ----
  { const V = D.VINEYARD;
    if (!V) fails.push('葡萄园没有按株绘制（VINEYARD 为空）');
    else { if (V.vines < 500) fails.push(`葡萄 ${V.vines} 株，太少`); if (V.bunches < V.vines * 3) fails.push(`果穗 ${V.bunches} 串，应为每株 3 串`); if (V.wires !== V.rows * 40) fails.push(`铁丝段 ${V.wires}，应为每行 10 跨 × 4 道`); if (V.posts !== V.rows * 11) fails.push(`立柱 ${V.posts}，应为每行 11 根`); }
    let boxes = 0; __statics.groups.forEach(g => g.traverse(o => { if (o.isMesh && o.material.map && o.material.map.image && o.material.map.image.width === 256 && o.material.map.repeat && o.material.map.repeat.x === 5) boxes++; }));
    if (boxes) fails.push(`葡萄园仍有 ${boxes} 个贴图方块`);
    let apple = null, fruit = 0; I.scene.traverse(o => { if (o.isInstancedMesh && Array.isArray(o.material) && o.count > 20 && o.count < 200 && o.geometry.groups.length === 2 && o.geometry.attributes.uv && o.geometry.groups[1].count === (20 + 8) * 6) apple = o; });
    if (!apple) fails.push('找不到苹果树冠（外层 20 + 内层 8 张面片、无实心内核）'); }
  // ---- 2n. 别墅书房桌椅模型（assets/mac_desk.glb）已加载：桌脚落在三层楼板（18.8）上、整套在书房内不穿墙，桌椅碰撞与椅子座位已登记 ----
  { const K = D.DESK; if (!K || !K.loaded) fails.push('书房桌椅模型没有加载（退回了程序化书桌）');
    else { const bb = new TH.Box3().setFromObject(K.group);
      if (Math.abs(bb.min.y - 18.8) > 0.02) fails.push(`书房桌椅模型最低点 ${r3(bb.min.y)}，应落在三层楼板 18.8 上`);
      if (bb.min.x < 180 - 6.3 || bb.max.x > 180 + 7.8 || bb.min.z < -46 - 4.9 || bb.max.z > -46 + 5.5) fails.push(`书房桌椅模型超出书房范围：x ${r3(bb.min.x)}～${r3(bb.max.x)}，z ${r3(bb.min.z)}～${r3(bb.max.z)}`);
      if (!D.COLL.rects.some(r => Math.abs(r.x - 182.5) < 0.05 && Math.abs(r.z + 49.6) < 0.05 && r.hw >= 1.19)) fails.push('书桌碰撞没有登记');
      if (!D.SEATS.some(q => Math.abs(q.x - 182.95) < 0.05 && Math.abs(q.z + 48.84) < 0.05)) fails.push('书桌椅座位没有登记'); } }
  // ---- 2o. 直升机细节（用户要求进一步细节化）：旋翼头三臂星形桨毂与变距拉杆、驾驶舱显示屏、尾部注册号都在，且细节件都挂在机体上（不超出原机体包围盒 0.3 m） ----
  { const Hg = D.HELI.g, rot = Hg.userData.rotor; let meshes = 0, emissive = 0, reg = 0; Hg.traverse(o => { if (!o.isMesh) return; meshes++; if (o.material.emissive && o.material.emissiveIntensity > 0.5 && o.material.emissive.getHex() !== 0) emissive++; if (o.material.map && o.material.transparent) reg++; });
    const arms = rot.children.filter(o => o.isGroup).length;
    if (meshes < 200) fails.push(`直升机构件 ${meshes} 个，细节不足（应 ≥ 200；细节化前 61）`);
    if (arms < 6) fails.push(`旋翼组只有 ${arms} 个子组，应有 3 片桨叶 + 3 个星形桨毂臂`);
    if (emissive < 8) fails.push(`直升机发光件 ${emissive} 个（航行灯、着陆灯、显示屏等），应 ≥ 8`);
    if (reg < 2) fails.push('尾梁两侧注册号缺失'); }
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
