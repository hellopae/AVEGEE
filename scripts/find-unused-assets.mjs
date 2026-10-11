#!/usr/bin/env node
// Read-only, conservative inventory. Run from any directory:
// node scripts/find-unused-assets.mjs > /tmp/unused-assets.json
// An entry in `unused` is a review candidate, never an instruction to delete.
// No evaluation of repository code, no dependencies, no writes or git mutations.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const protectedRef = 'origin/codex-app/2026-10-04';
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
// Fail closed if the required branch is missing. Do not silently omit its scan.
const branchCommit = git(['rev-parse', '--verify', `${protectedRef}^{commit}`]).trim();
const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean);
const present = tracked.filter(p => existsSync(resolve(root, p)));
const inScope = p => /^(?:img\/|audio\/|output\/|_walktest\.html$|_depthtest\.html$)/.test(p);
const candidates = present.filter(inScope);
const reasons = new Map(candidates.map(p => [p, new Set()]));
const patterns = [];
const scanned = [];
const textFile = p => /\.(?:html?|[cm]?js|css|json|py|md|txt|sh)$/i.test(p);
const runtimeSource = p => p === 'index.html' || p.startsWith('src/') ||
  (/\.(json|css)$/i.test(p) && !/^(scripts|tests|output|docs|Exam)\//.test(p));
const category = p => runtimeSource(p) ? 'runtime' :
  p.startsWith('scripts/') ? 'script' : p.startsWith('tests/') ? 'test' : 'reference';
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function protect(pattern, label, detail) {
  // Unknown substitutions can contain separators. Preserve every matching path,
  // rather than guessing a finite domain for keys, poses, suffixes or extensions.
  const re = new RegExp('^' + pattern.split('*').map(escape).join('.*') + '$');
  const matched = candidates.filter(p => re.test(p));
  for (const p of matched) reasons.get(p).add(`${label}: ${detail}`);
  if (pattern.includes('*') && matched.length)
    patterns.push({ source: label, pattern, matches: matched });
}

function scan(path, source, prefix = '') {
  const label = `${prefix}${category(path)}:${path}`;
  scanned.push(label);
  // Comments also count as references. This intentionally prefers false keeps.
  const literals = [...source.matchAll(/(["'`])((?:\\[\s\S]|(?!\1)[\s\S])*?)\1/g)]
    .map(m => ({ value: m[2].replace(/\\\//g, '/'), end: m.index + m[0].length }));
  for (const { value, end } of literals) {
    let s = value.replace(/\$\{[^}]*\}/g, '*').replace(/\{[A-Za-z_][^}]*\}/g, '*');
    s = s.split(/[?#]/)[0];
    // A literal prefix followed by concatenation or ending in / is unresolved.
    // E.g. 'img/' + path, ROOT/'img/raw', `...-${zone}-v1-web.mp4`.
    const concatenated = /^\s*\+/.test(source.slice(end));
    const isScript = category(path) === 'script';
    const isRuntime = category(path) === 'runtime';
    const rooted = /^(?:img|audio|output)\//.test(s);
    // A base href (../../), UI text "output", i18n {name}, or a test's
    // startsWith('output/') assertion is not a recursive asset reference.
    // Auxiliary documents/tests protect concrete files and rooted templates.
    if (rooted && (concatenated || (s.endsWith('/') && (isScript || isRuntime)))) s += '*';
    if (isScript && /^(img|audio|output)$/.test(s)) s += '/*';
    const paths = new Set();
    const rootPath = s.match(/(?:^|\/)((?:img|audio|output)\/[^\s"'<>]+)/);
    if (rootPath && (!rootPath[1].endsWith('/') || isScript || isRuntime)) paths.add(rootPath[1]);
    // manifest names are relative to img; JSON may store a basename or zone path.
    if (/\.(?:png|jpe?g|webp|mp4|webm|ogg|mp3|wav|json|html?|[cm]?js|css|md|txt)$/i.test(s) ||
        (rooted && s.includes('*'))) {
      if (!/^(?:https?:|data:|\/Users\/)/.test(s)) {
        paths.add(posix.normalize(posix.join(posix.dirname(path), s)));
        if (path.startsWith('img/') || path.endsWith('.json')) paths.add(`img/${s}`);
      }
    }
    for (const p of paths) protect(p, label, value);
    // Semantic calls (artUrl/img/zoneImg), keys in data tables and pose stems.
    // Include every existing regional/suffix variant; do not assume only v2 wins.
    if (/^(hero-|crew-|spirit|soul-|st-|BG-|tile-|intro-|story-)[\w-]+$/.test(s)) {
      for (const p of candidates) {
        const stem = posix.basename(p).replace(/\.[^.]+$/, '');
        if (stem === s || stem.startsWith(s + '-')) reasons.get(p).add(`${label}: semantic key ${s}`);
      }
    }
  }
  // CSS url(), including unquoted URLs and relative paths.
  for (const m of source.matchAll(/url\(\s*["']?([^\s)'";]+)["']?\s*\)/g)) {
    const s = m[1].split(/[?#]/)[0];
    protect(posix.normalize(posix.join(posix.dirname(path), s)), label, `url(${s})`);
    protect(s, label, `url(${s})`);
  }
  // Split Python/JS joins are harder to resolve safely: retain the entire tree.
  // This covers os.path.join(ROOT, 'img', 'raw'), ROOT / 'img' / 'cover-...'.
  // The standalone directory literal rule above already protects each tree.
  // Bare HTML attributes and text references (including the two root test pages).
  for (const p of candidates) {
    if (path !== p && (source.includes(p) || source.includes(posix.relative(posix.dirname(path), p))))
      reasons.get(p).add(`${label}: literal path`);
  }
}

for (const p of present.filter(textFile)) {
  if (p === 'scripts/find-unused-assets.mjs') continue; // inventory must not retain itself
  scan(p, readFileSync(resolve(root, p), 'utf8'));
}
const branchFiles = git(['ls-tree', '-r', '--name-only', '-z', branchCommit]).split('\0').filter(Boolean);
for (const p of branchFiles.filter(textFile))
  scan(p, git(['show', `${branchCommit}:${p}`]), 'other-branch:');

const entries = candidates.map(path => ({ path, bytes: statSync(resolve(root, path)).size,
  reasons: [...reasons.get(path)].sort() }));
const sum = files => ({ count: files.length, bytes: files.reduce((n, p) => n + statSync(resolve(root, p)).size, 0) });
// Source masters do not belong in a future runtime bundle, even when broad
// dynamic fallback rules conservatively protect them. Keep them in the repo.
const originals = entries.filter(e => e.path.startsWith('img/raw/') || e.path === 'img/cover-v4-full.png' ||
  (e.reasons.some(r => /^script:scripts\/export-/.test(r)) &&
   /^img\/yama-sword-v[12]\//.test(e.path)));
const originalPaths = new Set(originals.map(e => e.path));
const runtimeFiles = present.filter(p => (p === 'index.html' || p === '.nojekyll' || p.startsWith('src/') ||
  /^(img|audio)\//.test(p)) && !originalPaths.has(p) && !/\.(md|txt)$/i.test(p));
const output = {
  policy: 'Read-only conservative scan; unknown paths retain all matching files; catalogs count as live references. Review candidates manually.',
  head: git(['rev-parse', 'HEAD']).trim(), protectedRef, branchCommit,
  tracked: sum(present), runtime: sum(runtimeFiles), runtimeFiles,
  briefFootprint: sum(present.filter(p => !/^(tests|scripts|docs|output|Exam)\//.test(p))),
  excluded: Object.fromEntries(['Exam', 'docs', 'output'].map(dir => [dir, sum(present.filter(p => p.startsWith(dir + '/')))])),
  originals, unused: entries.filter(e => !e.reasons.length), retained: entries.filter(e => e.reasons.length),
  unresolvedPatterns: patterns, scanned,
};
process.stdout.write(JSON.stringify(output, null, 2) + '\n');
