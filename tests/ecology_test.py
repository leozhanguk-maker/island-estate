# 水域生态测试：三个水域的物种数量、淡水/海水不混用、长时间推进后无 NaN、生物不离开各自水域、绘制调用预算
#   1. 数量：各水域的物种与数量与设计一致（对照下方 EXPECT）
#   2. 分区：湖里的生物始终在淡水湖内；闸内港口生物始终在闸内港口（寄居蟹在港口沙滩）；外海生物始终在闸外海水里
#   3. 竖向：水中生物不钻进湖底/海底、不飞出水面（鲸跃出水面、海豚除外：鲸允许短时高出水面 6 m 以内）
#   4. 数值：每个水域推进 30 秒（每步 1/30 s）后所有位置有限，无 NaN
#   5. 绘制调用：相机分别在三个水域水下时，生态新增的绘制调用不超过预算
# 用法：python3 tests/ecology_test.py
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))
from harness import Session

# 各水域的设计数量（改动须同步更新并说明原因）
EXPECT = {
    'lakeInfo': {'crays': 14, 'prawns': 10, 'crabs': 8, 'logs': 0, 'stonesUnder': 0, 'fish': 48},   # 水族馆式清澈湖：无沉木、水下无石头，鱼类加倍
    'lagoonInfo': {'octopus': 2, 'anemones': 4},
}
DRAW_BUDGET = 60   # 单个水域水下时，生态网格新增的绘制调用上限

JS = r'''() => { const D = __dbg, E = D.ECO, I = __island, cam = I.camera, fails = [], stats = {};
  const fin = (...v) => v.every(Number.isFinite);
  // 按水域收集生物位置：鱼群（f.p）、底栖/小型动物（k.a）、鲸类（w.a）
  const creatures = (Z) => { const out = []; for (const f of Z.flocks || []) for (let i = 0; i < f.n; i++) out.push({ kind: 'fish', x: f.p[i * 3], y: f.p[i * 3 + 1], z: f.p[i * 3 + 2] });
    for (const k of Z.critters || []) for (const c of k.a) out.push({ kind: k.beach ? 'beach' : 'critter', x: c.x, y: c.y, z: c.z });
    for (const w of Z.whales || []) for (const c of w.a) out.push({ kind: 'whale', x: c.x, y: c.y, z: c.z }); return out; };
  const inLake = (x, z) => D.ecoZone(x, z) === 'lake';
  const lagoonBox = (x, z) => z < D.L.gateZ && z > 18 && Math.abs(x) < 75;
  const check = (name, Z) => { let bad = 0, nan = 0, vert = 0, first = null;
    for (const c of creatures(Z)) {
      if (!fin(c.x, c.y, c.z)) { nan++; continue; }
      const g = D.gh(c.x, c.z); let ok, vok = true;
      if (name === 'lake') { ok = inLake(c.x, c.z); vok = c.y <= D.L.lake.level + 0.05 && c.y >= g - 0.3; }
      else if (name === 'lagoon') { if (c.kind === 'beach') { ok = lagoonBox(c.x, c.z + 0) || (c.z > 18 && c.z < 60 && Math.abs(c.x) < 60); ok = ok && !inLake(c.x, c.z); vok = Math.abs(c.y - g) < 0.3; }
        else { ok = lagoonBox(c.x, c.z) && g < 0; vok = c.y <= 0.05 && c.y >= g - 0.3; } }
      else { ok = !lagoonBox(c.x, c.z) && !inLake(c.x, c.z) && g < -0.3; vok = c.kind === 'whale' ? (c.y <= 6 && c.y >= g - 0.5) : (c.y <= 0.05 && c.y >= g - 0.5); }
      if (!ok) { bad++; first = first || `${c.kind} (${c.x.toFixed(1)}, ${c.y.toFixed(1)}, ${c.z.toFixed(1)})`; }
      if (!vok) { vert++; first = first || `${c.kind} 高度 ${c.y.toFixed(2)}，地面 ${g.toFixed(2)} @ (${c.x.toFixed(1)}, ${c.z.toFixed(1)})`; } }
    return { n: creatures(Z).length, bad, nan, vert, first }; };
  // 每个水域：相机放到水下，推进 30 秒，每 5 秒检查一次
  const views = { lake: [181, 9.4, -78], lagoon: [0, -3, 85], oceanS: [20, -6, 205], oceanSE: [240, -6, 200], oceanSW: [-250, -6, 200], oceanN: [10, -8, -214] };
  const base = { lake: 'lake', lagoon: 'lagoon' };
  for (const [name, p] of Object.entries(views)) { const Z = E.zones[name]; if (!Z) { fails.push(`缺少水域 ${name}`); continue; }
    cam.position.set(...p); cam.lookAt(p[0] + 5, p[1] - 1, p[2] + 5); cam.updateMatrixWorld();
    const player = { x: p[0], y: p[1], z: p[2], inWater: true, under: true };
    let worst = null;
    for (let s = 0; s < 900; s++) { D.updateEcology(1 / 30, s / 30, cam, player); if (s % 150 === 149) { const r = check(base[name] || 'ocean', Z); if (r.bad || r.nan || r.vert) { worst = r; break; } } }
    const r = worst || check(base[name] || 'ocean', Z); stats[name] = r.n;
    if (r.n === 0) fails.push(`${name} 没有任何生物`);
    if (r.nan) fails.push(`${name} 有 ${r.nan} 个生物位置为 NaN/无穷`);
    if (r.bad) fails.push(`${name} 有 ${r.bad} 个生物离开了所属水域，例如 ${r.first}`);
    if (r.vert) fails.push(`${name} 有 ${r.vert} 个生物钻进水底或跑出水面，例如 ${r.first}`); }
  // 溪蟹在大卵石之间横行：所有可选的窝都必须在水下（曾把岸边水线以上的卵石当作窝，溪蟹会爬出水面）
  if (!(E.lakeInfo && E.lakeInfo.crabHomes && E.lakeInfo.crabHomes.length)) fails.push('ECO.lakeInfo.crabHomes 未登记（无法检查溪蟹的窝）');
  for (const h of (E.lakeInfo && E.lakeInfo.crabHomes) || []) if (!(D.ecoZone(h.x, h.z) === 'lake' && D.L.lake.level - D.gh(h.x, h.z) > 0.15)) { fails.push(`溪蟹的窝 (${h.x.toFixed(1)}, ${h.z.toFixed(1)}) 不在水下（水深 ${(D.L.lake.level - D.gh(h.x, h.z)).toFixed(2)} m）`); break; }
  // 水族馆式湖泊：荷花集中在靠瀑布一侧（湖东部）、沉水草铺满湖底；三个水域都清澈（水下雾密度上限）
  { const I = E.lakeInfo || {}; if (!(I.lotus >= 20 && I.lotusCx > D.L.lake.x + 3)) fails.push(`荷花应集中在靠瀑布一侧：${I.lotus} 丛，重心 x=${(I.lotusCx || 0).toFixed(1)}（湖心 ${D.L.lake.x}）`);
    if (!(I.weeds >= 80)) fails.push(`湖底沉水草只有 ${I.weeds} 丛，应铺满湖底（≥ 80）`); }
  for (const [k, lim] of [['lake', 0.08], ['lagoon', 0.04], ['ocean', 0.035]]) { const d = D.ECO_LOOK && D.ECO_LOOK[k].dens; if (!(d <= lim)) fails.push(`${k} 水下雾密度 ${d}，应 ≤ ${lim}（能见度高、清澈）`); }
  // P-016：三个水域的随机数各自独立（每个水域建造前重置种子），改动一个水域的内容不会让另外两个水域整体错位
  { const src = String(window.__dbg.buildEcology || ''); if (!/ecoSeed\(\d+\);\s*buildEcoLagoon/.test(src) || !/ecoSeed\(\d+\);\s*buildEcoOcean/.test(src)) fails.push('闸内港口、外海建造前没有各自重置生态随机数种子（P-016）'); }
  // 鲸群不会游上岸：把每个鲸群领头的航点设在岛中央陆地上推进 20 秒，所有个体始终在深水里（曾因编队位置跨过海岸被抬到地面以上 16 m）
  for (const w of E.whales || []) { w.wp = { x: 0, z: 0 }; w.wt = 999; let bad = null;
    for (let s = 0; s < 600 && !bad; s++) { w.update(1 / 30, s / 30); for (const a of w.a) if (a.y > 6 || D.gh(a.x, a.z) > -w.minFloor * 0.5) { bad = `(${a.x.toFixed(1)}, ${a.y.toFixed(1)}, ${a.z.toFixed(1)}) 水深 ${(-D.gh(a.x, a.z)).toFixed(1)} m`; break; } }
    if (bad) { fails.push(`鲸群被引向陆地时游进浅水或出水过高：${bad}`); break; } }
  // P-017：鲸群不进闸内港口、水闸口与闸外水道峡谷（|x| < 39 m，z 从水闸到约 202 出海，外加 10 m），且始终离岛岸 ≥ 10 m。
  // 判定独立于被测代码：禁区按实测水道尺寸写死；离岸按半径 9.5 m 一圈 24 个点，任何一点露出水面（地面 > 0）即算靠岸
  { const gz = D.L.gateZ, forbid = (x, z) => (Math.abs(x) < 75 && z > 0 && z < gz) || (Math.abs(x) < 49 && z >= gz && z < 212);
    const nearShore = (x, z) => { for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; if (D.gh(x + Math.cos(a) * 9.5, z + Math.sin(a) * 9.5) > 0) return true; } return false; };
    const badOf = (w) => { for (const a of w.a) { if (forbid(a.x, a.z)) return `进入水闸口/峡谷/闸内港口 (${a.x.toFixed(1)}, ${a.z.toFixed(1)})`; if (nearShore(a.x, a.z)) return `离岸不足 10 m (${a.x.toFixed(1)}, ${a.z.toFixed(1)})`; } return null; };
    const run = (secs, t0) => { for (let s = 0; s < secs * 30; s++) for (const w of E.whales) { w.update(1 / 30, t0 + s / 30); if (s % 15 === 0) { const b = badOf(w); if (b) return b; } } return null; };
    const put = (w, x, z) => { const dx = x - w.a[0].x, dz = z - w.a[0].z; for (const a of w.a) { a.x += dx; a.z += dz; } };
    let bad = null;
    const snap = E.whales.map(w => ({ w, a: w.a.map(c => ({ ...c })), wp: { ...w.wp }, wt: w.wt, chaseT: w.chaseT, chasing: w.chasing }));
    { const b = run(60, 100); if (b) bad = `自由巡游时${b}`; }
    // 把各鲸群放到峡谷出口外 35 m 的深水里，航点依次设在峡谷中、水闸口、闸内港口，各推进 30 秒
    for (const [nm, wx, wz] of [['峡谷中', 0, 160], ['水闸口', 0, gz + 2], ['闸内港口', 0, 80]]) { if (bad) break;
      for (const [i, w] of E.whales.entries()) { put(w, -40 + i * 40, 240); w.wp = { x: wx, z: wz }; w.wt = 999; w.chasing = 0; w.chaseT = 1e9; }
      const b = run(30, 200); if (b) bad = `航点设在${nm}时${b}`; }
    // 游艇在峡谷出口外鸣笛：召唤来的鲸群出现的位置与之后 30 秒都不违规
    if (!bad) { for (const w of E.whales) w.chaseT = 30; const msg = D.ecoOceanShow(0, 222); const b0 = E.whales.map(badOf).find(Boolean); const b = b0 || run(30, 300);
      if (b) bad = `峡谷出口外鸣笛（${msg}）后${b}`; }
    // 还原：召唤的水域挪回原处、鲸群回到测试前的状态（不影响后面的绘制调用测量）
    if (D.ECO_SHOW.moved) { D.ECO_SHOW.t = 0; D.ecoShowUpdate(0.01); }
    for (const o of snap) { o.a.forEach((c, i) => Object.assign(o.w.a[i], c)); o.w.wp = o.wp; o.w.wt = o.wt; o.w.chaseT = o.chaseT; o.w.chasing = o.chasing; }
    if (bad) fails.push(`鲸群${bad}（P-017）`); }
  // 淡水与海水物种不混用：湖区只有淡水生物、闸内港口和外海没有淡水生物（按各水域登记的鱼群所属水域核对）
  for (const [name, Z] of Object.entries(E.zones)) { if (!Z) continue; const want = name === 'lake' ? 'lake' : name === 'lagoon' ? 'lagoon' : 'ocean';
    for (const f of Z.flocks || []) if (f.zone !== want) fails.push(`${name} 里登记了属于 ${f.zone} 的鱼群`); }
  // 绘制调用：相机在各水域水下时，生态网格新增的绘制调用数
  const R = I.renderer, draws = {};
  for (const [name, p] of [['lake', views.lake], ['lagoon', views.lagoon], ['oceanSE', views.oceanSE]]) {
    cam.position.set(...p); cam.lookAt(p[0] + 5, p[1] - 1, p[2] + 5); cam.updateMatrixWorld(); __fp._st.pos.x = p[0]; __fp._st.pos.z = p[2]; __fp._st.feet = p[1] - 1.6;
    for (let s = 0; s < 3; s++) { D.updateEcology(1 / 30, s / 30, cam, null); I.underwaterCheck(); }
    R.info.autoReset = false; R.info.reset(); R.render(I.scene, cam); const on = R.info.render.calls;
    const vis = []; for (const Z of Object.values(E.zones)) if (Z) for (const m of Z.meshes) vis.push([m, m.visible]);
    for (const l of E.lods) for (const m of l.ims) vis.push([m, m.visible]); if (E.rays) vis.push([E.rays.im, E.rays.im.visible]); if (E.uwBack) vis.push([E.uwBack, E.uwBack.visible]); if (E.lakeNear) vis.push([E.lakeNear, E.lakeNear.visible]);
    for (const [m] of vis) m.visible = false; R.info.reset(); R.render(I.scene, cam); const off = R.info.render.calls; for (const [m, v] of vis) m.visible = v; R.info.autoReset = true;
    draws[name] = on - off; if (on - off > BUDGET) fails.push(`${name} 水下时生态新增绘制调用 ${on - off} 次，超过预算 ${BUDGET}`); }
  return { fails, stats, draws, lakeInfo: E.lakeInfo && Object.fromEntries(Object.entries(E.lakeInfo).filter(([k, v]) => typeof v === 'number')), lagoonInfo: E.lagoonInfo }; }'''


def main():
    with Session('#fp,still,q=high') as s:
        r = s.js(JS.replace('BUDGET', str(DRAW_BUDGET)))
        errors = s.errors
    fails = list(r['fails']) + [f'页面异常：{e}' for e in errors]
    for sec, want in EXPECT.items():
        got = r.get(sec) or {}
        for k, v in want.items():
            if got.get(k) != v:
                fails.append(f'{sec}.{k} = {got.get(k)}，设计数量 {v}')
    print('各水域生物数量：', r['stats'])
    print('湖：', r['lakeInfo'])
    print('闸内港口：', r['lagoonInfo'])
    print('生态新增绘制调用：', r['draws'])
    if fails:
        print('\n生态测试失败：')
        for f in fails:
            print('  ✗', f)
        sys.exit(1)
    print('水域生态测试全部通过')


if __name__ == '__main__':
    main()
