# 机位与图像工具：截图巡检、视觉回归共用
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# 固定机位：名称 → (相机位置, 注视点)。覆盖定稿设施与历史上出过问题的部位
FIXED = {
    '别墅西南': ((158, 17, -22), (180, 12, -46)),
    '别墅西北泳池': ((160, 16, -72), (180, 11, -56)),
    '别墅东立面': ((204, 14, -40), (180, 11.5, -46)),
    '泳池池边': ((166, 13, -58.6), (180, 10.5, -58.6)),
    '别墅屋顶': ((195, 30, -30), (181, 22, -46)),
    '住宅楼': ((30, 30, -110), (0, 18, -150)),
    '网球场': ((-25, 22, -90), (0, 13, -110)),
    '牛棚牧场': ((-170, 25, -30), (-201, 13, -58)),
    '农业区': ((-60, 18, 10), (-40, 6, -8)),
    '水闸': ((60, 14, 105), (30, 3, 126)),
    '泊港游艇': ((70, 12, 70), (30, 3, 87)),
    '游艇后甲板': ((62, 7, 92), (48, 3, 86)),
    '沙滩': ((-30, 8, 40), (0, 1, 20)),
    '东峰瞭望塔': ((250, 95, -175), (222, 70, -150)),
    '西山机场': ((-200, 50, -80), (-235, 39, -115)),
    '直升机尾桨': ((-235, 40.4, -103.8), (-235, 40.4, -107)),
    '风机光伏': ((300, 70, -40), (268, 48, -80)),
    '西端塔': ((-334, 48, 30), (-334, 24, -4)),
    '鸟瞰全岛': ((0, 420, 330), (0, 0, 0)),
}

# 页面端：把人物放到机位附近（刷新阴影与草地），再覆盖相机位置并渲染一帧
RENDER_JS = r'''([px, py, pz, tx, ty, tz]) => { const fp = __fp, st = fp._st, I = __island;
  // 固定动画时刻：水面、云层等时间 uniform 统一置 0，保证截图可复现（视觉回归依赖）
  for (const u of __statics.TIME_U || []) u.value = 0; for (const m of __statics.waterMats || []) if (m.uniforms && m.uniforms.uTime) m.uniforms.uTime.value = 0;
  st.pos.x = px; st.pos.z = pz; st.feet = py - 1.6; st.third = false; fp.update(1 / 60);
  const c = I.camera; c.position.set(px, py, pz); c.lookAt(tx, ty, tz); c.updateMatrixWorld();
  if (I.grass) I.grass.update(fp); I.shadowFollow(1); I.renderer.render(I.scene, c);
  const g = __dbg.gh(px, pz); return { camBelowGround: py < g + 0.2, ground: g }; }'''


def random_views(n, rng, probe):
    """随机机位：一半为人眼高度随机朝向，一半为对准随机设施的环绕视角。probe(x,z)→地面高度或 None（水面）"""
    out = []
    names = list(FIXED)
    tries = 0
    while len(out) < n and tries < n * 30:
        tries += 1
        if len(out) % 2 == 0:
            x, z = rng.uni(-340, 340), rng.uni(-200, 200)
            g = probe(x, z)
            if g is None or g < 0.5:
                continue
            a = rng.uni(-math.pi, math.pi)
            out.append((f'随机人眼{len(out):02d}', (round(x, 1), round(g + 1.65, 2), round(z, 1)), (round(x + math.cos(a) * 20, 1), round(g + 1.2, 2), round(z + math.sin(a) * 20, 1))))
        else:
            _, tgt = FIXED[rng.pick(names[:-1])]
            a, R, h = rng.uni(-math.pi, math.pi), rng.uni(18, 45), rng.uni(4, 18)
            x, z = tgt[0] + math.cos(a) * R, tgt[2] + math.sin(a) * R
            g = probe(x, z)
            if g is None:
                g = 0
            out.append((f'随机环绕{len(out):02d}', (round(x, 1), round(max(g + 2, tgt[1] + h), 2), round(z, 1)), tgt))
    return out


def auto_flags(path):
    """图像自动检查：返回可疑项列表"""
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    h, w, _ = im.shape
    im = im[:int(h * 0.9)]                       # 去掉底部界面条
    lum = im.mean(axis=2)
    flags = []
    if lum.std() < 6:
        flags.append('画面几乎单色（相机可能在物体内部或渲染失败）')
    if (lum < 6).mean() > 0.25:
        flags.append(f'大面积纯黑 {round((lum < 6).mean() * 100)}%（法线反转/缺光照/穿模）')
    mag = (im[:, :, 0] > 200) & (im[:, :, 1] < 40) & (im[:, :, 2] > 200)
    if mag.mean() > 0.01:
        flags.append('出现洋红色块（贴图缺失）')
    if (lum > 250).mean() > 0.35:
        flags.append('大面积过曝纯白')
    return flags


def contact_sheet(items, out_path, cols=3, cell=(426, 240)):
    """把若干截图拼成带标题的总览图，便于人工按缺陷清单逐张审阅"""
    rows = math.ceil(len(items) / cols)
    sheet = Image.new('RGB', (cols * cell[0], rows * (cell[1] + 22)), (24, 24, 24))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 15)
    except Exception:
        font = ImageFont.load_default()
    for i, (title, p) in enumerate(items):
        im = Image.open(p).convert('RGB').resize(cell)
        x, y = (i % cols) * cell[0], (i // cols) * (cell[1] + 22)
        sheet.paste(im, (x, y + 22))
        draw.text((x + 4, y + 3), title, fill=(240, 240, 240), font=font)
    sheet.save(out_path)


def image_diff(a, b):
    """视觉回归：返回（差异像素占比，平均差值）。差异像素 = 任一通道差值 > 40"""
    A = np.asarray(Image.open(a).convert('RGB')).astype(np.int16)
    B = np.asarray(Image.open(b).convert('RGB')).astype(np.int16)
    if A.shape != B.shape:
        return 1.0, 255.0
    d = np.abs(A - B)
    return float((d.max(axis=2) > 40).mean()), float(d.mean())


def diff_image(a, b, out):
    A = np.asarray(Image.open(a).convert('RGB')).astype(np.int16)
    B = np.asarray(Image.open(b).convert('RGB')).astype(np.int16)
    d = (np.abs(A - B).max(axis=2) > 40)
    vis = (B * 0.35).astype(np.uint8)
    vis[d] = [255, 0, 80]
    Image.fromarray(np.concatenate([A.astype(np.uint8), B.astype(np.uint8), vis], axis=1)).save(out)
