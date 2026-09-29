// 开发：先构建，再起本地服务；src/ 或 public/ 改动后自动重新构建，页面自动刷新
import { watch } from 'node:fs';
import { join } from 'node:path';
import { serveDir } from './serve';

const root = join(import.meta.dir, '..'), port = Number(process.env.PORT ?? 5173);
const clients = new Set<ReadableStreamDefaultController>();
const build = async () => { const p = Bun.spawn(['bun', 'run', join(root, 'build.ts')], { stdout: 'inherit', stderr: 'inherit' }); return (await p.exited) === 0; };

await build();
// 页面订阅 /__reload（Server-Sent Events），构建成功后通知刷新
const inject = `<script>new EventSource('/__reload').onmessage = () => location.reload();</script>`;
const files = serveDir(join(root, 'dist'), 0, inject);
Bun.serve({
  port,
  fetch(req) {
    if (new URL(req.url).pathname === '/__reload') {
      const stream = new ReadableStream({ start(c) { clients.add(c); req.signal.addEventListener('abort', () => clients.delete(c)); } });
      return new Response(stream, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } });
    }
    return files.fetch(req);
  },
});
console.log(`开发服务：http://localhost:${port}/island.html#fp（改动 src/ 后自动重新构建并刷新）`);

let timer: ReturnType<typeof setTimeout> | undefined;
for (const d of ['src', 'public']) watch(join(root, d), { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(async () => { if (await build()) for (const c of clients) c.enqueue(new TextEncoder().encode('data: reload\n\n')); }, 150);
});
