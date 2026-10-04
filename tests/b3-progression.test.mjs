import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { actorFromLegacy, rosterId } from '../src/roster.js';
import { effectiveAllyStats, actorTraining, normalizeTraining, merchantStock } from '../src/progression.js';
import { ALLY_ZONE_SCALE, TRAINING_RULES, TRAINING_STATIONS, ITEMS, BATTLE, ZONE_EVENTS } from '../src/data.js';
import { crewAbility } from '../src/command-wheel.js';
import { setLang } from '../src/i18n.js';

globalThis.Image ??= class {};
globalThis.document ??= { documentElement:{} };
const zones = ['th','asia','west','cyberhell'];
function game(zone, kind = 'taan') {
  const g = createGame(); g.zone = zone; g.level = 5; g.coin = 10000;
  const actor = actorFromLegacy({ k:kind, morale:100 },zone,kind);
  if (kind === 'guard') g.guard = actor;
  else { g.crew = [actor]; g.party.members = [kind]; }
  return [g,actor];
}
function battle(g) {
  const b = g.startBattle({ id:1, who:'fixture', deserved:4, resist:true });
  b.youMax = 1000; b.youHp = 100;
  b.foes.forEach(f => { f.hp=f.maxHp=10000; f.atk=[0,0]; });
  return b;
}
function trained(g, actor, exp) {
  const shared = ['nira','yama'].includes(actor.k);
  if (shared) g.training.shared[`global:${actor.k}`] = { exp };
  else { g.training.zones[actor.homeZone] ||= {}; g.training.zones[actor.homeZone][actor.id] = { exp }; }
}
function fixedRandom(fn) {
  const old = Math.random; Math.random = () => .5;
  try { return fn(); } finally { Math.random = old; }
}

test('B3 zone tables and actual damage/heal match the displayed ability at every training level', () => {
  const expected = { taan:[35,42,49,56], dam:[35,42,49,56], plerng:[40,48,56,64], guard:[60,72,84,96], boon:[50,60,70,80] };
  for (const [kind,base] of Object.entries(expected)) zones.forEach((zone,i) => {
    for (let level=1;level<=ALLY_ZONE_SCALE[zone].cap;level++) {
      const [g,actor] = game(zone,kind); trained(g,actor,TRAINING_RULES.exp[level-1]);
      const stats = g.allyStats(actor), amount=Math.round(base[i]*TRAINING_RULES.multipliers[level-1]);
      assert.equal(stats.level,level);
      assert.equal(kind === 'boon' ? stats.heal : stats.dmg,amount);
      setLang('th'); assert.ok(crewAbility(actor,zone,g.training).includes(String(amount)));
      setLang('en'); assert.ok(crewAbility(actor,zone,g.training).includes(String(amount))); setLang('th');
      const b = battle(g), before=b.foes[0].hp;
      assert.equal(g.battleAct(kind === 'guard' ? 'guard' : `crew:${kind}`),true);
      assert.equal(kind === 'boon' ? b.youHp-100 : before-b.foes[0].hp,amount);
    }
  });
});

test('B3 paid discipline/intelligence/mercy upgrades do not add attack; strength does', () => {
  const [g,c] = game('asia'); const original=g.allyStats(c).dmg;
  for (const stat of ['rabiab','panya','metta']) {
    assert.equal(g.upgradeCrew(c.id,stat),true);
    assert.equal(g.allyStats(c).dmg,original);
  }
  assert.equal(g.upgradeCrew(c.id,'raeng'),true);
  assert.equal(g.allyStats(c).dmg,Math.round(37*1.2));
  assert.equal(g.upgradeCrew(c.id,'unknown'),false);
  const b=battle(g); const hp=b.foes[0].hp; assert.equal(g.battleAct('crew:taan'),true);
  assert.equal(hp-b.foes[0].hp,g.allyStats(c).dmg);
});

test('B3 training follows roster IDs and home zone, with shared Yama/Nira and EXP-derived caps', () => {
  const [g,c] = game('th'); trained(g,c,420);
  const other=actorFromLegacy({k:'taan'},'asia');
  assert.equal(actorTraining(g.training,c).level,2);
  assert.equal(actorTraining(g.training,other).level,1);
  assert.equal(effectiveAllyStats(c,'cyberhell',g.training).dmg,37);
  trained(g,{k:'yama'},150); trained(g,{k:'nira'},420);
  for (const zone of zones) {
    assert.equal(actorTraining(g.training,'yama',zone).level,3);
    assert.equal(actorTraining(g.training,'nira',zone).level,5);
  }
  assert.equal(normalizeTraining(null).shared['global:yama'].level,1);
  const normalized=normalizeTraining({ zones:{asia:{[other.id]:{exp:150,level:5}}} });
  assert.equal(normalized.zones.asia[other.id].level,3);
  assert.equal(normalizeTraining(normalized).zones.asia[other.id].exp,150);
});

test('B3 Yama training scales only normal attack, before critical, leaving MP powers unchanged', () => {
  for (const zone of zones) fixedRandom(() => {
    const [g]=game(zone); trained(g,{k:'yama'},420);
    let b=battle(g); let before=b.foes[0].hp;
    g.battleAct('atk');
    const base=BATTLE.atk[0]+Math.floor(.5*(BATTLE.atk[1]-BATTLE.atk[0]+1))+8;
    assert.equal(before-b.foes[0].hp,Math.round(base*ALLY_ZONE_SCALE[zone].yama*1.12));
    b=battle(g); before=b.foes[0].hp; g.mp=100;
    g.battleAct('fire'); assert.equal(before-b.foes[0].hp,BATTLE.fireDmg+8);
  });
});

test('B3 Kan scales enemy self damage but player hypnosis resets the source multiplier', () => {
  for (const zone of zones) fixedRandom(() => {
    const [g,c]=game(zone,'kan'); trained(g,c,420);
    const b=battle(g); b.foes[0].atk=[20,20]; const before=b.foes[0].hp;
    assert.equal(g.battleAct('crew:kan'),true);
    assert.equal(before-b.foes[0].hp,Math.round(20*g.allyStats(c).confuseMultiplier));
    assert.equal(b.foes[0].confuse,0); assert.equal(b.foes[0].confuseMultiplier,undefined);
    g.abilities.hypno=true; g.mp=100; b.foes[0].confuseMultiplier=1.27;
    const hp=b.foes[0].hp; g.battleAct('hypno'); assert.equal(hp-b.foes[0].hp,20);
  });
});

function prep(g) {
  g.zoneEvents[g.zone]=Object.fromEntries((ZONE_EVENTS[g.zone] || []).map(e => [e.k,'cleared']));
  g.zoneCases[g.zone]=10;
  if (g.zone === 'th') { g.zone='asia'; g.zoneCases.asia=10; g.zoneEvents.asia=Object.fromEntries(ZONE_EVENTS.asia.map(e => [e.k,'cleared'])); }
  let b;
  if (g.zone === 'cyberhell') {
    g.zoneEvents.cyberhell.cyberFinal='pending';
    b=g.startZoneEvent('cyberFinal'); assert.ok(b);
    for (let wave=1;wave<=3;wave++) {
      b.foes.forEach(f => { f.hp=0; }); b.pendingWave=wave+1;
      if (wave<3) assert.equal(g.advanceZoneEventWave(),true);
    }
    assert.equal(g.zoneEventRestReady(),true);
  } else b=g.startZoneBoss();
  assert.ok(b); b.youMax=1000; b.youHp=10; return b;
}
test('B3 medicine price/effect table and all three use paths agree for every zone item', () => {
  const expected=[[40,30,40,12,55,45,24],[55,40,50,16,70,55,30],[70,50,60,20,85,65,35],[85,60,70,24,95,75,40]];
  zones.forEach((zone,i) => {
    const stock=merchantStock(zone), [hp,mp,teaHp,teaMp,hpCost,mpCost,teaCost]=expected[i];
    for (const [family,gainHp,gainMp,cost] of [['health',hp,0,hpCost],['holyWater',0,mp,mpCost],['tea',teaHp,teaMp,teaCost]]) {
      const item=stock.find(s => s.k.startsWith(family)), k=item.k;
      assert.equal(item.cost,cost); assert.equal(ITEMS[k].hp || 0,gainHp); assert.equal(ITEMS[k].mp || 0,gainMp);
      for (const context of ['bag','battle','prep']) {
        const [g]=game(zone); g.zoneEvents.cyberhell={cyberRescue:'cleared'};
        const coins=g.coin; assert.equal(g.buyMerchant(k),true); assert.equal(g.coin,coins-cost);
        g.hpMax=g.mpMax=1000; g.hp=g.mp=10;
        if (context === 'battle') { battle(g); g.battle.youHp=10; }
        if (context === 'prep') prep(g);
        assert.equal(context === 'bag' ? g.useBag(k) : context === 'battle' ? g.battleAct(k) : g.useMedicine(k,'prep'),true,`${k} ${context}`);
        assert.equal(g.battle ? g.battle.youHp : g.hp,10+gainHp); assert.equal(g.mp,10+gainMp);
        assert.equal(g.inventory[k],undefined);
      }
    }
  });
});

test('B3 medicines retain old-zone effects, cap gains, and do not consume when full or preparation is closed', () => {
  const [g]=game('cyberhell'); g.hpMax=g.mpMax=1000; g.hp=g.mp=10; g.inventory.tea=1;
  assert.equal(g.useBag('tea'),true); assert.equal(g.hp,50); assert.equal(g.mp,22);
  for (const k of Object.keys(ITEMS).filter(k => ITEMS[k].consumable)) {
    g.inventory[k]=2; g.hp=g.hpMax; g.mp=g.mpMax;
    assert.equal(g.useBag(k),false); assert.equal(g.inventory[k],2);
    const b=battle(g); b.youHp=b.youMax; g.mp=g.mpMax;
    const turn=b.turn; assert.equal(g.battleAct(k),false); assert.equal(b.turn,turn); assert.equal(g.inventory[k],2);
    b.youHp=1; g.mp=1; assert.equal(g.useMedicine(k,'prep'),false); assert.equal(g.inventory[k],2);
    g.battle=null; g.hp=g.hpMax-1; g.mp=g.mpMax-1; assert.equal(g.useBag(k),true);
    assert.ok(g.hp<=g.hpMax && g.mp<=g.mpMax);
  }
});

test('B3 legacy upLv migration keeps active/dormant crew and Guard bonuses across repeated save/load', () => {
  const g=createGame(); const d=g.snapshot(); delete d.roster; delete d.rosterVersion; delete d.training;
  const c=d.crew.find(c => c.k==='taan'); c.upLv=3; delete c.statTraining;
  d.guard={upLv:2}; d.zoneSave.asia={crew:[{k:'taan',upLv:4}],guard:{upLv:1}};
  const restored=createGame(); assert.equal(restored.restore(d),true);
  for (const [id,lv] of [['th:taan',3],['th:guard',2],['asia:taan',4],['asia:guard',1]]) {
    assert.equal(restored.roster[id].upLv,lv); assert.equal(restored.roster[id].statTraining.raeng,lv);
  }
  const actor=restored.roster['th:taan']; trained(restored,actor,60);
  const next=createGame(); assert.equal(next.restore(restored.snapshot()),true);
  assert.equal(next.allyStats(next.roster['th:taan']).dmg,Math.round(41*1.06));
  assert.equal(next.training.zones.th[rosterId('th','taan')].exp,60);
  next.coin=1000; next.level=5; assert.equal(next.upgradeCrew('taan','rabiab'),true);
  assert.equal(next.allyStats(next.roster['th:taan']).dmg,Math.round(41*1.06));
});

test('B3 all eight training stations are declared without wiring training into minigames', () => {
  assert.deepEqual(Object.keys(TRAINING_STATIONS),['dab','lan','krata','krajok','sawan','sala','ngiw','lokan']);
  assert.deepEqual(TRAINING_STATIONS.lan.actors,['taan','guard']);
  assert.equal(TRAINING_STATIONS.lan.game,TRAINING_STATIONS.lokan.game);
});

test('B3 Nira order and active registry recovery use shared training; construction and recovery disable it', () => {
  const prepare = exp => {
    const g=createGame(); const nira=g.crew.find(c => c.k==='nira'); trained(g,nira,exp);
    g.order=50; g.queue=[]; g.mobs=[]; g.karma=0; g.coin=10000; g.nextArrive=g.nextEvent=g.nextPay=g.nextKpi=1e9;
    const st=g.stations.find(s => s.def.k==='sala'); assert.ok(st);
    st.build=0; st.buildWait=false; return [g,nira,st];
  };
  const [base]=prepare(0); const [trainedGame,nira]=prepare(420);
  assert.equal(trainedGame.allyStats(nira).order,13);
  base.step(); trainedGame.step();
  assert.ok(base.order>50);
  assert.ok(Math.abs((trainedGame.order-50)/(base.order-50)-1.2)<1e-9);
  for (const mode of ['build','repair','burn','rest','recover']) {
    const [g,nira,st]=prepare(420);
    if (mode==='build') st.build=Date.now()+100000;
    if (mode==='repair') st.repair=Date.now()+100000;
    if (mode==='burn') st.fire=1000;
    if (mode==='rest') g.niraRest={remaining:1000};
    if (mode==='recover') nira.recoverUntil=Date.now()+100000;
    g.step(); assert.equal(g.order,50,mode);
  }
});
