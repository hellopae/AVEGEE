import './_legacy-zone1.mjs';   // Zone 1 on the old painting (layered map = tests/town-v6-zone1.test.mjs)
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {SNOW_TRACKS,updateSnowTracks,snowTrackAlpha} from '../src/snow-footprints.js';
import {ATMOSPHERE,atmosphereBudget,TH_ATMOS_LAMPS} from '../src/scene-atmosphere.js';
import {cloudOpacityForZone,MAP_FX,drawBiomeWeather,setWeatherEnabled} from '../src/map-ambient.js';
import {FRONTIER_WORLD,FRONTIER_CINEMATIC,frontierCameraTarget} from '../src/frontier-view-metrics.js';
import {townFloorAt} from '../src/town-layout.js';
test('Thai cloud cap follows the November3 visibility review; other biome caps remain20%',()=>{assert.equal(cloudOpacityForZone('th'),.32);assert.equal(cloudOpacityForZone('asia'),.2);assert.equal(cloudOpacityForZone('west'),.2);assert.equal(cloudOpacityForZone('cyberhell'),.2);assert.ok(MAP_FX.cloud.peakByZone!==undefined);});
test('dialog weather particle and canvas budgets stay bounded on desktop and phone',()=>{assert.ok(atmosphereBudget(3840,2160)<=160);assert.ok(atmosphereBudget(390,844,3)<atmosphereBudget(1280,800,1));assert.ok(ATMOSPHERE.maxCanvasPixels<=1000000);
 const rects=[],ctx=new Proxy({canvas:{width:1280,height:800},createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(...a)=>{if(k==='rect')rects.push(a);},set:(o,k,v)=>(o[k]=v,true)});
 drawBiomeWeather(ctx,'west',1000,1280,800,false,[0,0,1,1],40);assert.ok(rects.length<=41,'at most40snowflakes plusoneclip');setWeatherEnabled(false);const before=rects.length;drawBiomeWeather(ctx,'west',1000,1280,800,false,[0,0,1,1],40);assert.equal(rects.length,before);setWeatherEnabled(true);
});
test('snow prints are movement-only, alternate along real path, and remain capped',()=>{const owner={};let time=0;updateSnowTracks(owner,[{id:'you',x:0,y:0}],time);
 for(let i=0;i<100;i++){time+=100;var state=updateSnowTracks(owner,[{id:'you',x:i*15,y:30}],time,{validAt:(x,y)=>x>=0&&y>20});}
 assert.ok(state.points.length>0&&state.points.length<=SNOW_TRACKS.max);assert.ok(state.points.every(p=>p.x>=0&&p.y>20));const n=state.points.length;updateSnowTracks(owner,[{id:'you',x:1485,y:30}],time+100);assert.ok(state.points.length<=n,'standing creates no new impression');assert.ok(state.points.every(p=>p.born<state.clock),'no new timestamp while standing');assert.deepEqual(Object.keys(owner),[],'no save/game fields are added');
});
test('snow prints freeze on pause, fade in final2seconds, and expire after6active seconds',()=>{const owner={};updateSnowTracks(owner,[{id:'you',x:0,y:0}],0);let s=updateSnowTracks(owner,[{id:'you',x:20,y:0}],100);assert.ok(s.points.length);const point=s.points[0],clock=s.clock;const alpha=snowTrackAlpha(point,clock);s=updateSnowTracks(owner,[{id:'you',x:20,y:0}],5000,{paused:true});assert.equal(s.clock,clock);assert.equal(snowTrackAlpha(point,s.clock),alpha);
 assert.equal(snowTrackAlpha(point,point.born+4000),.36);assert.ok(snowTrackAlpha(point,point.born+5000)<.36);assert.equal(snowTrackAlpha(point,point.born+6000),0);
 for(let i=1;i<=61;i++)s=updateSnowTracks(owner,[{id:'you',x:20,y:0}],5000+i*100);assert.equal(s.points.length,0);
});
test('teleports, biome changes and disabled effects never leave a long trail',()=>{const owner={};updateSnowTracks(owner,[{id:'you',x:0,y:0}],0);let s=updateSnowTracks(owner,[{id:'you',x:800,y:0}],100);assert.equal(s.points.length,0);s=updateSnowTracks(owner,[{id:'you',x:820,y:0}],200);assert.ok(s.points.length);s=updateSnowTracks(owner,[],300,{active:false});assert.equal(s.points.length,0);assert.equal(s.actors.size,0);});
test('requested TH lamp bases stay on existing blocked margins, not on walkable routes',()=>{assert.equal(TH_ATMOS_LAMPS.length,2);for(const p of TH_ATMOS_LAMPS){assert.equal(townFloorAt(p.x,p.y),false);assert.ok(p.w>20&&p.w<70);}});
test('cinematic camera shares one invertible projection with raster, actors and pointer at all zoom levels',()=>{for(const [W,H]of [[390,844],[1280,720],[2560,1440]])for(const zoom of [1,1.5,2]){const p=[.54,.61],c=frontierCameraTarget(W,H,p,false,zoom),sx=c.x+p[0]*FRONTIER_WORLD.w*c.scale,sy=c.y+p[1]*FRONTIER_WORLD.h*c.scale;assert.ok(Math.abs((sx-c.x)/(FRONTIER_WORLD.w*c.scale)-p[0])<1e-10);assert.ok(Math.abs((sy-c.y)/(FRONTIER_WORLD.h*c.scale)-p[1])<1e-10);assert.ok(c.scale>=FRONTIER_CINEMATIC.scale);assert.ok(c.x+FRONTIER_WORLD.w*c.scale>=W-1e-6);}});
test('both actual scene builders mount the shared effect and foreground route data stays enabled',async()=>{const ui=readFileSync('src/ui.js','utf8');assert.match(ui,/mountSceneAtmosphere\(hud,\{zone:g.zone,context:'trial'/);assert.match(ui,/mountSceneAtmosphere\(stage,\{zone:g.zone,context:'battle'/);const {ROUTE_FOREGROUND}=await import('../src/route-occlusion.js');for(const route of ['asia:west','west:cyberhell'])assert.ok(ROUTE_FOREGROUND[route].length>0);});

test('dialog profiles retain zone3 fog/snow and zone4 rain/lightning in both mounted contexts',async()=>{
 const {SCENE_EFFECTS}=await import('../src/scene-atmosphere.js');
 assert.deepEqual(SCENE_EFFECTS.west,['cloud','fog','snow']);assert.deepEqual(SCENE_EFFECTS.cyberhell,['cloud','rain','lightning']);
 for(const z of ['th','asia'])for(const effect of ['cloud','leaves','lava'])assert.ok(SCENE_EFFECTS[z].includes(effect));
});
test('lava projection matches centered cover and the42percent trial background anchor',async()=>{
 const {sceneBackgroundBox}=await import('../src/scene-atmosphere.js');
 const box=sceneBackgroundBox(800,800,1600,900,'50% 42%');assert.equal(box.h,800);assert.equal(box.x,(800-box.w)*.5);assert.equal(box.y,0);
 const tall=sceneBackgroundBox(1200,600,900,1600,'50% 42%');assert.equal(tall.w,1200);assert.equal(tall.y,(600-tall.h)*.42);
});
test('Thai leaf motion is bounded and reduced motion creates no particles',async()=>{
 const {drawThaiLeaves}=await import('../src/scene-atmosphere.js');const points=[];const ctx=new Proxy({translate:(x,y)=>points.push([x,y])},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 assert.equal(drawThaiLeaves(ctx,1000,390,844),12);assert.equal(points.length,12);assert.ok(points.every(([x,y])=>x>=0&&x<390&&y>=0&&y<844));const before=JSON.stringify(points);points.length=0;drawThaiLeaves(ctx,2000,390,844);assert.notEqual(JSON.stringify(points),before);points.length=0;assert.equal(drawThaiLeaves(ctx,3000,390,844,true),0);assert.equal(points.length,0);
});

test('cloud shadows use their regional cap and dialog lamps are absent',()=>{
 for(const z of ['th','asia','west','cyberhell'])assert.equal(cloudOpacityForZone(z),z==='th'?.32:.2);
 const source=readFileSync('src/scene-atmosphere.js','utf8');assert.doesNotMatch(source,/props=document.createElement|className='scene-atmosphere-props'/);
});
