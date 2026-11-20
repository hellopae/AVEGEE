// T7/2 - Zone 3 case 5 (Rae R2 part C section 2 + owner 19 Nov): freeze scene -> Van Helsing steps in as the guest Guard -> 3 demon waves -> wave 4 = Poena + Noir + Nira + Cerberus (green eyes, fixed) under the spell, Van Helsing untouched
// -> Valdric -> z3-valdric-down + NV-1 (Hypnosis) -> z3-vh-guard + NV-2 (he is the Gate Guard of the West) + N5-5 -> the arena trial (copper pan, heavy) -> punished -> released + N5-6. English on every page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { ZONE_EVENTS, guardName, guardTitle } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { setLang } from '../src/i18n.js';
import { bossJusticeCase, bossJusticeAnswer, interrogateBoss, mirrorBoss, sentenceBoss } from '../src/boss-justice.js';
import { harbourTravel } from './helpers/travel.mjs';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const west = () => { const g = createGame(); g.bossCleared.asia = true; g.save = () => true; g.onChange = () => {}; assert.equal(harbourTravel(g, 'west'), true); return g; };
const drain = g => { for (let i = 0; i < 40 && g.storyQueue.length; i++) g.completeStory(); };
function clearCase0(g) { g.startZoneEvent('westHypnotized'); g.battle.youHp = 99999; for (let n = 0; n < 30 && !g.battle.over; n++) { const f = g.battle.foes.find(v => v.hp > 0); if (!f) break; f.hp = 1; g.selectFoe(f.id); g.battleAct('atk'); } g.endBattle(); drain(g); g.notices.length = 0; }

test('case 5: the order of the whole event, wave by wave, in order', () => {
  const g = west(); clearCase0(g);
  g.zoneCases.west = 5; g.refreshZoneEvents();
  assert.ok(g.storyQueue.some(s => s.key === 'z3-freeze'), 'z3-freeze plays when the spirits stop');
  drain(g);
  assert.equal(guardName('west'), 'แวน เฮลซิง'); assert.equal(guardName('west', 'en'), 'Van Helsing'); assert.equal(guardTitle('west', 'en'), 'Gate Guard of the West');
  assert.equal(g.guard, null, 'no Guard before the event, and he cannot be hired');
  const b = g.startZoneEvent('westVampireBreach'); assert.ok(b);
  assert.ok(g.guard?.breachGuest, 'Van Helsing is the guest Guard of the fight'); assert.match(b.talk, /แวน เฮลซิง/);
  b.youHp = 99999; const waves = [];
  const kill = () => { for (let n = 0; n < 12 && !b.over && !b.pendingWave; n++) { const f = b.foes.find(v => v.hp > 0); if (!f) break; f.hp = 1; f.atk = [0, 0]; g.selectFoe(f.id); g.battleAct('atk'); } };
  for (let guard = 0; guard < 12 && !b.over; guard++) {
    if (b.storyInterlude === 'west-hypnosis') { waves.push('interlude'); assert.ok(b.absentActors.every(id => id !== g.guard.id), 'Van Helsing is never absent (never hypnotized)'); g.completeBattleInterlude(); continue; }
    if (b.pendingWave) { g.advanceZoneEventWave(); continue; }
    waves.push(`${b.wave}:${b.foes.map(f => f.who).join('|')}`);
    if (b.wave === 4) {
      assert.deepEqual(b.foes.map(f => f.sp), ['crew-taan-west', 'crew-dam-west', 'crew-nira-west', 'boss-cerberus-west'], 'wave 4 is the fixed team incl. green-eyed Cerberus');
      assert.ok(b.foes.every(f => /ถูกสะกดจิต/.test(f.who)));
      assert.ok(!b.foes.some(f => /แวน เฮลซิง/.test(f.who)));
    }
    if (b.wave === 5) { assert.ok(b.foes[0].boss); assert.match(b.talk, /ขออภัยล่วงหน้า/); assert.ok(b.halfLine.includes('แวน เฮลซิง')); }
    kill();
  }
  assert.equal(b.over, 'win'); assert.equal(waves.filter(w => /^[123]:/.test(w)).length, 3, 'three demon waves');
  assert.ok(waves.indexOf('interlude') > waves.findIndex(w => w.startsWith('3:')) && waves.findIndex(w => w.startsWith('4:')) > waves.indexOf('interlude'));
  g.endBattle();
  assert.equal(g.abilities.hypno, true); assert.ok(g.guard && !g.guard.breachGuest, 'Van Helsing stays as the Gate Guard of the West');
  const keys = () => g.storyQueue.map(s => s.key);
  assert.ok(keys().indexOf('z3-valdric-down') >= 0 && keys().indexOf('z3-vh-guard') > keys().indexOf('z3-valdric-down'));
  const played = []; const complete = g.completeStory.bind(g); g.completeStory = () => { played.push(g.storyQueue[0]?.key); return complete(); };
  drain(g);
  assert.ok(played.indexOf('z3-vh-guard') > played.indexOf('z3-valdric-down'));
  for (const id of ['z3-hypno-gift', 'z3-vh-guard-notice', 'z3-valdric-to-dais']) assert.ok(g.notices.includes(id), `${id} is waiting`);
  assert.ok(g.journalNotes.some(n => n.startsWith('แวน เฮลซิง:')));
  // the arena trial
  const c = bossJusticeCase(g); assert.ok(c?.arena && c.zone === 'west', 'Valdric is tried in the arena');
  const ans = bossJusticeAnswer(g); assert.equal(ans.station, 'krata'); assert.equal(ans.intensity, 4);
});

test('English on every page of the case-5 scenes · Van Helsing is not a hypnotized foe and wave-4 text exists in both languages', () => {
  for (const lang of ['th', 'en']) {
    setLang(lang);
    for (const [k, n] of [['z3-freeze', 1], ['z3-vh-frontier', 3], ['west-hypnosis', 2], ['z3-valdric-down', 3], ['z3-vh-guard', 3], ['frontier-west-boss-to-dais', 1], ['frontier-west-boss-punished', 1], ['frontier-west-boss-released', 1]]) {
      const s = storyOf(k); assert.equal(s.pages.length, n, k);
      for (const p of s.pages) { assert.ok(p.line && p.title); if (lang === 'en') assert.ok(!/[฀-๿]/.test(p.line + p.title), `${k}: no Thai on an English page`); }
    }
  }
  setLang('en'); assert.match(storyOf('west-hypnosis').pages[0].line, /Cerberus, Guardian of the Western Gate/); setLang('th');
  assert.equal(ZONE_EVENTS.west.find(e => e.k === 'westVampireBreach').atCases, 5);
});

test('item 7: once he guards the western gate Cerberus lunges in Zone 3 frontier fights like a Guard (1-minute wait, never kills); not in waves 1-4 of case 5; not before he guards', () => {
  const g = west(); clearCase0(g); g.zoneCases.west = 5; g.refreshZoneEvents(); drain(g);
  const b = g.startZoneEvent('westVampireBreach'); b.youHp = 99999;
  assert.equal(g.cerberusGuarding(), false); assert.equal(g.cerberusAssistReady(), false, 'before he guards the gate nobody helps');
  g.storySeen['z3gate-cerberus-win'] = true;   // he has bowed and keeps the gate
  assert.equal(b.wave, 1); assert.equal(g.cerberusAssistReady(), false, 'wave 1-3: not yet');
  for (let i = 0; i < 40 && b.wave < 5; i++) { if (b.storyInterlude) { g.completeBattleInterlude(); continue; } if (b.pendingWave) { assert.equal(g.cerberusAssistReady(), false); g.advanceZoneEventWave(); continue; }
    assert.equal(g.cerberusAssistReady(), false, `wave ${b.wave}: not a helper`); for (const f of b.foes) if (f.hp > 0) { f.hp = 1; f.atk = [0, 0]; } const f = b.foes.find(v => v.hp > 0); g.selectFoe(f.id); g.battleAct('atk'); }
  assert.equal(b.wave, 5); const valdric = b.foes[0]; valdric.atk = [0, 0];
  const hp0 = valdric.hp; g.selectFoe(valdric.id); g.battleAct('atk');
  assert.ok(b.cerberusStrike && b.cerberusStrike.foeId === valdric.id, 'Cerberus lunged once at the chosen foe'); assert.ok(valdric.hp < hp0 - b.cerberusStrike.dmg + 1 || b.cerberusStrike.dmg > 0);
  assert.equal(g.cerberusAssistReady(), false, 'the 1-minute wait (the Guard rule)'); const first = b.cerberusStrike.at;
  g.battleAct('atk'); assert.equal(b.cerberusStrike.at, first, 'no second lunge inside the wait');
  assert.equal(g.cerberusAssistReady(b, first + 61000), true, 'ready again after a minute');
  valdric.hp = 1; assert.equal(g.cerberusAssist(b, first + 61000), false, 'a lunge never kills: a foe on 1 hp is left alone');
});
