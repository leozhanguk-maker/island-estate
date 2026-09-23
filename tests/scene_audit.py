# 场景体检：悬空或埋地物体、碰撞体重叠、可行走面未登记、构件无碰撞、座位不可达、共面闪烁、物体误沉水下、植被悬空/埋地
# 输出：reports/audit/report.md 与 report.json
# 用法：python3 tests/scene_audit.py [--strict]
import os, sys, time, datetime, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import Session, report_dir, write_json, load_known, arg

AUDIT_JS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'audit_scene.js'), encoding='utf8').read()

# 检查项 → 问题分类
CATEGORY = {'悬空': '视觉缺陷', '埋地': '视觉缺陷', '下沉入地': '视觉缺陷', '共面闪烁': '视觉缺陷', '误沉水下': '视觉缺陷', '植被悬空': '视觉缺陷', '植被埋地': '视觉缺陷',
            '碰撞体重叠': '程序缺陷', '可行走面未登记': '程序缺陷', '构件无碰撞': '程序缺陷', '座位不可达': '程序缺陷'}
ORDER = ['座位不可达', '可行走面未登记', '构件无碰撞', '悬空', '埋地', '误沉水下', '共面闪烁', '下沉入地', '植被悬空', '植被埋地', '碰撞体重叠']


def cluster(items, dist=2.0):
    """同一检查项中相距 dist 米以内的问题合并为一条"""
    out = []
    for it in items:
        for c in out:
            if it.get('x') is not None and math.hypot(it['x'] - c['x'], it['z'] - c['z']) < dist and abs((it.get('y') or 0) - (c.get('y') or 0)) < 2:
                c['count'] += 1
                break
        else:
            out.append(dict(it, count=1))
    return out


def main():
    t0 = time.time()
    known = load_known()
    with Session('#fp,still,q=low') as s:
        r = s.js(AUDIT_JS)
        errors, console = s.errors, s.console
    issues = []
    for check, items in r['checks'].items():
        for it in cluster(items):
            sig = f"{check}|{round(it['x'] / 2) * 2},{round(it['z'] / 2) * 2},{round((it.get('y') or 0))}"
            issues.append(dict(it, check=check, category=CATEGORY.get(check, '程序缺陷'), sig=sig))
    for e in errors:
        issues.append({'check': '报错', 'category': '程序缺陷', 'msg': e, 'x': None, 'z': None, 'y': None, 'count': 1, 'sig': '报错|' + e[:60]})
    new = [i for i in issues if i['sig'] not in known]
    old = [i for i in issues if i['sig'] in known]
    found = {i['sig'] for i in issues}
    stale = [k for k, v in known.items() if k not in found and v.get('tool') == 'audit']
    new.sort(key=lambda i: (ORDER.index(i['check']) if i['check'] in ORDER else 99, -i['count']))
    d = report_dir('audit')
    write_json(os.path.join(d, 'report.json'), {'date': datetime.datetime.now().isoformat(timespec='seconds'), 'seconds': round(time.time() - t0), 'stats': r['stats'], 'new': new, 'known': old, 'stale_known': stale})
    counts = {}
    for i in new:
        counts[i['check']] = counts.get(i['check'], 0) + 1
    md = [f"# 场景体检报告\n\n用时 {round(time.time() - t0)} 秒。统计：{r['stats']}\n\n新问题 {len(new)} 条（已知 {len(old)} 条）：" + '，'.join(f'{k} {v}' for k, v in counts.items()) + '\n']
    for c in ORDER + ['报错']:
        l = [i for i in new if i['check'] == c]
        if not l:
            continue
        md.append(f"## {c}（{CATEGORY.get(c, '程序缺陷')}，{len(l)} 条）\n")
        for i in l[:80]:
            md.append(f"- ({i['x']}, {i['z']}, 高 {i['y']}) ×{i['count']}：{i['msg']}" + (f"；可从 {i['from']} 走过来" if i.get('from') else '') + f"  `{i['sig']}`")
        if len(l) > 80:
            md.append(f"- ……另有 {len(l) - 80} 条，见 report.json")
        md.append('')
    with open(os.path.join(d, 'report.md'), 'w', encoding='utf8') as f:
        f.write('\n'.join(md))
    print(md[0])
    if stale:
        print(f'已登记但本轮未再出现 {len(stale)} 条（可能已修复，核实后从 tests/known_issues.json 移除）：', stale[:10])
    for c in ORDER:
        l = [i for i in new if i['check'] == c]
        for i in l[:6]:
            print(f"  [{c}] ({i['x']},{i['z']},{i['y']}) ×{i['count']} {i['msg'][:140]}")
        if len(l) > 6:
            print(f"  [{c}] ……共 {len(l)} 条")
    if arg('strict') and new:
        sys.exit(1)


if __name__ == '__main__':
    main()
