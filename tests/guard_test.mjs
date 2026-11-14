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

async function run() {
  const live = await server();
  const test = await server();
  const liveBase = `http://127.0.0.1:${live.port}`;
  const testHost = `localhost:${test.port}`;
  const testBase = `http://${testHost}`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const guard = await installGuard(context, { [testHost]: 'local-copy' });
  const page = await context.newPage();

  const report = {};
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
  await browser.close();

  // negative control: no serviceWorkers block
  const b2 = await chromium.launch({ headless: true });
  const c2 = await b2.newContext();
  const p2 = await c2.newPage();
  await p2.goto(liveBase + '/');
  const before = live.seen.writes.length;
  report.swWithoutBlock = await p2.evaluate(async () => {
    const r = await navigator.serviceWorker.register('/sw.js').then(() => 'register() resolved', (e) => `register() rejected: ${e.name}`);
    await new Promise((res) => setTimeout(res, 2000));
    return r;
  });
  report.swWithoutBlockReachedServer = live.seen.writes.slice(before);
  await b2.close();

  report.server = { liveWritesWithGuard: live.seen.writes.slice(0, before), liveUpgrades: live.seen.upgrades, testWrites: test.seen.writes, testUpgrades: test.seen.upgrades };
  live.s.close(); test.s.close();
  report.playwright = require('playwright/package.json').version;
  console.log(JSON.stringify(report, null, 2));

  const checks = [
    ['no write reached the undeclared (live) host, service worker included', before === 0],
    ['no WebSocket upgrade reached the live host', live.seen.upgrades === 0],
    ['writes to the declared local-copy host went through', test.seen.writes.length >= 4],
    ['external host POST was blocked', report.liveGuardLog.blocked_writes.some((b) => b.where.startsWith('example.com'))],
    ['without serviceWorkers block, a service worker write bypasses context.route (control)', report.swWithoutBlockReachedServer.includes('POST /sw-post')],
  ];
  let bad = 0;
  for (const [name, ok] of checks) { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`); if (!ok) bad++; }
  process.exit(bad ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(2); });
