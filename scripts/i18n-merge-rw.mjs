#!/usr/bin/env node
/**
 * Merge a filled-in translation CSV back into a message catalogue.
 *
 *   node scripts/i18n-merge-rw.mjs docs/i18n/dawah-rw.csv          # dry run
 *   node scripts/i18n-merge-rw.mjs docs/i18n/dawah-rw.csv --write  # apply
 *
 * Refuses to write anything unless every row passes validation. The checks
 * exist because the two failure modes here are silent and expensive: an ICU
 * placeholder lost in translation ({minutes} typed as {iminota}) throws at
 * RUNTIME in the user's face, not at build time; and a key that no longer
 * exists in en.json means someone translated against a stale export, so the
 * value would land in the catalogue and never render.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , csvPath, ...flags] = process.argv;
const WRITE = flags.includes('--write');
const TARGET = 'apps/frontend/src/messages/rw.json';
const SOURCE = 'apps/frontend/src/messages/en.json';

if (!csvPath) {
  console.error('usage: node scripts/i18n-merge-rw.mjs <csv> [--write]');
  process.exit(1);
}

/** Minimal RFC4180 reader — quoted fields, embedded commas/newlines, "" escapes. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  const s = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const rows = parseCsv(readFileSync(csvPath, 'utf8')).filter((r) => r.some((c) => c.trim()));
const header = rows.shift().map((h) => h.trim().toLowerCase());
const col = (name) => header.indexOf(name);
for (const need of ['key', 'english', 'kinyarwanda']) {
  if (col(need) === -1) { console.error(`CSV is missing a "${need}" column`); process.exit(1); }
}

const en = JSON.parse(readFileSync(SOURCE, 'utf8'));
const rw = JSON.parse(readFileSync(TARGET, 'utf8'));

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
const set = (obj, path, val) => {
  const parts = path.split('.');
  const last = parts.pop();
  let node = obj;
  for (const p of parts) { if (typeof node[p] !== 'object' || node[p] === null) node[p] = {}; node = node[p]; }
  node[last] = val;
};
const icu = (s) => [...new Set((s.match(/\{(\w+)[^}]*\}/g) || []))].sort();

const errors = [], updates = [];
let blank = 0, unchanged = 0;

for (const [i, r] of rows.entries()) {
  const line = i + 2;
  const key = r[col('key')]?.trim();
  const src = r[col('english')] ?? '';
  const val = (r[col('kinyarwanda')] ?? '').trim();

  if (!key) continue;
  if (!val) { blank++; continue; }

  const current = get(en, key);
  if (current === undefined) {
    errors.push(`line ${line}: key "${key}" no longer exists in en.json — export is stale`);
    continue;
  }
  if (typeof current !== 'string') {
    errors.push(`line ${line}: key "${key}" is a group, not a string`);
    continue;
  }
  if (String(current).trim() !== String(src).trim()) {
    errors.push(`line ${line}: English for "${key}" changed since export.\n    was: ${src}\n    now: ${current}`);
    continue;
  }
  const want = icu(current), got = icu(val);
  if (want.join('|') !== got.join('|')) {
    errors.push(`line ${line}: placeholder mismatch on "${key}" — expected ${want.join(' ') || '(none)'}, got ${got.join(' ') || '(none)'}`);
    continue;
  }
  if (val === current) { unchanged++; continue; }
  updates.push({ key, val });
}

console.log(`rows: ${rows.length} | to apply: ${updates.length} | still blank: ${blank} | same as English: ${unchanged} | errors: ${errors.length}`);
if (errors.length) {
  console.error('\nnothing written — fix these first:');
  errors.forEach((e) => console.error('  ' + e));
  process.exit(1);
}
if (!updates.length) { console.log('nothing to apply.'); process.exit(0); }

if (!WRITE) {
  console.log('\ndry run — sample of what would change:');
  updates.slice(0, 8).forEach((u) => console.log(`  ${u.key}\n    → ${u.val}`));
  if (updates.length > 8) console.log(`  … and ${updates.length - 8} more`);
  console.log('\nre-run with --write to apply.');
  process.exit(0);
}

updates.forEach((u) => set(rw, u.key, u.val));
writeFileSync(TARGET, JSON.stringify(rw, null, 2) + '\n', 'utf8');
console.log(`\napplied ${updates.length} translations to ${TARGET}`);
