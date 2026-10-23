// M3's shipped configuration is tested before the M2 dev-hook tests mutate their own process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ZONE_SKIN, PLANNED_ART, isTownZone, townSkinArt } from '../src/zone-skin.js';
import { createGame } from '../src/game.js';
import { syncSceneZone, SCENE, STATIONS, SPOTS, ZONES } from '../src/data.js';
import { TOWN_ZONE_LAYOUT, townContains } from '../src/town-layout.js?v=k1d';
import { townTitle } from '../src/town-map.js?v=l1';
import { t, setLang } from '../src/i18n.js';
import { harbourTravel } from './helpers/travel.mjs';
globalThis.Image = class {};

test('M3: Asia ships enabled with reviewed sprite groups, no tree tint, and explicit rejected-ground fallback', () => {
  const s=ZONE_SKIN.asia;
  assert.equal(isTownZone('asia'), true);
  assert.deepEqual(s.use, ['judgment','trees','lamp','torch','rock']);
  assert.equal(s.treeTint, false);
  assert.equal(townSkinArt('asia','town-residence-front-one'),null, 'rejected house group falls back to Zone 1');
  assert.deepEqual(s.terrain, ZONE_SKIN.th.terrain);
  assert.equal(s.flowUrl, ZONE_SKIN.th.flowUrl);
  const planned=PLANNED_ART('asia','map-zone2');
  for (const group of s.use) for (const [key,path] of Object.entries(planned[group])) {
    assert.equal(townSkinArt('asia',key),path);
    assert.ok(existsSync(new URL('../'+path,import.meta.url)),path);
  }
  assert.equal(ZONE_SKIN.west.enabled, false);
  assert.equal(ZONE_SKIN.cyberhell.enabled, false);
});

test('M3: Asia retains Zone 1 temporary floor and leaving restores Zone 1 station geometry', () => {
  syncSceneZone('th');
  const geometry=()=>JSON.stringify([STATIONS.map(d=>[d.k,d.bx,d.by,d.bw,d.mapScale,d.x,d.y,d.hit,d.flip]),SPOTS]);
  const layout=geometry();
  const floor=()=>{const out=[];for(let y=0;y<2560;y+=16)for(let x=0;x<3840;x+=16)out.push(townContains(x,y));return out;};
  const baseline=floor();
  syncSceneZone('asia');
  assert.deepEqual([SCENE.w,SCENE.h],[3840,2560]);
  assert.equal(TOWN_ZONE_LAYOUT.asia.walkRuns,null);
  assert.deepEqual(floor(),baseline);
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
  assert.match(html,/zone-skin\.js\?v=m2-m3-asia/);
  assert.match(html,/town-map\.js\?v=20261022-m2-m3-/);
  assert.match(html,/ui\.js\?v=20261021-m2-m3-/);
});
