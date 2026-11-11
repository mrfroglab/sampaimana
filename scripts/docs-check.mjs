#!/usr/bin/env node
// Catches documentation drift that a machine can see. Runs in CI (test job) and on demand: `pnpm docs:check`.
// Each check names the source of truth and the doc that must follow it. See docs/README.md for the full map.
//
//   --no-changelog   skip the CHANGELOG freshness check (for local runs mid-branch)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkChangelog } from './changelog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(path.join(ROOT, f), 'utf8');
const problems = [];
const fail = (check, msg) => problems.push(`[${check}] ${msg}`);

// Tracked and new (not ignored) Markdown files. PRD.md is gitignored, so it is never checked or published.
const mdFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '*.md'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && existsSync(path.join(ROOT, f)));

// 1. Relative links in Markdown point to files that exist.
for (const file of mdFiles) {
  const text = read(file).replace(/```[\s\S]*?```/g, '');
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    // External links, in-page anchors, and site routes (/tentang#koreksi in the legal pages) are not files.
    if (/^(https?:|mailto:|#|\/)/.test(target)) continue;
    const rel = decodeURI(target.split('#')[0]);
    if (!existsSync(path.resolve(ROOT, path.dirname(file), rel))) fail('links', `${file}: tautan rusak → ${target}`);
  }
}

// 2. No hand-written counts that go stale (test totals and the like). Point to the command instead.
for (const file of mdFiles.filter((f) => f !== 'CHANGELOG.md')) {
  const m = read(file).match(/\b\d+\s+(?:unit\s+|integration\s+)?test\b/i);
  if (m) fail('counts', `${file}: hindari angka yang cepat basi ("${m[0]}"); sebut perintahnya saja`);
}

// 3. Every Markdown file is listed in the docs map, so nobody writes a second doc on a topic that already has one.
const map = read('docs/README.md');
for (const file of mdFiles.filter((f) => f !== 'docs/README.md')) {
  const rel = path.relative('docs', file);
  if (!map.includes(`](${rel})`)) fail('docs-map', `${file} belum tercantum di docs/README.md`);
}

// 4. README route table follows app/routes.ts.
const routes = read('app/routes.ts');
const readme = read('README.md');
const paths = new Set();
for (const line of routes.split('\n')) {
  const top = /^ {2}(?:index|route)\(/.test(line);
  const r = /^ {2}route\('([^']*)'/.exec(line);
  if (top && /^ {2}index\(/.test(line)) paths.add('/');
  else if (r && r[1] !== '*') paths.add(`/${r[1]}`);
  const p = /prefix\('([^']+)'/.exec(line);
  if (p) paths.add(`/${p[1]}/*`);
}
for (const p of paths) if (!readme.includes(`\`${p}\``)) fail('routes', `README.md belum mencantumkan rute \`${p}\` (sumber: app/routes.ts)`);

// 5. Colors named in DESIGN.md exist as tokens in app/app.css.
const css = read('app/app.css').toLowerCase();
for (const [hex] of read('DESIGN.md').matchAll(/#[0-9a-f]{6}\b/gi)) {
  if (!css.includes(hex.toLowerCase())) fail('design', `DESIGN.md menyebut ${hex} yang tidak ada di app/app.css`);
}

// 6. Legal pages are served from docs/legal/*.md; never ship them with unfilled placeholders.
for (const f of ['docs/legal/PRIVACY.md', 'docs/legal/TERMS.md', 'SECURITY.md']) {
  // Placeholders look like [EMAIL-KONTAK]: upper case with a hyphen, and not a link text like [API](...).
  const left = [...new Set(read(f).match(/\[[A-Z]+(?:-[A-Z]+)+\](?!\()/g) ?? [])];
  if (left.length) fail('legal', `${f} masih berisi placeholder ${left.join(', ')}`);
}

// 7. CHANGELOG.md is regenerated from history.
if (!process.argv.includes('--no-changelog') && !checkChangelog(ROOT)) {
  fail('changelog', 'CHANGELOG.md belum sesuai riwayat commit; jalankan `pnpm changelog` lalu commit hasilnya');
}

if (problems.length) {
  console.error(`docs-check: ${problems.length} masalah\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log('docs-check: dokumentasi sinkron.');
