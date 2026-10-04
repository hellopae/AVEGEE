import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { STORY } from '../src/story.js';
import { ZONES, BAL } from '../src/data.js';
import { zoneIntroduction } from '../src/zone-introductions.js';
import { comicImageLayout, prepareComicImages, bossArrivalScene, ACTION_CUTSCENE_PRESENTATION } from '../src/cutscene-presentation.js';

const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const esc = value => String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function renderer(name, deps) {
  const start = ui.indexOf(`function ${name}(`);
  const end = ui.indexOf('\n}\n', start);
  assert.ok(start >= 0 && end > start);
  return new Function(...Object.keys(deps), `${ui.slice(start, end + 2)};return ${name};`)(...Object.values(deps));
}
function fakeRoot() {
  let markup = '', nodes = new Map();
  const listeners = new Map();
  return { open:true,
    get innerHTML() { return markup; },
    set innerHTML(value) { markup = value; nodes = new Map(); },
    querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, {}); return nodes.get(selector); },
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type) { listeners.delete(type); },
    close() { this.open = false; listeners.get('close')?.(); },
  };
}
// Parse div ancestry of the actual rendered HTML, without pretending to measure a browser.
function assertCaptionOrder(markup) {
  const stack = []; let frameSeen = false, captionSeen = false, controlsSeen = false;
  for (const match of markup.matchAll(/<div\b[^>]*>|<\/div>/g)) {
    const tag = match[0];
    if (tag === '</div>') { assert.ok(stack.length); stack.pop(); continue; }
    const cls = tag.match(/class="([^"]*)"/)?.[1] || '';
    if (cls === 'intro-comic-frame') frameSeen = true;
    if (cls === 'intro-comic-caption') {
      assert.ok(frameSeen); assert.ok(!stack.includes('intro-comic-frame'), 'caption outside image frame'); captionSeen = true;
    }
    if (cls === 'intro-comic-controls') {
      assert.ok(captionSeen); assert.ok(!stack.includes('intro-comic-frame')); assert.ok(!stack.includes('intro-comic-caption')); controlsSeen = true;
    }
    stack.push(cls);
  }
  assert.equal(stack.length, 0); assert.ok(frameSeen && captionSeen && controlsSeen);
}

test('30A: every story page puts caption and controls after the image; navigation finishes once', () => {
  for (const story of Object.values(STORY)) {
    const root = fakeRoot(); let finished = 0, prepared = 0;
    renderer('renderStoryComic', { esc, prepareComicImages:() => prepared++ })(root, story, () => finished++);
    for (const panel of story.pages) {
      assertCaptionOrder(root.innerHTML);
      assert.ok(root.innerHTML.includes(esc(panel.title)) && root.innerHTML.includes(esc(panel.line)));
      root.querySelector('[data-story-next]').onclick();
    }
    root.querySelector('[data-story-skip]').onclick();
    assert.equal(finished, 1); assert.equal(prepared, story.pages.length);
  }
});

test('30A: back navigation retains the separate caption', () => {
  const root = fakeRoot(); renderer('renderStoryComic', { esc, prepareComicImages() {} })(root, STORY.asia, () => {});
  const first = root.innerHTML;
  root.querySelector('[data-story-next]').onclick(); root.querySelector('[data-story-back]').onclick();
  assert.equal(root.innerHTML, first); assertCaptionOrder(root.innerHTML);
});

test('30A: zones 2–4 choose real arrival scenes even with a loaded boss profile; zone 1 keeps resolver behavior', () => {
  for (const z of ZONES) {
    const dlg = fakeRoot(); let done = 0;
    const fallback = `img/Intro-Boss-Zone${ZONES.indexOf(z) + 1}.png`;
    renderer('openBossArrive', { ZONES, dlg, dlgGen:1, esc, bossArrivalScene, pauseForDlg() {},
      zoneImg:() => ({src:'loaded-closeup.png'}), artUrl:() => fallback,
      openDlg() { dlg.open = true; }, prepareComicImages() {} })(z, () => done++);
    const expected = bossArrivalScene(z.k) || (z.k === 'th' ? fallback : 'loaded-closeup.png');
    for (let i = 0; i < z.bossArrive.length; i++) {
      assert.ok(dlg.innerHTML.includes(`src="${expected}"`)); assertCaptionOrder(dlg.innerHTML);
      dlg.querySelector('#arrive-next').onclick();
    }
    assert.equal(done, 1);
  }
  for (const zone of ['asia','west','cyberhell']) assert.ok(existsSync(new URL(`../${bossArrivalScene(zone)}`, import.meta.url)));
  assert.equal(bossArrivalScene('th'), null);
});

test('30A: opening intro and both regional arrival pages keep text below the frame', () => {
  const dlg = fakeRoot();
  const deps = { dlg, esc, BAL, ZONES, zoneIntroduction, prepareComicImages() {},
    g:{zoneIntroSeen:{},save() {}}, pauseForDlg() {}, openDlg() {}, artUrl:key => `img/${key}.png` };
  renderer('openIntro', deps)(true);
  for (let i = 0; i < 5; i++) { assertCaptionOrder(dlg.innerHTML); dlg.querySelector('#intro-next').onclick(); }
  for (const z of ZONES.slice(1)) {
    renderer('openZoneArrival', deps)(z);
    assertCaptionOrder(dlg.innerHTML); dlg.querySelector('[data-arrival-next]').onclick(); assertCaptionOrder(dlg.innerHTML);
  }
});

test('30A: crop geometry removes letterbox rows without horizontal cropping in the story frame', () => {
  for (const story of Object.values(STORY)) for (const panel of story.pages) {
    const png = readFileSync(new URL(`../${panel.image}`, import.meta.url));
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    const layout = comicImageLayout(panel.image, width, height);
    assert.ok(layout.height > 100 && layout.top <= 0);
    const visibleHeight = width / layout.aspect;
    assert.ok(visibleHeight > 0 && visibleHeight < height);
    // Matching source and target scale preserves every character's proportions.
    assert.ok(Math.abs((layout.height / 100) * visibleHeight - height) < 1e-9);
    assert.ok(layout.top + layout.height >= 100);
  }
  assert.deepEqual(comicImageLayout('unknown.png', 1600, 900), {aspect:1600 / 900, top:0, height:100});
});

test('30A: crop updates cached, newly loaded and fallback images; thumbnail stays square', () => {
  for (const thumbnail of [false, true]) {
    let onload;
    const frame = { style:{}, classList:{contains:() => !thumbnail} };
    const image = { naturalWidth:1280, naturalHeight:720, currentSrc:'http://local/img/story-ending-02-v3.png',
      complete:true, parentElement:frame, style:{}, addEventListener(type, fn) { assert.equal(type, 'load'); onload = fn; } };
    prepareComicImages({querySelectorAll:() => [image]});
    assert.ok(parseFloat(image.style.height) > 100 && parseFloat(image.style.top) < 0);
    assert.equal(Boolean(frame.style.aspectRatio), !thumbnail);
    image.currentSrc = 'http://local/img/fallback.png'; onload();
    assert.equal(parseFloat(image.style.height), 100); assert.equal(parseFloat(image.style.top), 0);
    image.complete = false; image.style = {}; prepareComicImages({querySelectorAll:() => [image]});
    assert.deepEqual(image.style, {}); onload(); assert.equal(image.style.height, '100%');
  }
});

test('30A: ending popup uses a clipped cover thumbnail, with crop preparation', () => {
  const dlg = fakeRoot(); let prepared = false;
  renderer('openEnding', {esc, g:{casesDone:40}, restart() {}, prepareComicImages(root) {assert.equal(root, dlg); prepared = true;},
    modal(markup, setup, cls) { assert.equal(cls, 'final-ending'); dlg.innerHTML = markup; setup(dlg); }})({k:'finalWin',title:'title',text:'text'});
  assert.match(dlg.innerHTML, /class="ending-thumbnail"><img src="img\/story-ending-02-v3.png"/);
  assert.ok(prepared); assert.match(html, /\.final-ending \.ending-thumbnail img\{[^}]*object-fit:cover/);
});

test('30A: only the two requested action sources opt out of mirroring; runtime adds right-facing class', () => {
  assert.deepEqual(Object.keys(ACTION_CUTSCENE_PRESENTATION).sort(), [
    'img/CyberHell/crew-plerng-cyberhell-cutscene.jpeg', 'img/West/crew-guard-west-cutscene.jpeg']);
  for (const src of [...Object.keys(ACTION_CUTSCENE_PRESENTATION), 'img/West/crew-plerng-west-cutscene.jpeg']) {
    const cut = {className:'',classList:{add(cls) {cut.className += ` ${cls}`;}},querySelector:() => ({}),remove() {}};
    const dlg = {open:true,querySelector:() => null,appendChild(node) {assert.equal(node, cut);}};
    renderer('playActionCutscene', {dlg, document:{createElement:() => cut}, esc, ACTION_CUTSCENE_PRESENTATION,
      crewCutsceneSrc:() => ({src}), actionCutsceneSrc:() => null, fitCutsceneImage() {},setTimeout() {},ACTION_CUT_MS:1300})('crew:guard');
    assert.equal(cut.className.includes('right-facing'), ACTION_CUTSCENE_PRESENTATION[src]?.flip === false);
    assert.ok(existsSync(new URL(`../${src}`, import.meta.url)));
  }
});
