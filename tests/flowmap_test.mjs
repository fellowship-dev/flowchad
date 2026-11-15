// flowmap_test.mjs — flow-walk/scripts/flowmap.mjs, and a map through the gate.
// Node built-ins only: node tests/flowmap_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseMap, measureMap, mapResults, MapError } from '../.flowchad/skills/flow-walk/scripts/flowmap.mjs';
import { evaluate, loadRules } from '../.flowchad/skills/flow-gate/scripts/gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rules = loadRules([path.join(ROOT, '.flowchad/skills/flow-walk/rules')]);
let failures = 0;
const test = (name, fn) => {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failures++; console.log(`FAIL ${name}\n     ${e.message}`); }
};

const MAP = `# New user sets up their first site

- **Value moment:** The dashboard shows the first check of the person's own site.

\`\`\`mermaid
flowchart TD
  entry([Pricing page]) --> signup[Sign-up: email only]
  signup --> mail((Wait: confirmation email))
  mail --> site[Which site?]
  site --> connect{Connect or paste?}
  connect -->|connect| dash[Dashboard with first check]:::value
  connect -- paste --> paste[/Paste one value/]
  paste --> dash
  dash --> done([Done])
\`\`\`
`;

test('shapes, labels and the value node', () => {
  const { nodes, edges } = parseMap(MAP.split('```mermaid')[1].split('```')[0]);
  assert.equal(nodes.get('entry').shape, 'terminal');
  assert.equal(nodes.get('mail').shape, 'wait');
  assert.equal(nodes.get('connect').shape, 'decision');
  assert.equal(nodes.get('paste').label, 'Paste one value');
  assert.equal(nodes.get('dash').value, true);
  assert.equal(edges.length, 8);
});

test('shortest path measures', () => {
  const r = mapResults(MAP, 'first-site');
  assert.equal(r.value_moment, "The dashboard shows the first check of the person's own site.");
  assert.equal(r.value_reachable, true);
  assert.deepEqual(r.map.path, ['Pricing page', 'Sign-up: email only', 'Wait: confirmation email', 'Which site?', 'Connect or paste?', 'Dashboard with first check']);
  assert.deepEqual(r.measures, { screens_to_value: 3, decisions_to_value: 1, waits: 1, dead_ends: 0, loops: 0, unreachable: 0 });
});

test('dead ends, loops and unreachable nodes', () => {
  const m = measureMap(parseMap(`graph LR
    a([Start]) --> b[Form] --> c[Check email]
    c --> b
    c --> v[Home]
    b --> err[Error page]
    orphan[Old page] --> v
    class v value`));
  assert.equal(m.value_reachable, true);
  assert.equal(m.measures.dead_ends, 1);       // Error page
  assert.equal(m.measures.loops, 1);           // c --> b sends the path back
  assert.equal(m.measures.unreachable, 1);     // Old page
});

test('A & B --> C makes two edges', () => {
  const { edges } = parseMap('flowchart TD\n a[One] & b[Two] --> c[Three]:::value');
  assert.deepEqual(edges, [['a', 'c'], ['b', 'c']]);
});

test('unreachable value', () => {
  const m = measureMap(parseMap('flowchart TD\n a([Start]) --> b[Form]\n v[Home]:::value'));
  assert.equal(m.value_reachable, false); assert.equal(m.measures.screens_to_value, null);
});

test('bad shapes are input errors', () => {
  assert.throws(() => parseMap('flowchart TD\n a<<weird>> --> b'), MapError);
});

test('a map through the gate: clean map passes once its blockers are judged', () => {
  const r = mapResults(MAP, 'first-site');
  r.rule_results = [{ id: 'DEC-02', result: 'pass' }];
  const g = evaluate(r, rules);
  assert.equal(g.status, 'PASS', g.reasons.join('; '));
});

test('a map with a dead end and no value moment fails', () => {
  const r = mapResults('```mermaid\nflowchart TD\n a([Start]) --> b[Form] --> v[Home]:::value\n b --> e[Error]\n```', 'x');
  r.rule_results = [{ id: 'DEC-02', result: 'pass' }];
  const g = evaluate(r, rules);
  assert.equal(g.status, 'FAIL');
  assert.deepEqual(g.failed_blockers.map((b) => b.id).sort(), ['ERR-01', 'PATH-01']);
});

test('cli writes results and exits 2 on a missing file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowmap-'));
  const f = path.join(dir, 'first-site.map.md'); fs.writeFileSync(f, MAP);
  const out = path.join(dir, 'snap', 'results.json');
  const script = path.join(ROOT, '.flowchad/skills/flow-walk/scripts/flowmap.mjs');
  const p = spawnSync(process.execPath, [script, f, '--out', out], { encoding: 'utf8' });
  assert.equal(p.status, 0, p.stderr); assert.match(p.stdout, /Reaches value: yes/);
  assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).flow, 'first-site');
  assert.equal(spawnSync(process.execPath, [script, path.join(dir, 'nope.map.md')]).status, 2);
});

console.log(failures ? `\n${failures} flowmap test(s) failed` : '\nall flowmap tests passed');
process.exitCode = failures ? 1 : 0;
