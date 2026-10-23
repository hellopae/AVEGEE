import test from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS, STATION_FLIP, syncSceneZone } from '../src/data.js';
import { reviewStationBox, MAP_REVIEW_SIZES } from '../src/map-art-v5.js';

const expected = { th:['krata','dab','tarang','lokan'], asia:['krata'], west:['krata','tea'], cyberhell:['krata'] };
// Effective pre-E1 draw flags: map-v5 ignored def.flip, while lokan/tea used the legacy renderer.
const before = { th:[], asia:['lokan','tea'], west:['tarang'], cyberhell:[] };
const requested = { th:['krata','dab','tarang','lokan'], asia:['lokan','tea','krata'], west:['tarang','krata','tea'], cyberhell:['krata'] };
const station = key => STATIONS.find(d=>d.k===key);

test('E1: one final flip table toggles exactly the eight requested rendered orientations', () => {
  assert.deepEqual(STATION_FLIP, expected);
  let toggled = 0;
  for (const zone of Object.keys(expected)) {
    syncSceneZone(zone);
    for (const d of STATIONS) {
      assert.equal(d.flip, expected[zone].includes(d.k), `${zone}/${d.k}: final flag`);
      const changed = d.flip !== before[zone].includes(d.k);
      assert.equal(changed, requested[zone].includes(d.k), `${zone}/${d.k}: scope`);
      if(changed)toggled++;
      if(MAP_REVIEW_SIZES[d.k]) {
        const b=reviewStationBox(d,{naturalWidth:1240,naturalHeight:1240},zone);
        assert.equal(b.flip,d.flip,`${zone}/${d.k}: renderer obeys table`);
        assert.equal(b.x+b.w/2,d.bx);
        assert.equal(b.y+b.h,d.by);
      }
    }
  }
  assert.equal(toggled,11);
  syncSceneZone('th');
});

test('E1: CyberHell tower moves right, scales 1.3 versus regional art, updates service/hit, and restores every branch', () => {
  syncSceneZone('west');
  const d=station('krajok');
  const geometry=()=>({bx:d.bx,by:d.by,bw:d.bw,x:d.x,y:d.y,hit:[...d.hit],mapScale:d.mapScale});
  const branches=Object.fromEntries(['asia','west','th','unknown'].map(zone => {
    syncSceneZone(zone); return [zone,geometry()];
  }));
  syncSceneZone('west');
  const im={naturalWidth:1240,naturalHeight:1240};
  const old=reviewStationBox({...d,bx:1360,by:650},im,'cyberhell');
  syncSceneZone('cyberhell');
  assert.deepEqual(geometry(),{bx:1540,by:675,bw:156,x:1510,y:685,hit:[1430.8,675+(441-675)*.8,1649.2,675],mapScale:1.04});
  const now=reviewStationBox(d,im,'cyberhell');
  assert.ok(d.bx>1360);
  assert.ok(Math.abs(now.w/old.w-1.3)<1e-12);
  assert.ok(Math.abs(now.h/old.h-1.3)<1e-12);
  assert.ok(d.hit[0]<d.bx && d.hit[2]>d.bx);
  assert.equal(d.hit[3],d.by);
  assert.ok(d.x>=now.x && d.x<=now.x+now.w);
  assert.ok(d.y>=d.by && d.y-d.by<=16,'service corridor exits below building');
  const cyber=geometry();
  syncSceneZone('cyberhell');assert.deepEqual(geometry(),cyber,'no cumulative move/scale');
  for(const zone of ['asia','west','th','unknown']) {
    syncSceneZone(zone);assert.deepEqual(geometry(),branches[zone],`${zone}: restores complete branch geometry`);
    syncSceneZone('cyberhell');assert.deepEqual(geometry(),cyber);
  }
  syncSceneZone('th');
});
