import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createGame } from '../src/game.js';
import { render, UI_SCALE_MAP } from '../src/scene.js';
import { finalGame } from './final-event-helpers.mjs';
import { finalEventActors } from '../src/final-event.js';
import { setLang } from '../src/i18n.js';

globalThis.Image ??= class {};
const source = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
function context() {
  const calls = [], stack = [];
  const state = { canvas:{width:1678,height:937}, calls,
    measureText:text=>({width:String(text).length * 6}),
    createLinearGradient:()=>({addColorStop(){}}),
    createRadialGradient:()=>({addColorStop(){}}),
    save(){ stack.push({...state}); },
    restore(){ Object.assign(state, stack.pop()); },
    fillText(text,x,y){ calls.push({text,x,y,font:state.font,outline:state.lineWidth}); },
  };
  return new Proxy(state, { get:(o,k)=>k in o ? o[k] : ()=>{} });
}
function draw(g) { const ctx=context(); render(ctx,g,1000,null,null); return ctx.calls; }
function nameStyle(call) {
  assert.ok(call);
  assert.ok(call.font.startsWith(`600 ${8 * UI_SCALE_MAP}px `), call.text);
  assert.equal(call.outline,8 * UI_SCALE_MAP / 3,call.text);
}

test('map names and bubble share one size; all name drawing sites use mapName',()=>{
  assert.match(source,/const MAP_NAME_SIZE = 8;/);
  const helpers = source.slice(source.indexOf('function bubble('),source.indexOf('/** แปลงพิกัดเมาส์'));
  const ctx=context();
  runInNewContext(`const MAP_NAME_SIZE=8, UI_SCALE_MAP=1.2, SCENE={w:1678}; ${helpers};
    mapName(ctx,'name',50,100); bubble(ctx,'dialogue',50,30);`,{ctx,rr(){}});
  nameStyle(ctx.calls[0]);
  assert.equal(ctx.calls[0].font.match(/[\d.]+px/)[0],ctx.calls[1].font.match(/[\d.]+px/)[0]);
  const nameLines=source.split('\n').filter(line=>/\b(?:label|mapName)\(ctx,.*(?:c\.name|a\.name)/.test(line));
  assert.equal(nameLines.length,2);
  for(const line of nameLines) assert.match(line,/mapName\(ctx,/);
});

test('crew names and Nira recovery use dialogue size in all four map zones',()=>{
  setLang('th');
  for(const zone of ['th','asia','west','cyberhell']) {
    const g=createGame(); g.zone=zone;
    g.zoneEvents.cyberhell={cyberRescue:'cleared',cyberBreach:'cleared'};
    g.zoneEvents.west={westHypnotized:'cleared',westVampireBreach:'cleared'};
    g.refreshZoneEvents();
    g.niraRest={remaining:7};
    for(const c of g.crew) Object.assign(c,{x:400,y:450,escort:null});
    const calls=draw(g);
    for(const c of g.crew) {
      const text=c.k==='nira'?`${c.name} · 🩹 พักฟื้น 7`:c.name;
      const call=calls.find(c=>c.text===text); nameStyle(call); assert.equal(call.y,460);
    }
  }
});

test('final wave, reinforcement, ruler and warp boss names use the same map style',()=>{
  setLang('th');
  for(const stage of ['wave','reinforcementMap','rulers','warp']) {
    const g=finalGame();
    Object.assign(g.finalEventState(),{phase:'ready',minionsCleared:stage==='wave'||stage==='warp'?0:4,
      reinforcementsSeen:stage==='reinforcementMap'||stage==='rulers',
      presentation:stage==='rulers'?null:stage==='wave'?null:stage,warpElapsed:600});
    const actors=finalEventActors(g), calls=draw(g);
    assert.ok(actors.length);
    for(const a of actors.filter(a=>a.name)) {
      const text=`${a.name}${a.reinforcement||!a.enabled?'':' · พร้อมสู้'}`;
      const call=calls.find(c=>c.text===text); nameStyle(call);
      const above=!a.reinforcement&&Math.round((a.x-1110)/80)%2===1;
      assert.equal(call.y,above?a.y-78*.8-6:a.y+10);
    }
    if(stage==='reinforcementMap') {
      const camp=calls.find(c=>c.text==='ค่ายพัก · นอนฟื้นบารมี');
      assert.ok(camp.font.startsWith(`600 ${11*UI_SCALE_MAP}px `)); assert.equal(camp.outline,6);
    }
  }
});

test('interaction tags and deva skill prompt retain their original sizes',()=>{
  const tag=source.slice(source.indexOf('function tag('),source.indexOf('function ring('));
  assert.match(tag,/13 \* UI_SCALE_MAP/);
  assert.match(tag,/h = 21 \* UI_SCALE_MAP/);
  assert.ok(source.includes("if (a.enabled) label(ctx, a.label, a.x, a.y + 18, 12, '#f7c371');"));
  assert.ok(source.includes("label(ctx, `${n}`, x + BADGE_R - 2, cy + BADGE_R - 5, 15, '#ffe7c4');"));
});
