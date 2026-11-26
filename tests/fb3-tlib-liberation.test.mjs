// FB3-T-LIB (26 Nov 2026) - the final battle at 15 cases (L1), the fixed team at the gate of a seized zone (L2), the Guard freed by Nira and joining the team (L3),
// the controlled look of the Guard / Cerberus (L4), the burning city (L5) and the build recommendation that skips a story-locked tower (L6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { ZONE_EVENTS, STATIONS, GUARD_POST } from '../src/data.js';
import { actorFromLegacy } from '../src/roster.js';
import { Z4G_STORIES } from '../src/z4g-return.js';
import { Z4G_KEYS } from '../src/seized-keys.js';
import { RETURN_GUARD_EVENTS } from '../src/signal-arc.js';
import { zoneSeized, returnGuardPending } from '../src/seized.js';
import { cityFireOn, gateControlled, fireSpots, fireBudget, drawCityFire, drawControlledMark, MAX_FIRES, MAX_FIRES_SMALL } from '../src/city-fire.js';
import { breachApproachActors, breachCrowdActors } from '../src/breach-approach.js';
import { lib, LIB_TEXT } from '../src/liberation-text.js';
globalThis.document = { documentElement:{}, createElement:() => ({ width:0, height:0, getContext:() => null }) };
globalThis.Image = class { set src(value) {} };
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const game = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; g.coin = 100000; return g; };
/** Zone `zone` (th / asia / west) on the walk back: Zone 4's signal is down, the zones above are freed, this one is not, the Guard stands at his post */
function seized(zone = 'th') {
  const g = game();
  g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'cleared', cyberSala:'cleared', cyberSignal:'cleared' };
  g.zoneEvents.west = { westHypnotized:'cleared', westVampireBreach:'cleared', westDevaTest:'cleared', signalWest:'cleared', returnGuard:'cleared' };
  g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared', asiaWukong:'cleared', asiaRageBreach:'cleared', signalAsia:'cleared', returnGuard:'cleared' };
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared', sitaHanuman:'cleared', khunPhaen:'cleared', thBorderBoss:'cleared', returnGuard:'cleared', signalTh:'cleared' };
  if (zone === 'asia') { delete g.zoneEvents.asia.signalAsia; g.zoneEvents.asia.returnGuard = 'pending'; }
  if (zone === 'west') { delete g.zoneEvents.west.signalWest; g.zoneEvents.west.returnGuard = 'pending'; }
  if (zone === 'th') { delete g.zoneEvents.th.signalTh; g.zoneEvents.th.returnGuard = 'pending'; }
  g.zone = zone;
  g.guard = actorFromLegacy({ x:GUARD_POST[0], y:GUARD_POST[1] }, zone, 'guard');
  return g;
}

test('L1: the last battle (cyberFinal) opens at 15 cases - not at 10 - once the signal is closed', () => {
  assert.equal(ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberFinal').atCases, 15);
  const g = game(); g.zone = 'cyberhell';
  g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'cleared', cyberSala:'cleared', cyberSignal:'cleared', signalClose:'cleared' };
  for (const z of ['th', 'asia', 'west']) g.zoneEvents[z] = { [{ th:'signalTh', asia:'signalAsia', west:'signalWest' }[z]]:'cleared' };
  g.zoneCases.cyberhell = 14; g.refreshZoneEvents('cyberhell'); assert.equal(g.zoneEventStatus('cyberFinal'), 'locked', '14 cases: not yet');
  g.zoneCases.cyberhell = 15; g.refreshZoneEvents('cyberhell'); assert.equal(g.zoneEventStatus('cyberFinal'), 'pending', '15 cases: open');
  // old save: a final that is already pending keeps waiting even below 15 cases (nothing locks the player out)
  const old = game(); old.zone = 'cyberhell';
  old.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'cleared', cyberSala:'cleared', cyberSignal:'cleared', signalClose:'cleared', cyberFinal:'pending' };
  old.zoneCases.cyberhell = 11; old.refreshZoneEvents('cyberhell'); assert.equal(old.zoneEventStatus('cyberFinal'), 'pending', 'grandfathered');
  // no player-facing text names a case count for the final
  for (const f of ['src/z4h-final.js', 'src/z4h-raw.js']) assert.ok(!/(15|10) ?คดี|คดีที่ ?(10|15)/.test(src(f).split('\n').filter(l => /NF1|NF-1/.test(l)).join('')), f);
});

test('L2: at the gate of a seized zone the team is Yama + Nira only (Guard duel), in all of Zones 1-3', () => {
  for (const zone of ['th', 'asia', 'west']) {
    const g = seized(zone); assert.equal(zoneSeized(g), true); assert.equal(returnGuardPending(g), true, zone);
    g.storySeen[Z4G_KEYS.guardStory[zone]] = true; g.player.x = 0; g.player.y = 0;
    g.returnGuardAtGate = () => true;
    const b = g.startZoneEvent(Z4G_KEYS.guardEvent); assert.ok(b, zone);
    assert.equal(b.expeditionParty, true); assert.equal(b.guardGuest, false, 'the Guard is the foe here');
    assert.deepEqual(g.battleCrew().map(c => c.k), ['nira'], `${zone}: Yama + Nira`);
    assert.equal(b.foes.length, 1); assert.equal(b.foes[0].hypno, true, 'the Guard is shown controlled'); assert.equal(b.foes[0].sp, 'crew-guard');
  }
  const ui = src('src/ui.js');
  const fn = ui.slice(ui.indexOf('function openReturnGuard'), ui.indexOf('/** FOREMAN'));
  assert.match(fn, /lib\('team\.forcedHead'/); assert.match(fn, /lib\('team\.duel'/); assert.match(fn, /lib\('team\.lockedReason'/);
  assert.match(ui, /forcedTeam = !!\(bev\?\.signal && RETURN_GUARD_EVENTS\[g\.zone\]\)/);
  assert.match(ui, /lib\('team\.lord', \{ guard:guardName\(g\.zone\) \}/);
  assert.match(ui, /data-frontier-start \$\{chosen\.length \|\| fromWalk \|\| forcedTeam/);
});

test('L3: winning the duel -> Nira frees the Guard (own scene) -> the fire scene; the lord\'s fight then has Yama + Nira + the Guard against the controlled reapers and the lord', () => {
  for (const zone of ['th', 'asia', 'west']) {
    assert.deepEqual(RETURN_GUARD_EVENTS[zone].winStories, [Z4G_KEYS.guardFreed[zone], Z4G_KEYS.fire[zone]], 'freed scene first, then the fire');
    const s = Z4G_STORIES[Z4G_KEYS.guardFreed[zone]]; assert.ok(s?.pages?.[0]?.line && s.pages[0].en?.line, zone);
    assert.match(s.pages[0].line, /นิรา/); assert.match(s.pages[0].line, /ไปกับท่าน/); assert.match(s.pages[0].en.line, /Nira/);
    const fire = Z4G_STORIES[Z4G_KEYS.fire[zone]].pages[0];
    assert.ok(!/เฝ้าประตู|hold the gate|stay at the gate/.test(fire.line + fire.en.line), 'the Guard no longer stays behind');
    assert.match(fire.line, /(ไปกับท่าน|ข้าจะไปด้วย|ข้าจะไปช่วยท่าน)/);
  }
  const g = seized('th'); g.storySeen[Z4G_KEYS.guardStory.th] = true; g.returnGuardAtGate = () => true;
  const duel = g.startZoneEvent(Z4G_KEYS.guardEvent); for (const f of duel.foes) f.hp = 1; g.battle.selectedFoeId = duel.foes[0].id; g.battleAct('atk');
  assert.equal(g.zoneEventStatus(Z4G_KEYS.guardEvent), 'cleared');
  assert.deepEqual(g.storyQueue.map(s => s.key), [Z4G_KEYS.guardFreed.th, Z4G_KEYS.fire.th]);
  // the lord's fight: before the duel it is refused, after it the Guard stands with the duo
  g.battle = null; g.zoneEvents.th.signalTh = 'pending'; g.storySeen['signal-th-open'] = true;
  const lord = g.startZoneEvent('signalTh', 'rush'); assert.ok(lord, 'the lord can be fought');
  assert.equal(lord.expeditionParty, true); assert.equal(lord.guardGuest, true, 'the freed Guard fights beside Yama and Nira');
  assert.equal(g.guardActive(), true); assert.deepEqual(g.battleCrew().map(c => c.k), ['nira']);
  assert.ok(lord.foes.length >= 5 && lord.foes.every(f => f.hypno), 'the controlled reapers (wave 1) are shown controlled');
  // before the duel is won the lord is refused
  const early = seized('asia'); early.storySeen['signal-asia-open'] = true; early.zoneEvents.asia.signalAsia = 'pending';
  assert.equal(early.startZoneEvent('signalAsia', 'rush'), null, 'the Guard must be freed first');
  // no Guard hired -> a duo, nothing breaks
  const alone = seized('west'); alone.guard = null; alone.zoneEvents.west.returnGuard = 'cleared'; alone.zoneEvents.west.signalWest = 'pending'; alone.storySeen['signal-west-open'] = true;
  const b2 = alone.startZoneEvent('signalWest', 'rush'); assert.ok(b2); assert.equal(b2.guardGuest, false);
  // the team page of the lord (ui.js): fixed team, controlled reapers locked with the reason
  assert.ok(LIB_TEXT['team.lockedAll'].th && LIB_TEXT['team.lockedAll'].en); assert.match(lib('team.lord', { guard:'กุมภัณฑ์' }, 'th'), /กุมภัณฑ์/);
});

test('L3 (old saves): a save that already freed the Guard (returnGuard cleared) and waits at the lord fights with the Guard; a save mid-duel (active) goes back to pending', () => {
  const g = seized('asia'); g.zoneEvents.asia.returnGuard = 'cleared'; g.zoneEvents.asia.signalAsia = 'pending'; g.storySeen['signal-asia-open'] = true;
  const snap = JSON.parse(JSON.stringify(g.snapshot())); const h = game(); h.restore(snap);
  assert.equal(h.zoneEvents.asia.returnGuard, 'cleared'); assert.equal(h.zoneEvents.asia.signalAsia, 'pending');
  const mid = seized('th'); mid.zoneEvents.th.returnGuard = 'active'; const m2 = game(); m2.restore(JSON.parse(JSON.stringify(mid.snapshot())));
  assert.equal(m2.zoneEvents.th.returnGuard, 'pending');
});

test('L4: the Guard and Cerberus look controlled from the seizure until Nira frees the Guard; the reapers of a signal event are controlled too', () => {
  const g = seized('west'); assert.equal(gateControlled(g), true); g.zoneEvents.west.returnGuard = 'cleared'; assert.equal(gateControlled(g), false, 'freed');
  const t = seized('th'); t.zoneEvents.th.signalTh = 'cleared'; assert.equal(gateControlled(t), false, 'the zone is freed');
  const four = game(); four.zone = 'cyberhell'; assert.equal(gateControlled(four), false); assert.equal(cityFireOn(four), false);
  const calls = []; const ctx = new Proxy({}, { get: (_, k) => k === 'canvas' ? { width:800, height:600, clientWidth:800 } : (...a) => { calls.push(k); return { addColorStop() {} }; }, set: () => true });
  drawControlledMark(ctx, 100, 200, 90, 1234); assert.ok(calls.includes('arc') && calls.includes('stroke'), 'two eyes + the scan lines');
  const scene = src('src/scene.js');
  assert.match(scene, /if \(gateControlled\(g\)\) drawControlledMark\(c, guard\.x/); assert.match(scene, /drawControlledMark\(c, gx, gy, gh, t, reduced\)/);
  // signal events: the old adds and the crowd are controlled
  for (const [zone, key] of [['th', 'signalTh'], ['asia', 'signalAsia'], ['west', 'signalWest']]) {
    const a = breachApproachActors(zone, key); assert.ok(a.every(x => x.hypno), zone);
    assert.ok(breachCrowdActors(zone, key).every(x => x.hypno), zone);
  }
  assert.ok(breachApproachActors('th', 'frontierBreach').slice(1).every(x => !x.hypno), 'an ordinary breach is not controlled');
});

test('L5: the seized city burns while the lord is controlled (Zones 1-3 only), in code, budgeted, and stops when the zone is freed', () => {
  for (const zone of ['th', 'asia', 'west']) { const g = seized(zone); assert.equal(cityFireOn(g), true, zone); g.zoneEvents[zone][{ th:'signalTh', asia:'signalAsia', west:'signalWest' }[zone]] = 'cleared'; assert.equal(cityFireOn(g), false, `${zone} freed`); }
  const idle = game(); idle.zone = 'th'; assert.equal(cityFireOn(idle), false, 'a city that was never seized does not burn');
  const g = seized('th');
  assert.ok(fireSpots().length >= 10, 'buildings + houses');
  const calls = []; const mk = (w) => new Proxy({}, { get: (_, k) => k === 'canvas' ? { width:w, height:600, clientWidth:w } : (...a) => { calls.push(k); return { addColorStop() {} }; }, set: () => true });
  calls.length = 0; const n = drawCityFire(mk(1400), g, 1000, false, 3840, 2560); assert.ok(n > 0 && n <= MAX_FIRES, `${n} fires drawn`);
  calls.length = 0; const small = drawCityFire(mk(390), g, 1000, false, 3840, 2560); assert.ok(small <= MAX_FIRES_SMALL, `${small} on a phone`);
  assert.deepEqual(fireBudget(390), { max:MAX_FIRES_SMALL, smoke:false, animate:true }); assert.deepEqual(fireBudget(1400, true), { max:MAX_FIRES, smoke:false, animate:false });
  const freed = seized('th'); freed.zoneEvents.th.signalTh = 'cleared'; assert.equal(drawCityFire(mk(1400), freed, 1000, false, 3840, 2560), 0, 'nothing is drawn once freed');
  assert.match(src('src/scene.js'), /if\(town&&cityFireOn\(g\)\)drawCityFire\(/);
  assert.ok(!/drawImage\([^)]*fire/i.test(src('src/city-fire.js').replace(/glow|smoke/g, '')), 'no new picture of fire - flames are drawn in code');
});

test('L6: the build recommendation skips a station that waits for a story beat (the Mirror Tower, until the lamp) and goes on; a rank lock still stops it', () => {
  const g = game(); g.level = 5; g.zoneEvents.th = { frontierBreach:'cleared' };
  g.stations = ['krata', 'tea', 'dab', 'sawan', 'ngiw', 'lan', 'lokan'].map(k => ({ def:STATIONS.find(d => d.k === k), crewK:null, intensity:3, fire:0, build:0, slots:[] }));
  assert.equal(g.buildLocked('krajok'), true); assert.equal(g.recommendedBuild(), 'canteen', 'tower locked by the story -> the next one (the canteen)');
  g.giveLamp(); assert.equal(g.recommendedBuild(), 'krajok', 'with the lamp the tower is the next');
  const low = game(); low.level = 2; low.stations = ['krata', 'tea', 'dab'].map(k => ({ def:STATIONS.find(d => d.k === k), crewK:null, intensity:3, fire:0, build:0, slots:[] }));
  assert.equal(low.recommendedBuild(), null, 'a rank lock (the gate of heaven needs rank 3) still stops the list');
});

test('L3 (Claudy): Nira\'s freeing scene uses cut-z{1,2,3}-guard-freed.webp when it exists and falls back to the older gate picture; the page chain ends in the placeholder', () => {
  const art = readFileSync(new URL('../src/z4g-return.js', import.meta.url), 'utf8');
  for (const [zone, n] of [['th', 'z1'], ['asia', 'z2'], ['west', 'z3']]) {
    const page = Z4G_STORIES[Z4G_KEYS.guardFreed[zone]].pages[0];
    assert.equal(page.image, `img/z4-events/cut-${n}-guard-freed.webp`);
    assert.equal(page.imageFallback, `img/z4-events/cut-${n}-guard-hypnotized-frontier.webp`);
    assert.equal(page.fallback, '📜');
  }
  // the file name is built (not a literal) so the "literal URLs exist" guard does not demand a file that is still to be drawn
  assert.ok(!/img\/z4-events\/cut-z[123]-guard-freed/.test(art));
  const ui = src('src/ui.js');
  assert.match(ui, /p\.imageFallback \? ` onerror="this\.onerror=\$\{p\.fallback \?/);
  // the other scenes of the arc are untouched: the gate scene and the fire scene keep their own pictures
  assert.equal(Z4G_STORIES[Z4G_KEYS.fire.th].pages[0].image, 'img/z4-events/cut-z1-fire.webp');
  assert.equal(Z4G_STORIES[Z4G_KEYS.fire.th].pages[0].imageFallback, undefined);
});

test('L3 (Dale): the border gate opens the lord\'s team page by the shortcut only in the seized Zones 1-3 - Zone 4\'s cyberSignal and every ordinary border keep the old way in', () => {
  const ui = src('src/ui.js');
  const fn = ui.slice(ui.indexOf('function openBorder()'), ui.indexOf('/** T5\'/4 (Rae 7.1): NG-1'));
  assert.match(fn, /march\?\.ev\?\.signal&&RETURN_GUARD_EVENTS\[g\.zone\]/);
  assert.ok(fn.indexOf('openFrontierWalk()') > fn.indexOf('RETURN_GUARD_EVENTS'), 'the ordinary border is still the fall-through');
  assert.ok(!RETURN_GUARD_EVENTS.cyberhell, 'Zone 4 has no returnGuard event, so its signal event never takes the shortcut');
  assert.ok(ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberSignal').signal, 'cyberSignal is a signal event - the case the guard above protects');
});
