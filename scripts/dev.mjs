import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));
const arguments_ = process.argv.slice(2);
if (arguments_.includes('--help')) {
  console.log('Usage: scripts\\dev.cmd [--port 4322]\nStarts the development site in this terminal. Press Ctrl+C to stop.');
  process.exit(0);
}
if (arguments_.length && (arguments_.length !== 2 || arguments_[0] !== '--port')) {
  console.error('Usage: scripts\\dev.cmd [--port 4322]');
  process.exit(1);
}
const port = arguments_.length ? Number(arguments_[1]) : 4322;
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('Choose a port between 1024 and 65535.');
  process.exit(1);
}
const url = `http://127.0.0.1:${port}`;
const normalizeRoot = (path) => process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path);

async function status() {
  try {
    const response = await fetch(`${url}/__portfolio-dev-status`, { signal: AbortSignal.timeout(1500) });
    if (!response.ok) return false;
    const data = await response.json();
    return data.app === 'sohaib-portfolio-dev' && typeof data.root === 'string' && normalizeRoot(data.root) === normalizeRoot(root);
  } catch { return false; }
}

async function homepageReady() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return false;
    return (await response.text()).includes('/@vite/client');
  } catch { return false; }
}

async function available() {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once('error', (error) => error.code === 'EADDRINUSE' ? resolvePort(false) : reject(error));
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolvePort(true)));
  });
}

async function start() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 24 || major % 2 !== 0) throw new Error(`Node.js 24 LTS or a newer even-numbered release is required; found ${process.version}.`);
  if (!existsSync(cli)) throw new Error('Dependencies are missing. Run npm ci in the project folder.');
  try { JSON.parse(readFileSync(new URL('../src/data/portfolio.json', import.meta.url), 'utf8')); }
  catch (error) { throw new Error(`Cannot read src/data/portfolio.json: ${error.message}`); }

  if (await status()) {
    if (!await homepageReady()) throw new Error(`The development server is running at ${url}, but the homepage failed to load. Check its terminal for the error.`);
    console.log(`Already running: ${url}\nSave src/data/portfolio.json and refresh this address.`);
    return;
  }
  if (!await available()) throw new Error(`Port ${port} is already in use. Close the existing server's terminal, or run scripts\\dev.cmd --port ${port + 1}. No existing process was stopped.`);

  console.log(`Starting portfolio with Node ${process.version}...\nRuntime: ${process.execPath}\nWaiting for the homepage to respond; keep this terminal open.`);
  // Run the CLI directly, in the foreground. Never consult or delete a saved PID file.
  const child = spawn(process.execPath, [cli, 'dev', '--host', '127.0.0.1', '--port', String(port), '--ignore-lock'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ASTRO_DEV_BACKGROUND: '1', ASTRO_TELEMETRY_DISABLED: '1' },
  });
  let exited = false;
  let stopping = false;
  const completion = new Promise((resolveExit, reject) => {
    child.once('error', (error) => { exited = true; reject(error); });
    child.once('exit', (code) => { exited = true; resolveExit(code ?? 1); });
  });
  // Attach immediately so an early process failure is always handled.
  completion.catch(() => {});
  const stop = () => {
    if (stopping) return;
    stopping = true;
    if (!exited) child.kill('SIGTERM');
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const began = Date.now();
  let ready = false;
  let lastNotice = began;
  try {
    while (!exited && !stopping) {
      if (await status() && await homepageReady()) {
        console.log(`\nREADY: ${url}\nSaved portfolio changes update here automatically. Press Ctrl+C to stop.`);
        ready = true;
        break;
      }
      if (Date.now() - began > 90000) {
        console.error(`\nStartup did not produce a working homepage within 90 seconds. Check the Astro error above, then retry scripts\\dev.cmd.`);
        stop();
        break;
      }
      if (Date.now() - lastNotice > 10000) {
        console.log('Still starting; the homepage is not ready yet...');
        lastNotice = Date.now();
      }
      await delay(350);
    }
    const code = await completion;
    if (!ready && !stopping) console.error(`\nDevelopment server exited before the page was ready (exit ${code}). Copy the error above when asking for help.`);
    process.exitCode = stopping && ready ? 0 : code || (ready ? 0 : 1);
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}

start().catch((error) => {
  console.error(`\nCannot start portfolio: ${error.message}`);
  process.exitCode = 1;
});
