# 视觉回归：固定机位截图与基线图逐像素比对
#   基线：tests/baseline/visual/*.png（改动基线必须单独提交并说明原因，见 CLAUDE.md）
#   结果：reports/visual/（当前图、差异图、report.md）
# 用法：python3 tests/visual_regression.py            # 比对，超出阈值退出码 1
#       python3 tests/visual_regression.py --update   # 用当前画面重写基线
import os, sys, shutil
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import Session, report_dir, arg, ROOT
from views import FIXED, RENDER_JS, image_diff, diff_image

# 回归机位（从巡检固定机位中选取，覆盖别墅/泳池/游艇/直升机/住宅楼/水闸/沙滩/全岛）
VIEWS = ['别墅西南', '别墅西北泳池', '别墅东立面', '泳池池边', '住宅楼', '水闸', '游艇后甲板', '沙滩', '直升机尾桨', '鸟瞰全岛']
SIZE = (640, 360)
FAIL_FRAC = 0.01      # 差异像素占比超过 1% 判为失败（截图前固定动画时刻，两次渲染的差异实测 ≤ 0.13%）
BASE = os.path.join(ROOT, 'tests', 'baseline', 'visual')


def main():
    update = bool(arg('update'))
    out = report_dir('visual')
    os.makedirs(BASE, exist_ok=True)
    rows, failed = [], []
    with Session('#fp,still,q=high,clean', size=SIZE) as s:
        for i, name in enumerate(VIEWS):
            pos, tgt = FIXED[name]
            s.js(RENDER_JS, [*pos, *tgt])
            cur = os.path.join(out, f'{i:02d}.png')
            s.shot(cur)
            base = os.path.join(BASE, f'{i:02d}.png')
            if update or not os.path.exists(base):
                shutil.copy(cur, base)
                rows.append((i, name, '已写入基线', 0, 0))
                continue
            frac, mean = image_diff(base, cur)
            ok = frac <= FAIL_FRAC
            if not ok:
                failed.append(name)
                diff_image(base, cur, os.path.join(out, f'{i:02d}_diff.png'))
            rows.append((i, name, '通过' if ok else '失败', round(frac * 100, 2), round(mean, 2)))
            print(f"{i:02d} {name:<10} {'通过' if ok else '失败'}  差异像素 {round(frac * 100, 2)}%  平均差 {round(mean, 2)}")
    md = ['# 视觉回归\n', f'阈值：差异像素占比 ≤ {FAIL_FRAC * 100}%（任一通道差值 > 40 计为差异）。失败项的对比图为 `NN_diff.png`（基线 | 当前 | 差异）。\n',
          '| # | 机位 | 结果 | 差异像素 % | 平均差 |', '|---|---|---|---|---|'] + [f'| {i:02d} | {n} | {r} | {f} | {m} |' for i, n, r, f, m in rows]
    with open(os.path.join(out, 'report.md'), 'w', encoding='utf8') as f:
        f.write('\n'.join(md) + '\n')
    if failed:
        print('视觉回归失败：', '、'.join(failed), '；对比图见 reports/visual/')
        sys.exit(1)
    print('视觉回归通过' if not update else f'已更新 {len(VIEWS)} 张基线')


if __name__ == '__main__':
    main()
