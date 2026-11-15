#!/usr/bin/env node
// gate.mjs — decide whether a walked flow may be handed to a human tester.
//
//   node gate.mjs <results.json> [--previous <results.json>] [--rules <dir>]...
//                 [--target <url>] [--not-before <ISO time>] [--record <dir>]
//                 [--json] [--quiet]
//
// Reads the walk's results.json (or a map from flowmap.mjs), the rule files
// (flow-walk/rules, plus .flowchad/rules when present), applies thresholds to
// the measures, combines them with the walker's rule_results, and prints the
// gate: PASS, FAIL or INCOMPLETE, the reasons, the measures against the
// previous walk, and the known rough edges. --record writes the durable walk
// record (text only, redacted) into <dir>, for committing.
//
// Exit: 0 PASS, 1 FAIL or INCOMPLETE, 2 bad input (unknown rule id, missing
// file, override without a reason). Node built-ins only.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const RULES_VERSION = '0.5.0';

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

// ---------- measures ----------

export const STEP_MEASURES = new Set([
  'decisions', 'fields', 'clicks', 'words', 'reading_time_s', 'scroll_before_primary_vh',
  'horizontal_overflow_px', 'controls', 'non_task_elements', 'wait_ms', 'wait_feedback',
  'wait_progress', 'dead_end', 'revisit',
]);
const READING_WPM = 238;

const scopesFor = (kind) => {
  const kinds = Array.isArray(kind) ? kind : [kind || 'screens'];
  const s = new Set();
  for (const k of kinds) {
    if (k === 'screens') { s.add('step'); s.add('flow'); } else s.add(k);
  }
  return s;
};

const firstWidthValue = (v) => (v && typeof v === 'object' ? Object.values(v)[0] : v);

export function flowMeasures(results) {
  const steps = Array.isArray(results.steps) ? results.steps : [];
  let valueIndex = steps.findIndex((s) => s.first_value === true || s.value_reached === true);
  const valueStepPassed = valueIndex >= 0 && ['pass', undefined].includes(steps[valueIndex].status);
  const isMap = scopesFor(results.kind).has('map');
  const valueReached = isMap ? results.value_reachable === true
    : results.value_reached === true || (valueStepPassed && results.goal_reached !== false);
  const upto = valueReached && valueIndex >= 0 ? steps.slice(0, valueIndex + 1) : steps;
  const m = {};
  // only walks that recorded step measures get step-derived numbers; an old
  // walk without them must not pass a threshold by counting zeros
  if (upto.some((s) => s.measures && typeof s.measures === 'object')) {
    const sum = (k, pick = (x) => x) => upto.reduce((a, s) => a + (Number(pick(s.measures?.[k])) || 0), 0);
    const screens = new Set(upto.map((s) => s.screen || s.target || `step-${s.index}`));
    m.screens_to_value = screens.size;
    m.decisions_to_value = sum('decisions');
    m.fields_to_value = sum('fields');
    m.clicks_to_value = sum('clicks');
    m.words_to_value = sum('words', firstWidthValue);
    m.reading_time_to_value_s = Math.round((m.words_to_value / READING_WPM) * 60);
    const scroll = {};
    for (const s of upto) {
      const v = s.measures?.scroll_before_primary_vh;
      if (v && typeof v === 'object') for (const [w, x] of Object.entries(v)) {
        if (typeof x === 'number') scroll[w] = Math.max(scroll[w] ?? 0, x);
      }
    }
    if (Object.keys(scroll).length) m.max_scroll_before_primary_vh = scroll;
    m.non_task_elements_to_value = sum('non_task_elements');
    const waits = upto.map((s) => Number(s.measures?.wait_ms) || 0);
    m.waits = waits.filter((w) => w > 1000).length;
    m.longest_wait_ms = waits.length ? Math.max(...waits) : 0;
    m.dead_ends = upto.filter((s) => s.measures?.dead_end === true).length;
    m.loops = upto.filter((s) => s.measures?.revisit === true).length;
    const ttv = results.counts?.time_to_first_value_ms;
    if (typeof ttv === 'number') m.time_to_value_ms = ttv;
  }
  // measures recorded directly (docs, agent and map walks) win
  Object.assign(m, results.measures || {});
  return { measures: m, valueReached, valueIndex, upto };
}

// ---------- evaluation ----------

function applyThreshold(rule, t, results, fm) {
  // returns { status: 'pass'|'fail'|'not measured', evidence: [] }
  const evidence = [];
  if (STEP_MEASURES.has(t.measure)) {
    let seen = false;
    for (const s of fm.upto) {
      const raw = s.measures?.[t.measure];
      if (raw === undefined) continue;
      if (t.when) {
        const c = s.measures?.[t.when.measure];
        if (c === undefined || !cmp(Number(c), t.when.op, t.when.value)) { seen = true; continue; }
      }
      const perWidth = raw !== null && typeof raw === 'object' ? Object.entries(raw) : [[null, raw]];
      for (const [w, x] of perWidth) {
        seen = true;
        if (x === null || x === undefined) {
          evidence.push({ step: s.index, width: w, observed: `${t.measure} not measurable (element not found or hidden)` });
        } else if (!cmp(x, t.op, t.value)) {
          evidence.push({ step: s.index, width: w, observed: `${t.measure} = ${x}${t.when ? ` with ${t.when.measure} = ${s.measures[t.when.measure]}` : ''}, needs ${t.text}` });
        }
      }
    }
    if (!seen) return { status: 'not measured', evidence };
    return { status: evidence.length ? 'fail' : 'pass', evidence };
  }
  const v = fm.measures[t.measure];
  if (v === undefined) return { status: 'not measured', evidence };
  if (t.when) {
    const c = fm.measures[t.when.measure];
    if (c === undefined || !cmp(Number(c), t.when.op, t.when.value)) return { status: 'pass', evidence };
  }
  if (!cmp(v, t.op, t.value)) evidence.push({ observed: `${t.measure} = ${v}, needs ${t.text}` });
  return { status: evidence.length ? 'fail' : 'pass', evidence };
}

export function evaluate(results, rules, opts = {}) {
  const scopes = scopesFor(results.kind);
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
    e.sources.add('walker');
    if (r.result === 'fail') {
      e.status = 'fail';
      e.evidence.push({ step: r.step, width: r.width, observed: r.observed || '' });
    } else if (r.result === 'pass' && e.status !== 'fail') e.status = 'pass';
    else if (r.result === 'n/a' && e.status === 'not judged') { e.status = 'n/a'; e.reason = r.observed || ''; }
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

  // 3. the value moment (PATH-01) is checked mechanically
  const p1 = rules.get('PATH-01');
  if (p1 && !p1.retired && (scopes.has('flow') || scopes.has('map'))) {
    const e = get('PATH-01');
    e.sources.add('measure');
    if (!results.value_moment) { e.status = 'fail'; e.evidence.push({ observed: 'the flow declares no value_moment' }); }
    else if (!fm.valueReached) { e.status = 'fail'; e.evidence.push({ observed: `value moment not reached: "${results.value_moment}"` }); }
    else if (e.status !== 'fail') e.status = 'pass';
  }

  // 4. overrides
  const overrides = new Map();
  for (const o of results.rule_overrides || []) {
    if (!rules.has(o.id)) throw new InputError(`rule_overrides names unknown rule ${o.id}`);
    if (!o.reason || !String(o.reason).trim()) throw new InputError(`rule_overrides ${o.id} has no reason`);
    overrides.set(o.id, String(o.reason).trim());
  }

  // 5. classify
  const failedBlockers = []; const notJudged = []; const roughEdges = []; const accepted = [];
  for (const rule of [...rules.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    if (rule.retired) continue;
    const applies = rule.applies.some((a) => scopes.has(a));
    const e = per.get(rule.id);
    if (!applies && !e) continue;
    const status = e ? e.status : 'not judged';
    const item = { id: rule.id, title: rule.title, severity: rule.severity, evidence: e ? e.evidence : [] };
    if (status === 'fail' && overrides.has(rule.id)) accepted.push({ ...item, reason: overrides.get(rule.id) });
    else if (status === 'fail' && rule.severity === 'blocker') failedBlockers.push(item);
    else if (status === 'fail') roughEdges.push(item);
    else if (status === 'not judged' && rule.severity === 'blocker' && applies) notJudged.push(item);
  }

  // 6. gate conditions: hard failures, then gaps in what was walked or judged
  const failed = []; const gaps = [];
  if (!scopes.has('map') && scopes.has('flow') && results.goal_reached !== true) {
    const st = results.stopped_at;
    if (st && /write step/i.test(`${st.reason || ''} ${st.words || ''}`)) {
      gaps.push(`stopped before a write step at step ${st.step} on a read-only-live surface; walk the rest on a test surface`);
    } else {
      failed.push(`goal not reached${st ? ` (stopped at step ${st.step}${st.screen ? `, ${st.screen}` : ''}${st.words ? `: "${st.words}"` : ''})` : ''}`);
    }
  }
  for (const b of failedBlockers) failed.push(`blocker ${b.id} failed: ${b.title}`);
  for (const b of notJudged) gaps.push(`blocker ${b.id} not judged: ${b.title}`);
  const walkedUrl = results.config?.url || results.target?.url || '';
  if (opts.target) {
    const want = hostOf(opts.target); const got = hostOf(walkedUrl);
    if (!got || want !== got) failed.push(`walked ${got || 'an unknown host'}, but the tester will open ${want}`);
  }
  if (opts.notBefore) {
    const t = Date.parse(results.timestamp || '');
    if (!Number.isFinite(t) || t < Date.parse(opts.notBefore)) failed.push(`walk at ${results.timestamp || 'unknown time'} is older than ${opts.notBefore} (the last deploy)`);
  }
  const reasons = [...failed, ...gaps];
  const status = failed.length ? 'FAIL' : gaps.length ? 'INCOMPLETE' : 'PASS';

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
  try { return new URL(u).host; } catch { return ''; }
}

// ---------- output ----------

const fmt = (v) => {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'object') return Object.entries(v).map(([w, x]) => `${w}: ${x}`).join(' · ');
  return String(v);
};
const delta = (a, b) => (typeof a === 'number' && typeof b === 'number' ? (b - a === 0 ? 'same' : `${b - a > 0 ? '+' : ''}${Math.round((b - a) * 100) / 100}`) : '');

export function redact(s) {
  return String(s ?? '')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\d{12,}/g, '[number]')
    .replace(/(https?:\/\/[^\s?#"']+)[?#][^\s"']*/g, '$1');
}

const evid = (e) => e.map((x) => `${x.step !== undefined && x.step !== null ? `step ${x.step}` : ''}${x.width ? ` @${x.width}` : ''}${x.observed ? `${x.step !== undefined && x.step !== null ? ': ' : ''}${x.observed}` : ''}`.trim()).filter(Boolean).join('; ');

export function renderMarkdown(r, { record = false } = {}) {
  const L = [];
  if (record) {
    L.push(`# Walk record: ${r.flow}`, '');
    L.push(`- **Flow:** ${r.name || r.flow}`);
    L.push(`- **Value moment:** ${r.value_moment || 'not declared'}`);
    L.push(`- **Walked:** ${r.timestamp || 'unknown'}`);
    L.push(`- **Target:** ${redact(r.target) || 'unknown'}${r.surface ? ` (${r.surface})` : ''}`);
    L.push(`- **Commit:** ${r.commit || 'unknown'}`);
    L.push(`- **Kind:** ${Array.isArray(r.kind) ? r.kind.join(', ') : r.kind}`);
    L.push(`- **Gate:** ${r.status}`);
    L.push(`- **Rules:** ${r.rules_version}`, '');
  } else {
    L.push(`## Gate: ${r.status} — ${r.flow}`, '');
  }
  if (r.status === 'PASS') L.push('Ready to hand to a human tester. Known rough edges are listed below; tell the tester about them first.', '');
  else {
    L.push(r.status === 'INCOMPLETE' ? 'Not ready: the walk did not cover everything the gate needs.' : 'Not ready: do not hand this to a human tester until these pass.', '');
    for (const x of r.reasons) L.push(`- ${redact(x)}`);
    L.push('');
  }
  if (r.failed_blockers.length) {
    L.push('### Blockers failed', '');
    for (const b of r.failed_blockers) L.push(`- **${b.id}** ${b.title}${b.evidence.length ? ` — ${redact(evid(b.evidence))}` : ''}`);
    L.push('');
  }
  L.push(`### Known rough edges (${r.rough_edges.length})`, '');
  if (!r.rough_edges.length) L.push('- none found by the rules');
  for (const b of r.rough_edges) L.push(`- **${b.id}** (${b.severity}) ${b.title}${b.evidence.length ? ` — ${redact(evid(b.evidence))}` : ''}`);
  L.push('');
  if (r.accepted_exceptions.length) {
    L.push('### Accepted exceptions', '');
    for (const b of r.accepted_exceptions) L.push(`- **${b.id}** ${b.title} — failed, accepted: ${redact(b.reason)}`);
    L.push('');
  }
  L.push(`### Measures${r.previous_timestamp ? ` (previous walk ${r.previous_timestamp})` : ''}`, '');
  L.push('| Measure | Previous | Now | Change |', '|---|---|---|---|');
  for (const m of r.measures) L.push(`| \`${m.measure}\` | ${fmt(m.previous)} | ${fmt(m.now)} | ${delta(m.previous, m.now)} |`);
  if (!r.value_reached) L.push('', 'The value moment was not reached; totals cover every step walked.');
  L.push('');
  if (r.not_covered.length) {
    L.push('### Not covered by a rule', '', 'Candidates for a new rule (see flow-walk/rules/README.md § Admission test):', '');
    for (const n of r.not_covered) L.push(`- ${redact(typeof n === 'string' ? n : n.observed || JSON.stringify(n))}`);
    L.push('');
  }
  if (r.notes.length) { L.push('### Notes', ''); for (const n of r.notes) L.push(`- ${n}`); L.push(''); }
  return L.join('\n');
}

export function writeRecord(report, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const date = (report.timestamp || new Date().toISOString()).slice(0, 10);
  const file = path.join(dir, `${date}-${report.flow}.md`);
  fs.writeFileSync(file, renderMarkdown(report, { record: true }));
  return file;
}

// ---------- cli ----------

function defaultRuleDirs() {
  const dirs = [];
  for (const c of [path.join(HERE, '../../flow-walk/rules'), path.join(HERE, '../rules')]) if (fs.existsSync(c)) { dirs.push(c); break; }
  if (fs.existsSync('.flowchad/rules')) dirs.push('.flowchad/rules');
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
    else if (a === '--record') args.record = next();
    else if (a === '--json') args.json = true;
    else if (a === '--quiet') args.quiet = true;
    else if (a.startsWith('--')) throw new InputError(`unknown option ${a}`);
    else rest.push(a);
  }
  if (rest.length !== 1) throw new InputError('usage: gate.mjs <results.json> [--previous <results.json>] [--rules <dir>] [--target <url>] [--not-before <ISO>] [--record <dir>] [--json]');
  const rules = loadRules(args.rules.length ? args.rules : defaultRuleDirs());
  const results = readJson(rest[0]);
  const previous = args.previous ? readJson(args.previous) : null;
  if (args.notBefore && !Number.isFinite(Date.parse(args.notBefore))) throw new InputError(`--not-before is not a time: ${args.notBefore}`);
  const report = evaluate(results, rules, { previous, target: args.target, notBefore: args.notBefore });
  if (args.record) report.record = writeRecord(report, args.record);
  if (!args.quiet) {
    if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    else process.stdout.write(renderMarkdown(report) + (report.record ? `\nRecord: ${report.record}\n` : '\n'));
  }
  return report.status === 'PASS' ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    if (e instanceof InputError) { process.stderr.write(`gate: ${e.message}\n`); process.exitCode = 2; } else throw e;
  }
}
