// T8b/6 - HOME-67's quest: catch the thief Patch (Rae R2 part D section 9, owner G29): the first talk on the pier after the gift offers the job (NQ-1) -> the strange worker stands beside the canteen -> z4-lupin-catch -> the fight (Yama + Nira + HOME-67)
// -> z4-lupin-win + NQ-2 + NU-1 -> the quest is done and helper no. 12 "The Mask Turns the Beat" is in the lamp (one foe, a light-medium blow, that foe loses its next act). The state is saved; the ending does not close it. TH + EN. No dice in the tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ZONE_EVENTS } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { setLang } from '../src/i18n.js';
import { NOTICES } from '../src/z1-events.js';
import * as L from '../src/lamp.js';
import { Z4L_TALK } from '../src/z4f-lupin.js';
import { zone4, drain } from './helpers/zone4.mjs';
const ev = () => ZONE_EVENTS.cyberhell.find(e => e.k === 'z4Lupin');
test('data: the event, the scenes (TH + EN), the windows NQ-1 / NQ-2 / NU-1 and the talk use Patch’s localized identity; the lamp entry is complete', () => {
  const e = ev(); assert.equal(e.atCases, 999, 'never by the case count'); assert.equal(e.noAlert, true, 'a lost fight must not pop an alert up'); assert.deepEqual(e.winStories, ['z4-lupin-win']); assert.deepEqual(e.winNotices, ['z4-lupin-done']); assert.equal(e.banner.th, 'จับจอมโจร · แพตช์'); assert.equal(e.banner.en, 'Catching the Thief · Patch');
  assert.match(e.lines.start, /^แพตช์: "ข้าขอยืมจังหวะของท่านสักครู่/); assert.match(e.linesEn.half, /Patch: "Keeper of the ledger, I have just learned[\s\S]*HOME-67: "I can guess his next beat/); assert.deepEqual(e.foe.skills.map(m => m.id), ['stealBeat']); assert.equal(e.foe.skills[0].name.en, 'Steal the Beat'); assert.match(e.foe.skills[0].warnText.en, /next turn he steals one person's beat/);
  assert.deepEqual([e.foe.name, e.foe.nameEn], ['แพตช์', 'Patch']);
  for (const lang of ['th', 'en']) { setLang(lang); for (const k of ['z4-lupin-catch', 'z4-lupin-win']) { const s = storyOf(k); assert.equal(s.pages.length, 2, k); for (const p of s.pages) { assert.ok(p.line && p.title); if (lang === 'en') assert.ok(!/[฀-๿]/.test(p.line + p.title), `${k} English page has no Thai`); } } }
  setLang('en'); assert.match(storyOf('z4-lupin-catch').pages[0].line, /Yama, I ask to check three points/); assert.match(storyOf('z4-lupin-catch').pages[1].line, /used to repair the data lines/); setLang('th'); assert.match(storyOf('z4-lupin-catch').pages[0].line, /คุณยมบาทน้อย ผมขอตรวจสามจุด/);
  assert.equal(NOTICES['z4-lupin-take'].en.title, 'The Thief Who Stands Still'); assert.equal(NOTICES['z4-lupin-take'].button, 'รับงาน'); assert.equal(NOTICES['z4-lupin-done'].en.title, 'The Thief Yields'); assert.equal(NOTICES['lamp-helper-lupin'].en.title, 'The Thief Leaves a Mask in the Lamp'); assert.ok(NOTICES['lamp-helper-lupin'].openLamp);
  assert.equal(Z4L_TALK.lines.length, 3); assert.equal(Z4L_TALK.choices[0].th, 'นายไม่ใช่คนงานที่นี่'); assert.equal(Z4L_TALK.choices[1].en, 'Sorry, I was mistaken');
  const s = L.SUMMONERS.lupin; assert.equal(s.ready, true); assert.equal(s.no, 12); assert.equal(s.name.en, 'Patch'); assert.equal(s.move.name.th, 'หน้ากากพลิกจังหวะ'); assert.equal(s.move.name.en, 'The Mask Turns the Beat'); assert.equal(s.move.kind, 'strike'); assert.equal(s.move.stun.target, true); assert.match(s.say.call.th, /ข้ามาแล้ว ขอโทษที่มาแบบไม่ได้รับเชิญ/); assert.match(s.say.end.en, /I take my leave before anyone asks for payment/);
});
test('the quest: offered once after the gift scene; the worker stands there; catch -> fight (Yama + Nira + HOME-67, no Guard) -> win: z4-lupin-win, NQ-2, NU-1, the quest is done; saved; a reload keeps it', () => {
  const g = zone4(); assert.equal(g.lupinOffer(), true); g.home67.gift = false; assert.equal(g.lupinOffer(), false, 'not before the gift scene'); g.home67.gift = true;
  assert.equal(g.lupinWorkerOn(), false); assert.equal(g.startLupinFight(), null, 'no fight before the quest');
  assert.equal(g.takeLupinQuest(), true); assert.ok(g.notices.includes('z4-lupin-take'), 'NQ-1'); assert.equal(g.lupinOffer(), false, 'offered once'); assert.equal(g.lupinWorkerOn(), true); const w = g.lupinWorkerPoint(); assert.ok(Number.isFinite(w.x) && Number.isFinite(w.y));
  const r = zone4(); assert.equal(r.restore(JSON.parse(JSON.stringify(g.snapshot()))), true); assert.equal(r.lupin.phase, 'taken'); assert.equal(r.lupinWorkerOn(), true, 'saved');
  const b = g.startLupinFight(); assert.ok(b && b.expeditionParty && b.home67Guest && !b.guardGuest); const who = g.battleActors(); assert.ok(who.some(a => a.guestGuide && a.name === 'HOME-67')); assert.ok(who.some(a => a.k === 'nira')); assert.ok(!who.some(a => a.k === 'guard'));
  assert.equal(b.foes[0].sp, 'char-lupin'); assert.ok(b.foes[0].boss); assert.match(b.talk, /ข้าขอยืมจังหวะของท่านสักครู่/);
  b.youHp = 99999; for (let i = 0; i < 80 && !b.over; i++) { for (const f of b.foes) if (f.hp > 0) { f.hp = 1; f.atk = [0, 0]; } g.selectFoe(b.foes.find(f => f.hp > 0).id); g.battleAct('atk'); }
  assert.equal(b.over, 'win'); g.endBattle(); assert.equal(g.zoneEventStatus('z4Lupin'), 'cleared'); assert.ok(g.storyQueue.some(s => s.key === 'z4-lupin-win')); assert.ok(g.notices.includes('z4-lupin-done'), 'NQ-2');
  assert.equal(g.lupin.phase, 'taken'); assert.ok(drain(g).includes('z4-lupin-win')); assert.equal(g.lupin.phase, 'done'); assert.equal(g.lupinWorkerOn(), false, 'he is gone'); assert.ok(g.notices.includes('lamp-helper-lupin'), 'NU-1'); assert.ok(L.unlockedSummoners(g).includes('lupin'));
  assert.equal(g.lupinOffer(), false, 'never offered again'); const h = zone4(); h.restore(JSON.parse(JSON.stringify(g.snapshot()))); assert.equal(h.lupin.phase, 'done');
});
test('a lost fight can be tried again (the worker stays); the helper: ONE foe takes the blow and loses its next act, the others do not', () => {
  const g = zone4(); g.takeLupinQuest(); const b = g.startLupinFight(); b.absentActors = g.battleActors().filter(a => a.id !== 'you').map(a => a.id); b.youHp = 1; for (const f of b.foes) f.atk = [90, 99];
  const real = Math.random; Math.random = () => .5; try { for (let i = 0; i < 6 && !b.over; i++) g.battleAct('atk'); } finally { Math.random = real; }
  assert.equal(b.over, 'lose'); g.endBattle(); assert.equal(g.lupinWorkerOn(), true); assert.ok(g.startLupinFight(), 'again');
  // the helper's move in a fight with two foes: only the one it points at is hit and stunned
  const h = zone4(); h.giveLamp(); h.notices = []; h.unlockHelper('lupin'); h.placeHelper(0, 'lupin'); h.zoneEvents.cyberhell.cyberBreach = 'cleared'; h.zoneCases.cyberhell = 7; h.zoneEvents.cyberhell.cyberBreach = 'pending'; h.refreshZoneEvents();
  const fb = h.startZoneEvent('cyberBreach'); assert.ok(fb); assert.ok(fb.foes.length >= 2); for (const f of fb.foes) { f.hp = f.maxHp = 400; f.atk = [0, 0]; f.stun = 0; } const [a, c] = fb.foes; h.selectFoe(c.id);
  const dmg = L.summonDamage(h, 'lupin'); assert.ok(dmg > 0); assert.equal(h.confirmBattleCommand('summon:lupin', 'you'), true);
  assert.equal(c.hp, 400 - dmg, 'the pointed foe took it'); assert.equal(c.stun, 1, 'and loses its next act'); assert.equal(a.hp, 400, 'the other foe was not hit'); assert.equal(a.stun, 0);
});
