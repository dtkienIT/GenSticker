import { spawn, spawnSync } from 'node:child_process';

const windows = process.platform === 'win32';

function run(program, args) {
  const result = spawnSync(
    windows ? (process.env.ComSpec ?? 'cmd.exe') : program,
    windows ? ['/d', '/s', '/c', `${program}.cmd`, ...args] : args,
    { cwd: process.cwd(), env: process.env, stdio: 'inherit' },
  );
  if (result.status !== 0) {
    if (result.error) console.error(result.error);
    process.exit(result.status ?? 1);
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

run('npm', ['run', 'web:test:export']);
const server = spawn(process.execPath, ['scripts/serve-web-dist.mjs'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
});

try {
  await waitForServer('http://127.0.0.1:4173');
  run('npx', ['playwright', 'test']);
} finally {
  server.kill();
}
