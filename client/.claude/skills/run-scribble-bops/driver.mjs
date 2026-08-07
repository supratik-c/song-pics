#!/usr/bin/env node
// Driver for the run-scribble-bops skill. Builds the app, serves the built
// dist/ via `vite preview` (never the dev server — see SKILL.md), and drives
// it with Playwright. Commands:
//   node driver.mjs setup   — one-time: install playwright-core + Chromium (+ native libs if needed)
//   node driver.mjs smoke   — build, serve, run a scripted playthrough, screenshot, stop
//   node driver.mjs shot <path> [waitSelector] — ad hoc: nav to <path> on a
//                              running preview server, wait for selector, screenshot

import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.resolve(SKILL_DIR, '../../..');
const VENDOR_LIBS_DIR = path.join(SKILL_DIR, 'vendor-libs');
const SHOTS_DIR = path.join(SKILL_DIR, 'shots');
const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;

// Chromium needs libnspr4/libnss3/libasound2 at the OS level. The normal
// fix is `playwright install --with-deps`, which shells out to
// `apt-get install` and needs root. In a sandbox without passwordless sudo
// that fails fast (`sudo: interactive authentication is required`), not
// hangs — so we try the normal path first and only fall back to a no-root
// trick if it's actually unavailable: `apt-get download` fetches the .deb
// without installing it (no root required), then `dpkg-deb -x` extracts it
// into a local dir that we point LD_LIBRARY_PATH at instead of touching the
// system. Keep this fallback — it's what made the skill work at all before
// this container had real sudo access; a future fresh/locked-down container
// may need it again.
const NATIVE_DEB_PACKAGES = ['libnspr4', 'libnss3', 'libasound2t64'];

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited ${result.status}`);
  }
}

function libraryPathEnv() {
  const libDir = path.join(VENDOR_LIBS_DIR, 'usr/lib/x86_64-linux-gnu');
  // Only override LD_LIBRARY_PATH when we actually vendored libs — an
  // unconditional override would shadow the system libs for no reason on a
  // normal host, and vendoring only happens when the system libs are
  // missing (see setup()/vendorNativeLibsWithoutRoot()).
  if (!existsSync(libDir)) return process.env;
  return { ...process.env, LD_LIBRARY_PATH: libDir };
}

function vendorNativeLibsWithoutRoot() {
  const libDir = path.join(VENDOR_LIBS_DIR, 'usr/lib/x86_64-linux-gnu');
  if (existsSync(libDir) && readdirSync(libDir).some((f) => f.startsWith('libnspr4'))) {
    console.log('[setup] native libs already vendored, skipping');
    return;
  }
  console.log(`[setup] no root available — vendoring native libs manually: ${NATIVE_DEB_PACKAGES.join(', ')}`);
  const debDir = path.join(VENDOR_LIBS_DIR, '_debs');
  mkdirSync(debDir, { recursive: true });
  run('apt-get', ['download', ...NATIVE_DEB_PACKAGES], { cwd: debDir });
  for (const file of readdirSync(debDir)) {
    if (file.endsWith('.deb')) {
      run('dpkg-deb', ['-x', file, VENDOR_LIBS_DIR], { cwd: debDir });
    }
  }
}

function setup() {
  console.log('[setup] npm install (playwright-core) in skill dir');
  run('npm', ['install', '--no-audit', '--no-fund'], { cwd: SKILL_DIR });

  console.log('[setup] downloading Chromium browser binary');
  run('npx', ['playwright-core', 'install', 'chromium'], { cwd: SKILL_DIR });

  const depsCheck = spawnSync(
    'npx',
    ['playwright-core', 'install-deps', 'chromium', '--dry-run'],
    { cwd: SKILL_DIR, stdio: 'pipe' },
  );
  if (depsCheck.status === 0) {
    console.log('[setup] system dependencies already satisfied — nothing else to do');
    return;
  }

  console.log('[setup] system dependencies missing — trying `install --with-deps` (needs sudo)');
  const withDeps = spawnSync(
    'npx',
    ['playwright-core', 'install', '--with-deps', 'chromium'],
    { cwd: SKILL_DIR, stdio: 'inherit' },
  );
  if (withDeps.status === 0) {
    console.log('[setup] done via `install --with-deps`.');
    return;
  }

  vendorNativeLibsWithoutRoot();
  console.log('[setup] done via no-root fallback. Run `node driver.mjs smoke` next.');
}

function buildApp() {
  console.log('[build] npm ci && npm run build (in client/)');
  run('npm', ['ci'], { cwd: CLIENT_DIR });
  run('npm', ['run', 'build'], { cwd: CLIENT_DIR });
}

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server at ${url} did not come up within ${timeoutMs}ms`);
}

function startPreview() {
  console.log('[serve] npm run preview -- --port', PORT, '(serves client/dist, NOT the dev server)');
  const proc = spawn(
    'npm',
    ['run', 'preview', '--', '--port', String(PORT), '--strictPort'],
    { cwd: CLIENT_DIR, stdio: 'inherit', detached: true },
  );
  // Without unref(), Node's event loop stays alive waiting on this handle,
  // so a `serve` command that intentionally leaves the server running would
  // otherwise hang forever instead of returning control to the caller.
  proc.unref();
  return proc;
}

function stopPreview() {
  // `npm run preview &`'s PID is the npm wrapper, not vite — npm does not
  // forward signals to it, so killing the port's listener is what actually
  // frees it for the next run.
  const result = spawnSync('bash', ['-c', `lsof -ti:${PORT} -sTCP:LISTEN | xargs -r kill`]);
  if (result.status !== 0 && result.stderr?.length) {
    console.warn('[serve] stop warning:', result.stderr.toString());
  }
}

async function withPage(fn) {
  const { chromium } = await import(path.join(SKILL_DIR, 'node_modules/playwright-core/index.mjs'));
  const browser = await chromium.launch({ args: ['--no-sandbox'], env: libraryPathEnv() });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));
  try {
    await fn(page);
  } finally {
    if (errors.length) {
      console.warn('[console errors]', JSON.stringify(errors, null, 2));
    } else {
      console.log('[console] no errors');
    }
    await browser.close();
  }
}

async function smoke() {
  mkdirSync(SHOTS_DIR, { recursive: true });
  buildApp();
  const server = startPreview();
  try {
    await waitForServer(BASE_URL);
    await withPage(async (page) => {
      // 1. Initial load — today's puzzle.
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.screenshot({ path: path.join(SHOTS_DIR, '01-initial.png') });
      console.log('title:', await page.title());

      // 2. Wrong-guess flow.
      await page.fill('#guess-input', 'not the right answer');
      await page.click('#guess-form button[type="submit"]');
      await page.waitForSelector('#guess-list li');
      await page.screenshot({ path: path.join(SHOTS_DIR, '02-wrong-guess.png') });

      // 3. How-to-play modal. Buttons run a tactile press animation before
      // the click handler fires — screenshotting right after click() can
      // catch the dialog still closed. Wait for its content instead.
      await page.click('#how-to-play-button');
      await page.waitForSelector('#game-dialog-title', { timeout: 5000 });
      await page.screenshot({ path: path.join(SHOTS_DIR, '03-how-to-play.png') });
      await page.click('#game-dialog-close');

      // 4. Archive ("All Releases") — same tactile-delay caveat.
      await page.click('#all-releases-button');
      await page.waitForSelector('#game-dialog-title:has-text("All")', { timeout: 5000 });
      await page.screenshot({ path: path.join(SHOTS_DIR, '04-archive.png') });
      await page.click('#game-dialog-close');

      // 5. Narrow mobile viewport (320px accessibility floor is AGENTS.md
      // durable behavior — a wider 375px check here is a quick smoke check,
      // not the full accessibility pass).
      await page.setViewportSize({ width: 375, height: 800 });
      await page.reload({ waitUntil: 'networkidle' });
      await page.screenshot({ path: path.join(SHOTS_DIR, '05-mobile.png') });
      await page.setViewportSize({ width: 1280, height: 900 });

      // 6. Reveal Song — a spoiler-free way to reach the solved state
      // (doesn't require knowing today's actual answer).
      await page.reload({ waitUntil: 'networkidle' });
      await page.click('#reveal-song-button');
      await page.waitForSelector('#share-region:not([hidden])', { timeout: 5000 });
      await page.screenshot({ path: path.join(SHOTS_DIR, '06-revealed.png'), fullPage: true });
    });
    console.log(`[smoke] done. Screenshots in ${SHOTS_DIR}`);
  } finally {
    stopPreview();
  }
}

async function shot(urlPath = '/', waitSelector) {
  await withPage(async (page) => {
    await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: 'networkidle' });
    if (waitSelector) await page.waitForSelector(waitSelector, { timeout: 5000 });
    mkdirSync(SHOTS_DIR, { recursive: true });
    const out = path.join(SHOTS_DIR, 'shot.png');
    await page.screenshot({ path: out, fullPage: true });
    console.log('screenshot ->', out);
  });
}

const [, , command, ...args] = process.argv;
switch (command) {
  case 'setup':
    setup();
    break;
  case 'smoke':
    await smoke();
    break;
  case 'serve': {
    const server = startPreview();
    await waitForServer(BASE_URL);
    console.log(`[serve] up at ${BASE_URL} (pid ${server.pid}). Stop with: node driver.mjs stop`);
    break;
  }
  case 'stop':
    stopPreview();
    console.log('[serve] stopped');
    break;
  case 'shot':
    await shot(args[0] ?? '/', args[1]);
    break;
  default:
    console.error('Usage: node driver.mjs <setup|smoke|serve|stop|shot [path] [waitSelector]>');
    process.exit(1);
}
