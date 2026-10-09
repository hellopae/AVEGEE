import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STORY} from '../src/story.js';
import {t, setLang} from '../src/i18n.js';
import sala from '../src/minigames/sala.js';

const source=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const start=source.indexOf('function renderStoryComic('),end=source.indexOf('\n}\n',start);
const render=new Function('esc','prepareComicImages',`${source.slice(start,end+2)};return renderStoryComic;`)(String,()=>{});
const emitter=()=>{const ev=new Map();return {ev,addEventListener(k,f){ev.set(k,f);},removeEventListener(k){ev.delete(k);},fire(k){ev.get(k)?.();}};};

test('S5: krajok/sala labels and sala tip have TH and EN text, no raw Thai literals in the specs', () => {
  const oldDocument=globalThis.document; globalThis.document={documentElement:{}};
  try {
  const keys=['room.sala.action2','room.krajok.adjust','room.krajok.place','room.krajok.needMirror','mg.sala.tip'];
  setLang('th'); const th=keys.map(t);
  setLang('en'); const en=keys.map(t);
  assert.equal(sala.tip,en[4]); assert.equal(sala.name,en[0]);
  setLang('th'); assert.equal(sala.tip,th[4]); assert.equal(sala.name,'จัดเอกสาร');
  keys.forEach((k,i)=>{assert.notEqual(th[i],k);assert.notEqual(en[i],k);assert.notEqual(th[i],en[i]);assert.doesNotMatch(en[i],/[฀-๿]/);});
  for(const raw of ["['จัดเอกสาร'","['ปรับองศา'","['วางกระจก'"]) assert.ok(!source.includes(raw),raw);
  } finally { setLang('th'); globalThis.document=oldDocument; }
});
