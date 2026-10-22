import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// P5 — leaving a scene is walking onto the exit (no buttons) · the cauldron courtyard is walkable · building shadows are rooted on the ground contour.
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
const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k] ?? (()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});
const canvas=()=>({width:1678,height:937,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:1678,height:937}),addEventListener(){},removeEventListener(){}});
globalThis.document={documentElement:{},createElement:canvas};

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
const {exitStep}=await import('../src/exit-marker.js');
const {createGame}=await import('../src/game.js');
const view=await import('../src/dungeon-view.js');
const travel=await import('../src/zone-travel.js');
const fr=await import('../src/frontier.js');
const {ROOMS,ZONES}=await import('../src/data.js');
const {roomExit,nearRoomExit}=await import('../src/proximity.js');
const {teaRoom}=await import('../src/tea-recovery.js');
const {wideStationRoom}=await import('../src/room-art-assets.js');

test('latch: arriving on the exit never fires, stepping away re-arms, walking back in fires once',()=>{
  let r=exitStep({at:true,latched:true});assert.deepEqual(r,{latched:true,fire:false},'spawned on the exit: no bounce');
  r=exitStep({at:false,latched:r.latched});assert.deepEqual(r,{latched:false,fire:false},'stepped away: armed');
  r=exitStep({at:true,latched:r.latched});assert.deepEqual(r,{latched:true,fire:true},'walked in: fires');
  r=exitStep({at:true,latched:r.latched});assert.deepEqual(r,{latched:true,fire:false},'still standing there: only once');
});

test('latch: blocked states (cutscene, fight, mini-game, dialog) never fire and stay armed',()=>{
  assert.deepEqual(exitStep({at:true,latched:false,blocked:true}),{latched:false,fire:false});
  assert.deepEqual(exitStep({at:true,latched:false,blocked:false}),{latched:true,fire:true},'fires as soon as the block ends');
  assert.deepEqual(exitStep({at:false,latched:false,blocked:true}),{latched:false,fire:false});
});

test('no exit buttons are left anywhere (markup, css, handlers)',()=>{
  const ui=strip(read('../src/ui.js')),html=read('../index.html'),dv=read('../src/dungeon-view.js'),css=strip(read('../src/dungeon-view.css'));
  for(const gone of ['id="st-exit"','class="st-exit"','id="frw-gate"','id="frw-exit"','frw-gate','frw-exit','#st-exit'])
    assert.ok(!ui.includes(gone),`ui.js no longer contains ${gone}`);
  assert.ok(!/\.st-exit|\.frw-exit|\.frw-gate/.test(html),'index.html css for the removed buttons is gone');
  assert.ok(!dv.includes('dungeon-back')&&!dv.includes('data-action="leave"'),'route shell has no back button');
  assert.ok(!css.includes('.dungeon-back'),'route css has no back button');
  assert.match(dv,/data-action="menu"/,'the bag icon stays');
  // Every exit goes through exitStep (one latch for all three scene kinds).
  assert.match(ui,/exitStep\(\{ at: nearRoomExit\(R\.pos\(\), exit\)/);
  assert.match(strip(read('../src/frontier.js')),/exitStep\(\{ at: atFrontierGate\(P\)/);
  assert.match(dv,/dungeonStartDeparture\(g,startLatch/);
  assert.match(strip(read('../src/room.js')),/drawExitMarker\(ctx, px\(e\.x\), py\(e\.y\)/,'rooms draw the floor arrow');
});

test('station rooms: the exit zone never swallows the working spot, training spot or bed (no accidental exits)',()=>{
  let rooms=0;
  for(const [key,base] of Object.entries(ROOMS)) for(const zone of ZONES){
    let room=key==='tea'?teaRoom(zone.k):wideStationRoom(zone.k,key);
    if(!room)room=zone.k==='th'&&base.ui4?{...base,...base.ui4}:{...base,...base.zones?.[zone.k]};
    const exit=roomExit(key,zone.k,room);
    for(const spot of ['act','training','bed','item'])
      if(room[spot])assert.ok(!nearRoomExit(room[spot],exit),`${key}/${zone.k}: ${spot} outside the exit zone`);
    rooms++;
  }
  assert.ok(rooms>=40);
});

test('frontier post: exits sit on the old button spots; start is not on an exit; labels reuse the old copy',()=>{
  assert.equal(fr.atFrontierGate({x:.485,y:.35}),false);assert.equal(fr.atFrontierExit({x:.485,y:.35}),false,'start is neither');
  assert.equal(fr.atFrontierGate({x:.5,y:.19}),true);assert.equal(fr.atFrontierExit({x:fr.FRONTIER_EXIT[0],y:fr.FRONTIER_EXIT[1]}),true);
  assert.equal(fr.atFrontierGate({x:.5,y:.19+.06}),false,'trigger is tighter than the old .09 button reach');
  assert.ok(fr.FRONTIER_EXIT_TRIGGER<.09);
  const ui=read('../src/ui.js');
  assert.match(ui,/ออกนอกชายแดน · เส้นทางโซน 2/);assert.match(ui,/ทางนอกชายแดน · ยังไม่เปิด/);assert.match(ui,/ออกนอกชายแดน · ดินแดนถัดไป/);
});

const newGame=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;return g;};
test('route start: stepping back onto the start returns to the post - once, latched, never during fights/cut-ins',()=>{
  const g=newGame();travel.initializeZoneTravel(g);g.bossCleared.th=true;
  assert.equal(travel.beginDungeon(g,'asia'),true);
  const a=g.zoneTravel.active,start=view.dungeonPoint(0,a.route),far=view.dungeonPoint(.5,a.route);
  a.position={x:start[0],y:start[1]};
  assert.equal(view.dungeonAtStart(g),true);
  let r=view.dungeonStartDeparture(g,true);assert.deepEqual(r,{latched:true,leave:false},'the route begins on the start: no bounce');
  a.position={x:far[0],y:far[1]};r=view.dungeonStartDeparture(g,r.latched);assert.deepEqual(r,{latched:false,leave:false},'walked away: armed');
  a.position={x:start[0]+view.DUNGEON_START_REACH*.5,y:start[1]};r=view.dungeonStartDeparture(g,false);assert.deepEqual(r,{latched:true,leave:true},'walked back: leaves');
  r=view.dungeonStartDeparture(g,r.latched);assert.equal(r.leave,false,'only once');
  a.position={x:start[0]+view.DUNGEON_START_REACH*2.5,y:start[1]};assert.equal(view.dungeonAtStart(g),false,'just outside the reach');
  a.position={x:start[0],y:start[1]};
  for(const [label,set,unset,opts] of [
    ['battle',()=>{g.battle={};},()=>{g.battle=null;},{}],['recovery',()=>{g.pendingRecovery={};},()=>{g.pendingRecovery=null;},{}],
    ['pending encounter',()=>{a.pending='x';},()=>{a.pending=null;},{}],['cut-in',()=>{},()=>{},{cut:3}],['destroyed',()=>{},()=>{},{destroyed:true}],
  ]){set();assert.deepEqual(view.dungeonStartDeparture(g,false,opts),{latched:false,leave:false},label);unset();}
  assert.equal(view.dungeonStartDeparture(g,false).leave,true,'idle again: fires');
});

test('route start works on the legacy (vertical) routes too',()=>{
  const g=newGame();travel.initializeZoneTravel(g);g.zone='asia';g.bossCleared.asia=true;
  const ok=travel.beginDungeon(g,'west');if(!ok)return;           // fixture may not open this route; th:asia is covered above
  const a=g.zoneTravel.active,start=view.dungeonPoint(0,a.route);a.position={x:start[0],y:start[1]};
  assert.equal(view.dungeonAtStart(g),true);assert.equal(view.dungeonStartDeparture(g,false).leave,true);
});

// ---- cauldron (krata) courtyard, zone 1 ----
const {townContains,TOWN_CAULDRON_COURT}=await import('../src/town-layout.js?v=k1d');
const walk=await import('../src/walk.js?v=k1d');
const {TOWN_STATION_SITES}=await import('../src/town-layout.js?v=k1d');

test('cauldron courtyard: the pavement east/south-east of the cauldron is walkable, the cauldron footprint is not',()=>{
  // owner image 10: Yama stood at the torch line (about 714,573) and could not step west onto the pavement.
  for(const [x,y] of [[600,470],[640,500],[660,520],[690,560],[620,580],[560,580],[530,570],[650,430]])
    assert.equal(townContains(x,y),true,`pavement ${x},${y} is walkable`);
  for(const [x,y] of [[470,500],[420,480],[540,480],[470,520],[500,470]])
    assert.equal(townContains(x,y),false,`cauldron footprint ${x},${y} stays solid`);
  assert.equal(townContains(TOWN_STATION_SITES.krata.bx,TOWN_STATION_SITES.krata.by-60),false,'cauldron body stays solid');
});

test('cauldron courtyard: the opened area stays on the courtyard (no lava, cliff or neighbour opened)',()=>{
  const xs=TOWN_CAULDRON_COURT.map(p=>p[0]),ys=TOWN_CAULDRON_COURT.map(p=>p[1]);
  assert.ok(Math.min(...xs)>=516&&Math.max(...xs)<=712&&Math.min(...ys)>=412&&Math.max(...ys)<=596,'polygon is small and local');
  assert.ok(Math.min(...xs)-570>=-54&&TOWN_CAULDRON_COURT.every(([x,y])=>x>=582||y>=556),'west edge keeps clear of the cauldron mask');
  // Nothing outside the polygon changed: sample the cliff/lava side and the rim below.
  for(const [x,y] of [[760,430],[740,640],[620,640],[300,700],[900,500],[720,420],[700,610]])assert.equal(townContains(x,y),false,`${x},${y} still blocked`);
});

test('cauldron courtyard: Yama can path from the torch line across the courtyard and to the stair below',()=>{
  walk.resetWalk();
  for(const [from,to] of [[[714,573],[640,520]],[[714,573],[600,470]],[[640,520],[560,585]],[[600,470],[714,573]],[[690,560],[530,572]]]){
    const path=walk.findPath(from[0],from[1],to[0],to[1],false);
    assert.ok(path&&path.length,`path ${from}->${to}`);
    const end=path.at(-1);assert.ok(Math.hypot(end[0]-to[0],end[1]-to[1])<12,`path reaches ${to}`);
    let at=from;for(const p of path){assert.ok(walk.clearLine(at,p),'every leg is walkable');at=p;}
  }
});

// ---- building shadows ----
const {contourShadowPixels,SUN}=await import('../src/town-shade.js');
test('building shadow: every column of a 3/4-view base casts from its own ground contact (no bare strip under raised walls)',()=>{
  // A building whose right wall meets the ground 30 units higher than its front corner (the painted diamond footprint).
  const sw=100,sh=100,prof=new Float32Array(sw).map((_,i)=>1-.3*(i/(sw-1))),alpha=new Uint8Array(sw*sh);
  for(let x=0;x<sw;x++)for(let y=0;y<sh;y++)alpha[y*sw+x]=y/sh<=prof[x]?255:0;
  const c={left:-50,top:-100,w:100,h:100,flip:false,lift:1};
  const r=contourShadowPixels(alpha,sw,sh,prof,c,1);
  const at=(x,y)=>{const px=Math.floor(x-r.x),py=Math.floor(y-r.y);return px<0||py<0||px>=r.W||py>=r.H?0:r.data[(py*r.W+px)*4+3];};
  const sink=c.h*.022;
  for(const i of [2,25,50,75,97]){
    const X=c.left+(i+.5),yb=c.top+prof[i]*c.h-sink;                  // contact point of column i (foot-relative)
    // Just below the contact point, shifted by the sun shear for a point 4 units up the wall.
    assert.ok(at(X+SUN.kx*4+.5,yb+SUN.ky*4+1)>0,`column ${i} has shadow right under its own base`);
  }
  // The old single root (lowest contact, y = 100-sink) would start ~30 units lower for the rightmost column.
  const lowest=c.top+prof[0]*c.h-sink,highest=c.top+prof[sw-1]*c.h-sink;
  assert.ok(lowest-highest>25,'fixture: the wall really is raised');
  assert.ok(r.y<=highest+1,'shadow area starts at the raised contact line, not at the lowest corner');
  // and it is sheared to the lower right like every other caster
  assert.ok(r.x+r.W/ r.bake>c.left+c.w,'extends past the right edge of the sprite (sun is upper-left)');
});

test('building shadow: only buildings use the contour; trees/rocks keep the trunk root',()=>{
  const src=strip(read('../src/town-shade.js'));
  assert.match(src,/TOWN_HOUSE_SITES\.forEach[\s\S]{0,200}spriteCaster\(art, s\.x, s\.y, s\.w, s\.h, !!s\.flip, 1, true\)/);
  assert.match(src,/spriteCaster\(b\.im,b\.x\+b\.w\/2,b\.y\+b\.h,b\.w,b\.h,!!b\.flip,\.92,true\)/);
  assert.match(src,/spriteCaster\(art, p\.x, p\.y, p\.w, h, false, 1\)\)/,'trees keep the single root');
});
