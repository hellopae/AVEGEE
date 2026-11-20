// T8c (Rae R2 part D section 7 · owner D6): after the record hall falls the world is seized - the harbours are locked, Trojan-9 (Zone 4) is controlled, and Yama + Nira walk back through the frontiers 4 -> 3 -> 2 -> 1 on foot:
// Lucifer's one line at the side gate (col-pass), the fire scene on entering each zone (z3-fire z2-fire z1-fire), the controlled lord of the zone fought at its frontier (existing SIG fight), then z*-restored + NR-1; the ships stay unusable until
// the zone is freed; all three freed -> the boat to Zone 4 -> cyber-signal-close. TH + EN. No dice: every foe is set to 1 hp with 0 attack; the walk is the real moveZone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FRONTIER } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { setLang } from '../src/i18n.js';
import { NOTICES } from '../src/z1-events.js';
import { SIGNAL_KEYS, signalStory } from '../src/signal-arc.js';
import { seizedActive, zoneSeized, harbourOpen, walkBackTarget } from '../src/seized.js';
import { harbourDestinations, openDungeonRoutes } from '../src/zone-travel.js';
import { zone4, drain } from './helpers/zone4.mjs';
import { harbourTravel } from './helpers/travel.mjs';
import { createGame } from '../src/game.js';
import { readFileSync } from 'node:fs';
import { pickTalk } from '../src/talk.js';
const win = g => { const b = g.battle; b.youHp = 99999; for (let i = 0; i < 80 && !b.over; i++) { for (const f of b.foes) if (f.hp > 0) { f.hp = 1; f.atk = [0, 0]; } g.selectFoe(b.foes.find(f => f.hp > 0).id); g.battleAct('atk'); if (!b.over && b.pendingWave) g.advanceZoneEventWave(true); } assert.equal(b.over, 'win'); g.endBattle(); g.pendingReward = null; };
/** Zone 4 right after the record hall (case 10) fell */
const seized = () => { const g = zone4(); g.zoneEvents.cyberhell.cyberBreach = 'cleared'; g.zoneEvents.cyberhell.cyberSala = 'cleared'; g.zoneCases.cyberhell = 10; g.refreshZoneEvents(); g.notices = []; g.storyQueue.length = 0;
  g.zoneTravel.visited = { th:true, asia:true, west:true, cyberhell:true }; g.zoneTravel.ports = { th:true, asia:true, west:true, cyberhell:true }; return g; };
const atGate = g => Object.assign(g.player, { x:FRONTIER.x, y:FRONTIER.y, path:null });
const fightLord = g => { g.storySeen[signalStory(SIGNAL_KEYS[g.zone], 'open')] = true; assert.ok(g.startZoneEvent(SIGNAL_KEYS[g.zone], 'call'), `${g.zone}: the controlled lord can be fought`); win(g); };
test('the order starts with the hall: Trojan-9 (cyberSignal) is pending only after case 10 AND the hall, and the world is seized', () => {
  const g = zone4(); g.zoneEvents.cyberhell.cyberBreach = 'cleared'; g.zoneCases.cyberhell = 7; g.refreshZoneEvents(); assert.equal(g.zoneEventStatus('cyberSignal'), 'locked', 'no longer right after his own fight at 7 cases'); assert.equal(seizedActive(g), false);
  g.zoneCases.cyberhell = 10; g.zoneEvents.cyberhell.cyberSala = 'cleared'; g.refreshZoneEvents(); assert.equal(g.zoneEventStatus('cyberSignal'), 'pending'); assert.equal(seizedActive(g), true);
});
test('D6: every harbour is locked while seized - no boat from Zone 4 or from a zone that is not freed; the walk back is the only way, and only down the chain', () => {
  const g = seized(); assert.deepEqual(harbourDestinations(g), []); assert.equal(harbourTravel(g, 'west'), false, 'no boat');
  assert.equal(walkBackTarget(g), null, 'his own lord is not freed yet'); atGate(g); assert.equal(g.moveZone('west'), false, 'the gate is shut with green light');
  g.storySeen['cyber-signal-open'] = true; fightLord(g); assert.equal(g.zoneEventStatus('cyberSignal'), 'cleared'); assert.equal(walkBackTarget(g), 'west');
  assert.equal(harbourTravel(g, 'west'), false, 'still no boat'); assert.deepEqual(openDungeonRoutes(g), [], 'no way on, only back'); Object.assign(g.player, { x:100, y:100 }); assert.equal(g.walkBackReady('west'), false, 'not at the frontier gate'); assert.equal(g.moveZone('west'), false);
  atGate(g); assert.equal(g.walkBackReady('asia'), false, 'the zone below the next one is not the next'); assert.equal(g.moveZone('asia'), false); assert.equal(g.moveZone('th'), false);
});
test('Trojan-9 is freed: the fight; cyber-signal-win page 1 as it was, page 2 is Rae\'s (the harbours are shut), TH + EN; no restored scene / NR-1 for Zone 4', () => {
  const g = seized(); g.storySeen['cyber-signal-open'] = true; const b = g.startZoneEvent('cyberSignal', 'call'); assert.ok(b); assert.ok(!g.battleActors().some(a => a.guestGuide), 'HOME-67 waits on the pier (the team of these fights is the existing balanced one - Yama + Nira only is the owner\'s to decide, see the report)');
  win(g); const queued = g.storyQueue.map(s => s.key); assert.deepEqual(queued, ['cyber-signal-win']); assert.deepEqual(g.notices, []);
  setLang('th'); const s = storyOf('cyber-signal-win'); assert.equal(s.pages.length, 2); assert.match(s.pages[0].line, /^โทรจัน-9: "\[คำสั่งภายนอกถูกตัดออก\]/); assert.equal(s.pages[1].title, 'ไปทีละโซน (ท่าปิดหมด)'); assert.match(s.pages[1].line, /ท่าทุกแห่งถูกปิดค่ะ เราต้องเดินผ่านชายแดนกลับไปทีละโซน/);
  setLang('en'); const e = storyOf('cyber-signal-win'); assert.equal(e.pages[1].title, 'Zone by Zone (Every Harbour Shut)'); assert.match(e.pages[1].line, /We must walk back through the frontiers, zone by zone/); assert.ok(!/[฀-๿]/.test(e.pages[1].line)); setLang('th');
  assert.ok(!/ท่านจะได้ไม่ต้องเสียเวลาเดินทาง/.test(s.pages[1].line), 'the old "Nira opens every sea route" line is gone');
});
test('the whole way back, in order: 4 -> (Lucifer) -> 3 fire, Valdric, restored + NR-1 -> 2 fire, Akura -> 1 fire, Tanthasura -> all harbours open -> boat to Zone 4 -> cyber-signal-close', () => {
  const g = seized(); g.storySeen['cyber-signal-open'] = true; fightLord(g); drain(g); g.notices = [];
  atGate(g); assert.equal(g.walkBackPrelude('west'), true); assert.deepEqual(g.storyQueue.map(s => s.key), ['col-pass'], 'Lucifer\'s one line before the crossing (not a fight)'); drain(g);
  assert.equal(g.moveZone('west'), true); assert.equal(g.zone, 'west'); assert.deepEqual(g.storyQueue.map(s => s.key).filter(k => k !== 'z3-arrive'), ['z3-fire'], '(z3-arrive is only the first-visit scene of this fresh test world)'); assert.equal(zoneSeized(g), true); assert.equal(g.zoneEventStatus('signalWest'), 'pending'); drain(g);
  const tick = g.tick; g.step(); assert.equal(g.tick, tick, 'a seized zone stands still'); assert.deepEqual(harbourDestinations(g), []);
  assert.equal(walkBackTarget(g), null, 'Valdric is not freed - the gate is shut'); atGate(g); assert.equal(g.moveZone('asia'), false);
  fightLord(g); assert.deepEqual(g.storyQueue.map(s => s.key), ['signal-west-win', 'z3-restored']); assert.deepEqual(g.notices, ['z3-harbour-open'], 'NR-1'); drain(g); g.notices = [];
  assert.deepEqual(openDungeonRoutes(g), [], 'in Zone 3 the frontier is not the way on to Zone 4 while seized'); assert.equal(zoneSeized(g), false); assert.equal(harbourOpen(g, 'west'), true); assert.equal(harbourOpen(g, 'asia'), false); assert.equal(harbourOpen(g, 'cyberhell'), false); assert.equal(walkBackTarget(g), 'asia');
  atGate(g); assert.equal(g.walkBackPrelude('asia'), true); assert.deepEqual(g.storyQueue.map(s => s.key), [], 'Lucifer speaks only at the 3-4 crossing'); assert.equal(g.moveZone('asia'), true); assert.deepEqual(g.storyQueue.map(s => s.key), ['z2-fire']); drain(g);
  assert.equal(g.zoneEventStatus('signalAsia'), 'pending'); fightLord(g); assert.deepEqual(g.storyQueue.map(s => s.key), ['signal-asia-win', 'z2-restored']); assert.deepEqual(g.notices, ['z2-harbour-open']); drain(g); g.notices = [];
  atGate(g); assert.equal(g.moveZone('th'), true); assert.deepEqual(g.storyQueue.map(s => s.key), ['z1-fire']); drain(g); assert.equal(g.zoneEventStatus('signalTh'), 'pending'); fightLord(g);
  assert.deepEqual(g.storyQueue.map(s => s.key), ['signal-th-win', 'z1-restored']); assert.deepEqual(g.notices, ['z1-harbour-open']); drain(g); g.notices = [];
  assert.equal(walkBackTarget(g), null, 'nothing below Zone 1'); assert.equal(harbourOpen(g, 'cyberhell'), true, 'all three freed: every harbour lights'); assert.equal(seizedActive(g), true, 'until the signal is closed in Zone 4');
  assert.equal(harbourTravel(g, 'cyberhell'), true, 'the boat back to Zone 4'); assert.equal(g.zone, 'cyberhell'); assert.ok(g.storyQueue.some(s => s.key === 'cyber-signal-close'), 'back in Zone 4: the signal is closed'); drain(g);
  assert.equal(g.zoneEventStatus('signalClose'), 'cleared'); assert.equal(seizedActive(g), false); assert.equal(harbourDestinations(g).length > 0, true, 'the harbours are the harbours again');
});
test('a zone freed once is never seized again; zones not yet freed stay seized after a save / reload', () => {
  const g = seized(); g.storySeen['cyber-signal-open'] = true; fightLord(g); drain(g); atGate(g); g.moveZone('west'); drain(g);
  const h = createGame(); assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))), true); h.save = () => true; h.onChange = () => {}; h.storyQueue.length = 0; h.notices = [];
  assert.equal(zoneSeized(h), true); fightLord(h); assert.equal(zoneSeized(h), false); assert.equal(zoneSeized(h, 'asia'), true);
});
test('the texts: Rae\'s fire / restored scenes and NR-1 (the zone name in the title), Lucifer\'s line, the controlled reapers\' line - TH + EN, verbatim', () => {
  const need = { 'z3-fire':[1, /ปัจฉิมที่ไหม้/, /ขวาง \.\.\. ไว้ \.\.\. ทุก \.\.\. ทาง/, /The West on Fire/, /Block \.\.\. every \.\.\. road/], 'z2-fire':[1, /บูรพาที่ไหม้/, /กวนอู: "ข้าไม่ได้ยินเสียงนั้น/, /The East on Fire/, /Guan Yu: "I do not hear that voice/], 'z1-fire':[1, /สุวรรณภูมิที่ไหม้/, /กุมภัณฑ์: "ข้า \.\.\. ข้ายังกำกระบองอยู่นะ/, /Suvarnabhumi on Fire/, /Kumphan: "I \.\.\. I am still gripping my club/],
    'z3-restored':[1, /ปัจฉิมตื่นอีกครั้ง/, /ไม่เป็นไรครับ ทุกคนกลับมาแล้ว/, /The West Wakes Again/, /Everyone is back/], 'z2-restored':[1, /บูรพาตื่นอีกครั้ง/, /ข้าไม่ได้บอกว่าข้าเป็นห่วงท่านด้วย/, /The East Wakes Again/, /I did not tell you that I was also worried for you/], 'z1-restored':[1, /สุวรรณภูมิตื่นอีกครั้ง/, /เหลือแต่กลับโซน 4/, /Suvarnabhumi Wakes Again/, /Only the way back to Zone 4 remains/],
    'col-pass':[1, /สังเวียนที่ถูกตัดสาย|ประตูข้างของสังเวียน/, /ลูซิเฟอร์: "สังเวียนข้าถูกตัดสายเหมือนกัน ท่านไปเถิด ข้าถือกติกา ข้าไม่ถูกควบคุม"/, /Arena/, /Lucifer: "My arena's lines were cut as well\. Go on\. I hold to my rules\. I am not controlled\."/] };
  for (const [k, [n, thTitle, thLine, enTitle, enLine]] of Object.entries(need)) { setLang('th'); const s = storyOf(k); assert.equal(s.pages.length, n, k); assert.ok(thTitle.test(s.title + s.pages[0].title), k + ' title'); assert.match(s.pages[0].line, thLine, k);
    setLang('en'); const e = storyOf(k); assert.ok(enTitle.test(e.title + e.pages[0].title), k + ' EN title'); assert.match(e.pages[0].line, enLine, k); assert.ok(!/[฀-๿]/.test(e.pages[0].line + e.pages[0].title), `${k} English page has no Thai`); }
  setLang('th'); assert.equal(NOTICES['z3-harbour-open'].title, 'ท่าเรือปัจฉิมเปิดอีกครั้ง'); assert.equal(NOTICES['z2-harbour-open'].title, 'ท่าเรือบูรพาเปิดอีกครั้ง'); assert.equal(NOTICES['z1-harbour-open'].title, 'ท่าเรือสุวรรณภูมิเปิดอีกครั้ง');
  assert.equal(NOTICES['z3-harbour-open'].en.title, 'The Western Harbour Is Open Again'); assert.equal(NOTICES['z2-harbour-open'].en.title, 'The Eastern Harbour Is Open Again'); assert.equal(NOTICES['z1-harbour-open'].en.title, 'The Suvarnabhumi Harbour Is Open Again');
  assert.equal(NOTICES['z3-harbour-open'].text, 'ท่าเรือของโซนนี้กลับมาใช้ได้ ท่านล่องเรือกลับโซนนี้ได้อีกครั้ง'); assert.equal(NOTICES['z3-harbour-open'].en.button, 'Understood');
});
test('a controlled reaper of a seized zone says only Rae\'s one line when touched (TH + EN); Nira does not; after the zone is freed the reapers talk as usual', () => {
  const g = seized(); g.storySeen['cyber-signal-open'] = true; fightLord(g); drain(g); atGate(g); g.moveZone('west'); drain(g);
  const taan = g.crew.find(c => c.k === 'taan'); assert.ok(taan, 'a reaper stands in Zone 3'); const target = { kind:'crew', key:'taan', name:taan.name, id:'crew:taan' };
  setLang('th'); const th = pickTalk(g, target); assert.equal(th.text, 'ขวาง ... ไว้ ... ทุก ... ทาง'); assert.equal(th.who, taan.name); assert.equal(th.group, 'controlled');
  setLang('en'); assert.equal(pickTalk(g, target).text, 'Block ... every ... road.'); setLang('th');
  const nira = g.crew.find(c => c.k === 'nira'); if (nira) assert.notEqual(pickTalk(g, { kind:'crew', key:'nira', name:nira.name, id:'crew:nira' })?.group, 'controlled');
  fightLord(g); drain(g); assert.notEqual(pickTalk(g, target)?.group, 'controlled', 'freed: normal talk');
});
test('the UI is wired (source check - the browser is not opened here): the frontier exit leads back through walkBackTarget, the harbour says it is locked, the walk back is a journey of its own', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.ok(ui.includes("const back = walkBackTarget(g); if (back) { FW.destroy(); startWalkBack(back); return; }")); assert.ok(ui.includes("startMapJourney(to, 'walk')")); assert.ok(ui.includes("keepBorder=mode==='dungeon'"));
  assert.ok(ui.includes('The harbour has been locked from outside.'));   // T9: Rae's text + Reese's EN assert.ok(ui.includes("const routeOpen = () => openDungeonRoutes(g).length > 0 || !!walkBackTarget(g);"));
});
test('the walk back goes through the same journey object as the boat / dungeon (beginMapTravel mode "walk" -> finishMapTravel): refused away from the gate or out of order, then the zone changes', async () => {
  const { beginMapTravel, finishMapTravel } = await import('../src/map-travel.js');
  const g = seized(); g.storySeen['cyber-signal-open'] = true; fightLord(g); drain(g);
  Object.assign(g.player, { x:100, y:100 }); assert.equal(beginMapTravel(g, 'west', { mode:'walk' }), false, 'not at the gate'); atGate(g);
  assert.equal(beginMapTravel(g, 'asia', { mode:'walk' }), false, 'not the next zone'); assert.equal(beginMapTravel(g, 'west', { mode:'boat' }), false, 'no boat');
  assert.equal(beginMapTravel(g, 'west', { mode:'walk' }), true); assert.equal(finishMapTravel(g), true); assert.equal(g.zone, 'west'); assert.equal(g.mapTravel, null); assert.ok(g.storyQueue.some(s => s.key === 'z3-fire'));
});
test('from the real fights: the Trojan-9 fight -> his field court -> case 10: N10-1 -> the record hall fight -> NS-10 -> only then Trojan-9 (controlled) is pending, the harbours lock', async () => {
  const { bossJusticeActive, bossJusticeCase, releaseBoss } = await import('../src/boss-justice.js');
  const g = zone4(); g.zoneCases.cyberhell = 7; g.refreshZoneEvents(); win(g.startZoneEvent('cyberBreach') && g); assert.ok(bossJusticeActive(g)); assert.notEqual(g.zoneEventStatus('cyberSignal'), 'pending', 'not right after his own fight (moved: T8c)');
  g.zoneCases.cyberhell = 10; g.refreshZoneEvents(); assert.notEqual(g.zoneEventStatus('cyberSala'), 'pending', 'the court sits'); bossJusticeCase(g).phase = 'return'; releaseBoss(g); assert.equal(g.zoneEventStatus('cyberSala'), 'pending');
  assert.equal(seizedActive(g), false); win(g.startZoneEvent('cyberSala') && g); assert.ok(g.notices.includes('z4-seized'), 'NS-10'); assert.equal(g.zoneEventStatus('cyberSala'), 'cleared');
  assert.equal(g.zoneEventStatus('cyberSignal'), 'pending'); assert.equal(seizedActive(g), true); assert.deepEqual(harbourDestinations(g), []);
});
