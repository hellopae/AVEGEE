// FB3-T5 (26 Nov 2026) - where the challengers stand (owner EV11 / EV20), the border-boss army (EV17), Sita's greyed-out buttons (F1), the Wukong / interrogation facings (F2 / F3),
// the open-air wording of Sita's scenes (F4) and the Mirror Tower that opens with the lamp (F5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { SPOTS, STATIONS, FRONTIER, ZONES, ZONE_EVENTS } from '../src/data.js';
import { TOWN_SPOTS, TOWN_DAIS, TOWN_FRONTIER, townContains } from '../src/town-layout.js';
import { daisBlocks } from '../src/town-dais-geometry.js';
import { waitingEvents, daisFoeSpot, DAIS_FOES, standPoints } from '../src/npc-stand.js';
import { bossWalkEnds, Z1_STORIES, NOTICES, SITA } from '../src/z1-events.js';
import { breachApproachActors, breachCrowdActors, swayPose, BREACH_CROWD_POINTS } from '../src/breach-approach.js';
import { frontierWalkable } from '../src/frontier-navigation.js';
import { foeNeedsMirror, teamNeedsMirror, trialSoulNeedsMirror } from '../src/battle-facing.js';
import { buildLocked, unlockedAtLevel, lockedByEvent, EVENT_UNLOCKS } from '../src/unlocks.js';
import { t } from '../src/i18n.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const game = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; g.coin = 100000; return g; };
const th = (g, states) => { g.zone = 'th'; g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared', ...states }; };

test('EV11 / EV20: Khun Phaen and the elder brother wait ON the judgement dais (left of the throne), every other waiter stays at the pier', () => {
  const g = game();
  th(g, { sitaHanuman:'cleared', khunPhaen:'pending' }); g.eventMapClosed['th:khunPhaen'] = true;
  const spot = daisFoeSpot();
  assert.deepEqual(waitingEvents(g).map(e => [e.key, e.x, e.y]), [['khunPhaen', spot.x, spot.y]]);
  assert.deepEqual(standPoints(g).filter(p => p[0] === spot.x && p[1] === spot.y), [[spot.x, spot.y]], 'he blocks the walk like every standing NPC');
  th(g, { sitaHanuman:'cleared', khunPhaen:'cleared', thBorderBoss:'pending' }); g.eventMapClosed['th:thBorderBoss'] = true;
  assert.deepEqual(waitingEvents(g).map(e => [e.key, e.art, e.x, e.y]), [['thBorderBoss', 'zone-boss', spot.x, spot.y]]);
  // Claudy / owner (26 Nov, round 2): Sita's and Hanuman's scene is on the open-air dais too, so Hanuman waits there as well (not at the pier)
  th(g, { sitaHanuman:'pending' }); g.eventMapClosed['th:sitaHanuman'] = true;
  const h = waitingEvents(g).find(e => e.key === 'sitaHanuman'); assert.ok(h); assert.deepEqual([h.x, h.y], [spot.x, spot.y]);
  assert.deepEqual([...DAIS_FOES], ['sitaHanuman', 'khunPhaen', 'thBorderBoss']);
  // the three never wait together (each needs the one before cleared), so nobody stands on top of anybody
  const req = k => ZONE_EVENTS.th.find(e => e.k === k).requires;
  assert.ok(req('khunPhaen').includes('sitaHanuman') && req('thBorderBoss').includes('khunPhaen') && req('thBorderBoss').includes('sitaHanuman'));
  th(g, { sitaHanuman:'pending', khunPhaen:'pending', thBorderBoss:'pending' }); g.eventMapClosed['th:khunPhaen'] = g.eventMapClosed['th:thBorderBoss'] = true;
  const xs = waitingEvents(g).map(e => e.x); assert.equal(new Set(xs).size, xs.length, 'even if the saved data said so, they would be 64 units apart, not stacked');
  // nothing waits on a dais outside Zone 1
  g.zone = 'asia'; assert.ok(!waitingEvents(g).some(e => DAIS_FOES.includes(e.key)));
});

test('EV11 / EV20: the dais spot is on the painted dais floor, left of the throne, apart from Nira, on the walk mask, and the way up from the frontier gate exists', () => {
  const s = TOWN_SPOTS.daisFoe;
  assert.ok(s.x < TOWN_SPOTS.throne.x && TOWN_SPOTS.throne.x - s.x < TOWN_DAIS.w / 2, 'left of the throne, on the platform');
  assert.ok(s.y > TOWN_SPOTS.throne.y && s.y < TOWN_DAIS.y - 40, 'in front of the throne, behind the stairs');
  assert.ok(Math.hypot(s.x - 1938, s.y - 950) > 100, 'Nira stands on the right (1938,950): no overlap');
  assert.ok(townContains(s.x, s.y), 'a walkable point');
  assert.equal(daisBlocks(s.x, s.y, 'th', TOWN_DAIS), false, 'inside the rails');
  // the walk mask joins the lower border gate to the spot (flood fill over the town mask, 8-unit steps - the browser walks the A* path of the same mask)
  const start = [TOWN_FRONTIER.x, TOWN_FRONTIER.y], seen = new Set(), key = (x, y) => `${x},${y}`, q = [[Math.round(start[0] / 8) * 8, Math.round(start[1] / 8) * 8]];
  assert.ok(townContains(q[0][0], q[0][1]), 'the gate stands on floor');
  seen.add(key(...q[0])); let hit = false;
  for (let i = 0; i < q.length && !hit; i++) {
    const [x, y] = q[i];
    if (Math.hypot(x - s.x, y - s.y) <= 8) hit = true;
    for (const [dx, dy] of [[8, 0], [-8, 0], [0, 8], [0, -8]]) { const nx = x + dx, ny = y + dy; if (!seen.has(key(nx, ny)) && townContains(nx, ny)) { seen.add(key(nx, ny)); q.push([nx, ny]); } }
  }
  assert.ok(hit, 'he can walk in from the lower border gate up onto the dais');
  assert.deepEqual(bossWalkEnds({ x:1, y:2 }, { daisFoe:{ x:7, y:8 }, bossPier:{ x:9, y:9 } }), { from:[1, 2], to:[7, 8] });
});

test('EV20: beginBrotherArrival walks him to the dais (not the pier), keeps him drawn there while the notice is open, and no pre-fight text says "pier"', () => {
  const ui = src('src/ui.js');
  const fn = ui.slice(ui.indexOf('function beginBrotherArrival'), ui.indexOf('/** Z2-EVENTS case 15:'));
  assert.match(fn, /daisFoeSpot\(\)/); assert.ok(!/bossPier/.test(fn), 'no pier in the Zone 1 arrival');
  assert.match(fn, /g\.dismissEventAlert\('thBorderBoss'\)/);
  assert.ok(fn.indexOf("dismissEventAlert('thBorderBoss')") < fn.indexOf('openBossArrive'), 'he is standing on the dais before the window opens');
  assert.match(fn, /setTimeout\(done, duration\)/);
  // Zones 2-4 still walk to the pier
  assert.match(ui.slice(ui.indexOf('function beginBossWalkIn'), ui.indexOf('let bossBridgeTimer')), /SPOTS\.bossPier/);
  // the arrival window (data.js bossArrive) never mentions the pier
  const th1 = ZONES.find(z => z.k === 'th');
  assert.ok(!JSON.stringify([th1.bossArrive, th1.bossArriveEn]).includes('ท่าเรือ'));
});

test('EV17: the border-boss event shows an army - six more figures, three each side of the middle lane, every one walking a beat - and none of it touches the fight', () => {
  for (const [zone, key] of [['th', 'frontierBreach'], ['asia', 'asiaRageBreach'], ['west', 'westVampireBreach'], ['cyberhell', 'cyberBreach']]) {
    const base = breachApproachActors(zone, key); assert.equal(base.length, 3, 'the old three are unchanged');
    assert.ok(base.slice(1).every(a => a.sway && a.sway.ax > 0), `${zone}: the two old adds pace too`);
    assert.equal(base[0].sway, undefined, 'the boss stays put');
    const crowd = breachCrowdActors(zone, key, (x, y) => frontierWalkable(zone, x, y));
    assert.equal(crowd.length, 6, `${zone}: six figures find walkable floor (${crowd.length})`);
    assert.ok(crowd.filter(a => a.x < .5).length === 3 && crowd.filter(a => a.x > .5).length === 3, `${zone}: three each side`);
    assert.ok(crowd.every(a => frontierWalkable(zone, a.x, a.y)), `${zone}: every one stands on floor Yama can walk on`);
    assert.ok(crowd.every(a => Math.abs(a.x - .5) > .1), `${zone}: the middle lane (gate to exit) stays open`);
    assert.ok(crowd.every(a => !a.boss && a.crowd && a.arrived && a.art), `${zone}: display only`);
    assert.equal(new Set([...base, ...crowd].map(a => a.id)).size, base.length + crowd.length, 'unique ids');
    assert.deepEqual(breachCrowdActors(zone, 'prisonBreak'), [], 'not for any other event');
  }
  assert.ok(BREACH_CROWD_POINTS.left.length >= 3 && BREACH_CROWD_POINTS.right.length >= 3, 'spares for a zone whose picture has a prop on a first choice');
  assert.deepEqual(breachCrowdActors('th', 'frontierBreach', () => false), [], 'a point that is not walkable is dropped');
});

test('EV17: swayPose - back and forth along x, a different place at a different time, faces where it goes, stands at the ends, and does not move for reduced motion', () => {
  const a = { x:.5, y:.5, sway:{ ax:.02, ay:.004, period:6000, phase:0 } };
  const xs = [0, 500, 1000, 1500, 2000, 3000, 4500].map(ms => swayPose(a, ms).x);
  assert.ok(Math.max(...xs) - Math.min(...xs) > .02, 'it really travels');
  assert.ok(xs.every(x => Math.abs(x - .5) <= .02 + 1e-9), 'never further than its beat');
  assert.equal(swayPose(a, 100).face, 1); assert.equal(swayPose(a, 4000).face, -1, 'turns with the direction');
  assert.equal(swayPose(a, 100).moving, true); assert.equal(swayPose(a, 1500).moving, false, 'at the end of the beat it stands (cos ~ 0)');
  assert.deepEqual(swayPose(a, 1234, true), { x:.5, y:.5, face:null, moving:false });
  assert.deepEqual(swayPose({ x:.3, y:.3 }, 99), { x:.3, y:.3, face:null, moving:false }, 'a figure without a beat is untouched');
  const fr = src('src/frontier.js');
  assert.match(fr, /swayPose\(en, t, reduced\)/); assert.match(fr, /\[\.\.\.sess\.enemies, \.\.\.crowd\]/);
  assert.match(fr, /\.\.\.crowd\]\.map\(en => \[en\.x, en\.y, rx, ry\]\)/, 'they are in the way like the others');
  assert.ok(!/sess\.enemies = \[?[^;]*crowd/.test(fr), 'the crowd is NOT a fight target and not in the "enemies n/3" count');
});

test('F1: on Sita\'s hearing the Power command and "hold in jail" stay in the room, greyed out and not pressable', () => {
  const ui = src('src/ui.js');
  const jail = ui.match(/<button id="t-jail"[^\n]*\n/)[0];
  assert.match(jail, /\$\{!s\.storyHearing && g\.has\('tarang'\) && g\.jailFree\(\) > 0 \? '' : 'disabled'\}/);
  assert.match(jail, /title="\$\{s\.storyHearing \? STORY_HEARING_LOCKED_NOTE/);
  assert.match(ui, /\{id:'power',label:'พลัง \/ Power',choices:powerChoices,disabled:!!s\.storyHearing,note:/);
  assert.match(ui, /\$\{v\.disabled\?'disabled':''\}\$\{v\.note\?` title="\$\{esc\(v\.note\)\}"`:''\}/);
  assert.ok(!/powerChoices[^\n]*storyHearing \? ''/.test(ui), 'the group is never dropped from the row');
});

test('F2: both Wukong drawings are mirrored on the enemy side (face left); the helper Wukong on our side is untouched', () => {
  for (const f of ['img/z2-events/boss-wukong-asia.webp', 'img/z2-events/boss-wukong-clone-asia.webp', 'img/z2-events/boss-wukong-asia-v2.webp']) assert.equal(foeNeedsMirror(f), true, f);
  assert.equal(teamNeedsMirror('img/summon/battle-wukong.webp'), false, 'T4: drawn facing right, not mirrored');
  assert.equal(foeNeedsMirror('img/summon/battle-wukong.webp'), false);
});

test('F3: the interrogation room mirrors soul-cupdealer-asia and spirit-boy-west, and leaves soul-admin-cyber alone', () => {
  assert.equal(trialSoulNeedsMirror('img/z2-events/soul-cupdealer-asia.webp'), true);
  assert.equal(trialSoulNeedsMirror('img/West/spirit-boy-west-v2.webp'), true);
  assert.equal(trialSoulNeedsMirror('img/z1-events/soul-admin-cyber.webp'), false);
  assert.equal(foeNeedsMirror('img/West/spirit-boy-west-v2.webp'), false, 'only the room changes: the battle picture of the boy was not reported');
});

test('F4: Rae\'s D3 wording is in Sita\'s scenes word for word (open-air dais) and the indoor words are gone', () => {
  const all = JSON.stringify([SITA, Z1_STORIES]) + src('src/z1-events.js');
  for (const line of [
    'แสงสีทองแหวกเมฆดำเหนือแท่นตัดสินลงมา', 'แล้วแสงสีทองก็แหวกเมฆดำเหนือแท่นตัดสินลงมา', 'พื้นแท่นตัดสินสั่นสะเทือน',
    'นางสีดาก้าวออกมายืนคั่นกลาง', 'ประนมมือขอโทษยมบาทน้อยและทุกคนบนแท่นตัดสิน', 'แสงสุดท้ายของเหตุการณ์เหนือแท่นตัดสินจางลง', 'ฝุ่นบนแท่นตัดสินยังไม่ทันตก'])
    assert.ok(all.includes(line), line);
  const z = src('src/z1-events.js');
  assert.equal(z.split('แหวกเมฆดำเหนือแท่นตัดสินลงมา').length - 1, 3, 'L164 L166 L168: three scenes (the third one has "แล้วแสงสีทองก็" in front)');
  assert.equal(z.split('พื้นแท่นตัดสินสั่นสะเทือน').length - 1, 3, 'L231 / L233 / L235');
  for (const old of ['ห้องพิพากษา', 'เพดาน', 'หลังคา', 'กลางโถง']) assert.ok(!z.includes(old), `"${old}" is gone from z1-events.js`);
});

test('F5: the Mirror Tower opens when the lamp is in Yama\'s hands - at any rank - and not by rank alone', () => {
  const g = game();
  assert.equal(g.buildLocked('krajok'), true);
  g.level = 5; assert.equal(g.buildLocked('krajok'), true, 'rank 5 alone does not open it any more');
  g.level = 1; g.coin = 100000;
  assert.equal(g.giveLamp(), true);
  assert.equal(g.buildLocked('krajok'), false, 'the lamp opens it at rank 1');
  assert.equal(g.build('krajok'), true);
  assert.deepEqual(g.notices.filter(n => n.startsWith('lamp-')), ['lamp-received', 'lamp-tower-open'], 'the lamp window, then the tower window');
  // the table: still listed for the order, no longer announced at rank 5
  assert.deepEqual(unlockedAtLevel(5), ['lokan']); assert.equal(lockedByEvent('krajok'), true); assert.equal(lockedByEvent('lokan'), false);
  assert.equal(Object.keys(EVENT_UNLOCKS).join(), 'krajok');
});

test('F5: an old save that already holds the lamp below rank 5 gets the tower at load (and the window once); rank-5 saves and saves that saw it get no window', () => {
  const holder = level => { const g = game(); g.level = level; g.giveLamp(); g.notices = []; return JSON.parse(JSON.stringify(g.snapshot())); };
  const load = save => { const g = game(); g.restore(save); return g; };
  const low = load(holder(2));
  assert.equal(low.buildLocked('krajok'), false, 'open at load');
  assert.deepEqual(low.notices.filter(n => n === 'lamp-tower-open'), ['lamp-tower-open']);
  const seen = holder(2); seen.storySeen = { ...(seen.storySeen || {}), 'notice:lamp-tower-open': true };
  assert.deepEqual(load(seen).notices.filter(n => n === 'lamp-tower-open'), [], 'seen once = never again');
  assert.deepEqual(load(holder(5)).notices.filter(n => n === 'lamp-tower-open'), [], 'it was already open at rank 5');
  const none = game(); none.level = 2; const noLamp = load(JSON.parse(JSON.stringify(none.snapshot())));
  assert.equal(noLamp.buildLocked('krajok'), true); assert.deepEqual(noLamp.notices.filter(n => n === 'lamp-tower-open'), []);
  // a save past Sita's case without the lamp (the old migration) gets both windows
  const past = game(); past.level = 2; past.zoneEvents.th = { sitaHanuman:'cleared' }; const migrated = load(JSON.parse(JSON.stringify(past.snapshot())));
  assert.deepEqual(migrated.notices.filter(n => n.startsWith('lamp-')), ['lamp-received', 'lamp-tower-open']);
});

test('F5: the tower window exists in Thai and English, and nothing the player reads still says the tower waits for rank 5', () => {
  const n = NOTICES['lamp-tower-open'];
  assert.ok(n.title && n.text && n.button && n.en.title && n.en.text && n.en.button);
  assert.match(n.text, /หอส่องกรรม/); assert.match(n.text, /ไฟตะเกียง/);
  assert.equal(t('unlock.towerEvent'), 'เปิดหลังจบคดีนางสีดา');
  const ui = src('src/ui.js');
  assert.ok(!/หอส่องกรรม[^\n]{0,40}ขั้น 5/.test(ui) && !/ขั้น 5[^\n]{0,40}หอส่องกรรม/.test(ui.replace(/ตั้งแต่ขั้น 5 เติมเต็ม/, '')), 'no "tower ... rank 5" left in ui.js');
  for (const f of ['src/scene.js', 'src/town-map.js']) assert.match(src(f), /lockedByEvent\(/);
  assert.match(src('src/ui.js'), /lockedByEvent\(k\)\?t\('unlock\.towerEvent'\)/);
});
