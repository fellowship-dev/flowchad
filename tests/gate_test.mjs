// gate_test.mjs — flow-gate/scripts/gate.mjs against the shipped rules.
// Node built-ins only: node tests/gate_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluate as evaluateRaw, loadRules, parseThreshold, flowMeasures, renderMarkdown, writeRecord, redact, redactUrl, parseConfig, gateOptionsFromConfig, InputError } from '../.flowchad/skills/flow-gate/scripts/gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RULES = path.join(ROOT, '.flowchad/skills/flow-walk/rules');
const GATE = path.join(ROOT, '.flowchad/skills/flow-gate/scripts/gate.mjs');
const rules = loadRules([RULES]);
// Most tests gate a walk of www.example.com for a tester who opens the same address.
const TARGET = { target: 'https://www.example.com' };
const evaluate = (w, r, o = {}) => evaluateRaw(w, r, { ...TARGET, ...o });
let failures = 0;
const test = (name, fn) => {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failures++; console.log(`FAIL ${name}\n     ${String(e.message).split('\n').join('\n     ')}`); }
};

const BLOCKERS_STEP_FLOW = [...rules.values()].filter((r) => r.severity === 'blocker' && !r.retired && r.applies.some((a) => a === 'step' || a === 'flow')).map((r) => r.id);

// A clean three-step walk: every blocker judged, measures within thresholds.
function walk(over = {}) {
  const step = (index, extra = {}) => ({
    index, action: 'navigate', status: 'pass', screen: `/s${index}`,
    measures: {
      words: 40, decisions: 1, fields: 1, clicks: 1, non_task_elements: 0,
      scroll_before_primary_vh: { 1440: 0, 375: 0 }, horizontal_overflow_px: { 1440: 0, 375: 0 },
      wait_ms: 500, wait_feedback: false, dead_end: false, revisit: false,
    },
    ...extra,
  });
  return {
    flow: 'new-user-sets-up', name: 'New user sets up', kind: 'screens',
    value_moment: 'The dashboard shows the first check',
    timestamp: '2026-11-15T16:00:00-03:00',
    config: { url: 'https://www.example.com' }, surface: { mode: 'read-only-live', commit: 'abc1234' },
    goal_reached: true, counts: { time_to_first_value_ms: 42000 },
    steps: [step(1), step(2), step(3, { first_value: true })],
    rule_results: BLOCKERS_STEP_FLOW.map((id) => ({ id, result: 'pass' })),
    ...over,
  };
}

test('rules load: 44 active rules, blockers include FOLD-01 and DEC-02', () => {
  assert.equal([...rules.values()].filter((r) => !r.retired).length, 44);
  assert.ok(BLOCKERS_STEP_FLOW.includes('FOLD-01') && BLOCKERS_STEP_FLOW.includes('DEC-02'));
});

test('threshold parsing', () => {
  assert.deepEqual(parseThreshold('scroll_before_primary_vh = 0'), { measure: 'scroll_before_primary_vh', op: '=', value: 0, text: 'scroll_before_primary_vh = 0' });
  const t = parseThreshold('wait_feedback = true when wait_ms >= 2000');
  assert.equal(t.value, true); assert.deepEqual(t.when, { measure: 'wait_ms', op: '>=', value: 2000 });
  assert.throws(() => parseThreshold('vibes are good'), InputError);
});

test('a clean walk passes', () => {
  const r = evaluate(walk(), rules);
  assert.equal(r.status, 'PASS', r.reasons.join('; '));
  assert.equal(r.rough_edges.length, 0);
});

test('fold threshold fails a blocker at one width', () => {
  const w = walk(); w.steps[1].measures.scroll_before_primary_vh = { 1440: 0, 375: 1.4 };
  const r = evaluate(w, rules);
  assert.equal(r.status, 'FAIL');
  const f = r.failed_blockers.find((b) => b.id === 'FOLD-01');
  assert.ok(f, 'FOLD-01 failed');
  assert.match(f.evidence[0].observed, /= 1\.4/); assert.equal(f.evidence[0].step, 2); assert.equal(f.evidence[0].width, '375');
});

test('a hidden primary element (null) fails the fold rule', () => {
  const w = walk(); w.steps[0].measures.scroll_before_primary_vh = { 1440: null, 375: 0 };
  assert.ok(evaluate(w, rules).failed_blockers.some((b) => b.id === 'FOLD-01'));
});

test('the walker passing a rule does not hide a failed threshold', () => {
  const w = walk(); w.steps[2].measures.scroll_before_primary_vh = { 1440: 2, 375: 2 };
  assert.ok(w.rule_results.some((x) => x.id === 'FOLD-01' && x.result === 'pass'));
  assert.equal(evaluate(w, rules).status, 'FAIL');
});

test('steps after the value moment are not counted', () => {
  const w = walk(); w.steps.push({ ...w.steps[0], index: 4, screen: '/after', measures: { ...w.steps[0].measures, scroll_before_primary_vh: { 1440: 3, 375: 3 } } });
  const r = evaluate(w, rules);
  assert.equal(r.status, 'PASS', r.reasons.join('; '));
  assert.equal(r.measures.find((m) => m.measure === 'screens_to_value').now, 3);
});

test('should-fix failures are rough edges, not gate failures', () => {
  const w = walk(); w.steps[0].measures.wait_ms = 4000; w.steps[0].measures.wait_feedback = false;
  w.rule_results.push({ id: 'NOISE-01', result: 'fail', step: 2, observed: 'plan badge, promo banner' });
  const r = evaluate(w, rules);
  assert.equal(r.status, 'PASS', r.reasons.join('; '));
  assert.deepEqual(r.rough_edges.map((x) => x.id).sort(), ['NOISE-01', 'WAIT-01']);
});

test('the when-clause skips short waits', () => {
  const w = walk(); w.steps[0].measures.wait_ms = 1500; w.steps[0].measures.wait_feedback = false;
  assert.equal(evaluate(w, rules).rough_edges.length, 0);
});

test('a walker-failed blocker fails the gate', () => {
  const w = walk(); w.rule_results = w.rule_results.map((x) => (x.id === 'DEC-02' ? { ...x, result: 'fail', step: 3, observed: 'password asked again' } : x));
  const r = evaluate(w, rules);
  assert.equal(r.status, 'FAIL'); assert.ok(r.reasons.some((x) => x.includes('DEC-02')));
});

test('an unjudged blocker makes the gate incomplete', () => {
  const w = walk(); w.rule_results = w.rule_results.filter((x) => x.id !== 'WORD-05');
  const r = evaluate(w, rules);
  assert.equal(r.status, 'INCOMPLETE'); assert.ok(r.not_judged.some((x) => x.id === 'WORD-05'));
});

test('n/a with a reason counts as judged', () => {
  const w = walk(); w.rule_results = w.rule_results.map((x) => (x.id === 'WORD-05' ? { id: 'WORD-05', result: 'n/a', observed: 'the flow states no facts' } : x));
  assert.equal(evaluate(w, rules).status, 'PASS');
});

test('an old walk without measures cannot pass', () => {
  const w = walk(); for (const s of w.steps) delete s.measures;
  w.rule_results = w.rule_results.filter((x) => !['FOLD-01', 'ERR-01'].includes(x.id));
  const r = evaluate(w, rules);
  assert.equal(r.status, 'INCOMPLETE');
  assert.ok(r.not_judged.some((x) => x.id === 'FOLD-01') && r.not_judged.some((x) => x.id === 'ERR-01'));
});

test('no value moment fails PATH-01', () => {
  const r = evaluate(walk({ value_moment: undefined }), rules);
  assert.equal(r.status, 'FAIL'); assert.ok(r.failed_blockers.some((b) => b.id === 'PATH-01'));
});

test('goal not reached fails, with where it stopped', () => {
  const w = walk({ goal_reached: false, stopped_at: { step: 2, screen: '/s2', words: 'Something went wrong' } });
  w.steps[2].status = 'fail';
  const r = evaluate(w, rules);
  assert.equal(r.status, 'FAIL'); assert.ok(r.reasons.some((x) => /goal not reached .*Something went wrong/.test(x)));
});

test('stopping before a write step on production is incomplete, not failed', () => {
  const w = walk({ goal_reached: false, value_reached: true, stopped_at: { step: 3, reason: 'stopped before a write step (surface is read-only-live)' } });
  const r = evaluate(w, rules);
  assert.equal(r.status, 'INCOMPLETE', r.reasons.join('; '));
});

test('a dead end on the path fails ERR-01', () => {
  const w = walk(); w.steps[1].measures.dead_end = true;
  assert.ok(evaluate(w, rules).failed_blockers.some((b) => b.id === 'ERR-01'));
});

test('an override with a reason is an accepted exception', () => {
  const w = walk({ rule_overrides: [{ id: 'DEC-01', reason: 'expert repeat screen' }] }); w.steps[0].measures.decisions = 3;
  const r = evaluate(w, rules);
  assert.equal(r.status, 'PASS');
  assert.equal(r.accepted_exceptions[0].id, 'DEC-01'); assert.equal(r.rough_edges.length, 0);
});

test('an override without a reason is an input error', () => {
  assert.throws(() => evaluate(walk({ rule_overrides: [{ id: 'DEC-01' }] }), rules), InputError);
});

test('an unknown rule id is an input error', () => {
  const w = walk(); w.rule_results.push({ id: 'NOPE-99', result: 'fail' });
  assert.throws(() => evaluate(w, rules), /unknown rule NOPE-99/);
});

test('the target host must match', () => {
  assert.equal(evaluate(walk(), rules, { target: 'https://www.example.com/start' }).status, 'PASS');
  const r = evaluate(walk({ config: { url: 'http://localhost:3000' } }), rules, { target: 'https://www.example.com' });
  assert.equal(r.status, 'FAIL'); assert.ok(r.reasons.some((x) => x.includes('localhost:3000')));
});

test('a walk older than the last deploy fails', () => {
  assert.equal(evaluate(walk(), rules, { notBefore: '2026-11-15T20:00:00Z' }).status, 'FAIL');
  assert.equal(evaluate(walk(), rules, { notBefore: '2026-11-15T18:00:00Z' }).status, 'PASS');
});

test('measures against the previous walk', () => {
  const prev = walk({ timestamp: '2026-11-12T10:00:00-03:00' });
  prev.steps.unshift({ ...prev.steps[0], index: 0, screen: '/extra' });
  const r = evaluate(walk(), rules, { previous: prev });
  const s = r.measures.find((m) => m.measure === 'screens_to_value');
  assert.equal(s.previous, 4); assert.equal(s.now, 3);
  const md = renderMarkdown(r);
  assert.match(md, /\| `screens_to_value` \| 4 \| 3 \| -1 \|/);
  assert.match(md, /previous walk 2026-11-12/);
});

test('docs walk: unanswered questions fail DOCS-01', () => {
  const docs = { flow: 'agent-installs', kind: 'docs', config: { url: 'https://www.example.com/docs' }, value_moment: 'A working install', goal_reached: true, timestamp: '2026-11-15T16:00:00Z', measures: { unanswered_questions: 2, commands_to_install: 7 }, rule_results: [{ id: 'WORD-05', result: 'pass' }] };
  const r = evaluate(docs, rules);
  assert.equal(r.status, 'FAIL'); assert.ok(r.failed_blockers.some((b) => b.id === 'DOCS-01'));
  docs.measures.unanswered_questions = 0;
  assert.equal(evaluate(docs, rules).status, 'PASS');
});

test('retired rules are ignored with a note', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-rules-'));
  fs.writeFileSync(path.join(dir, 'x.md'), '<!-- prefix: X -->\n### X-01 · Old\n\n- **Rule:** Old.\n- **Severity:** blocker\n- **Applies to:** step\n- **Retired:** 0.6.0 — gone\n');
  const local = loadRules([dir]);
  const r = evaluate({ flow: 'f', kind: 'screens', config: { url: 'https://www.example.com' }, value_moment: 'v', goal_reached: true, steps: [{ index: 1, first_value: true, status: 'pass', measures: {} }], rule_results: [{ id: 'X-01', result: 'fail' }] }, local);
  assert.equal(r.status, 'PASS'); assert.match(r.notes[0], /X-01 is retired/);
});

test('record is redacted and names the commit', () => {
  const w = walk({ config: { url: 'https://www.example.com/start?token=secret' } });
  w.rule_results.push({ id: 'NOISE-01', result: 'fail', step: 1, observed: 'banner for someone@example.com, account 123456789012' });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-walks-'));
  const file = writeRecord(evaluate(w, rules), dir);
  assert.equal(path.basename(file), '2026-11-15-new-user-sets-up.md');
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /^- \*\*Commit:\*\* abc1234$/m); assert.match(text, /^- \*\*Gate:\*\* PASS$/m);
  assert.doesNotMatch(text, /someone@|123456789012|token=secret/);
  assert.match(text, /\[email\]/);
  assert.equal(redact('see https://a.example/x?y=1 now'), 'see https://a.example/x now');
});

test('cli: exit codes 0 pass, 1 fail, 2 bad input', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-cli-'));
  const ok = path.join(dir, 'ok.json'); fs.writeFileSync(ok, JSON.stringify(walk()));
  const bad = walk(); bad.steps[0].measures.scroll_before_primary_vh = { 375: 2 };
  const badf = path.join(dir, 'bad.json'); fs.writeFileSync(badf, JSON.stringify(bad));
  const T = ['--target', 'https://www.example.com'];
  const run = { encoding: 'utf8', cwd: dir };
  const out = execFileSync(process.execPath, [GATE, ok, ...T, '--record', path.join(dir, 'walks')], run);
  assert.match(out, /## Gate: PASS/); assert.match(out, /Record: /);
  assert.equal(spawnSync(process.execPath, [GATE, badf, ...T], run).status, 1);
  assert.equal(spawnSync(process.execPath, [GATE, path.join(dir, 'missing.json')], run).status, 2);
  assert.equal(spawnSync(process.execPath, [GATE, ok, '--bogus'], run).status, 2);
  const j = JSON.parse(execFileSync(process.execPath, [GATE, ok, ...T, '--json', '--rules', RULES], run));
  assert.equal(j.status, 'PASS');
});

test('flowMeasures sums to value', () => {
  const m = flowMeasures(walk()).measures;
  assert.equal(m.decisions_to_value, 3); assert.equal(m.fields_to_value, 3); assert.equal(m.words_to_value, 120);
  assert.equal(m.reading_time_to_value_s, 30); assert.equal(m.time_to_value_ms, 42000);
  assert.deepEqual(m.max_scroll_before_primary_vh, { 1440: 0, 375: 0 });
});

// ---------- review fixes: each of these failed before the fix ----------

// A1: the value moment needs evidence, not a flag
test('A1 a self-declared value_reached with no steps is incomplete, not a pass', () => {
  const r = evaluate(walk({ steps: [], value_reached: true }), rules);
  assert.equal(r.status, 'INCOMPLETE', r.reasons.join('; '));
  assert.ok(r.reasons.some((x) => /no evidence the value moment was reached: the walk recorded no steps/.test(x)));
});

test('A1 value_reached:true with no step marked first_value is incomplete', () => {
  const w = walk({ value_reached: true }); for (const s of w.steps) delete s.first_value;
  const r = evaluate(w, rules);
  assert.equal(r.status, 'INCOMPLETE');
  assert.ok(r.reasons.some((x) => /no step is marked first_value/.test(x)));
});

test('A1 a step on the path without a per-step record is incomplete', () => {
  const w = walk(); delete w.steps[1].measures;
  const r = evaluate(w, rules);
  assert.equal(r.status, 'INCOMPLETE');
  assert.ok(r.reasons.some((x) => /step 2 has no per-step record/.test(x)));
});

test('A1 a failed value step fails PATH-01, whatever value_reached says', () => {
  const w = walk({ value_reached: true }); w.steps[2].status = 'fail';
  const r = evaluate(w, rules);
  assert.equal(r.status, 'FAIL'); assert.ok(r.failed_blockers.some((b) => b.id === 'PATH-01'));
});

test('A1 a docs walk that did not reach its goal fails', () => {
  const docs = { flow: 'd', kind: 'docs', config: { url: 'https://www.example.com/docs' }, value_moment: 'A working install', goal_reached: false, timestamp: '2026-11-15T16:00:00Z', measures: { unanswered_questions: 0 }, rule_results: [{ id: 'WORD-05', result: 'pass' }] };
  assert.equal(evaluate(docs, rules).status, 'FAIL');
});

// A2: overrides of blockers
const OVR = { id: 'DEC-02', reason: 'the second ask is a legal re-consent we cannot remove yet', by: 'release owner', date: '2026-11-15' };
const failDec02 = (over = {}) => { const w = walk(over); w.rule_results = w.rule_results.map((x) => (x.id === 'DEC-02' ? { ...x, result: 'fail', step: 2, observed: 'asked twice' } : x)); return w; };

test('A2 the value-moment rule cannot be overridden', () => {
  const w = walk({ rule_overrides: [{ id: 'PATH-01', reason: 'we know it does not reach value yet, ship anyway', by: 'someone', date: '2026-11-15' }] });
  assert.throws(() => evaluate(w, rules), /PATH-01: this rule states that the value moment was reached and cannot be overridden/);
});

test('A2 a blocker override needs a meaningful reason, who and when', () => {
  assert.throws(() => evaluate(failDec02({ rule_overrides: [{ ...OVR, reason: 'x' }] }), rules), /at least 4 words/);
  assert.throws(() => evaluate(failDec02({ rule_overrides: [{ ...OVR, reason: 'because' }] }), rules), /at least 4 words/);
  assert.throws(() => evaluate(failDec02({ rule_overrides: [{ ...OVR, by: '' }] }), rules), /who accepted it/);
  assert.throws(() => evaluate(failDec02({ rule_overrides: [{ ...OVR, date: 'soon' }] }), rules), /say when/);
});

test('A2 an overridden blocker gives PASS-WITH-OVERRIDES, listed first under known rough edges', () => {
  const r = evaluate(failDec02({ rule_overrides: [OVR] }), rules);
  assert.equal(r.status, 'PASS-WITH-OVERRIDES', r.reasons.join('; '));
  const md = renderMarkdown(r);
  assert.match(md, /## Gate: PASS-WITH-OVERRIDES/);
  const edges = md.split('### Known rough edges (1)')[1];
  assert.ok(edges, md);
  assert.match(edges, /^\n\n- \*\*DEC-02\*\* \(blocker, \*\*OVERRIDDEN\*\* by release owner on 2026-11-15\) Ask once — failed: step 2: asked twice; accepted because: the second ask/);
});

test('A2 cli: PASS-WITH-OVERRIDES has its own exit code (3)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-ovr-'));
  const f = path.join(dir, 'w.json'); fs.writeFileSync(f, JSON.stringify(failDec02({ rule_overrides: [OVR] })));
  assert.equal(spawnSync(process.execPath, [GATE, f, '--target', 'https://www.example.com'], { cwd: dir }).status, 3);
});

// A3: target and staleness are not optional
test('A3 no target from flags or config is incomplete ("target not stated")', () => {
  const r = evaluateRaw(walk(), rules, {});
  assert.equal(r.status, 'INCOMPLETE');
  assert.ok(r.reasons.some((x) => /^target not stated/.test(x)));
});

test('A3 a configured deploy check makes the deploy time required', () => {
  const r = evaluate(walk(), rules, { deployTracked: true });
  assert.equal(r.status, 'INCOMPLETE'); assert.ok(r.reasons.some((x) => /deploy time not stated/.test(x)));
  assert.equal(evaluate(walk(), rules, { deployTracked: true, notBefore: '2026-11-15T18:00:00Z' }).status, 'PASS');
});

test('A3 config: gate.target and deploy checks are read', () => {
  const cfg = parseConfig([
    '# comment', 'url: https://staging.example.com', 'gate:', '  target: https://www.example.com   # tester address',
    '  rules: [.flowchad/rules]', 'environments:', '  production:', '    url: https://www.example.com', '    deploy_check: vercel',
    '  staging:', '    url: https://staging.example.com', '    deploy_check: none',
  ].join('\n'));
  assert.equal(cfg.gate.target, 'https://www.example.com');
  assert.deepEqual(cfg.gate.rules, ['.flowchad/rules']);
  const o = gateOptionsFromConfig(cfg);
  assert.equal(o.target, 'https://www.example.com'); assert.equal(o.deployTracked, true);
  assert.equal(gateOptionsFromConfig(cfg, { target: 'https://staging.example.com' }).deployTracked, false);
});

test('A3 cli reads gate.target from .flowchad/config.yml', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-cfg-'));
  fs.mkdirSync(path.join(dir, '.flowchad'));
  const f = path.join(dir, 'w.json'); fs.writeFileSync(f, JSON.stringify(walk()));
  fs.writeFileSync(path.join(dir, '.flowchad/config.yml'), 'gate:\n  target: https://other.example.org\n');
  const p = spawnSync(process.execPath, [GATE, f], { cwd: dir, encoding: 'utf8' });
  assert.equal(p.status, 1); assert.match(p.stdout, /but the tester will open other\.example\.org/);
  fs.writeFileSync(path.join(dir, '.flowchad/config.yml'), 'gate:\n  target: https://www.example.com\n');
  assert.equal(spawnSync(process.execPath, [GATE, f], { cwd: dir }).status, 0);
  const none = spawnSync(process.execPath, [GATE, f, '--config', path.join(dir, 'missing.yml')], { cwd: dir });
  assert.equal(none.status, 2);
});

// A4: a blocker nobody judged
test('A4 ERR-01 is not judged when no step recorded dead_end', () => {
  const w = walk(); for (const s of w.steps) delete s.measures.dead_end;
  w.rule_results = w.rule_results.filter((x) => x.id !== 'ERR-01');
  const r = evaluate(w, rules);
  assert.equal(r.status, 'INCOMPLETE'); assert.ok(r.not_judged.some((x) => x.id === 'ERR-01'));
});

test('A4 a step measure recorded on only some steps does not pass a blocker', () => {
  const w = walk(); delete w.steps[1].measures.scroll_before_primary_vh;
  w.rule_results = w.rule_results.filter((x) => x.id !== 'FOLD-01');
  const r = evaluate(w, rules);
  assert.equal(r.status, 'INCOMPLETE'); assert.ok(r.not_judged.some((x) => x.id === 'FOLD-01'));
});

test('A4 n/a without a reason counts as not judged', () => {
  const w = walk(); w.rule_results = w.rule_results.map((x) => (x.id === 'WORD-05' ? { id: 'WORD-05', result: 'n/a' } : x));
  const r = evaluate(w, rules);
  assert.equal(r.status, 'INCOMPLETE'); assert.ok(r.not_judged.some((x) => x.id === 'WORD-05'));
});

// A5: the record stays inside the walks folder
test('A5 an unsafe flow id is refused and nothing is written outside walks/', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-trav-'));
  const walks = path.join(base, 'a', 'walks');
  for (const flow of ['../../../escaped', '../x', 'a/b', '.hidden', '', 'x'.repeat(200)]) {
    assert.throws(() => writeRecord(evaluate(walk({ flow }), rules), walks), InputError, flow);
  }
  assert.ok(!fs.existsSync(path.join(base, 'a', 'escaped.md')) && !fs.existsSync(path.join(base, 'escaped.md')));
  assert.ok(!fs.existsSync(walks) || fs.readdirSync(walks).length === 0);
  const ok = writeRecord(evaluate(walk({ timestamp: '../../../../x' }), rules), walks);
  assert.equal(path.dirname(ok), path.resolve(walks));
});

// B: redaction of every free-text field
// Secret-shaped fixtures are built at run time so no token-like literal sits in the repo.
const J = (...p) => p.join('');
const SHAPES = {
  email: ['mail jane.doe@client-corp.example', 'jane.doe@'],
  github: [J('Bearer gh', 'p_', 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'), 'p_AbCd'],
  stripe: [J('key sk', '_live_', '51HxYzAbCdEfGhIjKlMnOp'), '_live_'],
  aws: [J('AK', 'IA', 'IOSFODNN7EXAMPLE'), 'IOSFODNN7'],
  jwt: ['jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc123', 'eyJhbGci'],
  bearer: ['Authorization: Bearer abc.def-ghi_jkl', 'abc.def-ghi_jkl'],
  query: ['https://app.example.org/reset?token=secret123#frag', 'secret123'],
  pathToken: ['https://app.example.org/invite/9f8e7d6c5b4a39281706f5e4d3c2b1a0', '9f8e7d6c5b4a'],
  uuid: ['https://app.example.org/s/3f2b1c9e-8a7d-4e6f-9b0a-1c2d3e4f5a6b/x', '3f2b1c9e'],
  userinfo: ['https://user:pass@app.example.org/signup', 'user'],
  account: ['acct 123456789012', '123456789012'],
  accountHyphen: ['acct 1234-5678-9012', '1234-5678-9012'],
  phone: ['phone +44 20 7946 0958', '7946 0958'],
  phoneUS: ['call (555) 123-4567', '123-4567'],
  card: ['card 4242 4242 4242 4242', '4242 4242'],
  kv: ['token=zzz and password: hunter2 and api_key=abc', 'zzz'],
  kv2: ['password: hunter2', 'hunter2'],
  hex: ['sha 0123456789abcdef0123456789abcdef', '0123456789abcdef0123'],
  base64: [J('k wJalrXUtnFEMI', '/K7MDENG/bPxRfiCYEXAMPLEKEY'), 'wJalrXUtnFEMI'],
};
for (const [name, [input, leak]] of Object.entries(SHAPES)) {
  test(`B redact: ${name}`, () => {
    const out = redact(input);
    assert.ok(!out.includes(leak), `${input} -> ${out}`);
  });
}

test('B redact: hosts, dates, versions and short numbers survive', () => {
  assert.equal(redactUrl('https://user:pass@app.example.org:8443/signup?invite=abc#x'), 'https://app.example.org:8443/signup');
  assert.equal(redact('walk at 2026-11-15T16:00:00-03:00 on http://localhost:3000/a'), 'walk at 2026-11-15T16:00:00-03:00 on http://localhost:3000/a');
  assert.equal(redact('step 3 @375: scroll_before_primary_vh = 1.4, needs scroll_before_primary_vh = 0'), 'step 3 @375: scroll_before_primary_vh = 1.4, needs scroll_before_primary_vh = 0');
  assert.equal(redact('card 4242 4242 4242 4242'), 'card [card]');
  assert.equal(redact('rules 0.5.0, order 12345, 3 of 5 done'), 'rules 0.5.0, order 12345, 3 of 5 done');
});

test('B the record redacts every free-text field, including flow name, value moment and target', () => {
  const leaks = ['jane.doe@', '123456789012', 'user:pass', 'user@', 'p_AbCd', '_live_', 'IOSFODNN7', 'eyJhbGci', 'zzz', '9f8e7d6c', '+44', '4242 4242', 'invite=abc'];
  const secret = Object.values(SHAPES).map((x) => x[0]).join(' | ');
  const w = walk({ name: 'Flow for jane.doe@client-corp.example', value_moment: 'sees 123456789012',
    config: { url: 'https://user:pass@app.example.org/signup?invite=abc' }, not_covered: [secret] });
  w.rule_results.push({ id: 'NOISE-01', result: 'fail', step: 1, observed: secret });
  w.rule_overrides = [{ id: 'NOISE-01', reason: 'ok for jane.doe@client-corp.example token=zzz', by: 'jane.doe@client-corp.example' }];
  const r = evaluate(w, rules, { target: 'https://app.example.org' });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-red-'));
  const text = fs.readFileSync(writeRecord(r, dir), 'utf8');
  for (const l of leaks) assert.ok(!text.includes(l), `record leaks ${l}:\n${text}`);
  assert.match(text, /^- \*\*Target:\*\* https:\/\/app\.example\.org\/signup /m);
  assert.match(text, /Review before committing/);
});

console.log(failures ? `\n${failures} gate test(s) failed` : '\nall gate tests passed');
process.exitCode = failures ? 1 : 0;
