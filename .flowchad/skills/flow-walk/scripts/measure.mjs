// measure.mjs — the mechanical step measures of references/measures.md,
// taken in the page at the current width, right after that width's screenshot.
//
//   import { measureStep, mergeWidths } from './scripts/measure.mjs';
//   const perWidth = {};
//   for (const width of viewports) {
//     await page.setViewportSize({ width, height: heightFor(width) });
//     await page.screenshot({ path: ... });
//     perWidth[width] = await measureStep(page, { primary: step.primary || nextStep?.selector });
//   }
//   stepResult.measures = { ...mergeWidths(perWidth), decisions, fields, clicks, ... };
//
// Reads only: no clicks, no scrolling, no network. Node built-ins only; the
// page is a Playwright page.

// Runs inside the page. Must stay self-contained (it is serialized).
export function pageMetrics(primary) {
  const de = document.documentElement;
  const vh = window.innerHeight;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0;
  };
  const root = document.querySelector('main') || document.body;
  const text = root ? root.innerText || '' : '';
  const words = (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’._-]*/gu) || []).length;
  const out = {
    words,
    horizontal_overflow_px: Math.max(0, de.scrollWidth - de.clientWidth),
    controls: Array.from(document.querySelectorAll(
      'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link]',
    )).filter(visible).length,
  };
  if (primary) {
    let el = null;
    try { el = document.querySelector(primary); } catch (e) { el = null; }
    out.primary_found = !!el;
    out.primary_visible = !!el && visible(el);
    out.scroll_before_primary_vh = null;
    if (out.primary_visible) {
      const r = el.getBoundingClientRect();
      let fixed = false;
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        const p = getComputedStyle(n).position;
        if (p === 'fixed' || p === 'sticky') { fixed = true; break; }
      }
      const bottom = fixed ? r.bottom : r.bottom + window.scrollY;
      out.scroll_before_primary_vh = Math.max(0, Math.round(((bottom - vh) / vh) * 100) / 100);
    }
  }
  return out;
}

export async function measureStep(page, { primary } = {}) {
  return page.evaluate(pageMetrics, primary || null);
}

// { "1440": {...}, "375": {...} } -> the step's measures: per-width objects for
// what depends on the width, the first width's value for the rest.
export function mergeWidths(perWidth) {
  const widths = Object.keys(perWidth);
  if (!widths.length) return {};
  const first = perWidth[widths[0]];
  const byWidth = (k) => Object.fromEntries(widths.map((w) => [w, perWidth[w][k]]));
  const m = {
    words: first.words,
    reading_time_s: Math.round((first.words / 238) * 60),
    controls: first.controls,
    horizontal_overflow_px: byWidth('horizontal_overflow_px'),
  };
  if ('scroll_before_primary_vh' in first) m.scroll_before_primary_vh = byWidth('scroll_before_primary_vh');
  return m;
}
