import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createGame} from '../src/game.js';
import {beginMapTravel,advanceMapTravel,cancelMapTravel,finishMapTravel,TRAVEL_WALK_SPEED} from '../src/map-travel.js';
import {pathLength} from '../src/escort.js';
import {DUNGEON_ROUTES} from '../src/zone-travel.js';
import {dungeonPoint} from '../src/dungeon-view.js';
globalThis.Image??=class{};
function game(){const g=createGame();g.save=()=>true;g.onChange=()=>{};g.bossCleared.th=true;return g;}
function border(){const g=game(),r=DUNGEON_ROUTES.find(r=>r.from==='th');g.zoneTravel.active={route:r.id,checkpoint:r.checkpoints.length,cleared:r.checkpoints.map(c=>c.id),attempt:r.checkpoints.length,pending:null,position:{x:dungeonPoint(1,r.id)[0],y:dungeonPoint(1,r.id)[1]}};return g;}
test('border arrival skips caretaker speech and boarding, committing only once',()=>{
 const g=border();let moves=0;const move=g.moveZone.bind(g);g.moveZone=to=>{moves++;return move(to);};
 assert.equal(beginMapTravel(g,'asia',{mode:'dungeon'}),true);assert.equal(g.mapTravel.phase,'depart');assert.deepEqual(g.mapTravel.niraPath,[]);
 const phases=new Set();for(let i=0;i<100&&g.mapTravel;i++){phases.add(g.mapTravel.phase);advanceMapTravel(g,120);}
 assert.deepEqual([...phases],['depart']);assert.equal(g.zone,'asia');assert.equal(moves,1);assert.equal(finishMapTravel(g),false);
});
test('border handoff can cancel without discovering destination; incomplete exits cannot start it',()=>{
 const g=border();assert(beginMapTravel(g,'asia',{mode:'dungeon'}));assert(cancelMapTravel(g));assert.equal(g.zone,'th');assert.equal(!!g.zoneTravel.visited.asia,false);assert(g.zoneTravel.active);
 g.zoneTravel.active.checkpoint=0;assert.equal(beginMapTravel(g,'asia',{mode:'dungeon'}),false);
});
test('boat approach gives Nira ordinary walk speed instead of a rush to the dock',()=>{
 const g=game();g.zoneTravel.visited.asia=g.zoneTravel.ports.asia=true;Object.assign(g.player,g.harbourPoint());
 assert(beginMapTravel(g,'asia'));assert.equal(g.mapTravel.phase,'approach');const a=g.mapTravel;
 assert.equal(TRAVEL_WALK_SPEED,.11);assert(pathLength(a.niraPath)/a.approachMs<=TRAVEL_WALK_SPEED);assert.equal('kanPath' in a,false);
});
const ui=readFileSync('src/ui.js','utf8');const source=ui.slice(ui.indexOf('function kanTravelPortrait('),ui.indexOf('\nfunction openOutfit()',ui.indexOf('function kanTravelPortrait(')));
function uiFixture(){
 class Node{constructor(tag){this.tag=tag;this.children=[];this._style={};}set style(v){this._style={cssText:v};}get style(){return this._style;}append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}setAttribute(){}focus(){}showModal(){this.open=true;}querySelector(k){return (this.controls||={})[k]||=((new Node('button')));}addEventListener(k,fn){(this.listeners||={})[k]=fn;}close(){this.open=false;this.closed=(this.closed||0)+1;}}
 const dlg=new Node('dialog');dlg.open=true;const body=new Node('body');const g={zone:'th',paused:true,crewOf:()=>({k:'kan'}),outfit:'th',log(){},onChange(){}};let reopened=0,moves=0,stayed=0,routes=0;g.beginBorderDungeon=()=>{routes++;return true;};const frames=[];
 const ctx={g,dlg,dlgGen:1,document:{body,createElement:tag=>new Node(tag),addEventListener(){},removeEventListener(){}},preloadZone:async()=>{},matchMedia:()=>({matches:false}),beginMapTravel:(game,to,opts)=>{g.mapTravel={phase:opts.mode==='boat'?'handoff':'depart',committed:false};return true;},cancelMapTravel:()=>{g.mapTravel=null;return true;},finishMapTravel:()=>{g.zone='asia';g.mapTravel=null;moves++;return true;},advanceMapTravel(){},performance:{now:()=>0},requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame(){},crewArt:()=>'/kan.png',esc:String,KAN_HANDOFF:'ข้าจะดูแลโซนนี้ให้ ไม่ต้องห่วง',refresh(){},openDungeon:()=>{reopened++;dlg.open=true;},openFrontierWalk:()=>{stayed++;},dungeonStatus:()=>null,setMapZoom(){},MAP_ZOOM_LEVELS:[0,1]};
 vm.createContext(ctx);vm.runInContext(source,ctx);return {ctx,dlg,body,g,frames,get reopened(){return reopened;},get moves(){return moves;},get routes(){return routes;},get stayed(){return stayed;}};
}
test('border transition keeps its backdrop without replaying the portrait; cancel reconstructs its view',async()=>{
 const f=uiFixture();await f.ctx.startMapJourney('asia','dungeon');assert(f.dlg.open);assert.equal(f.dlg.closed,undefined);assert.equal(f.body.children.length,0);
 const panel=f.dlg.children.find(n=>n.id==='map-travel-panel');assert(panel);f.frames[0](120);assert.equal(panel.children[0].hidden,true,'caretaker already spoke at source gate');assert.equal(panel.children[1].hidden,false);
 panel.children.find(n=>n.textContent==='ยกเลิก').onclick();assert.equal(f.g.zone,'th');assert.equal(f.reopened,1);assert.equal(f.g.paused,true);assert.equal(f.dlg.children.length,0);
});
test('border skip closes the old backdrop only after successful commit',async()=>{
 const f=uiFixture();await f.ctx.startMapJourney('asia','dungeon');const panel=f.dlg.children.find(n=>n.id==='map-travel-panel');
 panel.children.find(n=>n.textContent==='ข้ามฉากเดินทาง').onclick();assert.equal(f.g.zone,'asia');assert.equal(f.moves,1);assert.equal(f.dlg.closed,1);assert.equal(f.reopened,0);assert.equal(f.dlg.children.length,0);
});

test('source-gate portrait starts the route only on confirmation, once',()=>{
 const f=uiFixture();f.ctx.startBorderExpedition('asia');const prompt=f.body.children[0];assert(prompt.open);assert.equal(f.routes,0);
 prompt.querySelector('[data-border-go]').onclick();prompt.querySelector('[data-border-go]').onclick();assert.equal(f.routes,1);assert.equal(f.reopened,1);assert.equal(f.body.children.length,0);
});
test('cancelling source-gate portrait leaves no route and returns to frontier',()=>{
 const f=uiFixture();f.ctx.startBorderExpedition('asia');const prompt=f.body.children[0];prompt.listeners.cancel({preventDefault(){}});assert.equal(f.routes,0);assert.equal(f.stayed,1);assert.equal(f.body.children.length,0);
});
