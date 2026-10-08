import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {STORY} from '../src/story.js';
const source=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const start=source.indexOf('function renderStoryComic('),end=source.indexOf('\n}\n',start);
const render=new Function('esc','prepareComicImages',`${source.slice(start,end+2)};return renderStoryComic;`)(String,()=>{});
function root() {
  let nodes=new Map(),markup='';const events=new Map();
  return {get innerHTML(){return markup;},set innerHTML(v){markup=v;nodes=new Map();},
    querySelector(k){if(!nodes.has(k))nodes.set(k,{style:{},pauses:0,pause(){this.pauses++;}});return nodes.get(k);},
    addEventListener(k,f){events.set(k,f);},removeEventListener(k){events.delete(k);},close(){events.get('close')?.();}};
}
test('ending plays panorama then father acceptance, using shipped media and posters',()=>{
  const pages=STORY.ending.pages;assert.equal(pages.length,3);
  assert.equal(pages[1].videoAspect,1280/544);assert.equal(pages[2].videoAspect,16/9);
  for(const p of pages)for(const path of [p.image,p.video,p.poster].filter(Boolean))assert.ok(existsSync(new URL('../'+path,import.meta.url)),path);
  assert.match(pages[2].line,/ทำได้ดีมากลูกพ่อ/);
});
test('ending video navigation pauses outgoing clips, keeps manual completion, and falls back on failure',()=>{
  const r=root();let done=0;render(r,STORY.ending,()=>done++);
  r.querySelector('[data-story-next]').onclick();
  assert.match(r.innerHTML,/<video[^>]*autoplay muted playsinline controls/);
  const first=r.querySelector('video');
  assert.equal(r.querySelector('.intro-comic-frame').style.aspectRatio,String(1280/544));
  r.querySelector('[data-story-next]').onclick();assert.equal(first.pauses,1);assert.equal(done,0);
  const second=r.querySelector('video');second.onerror();assert.match(second.outerHTML,/story-ending-03-v1.png/);
  r.querySelector('[data-story-back]').onclick();assert.equal(second.pauses,1);
  const replay=r.querySelector('video');r.close();assert.equal(replay.pauses,1);
  r.querySelector('[data-story-skip]').onclick();r.querySelector('[data-story-skip]').onclick();assert.equal(done,1);
});
