// T7b-2/5 - case 15 of Zone 3 (Rae R2 part C section 5): the zone boss moves to case 15; the serpent is fought FIRST (it yields), then Severin; winning plays z3-sev-win -> the ice panels -> z3-sev-collateral;
// helper no. 9 + the journal clue; no boss-guide scenes, no money / robes at this pier (NS-2 cut); HOME-67 waits on the pier, asks for help, joins (`home67Joined`). The walk to Frontier 3-4 is part D (T8).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { ZONES, ZONE_BOSS_AT, SPOTS } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { setLang } from '../src/i18n.js';
import { bossGuideDismissed } from '../src/boss-guides.js';
import * as L from '../src/lamp.js';
import { harbourTravel } from './helpers/travel.mjs';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const west = () => { const g = createGame(); g.bossCleared.asia = true; g.save = () => true; g.onChange = () => {}; g.hpMax = g.hp = 500; g.coin = 5000; assert.equal(harbourTravel(g, 'west'), true);
  g.zoneEvents.west = { westHypnotized:'cleared', westVampireBreach:'cleared', westDevaTest:'cleared', westLoki:'cleared' }; g.storyQueue.length = 0; g.notices.length = 0; return g; };
const drain = g => { for (let i = 0; i < 60 && g.storyQueue.length; i++) g.completeStory(); };
const win = (g, b) => { b.youHp = 99999; for (let i = 0; i < 60 && !b.over; i++) { if (b.pendingWave) { g.advanceZoneEventWave(); continue; } for (const f of b.foes) if (f.hp > 0) { f.hp = 1; f.atk = [0, 0]; } const f = b.foes.find(v => v.hp > 0); if (!f) break; g.selectFoe(f.id); g.battleAct('atk'); } assert.equal(b.over, 'win'); g.endBattle(); };
test('Zone 3 boss: at case 15 (not 10), the serpent first, then Severin; every scene in order; helper no. 9 + ice; no boss-guide, no money; the clue is journaled', () => {
  assert.equal(ZONE_BOSS_AT.west, 15);
  const g = west(); g.giveLamp(); g.notices.length = 0; g.zoneCases.west = 14; g.refreshZoneEvents(); assert.equal(g.bossReady(), false, 'not at case 14');
  g.zoneCases.west = 15; g.bossPending = g.bossReady(); assert.equal(g.bossReady(), true);
  const bossArrive = ZONES.find(z => z.k === 'west').bossArrive; assert.ok(bossArrive.some(l => l.includes('ข้าเป็นคู่แข่งของฮาลวาร์')) && bossArrive.some(l => l.includes('ถ้าอยากรู้ว่าข่าวจริงแค่ไหน')) && bossArrive.some(l => l.includes('หลักประกัน ยอร์มุนกันดร์')), 'z3-sev-open replaces the four lines and keeps the two [เดิม] ones');
  // 1st engagement = the serpent
  const j = g.startZoneBoss('alert'); assert.ok(j, 'the serpent fight starts'); assert.equal(j.kind, 'zoneEvent'); assert.equal(j.eventKey, 'westJorm'); assert.equal(j.foes[0].sp, 'boss-jormungandr-west'); assert.match(j.talk, /ยอร์มุนกันดร์เลื่อนขดช้า ๆ/);
  assert.ok(g.bossReady(), 'the boss state is untouched while the serpent is fought'); win(g, j);
  assert.equal(g.zoneEventStatus('westJorm'), 'cleared'); assert.ok(g.storyQueue.some(s => s.key === 'z3-jorm-yields')); assert.ok(g.notices.includes('z3-jorm-withdraws'), 'N15-4'); drain(g); g.notices.length = 0;
  // 2nd engagement = Severin
  assert.equal(g.bossReady(), true); const b = g.startZoneBoss('alert'); assert.ok(b); assert.equal(b.kind, 'zoneBoss'); assert.match(b.talk, /ข้าตรวจตัวเลขของเจ้าสองรอบแล้ว/); assert.match(b.halfLine, /ยอดยังไม่ปิด/);
  const coin = g.coin; win(g, b);
  const played = []; const cs = g.completeStory.bind(g); g.completeStory = () => { played.push(g.storyQueue[0]?.key); return cs(); }; drain(g);
  assert.deepEqual(played.filter(k => ['z3-sev-win', 'west', 'z3-sev-collateral'].includes(k)), ['z3-sev-win', 'west', 'z3-sev-collateral'], 'yielding -> the ice panels -> the collateral');
  assert.equal(g.abilities.ice, true); assert.ok(!played.some(k => /^boss-guide-west/.test(k)), 'no boss-guide scenes in Zone 3'); assert.ok(g.coin <= coin + 400, 'no 1,200 coins / robes at this pier (NS-2 cut)');
  assert.ok(bossGuideDismissed(g, 'west'), 'Severin has gone with his ship');
  assert.ok(g.notices.includes('lamp-helper-jormungandr'), 'NS-1'); assert.ok(L.SUMMONERS.jormungandr.ready); assert.ok(L.unlockedSummoners(g).includes('jormungandr'));
  assert.ok(g.journalNotes.some(n => n.startsWith('PHANTOM-404: ยอดค้างสามรายการ')));
  // HOME-67
  assert.ok(g.notices.includes('z3-home67-wait'), 'NH-1'); assert.equal(g.home67Waiting(), true); assert.ok(!g.home67Joined);
  Object.assign(g.player, { x:SPOTS.bossPier.x, y:SPOTS.bossPier.y }); assert.equal(g.bossPierCanTalk(), true, 'he can be talked to on the pier');
  assert.equal(g.joinHome67(), true); assert.equal(g.home67Joined, true); assert.ok(g.storyQueue.some(s => s.key === 'z3-home67-join')); assert.ok(g.notices.includes('z3-home67-joined'), 'NH-3'); assert.equal(g.home67Waiting(), false);
  const h = createGame(); h.save = () => true; assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))), true); assert.equal(h.home67Joined, true, 'the flag survives save / load');
});
test('lost fights: the serpent waits (and is fought again), Severin closes his ledger (the serpent is NOT fought again); English on every scene', () => {
  const g = west(); g.zoneCases.west = 15; g.bossPending = g.bossReady();
  const j = g.startZoneBoss('alert'); j.team = []; j.absentActors = []; j.youHp = 1; g.battleAct('atk'); assert.equal(j.over, 'lose'); g.endBattle(); assert.equal(g.zoneEventStatus('westJorm'), 'pending'); assert.ok(g.storyQueue.some(s => s.key === 'z3-jorm-lose'));
  const g2 = west(); g2.zoneCases.west = 15; g2.zoneEvents.west.westJorm = 'cleared'; g2.bossPending = g2.bossReady(); const b = g2.startZoneBoss('alert'); assert.equal(b.kind, 'zoneBoss'); b.team = []; b.youHp = 1; g2.battleAct('atk');
  assert.equal(b.over, 'lose'); g2.endBattle(); assert.ok(g2.storyQueue.some(s => s.key === 'z3-sev-lose')); assert.equal(g2.zoneEventStatus('westJorm'), 'cleared', 'no second serpent fight');
  for (const lang of ['th', 'en']) { setLang(lang); for (const [k, n] of [['z3-sev-open', 4], ['z3-jorm-yields', 2], ['z3-jorm-lose', 1], ['z3-sev-lose', 1], ['z3-sev-win', 3], ['z3-sev-collateral', 2], ['z3-home67-intro', 2], ['z3-home67-join', 1]]) {
    const s = storyOf(k); assert.equal(s.pages.length, n, k); for (const p of s.pages) { assert.ok(p.line && p.title); if (lang === 'en') assert.ok(!/[฀-๿]/.test(p.line + p.title), `${k} English page has no Thai`); } } }
  setLang('th');
});
