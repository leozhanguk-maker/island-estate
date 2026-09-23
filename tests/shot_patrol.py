# 截图巡检：固定机位 + 随机机位 + 问题特写（取自巡逻/体检报告），自动初筛后拼成总览图供人工按缺陷清单审阅
# 输出：reports/shots/*.png、sheet_*.png（总览图）、index.md
# 用法：python3 tests/shot_patrol.py [--random=12] [--seed=N] [--issues=12] [--only=fixed|random|issues]
import os, sys, json, math, datetime, glob
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import Session, report_dir, arg, REPORTS
from views import FIXED, RENDER_JS, random_views, auto_flags, contact_sheet

SEED = int(arg('seed', datetime.date.today().strftime('%Y%m%d')))
NRAND = int(arg('random', 12))
NISSUE = int(arg('issues', 12))
ONLY = arg('only')


class Rng:
    def __init__(self, s): self.a = s & 0xffffffff
    def __call__(self):
        self.a = (self.a * 1664525 + 1013904223) & 0xffffffff
        return self.a / 4294967296
    def pick(self, l): return l[int(self() * len(l)) % len(l)]
    def uni(self, a, b): return a + (b - a) * self()


def issue_views():
    """从巡逻与体检报告里按检查项轮流挑有坐标的问题，生成斜俯视特写机位（每类最多 3 个）"""
    buckets = {}
    for rep in ('audit', 'patrol'):
        p = os.path.join(REPORTS, rep, 'report.json')
        if not os.path.exists(p):
            continue
        for it in json.load(open(p, encoding='utf8'))['new']:
            if it.get('x') is None or it.get('kind') == '掉帧':
                continue
            buckets.setdefault(it.get('check') or it.get('kind'), []).append(it)
    views, k = [], 0
    while len(views) < NISSUE and k < 3:
        for c, l in buckets.items():
            if k < len(l) and len(views) < NISSUE:
                it, y = l[k], l[k].get('y') or 0
                views.append((f"问题{len(views):02d} {c}", (it['x'] + 3.2, y + 2.4, it['z'] + 3.2), (it['x'], y + 0.3, it['z']), it.get('msg', '')))
        k += 1
    return views


def main():
    d = report_dir('shots')
    for f in glob.glob(os.path.join(d, '*.png')):
        os.remove(f)
    with Session('#fp,still,q=high,clean', size=(1280, 720)) as s:
        probe = lambda x, z: s.js("([x,z]) => { const w = __fp._test.waterAt(x, z); return w && !w.pool ? null : __dbg.gh(x, z); }", [x, z])
        views = []
        if ONLY in (None, 'fixed'):
            views += [(n, p, t, '') for n, (p, t) in FIXED.items()]
        if ONLY in (None, 'random'):
            views += [(n, p, t, '') for n, p, t in random_views(NRAND, Rng(SEED), probe)]
        if ONLY in (None, 'issues'):
            views += issue_views()
        rows, items = [], []
        for i, (name, pos, tgt, note) in enumerate(views):
            r = s.js(RENDER_JS, [*pos, *tgt])
            path = os.path.join(d, f'{i:02d}.png')
            s.shot(path)
            flags = auto_flags(path)
            if r['camBelowGround']:
                flags.append('相机低于地面')
            rows.append({'i': i, 'name': name, 'pos': pos, 'target': tgt, 'note': note, 'flags': flags, 'file': f'{i:02d}.png'})
            items.append((f'{i:02d} {name}' + (' ⚠' if flags else ''), path))
            print(f"{i:02d} {name:<16} {'；'.join(flags) if flags else '自动初筛通过'}")
        errors = s.errors + [t for _, t in s.console if 'error' in _]
    sheets = []
    for k in range(0, len(items), 9):
        sp = os.path.join(d, f'sheet_{k // 9:02d}.png')
        contact_sheet(items[k:k + 9], sp)
        sheets.append(os.path.basename(sp))
    md = [f"# 截图巡检\n\n种子 {SEED}，共 {len(rows)} 张；总览图：" + '、'.join(sheets) + "\n\n逐张按 `docs/VISUAL_CHECKLIST.md` 审阅，发现问题记入 `docs/ISSUES.md`。\n",
          '| # | 机位 | 相机 → 注视点 | 自动初筛 | 备注 |', '|---|---|---|---|---|']
    for r in rows:
        md.append(f"| {r['i']:02d} | {r['name']} | {r['pos']} → {r['target']} | {'；'.join(r['flags']) or '通过'} | {r['note'][:60]} |")
    if errors:
        md.append('\n## 页面报错\n' + '\n'.join(f'- {e}' for e in errors))
    with open(os.path.join(d, 'index.md'), 'w', encoding='utf8') as f:
        f.write('\n'.join(md) + '\n')
    print('总览图：', ', '.join(os.path.join('reports/shots', x) for x in sheets))


if __name__ == '__main__':
    main()
