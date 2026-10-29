import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const read = p => readFileSync(p, 'utf8');
function files(dir) { return readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`]); }
test('literal image and audio URLs in active source exist', () => {
  const missing = [];
  for (const file of files('src').filter(p => p.endsWith('.js') && p !== 'src/yama-sword-assets.js')) {
    // Strip comments; the excluded v1 sword catalog has no imports and is not requested.
    const source = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const match of source.matchAll(/["'`](?:\.\/)?((?:img|audio)\/[\w./-]+\.(?:png|webp|jpe?g|gif|mp3|ogg|m4a))(?=["'`?])/g)) {
      if (!existsSync(match[1])) missing.push(`${file}: ${match[1]}`);
    }
  }
  assert.deepEqual(missing, []);
  assert.doesNotMatch(read('src/ui.js'), /hero-yama-side/);
  assert.doesNotMatch(read('src/sfx.js'), /\['ogg',\s*'mp3'/);
  const favicon = read('index.html').match(/rel="icon"[^>]*href="([^"]+)"/);
  assert.ok(favicon && existsSync(favicon[1]));
});
test('mobile boss portrait and HP occupy separate grid rows', () => {
  const css = read('src/battle-turns.css');
  const mobile = css.slice(css.lastIndexOf('@media(max-width:700px)'));
  assert.match(mobile, /battle-boss-hud\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(mobile, /battle-boss-hud>img\{grid-row:auto;width:54px;height:54px/);
  assert.match(mobile, /battle-boss-status\{grid-row:2;min-width:0;width:100%;overflow-wrap:anywhere/);
  assert.match(read('src/ui.js'), /class="battle-boss-hud">\s*<img[\s\S]*?<div class="battle-boss-status">[\s\S]*?<small>/);
});
