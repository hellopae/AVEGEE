import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import vm from 'node:vm';
import {zoneAssets} from '../src/asset-preload.js';
import {comicImageLayout} from '../src/cutscene-presentation.js';
const ui = readFileSync('src/ui.js', 'utf8');
const catalog = JSON.parse(readFileSync('img/preload-catalog.json'));
const manifest = JSON.parse(readFileSync('img/manifest.json'));
const shipped = Object.values(manifest).flat();

test('new-game and menu intro navigation render all five shipped G2 panels', () => {
  const start = ui.indexOf('function openIntro(');
  const end = ui.indexOf('\n}\n', start) + 2;
  for (const fromTitle of [false, true]) {
    let closed = 0, paused = 0;
    const nodes = new Map();
    const dlg = {innerHTML:'', querySelector(id) {
      if (!nodes.has(id)) nodes.set(id, {});
      return nodes.get(id);
    }, close() { closed++; }};
    const context = vm.createContext({dlg, BAL:{startCoin:123}, esc:String, artUrl:key => `img/${key}.png`,
      prepareComicImages() {}, pauseForDlg() { paused++; }, openDlg() {}});
    vm.runInContext(ui.slice(start, end), context);
    context.openIntro(fromTitle);
    assert.equal(paused, fromTitle ? 0 : 1);
    for (let i = 1; i <= 5; i++) {
      const name = `intro-panel-0${i}-v2.webp`, path = `img/${name}`;
      assert.ok(dlg.innerHTML.includes(`src="${path}"`));
      assert.ok(existsSync(path));
      assert.ok(shipped.includes(name));
      assert.ok(zoneAssets(catalog, 'th').includes(path));
      assert.deepEqual(comicImageLayout(path, 1376, 768), {aspect:1376/768, top:0, height:100});
      if (i === 5) assert.ok(dlg.innerHTML.includes(fromTitle ? 'กลับหน้าเมนู' : 'รับงาน'));
      dlg.querySelector('#intro-next').onclick();
      assert.equal(closed, i === 5 ? 1 : 0);
    }
  }
});

test('cover selects G2 art before fallbacks and old video cannot obscure it', () => {
  const start = ui.indexOf('(function probeCover(');
  const end = ui.indexOf('\n', ui.indexOf('})([', start));
  const art = {style:{}, classList:{add() {}}};
  const requests = [];
  const context = vm.createContext({art, Image:class {
    set src(url) { requests.push(url); this.onload(); }
  }});
  vm.runInContext(ui.slice(start, end), context);
  assert.equal(requests[0], 'img/cover-v5.webp');
  assert.equal(art.style.backgroundImage, "url('img/cover-v5.webp')");
  assert.ok(existsSync(requests[0]));
  assert.ok(shipped.includes('cover-v5.webp'));
  assert.ok(catalog.shared.includes(requests[0]));
  const html = readFileSync('index.html', 'utf8');
  const video = html.match(/<video[^>]*id="cover-vfx"[^>]*>/)[0];
  assert.match(video, /\bhidden\b/);
  assert.match(video, /poster="img\/cover-v5.webp"/);
  assert.doesNotMatch(video, /\bsrc=/);
});
