# 前后对比截图：视觉修改的 PR 必须附同机位的修改前后对比图（见 CLAUDE.md 合并策略）
# 用法：
#   python3 tests/compare_shots.py --out=reports/compare/before [--only=汀步,厨房吊柜]   # 修改前截图
#   （修改、构建）
#   python3 tests/compare_shots.py --out=reports/compare/after  [--only=...]            # 修改后截图
#   python3 tests/compare_shots.py --compose=reports/compare/before,reports/compare/after --out=docs/visual_fixes
# 机位：名称 → (相机位置, 注视点, 可选的页面准备脚本)。准备脚本在渲染前执行，可用于摆放车辆等
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import Session, arg
from views import RENDER_JS
from PIL import Image, ImageDraw, ImageFont

VIEWS = {
    '汀步': ((177.5, 14.5, -71.5), (171.3, 11.0, -65.8), None),
    '厨房吊柜': ((190.2, 14.1, -41.2), (182.5, 13.7, -39.9), None),
    '住宅楼入口': ((15.5, 17.2, -125.5), (6, 15.1, -135), None),
    '栈桥桩柱水下': ((13, -3.5, 87), (3.5, -4.5, 87), None),
    '水闸墩水下': ((12, -4.5, 112), (0, -6, 126), None),
    '鸡舍窗': ((-97, 6.6, 55.5), (-97, 5.6, 48), None),
    '别墅南门花池': ((182, 13.4, -30.5), (177, 11.5, -36.5), None),
    '塔顶控制台': ((216.4, 79.3, -145.8), (219.8, 78.3, -147.55), None),
    '机库地坪': ((-195, 41, -125), (-211, 38.1, -135), None),
    # 车辆停在别墅进场路坡顶（巡逻“车底入地”位置），从侧面平视车底
    '车越坡顶': ((73.4, 8.5, -38.6), (70.5, 8.0, -42.7), "() => { const D = __dbg, c = D.DRIVE.cars[0]; c.x = 70.51; c.z = -42.74; c.yaw = 1.2; c.v = 0; D.DRIVE.active = c; for (let i = 0; i < 30; i++) D.updateDrive(1 / 60, new Set(), __island.camera, __fp); D.DRIVE.active = null; }"),
}


def shoot(out, only):
    os.makedirs(out, exist_ok=True)
    with Session('#fp,still,q=high,clean', size=(960, 540)) as s:
        for name, (pos, tgt, prep) in VIEWS.items():
            if only and name not in only:
                continue
            if prep:
                s.js(prep)
            s.js(RENDER_JS, [*pos, *tgt])
            s.shot(os.path.join(out, f'{name}.png'))
            print('截图', name)


def compose(before, after, out):
    os.makedirs(out, exist_ok=True)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 22)
    except Exception:
        font = ImageFont.load_default()
    for f in sorted(os.listdir(after)):
        if not f.endswith('.png') or not os.path.exists(os.path.join(before, f)):
            continue
        a, b = Image.open(os.path.join(before, f)).convert('RGB'), Image.open(os.path.join(after, f)).convert('RGB')
        w, h = a.size
        im = Image.new('RGB', (w * 2 + 8, h + 36), (24, 24, 24))
        im.paste(a, (0, 36)); im.paste(b, (w + 8, 36))
        d = ImageDraw.Draw(im)
        d.text((10, 6), f'{f[:-4]}：修改前', fill=(255, 210, 120), font=font)
        d.text((w + 18, 6), f'{f[:-4]}：修改后', fill=(140, 230, 150), font=font)
        p = os.path.join(out, f[:-4] + '.jpg')
        im.save(p, quality=82)
        print('对比图', p)


if __name__ == '__main__':
    c = arg('compose')
    if c:
        b, a = c.split(',')
        compose(b, a, arg('out', 'docs/visual_fixes'))
    else:
        o = arg('only')
        shoot(arg('out', 'reports/compare/before'), set(o.split(',')) if o else None)
