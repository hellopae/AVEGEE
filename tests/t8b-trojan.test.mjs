// T8b/2 - case 7 of Zone 4 (Rae R2 part D section 4): N7-1 at the 7th judged case -> the walk down -> Trojan-9's old scene -> HOME-67 runs in (z4-troj-run) -> z4-troj-pre -> 4 waves of demons (Yama + Nira + HOME-67 + WATSON-03) -> Trojan-9
// -> z4-wat-join + NV-W -> WATSON-03 stays as the Gate Guard. The lines between the waves, TH + EN. No dice in the tests: the fight is walked through by setting every foe to 1 hp with 0 attack.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ZONE_EVENTS, GUARD_NAMES, guardName } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { setLang, getLang } from '../src/i18n.js';
import { NOTICES, guardUnlocked } from '../src/z1-events.js';
import { zone4, drain } from './helpers/zone4.mjs';
const ev = () => ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberBreach');
const fightAll = (g, b) => { b.youHp = 99999; for (let i = 0; i < 80 && !b.over; i++) { for (const f of b.foes) if (f.hp > 0) { f.hp = 1; f.atk = [0, 0]; } g.selectFoe(b.foes.find(f => f.hp > 0).id); g.battleAct('atk');
  if (!b.over && b.pendingWave) g.advanceZoneEventWave(true); } };
test('the event: the 7th case, 4 waves + the boss row, Rae\'s windows and banners (TH + EN)', () => {
  const e = ev(); assert.equal(e.atCases, 7); assert.deepEqual(e.requires, ['cyberRescue']); assert.equal(e.waves.length, 5); assert.ok(e.bossApart && e.team === 'frontier'); assert.ok(e.waves[4][0].boss); assert.deepEqual(e.winStories, ['z4-wat-join']); assert.deepEqual(e.winNotices, ['z4-wat-guard']);
  assert.equal(e.title.th, 'ปีศาจบุกชายแดนล่าง'); assert.equal(e.title.en, 'Demons at the Lower Frontier'); assert.match(e.alert.th, /ปีศาจจากนอกระบบกำลังเข้าชายแดนโซน 4/); assert.match(e.alert.en, /Walk down to the lower frontier and look/);
  assert.equal(e.banners.th[2], 'ปีศาจฝ่าชายแดน ระลอกที่ 3 · ศึกชายแดนโซน 4'); assert.equal(e.banners.en[0], 'Demons at the frontier, wave 1 · Zone 4 frontier'); assert.equal(e.banner.th, 'ศึกชายแดนโซน 4 · โทรจัน-9'); assert.equal(e.banner.en, 'Zone 4 frontier · Trojan-9');
  assert.equal(GUARD_NAMES.cyberhell.en, 'WATSON-03'); assert.equal(guardName('cyberhell'), 'WATSON-03'); assert.equal(GUARD_NAMES.cyberhell.title.en, 'Gate Guard of the Network Hell');
  for (const lang of ['th', 'en']) { setLang(lang); for (const [k, n] of [['z4-troj-run', 1], ['z4-troj-pre', 1], ['z4-wat-join', 2]]) { const s = storyOf(k); assert.equal(s.pages.length, n, k); for (const p of s.pages) { assert.ok(p.line && p.title); if (lang === 'en') assert.ok(!/[฀-๿]/.test(p.line + p.title), `${k} English page has no Thai`); } } }
  setLang('en'); assert.match(storyOf('z4-troj-pre').pages[0].line, /Gate Guard of the Network Hell WATSON-03, reporting, sir/); assert.match(storyOf('z4-wat-join').pages[1].line, /serves in Yama's name/); setLang('th'); assert.match(storyOf('z4-troj-run').pages[0].line, /ผมมาช่วยครับ ผมเห็นเสียงเตือนบนกระจกจากท่าเรือ/);
  const n = NOTICES['z4-wat-guard']; assert.equal(n.en.title, 'WATSON-03 Keeps the Network Hell for You'); assert.match(n.text, /เวลาพักระหว่างการเรียกคือ 1 นาที/);
});
test('the order: nothing before 7 cases; the 7th -> pending; no Guard hire desk; the fight with HOME-67 + WATSON-03; lines between the waves; the win: z4-wat-join, NV-W, the Guard stays, the journal', () => {
  const g = zone4(); for (const n of [4, 5, 6]) { g.zoneCases.cyberhell = n; g.refreshZoneEvents(); assert.notEqual(g.zoneEventStatus('cyberBreach'), 'pending', `after ${n} cases`); }
  g.zoneCases.cyberhell = 7; g.refreshZoneEvents(); assert.equal(g.zoneEventStatus('cyberBreach'), 'pending'); assert.equal(guardUnlocked(g), false, 'the Guard is not for hire before the fight'); assert.equal(g.guard, null);
  const b = g.startZoneEvent('cyberBreach'); assert.ok(b); assert.ok(b.expeditionParty && b.home67Guest && b.guardGuest, 'the guests of this fight');
  assert.ok(g.battleActors().some(a => a.guestGuide && a.name === 'HOME-67'), 'HOME-67 is on our side'); assert.ok(g.battleActors().some(a => a.k === 'guard'), 'WATSON-03'); assert.ok(g.battleActors().some(a => a.k === 'nira'));
  assert.equal(g.guard.breachGuest, true); assert.equal(b.wave, 1); assert.equal(b.foes[0].sub, 'ปีศาจฝ่าชายแดน ระลอกที่ 1 · ศึกชายแดนโซน 4');
  fightAll(g, b);
  assert.equal(b.over, 'win'); assert.equal(b.wave, 5, 'waves 1-4 then the boss row'); assert.ok(b.foes.some(f => f.boss), 'Trojan-9');
  g.endBattle(); assert.equal(g.zoneEventStatus('cyberBreach'), 'cleared'); assert.ok(g.guard && !g.guard.breachGuest, 'WATSON-03 stays'); assert.equal(guardUnlocked(g), true);
  assert.ok(g.storyQueue.some(s => s.key === 'z4-wat-join')); assert.ok(g.notices.includes('z4-wat-guard'), 'NV-W'); const played = drain(g); assert.ok(played.includes('z4-wat-join'));
  assert.ok(g.journalNotes.some(x => /^WATSON-03: ผู้เฝ้าด่านนรกเครือข่าย พกแผ่นบันทึก/.test(x)), 'journal'); assert.equal(g.home67?.phase, 'harbor', 'HOME-67 is back on the pier (he was only a guest of the fight)');
});
test('between the waves Nira / WATSON-03 speak (Rae 4.3) - the talk line of each wave, TH + EN', () => {
  for (const lang of ['th', 'en']) { setLang(lang); const g = zone4(); g.zoneCases.cyberhell = 7; g.refreshZoneEvents(); const b = g.startZoneEvent('cyberBreach'); const said = [];
    for (let w = 1; w <= 4; w++) { for (const f of b.foes) { f.hp = 0; } b.pendingWave = w + 1; b.over = null; g.advanceZoneEventWave(true); said.push(b.talk); }
    assert.match(said[0], lang === 'th' ? /^นิรา: "ท่านคะ ปีศาจพวกนี้ไม่ได้บุกจากด้านหน้า/ : /^Nira: "Sir, these demons are not attacking from the front/);
    assert.match(said[1], lang === 'th' ? /^WATSON-03: "กระผมบันทึกว่าระลอกนี้แรงกว่าระลอกก่อน/ : /^WATSON-03: "I record that this wave was stronger/);
    assert.match(said[2], lang === 'th' ? /ปีศาจแถวสุดท้ายยังไม่ขยับค่ะ/ : /the last row of demons has not moved/);
    assert.match(said[3], lang === 'th' ? /ฝาท้องม้าไม้เปิดอยู่/ : /The hatch in the wooden horse's belly is open/); }
  setLang('th');
});
test('a lost fight sends the guest Guard back; no dice: only Yama is left to be hit and the roll is fixed for that one action', () => {
  const g = zone4(); g.zoneCases.cyberhell = 7; g.refreshZoneEvents(); const b = g.startZoneEvent('cyberBreach'); assert.ok(g.guard);
  b.absentActors = g.battleActors().filter(a => a.id !== 'you').map(a => a.id); b.youHp = 1; for (const f of b.foes) f.atk = [90, 99];
  const real = Math.random; Math.random = () => .5; try { for (let i = 0; i < 6 && !b.over; i++) g.battleAct('atk'); } finally { Math.random = real; }
  assert.equal(b.over, 'lose'); assert.equal(g.zoneEventStatus('cyberBreach'), 'pending'); assert.equal(g.guard, null, 'he goes back until the fight is won');
});
