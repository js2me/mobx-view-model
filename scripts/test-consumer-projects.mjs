import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const consumers = [
  {
    name: 'githome',
    dir: resolve(process.env.GITHOME_DIR ?? resolve(rootDir, '../githome')),
    base: process.env.GITHOME_BASE ?? 'http://127.0.0.1:1420',
  },
  {
    name: 'gozon',
    dir: resolve(process.env.GOZON_DIR ?? resolve(rootDir, '../gozon')),
    base: process.env.GOZON_BASE ?? 'http://127.0.0.1:6473',
  },
];

const servers = [];

const run = (command, args, { cwd = rootDir, env = {} } = {}) =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });
    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      rejectRun(
        new Error(
          `${command} ${args.join(' ')} failed in ${cwd} ` +
            `(code ${code ?? 'null'}, signal ${signal ?? 'none'})`,
        ),
      );
    });
  });

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const waitForServer = async (consumer) => {
  const deadline = Date.now() + 60_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(consumer.base, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error(
    `${consumer.name} did not become ready at ${consumer.base}: ${String(lastError)}`,
  );
};

const stopServer = (child) => {
  if (!child.pid || child.exitCode !== null || child.killed) return;
  // The dev server can have child processes (tsx/vite), so stop its process
  // group instead of leaking a server into the next consumer scenario.
  process.kill(-child.pid, 'SIGTERM');
};

const waitForExit = (child) =>
  child.exitCode !== null ? Promise.resolve() : once(child, 'exit');

const cleanup = () => {
  for (const server of servers.reverse()) {
    try {
      stopServer(server);
    } catch {
      // A process may have already exited after a failed readiness check.
    }
  }
};

process.once('SIGINT', () => {
  cleanup();
  process.exitCode = 130;
});
process.once('SIGTERM', () => {
  cleanup();
  process.exitCode = 143;
});

for (const consumer of consumers) {
  if (!existsSync(resolve(consumer.dir, 'package.json'))) {
    throw new Error(
      `${consumer.name} is not available at ${consumer.dir}. ` +
        `Set ${consumer.name.toUpperCase()}_DIR to its checkout.`,
    );
  }
}

try {
  console.log('\n1/3 Build library artifacts used by consumer projects');
  await run('pnpm', ['build']);

  for (const consumer of consumers) {
    console.log(`\nStart ${consumer.name} at ${consumer.base}`);
    const server = spawn('pnpm', ['dev'], {
      cwd: consumer.dir,
      detached: true,
      env: process.env,
      stdio: 'inherit',
    });
    servers.push(server);
    await Promise.race([
      waitForServer(consumer),
      once(server, 'error').then(([error]) => Promise.reject(error)),
      once(server, 'exit').then(([code, signal]) =>
        Promise.reject(
          new Error(
            `${consumer.name} dev server exited before readiness ` +
              `(code ${code ?? 'null'}, signal ${signal ?? 'none'})`,
          ),
        ),
      ),
    ]);

    console.log(`Run ${consumer.name} lifecycle browser scenario`);
    await run('pnpm', ['check:browser'], {
      cwd: consumer.dir,
      env: { BASE: consumer.base },
    });

    stopServer(server);
    await waitForExit(server);
  }
} finally {
  cleanup();
}
