// G3b — ประลองปีศาจชายแดน 10 wave + อาวุธประจำโซน (9 ต.ค. 2569)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGame } from '../src/game.js';
import { BATTLE, BOSS_NAMES, CHALLENGE_REPLAY, CHALLENGE_REST_WAVE, CHALLENGE_STAND, CHALLENGE_STORY_KEY, FRONTIER,
  ITEMS, WEAPONS, WEAPON_STACK_CAP, ZONES, ZONE_EVENTS, challengeKeyOf } from '../src/data.js';
import { WEAPON_ART_FILES, WEAPON_IDS, meleeSwing, weaponCutsceneSrc, weaponIconSrc, weaponOnHit, weaponSpriteSrc } from '../src/weapons.js';
import { STORY, WEAPON_STORY, storyOf } from '../src/story.js';
import { englishKeys, setLang, t } from '../src/i18n.js';
import { standPoints } from '../src/npc-stand.js';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { GUARD_POST, SPOTS, ZONE_ENTRY, syncSceneZone } from '../src/data.js';
import { buildWalk, canWalk, findPath, resetWalk, setBlocks, setNpcDiscs } from '../src/walk.js';
import { weaponSheetFor, swordSheet } from '../src/yama-sword.js';
import { capWithRage } from '../src/weapons.js';

globalThis.Image ??= class {};
globalThis.document ??= { documentElement:{} };
const ZONE_IDS = Object.keys(CHALLENGE_STORY_KEY);
const challengeOf = zone => ZONE_EVENTS[zone].find(e => e.challenge);

/** สุ่มตามลำดับที่กำหนด (วนซ้ำ) — ใช้ล็อกผลฟาด/คริ/ผลพิเศษ */
function withRandom(values, fn) {
  const real = Math.random; let i = 0;
  Math.random = () => values[i++ % values.length];
  try { return fn(); } finally { Math.random = real; }
}
function unlocked(zone = 'th') {
  const g = createGame(); g.zone = zone;
  g.level = 3; g.hpMax = g.hp = 110;
  g.zoneEvents[zone] = { [CHALLENGE_STORY_KEY[zone]]:'cleared' };
  return g;
}
const reload = g => { const h = createGame(); assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))), true); return h; };
/** ล้ม wave ปัจจุบันให้หมด (ศัตรูไม่ตีสวน) แล้วให้เกมเดินต่อจนถึงจุดที่ระบุ */
function clearWave(g) {
  const b = g.battle; b.youHp = b.youMax;
  for (const f of b.foes) f.atk = [0, 0];
  for (let n = 0; n < 40 && !b.pendingWave && !b.over; n++) {
    const foe = b.foes.find(f => f.hp > 0); foe.hp = 1; g.selectFoe(foe.id);
    assert.equal(g.battleAct('atk'), true);
    g.finishBattleCommand();
  }
}
function winAll(g, from = 1) {
  for (let wave = from; wave <= 10; wave++) {
    clearWave(g);
    if (wave < 10) {
      assert.equal(g.battle.pendingWave, wave + 1, `wave ${wave} cleared`);
      assert.equal(g.advanceZoneEventWave(true), true);
    }
  }
  assert.equal(g.battle.over, 'win');
}

// ---------------------------------------------------------------- ข้อมูล
test('ตารางประลอง: ทุกโซนมี 10 wave · wave 10 = บอสชายแดนตัวเดียว · ศัตรูเป็นของโซนนั้น · จุดพัก wave 5', () => {
  for (const zone of ZONE_IDS) {
    const ev = challengeOf(zone);
    assert.equal(ev.k, challengeKeyOf(zone));
    assert.equal(ev.waves.length, 10, zone);
    assert.deepEqual(ev.restBeforeWaves, [CHALLENGE_REST_WAVE + 1]);
    assert.equal(ev.atCases, 999, 'ไม่ให้ refreshZoneEvents เปิดเป็นอีเวนต์เนื้อเรื่อง');
    assert.equal(ev.team, undefined, 'ไม่ใช่อีเวนต์ team:frontier (ไม่ผ่านหน้าเดินชายแดน)');
    const boss = ev.waves[9];
    assert.equal(boss.length, 1);
    assert.equal(boss[0].boss, true);
    assert.equal(boss[0].sp, `boss-frontier-${zone}`);
    assert.equal(boss[0].name, BOSS_NAMES[zone].frontier);
    const allowed = new Set(ZONES.find(z => z.k === zone).mobs);
    if (zone === 'west') allowed.add(2);            // สุนัขนรก = ศัตรูปัจฉิมเดิมของ westHypnotized
    for (const [i, groups] of ev.waves.slice(0, 9).entries()) for (const f of groups) {
      assert.ok(allowed.has(f.kind), `${zone} wave ${i + 1} kind ${f.kind}`);
      assert.ok(f.hp > 0 && f.atk[0] <= f.atk[1] && f.count >= 1);
    }
    assert.ok(ev.betweenWaveHeal > 0);
    assert.equal(ev.lose.hp, 8);
    assert.ok(ev.reward.coin > 0 && WEAPONS[ev.reward.weapon].zone === zone);
    assert.equal(ev.waveCoin.length, 10);
  }
});

test('ตัวเลขสมดุลของอีเวนต์เนื้อเรื่องเดิมไม่ถูกแตะ (เพิ่มแค่รายการท้ายสุดของแต่ละโซน)', () => {
  const keys = z => ZONE_EVENTS[z].filter(e => !e.challenge).map(e => e.k);
  assert.deepEqual(keys('th'), ['prisonBreak', 'frontierBreach', 'devaTest', 'thBorderBoss']);
  assert.deepEqual(keys('asia'), ['asiaPrisonFire', 'asiaDevaTest', 'asiaRageBreach']);
  assert.deepEqual(keys('west'), ['westHypnotized', 'westVampireBreach', 'westDevaTest']);
  assert.deepEqual(keys('cyberhell'), ['cyberRescue', 'cyberBreach', 'cyberFinal']);
  for (const z of ZONE_IDS) assert.equal(ZONE_EVENTS[z].at(-1).challenge, true);
  assert.equal(ZONE_EVENTS.th[1].waves[1][1].hp, 90);       // บอสชายแดนเนื้อเรื่อง th ยังเป็น 90
  assert.equal(ZONE_EVENTS.th[1].betweenWaveHeal, 20);
  assert.equal(ZONE_EVENTS.cyberhell[1].betweenWaveHeal, 25);
});

test('refreshZoneEvents ไม่เปิดการประลองเป็นอีเวนต์เนื้อเรื่อง และไม่ขวางประตูบอสโซน', () => {
  const g = unlocked('th'); g.zoneCases.th = 12;
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared', thBorderBoss:'cleared' };
  g.refreshZoneEvents('th');
  assert.equal(g.zoneEvents.th[challengeKeyOf('th')], undefined);
  assert.equal(g.zoneEventGateReady(), true, 'ประลองที่ยังไม่ทำไม่ขวางประตูบอสโซน');
  assert.deepEqual(Object.keys(g.zoneEvents.th).sort(), ['devaTest', 'frontierBreach', 'prisonBreak', 'thBorderBoss']);
});

test('ชื่ออาวุธ 4 ชื่อไม่ชนชื่อเดิมในเกม และไม่ใช้คำต้องห้าม (Dracula)', () => {
  const src = fs.readdirSync('src').filter(f => f.endsWith('.js')).map(f => [f, fs.readFileSync(`src/${f}`, 'utf8')]);
  try {
    for (const id of WEAPON_IDS) for (const lang of ['th', 'en']) {
      setLang(lang);
      const name = t(`weapon.${id}.name`);
      assert.notEqual(name, `weapon.${id}.name`, 'มีชื่อทั้งสองภาษา');
      // ชื่อเต็มปรากฏเฉพาะใน i18n.js (บรรทัดนิยามของมันเอง) — ไม่ชนชื่อพลัง/ไอเท็ม/ท่าบอส/ข้อความเดิม
      const hits = src.filter(([, text]) => text.includes(name.replace(/'/g, "\\'"))).map(([f]) => f);
      assert.deepEqual(hits, ['i18n.js'], `${lang} ${name}`);
      assert.ok(!/dracula/i.test(name));
      for (const item of Object.values(ITEMS)) assert.notEqual(item.name, name);
    }
  } finally { setLang('th'); }
  assert.ok(!/dracula/i.test((fs.readFileSync('src/i18n.js', 'utf8').split('G3b ·')[1] || '')), 'ไม่มีคำ Dracula ในข้อความของงานนี้');
});

test('บทพูดบอส 4 สถานการณ์ × 4 โซน มีทั้งไทยและอังกฤษ (talk/invite/lose/win)', () => {
  const en = new Set(englishKeys());
  try {
    for (const zone of ZONE_IDS) for (const k of ['talk', 'invite', 'lose', 'win']) {
      const key = `challenge.${zone}.${k}`;
      assert.ok(en.has(key), `${key} EN`);
      setLang('th'); const th = t(key); assert.notEqual(th, key);
      setLang('en'); const e = t(key); assert.notEqual(e, key); assert.notEqual(e, th);
    }
  } finally { setLang('th'); }
});

test('รายชื่อไฟล์ภาพที่ต้องวาด: 16 สไปรท์ฟัน (4 อาวุธ × 4 ชุด) + 4 ไอคอน + 4 คัตซีน ชื่อไม่ซ้ำ', () => {
  assert.equal(WEAPON_ART_FILES.sprites.length, 16);
  assert.equal(WEAPON_ART_FILES.icons.length, 4);
  assert.equal(WEAPON_ART_FILES.cutscenes.length, 4);
  const all = [...WEAPON_ART_FILES.sprites, ...WEAPON_ART_FILES.icons, ...WEAPON_ART_FILES.cutscenes];
  assert.equal(new Set(all).size, 24);
  assert.equal(weaponSpriteSrc('cane', 'west'), 'img/yama-sword-weapons/hero-yama-west-sword-cane.webp');
  assert.equal(weaponIconSrc('fang'), 'img/weapons/weapon-icon-fang.png');
  assert.equal(weaponCutsceneSrc('trojan'), 'img/weapons/weapon-cutscene-trojan.jpeg');
});

// ---------------------------------------------------------------- เปิดการประลอง
test('ต้องชนะบอสชายแดนในเนื้อเรื่องก่อน: ก่อนหน้านั้นไม่เริ่ม ไม่ยืนที่ประตู · หลังนั้นเริ่มได้', () => {
  const g = createGame(); g.zone = 'th';
  assert.equal(g.challengeUnlocked(), false);
  assert.equal(g.startChallenge(), null);
  g.zoneEvents.th = { frontierBreach:'pending' };
  assert.equal(g.challengeUnlocked(), false);
  g.zoneEvents.th.frontierBreach = 'cleared';
  assert.equal(g.challengeUnlocked(), true);
  const b = g.startChallenge();
  assert.equal(b.kind, 'zoneEvent'); assert.equal(b.challenge, true); assert.equal(b.wave, 1);
  assert.equal(g.startChallenge(), null, 'ไม่ซ้อนสองศึก');
  // ธงของแต่ละโซนตรงบอสชายแดนของโซนนั้น
  for (const [zone, key] of Object.entries(CHALLENGE_STORY_KEY)) {
    const e = ZONE_EVENTS[zone].find(x => x.k === key);
    assert.equal(e.team === 'frontier' || key === 'frontierBreach', true, `${zone} ${key}`);
    assert.ok(e.waves.flat().some(f => f.boss && String(f.sp).startsWith('boss-frontier-')), `${zone} ${key} มีบอสชายแดน`);
  }
});

test('บอสยืนที่ประตูล่างข้างซุ้มชายแดน: กันทางเดินด้วยจุดยืน · คุยได้เมื่อเดินเข้าใกล้', () => {
  const g = unlocked('th');
  assert.ok(Math.abs(CHALLENGE_STAND.x - FRONTIER.x) < 200 && CHALLENGE_STAND.y > FRONTIER.y - 40, 'อยู่ข้างประตูล่าง');
  assert.ok(standPoints(g).some(([x, y]) => x === CHALLENGE_STAND.x && y === CHALLENGE_STAND.y));
  const lock = createGame();
  assert.ok(!standPoints(lock).some(([x, y]) => x === CHALLENGE_STAND.x && y === CHALLENGE_STAND.y), 'ยังไม่ปลดล็อก = ไม่มีบอส');
  g.player.x = CHALLENGE_STAND.x - 400; g.player.y = CHALLENGE_STAND.y;
  assert.equal(g.challengeCanTalk(), false);
  g.player.x = CHALLENGE_STAND.x - 80;
  assert.equal(g.challengeCanTalk(), true);
});

// ---------------------------------------------------------------- เล่นครบรอบ
test('รอบแรก: 10 wave → จุดพัก wave 5 บันทึก → แพ้ wave 7 → กลับมาเริ่ม wave 6 → ชนะครบได้อาวุธ', () => {
  const g = unlocked('th');
  const coin0 = g.coin, water0 = g.inventory.holyWater || 0;
  g.startChallenge();
  for (let wave = 1; wave <= 5; wave++) {
    clearWave(g);
    assert.equal(g.battle.pendingWave, wave + 1);
    if (wave < 5) assert.equal(g.advanceZoneEventWave(), true);
  }
  // จุดพัก: บันทึกถาวร · ไม่เดินต่ออัตโนมัติ · มีของกลางทาง
  assert.equal(g.challenge.th.checkpoint, 5);
  assert.equal(g.zoneEventRestReady(), true);
  assert.equal(g.advanceZoneEventWave(), false, 'อนิเมชันข้ามจุดพักไม่ได้');
  assert.equal(g.inventory.holyWater, water0 + 1);
  assert.equal(g.coin, coin0 + 8 + 8 + 10 + 10 + 12);
  assert.equal(g.advanceZoneEventWave(true), true);
  assert.equal(g.battle.wave, 6);
  // ถึง wave 7 แล้วแพ้
  clearWave(g); assert.equal(g.advanceZoneEventWave(), true);
  assert.equal(g.battle.wave, 7);
  const hpBefore = g.hp;
  g.battle.youHp = 1; for (const f of g.battle.foes) f.atk = [50, 50];
  g.battleAct('atk');
  assert.equal(g.battle.over, 'lose');
  assert.match(t('challenge.th.lose'), /ล้มแค่นี้เอง/);        // บทพูด "แพ้" ของทัณฑสูร (ร่าง Minnie) แสดงที่หน้าจบศึก
  g.endBattle();
  assert.equal(g.hp, Math.max(1, hpBefore - 8), 'บารมี -8');
  assert.equal(g.weapons.owned.fang, undefined);
  assert.equal(g.challenge.th.checkpoint, 5, 'จุดพักไม่หาย');
  assert.equal(g.zoneEvents.th[challengeKeyOf('th')], undefined, 'ไม่เหลือสถานะอีเวนต์ค้าง');
  // กลับมา: เริ่มที่ wave 6 (ไม่จ่ายรางวัล wave 1–5 ซ้ำ)
  g.pendingRecovery = null; g.hp = g.hpMax;
  const coin1 = g.coin;
  assert.equal(g.challengeStartWave(), 6);
  const b = g.startChallenge();
  assert.equal(b.wave, 6); assert.equal(b.rematch, false);
  winAll(g, 6);
  assert.ok(g.battle.reward.weapon === 'fang');
  g.endBattle();
  assert.equal(g.weapons.owned.fang, true);
  assert.equal(g.weapons.equipped, null, 'ไม่สวมให้เอง — สวมจากกระเป๋า');
  assert.equal(g.challenge.th.wins, 1); assert.equal(g.challenge.th.checkpoint, 0);
  const winCoin = ZONE_EVENTS.th.find(e => e.challenge).reward.coin;
  const waves7to9 = [14, 14, 16].reduce((a, c) => a + c, 0);          // wave 6 จ่ายไปแล้วในรอบที่แพ้ — ไม่จ่ายซ้ำ
  assert.equal(g.coin - coin1, winCoin + waves7to9);
  assert.ok(g.storyQueue.some(s => s.key === 'weapon-fang'), 'คัตซีนรับอาวุธเข้าคิว');
  assert.ok(storyOf('weapon-fang').pages[0].image.endsWith('weapon-cutscene-fang.jpeg'));
  assert.equal(STORY['weapon-fang'], undefined, 'แยกจาก STORY หลัก');
  assert.match(WEAPON_STORY['weapon-fang'].pages[0].line, /ฮ่าฮ่า ตัวเล็กแต่เขี้ยวคม/);
  assert.equal(g.pendingReward.weapons[0], 'fang');
  assert.equal(g.pendingReward.exp, 60);
});

test('ประลองซ้ำหลังได้อาวุธ: ไม่ได้อาวุธซ้ำ · เบี้ยกรรมครึ่งหนึ่ง + วัตถุดิบชายแดน · ไม่มี EXP/คัตซีนซ้ำ', () => {
  const g = unlocked('asia');
  g.weapons.owned.chain = true; g.challenge.asia = { checkpoint:0, paidWave:10, wins:1 };
  g.storySeen['weapon-chain'] = true;
  const ev = challengeOf('asia'), full = ev.reward.coin + ev.waveCoin.reduce((a, c) => a + c, 0);
  const coin0 = g.coin, inv0 = { ...g.inventory };
  const b = g.startChallenge();
  assert.equal(b.rematch, true);
  winAll(g);
  assert.equal(g.coin - coin0, Math.round(full * CHALLENGE_REPLAY.coinShare));
  assert.equal(g.battle.reward.weapon, undefined);
  const gained = Object.keys(g.inventory).reduce((a, k) => a + (g.inventory[k] - (inv0[k] || 0)), 0);
  assert.equal(gained, CHALLENGE_REPLAY.drops, 'ได้เฉพาะวัตถุดิบชายแดน (ไม่มีน้ำมนต์ที่จุดพักซ้ำ)');
  for (const k of Object.keys(g.inventory)) if (g.inventory[k] > (inv0[k] || 0)) assert.ok(FRONTIER.drops.includes(k), k);
  assert.equal(g.battle.summary.exp, 0);
  g.endBattle();
  assert.equal(g.challenge.asia.wins, 2);
  assert.equal(g.storyQueue.length, 0);
  assert.equal(Object.keys(g.weapons.owned).length, 1);
});

test('แพ้ตอนประลองซ้ำ: อาวุธไม่หาย · ไม่เสียความคืบหน้า', () => {
  const g = unlocked('west');
  g.weapons.owned.cane = true; g.weapons.equipped = 'cane'; g.challenge.west = { checkpoint:0, paidWave:10, wins:1 };
  g.startChallenge();
  g.battle.youHp = 1; for (const f of g.battle.foes) f.atk = [50, 50];
  g.battleAct('atk');
  assert.equal(g.battle.over, 'lose'); g.endBattle();
  assert.equal(g.weapons.owned.cane, true); assert.equal(g.weapons.equipped, 'cane'); assert.equal(g.challenge.west.wins, 1);
});

// ---------------------------------------------------------------- อาวุธ
test('สวม/ถอดอาวุธ: สวมได้เฉพาะที่มี · ทีละเล่ม · ถอดแล้วกลับดาบเดิม', () => {
  const g = createGame();
  assert.equal(g.equipWeapon('fang'), false);
  g.weapons.owned = { fang:true, cane:true };
  assert.equal(g.equipWeapon('fang'), true); assert.equal(g.weapons.equipped, 'fang');
  assert.equal(g.equipWeapon('cane'), true); assert.equal(g.weapons.equipped, 'cane');
  assert.equal(g.equipWeapon('trojan'), false); assert.equal(g.weapons.equipped, 'cane');
  assert.equal(g.equipWeapon(null), true); assert.equal(g.weapons.equipped, null);
});

test('ไม่ถืออาวุธ = ฟาดปกติเท่าเดิมทุกประการ (ลำดับสุ่มเท่าเดิม)', () => {
  const g = createGame(); g.zone = 'th';
  for (const seq of [[0.5, 0.05], [0.9, 0.9], [0.0, 0.17], [0.3, 0.19]]) {
    const base = g.normalAttack(BATTLE.atk[0] + Math.floor(seq[0] * (BATTLE.atk[1] - BATTLE.atk[0] + 1)));
    const crit = seq[1] < BATTLE.crit;
    const want = crit ? Math.round(base * 1.7) : base;
    const h = createGame(); h.zone = 'th'; h.zoneEvents.th = { prisonBreak:'pending' };
    const b = h.startPrisonBreak(); b.foes.forEach(f => { f.hp = f.maxHp = 9999; f.atk = [0, 0]; });
    withRandom(seq, () => h.battleAct('atk'));
    assert.equal(b.dmg.foe, want, JSON.stringify(seq));
  }
});

function swingOn(weapon, seq, { rage = false, hp = 9999, youHp = 50 } = {}) {
  const g = createGame(); g.zone = 'th';
  g.weapons.owned[weapon] = true; g.weapons.equipped = weapon;
  g.zoneEvents.th = { prisonBreak:'pending' };
  const b = g.startPrisonBreak(); b.foes.forEach(f => { f.hp = f.maxHp = hp; f.atk = [0, 0]; }); b.youHp = youHp;
  if (rage) { g.abilities.rage = true; b.rageTurns = 3; }
  withRandom(seq, () => g.battleAct('atk'));
  return { g, b };
}

test('ดาบเขี้ยวทัณฑสูร: ฟาดแรงขึ้น +20% · ติดไฟ 15% = 5% ของ HP สูงสุด ต่อเทิร์น 2 เทิร์น (เพดาน 8) · ไม่ลวกในตาที่เพิ่งติด', () => {
  const { b } = swingOn('fang', [0.5, 0.9, 0.1]);      // สุ่มติดไฟผ่าน (0.1 < 0.15)
  assert.equal(b.dmg.foe, Math.round(swingBase() * 1.2));
  const target = b.foes.find(f => f.id === b.dmg.foeId);
  assert.deepEqual(target.burn, { turns:2, dmg:8 }, '5% ของ 9999 เกินเพดาน → 8');
  assert.equal(target.hp, 9999 - b.dmg.foe, 'ตานี้ยังไม่ลวก');
  assert.equal(b.weaponNote.k, 'ignite');
  // ตาถัดไป: ลวก 8 แล้วอีกตา แล้วดับ — ลูกไฟ (fire) ไม่ผ่านอาวุธ แต่ไฟที่ติดไว้ลวกต่อ
  const g = swingOn('fang', [0.5, 0.9, 0.1]).g, B = g.battle, f = B.foes.find(x => x.burn);
  g.finishBattleCommand(); const hp1 = f.hp;
  withRandom([0.5, 0.9, 0.9], () => g.battleAct('atk')); g.finishBattleCommand();
  assert.equal(f.hp, hp1 - B.dmg.foe - 8);
  assert.equal(f.burn.turns, 1);
  withRandom([0.5, 0.9, 0.9], () => g.battleAct('atk')); g.finishBattleCommand();
  assert.equal(f.burn, undefined, 'ลวกครบ 2 เทิร์นแล้วดับ');
  // โอกาสไม่ผ่าน (0.9 ≥ 0.15) = ไม่ติดไฟ
  assert.equal(swingOn('fang', [0.5, 0.9, 0.9]).b.foes.some(x => x.burn), false);
  // ศัตรู HP น้อย: 5% ของ HP สูงสุดแต่ไม่ต่ำกว่า 1
  const small = swingOn('fang', [0.5, 0.9, 0.1], { hp:60 }).b.foes.find(x => x.burn);
  assert.equal(small.burn.dmg, 3);
});
function swingBase() { const g = createGame(); g.zone = 'th'; return g.normalAttack(BATTLE.atk[0] + Math.floor(0.5 * (BATTLE.atk[1] - BATTLE.atk[0] + 1))); }

test('ไฟลวกฆ่าศัตรูที่ไม่ใช่เป้าได้ และเลือกเป้าใหม่ไม่ค้างที่ตัวที่ตายแล้ว', () => {
  const g = createGame(); g.zone = 'th'; g.weapons.owned.fang = true; g.weapons.equipped = 'fang';
  g.zoneEvents.th = { prisonBreak:'pending' };
  const b = g.startPrisonBreak(); b.foes.forEach(f => { f.atk = [0, 0]; f.hp = f.maxHp = 5000; });
  b.foes[0].hp = 3; b.foes[0].burn = { turns:2, dmg:8 };
  b.selectedFoeId = b.foes[0].id;
  b.foes[1].hp = 5000;
  // โจมตีตัวอื่น ไฟลวกตัวแรกตาย
  g.selectFoe(b.foes[1].id);
  withRandom([0.5, 0.9, 0.9], () => g.battleAct('atk'));
  assert.equal(b.foes[0].hp, 0);
  assert.notEqual(b.selectedFoeId, b.foes[0].id);
});

test('ดาบโซ่ขาดอากุระ: +25% และคริ +7 จุด% (ฟาดเดียวกันที่ r=0.22 คริเฉพาะเมื่อถือ)', () => {
  const plain = swingOn(null, [0.5, 0.22]).b.dmg.foe;
  const w = swingOn('chain', [0.5, 0.22]).b.dmg.foe;
  assert.equal(plain, swingBase());
  assert.equal(w, Math.round(Math.round(swingBase() * 1.25) * 1.7), 'คริ 22% < 18%+7%');
  assert.equal(meleeSwing(10, 19, 0.2, 'chain').crit, true);
  assert.equal(meleeSwing(10, 19, 0.2, 'fang').crit, false);
  assert.equal(meleeSwing(10, 19, 0.2, null).crit, false);
});

test('ดาบไม้เท้าราตรี: ดูดเลือด 8% ของดาเมจจริง เพดาน 4 ต่อครั้ง ไม่เกินบารมีสูงสุด', () => {
  const { b } = swingOn('cane', [0.5, 0.9], { youHp:50 });
  const d = b.dmg.foe;
  assert.equal(b.youHp, 50 + Math.min(4, Math.round(d * 0.08)));
  assert.equal(b.weaponNote.k, 'drain');
  const full = swingOn('cane', [0.5, 0.9], { youHp:100 }).b;   // youMax = 100 ในศึกแหกคุก — เต็มแล้วไม่ล้น
  assert.equal(full.youHp, Math.min(100, full.youHp));
  assert.ok(weaponOnHit('cane', { dealt:500, targetMax:100, youHp:10, youMax:100 }).heal === 4);
  assert.ok(weaponOnHit('cane', { dealt:30, targetMax:100, youHp:10, youMax:100 }).heal === 2);
  assert.ok(weaponOnHit('cane', { dealt:500, targetMax:100, youHp:99, youMax:100 }).heal === 1);
});

test('ดาบท้องม้าโทรจัน: +30% · ฟันซ้ำ 10% ด้วยแรง 50% ของครั้งแรก · ไม่ซ้อนตัวเอง', () => {
  const none = swingOn('trojan', [0.5, 0.9, 0.9]).b.dmg.foe;                // ไม่ฟันซ้ำ
  const re = swingOn('trojan', [0.5, 0.9, 0.05]).b;
  assert.equal(none, Math.round(swingBase() * 1.3));
  assert.equal(re.dmg.foe, none + Math.round(none * 0.5));
  assert.equal(re.weaponNote.k, 'replay');
  const o = weaponOnHit('trojan', { dealt:40, targetMax:100, youHp:1, youMax:100 }, () => 0);
  assert.equal(o.replay, 20);
  assert.equal(weaponOnHit('trojan', { dealt:40, targetMax:100, youHp:1, youMax:100 }, () => 0.99).replay, 0);
});

test('อาวุธมีผลเฉพาะฟาดปกติ: ลูกไฟ/พุ่งชนเพลิง/ผนึกน้ำแข็ง ไม่ผ่านอาวุธ', () => {
  const run = weapon => {
    const g = createGame(); g.zone = 'th'; g.level = 3; g.mpMax = g.mp = 60; g.abilities.flameCharge = true;
    if (weapon) { g.weapons.owned[weapon] = true; g.weapons.equipped = weapon; }
    g.zoneEvents.th = { prisonBreak:'pending' };
    const b = g.startPrisonBreak(); b.foes.forEach(f => { f.hp = f.maxHp = 5000; f.atk = [0, 0]; });
    const out = [];
    for (const act of ['fire', 'flameCharge']) { withRandom([0.5, 0.9, 0.05], () => g.battleAct(act)); out.push(b.dmg.foe); g.finishBattleCommand(); }
    return { out, burn:b.foes.some(f => f.burn), note:b.weaponNote };
  };
  for (const w of WEAPON_IDS) { const r = run(w), base = run(null); assert.deepEqual(r.out, base.out, w); assert.equal(r.burn, false); assert.equal(r.note, null); }
});

test('เพดานรวมเมื่อซ้อนคริ + rage: ไม่เกิน 130% ของฟาดสูงสุดที่ไม่ถืออาวุธ (ในสภาพ rage เดียวกัน)', () => {
  const g = createGame(); g.zone = 'th'; g.level = 5;
  const maxBase = g.normalAttack(BATTLE.atk[1]);
  for (const w of WEAPON_IDS) {
    const bestPlain = Math.round(maxBase * 1.7);
    for (const r of [0, 0.1, 0.2, 0.5]) for (const base of [11, 15, 19]) {
      const s = meleeSwing(g.normalAttack(base), maxBase, r, w);
      assert.ok(s.dmg <= Math.round(bestPlain * WEAPON_STACK_CAP), `${w} ${base} ${r}`);
      assert.ok(Math.round(s.dmg * 1.5) <= capWithRage(s.cap, 1.5));
    }
  }
  // ทดสอบในศึกจริง: ถือดาบ trojan + rage + คริ → ไม่เกินเพดาน
  const { b } = swingOn('trojan', [0.99, 0.0, 0.9], { rage:true });
  const gg = createGame(); gg.zone = 'th';
  const cap = capWithRage(Math.round(Math.round(gg.normalAttack(BATTLE.atk[1]) * 1.7) * WEAPON_STACK_CAP), 1.5);
  assert.ok(b.dmg.foe <= cap, `${b.dmg.foe} ≤ ${cap}`);
  assert.ok(b.rageTurns === 2);
});

test('คัตซีน/ไอคอน/สไปรท์: ไม่มีไฟล์ = ใช้ดาบเดิมของชุด ไม่ error (fallback)', () => {
  const real = globalThis.Image;
  try {
    globalThis.Image = class { constructor() { this.complete = false; this.naturalWidth = 0; } };   // โหลดไม่ขึ้น
    for (const outfit of ['th', 'asia', 'west', 'cyberhell']) for (const w of WEAPON_IDS)
      assert.equal(weaponSheetFor(outfit, w).src, swordSheet(outfit).src, `${w}/${outfit} fallback`);
    // มีไฟล์ (โหลดสำเร็จ) = ใช้ไฟล์อาวุธ geometry เดียวกับดาบเดิม
    globalThis.Image = class { constructor() { this.complete = true; this.naturalWidth = 5120; } };
    const sheet = weaponSheetFor('west', 'cane');   // record ใหม่ต่อ src · จึงต้องล้างแคช: ใช้ชุดอื่นที่ยังไม่เคยขอ
    assert.ok(sheet.src === swordSheet('west').src || sheet.src.endsWith('hero-yama-west-sword-cane.webp'));
    const fresh = weaponSheetFor('asia', 'trojan');
    assert.equal(fresh.size, 640); assert.deepEqual(fresh.anchor, swordSheet('asia').anchor); assert.equal(fresh.bodyHeight, swordSheet('asia').bodyHeight);
    assert.equal(weaponSheetFor('asia', null).src, swordSheet('asia').src);
  } finally { globalThis.Image = real; }
  // คัตซีนที่ไม่มีไฟล์: ยังมี fallback ใน story (renderStoryComic ใส่ภาพแทนเอง)
  for (const id of WEAPON_IDS) assert.ok(WEAPON_STORY[`weapon-${id}`].pages[0].fallback);
});

// ---------------------------------------------------------------- เซฟ
test('เซฟ/โหลด: อาวุธ ความคืบหน้าจุดพัก ชัยชนะ — โหลดซ้ำแล้วเหมือนเดิม', () => {
  const g = unlocked('th');
  g.weapons.owned = { fang:true, chain:true }; g.weapons.equipped = 'chain';
  g.challenge = { th:{ checkpoint:5, paidWave:5, wins:0 }, asia:{ checkpoint:0, paidWave:10, wins:2 } };
  const h = reload(g);
  assert.deepEqual(h.weapons, { owned:{ fang:true, chain:true }, equipped:'chain' });
  assert.deepEqual(h.challenge.th, { checkpoint:5, paidWave:5, wins:0 });
  assert.equal(h.challenge.asia.wins, 2);
  assert.equal(h.challengeStartWave('th'), 6);
});

test('เซฟเก่า (ก่อน G3b) โหลดได้ · ค่าแปลกถูกกรอง · อาวุธที่สวมต้องมีจริง', () => {
  const g = createGame();
  const snap = JSON.parse(JSON.stringify(g.snapshot()));
  delete snap.challenge; delete snap.weapons;
  const h = createGame(); assert.equal(h.restore(snap), true);
  assert.deepEqual(h.weapons, { owned:{}, equipped:null }); assert.deepEqual(h.challenge, {});
  snap.weapons = { owned:{ fang:true, nope:true }, equipped:'cane' };
  snap.challenge = { th:{ checkpoint:99, paidWave:-4, wins:'x' }, moon:{ checkpoint:3 }, asia:7 };
  const k = createGame(); assert.equal(k.restore(snap), true);
  assert.deepEqual(k.weapons, { owned:{ fang:true }, equipped:null });
  assert.deepEqual(k.challenge.th, { checkpoint:CHALLENGE_REST_WAVE, paidWave:0, wins:0 });
  assert.equal(k.challenge.moon, undefined); assert.equal(k.challenge.asia, undefined);
  // เซฟกลางศึกไม่มีฉากค้าง: โหลดแล้วไม่มีศึกประลอง และไม่มีสถานะ active ค้างในอีเวนต์เนื้อเรื่อง
  const m = unlocked('th'); m.startChallenge(); m.save();
  const r = reload(m); assert.equal(r.battle, null);
});

test('ศึกประลองไม่ปนกับระบบเดิม: ไม่ตั้ง pending/active ให้อีเวนต์เนื้อเรื่อง และไม่เปลี่ยนสถานะบอสโซน', () => {
  const g = unlocked('th');
  const before = JSON.stringify(g.zoneEvents) + JSON.stringify(g.bossCleared) + JSON.stringify(g.abilities);
  g.startChallenge(); winAll(g); g.endBattle();
  assert.equal(JSON.stringify(g.zoneEvents) + JSON.stringify(g.bossCleared) + JSON.stringify(g.abilities), before);
});

// ---------------------------------------------------------------- ตำแหน่งบอสบนแผนที่จริงของทั้ง 4 โซน
// อ่านพิกเซลภาพฉากจริงแบบเดียวกับ tests/zone-entry29c.test.mjs เพื่อสร้าง walk mask
test('ที่ยืนของบอสเดินได้จริงทั้ง 4 โซน · ไม่ทับยักษ์ทวารบาล/ซุ้มประตู · ไม่ขวางทางออกจากประตูขึ้นแท่น · เดินไปคุยถึง', () => {
  const image = name => ({ naturalWidth:1678, naturalHeight:937, path:fileURLToPath(new URL(`../img/${name}.png`, import.meta.url)) });
  const pixels = new Map();
  const imagePixels = im => {
    if (!pixels.has(im.path)) pixels.set(im.path, execFileSync('python3', ['-c',
      'from PIL import Image; import sys; sys.stdout.buffer.write(Image.open(sys.argv[1]).convert("RGBA").tobytes())', im.path], { maxBuffer:7_000_000 }));
    return pixels.get(im.path);
  };
  const oldDoc = globalThis.document;
  globalThis.document = { documentElement:{}, createElement: () => { let source; return { width:0, height:0, getContext: () => ({
    drawImage(im) { source = im; }, getImageData() { return { data:imagePixels(source) }; } }) }; } };
  try {
    const g = createGame();
    for (const z of ZONES) {
      g.zone = z.k; syncSceneZone(z.k); resetWalk(); setBlocks([], []);
      const bg = image(z.scene);
      assert.equal(buildWalk(bg, z.k === 'west' ? image('scene-v2-opt') : bg), true, z.k);
      const { x, y } = CHALLENGE_STAND;
      assert.equal(canWalk(x, y), true, `${z.k}: บอสยืนบนพื้นเดินได้`);
      for (const [dx, dy] of [[-28, 0], [28, 0], [0, -18], [0, 18]]) assert.equal(canWalk(x + dx, y + dy), true, `${z.k}: รอบตัวบอสไม่ตกน้ำ ${dx},${dy}`);
      assert.ok(Math.hypot(x - GUARD_POST[0], y - GUARD_POST[1]) > 150, 'ไม่ทับจุดเฝ้ายักษ์ทวารบาล');
      assert.ok(x > FRONTIER.hit[2] && Math.abs(y - FRONTIER.y) < 80, 'ข้างซุ้มประตู ไม่ทับกรอบกดของซุ้ม');
      // บอสวางวงกันทาง แล้วยมบาทกับนิราต้องยังเดินจากประตูขึ้นแท่นตัดสินได้ และเดินไปใกล้บอสจนคุยได้
      setNpcDiscs([[x, y]]);
      for (const [name, from, to] of [['gate→goal', ZONE_ENTRY.gate, ZONE_ENTRY.goal], ['nira→goal', ZONE_ENTRY.nira, ZONE_ENTRY.goal]]) {
        const path = findPath(from[0], from[1], to[0], to[1], true), end = path?.at(-1);
        assert.ok(end && Math.hypot(end[0] - to[0], end[1] - to[1]) < 2, `${z.k} ${name}`);
      }
      const toBoss = findPath(ZONE_ENTRY.gate[0], ZONE_ENTRY.gate[1], x - 60, y, true), near = toBoss?.at(-1);
      assert.ok(near && Math.hypot(near[0] - x, near[1] - y) <= 100, `${z.k}: เดินไปถึงระยะคุย`);
      setNpcDiscs([]);
    }
  } finally { globalThis.document = oldDoc; resetWalk(); }
});
