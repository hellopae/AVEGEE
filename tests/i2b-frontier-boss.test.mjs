import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Exercise the actual frontier controller and canvas/DOM output with a controlled frame clock.
const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json',import.meta.url)));
globalThis.fetch = async () => ({ok:true,json:async()=>manifest});
globalThis.Image = class {
  naturalWidth=1678; naturalHeight=937;
  set src(v) {this._src=v; queueMicrotask(()=>this.onload?.());}
  get src() {return this._src;}
};
globalThis.devicePixelRatio=1;
globalThis.addEventListener=()=>{};
globalThis.removeEventListener=()=>{};
let frame;
globalThis.requestAnimationFrame=fn=>{frame=fn;return 1;};
globalThis.cancelAnimationFrame=()=>{};
const labels=[];
const ctx=new Proxy({fillText(text){labels.push(text);},createRadialGradient:()=>({addColorStop(){}})},
  {get:(o,k)=>o[k] ?? (()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});
const canvas=()=>({width:1678,height:937,getContext:()=>ctx,
  getBoundingClientRect:()=>({left:0,top:0,width:1678,height:937}),
  addEventListener(type,fn){this[type]=fn;},removeEventListener(){}});
globalThis.document={documentElement:{},createElement:canvas};
const {createGame}=await import('../src/game.js');
const {CHALLENGE_STAND,CHALLENGE_STORY_KEY,BOSS_NAMES}=await import('../src/data.js');
const {makeFrontierWalk,clearFrontierSession,frontierSession}=await import('../src/frontier.js');
const button=()=>({hidden:true,style:{},dataset:{}});

for (const zone of Object.keys(CHALLENGE_STAND)) {
  test(`${zone}: walk to replay boss shows talk button and starts existing challenge`, async()=>{
    clearFrontierSession(); labels.length=0;
    const g=createGame();g.zone=zone;
    g.zoneEvents[zone]={[CHALLENGE_STORY_KEY[zone]]:'cleared'};
    const cv=canvas(), challenge=button();
    const fw=makeFrontierWalk(cv,g,{bg:`img/theme-v4/frontier-${zone}.webp`,kinds:[],wave:1,alive:()=>true,challenge});
    try {
      await Promise.resolve();fw.start();
      assert.equal(challenge.hidden,true);
      assert.equal(fw.canTalkChallenge(),false);
      assert.equal(fw.enemyCount(),0,'NPC does not consume an enemy slot');
      assert.ok(labels.includes(BOSS_NAMES[zone].frontier),'boss rendered in frontier');
      const {x,y}=CHALLENGE_STAND[zone];
      cv.pointerdown({clientX:(x-.06)*1678,clientY:y*937});
      let now=performance.now();
      for(let i=0;i<200;i++) {now+=50;frame(now);}
      const p=frontierSession(zone).player;
      assert.ok(Math.hypot(p.x-x,p.y-y)<=.09,'walk reaches talk radius');
      assert.equal(fw.canTalkChallenge(),true);
      assert.equal(challenge.hidden,false);
      assert.equal(challenge.textContent,`💬 คุยกับ${BOSS_NAMES[zone].frontier}`);
      assert.ok(parseFloat(challenge.style.top)<y*100-15,'button above full boss height');
      const b=g.startChallenge();
      assert.equal(b.challenge,true);assert.equal(b.wave,1);assert.equal(b.zone,zone);
      assert.equal(fw.canTalkChallenge(),false,'cannot talk during battle');
    } finally {fw.destroy();assert.equal(challenge.hidden,true);}
  });
  test(`${zone}: invasion boss uses lower position and talk label, without a duplicate replay boss`, async()=>{
    clearFrontierSession();
    const g=createGame();g.zone=zone;
    g.zoneEvents[zone]={[CHALLENGE_STORY_KEY[zone]]:'pending'};
    const {x,y}=CHALLENGE_STAND[zone];
    const p=frontierSession(`${zone}:${CHALLENGE_STORY_KEY[zone]}`).player;p.x=x-.06;p.y=y;
    const fab=button(), challenge=button();
    const fw=makeFrontierWalk(canvas(),g,{bg:`img/theme-v4/frontier-${zone}.webp`,kinds:[],wave:1,alive:()=>true,fab,challenge,invasionKey:CHALLENGE_STORY_KEY[zone]});
    try {
      await Promise.resolve();fw.start();frame(performance.now()+50);
      assert.equal(fw.nearId(),'breach:boss');
      assert.equal(fab.hidden,false);
      assert.equal(fab.textContent,`💬 คุยกับ${BOSS_NAMES[zone].frontier}`);
      assert.equal(challenge.hidden,true);
      assert.deepEqual([fw.getEnemy('breach:boss').x,fw.getEnemy('breach:boss').y],[x,y]);
      g.setFrontierTeam('taan');
      if(zone === 'th') g.zoneEvents.th.devaTest='cleared';
      const b=zone === 'th' ? g.startFrontierBreach() : g.startZoneEvent(CHALLENGE_STORY_KEY[zone]);
      assert.ok(b, 'existing story battle starts from the frontier approach');
      assert.equal(b.wave,1);assert.equal(b.zone,zone);
    } finally {fw.destroy();}
  });
}
