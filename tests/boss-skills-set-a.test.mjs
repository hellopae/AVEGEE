// BOSS-SKILLS set A (15 Nov 2026): every boss that has a fight carries the moves of Rae's table; the data, the texts, the pictures and the wiring.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BOSS_SKILLS, BOSS_ULTIMATE_NAMES, BOSS_CARD_IMAGES } from '../src/boss-skills-data.js';
import { hasSkills, pickText, summonFoes } from '../src/boss-skills.js';
import { ZONE_EVENTS, BOSS_ULTIMATE } from '../src/data.js';
import { createGame } from '../src/game.js';
import { setup } from '../scripts/sim-balance2.mjs';
import { measure } from '../scripts/sim-boss-skills.mjs';
globalThis.Image ??= class { set src(v) {} };

const ev = (zone, k) => ZONE_EVENTS[zone].find(e => e.k === k);
const final = i => ev('cyberhell', 'cyberFinal').waves[i][0];

test('Rae table: 24 bosses (PHANTOM-404 = the AI Scammer Robot, one boss) each have the moves of the table', () => {
  const want = { arunadet:['groupHit'], tanthasura:['groupHit', 'heavyHit'], hanuman:['groupHit', 'heavyHit'], khunphaen:['groupHit', 'heavyHit'], guanyu:['groupHit', 'heavyHit'], ryujin:['groupHit', 'heavyHit'], yomathat:['groupHit', 'heavyHit'], yamaPossessed:['groupHit', 'heavyHit'],
    kuroha:['groupHit'], akura:['groupHit', 'heavyHit'], wukong:['summon', 'groupHit'], gateGuardTest:['heavyHit'], lianGang:['groupHit', 'heavyHit'], zhaoWenPossessed:['groupHit', 'heavyHit'],
    eirlin:['groupHit', 'heavyHit'], loki:['groupHit', 'heavyHit'], valdric:['groupHit', 'heal'], cerberus:['groupHit', 'heavyHit'], jormungandr:['groupHit', 'heavyHit'], severin:['groupHit', 'heavyHit'], halvarPossessed:['groupHit', 'heavyHit'],
    lumen01:['groupHit'], lumen02:['heavyHit'], trojan9:['groupHit', 'summon'], phantom404:['groupHit', 'groupHit'], archonZero:['groupHit', 'heal'], nexarPossessed:['groupHit', 'heavyHit'] };
  assert.deepEqual(Object.keys(BOSS_SKILLS).sort(), Object.keys(want).sort());
  for (const [k, kinds] of Object.entries(want)) assert.deepEqual(BOSS_SKILLS[k].map(s => s.kind), kinds, k);
  assert.equal(BOSS_SKILLS.phantom404.map(s => s.name.th).join('|'), 'พายุลิงก์หลอก|ลบทั้งแถว');
  assert.equal(BOSS_SKILLS.lianGang[1].name.th, 'ห่วงตรวนสุดท้าย');
});
test('every move is announced one turn ahead, has TH + EN text, and a card (groupHit) that exists as a file', () => {
  for (const [boss, list] of Object.entries(BOSS_SKILLS)) for (const s of list) {
    assert.ok((s.warn ?? 1) >= 1, `${boss}/${s.id} is warned`);
    for (const key of ['name', 'warnText', 'useText']) { assert.ok(s[key].th && s[key].en, `${boss}/${s.id}.${key} has both languages`); assert.doesNotMatch(s[key].th + s[key].en, /[\u{1F300}-\u{1FAFF}]/u, 'no emoji'); }
    if (s.kind === 'groupHit') { assert.ok(s.image, `${boss}/${s.id} has a card`); assert.ok(fs.existsSync(s.image), `${s.image} exists`); }
    if (s.kind === 'summon') { assert.ok(s.summon.name.th && s.summon.name.en && s.summon.sub.th && s.summon.sub.en, `${boss}/${s.id} summon names in both languages`); }
    assert.ok(s.power == null || s.power <= 2.0, 'no move above x2.0');
  }
  for (const f of Object.values(BOSS_CARD_IMAGES)) assert.ok(fs.existsSync(f), f);
});
test('the pictures that came from Kittanate / Codex are the real size (cards 1672x941, sprites 512x512)', () => {
  const dims = f => { const b = fs.readFileSync(f); const i = b.indexOf('VP8'); const kind = b.toString('latin1', i, i + 4);
    if (kind === 'VP8 ') return [b.readUInt16LE(i + 14) & 0x3fff, b.readUInt16LE(i + 16) & 0x3fff];
    if (kind === 'VP8L') { const v = b.readUInt32LE(i + 9); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
    const x = b.indexOf('VP8X'); return [(b.readUIntLE(x + 12, 3)) + 1, (b.readUIntLE(x + 15, 3)) + 1]; };
  const own = Object.values(BOSS_CARD_IMAGES).filter(f => !/zone-boss-cutscene|Boss Zone/.test(f));   // the four zone-boss cutscenes are older pictures with their own size
  assert.ok(own.length >= 19, 'the new cards');
  for (const f of own) assert.deepEqual(dims(f), [1672, 941], f);
  for (const f of ['img/z3-events/boss-cerberus-west.webp', 'img/z3-events/boss-jormungandr-west.webp', 'img/z4-events/boss-phantom404-cyberhell.webp', 'img/z4-events/phantom404-entry-cyberhell.webp', 'img/z2-events/boss-wukong-clone-asia.webp'])
    assert.deepEqual(dims(f), [512, 512], f);
});
test('owner spellings: เขาฮวยก๊วย / เซอร์เบอรัส / ยอร์มุนกันดร์ / (no ฮั้งกัวซัน, ยอร์มุงกันด์ anywhere in the game text)', () => {
  const src = fs.readdirSync('src').filter(f => f.endsWith('.js')).map(f => fs.readFileSync('src/' + f, 'utf8')).join('\n');
  assert.doesNotMatch(src, /ฮั้งกัวซัน|ยอร์มุงกันด์|เคอร์เบอรอส/);
  assert.match(JSON.stringify(BOSS_SKILLS.cerberus), /เซอร์เบอรัส/); assert.match(JSON.stringify(BOSS_SKILLS.jormungandr), /ยอร์มุนกันดร์/);
  assert.match(src, /เขาฮวยก๊วย/);
});
test('BOSS_ULTIMATE names are Rae\'s (zone 2 = the chain-weight, zone 3 = the blue flame - they were swapped)', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(BOSS_ULTIMATE).map(([z, v]) => [z, v.name])), BOSS_ULTIMATE_NAMES);
  assert.equal(BOSS_ULTIMATE.asia.name, 'ตุ้มตรวนผนึก'); assert.equal(BOSS_ULTIMATE.west.name, 'เปลวน้ำเงินปิดบัญชี');
});
test('the data reaches the foes: every fight of the set carries its moves (events, breach bosses, hypnotised lords, the Lumen, the four possessed rulers, the zone bosses)', () => {
  const foes = { devaTh:ev('th', 'devaTest').foe, tanthasura:ev('th', 'frontierBreach').waves[3][0], hanuman:ev('th', 'sitaHanuman').foe, yomathat:ev('th', 'thBorderBoss').foes[0],
    kuroha:ev('asia', 'asiaDevaTest').foe, akura:ev('asia', 'asiaRageBreach').waves[3][0], wukong:ev('asia', 'asiaWukong').foe, guard:ev('asia', 'asiaGuardTest').foe,
    eirlin:ev('west', 'westDevaTest').foe, valdric:ev('west', 'westVampireBreach').waves[4][0], trojan:ev('cyberhell', 'cyberBreach').waves[4][0],
    yama:final(3), zhao:final(4), halvar:final(5), nexar:final(6), archon:final(7),   // T8d: three minion waves -> rulers waves[3..6], boss waves[7]
    sigTh:ev('th', 'signalTh').waves[1][0], sigAsia:ev('asia', 'signalAsia').waves[1][0], sigWest:ev('west', 'signalWest').waves[1][0], sigCyber:ev('cyberhell', 'cyberSignal').waves[1][0] };
  for (const [k, f] of Object.entries(foes)) assert.ok(f.skills?.length, k);
  assert.deepEqual(ev('cyberhell', 'cyberRescue').foes[0].skillsEach.map(l => l[0].id), ['scanBeam', 'lockOn']);
  assert.equal(foes.sigAsia.skills, BOSS_SKILLS.akura); assert.equal(foes.sigCyber.skills, BOSS_SKILLS.trojan9);
});
test('live battles: the Thai deva test, the Thai breach boss, the two Lumen (one each), the zone bosses of Asia and West, the final boss all have their own moves', () => {
  const g = setup({ zone:'th', size:3, kind:'event', eventKey:'devaTest', moves:false }); assert.ok(hasSkills(g.battle.foes[0]));
  const b = setup({ zone:'th', size:3, kind:'breach', moves:false }); b.battle.foes = b.frontierBreachFoes(4); assert.ok(hasSkills(b.battle.foes[0]), 'Tanthasura');
  const l = setup({ zone:'cyberhell', size:7, kind:'event', eventKey:'cyberRescue', moves:false }); assert.deepEqual(l.battle.foes.map(f => f.skills[0].id), ['scanBeam', 'lockOn']);
  for (const [zone, id] of [['asia', 'blazeBlade'], ['west', 'blueFlameClose']]) { const z = setup({ zone, size:3, kind:'boss', moves:false }); const boss = z.battle.foes[0]; assert.ok(hasSkills(boss), zone); assert.equal(boss.skills[0].id, id === 'blazeBlade' ? 'sealedWeight' : 'blueFlameClose'); }
  const f = setup({ zone:'cyberhell', size:7, kind:'final', encounter:'boss', moves:false }); assert.equal(f.battle.foes.find(x => x.boss).skills[0].id, 'revokeBolt');
});
test('a boss with moves does not also use the old unwarned cutscene rhythm (zone bosses of Asia / West)', () => {
  const g = setup({ zone:'asia', size:3, kind:'boss', moves:false }); const b = g.battle; const boss = b.foes[0];
  for (const a of g.battleActors()) if (a.id !== 'you') a.morale = 100;
  const seen = []; for (let i = 0; i < 14 && !b.over; i++) { const t = g.beginBattleTurns(); if (t.side === 'foe') { g.runEnemyTurn(); if (b.ultimate && b.ultimate.name) seen.push(b.ultimate.skill || 'OLD'); b.youHp = b.youMax; g.finishBattleCommand(); } else { g.confirmBattleCommand('defend', t.id); g.finishBattleCommand(); } boss.hp = boss.maxHp; }
  assert.ok(!seen.includes('OLD'), 'only warned moves: ' + seen.join(','));
});
test('summon names follow the language', () => {
  const foe = { id:'f', hp:10, maxHp:10 }, b = { foes:[foe] }, skill = BOSS_SKILLS.wukong[0];
  const th = summonFoes(b, foe, skill, { scaleHp:h => h, scaleAtk:a => a, rand:() => 0, lang:'th' })[0];
  const en = summonFoes({ foes:[{ ...foe, id:'g' }] }, { ...foe, id:'g' }, skill, { scaleHp:h => h, scaleAtk:a => a, rand:() => 0, lang:'en' })[0];
  assert.equal(th.who, 'ร่างแยกหงอคง'); assert.equal(en.who, 'Wukong clone'); assert.equal(en.sub, 'Born of a strand of hair');
  assert.equal(pickText(BOSS_SKILLS.trojan9[1].summon.name, 'en'), 'Bug from the belly');
});
test('sim sanity (30 seeds): the hardest-tuned early fights are still winnable, the zone boss is not a wall for a trained team, and the fights are long enough to see the moves', () => {
  const [deva] = measure('thDeva', { count:30, sizes:[3], modes:['locked'] }); assert.ok(deva.winPct >= 40 && deva.winPct <= 100, `thDeva ${deva.winPct}`); assert.ok(deva.skillUses >= .8, 'the deva uses its move');
  const [boss] = measure('asiaBoss', { count:30, sizes:[3], modes:['unlocked'] }); assert.ok(boss.winPct >= 40 && boss.winPct <= 98, `asiaBoss trained ${boss.winPct}`); assert.ok(boss.rounds >= 4 && boss.rounds <= 9, `rounds ${boss.rounds}`);
  const [sig] = measure('sigTh', { count:30, sizes:[3], modes:['locked'] }); assert.ok(sig.winPct >= 35 && sig.winPct <= 95, `sigTh ${sig.winPct}`);
  for (const r of [deva, boss, sig]) assert.equal(r.errors, 0);
});
