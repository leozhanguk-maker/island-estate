# 水域生态测试：三个水域的物种数量、淡水/海水不混用、长时间推进后无 NaN、生物不离开各自水域、绘制调用预算
#   1. 数量：各水域的物种与数量与设计一致（对照下方 EXPECT）
#   2. 分区：湖里的生物始终在淡水湖内；潟湖生物始终在闸内潟湖（寄居蟹在港口沙滩）；外海生物始终在闸外海水里
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
    'lakeInfo': {'crays': 14, 'prawns': 10, 'crabs': 8, 'logs': 6},
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
  // 淡水与海水物种不混用：湖区只有淡水生物、潟湖和外海没有淡水生物（按各水域登记的鱼群所属水域核对）
  for (const [name, Z] of Object.entries(E.zones)) { if (!Z) continue; const want = name === 'lake' ? 'lake' : name === 'lagoon' ? 'lagoon' : 'ocean';
    for (const f of Z.flocks || []) if (f.zone !== want) fails.push(`${name} 里登记了属于 ${f.zone} 的鱼群`); }
  // 绘制调用：相机在各水域水下时，生态网格新增的绘制调用数
  const R = I.renderer, draws = {};
  for (const [name, p] of [['lake', views.lake], ['lagoon', views.lagoon], ['oceanSE', views.oceanSE]]) {
    cam.position.set(...p); cam.lookAt(p[0] + 5, p[1] - 1, p[2] + 5); cam.updateMatrixWorld(); __fp._st.pos.x = p[0]; __fp._st.pos.z = p[2]; __fp._st.feet = p[1] - 1.6;
    for (let s = 0; s < 3; s++) { D.updateEcology(1 / 30, s / 30, cam, null); I.underwaterCheck(); }
    R.info.autoReset = false; R.info.reset(); R.render(I.scene, cam); const on = R.info.render.calls;
    const vis = []; for (const Z of Object.values(E.zones)) if (Z) for (const m of Z.meshes) vis.push([m, m.visible]);
    for (const l of E.lods) for (const m of l.ims) vis.push([m, m.visible]); if (E.rays) vis.push([E.rays.im, E.rays.im.visible]); if (E.uwBack) vis.push([E.uwBack, E.uwBack.visible]);
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
    print('潟湖：', r['lagoonInfo'])
    print('生态新增绘制调用：', r['draws'])
    if fails:
        print('\n生态测试失败：')
        for f in fails:
            print('  ✗', f)
        sys.exit(1)
    print('水域生态测试全部通过')


if __name__ == '__main__':
    main()
