// 构建：把各模块拼接为单页 HTML（dist/island.html）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url)), src = (f) => readFileSync(join(root, 'src', f), 'utf8');
// 后台线程代码（不依赖 three.js）：工具、布局、地形、地表、细节纹理、线程入口
const WORKER = ['01_util.js', '02_layout.js', '03_terrain.js', '04_ground.js', '04b_detail.js', 'worker_main.js'];
// 主线程代码（顺序即依赖顺序）
const MAIN = ['00_gen.js', '01_util.js', '02_layout.js', '03_terrain.js', '04_ground.js', '04b_detail.js', '05_scene.js', '06_struct_a.js', '06_struct_b.js',
  '07_vehicles.js', '08b_foliage.js', '08_vegetation.js', '09_animals.js', '11_fp.js', '12_grass.js', '13_drive.js', '14_boat.js', '15_marine.js', '16_heli.js', '10_main.js'];
const gen = `<script id="gensrc" type="text/plain">\n'use strict';\n${WORKER.map(src).join('\n')}\n</script>`;
const html = src('head.html').replace('<!--GENSRC-->', gen) + MAIN.map(src).join('\n') + src('tail.html');
const out = process.argv[2] || join(root, 'dist', 'island.html');
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, html);
console.log(`已生成 ${out}（${(html.length / 1024).toFixed(0)} KB）`);
