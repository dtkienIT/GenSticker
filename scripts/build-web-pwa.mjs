import { copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { generateSW } from 'workbox-build';

const mock = process.argv.includes('--mock');
function run(program, args, environment = process.env) {
  const windows = process.platform === 'win32';
  const result = spawnSync(
    windows ? (process.env.ComSpec ?? 'cmd.exe') : program,
    windows ? ['/d', '/s', '/c', `${program}.cmd`, ...args] : args,
    {
      cwd: process.cwd(),
      env: environment,
      stdio: 'inherit',
    },
  );
  if (result.status !== 0) {
    if (result.error) console.error(result.error);
    process.exit(result.status ?? 1);
  }
}

run('npm', ['run', 'web:runtime:stage']);
run(
  'npx',
  ['expo', 'export', '--platform', 'web', '--clear'],
  mock
    ? {
        ...process.env,
        EXPO_PUBLIC_STICKER_RUNTIME: 'mock',
        EXPO_PUBLIC_WEB_MODEL_SOURCE: 'local',
      }
    : {
        ...process.env,
        EXPO_PUBLIC_STICKER_RUNTIME: 'web',
        EXPO_PUBLIC_WEB_MODEL_SOURCE: process.env.EXPO_PUBLIC_WEB_MODEL_SOURCE ?? 'local',
      },
);
await copyFile('assets/images/icon.png', 'dist/pwa-icon.png');

const result = await generateSW({
  globDirectory: 'dist',
  globPatterns: ['**/*.{html,js,css,json,png,ico,wasm,mjs,webmanifest}'],
  swDest: 'dist/sw.js',
  navigateFallback: '/index.html',
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  maximumFileSizeToCacheInBytes: 30_000_000,
  runtimeCaching: [
    {
      urlPattern: /(?:model-lcm-sd15-v1\.0\.1|u2netp\.onnx)/,
      handler: 'CacheFirst',
      options: { cacheName: 'gensticker-model-lcm-sd15-chibi-1.0.1' },
    },
  ],
});

console.log(`Generated PWA service worker: ${result.count} files, ${result.size} precached bytes`);
