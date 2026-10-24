import { isTownZone } from '../src/zone-skin.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {STATIONS,FRONTIER} from '../src/data.js';
import {townDefaultZoom,townZoomLevels,townNearbyAction,townSites} from '../src/town-map.js?v=k1d';
globalThis.Image=class {};
test('enabled town skins open in follow view; legacy branches retain overview and zoom',()=>{
 assert.equal(townDefaultZoom('th'),2);assert.equal(townZoomLevels('th')[1],3.5);
 for(const zone of ['asia','west','cyberhell']) {assert.equal(townDefaultZoom(zone),isTownZone(zone)?2:0);assert.deepEqual(townZoomLevels(zone),isTownZone(zone)?[1,3.5,5,6.5]:[1,2.5]);}
});
test('town action preserves NPC/event priority, construction access, and frontier reach',()=>{
 const g=createGame(),plot=STATIONS.find(d=>d.cost>0),npc={kind:'nira',id:'nira'};
 assert.equal(townNearbyAction(g,npc,plot).target,npc);
 assert.equal(townNearbyAction(g,null,plot).kind,'build');
 g.player.x=FRONTIER.x;g.player.y=FRONTIER.y+100;
 assert.equal(townNearbyAction(g,null,null).kind,'frontier');
 g.player.y+=10;assert.equal(townNearbyAction(g,null,null),null);
 for(const flag of ['battle','over']) {g[flag]=true;assert.equal(townNearbyAction(g,npc,plot),null);g[flag]=false;}
 g.zone='asia';assert.equal(townNearbyAction(g,npc,plot).target,npc);
 g.zone='west';assert.equal(townNearbyAction(g,npc,plot).target,npc);
 g.zone='cyberhell';assert.equal(townNearbyAction(g,npc,plot),null);
});
test('minimap reads current construction status without changing world or saves',()=>{
 const g=createGame(),plot=STATIONS.find(d=>d.cost>0 && !g.stations.some(s=>s.def.k===d.k));
 const snapshot=()=>{const s=g.snapshot();delete s.at;return JSON.stringify(s);};
 const before=snapshot();const sites=townSites(g);
 assert.equal(sites.length,STATIONS.length);assert.equal(sites.find(s=>s.key===plot.k).state,'plot');
 assert.equal(snapshot(),before);
 g.stations.push({def:plot,build:10,slots:[]});assert.equal(townSites(g).find(s=>s.key===plot.k).state,'building');
 g.stations.at(-1).build=0;assert.equal(townSites(g).find(s=>s.key===plot.k).state,'built');
});
