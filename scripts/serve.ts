// 静态服务：bun run preview 打开 dist/（资源外置后页面须经 http 打开）
// bun run dev 时由 dev.ts 调用，附带改动后自动重新构建与页面自动刷新
import { existsSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';

export function serveDir(dir: string, port: number, inject = ''): ReturnType<typeof Bun.serve> {
  return Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const rel = decodeURIComponent(url.pathname === '/' ? '/island.html' : url.pathname);
      const file = normalize(join(dir, rel));
      if (!file.startsWith(normalize(dir)) || !existsSync(file) || statSync(file).isDirectory()) return new Response('未找到', { status: 404 });
      if (inject && file.endsWith('.html')) {
        const html = (await Bun.file(file).text()).replace('</body>', `${inject}</body>`);
        return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
      }
      return new Response(Bun.file(file));
    },
  });
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 4173);
  serveDir(join(import.meta.dir, '..', 'dist'), port);
  console.log(`预览：http://localhost:${port}/island.html`);
}
