# 共享测试框架：启动无头浏览器、把 CDN 请求路由到本地 three、收集报错、注入模拟库 sim.js
import os, sys, json, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NM = os.path.join(ROOT, 'node_modules', 'three')
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'island.html')
REPORTS = os.path.join(ROOT, 'reports')
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
SIM_JS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sim.js'), encoding='utf8').read()

# 已知且可忽略的控制台输出（环境相关，非项目缺陷）
IGNORED_CONSOLE = ['GPU stall due to ReadPixels', 'Automatic fallback to software WebGL', 'WebGL-', 'swiftshader']


def _route(route):
    u = route.request.url
    if 'cdn.jsdelivr.net/npm/three@0.160.0/' in u:
        route.fulfill(path=os.path.join(NM, u.split('three@0.160.0/')[1]), content_type='application/javascript')
    elif 'fonts.g' in u:
        route.fulfill(body='', content_type='text/css')
    else:
        route.continue_()


class Session:
    """一次页面会话：with Session('#fp,still,q=low') as s: s.js('...')"""

    def __init__(self, hash_='#fp,still,q=low', size=(320, 180), timeout=600000, ready="document.title.startsWith('done')"):
        # ready：页面就绪条件。still 模式渲染 3 帧后改标题；非 still 模式（主循环持续运行）可改为等加载遮罩完成
        self.hash, self.size, self.timeout, self.ready = hash_, size, timeout, ready
        self.console = []      # [(类型, 文本)]
        self.errors = []       # 未捕获异常

    def __enter__(self):
        self.pw = sync_playwright().start()
        self.browser = self.pw.chromium.launch(args=ARGS)
        self.page = self.browser.new_page(viewport={'width': self.size[0], 'height': self.size[1]})
        self.page.route('**/*', _route)
        self.page.on('pageerror', lambda e: self.errors.append(str(e)[:500]))
        self.page.on('console', self._on_console)
        t0 = time.time()
        self.page.goto(PAGE + self.hash)
        self.page.wait_for_function(self.ready, timeout=self.timeout)
        self.load_s = round(time.time() - t0, 1)
        self.page.evaluate(SIM_JS)
        return self

    def _on_console(self, m):
        if m.type not in ('error', 'warning'):
            return
        t = m.text
        if any(k in t for k in IGNORED_CONSOLE):
            return
        self.console.append((m.type, t[:500]))

    def js(self, code, arg=None):
        return self.page.evaluate(code, arg) if arg is not None else self.page.evaluate(code)

    def shot(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.page.screenshot(path=path, timeout=300000)

    def __exit__(self, *a):
        self.browser.close()
        self.pw.stop()


def report_dir(name):
    d = os.path.join(REPORTS, name)
    os.makedirs(d, exist_ok=True)
    return d


def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


def load_known():
    """已知问题清单：签名匹配的问题只报告为“已知”，不计入失败"""
    p = os.path.join(ROOT, 'tests', 'known_issues.json')
    if not os.path.exists(p):
        return {}
    with open(p, encoding='utf8') as f:
        return {k['sig']: k for k in json.load(f)}


def arg(name, default=None):
    """读取 --name=value 形式的命令行参数"""
    for a in sys.argv[1:]:
        if a == '--' + name:
            return True
        if a.startswith('--' + name + '='):
            return a.split('=', 1)[1]
    return default
