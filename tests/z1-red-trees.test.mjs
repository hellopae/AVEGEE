import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { townFloorAt, TOWN_PROP_SITES } from '../src/town-layout.js';
import { groundSpriteShown, groundSpriteLayerDepth } from '../src/town-ground-sprites.js';

const list = JSON.parse(readFileSync(new URL('../img/map-zone1/v7r/sprites.json', import.meta.url), 'utf8'));
const reds = list.filter(s => s.id.startsWith('red-tree-'));

test('ART-INTEGRATE: 12 separate red trees are put back on the v7r ground; they are shown, depth-sorted by the foot, and use the owner\'s existing picture', () => {
  assert.equal(reds.length, 12);
  for (const s of reds) {
    assert.equal(s.layer, 'sort'); assert.equal(s.show, true); assert.ok(groundSpriteShown(s), s.id);
    assert.equal(groundSpriteLayerDepth(s), s.footWorld[1]);
    assert.ok(existsSync(new URL('../img/map-zone1/v7r/' + s.src, import.meta.url)), s.src);
    const [x, y, w, h] = s.rectWorld; assert.ok(Math.abs(y + h - s.footWorld[1]) < .1, 'picture bottom = foot');
    assert.ok(Math.abs(h / w - 313 / 265) < .02, 'picture aspect kept (no stretch)');
  }
});
test('the red trees never cover a path: foot >= 40 units from any walkable cell and >= 60 from an existing prop', () => {
  for (const s of reds) {
    const [fx, fy] = s.footWorld;
    for (let dx = -40; dx <= 40; dx += 4) for (let dy = -40; dy <= 40; dy += 4) if (Math.hypot(dx, dy) < 40) assert.ok(!townFloorAt(fx + dx, fy + dy), `${s.id} walkable at ${dx},${dy}`);
    for (const p of TOWN_PROP_SITES) assert.ok(Math.hypot(p.x - fx, p.y - fy) >= 60, `${s.id} near ${p.id}`);
  }
});
test('the other pilot tree sprites stay hidden (only the red trees carry show:true)', () => {
  for (const s of list.filter(s => s.layer === 'sort' && !s.id.startsWith('red-tree-'))) assert.ok(!groundSpriteShown(s), s.id);
});
