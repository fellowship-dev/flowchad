#!/usr/bin/env node
// flowmap.mjs — measure a flow map (a Mermaid flow chart) before anything is
// built, and write a results.json the gate can judge (kind: "map").
//
//   node flowmap.mjs .flowchad/flows/<id>.map.md [--out <results.json>]
//
// Map conventions (references/flow-maps.md):
//   ([Entry or exit])   terminal      [Screen]  screen      {Question?}  decision
//   ((Wait for email))  wait          A:::value or "class A value" marks the value moment
// Edges: -->, ---, -.->, ==>, with |labels| or -- labels -->; "A & B --> C".
// Exit: 0 written, 2 bad input. Node built-ins only.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export class MapError extends Error {}

const SHAPES = [
  [/^\(\[(.*)\]\)$/, 'terminal'],
  [/^\[\[(.*)\]\]$/, 'screen'],
  [/^\[\((.*)\)\]$/, 'screen'],
  [/^\(\(\((.*)\)\)\)$/, 'wait'],
  [/^\(\((.*)\)\)$/, 'wait'],
  [/^\{\{(.*)\}\}$/, 'decision'],
  [/^\{(.*)\}$/, 'decision'],
  [/^\[\/(.*)\/\]$/, 'screen'],
  [/^\[\\(.*)\\\]$/, 'screen'],
  [/^\[(.*)\]$/, 'screen'],
  [/^\((.*)\)$/, 'screen'],
  [/^>(.*)\]$/, 'screen'],
];

function parseNode(tok, nodes) {
  const t = tok.trim();
  const m = t.match(/^([A-Za-z0-9_]+)(.*?)(?::::([A-Za-z0-9_-]+))?$/);
  if (!m) throw new MapError(`cannot read node "${t}"`);
  const [, id, rest, cls] = m;
  let shape = null; let label = null;
  const body = rest.trim();
  if (body) {
    for (const [re, s] of SHAPES) {
      const x = body.match(re);
      if (x) { shape = s; label = x[1].replace(/^"(.*)"$/, '$1').trim(); break; }
    }
    if (!shape) throw new MapError(`unknown node shape for ${id}: ${body}`);
  }
  if (!nodes.has(id)) nodes.set(id, { id, shape: shape || 'screen', label: label || id, value: false, order: nodes.size });
  const n = nodes.get(id);
  if (shape && n.label === id) { n.shape = shape; n.label = label; }
  if (cls === 'value') n.value = true;
  return id;
}

export function extractMermaid(text) {
  const fence = text.match(/```mermaid\s*\n([\s\S]*?)```/);
  return fence ? fence[1] : text;
}

export function parseMap(src) {
  const nodes = new Map(); const edges = [];
  const valueClass = [];
  for (let raw of src.split(/\r?\n/)) {
    let line = raw.replace(/%%.*$/, '').trim().replace(/;$/, '');
    if (!line || /^(flowchart|graph)\b/.test(line) || /^(classDef|style|linkStyle|click|subgraph|end|direction)\b/.test(line)) continue;
    const c = line.match(/^class\s+([A-Za-z0-9_,\s]+?)\s+([A-Za-z0-9_-]+)$/);
    if (c) { if (c[2] === 'value') valueClass.push(...c[1].split(/[,\s]+/).filter(Boolean)); continue; }
    line = line
      .replace(/--\s+[^->]+?\s+-->/g, '-->')       // -- label -->
      .replace(/(-->|---|-\.->|==>|-\.-)\s*\|[^|]*\|/g, '-->') // -->|label|
      .replace(/-\.->|==>|-\.-|---/g, '-->');
    const parts = line.split(/\s*-->\s*/);
    const groups = parts.map((p) => p.split(/\s+&\s+/).map((tok) => parseNode(tok, nodes)));
    for (let i = 0; i + 1 < groups.length; i++) for (const a of groups[i]) for (const b of groups[i + 1]) edges.push([a, b]);
  }
  for (const id of valueClass) if (nodes.has(id)) nodes.get(id).value = true;
  if (!nodes.size) throw new MapError('the map has no nodes');
  return { nodes, edges };
}

export function measureMap({ nodes, edges }) {
  const out = new Map(); const inc = new Map();
  for (const id of nodes.keys()) { out.set(id, []); inc.set(id, 0); }
  for (const [a, b] of edges) { out.get(a).push(b); inc.set(b, inc.get(b) + 1); }
  const list = [...nodes.values()].sort((x, y) => x.order - y.order);
  const entry = (list.find((n) => inc.get(n.id) === 0 && n.shape === 'terminal') || list.find((n) => inc.get(n.id) === 0) || list[0]).id;
  // breadth-first from the entry: reachability and the shortest path to value
  const prev = new Map([[entry, null]]); const queue = [entry];
  while (queue.length) { const n = queue.shift(); for (const m of out.get(n)) if (!prev.has(m)) { prev.set(m, n); queue.push(m); } }
  const values = list.filter((n) => n.value).map((n) => n.id);
  const target = values.find((v) => prev.has(v));
  const pathIds = [];
  if (target) for (let n = target; n !== null; n = prev.get(n)) pathIds.unshift(n);
  const onPath = new Set(pathIds); const pos = new Map(pathIds.map((id, i) => [id, i]));
  const count = (shape) => pathIds.filter((id) => nodes.get(id).shape === shape).length;
  const reachable = [...prev.keys()];
  const deadEnds = reachable.filter((id) => out.get(id).length === 0 && !nodes.get(id).value && nodes.get(id).shape !== 'terminal');
  const loops = edges.filter(([a, b]) => onPath.has(a) && onPath.has(b) && pos.get(b) <= pos.get(a)).length;
  return {
    entry, value: target || null, value_reachable: !!target, value_declared: values.length > 0,
    path: pathIds.map((id) => nodes.get(id).label),
    measures: {
      screens_to_value: target ? count('screen') : null,
      decisions_to_value: target ? count('decision') : null,
      waits: target ? count('wait') : null,
      dead_ends: deadEnds.length,
      loops,
      unreachable: nodes.size - reachable.length,
    },
    dead_ends: deadEnds.map((id) => nodes.get(id).label),
  };
}

export function mapResults(text, id) {
  const valueLine = text.match(/^\s*(?:-\s*)?\*\*Value moment:\*\*\s*(.+)$/m) || text.match(/^value_moment:\s*(.+)$/m);
  const nameLine = text.match(/^#\s+(.+)$/m);
  const m = measureMap(parseMap(extractMermaid(text)));
  return {
    flow: id, name: nameLine ? nameLine[1].trim() : id, kind: 'map',
    value_moment: valueLine ? valueLine[1].trim() : null,
    timestamp: new Date().toISOString(),
    value_reachable: m.value_reachable,
    goal_reached: m.value_reachable,
    measures: m.measures,
    map: { entry: m.entry, value: m.value, path: m.path, dead_ends: m.dead_ends },
    rule_results: [],
  };
}

function main(argv) {
  const files = []; let outFile = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') outFile = argv[++i];
    else files.push(argv[i]);
  }
  if (files.length !== 1) throw new MapError('usage: flowmap.mjs <flow.map.md> [--out results.json]');
  const file = files[0];
  if (!fs.existsSync(file)) throw new MapError(`not found: ${file}`);
  const id = path.basename(file).replace(/\.map\.md$|\.mmd$|\.md$/, '');
  const r = mapResults(fs.readFileSync(file, 'utf8'), id);
  const json = JSON.stringify(r, null, 2) + '\n';
  if (outFile) { fs.mkdirSync(path.dirname(outFile), { recursive: true }); fs.writeFileSync(outFile, json); }
  const m = r.measures;
  process.stdout.write(`Map: ${id}\nValue moment: ${r.value_moment || 'NOT DECLARED'}\n` +
    `Reaches value: ${r.value_reachable ? 'yes' : 'no'}${r.map.path.length ? ` (${r.map.path.join(' → ')})` : ''}\n` +
    `Screens ${m.screens_to_value ?? '—'} · decisions ${m.decisions_to_value ?? '—'} · waits ${m.waits ?? '—'} · dead ends ${m.dead_ends} · loops ${m.loops} · unreachable ${m.unreachable}\n` +
    (outFile ? `Results: ${outFile}\n` : ''));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (e) {
    if (e instanceof MapError) { process.stderr.write(`flowmap: ${e.message}\n`); process.exitCode = 2; } else throw e;
  }
}
