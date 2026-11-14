// guard.mjs — per-host write guard and per-step error capture for FlowChad walks.
//
//   import { installGuard } from './guard.mjs';
//   const context = await browser.newContext({ serviceWorkers: 'block', ... });
//   const guard = await installGuard(context, {
//     'localhost:3000': 'local-copy',
//     'staging.example.com': 'write-allowed-test',
//   });
//   ... after each step: Object.assign(stepResult, guard.take());
//
// Every request is classified by its host against the declared surface table.
// A host that is not declared is read-only-live. On read-only-live hosts any
// method except GET, HEAD and OPTIONS is aborted before it leaves the browser,
// and WebSocket connections are refused (Playwright >= 1.48). Create the
// context with serviceWorkers: 'block', because service-worker requests do not
// pass through context.route.
//
// Recorded URLs keep host and path only; query strings and long token-like
// path segments are redacted.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TOKENISH = /^[A-Za-z0-9_\-.~%]{24,}$/;

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

export function modeFor(surfaces, url) {
  let host;
  try {
    host = new URL(url).host;
  } catch {
    return 'read-only-live';
  }
  return surfaces[host] || 'read-only-live';
}

export async function installGuard(context, surfaces = {}) {
  const fresh = () => ({ console_errors: [], failed_requests: [], blocked_writes: [], unguarded: [] });
  let log = fresh();

  await context.route('**/*', (route) => {
    const req = route.request();
    if (SAFE_METHODS.has(req.method()) || modeFor(surfaces, req.url()) !== 'read-only-live') {
      return route.continue();
    }
    log.blocked_writes.push({ method: req.method(), where: redactUrl(req.url()), at: new Date().toISOString() });
    return route.abort('blockedbyclient');
  });

  if (typeof context.routeWebSocket === 'function') {
    await context.routeWebSocket(/.*/, (ws) => {
      if (modeFor(surfaces, ws.url()) === 'read-only-live') {
        log.blocked_writes.push({ method: 'WEBSOCKET', where: redactUrl(ws.url()), at: new Date().toISOString() });
        return ws.close();
      }
      ws.connectToServer();
    });
  } else {
    log.unguarded.push('WebSockets are not intercepted (Playwright older than 1.48)');
  }

  context.on('console', (m) => {
    if (m.type() === 'error') log.console_errors.push(redactText(m.text()));
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
    // Returns what happened since the last call and starts a new step.
    take() {
      const out = log;
      log = fresh();
      return out;
    },
  };
}
