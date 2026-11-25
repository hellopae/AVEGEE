import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {FOE_TIER, FOE_MAX_ASPECT, KHUNPHAEN_UNITS, foeUnits, planFoeSize} from '../src/battle-foe-size.js';
import {BATTLE_TRIM, battleTrim, fitAllySizes} from '../src/character-scale.js';
import {FOE_DRAWN_FACING_RIGHT, foeNeedsMirror, foeFaceClass, foeAtlasFace, ATLAS_IDLE_DRAWN_FACING_RIGHT} from '../src/battle-facing.js';
import {planBattleFormation} from '../src/battle-formation.js';

// FB3-T2 (owner 26 Nov): size of the enemies (BT2), the standing eyes (BT3), Yama in front (BT6), Boon / the lying Plerng (BT7), the way enemies face (EV2 EV12 EV13).
const root = new URL('..', import.meta.url).pathname;
const read = f => readFileSync(join(root, f), 'utf8');

test('BT2: an ordinary soul is never more than 10 % taller than Boon, ghosts the same, demons a little bigger, bosses bigger again, nothing but the giants reaches 2x', () => {
  const boon = BATTLE_TRIM.boon;                       // Boon is the reference (Kan = 1.0)
  for (const f of ['img/spirit4.webp', 'img/Thai/spirit-clerk-th-v2.webp', 'img/Asia/spirit-worker-asia-v2.webp', 'img/soul-poses/clerk-th-cry-v1.webp', 'img/z4-events/col-s1.webp', 'img/mob-pret.webp', 'img/mob-tanee.webp'])
    assert.ok(foeUnits(f) <= boon * 1.10 + 1e-9, `${f} ${foeUnits(f)} must stay within 10 % of Boon`);
  assert.ok(foeUnits('img/mob-werewolf.webp') > foeUnits('img/mob-pret.webp') && foeUnits('img/mob-werewolf.webp') <= 1.3, 'demons: a little bigger');
  for (const f of ['img/boss-frontier-th.webp', 'img/Asia/boss-tester-asia.webp', 'img/Boss Zone1.webp', 'img/hero-boss.webp', 'img/leader-th-possessed.webp', 'img/z1-events/boss-hanuman-th.webp'])
    assert.ok(foeUnits(f) >= 1.6 && foeUnits(f) <= 1.9, `${f} ${foeUnits(f)}: a boss, not a wall`);
  for (const f of ['img/z2-events/boss-ryujin-asia.webp', 'img/z3-events/boss-jormungandr-west.webp']) assert.equal(foeUnits(f), FOE_TIER.giant);
  assert.equal(foeUnits('img/z3-events/boss-cerberus-west.webp'), FOE_TIER.boss, 'the three-headed hound is wide: the boss tier is already as wide as it was');
  assert.ok(Math.max(...Object.values(FOE_TIER)) <= 2.0);
  assert.equal(foeUnits('img/never-heard-of-it.webp'), FOE_TIER.ghost, 'an unknown picture is a ghost, never a boss');
  assert.equal(foeUnits('img/never-heard-of-it.webp', {boss:true}), FOE_TIER.boss, 'unless the fight says it is a boss');
  assert.equal(foeUnits('img/West/crew-boon-west-f.webp'), FOE_TIER.human * boon, 'a hypnotised Boon keeps the height he has on our side');
});
test('BT2: planFoeSize gives the VISIBLE part the tier height, caps wide pictures, and never divides by nothing', () => {
  const p = planFoeSize({box:{w:.4, h:.8}, aspect:.75, adultVis:100, units:1});
  assert.ok(Math.abs(p.visH - 100) < 1e-9 && Math.abs(p.h * .8 - 100) < 1e-9 && Math.abs(p.w - p.h * .75) < 1e-9);
  const wide = planFoeSize({box:{w:.9, h:.3}, aspect:2, adultVis:100, units:1});       // a long floating head: 0.9*2/0.3 = 6x wider than tall
  assert.ok(wide.visH < 100 && Math.abs(wide.h * .3 * 1 - wide.visH) < 1e-9);
  assert.ok(Math.abs(wide.w * .9 - 100 * FOE_MAX_ASPECT) < 1e-6, 'visible width capped at 1.5 x the tier height');
  const room = planFoeSize({box:{w:.5, h:.5}, aspect:1, adultVis:100, units:1.5, roomW:60});
  assert.ok(room.w * .5 <= 60 + 1e-9, 'never wider than the room the foe has in a group');
  for (const bad of [{box:null}, {box:{w:0, h:.5}}, {box:{w:.5, h:.5}, aspect:0}, {box:{w:.5, h:.5}, aspect:1, adultVis:0}])
    assert.equal(planFoeSize({adultVis:100, units:1, aspect:1, ...bad}), null);
});
test('EV12: Khun Phaen is as tall as Boon or Kan within 5 %', () => {
  const boon = BATTLE_TRIM.boon, kan = 1;
  assert.equal(foeUnits('img/z1-events/boss-khunphaen-th.webp', {boss:true}), KHUNPHAEN_UNITS);
  for (const ref of [boon, kan]) assert.ok(Math.abs(KHUNPHAEN_UNITS / ref - 1) <= .05, `${KHUNPHAEN_UNITS} vs ${ref}`);
});
test('BT7: Boon is trimmed on the battle stage only; the other teammates and the map keep their sizes', () => {
  assert.equal(battleTrim('boon'), .93); assert.equal(battleTrim('crew-boon'), .93); assert.equal(battleTrim('th:boon'), .93);
  for (const k of ['kan', 'taan', 'dam', 'plerng', 'nira', 'guard', 'you', 'yama']) assert.equal(battleTrim(k), 1, k);
  const box = {l:.1, t:.04, w:.5, h:.8}, order = ['kan', 'boon', 'yama'], slots = planBattleFormation(3, 1792, 1120);
  const s = fitAllySizes(260, order.map(key => ({key, box, aspect:1})), slots, {width:1792, height:1120});
  assert.ok(Math.abs(s[1].h / s[0].h - .93) < 1e-9);
  assert.match(read('src/character-scale.js'), /CHARACTER_SCALE = Object\.freeze\(\{yama:\.80, adult:1, nira:\.95, guard:1\.25, worker:1\}\)/, 'the map sizes are untouched');
});
test('BT7: every lying picture is shown KO_SCALE (1.2) bigger than the standing figure it belongs to', () => {
  const m = JSON.parse(read('img/combat-animation-v1/manifest.json')).sprites;
  const standing = k => k.replace(/:ko$/, '').replace(/^crew:([a-z]+):nira$/, 'nira:$1');
  let n = 0;
  for (const [k, rec] of Object.entries(m)) {
    if (!k.endsWith(':ko')) continue;
    n++; assert.equal(rec.bodyHeight, Math.round(m[standing(k)].bodyHeight / 1.2), k);
  }
  assert.equal(n, 32);
});
test('BT6: Yama is drawn above every teammate - also while a teammate has stepped out for the turn', () => {
  const src = read('src/battle-scale.js');
  assert.match(src, /const z = root\.classList\.contains\('cam-lit'\) \? 40 : key === 'you' \? 31 : active \? 30 : e\.depth;/);
  assert.match(src, /'z-index':String\(z\)/);
  for (const n of [3, 4, 5, 6, 7]) for (const s of planBattleFormation(n - 1, 1792, 1120)) assert.ok(s.depth < 30, 'no formation depth reaches the stepped-out value');
});
test('EV2 EV12 EV13: the enemies drawn facing right are mirrored to face the team; the ones drawn facing left or at us are not', () => {
  for (const f of ['img/z1-events/boss-hanuman-th.webp', 'img/z1-events/boss-khunphaen-th.webp', 'img/z2-events/boss-ryujin-asia.webp', 'img/Asia/boss-tester-asia.webp', 'img/CyberHell/boss-frontier-cyberhell.webp',
    'img/z3-events/boss-loki-west.webp', 'img/Asia/mob-kasha-asia.webp', 'img/CyberHell/mob-worm-cyberhell.webp', 'img/z4-events/col-s1.webp', 'img/z4-events/col-s9.webp', 'img/Thai/spirit-business-th-v2.webp', 'img/Asia/spirit-business-asia-v2.webp']) {
    assert.equal(foeNeedsMirror(f), true, f); assert.equal(foeFaceClass(f), 'face-flip', f);
  }
  for (const f of ['img/mob-werewolf.webp', 'img/mob-pop.webp', 'img/West/boss-frontier-west.webp', 'img/z3-events/boss-cerberus-west.webp', 'img/z3-events/boss-jormungandr-west.webp', 'img/Thai/spirit-girl-th-v2.webp'])
    assert.equal(foeNeedsMirror(f), false, f);
  for (const k of FOE_DRAWN_FACING_RIGHT) assert.match(k, /^(mob-|spirit-|boss-|col-s|crew-)/, k);
  assert.equal(foeNeedsMirror('img/West/crew-taan-west.webp'), true, 'a hypnotised teammate drawn facing right is mirrored on the enemy side');
});
test('EV13: a boss sheet whose standing frames face right is mirrored for the standing pose only', () => {
  assert.ok(ATLAS_IDLE_DRAWN_FACING_RIGHT.has('boss:cyberhell:boss-frontier'));
  assert.equal(foeAtlasFace('boss:cyberhell:boss-frontier', 'idle'), -1);
  assert.equal(foeAtlasFace('boss:cyberhell:boss-frontier', 'attack'), 1);
  assert.equal(foeAtlasFace('boss:cyberhell:boss-frontier', 'hurt'), 1);
  assert.equal(foeAtlasFace('boss:th:boss-frontier', 'idle'), 1);
  assert.equal(foeAtlasFace('crew:west:taan', 'idle'), -1);
  assert.match(read('src/ui.js'), /face:foeAtlasFace\(key,mode\)/);
});
test('BT3: in the standing-with-book sheet of every zone the sideways-glance frame has the eyes of the neutral frame', () => {
  const r = spawnSync('python3', ['-I', '-c', `
from PIL import Image
import numpy as np, sys
bad=[]
for z in ['th','asia','west','cyberhell']:
    a=np.array(Image.open('${root}img/yama-animation-v1/'+z+'/book-idle.webp').convert('RGBA')).astype(int)
    f0=a[0:480,0:320]; f1=a[0:480,320:640]
    box={'th':(100,250,192,290),'asia':(104,240,190,280),'west':(100,240,190,278),'cyberhell':(95,235,200,285)}[z]
    x0,y0,x1,y1=box
    if (np.abs(f0[y0:y1,x0:x1]-f1[y0:y1,x0:x1]).sum(axis=2)>30).sum()>0: bad.append(z)
print(','.join(bad) or 'ok')`], {encoding:'utf8'});
  assert.equal(r.stdout.trim(), 'ok', r.stderr);
});
test('FB3-T2: the files that changed carry a fresh cache tag in the import map, and the new module is imported by the battle fit', () => {
  const html = read('index.html');
  for (const f of ['battle-scale.js', 'battle-facing.js', 'character-scale.js', 'ui.js', 'combat-sprites.js', 'battle-fx.js']) assert.match(html, new RegExp(`"\\./src/${f.replace('.', '\\.')}\\?v=[^"]*fb3t2"`), f);
  assert.match(read('src/battle-scale.js'), /from '\.\/battle-foe-size\.js'/);
  assert.match(read('src/battle-scale.js'), /applyFoeSizes\(stage, adultVis, sr, foeMeasured\)/);
});
