import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {THEME_ZONES,THEME_STATIONS,themeArt,themeBackground} from '../src/theme-assets.js';
import {createGame,deservedOf,refreshPendingSentences} from '../src/game.js';
import {firstTrialLesson,sentencingChapters} from '../src/sentencing-guide.js';
globalThis.Image=class {};
test('all four zones resolve complete exterior, arena and frontier sets shipped in preload',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../img/preload-catalog.json',import.meta.url)));
 for(const z of THEME_ZONES){
  const paths=['map','arena','frontier'].map(k=>themeBackground(z,k));
  paths.push(...THEME_STATIONS.map(k=>themeArt('st-'+k,z)));
  for(const p of paths){assert.ok(existsSync(new URL('../'+p,import.meta.url)),p);assert.ok(catalog.zones[z].includes(p),p+' preloaded');}
  assert.equal(themeArt('BG-Turn-Base',z),themeBackground(z,'arena'));
  assert.equal(themeArt('theme-map-'+z,'th'),themeBackground(z,'map'));
 }
 assert.equal(themeArt('hero-yama','th'),null);
});
test('simple sentence ignores other guilt weights and fake merit, and clamps to levels one to five',()=>{
 const soul={deeds:[{w:4},{w:3},{w:2}],merits:[{v:1},{v:4,fake:true}]};
 assert.equal(deservedOf(soul),3);assert.equal(deservedOf({...soul,deeds:[{w:4}]}),3);
 assert.equal(deservedOf({...soul,merits:[{v:20}]}),1);
 assert.equal(deservedOf({...soul,deeds:[{w:9}],merits:[]}),5);
 for(const html of [firstTrialLesson,sentencingChapters[1]]){assert.ok(html.includes('4 − 1'));assert.ok(!/0\.7|0\.3/.test(html));}
});
test('pending cases update across saved zones without changing handed-down punishments',()=>{
 const g=createGame();const s={id:777,deeds:[{w:4},{w:2}],merits:[{v:1}],deserved:2};
 const saved=g.snapshot();saved.queue=[structuredClone(s)];saved.held=[{...structuredClone(s),id:778,pure:true}];
 saved.zoneSave.asia={queue:[structuredClone(s)],held:[],stations:[]};
 const h=createGame();h.restore(saved);
 assert.equal(h.queue[0].deserved,3);assert.equal(h.held[0].deserved,0);assert.equal(h.zoneSave.asia.queue[0].deserved,3);
 const state={queue:[s],stations:[{slots:[{soul:{...s,deserved:2},verdict:{score:80}},{soul:{...s,deserved:2},verdict:null}]}]};refreshPendingSentences(state);
 assert.equal(state.stations[0].slots[0].soul.deserved,2);assert.equal(state.stations[0].slots[1].soul.deserved,3);
});
