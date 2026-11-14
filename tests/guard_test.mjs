// guard_test.mjs — runtime check of flow-walk/scripts/guard.mjs with a real browser.
//
//   PLAYWRIGHT_DIR=/path/with/node_modules node tests/guard_test.mjs
//
// Needs Playwright and a Chromium build (`npx playwright install chromium`).
// Starts two local servers: 127.0.0.1:<live> is NOT declared (so it is
// read-only-live) and localhost:<test> is declared local-copy. Each server
// counts the writes and WebSocket upgrades it actually receives, so the result
// is measured at the server, not taken from the guard's own log. One external
// host (example.com) checks that undeclared remote hosts are guarded too.

import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { installGuard } from '../.flowchad/skills/flow-walk/scripts/guard.mjs';

const require = createRequire(path.join(process.env.PLAYWRIGHT_DIR || process.cwd(), 'noop.js'));
const { chromium } = require('playwright');

function server() {
  const seen = { writes: [], upgrades: 0 };
  const s = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) seen.writes.push(`${req.method} ${req.url}`);
      const cors = { 'access-control-allow-origin': '*' };
      if (req.url === '/sw.js' || req.url === '/worker.js') {
        const js = req.url === '/sw.js'
          ? `self.addEventListener('install', (e) => e.waitUntil(fetch('/sw-post', { method: 'POST', body: 'x' }).catch(() => {})));`
          : `fetch('/w-post', { method: 'POST', body: 'x' }).catch(() => {}); postMessage('sent');`;
        res.writeHead(200, { 'content-type': 'text/javascript', ...cors });
        return res.end(js);
      }
      if (req.url.startsWith('/frame')) {
        res.writeHead(200, { 'content-type': 'text/html' });
        return res.end(`<form id=f method=post action="/iframe-post"><input name=a value=1></form>
          <script>document.getElementById('f').submit()</script>`);
      }
      res.writeHead(200, { 'content-type': 'text/html', ...cors });
      res.end(`<!doctype html><title>t</title><form id=f method=post action="/form-post"><input name=a value=1></form>`);
    });
  });
  s.on('upgrade', (req, socket) => { seen.upgrades += 1; socket.destroy(); });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r({ s, seen, port: s.address().port })));
}

const exercise = async (page, base, other) => {
  return page.evaluate(async ({ base, other }) => {
    const out = {};
    const settle = (p) => p.then(() => 'sent', (e) => `error: ${e.message || e}`);
    out.fetch = await settle(fetch(`${base}/fetch-post`, { method: 'POST', body: 'x' }));
    out.put = await settle(fetch(`${base}/fetch-put`, { method: 'PUT', body: 'x' }));
    out.xhr = await new Promise((r) => {
      const x = new XMLHttpRequest();
      x.open('POST', `${base}/xhr-post`);
      x.onload = () => r('sent'); x.onerror = () => r('error');
      x.send('x');
    });
    out.beacon = navigator.sendBeacon(`${base}/beacon`, 'x');
    out.worker = await new Promise((r) => {
      try {
        const w = new Worker(`${base}/worker.js`);
        w.onmessage = () => r('ran'); w.onerror = (e) => r(`error ${e.message}`);
        setTimeout(() => r('timeout'), 3000);
      } catch (e) { r(`error ${e.message}`); }
    });
    out.ws = await new Promise((r) => {
      const ws = new WebSocket(base.replace('http', 'ws') + '/ws');
      ws.onopen = () => r('open'); ws.onclose = () => r('closed'); ws.onerror = () => r('error');
      setTimeout(() => r('timeout'), 3000);
    });
    out.sw = 'serviceWorker' in navigator
      ? await navigator.serviceWorker.register(`/sw.js`).then(() => 'register() resolved', (e) => `register() rejected: ${e.name}`)
      : 'serviceWorker API absent';
    await new Promise((r) => setTimeout(r, 2000)); // give an installing worker time to send
    if (other) out.crossToExternal = await settle(fetch(other, { method: 'POST', body: 'x', mode: 'no-cors' }));
    return out;
  }, { base, other });
};

async function scenario(browser, attachedOverCDP, label) {
  const live = await server();
  const test = await server();
  const liveBase = `http://127.0.0.1:${live.port}`;
  const testHost = `localhost:${test.port}`;
  const testBase = `http://${testHost}`;
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const guard = await installGuard(context, { [testHost]: 'local-copy' }, { attachedOverCDP });
  const page = await context.newPage();

  const report = { label };
  await page.goto(liveBase + '/');
  report.live = await exercise(page, liveBase, 'https://example.com/flowchad-guard-test');
  // form POST navigation on the live host
  await Promise.all([page.waitForLoadState('load').catch(() => {}), page.evaluate(() => document.getElementById('f').submit())]);
  await page.waitForTimeout(1000);
  // iframe on the live host that posts a form
  await page.goto(liveBase + '/');
  await page.evaluate((u) => { const f = document.createElement('iframe'); f.src = u; document.body.appendChild(f); }, liveBase + '/frame');
  await page.waitForTimeout(1500);
  // popup on the live host that posts
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.evaluate((u) => window.open(u), liveBase + '/'),
  ]);
  await popup.waitForLoadState('load');
  await popup.evaluate(() => fetch('/popup-post', { method: 'POST', body: 'x' }).catch(() => {}));
  await page.waitForTimeout(500);
  report.liveGuardLog = guard.take();

  await page.goto(testBase + '/');
  report.test = await exercise(page, testBase, null);
  await page.waitForTimeout(1000);
  report.testGuardLog = guard.take();
  await context.close();

  // control: same browser, no serviceWorkers block, no guard
  const c2 = await browser.newContext();
  const p2 = await c2.newPage();
  await p2.goto(liveBase + '/');
  const before = live.seen.writes.length;
  report.swWithoutBlock = await p2.evaluate(async () => {
    const r = await navigator.serviceWorker.register('/sw.js').then(() => 'register() resolved', (e) => `register() rejected: ${e.name}`);
    await new Promise((res) => setTimeout(res, 2000));
    return r;
  });
  report.swWithoutBlockReachedServer = live.seen.writes.slice(before);
  await c2.close();

  report.server = { liveWritesWithGuard: live.seen.writes.slice(0, before), liveUpgrades: live.seen.upgrades, testWrites: test.seen.writes, testUpgrades: test.seen.upgrades };
  live.s.close(); test.s.close();
  console.log(JSON.stringify(report, null, 2));
  return [
    [`${label}: no write reached the undeclared (live) host, service worker included`, before === 0],
    [`${label}: no WebSocket upgrade reached the live host`, live.seen.upgrades === 0],
    [`${label}: writes to the declared local-copy host went through`, test.seen.writes.length >= 4],
    [`${label}: external host POST was blocked`, report.liveGuardLog.blocked_writes.some((b) => b.where.startsWith('example.com'))],
    [`${label}: without serviceWorkers block, a service worker write bypasses context.route (control)`, report.swWithoutBlockReachedServer.includes('POST /sw-post')],
    [`${label}: unguarded notes ${attachedOverCDP ? 'name the CDP mode' : 'are empty'}`,
      attachedOverCDP ? report.testGuardLog.unguarded.some((n) => n.includes('CDP')) : report.testGuardLog.unguarded.length === 0],
  ];
}

async function unitChecks() {
  const { validateSurfaces, isWritable } = await import('../.flowchad/skills/flow-walk/scripts/guard.mjs');
  const throws = (t) => { try { validateSurfaces(t); return false; } catch { return true; } };
  const fakeContext = () => {
    const handlers = {};
    return {
      handlers,
      route: async (_p, h) => { handlers.route = h; },
      routeWebSocket: async (_p, h) => { handlers.ws = h; },
      on: () => {},
      browser: () => ({ browserType: () => ({ name: () => 'chromium' }) }),
    };
  };
  const ctx = fakeContext();
  const g = await installGuard(ctx, { 'ok.test': 'local-copy' });
  let aborted = false; let continued = false;
  await ctx.handlers.route({
    request: () => { throw new Error('boom'); },
    abort: async () => { aborted = true; },
    continue: async () => { continued = true; },
  });
  const firefox = fakeContext();
  firefox.browser = () => ({ browserType: () => ({ name: () => 'firefox' }) });
  const gf = await installGuard(firefox, {});
  return [
    ['unit: typo mode is rejected', throws({ 'a.test': 'read-only' })],
    ['unit: unknown mode is rejected', throws({ 'a.test': 'production' })],
    ['unit: null table is rejected', throws(null)],
    ['unit: array table is rejected', throws(['local-copy'])],
    ['unit: installGuard rejects a bad table before routing', await installGuard(fakeContext(), { 'a.test': 'staging' }).then(() => false, () => true)],
    ['unit: host "constructor" is not writable', !isWritable({}, 'http://constructor/x')],
    ['unit: host "__proto__" is not writable', !isWritable({}, 'http://__proto__/x')],
    ['unit: an own "__proto__" key with a bad mode is rejected', throws(JSON.parse('{"__proto__": "production"}'))],
    ['unit: declared host is writable', isWritable({ 'ok.test': 'local-copy' }, 'https://ok.test/a')],
    ['unit: read-only-live declared host is not writable', !isWritable({ 'ok.test': 'read-only-live' }, 'https://ok.test/a')],
    ['unit: a guard error aborts the request', aborted && !continued && g.take().unguarded.some((n) => n.includes('guard error'))],
    ['unit: unguarded notes persist across take()', g.take().unguarded.length === 1],
    ['unit: non-Chromium engine is noted', gf.take().unguarded.some((n) => n.includes('firefox'))],
  ];
}

async function run() {
  const checks = await unitChecks();

  const launched = await chromium.launch({ headless: true });
  checks.push(...(await scenario(launched, false, 'launched')));
  await launched.close();

  if (process.env.GUARD_TEST_CDP !== '0') {
    const port = 9300 + Math.floor(Math.random() * 500);
    const host = await chromium.launch({ headless: true, args: [`--remote-debugging-port=${port}`] });
    const attached = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    checks.push(...(await scenario(attached, true, 'cdp')));
    await attached.close().catch(() => {});
    await host.close();
  }

  console.log(`playwright ${require('playwright/package.json').version}`);
  let bad = 0;
  for (const [name, ok] of checks) { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`); if (!ok) bad++; }
  process.exit(bad ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(2); });
