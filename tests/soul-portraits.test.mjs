import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_CASES } from '../src/cases.js';
import { createGame } from '../src/game.js';
import { soulArchetype, soulPortrait, reconcileSoulPortraits } from '../src/soul-portraits.js';

globalThis.Image = class {};
const named = key => ({ ...ALL_CASES.find(c => c.k === key), case:key });

test('case identity overrides numbered sprite and preserves profession and sex', () => {
  assert.equal(soulPortrait(named('A2'), 'asia'), 'spirit-worker');
  assert.equal(soulPortrait(named('A4'), 'asia'), 'spirit-executive');
  assert.equal(soulPortrait(named('A6'), 'asia'), 'spirit-executive');
  assert.equal(soulPortrait(named('A13'), 'asia'), 'spirit-officer');
  assert.equal(soulPortrait(named('A1'), 'asia'), 'spirit-cleric');
  for (const c of ALL_CASES) {
    const role = soulArchetype({ ...c, case:c.k });
    if (c.sex === 'f') assert.ok(['woman','clerk','elder-woman'].includes(role), c.k);
    if (c.sex === 'g') assert.equal(role, 'girl');
    if (c.sex === 'b') assert.equal(role, 'boy');
    if (c.sex === 'monk') assert.equal(role, 'cleric');
  }
});

test('large male business roles get their body archetype without changing guilt or younger/female identity', () => {
  for (const zone of ['th','asia','west','cyberhell']) {
    assert.equal(soulPortrait({ who:'เจ้าของกิจการ', sex:'m', sp:2 }, zone), 'spirit-business');
    assert.equal(soulPortrait(named('hunter'), zone), 'spirit-business');
  }
  assert.equal(soulPortrait(named('A8'), 'asia'), 'spirit-woman');
  assert.equal(soulPortrait(named('A12'), 'asia'), 'spirit-woman');
  assert.equal(soulPortrait(named('trader'), 'west'), 'spirit-executive');
  assert.equal(soulPortrait(named('heir'), 'cyberhell'), 'spirit-executive');
  assert.equal(soulPortrait({ who:'พ่อค้าหนุ่ม', sex:'m' }, 'west'), 'spirit-executive');
  const good = { who:'เจ้าของกิจการ', sex:'m', pure:true, deeds:[] };
  assert.equal(soulArchetype(good), 'business');
  assert.equal(good.pure, true);
  assert.deepEqual(good.deeds, []);
});

test('Thai and other branches resolve canonical roles consistently after restyling', () => {
  for (const key of ['girl','boy','nurse','monk','deva']) {
    assert.equal(soulPortrait(named(key), 'th'), `spirit-${soulArchetype(named(key))}`);
  }
  assert.equal(soulPortrait(named('prophet'), 'th'), 'spirit-cleric');
  assert.equal(soulPortrait(named('sergeant'), 'th'), 'spirit-officer');
  assert.equal(soulPortrait(named('accountant'), 'th'), 'spirit-executive');
  assert.equal(soulPortrait({ who:'นักเรียนหญิง', sex:'g', sp:10 }, 'west'), 'spirit-girl');
  assert.equal(soulPortrait({ who:'นักเรียนชาย', sex:'b', sp:8 }, 'cyberhell'), 'spirit-boy');
  assert.equal(soulPortrait({ who:'หญิงวัยเกษียณ', sex:'f', sp:9 }, 'asia'), 'spirit-elder-woman');
});

test('legacy save reconciliation covers queue, stations, jail, walkers, closed cases and other branches', () => {
  const soul = (id, key) => ({ id, ...named(key), sp:2 });
  const game = { zone:'asia', queue:[soul(1,'A2')], held:[soul(2,'A8')],
    stations:[{ slots:[{ soul:soul(3,'A5') }] }],
    sentences:[{ zone:'asia', soul:soul(4,'A13') }],
    afterlifeWalks:[{ zone:'asia', soul:soul(5,'A4') }],
    closed:[{ zone:'asia', soul:soul(6,'A16') }],
    returning:[{ who:'เจ้าของกิจการ', sex:'m', sp:2, zone:'th' }],
    zoneSave:{ west:{ queue:[{ who:'นักเรียนหญิง', sex:'g', sp:10 }], held:[], stations:[] } } };
  reconcileSoulPortraits(game);
  assert.equal(game.queue[0].sp, 'spirit-worker');
  assert.equal(game.held[0].sp, 'spirit-woman');
  assert.equal(game.stations[0].slots[0].soul.sp, 'spirit-business');
  assert.equal(game.sentences[0].soul.sp, 'spirit-officer');
  assert.equal(game.afterlifeWalks[0].soul.sp, 'spirit-executive');
  assert.equal(game.closed[0].soul.sp, 'spirit-clerk');
  assert.equal(game.returning[0].sp, 'spirit-business');
  assert.equal(game.zoneSave.west.queue[0].sp, 'spirit-girl');
});

test('game spawn, restore, returned cases and soul battles keep semantic portraits', () => {
  const g = createGame();
  g.zone = 'west';
  g.nextNamedCase = () => ({ ...named('hunter'), id:111, deserved:4 });
  g.spawnSoul();
  const s = g.queue.at(-1);
  assert.equal(s.sp, 'spirit-business');
  g.startBattle(s);
  assert.equal(g.battle.sp, s.sp);
  assert.equal(g.battle.foes[0].sp, s.sp);
  const returned = g.mkReturnSoul({ caseK:'girl', fromId:2, gave:1, who:'นักเรียนหญิง',
    sex:'g', sp:2, deeds:[{ t:'เรื่องเดิม', w:2 }], merits:[], zone:'west' });
  assert.equal(returned.case, 'girl');
  assert.equal(returned.sp, 'spirit-girl');
  const saved = createGame().snapshot();
  saved.zone = 'west';
  saved.queue = [{ ...named('nurse'), case:'nurse', id:123, sp:2, sex:'m' }];
  const restored = createGame();
  assert.equal(restored.restore(saved), true);
  assert.equal(restored.queue[0].sex, 'f');
  assert.equal(restored.queue[0].sp, 'spirit-woman');
});


test('explicitly elderly women select elder art before adult profession roles in every branch', () => {
  for (const zone of ['th','asia','west','cyberhell']) {
    assert.equal(soulPortrait(named('hammer'), zone), 'spirit-elder-woman');
    for (const who of ['หญิงชรา','แม่ค้าวัยเกษียณ','พนักงานหญิงสูงวัย','นักธุรกิจหญิงสูงอายุ','elderly woman']) {
      assert.equal(soulPortrait({ who, sex:'f', sp:9 }, zone), 'spirit-elder-woman');
    }
  }
  // The old father belongs to the story, not the daughter's own age.
  assert.equal(soulPortrait(named('A11'), 'asia'), 'spirit-clerk');
  assert.equal(soulPortrait(named('A8'), 'asia'), 'spirit-woman');
  assert.equal(soulPortrait(named('girl'), 'asia'), 'spirit-girl');
});


test('Thai legacy numbers cannot override sex, age or the case profession', () => {
  assert.equal(soulPortrait({ who:'นักเรียนหญิง', sex:'g', sp:10 }, 'th'), 'spirit-girl');
  assert.equal(soulPortrait(named('sister'), 'th'), 'spirit-clerk');
  assert.equal(soulPortrait(named('scapegoat'), 'th'), 'spirit-worker');
  assert.equal(soulPortrait(named('deva'), 'th'), 'spirit-worker');
  assert.equal(soulPortrait(named('A7'), 'th'), 'spirit-cleric');
  assert.equal(soulPortrait(named('A3'), 'th'), 'spirit-officer');
  assert.equal(soulPortrait(named('A13'), 'th'), 'spirit-officer');
  assert.equal(soulPortrait({ who:'หญิงวัยกลางคน', sex:'f', sp:4 }, 'th'), 'spirit-woman');
  assert.equal(soulPortrait({ who:'คนขับรถรับจ้าง', sex:'m', sp:1 }, 'th'), 'spirit-worker');
});
