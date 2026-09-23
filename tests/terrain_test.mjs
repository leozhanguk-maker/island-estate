// 地形回归测试：关键点高程、道路坡度、海岸指标（基线为定稿布局）
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const code = ['01_util.js', '02_layout.js', '03_terrain.js'].map(f => readFileSync(join(root, 'src', f), 'utf8')).join('\n');
const run = new Function(code + '\nreturn { buildTerrain, sampleGrid, GN, G, TAU };')();
const { buildTerrain, sampleGrid, G } = run;
const t0 = Date.now(), X = buildTerrain(), H = X.H;
let fail = 0; const ok = (c, msg) => { console.log((c ? '通过 ' : '失败 ') + msg); if (!c) fail++; };
const BASE = { '住宅楼': [0, -150, 15.0], '别墅': [181, -47, 11.2], '淡水湖底': [181, -78, 7.4], '直升机平台': [-226, -123, 38.0], '西端塔': [-334, -4, 20.0],
  '光伏北缘': [268, -78, 48.8], '停车场': [216, 21, 8.6], '牛棚': [-201, -58, 13.0], '沙滩': [0, 25, 0.8, 0.15], '水道': [0, 160, -10.4], '北脊': [0, -188, 36.6], '东峰平台': [222, -150, 57.2] };
// 第 4 项为单点容差（默认 ±0.5）；沙滩按连续缓坡公式（水线起约 1:16）确定，无噪声项，故收紧
for (const k in BASE) { const [x, z, h, tol = 0.5] = BASE[k], v = sampleGrid(H, x, z); ok(Math.abs(v - h) <= tol, `${k} 高程 ${v.toFixed(2)}（基线 ${h} ±${tol}）`); }
for (const r of X.roads) {
  let g = 0; for (let i = 10; i < r.pts.length; i++) { let d = 0; for (let q = i - 9; q <= i; q++) d += Math.hypot(r.pts[q][0] - r.pts[q - 1][0], r.pts[q][1] - r.pts[q - 1][1]); g = Math.max(g, Math.abs(r.pts[i][2] - r.pts[i - 10][2]) / d); }
  const lim = r.id.startsWith('R') ? 0.135 : r.id === 'VILLA' ? 0.125 : 0.1;
  ok(g <= lim, `道路 ${r.id} 最大坡度 ${(g * 100).toFixed(1)}%（上限 ${(lim * 100).toFixed(1)}%）`);
}
const ring = []; for (let k = 0; k < G.nx * G.nz; k++) { const d = X.sdC[k]; if (d > 9.5 && d < 10.5) { const x = G.x0 + k % G.nx, z = G.z0 + Math.floor(k / G.nx); if (!(Math.abs(x) < 70 && z > 90)) ring.push(H[k]); } }
const m = ring.reduce((a, b) => a + b, 0) / ring.length, sd = Math.sqrt(ring.reduce((a, b) => a + (b - m) ** 2, 0) / ring.length);
ok(sd >= 5, `崖顶高度标准差 ${sd.toFixed(1)} 米（≥ 5）`);
let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) if (H[j * G.nx + i] > 0.5) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); z0 = Math.min(z0, j); z1 = Math.max(z1, j); }
console.log(`陆地范围 东西 ${x1 - x0} 米，南北 ${z1 - z0} 米；地形生成 ${Date.now() - t0} 毫秒`);
if (fail) { console.log(`\n${fail} 项失败`); process.exit(1); } else console.log('\n地形回归全部通过');
