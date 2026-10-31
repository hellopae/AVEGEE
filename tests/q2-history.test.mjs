// Q2 HIST — character history guide unlocks with meeting the character (brief 2026-10-31-avegee-q2-hist)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {CHARACTER_HISTORY, KIN_HISTORY} from '../src/e1-content.js';
import {openHistoryCards, showFamilyNote, headId, cardsFromFoeSprite, noteBattleHistory} from '../src/history-unlock.js';
import {t} from '../src/i18n.js';
globalThis.Image=class {};
const ids=g=>openHistoryCards(g).map(c=>c.id);
const text=(g,id)=>openHistoryCards(g).find(c=>c.id===id)?.text;
const reload=g=>{const h=createGame();assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);return h;};

test('Q2 card titles are reader-facing names: no C-codes, no zone tags, giants use the Q1 names', () => {
  assert.equal(CHARACTER_HISTORY.length, 44);
  assert.equal(new Set(CHARACTER_HISTORY.map(c => c.id)).size, 44, 'every card has a unique id');
  for (const c of CHARACTER_HISTORY) {
    assert.doesNotMatch(c.title, /\bC\d{2}\b/, c.title);
    assert.doesNotMatch(c.title, /\((?:th|asia|west|cyberhell)\)/, c.title);
    assert.doesNotMatch(c.title, /ทวารบาล|Guard/, `${c.id}: giant cards use their given name`);
  }
  const title = id => CHARACTER_HISTORY.find(c => c.id === id).title;
  assert.deepEqual(['th', 'asia', 'west', 'cyberhell'].map(z => title(`guard@${z}`)), ['กุมภัณฑ์', 'เมซุ', 'มูนิน', 'ไฟร์วอลล์']);
  assert.equal(title('crew:taan@th'), 'ทัณฑ์');
  for (const id of Object.keys(KIN_HISTORY)) assert.ok(CHARACTER_HISTORY.some(c => c.id === id), `${id} is a card`);
  for (const c of CHARACTER_HISTORY) for (const n of KIN_HISTORY[c.id]?.needs || []) assert.ok(CHARACTER_HISTORY.some(x => x.id === n), n);
});

test('Q2 a new game shows only the frame, Yama and Nira, with no family note', () => {
  const g = createGame();
  assert.deepEqual(ids(g), ['frame', 'yama', 'nira']);
  assert.equal(showFamilyNote(g), false);
  assert.ok(g.crew.some(c => c.k === 'taan'), 'Taan starts on the team yet stays hidden until met');
});

test('Q2 hiring a crew member or the giant opens their card', () => {
  const g = createGame(); g.coin = 99999;
  assert.equal(g.hire('dam'), true);
  assert.ok(ids(g).includes('crew:dam@th'));
  assert.ok(!ids(g).includes('crew:plerng@th'));
  assert.equal(g.hireGuard(), true);
  assert.ok(ids(g).includes('guard@th'));
  assert.equal(ids(g).includes('guard@asia'), false);
  assert.match(text(g, 'guard@th'), /^กุมภัณฑ์ /);
});

test('Q2 talking to someone (met: flag) opens their card, including the starting Taan', () => {
  const g = createGame();
  g.talk.seen['met:taan@th'] = true;
  assert.ok(ids(g).includes('crew:taan@th'));
  assert.ok(!ids(g).includes('crew:taan@asia'));
});

test('Q2 relatives: no relative name before meeting, name appears once the relative is met', () => {
  const g = createGame();
  g.talk.seen['met:taan@th'] = true;
  const before = text(g, 'crew:taan@th');
  assert.doesNotMatch(before, /ซิสอ็อป|นรกเครือข่าย/);
  assert.match(before, /แดนไกล/);
  assert.ok(before.startsWith(CHARACTER_HISTORY.find(c => c.id === 'crew:taan@th').text));
  g.talk.seen['met:taan@cyberhell'] = true;
  const after = text(g, 'crew:taan@th');
  assert.match(after, /ซิสอ็อป/);
  assert.doesNotMatch(after, /แดนไกล/);
  assert.match(text(g, 'crew:taan@cyberhell'), /ลูกชายของทัณฑ์แห่งสุวรรณภูมิ/);
});

test('Q2 two-relative cards follow the Q1 combination table', () => {
  const g = createGame();
  g.talk.seen['met:boon@th'] = true; g.talk.seen['met:dam@th'] = true;
  assert.match(text(g, 'crew:boon@th'), /เขามีตาและลูกพี่ลูกน้องอยู่แดนไกล$/);
  g.talk.seen['met:boon@asia'] = true;
  assert.match(text(g, 'crew:boon@th'), /เขามีตาอยู่บูรพา \(เมกุมิ\) และลูกพี่ลูกน้องอีกคนอยู่แดนไกล$/);
  g.talk.seen['met:boon@cyberhell'] = true;
  assert.match(text(g, 'crew:boon@th'), /\(เมกุมิ\) และลูกพี่ลูกน้องอยู่นรกเครือข่าย \(บัฟเฟอร์\)$/);
  g.talk.seen['met:dam@west'] = true;
  assert.match(text(g, 'crew:dam@th'), /เขามีน้องชายอยู่แดนไกล และลูกพี่ลูกน้องชื่อนัวร์อยู่ปัจฉิม$/);
  g.talk.seen['met:dam@cyberhell'] = true;
  assert.match(text(g, 'crew:dam@th'), /น้องชายชื่อดาร์กเน็ตอยู่นรกเครือข่าย และลูกพี่ลูกน้องชื่อนัวร์อยู่ปัจฉิม$/);
  assert.equal(CHARACTER_HISTORY.some(c => /แดนไกล/.test(c.text)), false, 'main texts carry no relative sentence');
});

test('Q2 giants relatives: uncle and nephew sentences', () => {
  const g = createGame(); g.coin = 99999; g.hireGuard();
  assert.match(text(g, 'guard@th'), /เฝ้าประตูอยู่แดนไกล$/);
  g.talk.seen['met:guard@cyberhell'] = true;
  assert.match(text(g, 'guard@th'), /เฝ้าประตูนรกเครือข่าย$/);
  assert.match(text(g, 'guard@cyberhell'), /^ไฟร์วอลล์ .*เป็นหลานของยักษ์ทวารบาลแห่งสุวรรณภูมิ$/);
});

test('Q2 heads, bosses, devas and merchant open from story, battle and shop', () => {
  const g = createGame();
  g.markHistory(headId('th'));
  assert.ok(ids(g).includes('dad'));
  g.zoneIntroSeen.asia = true;
  assert.ok(ids(g).includes('head:asia'));
  assert.ok(!ids(g).includes('head:west'));
  g.storySeen['deva-th-praise'] = true;
  assert.ok(ids(g).includes('deva:th'));
  assert.ok(!ids(g).includes('deva:west'), 'other devas stay hidden');
  g.bossArriveSeen.th = true;
  assert.ok(ids(g).includes('boss:th'));
  g.zoneEvents.th = { frontierBreach: 'cleared' };
  assert.ok(ids(g).includes('frontier:th'));
  assert.ok(!ids(g).includes('frontier:asia'));
  g.markHistory('merchant');
  assert.ok(ids(g).includes('merchant'));
  assert.equal(showFamilyNote(g), true);
});

test('Q2 a head scene opens the dad card in zone 1 and the zone head card elsewhere', () => {
  const g = createGame();
  g.markHistoryHead('th'); g.markHistoryHead('west');
  assert.deepEqual(ids(g).filter(i => i === 'dad' || i.startsWith('head:')), ['dad', 'head:west']);
});

test('Q2 Arun-Dej opens only after the reveal, not while he is still the beggar', () => {
  const g = createGame();
  g.zoneEvents.th = { devaTest: 'pending' };
  assert.ok(!ids(g).includes('deva:th'));
  g.storySeen['deva-th-warning'] = true;
  assert.ok(ids(g).includes('deva:th'));
});

test('Q2 foes seen in battle open their cards', () => {
  assert.deepEqual(cardsFromFoeSprite('boss-frontier-west'), ['frontier:west']);
  assert.deepEqual(cardsFromFoeSprite('boss-tester-cyberhell'), ['deva:cyberhell']);
  assert.deepEqual(cardsFromFoeSprite('leader-asia-possessed'), ['head:asia']);
  assert.deepEqual(cardsFromFoeSprite('leader-th-possessed'), ['dad']);
  assert.deepEqual(cardsFromFoeSprite('zone-boss', 'asia'), ['boss:asia']);
  assert.deepEqual(cardsFromFoeSprite('zone-boss-cyberhell'), ['boss:cyberhell']);
  assert.deepEqual(cardsFromFoeSprite('spirit'), []);
  const g = createGame();
  g.battle = { kind: 'zoneEvent', zone: 'west', foes: [{ sp: 'boss-frontier-west' }, { sp: 'ghost' }] };
  noteBattleHistory(g);
  assert.ok(ids(g).includes('frontier:west'));
  g.battle = { kind: 'zoneBoss', zone: 'asia', foes: [{ sp: 'zone-boss' }] };
  g.step();
  assert.ok(ids(g).includes('boss:asia'), 'step() notes the battle');
  g.battle = null;
});

test('Q2 unlocks persist through save and reload and never go back', () => {
  const g = createGame(); g.coin = 99999; g.hire('kan'); g.markHistory('merchant');
  g.talk.seen['met:taan@th'] = true;
  const before = ids(g);
  const snap = g.snapshot();
  assert.equal(snap.historyV, 1);
  assert.equal(snap.historySeen['crew:kan@th'], true);
  const h = reload(g);
  assert.deepEqual(ids(h), before);
  g.talk.seen = {}; // even if the source flag vanished, the saved unlock stays
  assert.deepEqual(ids(reload(g)), ids(g));
});

test('Q2 an old save without history data opens cards by existing progress', () => {
  const g = createGame(); g.coin = 99999; g.hire('plerng'); g.hireGuard();
  g.casesDone = 6; g.zoneIntroSeen.asia = true;
  g.storySeen['deva-th-praise'] = true; g.bossCleared.th = true;
  const snap = JSON.parse(JSON.stringify(g.snapshot()));
  delete snap.historyV; delete snap.historySeen;
  const h = createGame();
  assert.equal(h.restore(snap), true);
  const open = ids(h);
  for (const id of ['frame', 'yama', 'nira', 'crew:taan@th', 'crew:plerng@th', 'guard@th', 'dad', 'head:asia', 'deva:th', 'boss:th', 'merchant'])
    assert.ok(open.includes(id), `${id} opened for the old save`);
  for (const id of ['crew:kan@th', 'crew:dam@th', 'guard@asia', 'boss:asia', 'deva:west', 'frontier:th', 'head:west'])
    assert.ok(!open.includes(id), `${id} stays hidden`);
  assert.equal(h.snapshot().historyV, 1, 'migrated once');
  // a fresh (current-version) save is not treated as legacy: Taan stays hidden until talked to
  const fresh = reload(createGame());
  assert.deepEqual(ids(fresh), ['frame', 'yama', 'nira']);
});

test('Q2 guide HTML wires the cards, not the full list; hooks exist in ui.js', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.ok(ui.includes('${historyHtml()}'));
  assert.ok(ui.includes("guide.insertAdjacentHTML('beforeend',historyHtml())"));
  assert.doesNotMatch(ui, /FAMILY_HISTORY|CHARACTER_HISTORY\.map/);
  assert.match(ui, /openVerdictScene[\s\S]{0,400}markHistoryHead\(sc\.zone\)/);
  assert.match(ui, /openAuthorityWarning[\s\S]{0,300}markHistoryHead\(g\.zone\)/);
  assert.match(ui, /zoneIntroSeen\[z\.k\] = true; g\.markHistoryHead\(z\.k\)/);
  assert.match(ui, /function openMerchant\(\)[\s\S]{0,200}markHistory\('merchant'\)/);
});

test('Q2 Rae Q1 text: Valkyrie spelling, beggar line, no leftover misspelling', () => {
  for (const f of ['src/data.js', 'src/i18n.js', 'src/e1-content.js', 'src/ui.js', 'AUDIO.md'])
    assert.doesNotMatch(readFileSync(new URL('../' + f, import.meta.url), 'utf8'), /วาคิวรี/, f);
  assert.doesNotMatch(t('deva.th.warning'), /จำวัด/);
  assert.match(t('deva.th.warning'), /^ข้าเป็นเพียงขอทานในวัด แบ่งอาหารที่ได้มาให้ผู้หิวโหย มิได้ทำบาป/);
  const west = t('deva.west.arrival');
  assert.equal((west.match(/วาลคีรี:/g) || []).length, 3);
  assert.equal(CHARACTER_HISTORY.find(c => c.id === 'deva:west').text.startsWith('เอียร์ลินเป็นเทวดาตำแหน่งวาลคีรี ผู้ถือหอกประจำปัจฉิม'), true);
});

test('Q2 rescuing Taan in zones 3 and 4 opens his card without talking', () => {
  const g = createGame();
  assert.ok(!ids(g).includes('crew:taan@west') && !ids(g).includes('crew:taan@cyberhell'));
  g.zoneEvents.west = { ...(g.zoneEvents.west || {}), westHypnotized: 'cleared' };
  assert.ok(ids(g).includes('crew:taan@west'));
  assert.ok(!ids(g).includes('crew:taan@cyberhell'), 'zone 4 stays hidden until its own rescue');
  g.zoneEvents.cyberhell = { ...(g.zoneEvents.cyberhell || {}), cyberRescue: 'cleared' };
  assert.ok(ids(reload(g)).includes('crew:taan@cyberhell'));
});

test('Q2 deva.west.arrival spells vampire with the thanthakhat', () => {
  assert.match(t('deva.west.arrival'), /ปีศาจแวมไพร์ หายไปไหนแล้ว/);
});
