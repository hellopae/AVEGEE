// T8b/5 - case 10 of Zone 4 (Rae R2 part D section 6): N10-1 at the 10th judged case (after the Trojan-9 fight) -> go -> z4-reveal (3 pages, HOME-67 speaks the name) -> the AI Scammer Robot (Yama + Nira + WATSON-03; HOME-67 does not fight)
// -> z4-sala-win (2 pages) + NS-10; a lost fight can be tried again. The win opens WATSON-03's quest (t8b-watkin). TH + EN. No dice: foes are set to 1 hp with 0 attack, the lost fight fixes the roll for that one action.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ZONE_EVENTS } from '../src/data.js';
import { BOSS_SKILLS } from '../src/boss-skills-data.js';
import { storyOf } from '../src/story.js';
import { setLang } from '../src/i18n.js';
import { NOTICES } from '../src/z1-events.js';
import { actorFromLegacy, syncRoster } from '../src/roster.js';
import { artUrl } from '../src/art.js';
import { zone4, drain } from './helpers/zone4.mjs';
const ev = () => ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberSala');
const ready = () => { const g = zone4(); g.guard = actorFromLegacy({ x:720, y:890 }, 'cyberhell', 'guard'); syncRoster(g); g.zoneEvents.cyberhell.cyberBreach = 'cleared'; g.zoneCases.cyberhell = 10; g.refreshZoneEvents(); return g; };
test('the event: the 10th case, Rae\'s windows / lines / scenes in TH + EN, the existing PHANTOM-404 drawing and moves + her half-way voice move', () => {
  const e = ev(); assert.equal(e.atCases, 10); assert.deepEqual(e.requires, ['cyberBreach']); assert.equal(e.mode, 'single'); assert.equal(e.openStory, 'z4-reveal'); assert.deepEqual(e.winStories, ['z4-sala-win']); assert.deepEqual(e.winNotices, ['z4-seized']);
  assert.equal(e.title.th, 'ศาลาเก็บบันทึกถูกยึด'); assert.equal(e.title.en, 'The Record Hall Has Been Seized'); assert.equal(e.go.th, 'ไปที่ศาลา'); assert.equal(e.go.en, 'Go to the hall'); assert.equal(e.banner.th, 'ศึกศาลาเก็บบันทึก · AI Scammer Robot'); assert.equal(e.banner.en, 'Record Hall · AI Scammer Robot');
  assert.match(e.lines.start, /^AI Scammer Robot: "ขออภัยในความไม่สะดวก กรุณาหยุดขัดขวางการดำเนินการ"/); assert.match(e.linesEn.start, /Please stop obstructing the process/);
  assert.match(e.lines.half, /ตรวจพบความคลาดเคลื่อน[\s\S]*นิรา: "ท่านคะ ดิฉันเคยถูกสะกดแล้วครั้งหนึ่ง[\s\S]*WATSON-03: "กระผมบันทึกว่าเสียงนี้ไม่มีลมหายใจครับ"/); assert.match(e.linesEn.half, /Switching voice to someone you trust[\s\S]*Nira: "Sir, I have been under a spell once already[\s\S]*this voice carries no breath/);
  assert.equal(e.foe.sp, 'boss-phantom404-cyberhell'); assert.deepEqual(e.foe.skills.map(m => m.id), ['phishingFlood', 'deleteRow', 'voiceLikeLove']); assert.equal(e.foe.skills.slice(0, 2).every((m, i) => m === BOSS_SKILLS.phantom404[i]), true);
  const v = e.foe.skills[2]; assert.equal(v.name.th, 'เสียงที่เหมือนคนรัก'); assert.equal(v.name.en, 'Voice Like One You Love'); assert.match(v.warnText.th, /รอบหน้าผู้ถูกเล็งจะชะงัก/); assert.match(v.warnText.en, /next turn its target will falter/);
  assert.match(artUrl('boss-phantom404-cyberhell'), /^img\/z4-events\/boss-phantom404-cyberhell\.webp$/);
  for (const lang of ['th', 'en']) { setLang(lang); for (const [k, n] of [['z4-reveal', 3], ['z4-sala-win', 2]]) { const s = storyOf(k); assert.equal(s.pages.length, n, k); for (const p of s.pages) { assert.ok(p.line && p.title); if (lang === 'en') assert.ok(!/[฀-๿]/.test(p.line + p.title), `${k} English page has no Thai`); } } }
  setLang('en'); assert.match(storyOf('z4-reveal').pages[1].line, /At the Zone 3 harbour I told you \[PHANTOM-404\] was only a fingerprint/); assert.match(storyOf('z4-reveal').pages[2].line, /raises Lucifer’s Eye/); setLang('th'); assert.match(storyOf('z4-reveal').pages[1].line, /ที่ท่าเรือโซน 3 ผมบอกคุณว่า \[PHANTOM-404\] เป็นแค่ลายนิ้วมือ/);
  const n = NOTICES['z4-seized']; assert.equal(n.en.title, 'Zones 1, 2 and 3 Have Been Seized'); assert.match(n.text, /ท่าเรือทุกแห่งปิด เรือใช้ไม่ได้/);
});
test('the order: not before case 10 / the Trojan-9 fight; then the fight (Yama + Nira + WATSON-03, no HOME-67), the win: z4-sala-win + NS-10, the next thing (WATSON-03\'s quest) opens; HOME-67 stays on the pier', () => {
  const g = zone4(); g.zoneCases.cyberhell = 10; g.refreshZoneEvents(); assert.notEqual(g.zoneEventStatus('cyberSala'), 'pending', 'Trojan-9 is not beaten'); g.zoneEvents.cyberhell.cyberBreach = 'cleared'; g.zoneCases.cyberhell = 9; g.refreshZoneEvents(); assert.notEqual(g.zoneEventStatus('cyberSala'), 'pending', 'not before 10 cases');
  const h = ready(); assert.equal(h.zoneEventStatus('cyberSala'), 'pending');
  const b = h.startZoneEvent('cyberSala'); assert.ok(b && b.expeditionParty && b.guardGuest && !b.home67Guest); const who = h.battleActors(); assert.ok(who.some(a => a.k === 'guard'), 'WATSON-03'); assert.ok(who.some(a => a.k === 'nira')); assert.ok(!who.some(a => a.guestGuide), 'HOME-67 does not fight');
  assert.equal(b.foes.length, 1); assert.ok(b.foes[0].boss); assert.equal(b.foes[0].sp, 'boss-phantom404-cyberhell'); assert.match(b.talk, /ขออภัยในความไม่สะดวก กรุณาหยุดขัดขวางการดำเนินการ/);
  b.youHp = 99999; for (let i = 0; i < 80 && !b.over; i++) { for (const f of b.foes) if (f.hp > 0) { f.hp = 1; f.atk = [0, 0]; } h.selectFoe(b.foes.find(f => f.hp > 0).id); h.battleAct('atk'); }
  assert.equal(b.over, 'win'); h.endBattle(); assert.equal(h.zoneEventStatus('cyberSala'), 'cleared'); assert.ok(h.storyQueue.some(s => s.key === 'z4-sala-win')); assert.ok(h.notices.includes('z4-seized'), 'NS-10'); assert.ok(drain(h).includes('z4-sala-win')); assert.equal(h.home67?.phase, 'harbor');
  h.zoneCases.cyberhell = 12; h.ensureKinCases(); assert.ok(h.queue.some(s => s.case === 'watkin'), 'WATSON-03\'s quest is open now');
});
test('a lost fight can be tried again at no cost (no dice: only Yama is left to be hit and the roll is fixed for that one action)', () => {
  const g = ready(); const b = g.startZoneEvent('cyberSala'); b.absentActors = g.battleActors().filter(a => a.id !== 'you').map(a => a.id); b.youHp = 1; for (const f of b.foes) f.atk = [90, 99];
  const real = Math.random; Math.random = () => .5; try { for (let i = 0; i < 6 && !b.over; i++) g.battleAct('atk'); } finally { Math.random = real; }
  assert.equal(b.over, 'lose'); g.endBattle(); assert.equal(g.zoneEventStatus('cyberSala'), 'pending'); assert.ok(g.startZoneEvent('cyberSala'), 'again');
});

test('R2 requires the necklace before revealing or starting the case-10 fight', () => {
  const g = ready();
  delete g.inventory.luciferEye;
  delete g.zoneEvents.west.colS10;
  g.storySeen['z4-reveal'] = true;
  assert.equal(g.zoneEventMissingItem('cyberSala'), 'luciferEye');
  assert.equal(g.startZoneEvent('cyberSala'), null);
  assert.equal(g.zoneEventStatus('cyberSala'), 'pending');
  const save = structuredClone(g.snapshot());
  assert.equal(g.restore(save), true);
  assert.equal(g.startZoneEvent('cyberSala'), null);
  save.zoneEvents.west.colS10 = 'cleared';
  assert.equal(g.restore(save), true);
  assert.equal(g.inventory.luciferEye, 1);
  assert.equal(g.zoneEventMissingItem('cyberSala'), null);
  assert.ok(g.startZoneEvent('cyberSala'));
  assert.equal(storyOf('z4-reveal').pages[2].image, 'img/z4-events/cut-z4-phantom404-eye-ward.webp');
  assert.equal(storyOf('z4-sala-win').pages[1].image, 'img/z4-events/cut-z4-home67-three-zones-alert.webp');
  assert.doesNotMatch(storyOf('z4-sala-win').pages.map(page => page.line).join(' '), /อาร์คอน|Archon/i);
});
