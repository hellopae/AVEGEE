import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// O1 — outer-border route: full-bleed map, auto-enter at the gate, guide gone after the farewell.
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
globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=()=>{};
const labels=[];
const ctx=new Proxy({fillText(text){labels.push(text);},createRadialGradient:()=>({addColorStop(){}})},
  {get:(o,k)=>o[k] ?? (()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});
const canvas=()=>({width:1678,height:937,getContext:()=>ctx,
  getBoundingClientRect:()=>({left:0,top:0,width:1678,height:937}),
  addEventListener(type,fn){this[type]=fn;},removeEventListener(){}});
globalThis.document={documentElement:{},createElement:canvas};

const {createGame}=await import('../src/game.js');
const {FRONTIER,CHALLENGE_STAND,CHALLENGE_STORY_KEY,BOSS_NAMES,SPOTS}=await import('../src/data.js');
const {FRONTIER_WORLD,frontierCameraTarget}=await import('../src/frontier-view-metrics.js');
const view=await import('../src/dungeon-view.js');
const travel=await import('../src/zone-travel.js');
const {initializeBossGuides,bossGuideDismissed,bossGuideWaiting,bossGuideFollowing,completeBossGuideStory,bossGuideState,BOSS_GUIDE_GRANTS}=await import('../src/boss-guides.js');
const {makeFrontierWalk,clearFrontierSession}=await import('../src/frontier.js');
const {standPoints}=await import('../src/npc-stand.js');

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const NEXT={th:'asia',asia:'west',west:'cyberhell'};
const newGame=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};return g;};
/** An in-memory game standing in `zone`, guide state set to `mode`: waiting | following | farewell. */
function game(zone='th',mode='farewell'){
  const g=newGame();g.coin=10000;g.zone=zone;g.bossCleared[zone]=true;
  g.zoneEvents[zone]={...(g.zoneEvents[zone]||{}),[CHALLENGE_STORY_KEY[zone]]:'cleared'};
  initializeBossGuides(g);
  const s=bossGuideState(g,zone);
  Object.assign(s,{won:true,praised:true,welcomed:mode!=='waiting',following:mode==='following',farewell:mode==='farewell',grantPaid:mode==='farewell',grantAmount:mode==='farewell'?BOSS_GUIDE_GRANTS[zone]:0,outfitGranted:mode==='farewell'});
  return g;
}
const toGate=g=>{
  travel.initializeZoneTravel(g);assert.equal(travel.beginDungeon(g,NEXT[g.zone]),true);
  const a=g.zoneTravel.active,r=travel.dungeonStatus(g).route;
  for(let i=0;i<r.checkpoints.length;i++){const e=travel.nextDungeonEncounter(g);travel.resolveDungeonEncounter(g,e.token,true);}
  const p=view.dungeonPoint(1,a.route);a.position={x:p[0],y:p[1]};return a;
};

test('markup: the route is one full-bleed map with only floating controls (no header, footer, gate button or back button)',()=>{
  const js=read('../src/dungeon-view.js'),css=read('../src/dungeon-view.css').replace(/\/\*[\s\S]*?\*\//g,'');
  for(const gone of ['dungeon-toolbar','<footer','</footer>','dungeon-interact','data-action="overview"','ดูทั้งเส้นทาง'])
    assert.ok(!js.includes(gone),`dungeon-view.js no longer contains ${gone}`);
  for(const gone of ['.dungeon-toolbar','footer','.dungeon-interact'])assert.ok(!css.includes(gone),`dungeon-view.css no longer styles ${gone}`);
  // P5: the ← back button is gone - going back is walking onto the route start (tests/p5-map-exits.test.mjs)
  assert.ok(!js.includes('dungeon-back')&&!js.includes('data-action="leave"'),'no back button in the route shell');
  assert.match(js,/data-action="menu"/);
  assert.equal((js.match(/root\.innerHTML=dungeonShell\(/g)||[]).length,2,'wilderness and legacy views share the shell');
  // Touch targets, safe areas, no colour frame, no duplicate corner X.
  assert.match(css,/button\.dungeon-icon\{[^}]*width:48px;height:48px;min-width:48px/);
  assert.match(css,/env\(safe-area-inset-top/);assert.match(css,/env\(safe-area-inset-bottom/);
  assert.match(css,/canvas:focus-visible\{outline:none\}/);
  assert.match(css,/dialog#dlg\.dungeon-dialog>\.modal-corner-close\{display:none!important\}/);
  assert.match(css,/dialog\.dungeon-dialog\{width:100vw;max-width:none;height:100dvh;max-height:none;margin:0;padding:0;border:0;border-radius:0\}/);
});

test('camera: the map always covers the viewport (portrait, landscape, laptop, large display)',()=>{
  const {w,h}=FRONTIER_WORLD;
  for(const [vw,vh] of [[1440,900],[1280,720],[390,844],[844,390],[360,780],[1920,1080],[2560,1440],[1024,1366]])
    for(const at of [[0,0],[.5,.5],[1,1],[0,1],[1,0],[.91,.79]]){
      const c=frontierCameraTarget(vw,vh,at);
      assert.ok(c.scale>=1,`${vw}x${vh} never shrinks the texture`);
      assert.ok(c.x<=1e-9&&c.y<=1e-9,`${vw}x${vh}@${at} left/top edge is covered`);
      assert.ok(c.x+w*c.scale>=vw-1e-9&&c.y+h*c.scale>=vh-1e-9,`${vw}x${vh}@${at} right/bottom edge is covered`);
    }
  assert.equal(frontierCameraTarget(390,844,[.5,.5]).scale,1,'phones keep native texture scale');
  assert.equal(frontierCameraTarget(1440,900,[.5,.5]).scale,1);
});

test('gate: reaching the exit enters automatically, once, and only after stepping out of range again',()=>{
  const g=game('th','following');const a=toGate(g);
  assert.equal(travel.dungeonStatus(g).ready,true);
  // Walking up from outside range.
  const far=view.dungeonPoint(.8,a.route);a.position={x:far[0],y:far[1]};
  let r=view.dungeonExitArrival(g,false);assert.deepEqual(r,{latched:false,enter:false},'out of range: nothing');
  const gate=view.dungeonPoint(1,a.route);a.position={x:gate[0],y:gate[1]};
  r=view.dungeonExitArrival(g,false);assert.deepEqual(r,{latched:true,enter:true},'in range: enter, no button');
  r=view.dungeonExitArrival(g,r.latched);assert.deepEqual(r,{latched:true,enter:false},'still standing there: does not re-fire');
  a.position={x:far[0],y:far[1]};r=view.dungeonExitArrival(g,true);assert.deepEqual(r,{latched:false,enter:false},'stepping away re-arms');
  a.position={x:gate[0],y:gate[1]};assert.equal(view.dungeonExitArrival(g,false).enter,true,'and walking back in fires again');
  // Same reach as the old button: just inside / just outside .026 of the gate.
  const inside=[gate[0]-.02,gate[1]],outside=[gate[0]-.04,gate[1]];
  a.position={x:inside[0],y:inside[1]};assert.equal(view.dungeonExitArrival(g,false).enter,view.dungeonAtExit(g));
  a.position={x:outside[0],y:outside[1]};assert.equal(view.dungeonAtExit(g),false);assert.equal(view.dungeonExitArrival(g,false).enter,false);
});

test('gate: never enters during a fight, recovery, pending encounter, cut-in or after the view was destroyed',()=>{
  const g=game('th','following');const a=toGate(g);
  for(const [label,setup,undo,opts] of [
    ['battle',()=>{g.battle={};},()=>{g.battle=null;},{}],
    ['recovery',()=>{g.pendingRecovery={};},()=>{g.pendingRecovery=null;},{}],
    ['pending encounter',()=>{a.pending='x';},()=>{a.pending=null;},{}],
    ['cut-in',()=>{},()=>{},{cut:5}],
    ['destroyed view',()=>{},()=>{},{destroyed:true}],
  ]){
    setup();const r=view.dungeonExitArrival(g,false,opts);
    assert.deepEqual(r,{latched:false,enter:false},`${label}: blocked and still armed`);
    undo();
  }
  assert.equal(view.dungeonExitArrival(g,false).enter,true,'idle again: fires');
});

test('gate: a route that is not finished never auto-enters even when Yama stands on the exit',()=>{
  const g=game('th','following');travel.initializeZoneTravel(g);travel.beginDungeon(g,'asia');
  const p=view.dungeonPoint(1,'th:asia');g.zoneTravel.active.position={x:p[0],y:p[1]};
  assert.equal(view.dungeonExitArrival(g,false).enter,false);
});

test('wiring: both route views enter by the latch and neither can be triggered by a button',()=>{
  const js=read('../src/dungeon-view.js');
  assert.equal((js.match(/dungeonExitArrival\(g,exitLatch,/g)||[]).length,2,'wilderness + legacy');
  assert.equal((js.match(/let exitLatch=!!\(dungeonStatus\(g\)\?\.ready&&dungeonAtExit\(g\)\)/g)||[]).length,2,'mounting on the gate starts latched');
  assert.equal((js.match(/onArrival\(status\.route\.to\)/g)||[]).length,2);
  assert.doesNotMatch(js,/listen\(action,/);
});

test('farewell dismisses the guide from the city pier (talk spot, rematch menu, walk blocker)',()=>{
  for(const zone of ['th','asia','west']){
    const waiting=game(zone,'waiting'),following=game(zone,'following'),gone=game(zone,'farewell');
    assert.equal(bossGuideDismissed(waiting),false);assert.equal(bossGuideDismissed(following),false);assert.equal(bossGuideDismissed(gone),true,zone);
    assert.equal(bossGuideWaiting(gone),false);assert.equal(bossGuideFollowing(gone),false);
    // City pier (talk spot, rematch, zone menu) and its walking blocker.
    assert.equal(waiting.bossPierCanTalk()||true,true);
    waiting.player.x=SPOTS.bossPier.x;waiting.player.y=SPOTS.bossPier.y;gone.player.x=SPOTS.bossPier.x;gone.player.y=SPOTS.bossPier.y;
    assert.equal(waiting.bossPierCanTalk(),true,`${zone}: boss still at the pier until the farewell`);
    assert.equal(gone.bossPierCanTalk(),false,`${zone}: pier talk spot is gone`);
    const at=(g)=>standPoints(g).some(p=>p[0]===SPOTS.bossPier.x&&p[1]===SPOTS.bossPier.y);
    assert.equal(at(waiting),true);assert.equal(at(gone),false,`${zone}: no invisible blocker at the pier`);
  }
});

test('after the farewell zone 1 captain stays in its cave; other frontier stands remain usable',async()=>{
  const {frontierSession}=await import('../src/frontier.js');
  for(const zone of ['th','asia','west','cyberhell']){
    for(const mode of zone==='cyberhell'?['none']:['following','farewell']){
      clearFrontierSession();labels.length=0;
      const g=mode==='none'?(()=>{const x=newGame();x.zone=zone;x.zoneEvents[zone]={[CHALLENGE_STORY_KEY[zone]]:'cleared'};return x;})():game(zone,mode);
      const {x,y}=CHALLENGE_STAND[zone],P=frontierSession(zone).player;P.x=x-.06;P.y=y;
      const challenge={hidden:true,style:{},dataset:{}},fw=makeFrontierWalk(canvas(),g,{bg:`img/theme-v4/frontier-${zone}.webp`,kinds:[],wave:1,alive:()=>true,challenge});
      try{
        await Promise.resolve();fw.start();
        const stands=zone!=='th';
        assert.equal(labels.includes(BOSS_NAMES[zone].frontier),stands,`${zone}/${mode}: boss drawn at the stand`);
        assert.equal(fw.canTalkChallenge(),stands,`${zone}/${mode}: talk spot exists exactly when the boss is drawn`);
        assert.equal(challenge.hidden,!stands);
        assert.equal(g.challengeCanTalk(P),stands);
        if(stands)assert.equal(g.startChallenge()?.challenge,true,`${zone}/${mode}: the 10-wave trial still starts`);
      }finally{fw.destroy();}
    }
  }
  // The cave captain remains visible and talkable after the guide has left.
  const after=game('th','farewell');toGate(after);const cave=view.dungeonPoint(view.DUNGEON_PROGRESS[2]);
  after.zoneTravel.active.position={x:cave[0],y:cave[1]};
  assert.equal(after.challengeCanTalk(),true,'captain remains at the cave after the farewell');
  const js=read('../src/dungeon-view.js');
  assert.match(js,/\.dungeon-challenge'\)\.hidden=!challengeStandeeShown\(\)/,'cave button is tied to the drawn standee');
  assert.match(js,/else if\(challengeStandeeShown\(\)\)\{/,'and the same predicate draws the boss');
});

test('route again after the farewell: Yama + Nira only (no hired keepers, guard or guide); first escort keeps the guide',()=>{
  const setup=(mode)=>{const g=game('th',mode);g.hire('taan');g.hire('boon');g.hireGuard();g.frontierOf().team=['taan','boon'];g.party.members=['taan','boon'];
    g.mobs.push({id:900,kind:2,dungeonToken:'th:travel:0'});assert.ok(g.startMobBattle(g.mobs.length-1));return g;};
  const again=setup('farewell');
  assert.deepEqual(again.battleActors().map(c=>c.k),['yama','nira']);assert.equal(again.guardActive(),false);
  const first=setup('following');
  assert.deepEqual(first.battleActors().map(c=>c.k),['yama','nira','guide']);assert.equal(first.guardActive(),false);
  // The frontier station is untouched: an ordinary border patrol still uses the selected team and the guard.
  const patrol=game('th','farewell');patrol.hire('taan');patrol.hire('boon');patrol.hireGuard();patrol.frontierOf().team=['taan','boon'];
  assert.ok(patrol.startFrontierBattle());assert.deepEqual(patrol.battleCrew().map(c=>c.k),['taan','boon']);assert.equal(patrol.guardActive(),true);
});

test('an old save that already said farewell never shows the guide again and keeps money and outfits',()=>{
  const g=game('th','following');
  completeBossGuideStory(g,'boss-guide-th-farewell');
  const coin=g.coin,outfits=[...g.outfitsOwned];
  assert.equal(coin,10000+BOSS_GUIDE_GRANTS.th);assert.ok(outfits.includes('asia'));
  completeBossGuideStory(g,'boss-guide-th-farewell');assert.equal(g.coin,coin,'gift is paid once');
  const restored=newGame();assert.equal(restored.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);
  assert.equal(bossGuideDismissed(restored),true);assert.equal(bossGuideWaiting(restored),false);assert.equal(bossGuideFollowing(restored),false);
  assert.equal(restored.coin,coin);assert.deepEqual(restored.outfitsOwned,outfits);
  // Pre-guide saves: the next land was already discovered, so the guide is treated as having said farewell.
  const legacy={zone:'asia',bossCleared:{th:true,asia:true},zoneTravel:{visited:{th:true,asia:true}}};initializeBossGuides(legacy);
  assert.equal(bossGuideDismissed(legacy,'th'),true);assert.equal(bossGuideDismissed(legacy,'asia'),false);
});

 test('B5b: cave replay survives saved farewell and released court without duplicate grants',()=>{
 const g=game('th','farewell');toGate(g);const cave=view.dungeonPoint(view.DUNGEON_PROGRESS[2]);g.zoneTravel.active.position={x:cave[0],y:cave[1]};
 g.bossJustice={version:1,active:null,ledger:{captain:{id:'captain',zone:'th',phase:'released',frontierBoss:true,art:'boss-frontier-th',name:'หัวหน้าชายแดน'}}};
 const money=g.coin,h=newGame();h.restore(g.snapshot());
 assert.equal(h.challengeCanTalk(),true);assert.equal(h.challengeCanTalk(CHALLENGE_STAND.th),false,'no invisible frontier interaction');
 assert.equal(h.coin,money);assert.equal(h.bossJustice.ledger.captain.phase,'released');
 clearFrontierSession();const fw=makeFrontierWalk(canvas(),h,{bg:'',kinds:[],wave:1,alive:()=>true,challenge:{hidden:true,style:{},dataset:{}}});
 try{assert.equal(fw.releasedBoss(),null,'returned captain is not duplicated at frontier');}finally{fw.destroy();}
 h.bossJustice.active='captain';h.bossJustice.ledger.captain.phase='trial';assert.equal(h.challengeCanTalk(),false,'court blocks replay');
 });
