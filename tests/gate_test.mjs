// gate_test.mjs — flow-gate/scripts/gate.mjs against the shipped rules.
// Node built-ins only: node tests/gate_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluate, loadRules, parseThreshold, flowMeasures, renderMarkdown, writeRecord, redact, InputError } from '../.flowchad/skills/flow-gate/scripts/gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RULES = path.join(ROOT, '.flowchad/skills/flow-walk/rules');
const GATE = path.join(ROOT, '.flowchad/skills/flow-gate/scripts/gate.mjs');
const rules = loadRules([RULES]);
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
  const docs = { flow: 'agent-installs', kind: 'docs', value_moment: 'A working install', goal_reached: true, timestamp: '2026-11-15T16:00:00Z', measures: { unanswered_questions: 2, commands_to_install: 7 }, rule_results: [{ id: 'WORD-05', result: 'pass' }] };
  const r = evaluate(docs, rules);
  assert.equal(r.status, 'FAIL'); assert.ok(r.failed_blockers.some((b) => b.id === 'DOCS-01'));
  docs.measures.unanswered_questions = 0;
  assert.equal(evaluate(docs, rules).status, 'PASS');
});

test('retired rules are ignored with a note', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-rules-'));
  fs.writeFileSync(path.join(dir, 'x.md'), '<!-- prefix: X -->\n### X-01 · Old\n\n- **Rule:** Old.\n- **Severity:** blocker\n- **Applies to:** step\n- **Retired:** 0.6.0 — gone\n');
  const local = loadRules([dir]);
  const r = evaluate({ flow: 'f', kind: 'screens', value_moment: 'v', goal_reached: true, steps: [{ index: 1, first_value: true, status: 'pass', measures: {} }], rule_results: [{ id: 'X-01', result: 'fail' }] }, local);
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
  const out = execFileSync(process.execPath, [GATE, ok, '--record', path.join(dir, 'walks')], { encoding: 'utf8' });
  assert.match(out, /## Gate: PASS/); assert.match(out, /Record: /);
  assert.equal(spawnSync(process.execPath, [GATE, badf]).status, 1);
  assert.equal(spawnSync(process.execPath, [GATE, path.join(dir, 'missing.json')]).status, 2);
  assert.equal(spawnSync(process.execPath, [GATE, ok, '--bogus']).status, 2);
  const j = JSON.parse(execFileSync(process.execPath, [GATE, ok, '--json', '--rules', RULES], { encoding: 'utf8' }));
  assert.equal(j.status, 'PASS');
});

test('flowMeasures sums to value', () => {
  const m = flowMeasures(walk()).measures;
  assert.equal(m.decisions_to_value, 3); assert.equal(m.fields_to_value, 3); assert.equal(m.words_to_value, 120);
  assert.equal(m.reading_time_to_value_s, 30); assert.equal(m.time_to_value_ms, 42000);
  assert.deepEqual(m.max_scroll_before_primary_vh, { 1440: 0, 375: 0 });
});

console.log(failures ? `\n${failures} gate test(s) failed` : '\nall gate tests passed');
process.exitCode = failures ? 1 : 0;
