import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const modelRoot = path.resolve(
  process.env.GENSTICKER_MODEL_ROOT ?? 'model_artifacts/model-lcm-sd15-v1.0.1',
);
const port = Number(process.env.GENSTICKER_MODEL_PORT ?? 8790);

function contentType(filePath) {
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.onnx')) return 'application/octet-stream';
  return 'application/octet-stream';
}

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  const relativePath = pathname.replace(/^\/+/, '');
  const resolved = path.resolve(modelRoot, relativePath);
  const relative = path.relative(modelRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
}

function parseRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match) return false;
  let start = match[1] === '' ? undefined : Number(match[1]);
  let end = match[2] === '' ? undefined : Number(match[2]);
  if (start === undefined) {
    const suffix = end;
    if (!suffix || suffix <= 0) return false;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    end = end === undefined ? size - 1 : Math.min(end, size - 1);
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
    return false;
  }
  return { start, end };
}

const server = createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  response.setHeader('Accept-Ranges', 'bytes');

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
    });
    response.end();
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD, OPTIONS' });
    response.end();
    return;
  }

  const filePath = resolveRequestPath(request.url ?? '/');
  if (!filePath) {
    response.writeHead(403);
    response.end();
    return;
  }

  let stats;
  try {
    stats = statSync(filePath);
    if (!stats.isFile()) throw new Error('not a file');
  } catch {
    response.writeHead(404);
    response.end();
    return;
  }

  const range = parseRange(request.headers.range, stats.size);
  if (range === false) {
    response.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
    response.end();
    return;
  }
  const start = range?.start ?? 0;
  const end = range?.end ?? stats.size - 1;
  const headers = {
    'Content-Type': contentType(filePath),
    'Content-Length': String(end - start + 1),
  };
  if (range) {
    headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
  }
  response.writeHead(range ? 206 : 200, headers);
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(filePath, { start, end }).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`GenSticker model root: ${modelRoot}`);
  console.log(`GenSticker model server: http://127.0.0.1:${port}`);
});
