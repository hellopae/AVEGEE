// M3's shipped configuration is tested before the M2 dev-hook tests mutate their own process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ZONE_SKIN, PLANNED_ART, isTownZone, townSkinArt } from '../src/zone-skin.js';
import { createGame } from '../src/game.js';
import { syncSceneZone, SCENE, STATIONS, SPOTS, ZONES } from '../src/data.js';
import { TOWN_ZONE_LAYOUT, townContains } from '../src/town-layout.js?v=k1d';
import { townChunkUrl, townTerrainGrid } from '../src/town-terrain.js?v=k1d';
import { townTitle } from '../src/town-map.js?v=l1';
import { t, setLang } from '../src/i18n.js';
import { harbourTravel } from './helpers/travel.mjs';
globalThis.Image = class {};

test('M3b: Asia ships its own terrain and flow without Zone 1 repairs or tree tint', () => {
  const s=ZONE_SKIN.asia;
  assert.equal(isTownZone('asia'), true);
  assert.deepEqual(s.use, ['judgment','houses','trees','lamp','torch','rock']);
  assert.equal(s.treeTint, false);
  assert.deepEqual(s.terrain, {
    dir:'img/map-zone2/v2/', preview:'img/map-zone2/v2/zone2-terrain-v2-preview.webp',
    fullPx:{w:4915,h:3277}, chunk:1024, repairs:false,
  });
  assert.equal(s.flowUrl, 'img/map-zone2/v2/flow-v2.png', 'flow belongs to the registered Asia repaint');
  assert.ok(existsSync(new URL('../'+s.flowUrl,import.meta.url)));
  assert.ok(existsSync(new URL('../'+s.terrain.preview,import.meta.url)));
  const grid=townTerrainGrid('asia');
  assert.deepEqual([grid.cols,grid.rows],[5,4]);
  for (let r=1;r<=grid.rows;r++) for (let c=1;c<=grid.cols;c++) {
    const url=townChunkUrl(r,c,'asia');
    assert.equal(url,`img/map-zone2/v2/r${r}-c${c}.webp`);
    assert.ok(existsSync(new URL('../'+url,import.meta.url)),url);
  }
  assert.equal(ZONE_SKIN.th.terrain.dir,'img/map-zone1/v5/');
  assert.equal(ZONE_SKIN.th.terrain.repairs,true);
  assert.equal(ZONE_SKIN.th.flowUrl,'img/map-zone1/v4/flow-v4.png');
  assert.equal(ZONE_SKIN.th.treeTint,true);
  const planned=PLANNED_ART('asia','map-zone2');
  for (const group of s.use) for (const [key,path] of Object.entries(planned[group])) {
    assert.equal(townSkinArt('asia',key),path);
    if (!['town-tree-sakura','town-tree-willow'].includes(key)) assert.ok(existsSync(new URL('../'+path,import.meta.url)),path);
  }
  assert.equal(ZONE_SKIN.west.enabled, true);
  assert.equal(ZONE_SKIN.cyberhell.enabled, false);
});

test('M3: Asia uses owner floor and leaving restores Zone 1 station geometry', () => {
  syncSceneZone('th');
  const geometry=()=>JSON.stringify([STATIONS.map(d=>[d.k,d.bx,d.by,d.bw,d.mapScale,d.x,d.y,d.hit,d.flip]),SPOTS]);
  const layout=geometry();
  const floor=()=>{const out=[];for(let y=0;y<2560;y+=16)for(let x=0;x<3840;x+=16)out.push(townContains(x,y));return out;};
  const baseline=floor();
  syncSceneZone('asia');
  assert.deepEqual([SCENE.w,SCENE.h],[3840,2560]);
  assert.ok(TOWN_ZONE_LAYOUT.asia.walkRuns.length>0);
  assert.equal(TOWN_ZONE_LAYOUT.asia.patches,false);
  assert.notDeepEqual(floor(),baseline);
  syncSceneZone('th');
  assert.equal(geometry(),layout);
  assert.deepEqual(floor(),baseline);
});

test('M3: an old Asia save migrates once with the production skin and preserves progress', () => {
  const g=createGame();assert.equal(harbourTravel(g,'asia'),true);
  g.coin=777;g.player.x=1200;g.player.y=600;
  const saved=JSON.parse(JSON.stringify(g.snapshot()));delete saved.townSkinMigrated;
  const r=createGame();assert.equal(r.restore(saved),true);
  assert.equal(r.zone,'asia');assert.equal(r.coin,777);assert.equal(r.townSkinMigrated.asia,true);
  assert.notDeepEqual([r.player.x,r.player.y],[1200,600]);
  assert.equal(townContains(r.player.x,r.player.y),true);
  const again=createGame();assert.equal(again.restore(JSON.parse(JSON.stringify(r.snapshot()))),true);
  assert.deepEqual([again.player.x,again.player.y],[r.player.x,r.player.y]);
  assert.equal(harbourTravel(again,'th'),true);
  syncSceneZone('th');
});

test('M3: title uses existing town copy in Zone 1 and the legacy Asia label without inventing copy', () => {
  globalThis.document={documentElement:{}};
  for (const lang of ['th','en']) {
    setLang(lang);
    assert.equal(townTitle('th','unused'),t('town.title'));
    assert.equal(townTitle('asia',ZONES.find(z=>z.k==='asia').name),'โซนบูรพา');
  }
  setLang('th');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/zone-skin\.js\?v=m2-m3b-asia/);
  assert.match(html,/town-map\.js\?v=20261022-m2-m3b-/);
  assert.match(html,/ui\.js\?v=20261021-m2-m3b-/);
});
