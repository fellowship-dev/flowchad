#!/usr/bin/env node
// gate.mjs — decide whether a walked flow may be handed to a human tester.
//
//   node gate.mjs <results.json> [--previous <results.json>] [--rules <dir>]...
//                 [--target <url>] [--not-before <ISO time>] [--config <file>]
//                 [--record <dir>] [--json] [--quiet]
//
// Reads the walk's results.json (or a map from flowmap.mjs), the rule files
// (flow-walk/rules, plus .flowchad/rules and gate.rules from the config), and
// the project config (.flowchad/config.yml, or --config): gate.target is the
// address the tester will open, and a configured deploy check makes the deploy
// time (--not-before) required. It applies thresholds to the measures,
// combines them with the walker's rule_results, and prints the gate: PASS,
// PASS-WITH-OVERRIDES, FAIL or INCOMPLETE, the reasons, the measures against
// the previous walk, and the known rough edges. --record writes the durable
// walk record (text only, redacted best-effort) into <dir>, for committing.
//
// Exit: 0 PASS, 1 FAIL or INCOMPLETE, 2 bad input (unknown rule id, missing
// file, unsafe flow id, an override that is not allowed or lacks its reason,
// who or when), 3 PASS-WITH-OVERRIDES (a blocker failed and was overridden).
// Node built-ins only.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const RULES_VERSION = '0.5.0';
export const EXIT = { PASS: 0, FAIL: 1, INCOMPLETE: 1, INPUT: 2, 'PASS-WITH-OVERRIDES': 3 };

// The rule that states the value moment was reached. It is never overridden:
// a flow that does not reach its value moment is not ready, whatever the reason.
export const NOT_OVERRIDABLE = new Set(['PATH-01']);
export const MIN_BLOCKER_REASON = { chars: 20, words: 4 };
// Flow ids name files: letters, digits, hyphen, underscore; no dots or slashes.
export const FLOW_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

export class InputError extends Error {}

// ---------- rules ----------

export function parseRules(text, file = '') {
  const rules = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^### ([A-Z]+-\d\d) · (.+)$/);
    if (h) {
      cur = { id: h[1], title: h[2].trim(), severity: null, applies: [], thresholds: [], measures: [], retired: false, file };
      rules.push(cur);
      continue;
    }
    if (!cur) continue;
    const f = line.match(/^- \*\*([A-Za-z ]+):\*\* (.*)$/);
    if (!f) continue;
    const [, key, raw] = f;
    const v = raw.trim();
    if (key === 'Rule') cur.rule = v;
    else if (key === 'Severity') cur.severity = v;
    else if (key === 'Applies to') cur.applies = v.split(/,\s*/);
    else if (key === 'Threshold') cur.thresholds.push(parseThreshold(v.replace(/`/g, '')));
    else if (key === 'Measure') cur.measures = v.replace(/`/g, '').split(/,\s*/);
    else if (key === 'Retired') cur.retired = true;
  }
  return rules;
}

export function loadRules(dirs) {
  const all = new Map();
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).sort()) {
      if (!name.endsWith('.md') || name === 'README.md' || name === 'CHANGELOG.md') continue;
      const file = path.join(dir, name);
      for (const r of parseRules(fs.readFileSync(file, 'utf8'), file)) {
        if (all.has(r.id)) throw new InputError(`duplicate rule id ${r.id} in ${file} and ${all.get(r.id).file}`);
        all.set(r.id, r);
      }
    }
  }
  if (all.size === 0) throw new InputError(`no rules found in ${dirs.join(', ')}`);
  return all;
}

export function parseThreshold(s) {
  const m = s.trim().match(/^([a-z_]+) (=|<=|>=|<|>) (-?[\d.]+|true|false)(?: when ([a-z_]+) (=|<=|>=|<|>) (-?[\d.]+))?$/);
  if (!m) throw new InputError(`bad threshold: ${s}`);
  const val = (x) => (x === 'true' ? true : x === 'false' ? false : Number(x));
  const t = { measure: m[1], op: m[2], value: val(m[3]), text: s.trim() };
  if (m[4]) t.when = { measure: m[4], op: m[5], value: val(m[6]) };
  return t;
}

const cmp = (a, op, b) => {
  if (typeof b === 'boolean') return op === '=' ? a === b : false;
  if (typeof a !== 'number') return false;
  return { '=': a === b, '<=': a <= b, '>=': a >= b, '<': a < b, '>': a > b }[op];
};

// ---------- config ----------

// A small reader for the subset of YAML that config.yml uses: nested maps by
// indentation, scalars, quoted strings, inline [a, b] lists and "- item" lists.
export function parseConfig(text) {
  const root = {};
  const stack = [{ indent: -1, obj: root }];
  const scalar = (v) => {
    v = v.trim();
    if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map((x) => scalar(x)).filter((x) => x !== '');
    if (/^"(.*)"$/.test(v) || /^'(.*)'$/.test(v)) return v.slice(1, -1);
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return v;
  };
  for (const raw of String(text).split(/\r?\n/)) {
    if (/^\s*#/.test(raw) || !raw.trim()) continue;
    const line = raw.replace(/\s+#.*$/, '');
    const indent = line.match(/^ */)[0].length;
    const t = line.trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const top = stack[stack.length - 1];
    const item = t.match(/^-\s+(.*)$/);
    if (item) {
      if (top.parent && !Array.isArray(top.parent[top.key])) top.parent[top.key] = [];
      if (top.parent) top.parent[top.key].push(scalar(item[1]));
      continue;
    }
    const kv = t.match(/^([A-Za-z0-9_.-]+):(?:\s+(.*))?$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === undefined || value === '') {
      top.obj[key] = {};
      stack.push({ indent, obj: top.obj[key], parent: top.obj, key });
    } else top.obj[key] = scalar(value);
  }
  return root;
}

export function gateOptionsFromConfig(cfg, { target, notBefore } = {}) {
  const gate = (cfg && typeof cfg.gate === 'object' && cfg.gate) || {};
  const t = target || (typeof gate.target === 'string' ? gate.target : undefined);
  const tracked = (v) => typeof v === 'string' && v !== 'none';
  let deployTracked = tracked(gate.deploy_check);
  const envs = (cfg && typeof cfg.environments === 'object' && cfg.environments) || {};
  for (const env of Object.values(envs)) {
    if (env && typeof env === 'object' && t && hostOf(env.url) && hostOf(env.url) === hostOf(t) && tracked(env.deploy_check)) deployTracked = true;
  }
  const rules = Array.isArray(gate.rules) ? gate.rules : typeof gate.rules === 'string' ? [gate.rules] : [];
  return { target: t, notBefore, deployTracked, rules };
}

// ---------- measures ----------

export const STEP_MEASURES = new Set([
  'decisions', 'fields', 'clicks', 'words', 'reading_time_s', 'scroll_before_primary_vh',
  'horizontal_overflow_px', 'controls', 'non_task_elements', 'wait_ms', 'wait_feedback',
  'wait_progress', 'dead_end', 'revisit',
]);
const READING_WPM = 238;
const REACHED = new Set(['pass', 'slow']);

const scopesFor = (kind) => {
  const kinds = Array.isArray(kind) ? kind : [kind || 'screens'];
  const s = new Set();
  for (const k of kinds) {
    if (k === 'screens') { s.add('step'); s.add('flow'); } else s.add(k);
  }
  return s;
};

const firstWidthValue = (v) => (v && typeof v === 'object' ? Object.values(v)[0] : v);
const isRecord = (s) => s && typeof s === 'object' && Number.isFinite(Number(s.index)) && typeof s.status === 'string'
  && s.measures && typeof s.measures === 'object' && !Array.isArray(s.measures);

// What the walk shows about the value moment. A self-declared value_reached is
// not evidence: a screens walk needs recorded steps, every one up to the value
// step with its index, status and measures, and the value step marked
// first_value; a map needs a path that ends on a value node.
export function valueEvidence(results) {
  const scopes = scopesFor(results.kind);
  const steps = Array.isArray(results.steps) ? results.steps : [];
  const missing = [];
  if (scopes.has('map')) {
    const p = results.map && Array.isArray(results.map.path) ? results.map.path : [];
    if (!results.map || !results.map.value || !p.length) missing.push('the map result has no path to a value node');
    return { applies: true, missing, valueIndex: -1, reached: !missing.length && results.value_reachable === true };
  }
  if (!scopes.has('flow') && !scopes.has('step')) return { applies: false, missing, valueIndex: -1, reached: results.goal_reached === true };
  const valueIndex = steps.findIndex((s) => s && s.first_value === true);
  if (!steps.length) missing.push('the walk recorded no steps');
  else if (valueIndex < 0) missing.push('no step is marked first_value (the step that shows the value moment)');
  const upto = valueIndex >= 0 ? steps.slice(0, valueIndex + 1) : steps;
  const bad = upto.filter((s) => !isRecord(s)).map((s, i) => (s && s.index !== undefined ? s.index : i + 1));
  if (bad.length) missing.push(`step ${bad.join(', ')} has no per-step record (index, status and measures)`);
  const reached = !missing.length && REACHED.has(steps[valueIndex].status);
  return { applies: true, missing, valueIndex, reached };
}

export function flowMeasures(results) {
  const steps = Array.isArray(results.steps) ? results.steps : [];
  const ev = valueEvidence(results);
  const valueReached = ev.reached;
  const upto = valueReached && ev.valueIndex >= 0 ? steps.slice(0, ev.valueIndex + 1) : steps.filter(Boolean);
  const m = {};
  // A step-derived number exists only when every step on the path recorded
  // its input: a missing dead_end is not 0, and an old walk without measures
  // must not pass a threshold by counting zeros.
  const all = (k) => upto.length > 0 && upto.every((s) => s.measures && typeof s.measures === 'object' && s.measures[k] !== undefined && s.measures[k] !== null);
  if (upto.some((s) => s.measures && typeof s.measures === 'object')) {
    const sum = (k, pick = (x) => x) => upto.reduce((a, s) => a + (Number(pick(s.measures[k])) || 0), 0);
    m.screens_to_value = new Set(upto.map((s) => s.screen || s.target || `step-${s.index}`)).size;
    if (all('decisions')) m.decisions_to_value = sum('decisions');
    if (all('fields')) m.fields_to_value = sum('fields');
    if (all('clicks')) m.clicks_to_value = sum('clicks');
    if (all('words')) {
      m.words_to_value = sum('words', firstWidthValue);
      m.reading_time_to_value_s = Math.round((m.words_to_value / READING_WPM) * 60);
    }
    if (all('scroll_before_primary_vh')) {
      const scroll = {};
      for (const s of upto) {
        const v = s.measures.scroll_before_primary_vh;
        if (v && typeof v === 'object') for (const [w, x] of Object.entries(v)) {
          if (typeof x === 'number') scroll[w] = Math.max(scroll[w] ?? 0, x);
        }
      }
      if (Object.keys(scroll).length) m.max_scroll_before_primary_vh = scroll;
    }
    if (all('non_task_elements')) m.non_task_elements_to_value = sum('non_task_elements');
    if (all('wait_ms')) {
      const waits = upto.map((s) => Number(s.measures.wait_ms) || 0);
      m.waits = waits.filter((w) => w > 1000).length;
      m.longest_wait_ms = Math.max(...waits);
    }
    if (all('dead_end')) m.dead_ends = upto.filter((s) => s.measures.dead_end === true).length;
    if (all('revisit')) m.loops = upto.filter((s) => s.measures.revisit === true).length;
    const ttv = results.counts?.time_to_first_value_ms;
    if (typeof ttv === 'number') m.time_to_value_ms = ttv;
  }
  // measures recorded directly (docs, agent and map walks) win
  Object.assign(m, results.measures || {});
  return { measures: m, valueReached, valueIndex: ev.valueIndex, upto, evidence: ev };
}

// ---------- evaluation ----------

function applyThreshold(rule, t, results, fm) {
  // returns { status: 'pass'|'fail'|'not measured', evidence: [] }
  const evidence = [];
  if (STEP_MEASURES.has(t.measure)) {
    let missing = 0;
    for (const s of fm.upto) {
      const ms = s.measures && typeof s.measures === 'object' ? s.measures : {};
      if (t.when) {
        const c = ms[t.when.measure];
        if (c === undefined || c === null) { missing++; continue; }
        if (!cmp(Number(c), t.when.op, t.when.value)) continue;
      }
      const raw = ms[t.measure];
      if (raw === undefined) { missing++; continue; }
      const perWidth = raw !== null && typeof raw === 'object' ? Object.entries(raw) : [[null, raw]];
      for (const [w, x] of perWidth) {
        if (x === null || x === undefined) {
          evidence.push({ step: s.index, width: w, observed: `${t.measure} not measurable (element not found or hidden)` });
        } else if (!cmp(x, t.op, t.value)) {
          evidence.push({ step: s.index, width: w, observed: `${t.measure} = ${x}${t.when ? ` with ${t.when.measure} = ${ms[t.when.measure]}` : ''}, needs ${t.text}` });
        }
      }
    }
    if (evidence.length) return { status: 'fail', evidence };
    // a pass needs every step on the path measured
    if (!fm.upto.length || missing) return { status: 'not measured', evidence };
    return { status: 'pass', evidence };
  }
  const v = fm.measures[t.measure];
  if (v === undefined || v === null) return { status: 'not measured', evidence };
  if (t.when) {
    const c = fm.measures[t.when.measure];
    if (c === undefined || c === null) return { status: 'not measured', evidence };
    if (!cmp(Number(c), t.when.op, t.when.value)) return { status: 'pass', evidence };
  }
  if (!cmp(v, t.op, t.value)) evidence.push({ observed: `${t.measure} = ${v}, needs ${t.text}` });
  return { status: evidence.length ? 'fail' : 'pass', evidence };
}

function checkOverrides(results, rules) {
  const overrides = new Map();
  for (const o of results.rule_overrides || []) {
    const rule = rules.get(o?.id);
    if (!rule) throw new InputError(`rule_overrides names unknown rule ${o?.id}`);
    const reason = String(o.reason ?? '').trim();
    if (!reason) throw new InputError(`rule_overrides ${o.id} has no reason`);
    if (NOT_OVERRIDABLE.has(o.id)) throw new InputError(`rule_overrides ${o.id}: this rule states that the value moment was reached and cannot be overridden; reach it, or change the flow's value_moment`);
    const blocker = rule.severity === 'blocker';
    const by = String(o.by ?? '').trim();
    const date = String(o.date ?? '').trim();
    if (blocker) {
      if (reason.length < MIN_BLOCKER_REASON.chars || reason.split(/\s+/).length < MIN_BLOCKER_REASON.words) {
        throw new InputError(`rule_overrides ${o.id} overrides a blocker: the reason must say why in at least ${MIN_BLOCKER_REASON.words} words and ${MIN_BLOCKER_REASON.chars} characters`);
      }
      if (!by) throw new InputError(`rule_overrides ${o.id} overrides a blocker: say who accepted it (by:)`);
      if (!/^\d{4}-\d{2}-\d{2}/.test(date) || !Number.isFinite(Date.parse(date))) throw new InputError(`rule_overrides ${o.id} overrides a blocker: say when (date: YYYY-MM-DD)`);
    }
    overrides.set(o.id, { reason, by: by || null, date: date || null, blocker });
  }
  return overrides;
}

export function evaluate(results, rules, opts = {}) {
  const scopes = scopesFor(results.kind);
  const isMap = scopes.has('map');
  const fm = flowMeasures(results);
  const notes = [];
  const per = new Map(); // id -> { status, evidence[], source }
  const get = (id) => {
    if (!per.has(id)) per.set(id, { status: 'not judged', evidence: [], sources: new Set() });
    return per.get(id);
  };

  // 1. the walker's judgements
  for (const r of results.rule_results || []) {
    const rule = rules.get(r.id);
    if (!rule) throw new InputError(`rule_results names unknown rule ${r.id}`);
    if (!['pass', 'fail', 'n/a'].includes(r.result)) throw new InputError(`rule_results ${r.id}: result must be pass, fail or n/a`);
    if (rule.retired) { notes.push(`${r.id} is retired; its result was ignored`); continue; }
    const e = get(r.id);
    if (r.result === 'fail') {
      e.sources.add('walker');
      e.status = 'fail';
      e.evidence.push({ step: r.step, width: r.width, observed: r.observed || '' });
    } else if (r.result === 'pass') {
      e.sources.add('walker');
      if (e.status !== 'fail') e.status = 'pass';
    } else {
      // "not applicable" counts only with the reason it does not apply
      const why = String(r.reason ?? r.observed ?? '').trim();
      if (!why) { notes.push(`${r.id} was marked n/a without a reason; it counts as not judged`); continue; }
      e.sources.add('walker');
      if (e.status === 'not judged') { e.status = 'n/a'; e.reason = why; }
    }
  }

  // 2. thresholds, applied mechanically
  for (const rule of rules.values()) {
    if (rule.retired || !rule.applies.some((a) => scopes.has(a))) continue;
    for (const t of rule.thresholds) {
      const out = applyThreshold(rule, t, results, fm);
      if (out.status === 'not measured') continue;
      const e = get(rule.id);
      e.sources.add('measure');
      if (out.status === 'fail') { e.status = 'fail'; e.evidence.push(...out.evidence); } else if (e.status === 'not judged' || e.status === 'n/a') e.status = 'pass';
    }
  }

  // 3. the value moment (PATH-01) is checked mechanically, from evidence only
  const gaps = [];
  const p1 = rules.get('PATH-01');
  if (p1 && !p1.retired && (scopes.has('flow') || isMap)) {
    const e = get('PATH-01');
    e.sources.add('measure');
    if (!results.value_moment) { e.status = 'fail'; e.evidence.push({ observed: 'the flow declares no value_moment' }); }
    else if (fm.evidence.missing.length) {
      if (e.status !== 'fail') e.status = 'not judged';
      gaps.push(`no evidence the value moment was reached: ${fm.evidence.missing.join('; ')}`);
    } else if (!fm.valueReached) { e.status = 'fail'; e.evidence.push({ observed: `value moment not reached: "${results.value_moment}"` }); }
    else if (e.status !== 'fail') e.status = 'pass';
  }

  // 4. overrides
  const overrides = checkOverrides(results, rules);

  // 5. classify
  const failedBlockers = []; const notJudged = []; const roughEdges = []; const accepted = [];
  for (const rule of [...rules.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    if (rule.retired) continue;
    const applies = rule.applies.some((a) => scopes.has(a));
    const e = per.get(rule.id);
    if (!applies && !e) continue;
    const status = e ? e.status : 'not judged';
    const item = { id: rule.id, title: rule.title, severity: rule.severity, evidence: e ? e.evidence : [] };
    if (status === 'fail' && overrides.has(rule.id)) accepted.push({ ...item, ...overrides.get(rule.id) });
    else if (status === 'fail' && rule.severity === 'blocker') failedBlockers.push(item);
    else if (status === 'fail') roughEdges.push(item);
    else if (status === 'not judged' && rule.severity === 'blocker' && applies) notJudged.push(item);
  }
  for (const id of overrides.keys()) if (!accepted.some((a) => a.id === id)) notes.push(`override for ${id} not used: the rule did not fail`);

  // 6. gate conditions: hard failures, then gaps in what was walked or judged
  const failed = [];
  if (results.goal_reached !== true) {
    const st = results.stopped_at;
    if (st && /write step/i.test(`${st.reason || ''} ${st.words || ''}`)) {
      gaps.push(`stopped before a write step at step ${st.step} on a read-only-live surface; walk the rest on a test surface`);
    } else {
      failed.push(`goal not reached${st ? ` (stopped at step ${st.step}${st.screen ? `, ${st.screen}` : ''}${st.words ? `: "${st.words}"` : ''})` : ''}`);
    }
  }
  for (const b of failedBlockers) failed.push(`blocker ${b.id} failed: ${b.title}`);
  for (const b of notJudged) if (!(b.id === 'PATH-01' && fm.evidence.missing.length)) gaps.push(`blocker ${b.id} not judged: ${b.title}`);
  const walkedUrl = results.config?.url || results.target?.url || '';
  if (!isMap) {
    // the walk counts only for the address the tester will open, after the last deploy
    if (!opts.target) gaps.push('target not stated: pass --target <url> or set gate.target in .flowchad/config.yml');
    else {
      const want = hostOf(opts.target); const got = hostOf(walkedUrl);
      if (!want) throw new InputError(`target is not a URL: ${opts.target}`);
      if (!got || want !== got) failed.push(`walked ${got || 'an unknown host'}, but the tester will open ${want}`);
    }
    if (opts.notBefore) {
      const t = Date.parse(results.timestamp || '');
      if (!Number.isFinite(t) || t < Date.parse(opts.notBefore)) failed.push(`walk at ${results.timestamp || 'unknown time'} is older than ${opts.notBefore} (the last deploy)`);
    } else if (opts.deployTracked) {
      gaps.push('deploy time not stated: the config tracks deploys for this target; pass --not-before <time of the last deploy>');
    } else notes.push('staleness not checked: no deploy time given and no deploy check configured for the target');
  }
  const reasons = [...failed, ...gaps];
  const status = failed.length ? 'FAIL' : gaps.length ? 'INCOMPLETE' : accepted.some((a) => a.blocker) ? 'PASS-WITH-OVERRIDES' : 'PASS';

  // 7. before/after
  const prev = opts.previous ? flowMeasures(opts.previous).measures : null;
  const keys = [...new Set([...Object.keys(fm.measures), ...Object.keys(prev || {})])];
  const measures = keys.map((k) => ({ measure: k, previous: prev ? prev[k] : undefined, now: fm.measures[k] }));

  return {
    flow: results.flow, name: results.name, value_moment: results.value_moment || null,
    kind: results.kind || 'screens', timestamp: results.timestamp || null,
    target: walkedUrl, surface: results.surface?.mode || null, commit: results.surface?.commit || results.commit || null,
    status, reasons, failed_blockers: failedBlockers, not_judged: notJudged, rough_edges: roughEdges,
    accepted_exceptions: accepted, not_covered: results.not_covered || [], notes,
    value_reached: fm.valueReached, measures, previous_timestamp: opts.previous?.timestamp || null,
    rules_version: RULES_VERSION,
  };
}

function hostOf(u) {
  try { return new URL(String(u)).host.toLowerCase(); } catch { return ''; }
}

// ---------- redaction ----------
//
// Best-effort: every free-text field of the walk record goes through redact()
// before it is written. URLs keep their scheme, host and port (the tested host
// is the point of the record) and lose user info, query and fragment; path
// segments that look like tokens become [token]. Then known secret shapes,
// secret-like key=value pairs, email addresses, long hex or base64 strings,
// card-like numbers (Luhn), 12+ digit account-like numbers and phone-like
// numbers are replaced. It cannot know every secret: review a record before
// committing it.

const SECRET_SHAPES = [
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g,           // GitHub tokens
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{8,}/g,           // Stripe-style keys
  /\bwhsec_[A-Za-z0-9]{16,}/g,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}/g,                         // chat-app tokens
  /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA|AIPA|ABIA|ACCA)[A-Z0-9]{16}\b/g, // AWS access key ids
  /\bAIza[0-9A-Za-z_-]{35}/g,                                 // cloud API keys
  /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]*/g, // JWTs
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
];
const SECRET_KEY = '[A-Za-z0-9_.-]*?(?:token|secret|passw(?:or)?d|pwd|api[_-]?key|apikey|access[_-]?key|private[_-]?key|client[_-]?secret|auth|session|sessid|sid|signature|sig|cookie|otp|credential|key)s?';
const KV_EQ = new RegExp(`\\b(${SECRET_KEY})(\\s*=\\s*)("[^"]*"|'[^']*'|[^\\s&,;|"'<>]+)`, 'gi');
const KV_COLON = /\b((?:password|passwd|secret|token|api[_ -]?key|access[_ -]?key|client[_ -]?secret|private[_ -]?key))(\s*:\s*)("[^"]*"|'[^']*'|[^\s,;|"'<>]+)/gi;
const URL_RE = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>`|\]]+/gi;

function luhn(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

function tokenLike(seg) {
  if (!seg) return false;
  if (/^\[[a-z]+\]$/.test(seg)) return false;
  if (SECRET_SHAPES.some((re) => new RegExp(re.source).test(seg))) return true;
  if (/^[0-9a-f]{16,}$/i.test(seg)) return true;
  if (/^\d{8,}$/.test(seg)) return true;
  if (seg.length >= 16 && /\d/.test(seg) && /[A-Za-z]/.test(seg)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return true;
  return false;
}

export function redactUrl(u) {
  const s = String(u ?? '');
  if (!s) return '';
  let url;
  try { url = new URL(s); } catch { return redactText(s.replace(/[?#].*$/, '')); }
  if (!url.host) return `${url.protocol}[url]`;
  let p = '';
  try {
    p = url.pathname.split('/').map((seg) => {
      let d = seg; try { d = decodeURIComponent(seg); } catch { /* keep raw */ }
      return tokenLike(d) ? '[token]' : redactText(seg);
    }).join('/');
  } catch { p = ''; }
  return `${url.protocol}//${url.host}${p === '/' ? '' : p}`;
}

function redactText(s) {
  let out = String(s ?? '');
  for (const re of SECRET_SHAPES) out = out.replace(re, '[secret]');
  out = out.replace(/\b(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]{8,}/gi, '$1 [secret]');
  out = out.replace(KV_EQ, '$1$2[secret]').replace(KV_COLON, '$1$2[secret]');
  out = out.replace(/\b[^\s:@/]+:[^\s:@/]+@(?=[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '[credentials]@');
  out = out.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]');
  out = out.replace(/\b[0-9a-f]{32,}\b/gi, '[hex]');
  out = out.replace(/[A-Za-z0-9+/_-]{32,}={0,2}/g, (m) => (/\d/.test(m) && /[a-z]/.test(m) && /[A-Z]/.test(m) ? '[secret]' : m));
  out = out.replace(/\b[A-Za-z0-9]{40,}\b/g, (m) => (/\d/.test(m) && /[A-Za-z]/.test(m) ? '[secret]' : m));
  // digit runs with optional single space or hyphen separators
  out = out.replace(/\d(?:[ -]?\d){11,}/g, (m) => {
    const d = m.replace(/\D/g, '');
    return d.length >= 13 && d.length <= 19 && luhn(d) ? '[card]' : '[number]';
  });
  out = out.replace(/\+\d{1,3}(?:[ .-]?\(?\d{1,4}\)?){2,6}/g, (m) => (m.replace(/\D/g, '').length >= 8 ? '[phone]' : m));
  out = out.replace(/(?<![\d-])\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g, '[phone]');
  return out;
}

// One function for every free-text field: URLs first (kept out of the text
// rules so a host is never mangled), then the text rules on the rest.
export function redact(s) {
  const text = String(s ?? '');
  const urls = [];
  const masked = text.replace(URL_RE, (m) => {
    const trail = m.match(/[.,;:!?)]+$/);
    const core = trail ? m.slice(0, -trail[0].length) : m;
    urls.push(redactUrl(core));
    return `\u0000${urls.length - 1}\u0000${trail ? trail[0] : ''}`;
  });
  return redactText(masked).replace(/\u0000(\d+)\u0000/g, (_, i) => urls[Number(i)]);
}

// ---------- output ----------

const fmt = (v) => {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'object') return Object.entries(v).map(([w, x]) => `${redact(w)}: ${typeof x === 'number' || typeof x === 'boolean' ? x : redact(x)}`).join(' · ');
  return typeof v === 'number' || typeof v === 'boolean' ? String(v) : redact(v);
};
const delta = (a, b) => (typeof a === 'number' && typeof b === 'number' ? (b - a === 0 ? 'same' : `${b - a > 0 ? '+' : ''}${Math.round((b - a) * 100) / 100}`) : '');
const safeTime = (t) => (typeof t === 'string' && /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.test(t) && Number.isFinite(Date.parse(t)) ? t : t ? '[unrecognised time]' : 'unknown');
const safeCommit = (c) => (typeof c === 'string' && /^[0-9a-f]{7,40}$/i.test(c) ? c : c ? '[unrecognised commit]' : 'unknown');

const evid = (e) => e.map((x) => `${x.step !== undefined && x.step !== null ? `step ${x.step}` : ''}${x.width ? ` @${x.width}` : ''}${x.observed ? `${x.step !== undefined && x.step !== null ? ': ' : ''}${x.observed}` : ''}`.trim()).filter(Boolean).join('; ');

const OPENING = {
  PASS: 'Ready to hand to a human tester. Known rough edges are listed below; tell the tester about them first.',
  'PASS-WITH-OVERRIDES': 'Ready only with overrides: blocker rules failed and were overridden. Tell the tester about every override below first, and fix them next.',
  INCOMPLETE: 'Not ready: the walk did not cover everything the gate needs.',
  FAIL: 'Not ready: do not hand this to a human tester until these pass.',
};

export function renderMarkdown(r, { record = false } = {}) {
  const R = redact;
  const L = [];
  if (record) {
    L.push(`# Walk record: ${R(r.flow)}`, '');
    L.push(`- **Flow:** ${R(r.name || r.flow)}`);
    L.push(`- **Value moment:** ${r.value_moment ? R(r.value_moment) : 'not declared'}`);
    L.push(`- **Walked:** ${safeTime(r.timestamp)}`);
    L.push(`- **Target:** ${r.target ? redactUrl(r.target) : 'unknown'}${r.surface ? ` (${R(r.surface)})` : ''}`);
    L.push(`- **Commit:** ${safeCommit(r.commit)}`);
    L.push(`- **Kind:** ${R(Array.isArray(r.kind) ? r.kind.join(', ') : r.kind)}`);
    L.push(`- **Gate:** ${r.status}`);
    L.push(`- **Rules:** ${r.rules_version}`, '');
    L.push('_Redacted best-effort (emails, numbers, tokens, URL query strings). Review before committing._', '');
  } else {
    L.push(`## Gate: ${r.status} — ${R(r.flow)}`, '');
  }
  L.push(OPENING[r.status], '');
  if (r.reasons.length) {
    for (const x of r.reasons) L.push(`- ${R(x)}`);
    L.push('');
  }
  if (r.failed_blockers.length) {
    L.push('### Blockers failed', '');
    for (const b of r.failed_blockers) L.push(`- **${b.id}** ${R(b.title)}${b.evidence.length ? ` — ${R(evid(b.evidence))}` : ''}`);
    L.push('');
  }
  const overrides = [...r.accepted_exceptions].sort((a, b) => Number(b.blocker) - Number(a.blocker));
  L.push(`### Known rough edges (${r.rough_edges.length + overrides.length})`, '');
  if (!r.rough_edges.length && !overrides.length) L.push('- none found by the rules');
  for (const b of overrides) {
    const who = [b.by ? `by ${R(b.by)}` : '', b.date ? `on ${R(b.date)}` : ''].filter(Boolean).join(' ');
    L.push(`- **${b.id}** (${b.severity}, **OVERRIDDEN**${who ? ` ${who}` : ''}) ${R(b.title)} — failed${b.evidence.length ? `: ${R(evid(b.evidence))}` : ''}; accepted because: ${R(b.reason)}`);
  }
  for (const b of r.rough_edges) L.push(`- **${b.id}** (${b.severity}) ${R(b.title)}${b.evidence.length ? ` — ${R(evid(b.evidence))}` : ''}`);
  L.push('');
  L.push(`### Measures${r.previous_timestamp ? ` (previous walk ${safeTime(r.previous_timestamp)})` : ''}`, '');
  L.push('| Measure | Previous | Now | Change |', '|---|---|---|---|');
  for (const m of r.measures) L.push(`| \`${R(m.measure)}\` | ${fmt(m.previous)} | ${fmt(m.now)} | ${delta(m.previous, m.now)} |`);
  if (!r.value_reached) L.push('', 'The value moment was not reached; totals cover every step walked.');
  L.push('');
  if (r.not_covered.length) {
    L.push('### Not covered by a rule', '', 'Candidates for a new rule (see flow-walk/rules/README.md § Admission test):', '');
    for (const n of r.not_covered) L.push(`- ${R(typeof n === 'string' ? n : n.observed || JSON.stringify(n))}`);
    L.push('');
  }
  if (r.notes.length) { L.push('### Notes', ''); for (const n of r.notes) L.push(`- ${R(n)}`); L.push(''); }
  return L.join('\n');
}

export function writeRecord(report, dir) {
  const flow = String(report.flow ?? '');
  if (!FLOW_ID.test(flow)) throw new InputError(`flow id is not a safe name (letters, digits, - and _ only): ${JSON.stringify(flow.slice(0, 60))}`);
  const ts = typeof report.timestamp === 'string' ? report.timestamp.slice(0, 10) : '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(ts) && Number.isFinite(Date.parse(ts)) ? ts : new Date().toISOString().slice(0, 10);
  const root = path.resolve(dir);
  const file = path.resolve(root, `${date}-${flow}.md`);
  const rel = path.relative(root, file);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || rel.includes(path.sep)) throw new InputError(`refusing to write outside ${root}: ${file}`);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(file, renderMarkdown(report, { record: true }));
  return file;
}

// ---------- cli ----------

function defaultRuleDirs(extra = []) {
  const dirs = [];
  for (const c of [path.join(HERE, '../../flow-walk/rules'), path.join(HERE, '../rules')]) if (fs.existsSync(c)) { dirs.push(c); break; }
  for (const d of ['.flowchad/rules', ...extra]) if (fs.existsSync(d) && !dirs.some((x) => path.resolve(x) === path.resolve(d))) dirs.push(d);
  return dirs;
}

function readJson(p) {
  if (!fs.existsSync(p)) throw new InputError(`not found: ${p}`);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { throw new InputError(`${p}: ${e.message}`); }
}

export function main(argv) {
  const args = { rules: [], json: false, quiet: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { if (i + 1 >= argv.length) throw new InputError(`${a} needs a value`); return argv[++i]; };
    if (a === '--previous') args.previous = next();
    else if (a === '--rules') args.rules.push(next());
    else if (a === '--target') args.target = next();
    else if (a === '--not-before') args.notBefore = next();
    else if (a === '--config') args.config = next();
    else if (a === '--record') args.record = next();
    else if (a === '--json') args.json = true;
    else if (a === '--quiet') args.quiet = true;
    else if (a.startsWith('--')) throw new InputError(`unknown option ${a}`);
    else rest.push(a);
  }
  if (rest.length !== 1) throw new InputError('usage: gate.mjs <results.json> [--previous <results.json>] [--rules <dir>] [--target <url>] [--not-before <ISO>] [--config <file>] [--record <dir>] [--json]');
  const cfgPath = args.config || '.flowchad/config.yml';
  if (args.config && !fs.existsSync(cfgPath)) throw new InputError(`config not found: ${cfgPath}`);
  const cfg = fs.existsSync(cfgPath) ? parseConfig(fs.readFileSync(cfgPath, 'utf8')) : {};
  if (args.notBefore && !Number.isFinite(Date.parse(args.notBefore))) throw new InputError(`--not-before is not a time: ${args.notBefore}`);
  const gopts = gateOptionsFromConfig(cfg, { target: args.target, notBefore: args.notBefore });
  const rules = loadRules(args.rules.length ? args.rules : defaultRuleDirs(gopts.rules));
  const results = readJson(rest[0]);
  const previous = args.previous ? readJson(args.previous) : null;
  const report = evaluate(results, rules, { ...gopts, previous });
  if (args.record) report.record = writeRecord(report, args.record);
  if (!args.quiet) {
    if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    else process.stdout.write(renderMarkdown(report) + (report.record ? `\nRecord: ${report.record}\n` : '\n'));
  }
  return EXIT[report.status];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    if (e instanceof InputError) { process.stderr.write(`gate: ${e.message}\n`); process.exitCode = 2; } else throw e;
  }
}
