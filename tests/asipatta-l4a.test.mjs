import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { plantedSwordSources, drawPlantedSwords } from '../src/asipatta-swords.js';
const zones = ['th','asia','west','cyberhell'];
test('L4a: all regional sword variants ship in manifest and zone preload', () => {
  const manifest = JSON.parse(readFileSync('img/manifest.json'));
  const catalog = JSON.parse(readFileSync('img/preload-catalog.json'));
  const registered = [...manifest.critical, ...manifest.rest];
  for (const zone of zones) for (const src of plantedSwordSources(zone)) {
    assert.ok(existsSync(src), src);
    assert.ok(registered.includes(src.slice(4)), src);
    assert.ok(catalog.zones[zone].includes(src), src);
  }
  assert.deepEqual(plantedSwordSources('unknown'), plantedSwordSources('th'));
});
test('L4a: cold/failed images are safe; warm images retain original tips and angles without filters', () => {
  const oldImage = globalThis.Image;
  const images = [];
  globalThis.Image = class { constructor(){ images.push(this); this.complete=false; this.naturalWidth=0; } };
  const calls = [];
  const ctx = Object.fromEntries(['save','restore','translate','rotate','drawImage'].map(k => [k,(...args)=>calls.push([k,...args])]));
  Object.defineProperty(ctx,'filter',{set(){assert.fail('per-frame filter');}});
  try {
    drawPlantedSwords(ctx,100,200,1000,'west');
    assert.equal(calls.length,0);
    images.forEach(im=>Object.assign(im,{complete:true,naturalWidth:100,naturalHeight:500}));
    drawPlantedSwords(ctx,100,200,1000,'west');
    assert.deepEqual(calls.filter(c=>c[0]==='translate'),[['translate',35,205],['translate',165,205]]);
    assert.deepEqual(calls.filter(c=>c[0]==='rotate'),[['rotate',-.22],['rotate',.22]]);
    assert.equal(calls.filter(c=>c[0]==='drawImage').length,2);
    assert.equal(images.length,2,'reuse cached images');
  } finally { globalThis.Image=oldImage; }
});
