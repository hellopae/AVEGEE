import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crewWalkSheet } from '../src/crew-walk-assets.js';

// Exercise rendering without fetching images or loading a browser canvas.
globalThis.fetch = async () => ({ ok:false });
globalThis.Image = class {
  naturalWidth = 1024;
  naturalHeight = 256;
  set src(value) { this.path = value; queueMicrotask(() => this.onload?.()); }
};
const { artUrl, bindZone, img, drawCrewWalk } = await import('../src/art.js');
const { actorWalkMotion } = await import('../src/scene.js');
let zone = 'th';
bindZone(() => zone);
const crews = ['nira','taan','plerng','dam','kan','boon','guard'];
test('all 28 native PNG sheets exist and every crop stays inside its image', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../img/manifest.json', import.meta.url)));
  for (const z of ['th','asia','west','cyberhell']) for (const key of crews) {
    const sheet = crewWalkSheet(key, z);
    const png = fs.readFileSync(new URL('../' + sheet.src, import.meta.url));
    assert.equal(png.subarray(1,4).toString(), 'PNG');
    const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
    assert.equal(sheet.frames.length, 4);
    assert.ok(manifest.crewWalks[z].includes(sheet.src.slice(4)));
    for (const box of sheet.frames) {
      assert.ok(box.x >= 0 && box.y >= 0 && box.w > 0 && box.h > 0);
      assert.ok(box.x + box.w <= w && box.y + box.h <= h);
    }
  }
});
const makeContext = () => {
  const calls = [];
  return { calls, beginPath(){}, ellipse(){}, fill(){}, save(){}, restore(){},
    translate(...args) { calls.push(['translate', ...args]); },
    scale(...args) { calls.push(['scale', ...args]); },
    drawImage(...args) { calls.push(['drawImage', ...args]); } };
};

test('all seven crew walk assets resolve the current zone before manifest loads', () => {
  for (zone of ['th','asia','west','cyberhell']) for (const key of crews) {
    const sheet = crewWalkSheet(`crew-${key}`, zone);
    assert.equal(artUrl(`crew-${key}-walk`), sheet.src);
    assert.equal(typeof sheet.rightFacing, 'boolean');
    assert.match(sheet.src, /-walk-v2\.png$/);
    if (zone !== 'th') assert.ok(sheet.src.includes(`-${zone}-walk-v2`));
  }
});

test('four crop frames retain the foot anchor, mirror right-facing art and use distance phase', async () => {
  zone = 'th';
  const ctx = makeContext();
  // Standee fallback remains available while the strip loads.
  assert.equal(drawCrewWalk(ctx, 'crew-nira', 50, 100, 80, 0, 1), false);
  await Promise.resolve();
  for (let phase = 0; phase < 4; phase++) {
    ctx.calls.length = 0;
    assert.equal(drawCrewWalk(ctx, 'crew-nira', 50, 100, 80, phase * 14, phase % 2 ? -1 : 1), true);
    const sheet = crewWalkSheet('crew-nira', zone);
    assert.deepEqual(ctx.calls[0], ['translate',50,100 - 80 * sheet.footOffset]);
    assert.deepEqual(ctx.calls[1], ['scale',(phase % 2 ? -1 : 1) * (sheet.rightFacing ? 1 : -1),1]);
    const draw = ctx.calls[2];
    const box = crewWalkSheet('crew-nira', zone).frames?.[phase] || { x:phase * 256, y:0, w:256, h:256 };
    assert.deepEqual(draw.slice(2, 6), [box.x,box.y,box.w,box.h]);
    assert.equal(draw[7], -80 * sheet.heightScale + box.oy * 80 * sheet.heightScale / sheet.frameSize.h);
    assert.equal(draw[9], box.h * (80 * sheet.heightScale / sheet.frameSize.h));
  }
});

test('crew and Guard movement advances only with displacement, preserves direction and stops at rest', () => {
  const actor = { x:0, y:0, face:1, path:[[50,0]] };
  assert.equal(actorWalkMotion(actor, 0, 'th').moving, false);
  assert.equal(actorWalkMotion(actor, 500, 'th').distance, 0);
  actor.x = 8;
  const first = actorWalkMotion(actor, 510, 'th');
  assert.equal(first.distance, 8);
  assert.equal(first.moving, true);
  assert.equal(first.face, 1);
  actor.x = 3;
  const left = actorWalkMotion(actor, 540, 'th');
  assert.equal(left.distance, 13);
  assert.equal(left.face, -1);
  const stopped = actorWalkMotion(actor, 1000, 'th');
  assert.equal(stopped.distance, 13);
  assert.equal(stopped.moving, false);
  actor.x = 900;
  assert.equal(actorWalkMotion(actor, 1010, 'th').moving, false);
  assert.equal(actorWalkMotion(actor, 1020, 'asia').distance, 0);
});

test('escort travel reads its actual timeline position without changing game coordinates', () => {
  const transit = { crew:'boon' };
  assert.equal(actorWalkMotion(transit, 0, 'west', [10,10]).moving, false);
  const moved = actorWalkMotion(transit, 20, 'west', [13,14]);
  assert.equal(moved.distance, 5);
  assert.equal(moved.moving, true);
  assert.equal(transit.x, undefined);
  assert.equal(actorWalkMotion(transit, 500, 'west', [13,14]).moving, false);
});
