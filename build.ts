// 构建：Bun 打包 → 单个 HTML（全部代码内联，含 three.js 与后台线程）+ 外置资源目录 assets/
// 用法：bun run build [输出目录，默认 dist]
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = import.meta.dir;
const outDir = process.argv[2] ?? join(root, 'dist');

async function bundle(entry: string, format: 'esm' | 'iife'): Promise<string> {
  const r = await Bun.build({ entrypoints: [join(root, entry)], target: 'browser', format, minify: true, sourcemap: 'none' });
  if (!r.success) { for (const l of r.logs) console.error(l); throw new Error(`打包失败：${entry}`); }
  if (r.outputs.length !== 1) throw new Error(`${entry} 产生了 ${r.outputs.length} 个输出，应为 1 个（不应有代码分割或资源引用）`);
  return r.outputs[0].text();
}

// 内联进 <script> 时，代码里出现的 "</script" 会提前结束标签，需转义
const inline = (code: string) => code.replace(/<\/script/gi, '<\\/script');

const t0 = performance.now();
const [worker, main] = await Promise.all([bundle('src/worker/entry.ts', 'iife'), bundle('src/main.ts', 'esm')]);
// 后台线程代码以纯文本放在页面里，由 core/generate 读取后生成 Blob 启动 Worker（失败时回退主线程）
const scripts = `<script id="gensrc" type="text/plain">\n${inline(worker)}\n</script>\n<script type="module">\n${inline(main)}\n</script>`;
const html = readFileSync(join(root, 'src/index.html'), 'utf8').replace('<!--SCRIPTS-->', () => scripts);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'island.html'), html);
cpSync(join(root, 'public'), outDir, { recursive: true });
console.log(`已生成 ${join(outDir, 'island.html')}（${(html.length / 1024).toFixed(0)} KB，后台线程 ${(worker.length / 1024).toFixed(0)} KB）与 assets/，用时 ${Math.round(performance.now() - t0)} ms`);
