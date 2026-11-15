// measure_test.mjs — flow-walk/scripts/measure.mjs in a real browser.
//
//   PLAYWRIGHT_DIR=/path/with/node_modules node tests/measure_test.mjs
//
// Needs Playwright and a Chromium build, like tests/guard_test.mjs. Pages are
// set with page.setContent: no server, no network.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { measureStep, mergeWidths } from '../.flowchad/skills/flow-walk/scripts/measure.mjs';

const require = createRequire(path.join(process.env.PLAYWRIGHT_DIR || process.cwd(), 'noop.js'));
const { chromium } = require('playwright');

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
let failures = 0;
const test = async (name, fn) => {
  try { await fn(); console.log(`ok   ${name}`); } catch (e) { failures++; console.log(`FAIL ${name}\n     ${e.message}`); }
};

const report = (h) => `<div style="height:${h}px">Report: five checks, three warnings and a long explanation</div>`;
const page1 = (h) => `<!doctype html><body style="margin:0"><main>${report(h)}<label>Site <input id="site"></label><button id="go">Continue</button></main></body>`;

await test('primary visible at the top: 0 viewport heights', async () => {
  await page.setContent(page1(100));
  const m = await measureStep(page, { primary: '#site' });
  assert.equal(m.scroll_before_primary_vh, 0); assert.equal(m.primary_found, true);
});

await test('a tall report pushes the input below the fold at 375 but not at 1440', async () => {
  await page.setContent(page1(850));
  const per = {};
  for (const [w, h] of [[1440, 900], [375, 812]]) { await page.setViewportSize({ width: w, height: h }); per[w] = await measureStep(page, { primary: '#site' }); }
  assert.equal(per[1440].scroll_before_primary_vh, 0);
  assert.ok(per[375].scroll_before_primary_vh > 0, `got ${per[375].scroll_before_primary_vh}`);
  const merged = mergeWidths(per);
  assert.deepEqual(Object.keys(merged.scroll_before_primary_vh).sort(), ['1440', '375']);
  await page.setViewportSize({ width: 1440, height: 900 });
});

await test('measured from the top even when the page is scrolled', async () => {
  await page.setContent(page1(2000));
  await page.evaluate(() => window.scrollTo(0, 1800));
  const m = await measureStep(page, { primary: '#site' });
  assert.ok(m.scroll_before_primary_vh > 1, `got ${m.scroll_before_primary_vh}`);
});

await test('hidden and missing primary elements', async () => {
  await page.setContent('<main><input id="a" style="display:none"><p>Hello there</p></main>');
  const hidden = await measureStep(page, { primary: '#a' });
  assert.equal(hidden.primary_found, true); assert.equal(hidden.primary_visible, false); assert.equal(hidden.scroll_before_primary_vh, null);
  const missing = await measureStep(page, { primary: '#nope' });
  assert.equal(missing.primary_found, false); assert.equal(missing.scroll_before_primary_vh, null);
  const none = await measureStep(page, {});
  assert.equal('scroll_before_primary_vh' in none, false);
});

await test('words count the main column only', async () => {
  await page.setContent('<nav>Home Pricing Docs Blog</nav><main><h1>Add your site</h1><p>We check it in a minute.</p><p style="display:none">hidden words here</p></main>');
  const m = await measureStep(page);
  assert.equal(m.words, 9);
  assert.equal(mergeWidths({ 1440: m }).reading_time_s, 2);
});

await test('sideways overflow at 375', async () => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.setContent('<body style="margin:0"><main><code style="display:block;white-space:nowrap;width:500px">a-very-long-generated-value</code></main></body>');
  const m = await measureStep(page);
  assert.ok(m.horizontal_overflow_px >= 120, `got ${m.horizontal_overflow_px}`);
  await page.setContent('<main><p>fits</p></main>');
  assert.equal((await measureStep(page)).horizontal_overflow_px, 0);
});

await test('visible controls are counted', async () => {
  await page.setContent('<main><a href="/x">x</a><button>b</button><input><input type="hidden"><button style="display:none">h</button></main>');
  assert.equal((await measureStep(page)).controls, 3);
});

await test('a sticky primary button counts where it is on screen', async () => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.setContent(`<main>${report(3000)}<button id="go" style="position:fixed;bottom:0">Continue</button></main>`);
  assert.equal((await measureStep(page, { primary: '#go' })).scroll_before_primary_vh, 0);
});

await browser.close();
console.log(failures ? `\n${failures} measure test(s) failed` : '\nall measure tests passed');
process.exitCode = failures ? 1 : 0;
