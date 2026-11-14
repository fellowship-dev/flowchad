// guard.mjs — per-host write guard and per-step error capture for FlowChad walks.
//
//   import { installGuard } from './guard.mjs';
//   const browser = await chromium.launch();          // launched Chromium is the verified mode
//   const context = await browser.newContext({ serviceWorkers: 'block', ... });
//   const guard = await installGuard(context, {
//     'localhost:3000': 'local-copy',
//     'staging.example.com': 'write-allowed-test',
//   });
//   ... after each step: Object.assign(stepResult, guard.take());
//
// Every request is classified by its host against the declared surface table.
// Only hosts declared 'write-allowed-test' or 'local-copy' are writable; every
// other host is read-only-live. On read-only-live hosts any method except GET,
// HEAD and OPTIONS is aborted before it leaves the browser, and WebSocket
// connections are refused (Playwright >= 1.48). Create the context with
// serviceWorkers: 'block', because service-worker requests do not pass through
// context.route. A malformed table throws before anything is navigated; an
// error inside the guard aborts the request instead of letting it through.
//
// Recorded URLs keep host and path only; query strings and long token-like
// path segments are redacted.

export const MODES = new Set(['read-only-live', 'write-allowed-test', 'local-copy']);
const WRITABLE = new Set(['write-allowed-test', 'local-copy']);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TOKENISH = /^[A-Za-z0-9_\-.~%]{24,}$/;
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export function redactUrl(u) {
  try {
    const x = new URL(u);
    if (x.protocol === 'data:' || x.protocol === 'blob:') return `${x.protocol}(redacted)`;
    const path = x.pathname
      .split('/')
      .map((seg) => (TOKENISH.test(seg) ? ':redacted' : seg))
      .join('/');
    return `${x.host}${path}`;
  } catch {
    return '(unparseable url)';
  }
}

export function redactText(t) {
  return String(t)
    .replace(/(?:https?|wss?):\/\/[^\s"'<>)]+/g, (m) => redactUrl(m))
    .replace(/[A-Za-z0-9_\-]{32,}/g, ':redacted')
    .slice(0, 300);
}

// Throws unless `surfaces` is a plain object whose every value is a known mode.
export function validateSurfaces(surfaces) {
  const proto = surfaces !== null && typeof surfaces === 'object' ? Object.getPrototypeOf(surfaces) : undefined;
  if (proto !== Object.prototype && proto !== null) {
    throw new TypeError('guard: surface table must be a plain object of host -> mode');
  }
  for (const [host, mode] of Object.entries(surfaces)) {
    if (!MODES.has(mode)) {
      throw new TypeError(`guard: unknown mode ${JSON.stringify(mode)} for host ${JSON.stringify(host)}; use one of ${[...MODES].join(', ')}`);
    }
  }
}

export function isWritable(surfaces, url) {
  let host;
  try {
    host = new URL(url).host;
  } catch {
    return false;
  }
  return hasOwn(surfaces, host) && WRITABLE.has(surfaces[host]);
}

// attachedOverCDP: pass true when the browser was attached with connectOverCDP.
export async function installGuard(context, surfaces, { attachedOverCDP = false } = {}) {
  validateSurfaces(surfaces);
  const table = Object.freeze({ ...surfaces });
  const unguarded = []; // persistent notes, returned by every take()
  const note = (n) => { if (!unguarded.includes(n)) unguarded.push(n); };
  const fresh = () => ({ console_errors: [], failed_requests: [], blocked_writes: [] });
  let log = fresh();

  if (attachedOverCDP) note('browser attached over CDP: an unverified mode for the write guard');
  const engine = context.browser?.()?.browserType?.().name?.();
  if (engine && engine !== 'chromium') note(`browser engine ${engine}: an unverified mode for the write guard`);

  await context.route('**/*', async (route) => {
    let req;
    try {
      req = route.request();
      if (SAFE_METHODS.has(req.method()) || isWritable(table, req.url())) return await route.continue();
      log.blocked_writes.push({ method: req.method(), where: redactUrl(req.url()), at: new Date().toISOString() });
      return await route.abort('blockedbyclient');
    } catch (e) {
      note(`guard error, request aborted: ${redactText(e?.message || e)}`);
      try { await route.abort('blockedbyclient'); } catch { /* already handled */ }
    }
  });

  if (typeof context.routeWebSocket === 'function') {
    await context.routeWebSocket(/.*/, (ws) => {
      try {
        if (isWritable(table, ws.url())) return ws.connectToServer();
        log.blocked_writes.push({ method: 'WEBSOCKET', where: redactUrl(ws.url()), at: new Date().toISOString() });
        return ws.close();
      } catch (e) {
        note(`guard error, WebSocket closed: ${redactText(e?.message || e)}`);
        try { ws.close(); } catch { /* already closed */ }
      }
    });
  } else {
    note('WebSockets are not intercepted (Playwright older than 1.48)');
  }

  context.on('console', (m) => {
    // our own aborts surface as console errors too; they are already in blocked_writes
    if (m.type() === 'error' && !m.text().includes('ERR_BLOCKED_BY_CLIENT')) log.console_errors.push(redactText(m.text()));
  });
  context.on('weberror', (e) => log.console_errors.push(`uncaught: ${redactText(e.error()?.message || e.error())}`));
  context.on('requestfailed', (r) => {
    const error = r.failure()?.errorText || '';
    if (error.includes('BLOCKED_BY_CLIENT')) return; // our own aborts, already in blocked_writes
    log.failed_requests.push({ method: r.method(), where: redactUrl(r.url()), error });
  });
  context.on('response', (r) => {
    if (r.status() >= 400) {
      log.failed_requests.push({ method: r.request().method(), where: redactUrl(r.url()), status: r.status() });
    }
  });

  return {
    // What happened since the last call, plus every persistent `unguarded` note.
    take() {
      const out = { ...log, unguarded: [...unguarded] };
      log = fresh();
      return out;
    },
  };
}
