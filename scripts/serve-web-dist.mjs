import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const root = path.resolve('dist');
const port = Number(process.env.GENSTICKER_WEB_PORT ?? 4173);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json'],
  ['.wasm', 'application/wasm'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon'],
]);

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = path.resolve(root, requested);
  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    response.writeHead(403).end();
    return;
  }
  try {
    if (!statSync(filePath).isFile()) throw new Error('not a file');
  } catch {
    filePath = path.join(root, 'index.html');
  }
  const extension = path.extname(filePath);
  const stats = statSync(filePath);
  response.writeHead(200, {
    'Content-Type': types.get(extension) ?? 'application/octet-stream',
    'Content-Length': stats.size,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`GenSticker web build: http://127.0.0.1:${port}`);
});
