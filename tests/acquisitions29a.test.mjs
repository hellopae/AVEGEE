import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createGame, primarySinOf } from '../src/game.js';
import { ALL_CASES } from '../src/cases.js';
import { ITEMS, POWERS, ZONES, LEVELS } from '../src/data.js';
import { ABILITY_REWARDS } from '../src/story.js';
const ui = fs.readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const extract = (name, next) => ui.slice(ui.indexOf(`function ${name}(`), ui.indexOf(next, ui.indexOf(`function ${name}(`)));

test('roar points to an unexamined evidence claim in every authored case, without RNG', () => {
  const g = createGame();
  for (const c of ALL_CASES) {
    const soul = { lines:c.claims.map((l,i) => ({...l,i,used:false})), presses:2,
      deeds:[...c.seen.map(d=>({...d,known:true})), ...(c.hidden || []).map(d=>({...d,known:false}))],
      pure:['innocent','deva'].includes(c.kind), merits:(c.merits || []).map(m=>({...m})), said:[] };
    const hidden = soul.deeds.filter(d => !d.known);
    const candidates = soul.pure ? [] : soul.lines.filter(l =>
      (l.kind === 'deny' ? hidden.slice(0,1) : l.kind === 'plea' ? hidden : []).some(d => d.s === primarySinOf(soul)));
    if (!candidates.length) {
      assert.equal(g.roarTarget(soul), null, c.k);
      assert.ok(g.roarWhy(soul), c.k);
      continue;
    }
    const target = g.roarTarget(soul);
    assert.ok(candidates.includes(target), c.k);
    const oldRandom = Math.random, oldNow = Date.now;
    Math.random = () => { throw Error('roar must not use RNG'); }; Date.now = () => 1000;
    try {
      g.powerOf('roar').readyAt = 0;
      assert.ok(g.usePower('roar', soul), c.k);
      assert.equal(soul.roarHint, target.i);
      assert.equal(target.used, false);
      assert.equal(g.powerOf('roar').readyAt, 121000);
      assert.equal(g.usePower('roar', soul), null);
      Date.now = () => 121000;
      assert.equal(g.powerReady('roar'), true);
      soul.lines.forEach(l=>l.used=true);
      const karma = g.karma;
      assert.ok(g.roarWhy(soul));
      assert.equal(g.usePower('roar', soul), null);
      assert.equal(g.powerOf('roar').readyAt, 121000);
      assert.equal(g.karma, karma);
    } finally { Math.random=oldRandom; Date.now=oldNow; }
  }
});

test('discovery queue covers pickups, shops, levels, abilities and survives save; legacy saves seed owned items', () => {
  const g = createGame();
  g.syncDiscoveries();
  while(g.discoveryQueue.length) g.acknowledgeDiscovery(g.discoveryQueue[0]);
  g.items = [{k:'fire'}]; assert.equal(g.collectItem(0), true);
  assert.ok(g.discoveryQueue.includes('item:fire')); // pickup is consumed immediately
  g.coin=10000; assert.equal(g.buyMerchant('health'),true);
  g.exp=LEVELS[3].exp;
  g.checkLevel(); g.checkLevel(); g.checkLevel();
  assert.equal(g.level,4); g.inventory.lotus=1;
  for (const k of Object.keys(ABILITY_REWARDS)) g.abilities[k]=true;
  g.syncDiscoveries();
  const queue=[...g.discoveryQueue];
  assert.equal(new Set(queue).size,queue.length);
  assert.ok(queue.includes('item:health'));
  assert.ok(queue.includes('power:hypno'));
  for (const k of Object.keys(ABILITY_REWARDS)) assert.ok(queue.includes(`${k === "cooldownClock" ? "item" : "ability"}:${k}`));
  const saved=g.snapshot(), loaded=createGame();
  assert.equal(loaded.restore(saved),true);
  assert.deepEqual(loaded.discoveryQueue,queue);
  assert.equal(loaded.acknowledgeDiscovery(queue[1]),false);
  loaded.acknowledgeDiscovery(queue[0]);
  loaded.discover(...queue[0].split(':'));
  assert.ok(!loaded.discoveryQueue.includes(queue[0]));
  const legacy=g.snapshot(); delete legacy.discoverySeen; delete legacy.discoveryQueue;
  const old=createGame(); assert.equal(old.restore(legacy),true);
  assert.deepEqual(old.discoveryQueue,[]);
  assert.ok(old.discoverySeen['item:lotus']);
  old.discover('item','ashStone'); assert.deepEqual(old.discoveryQueue,['item:ashStone']);
});

test('discovery modal waits for reward and existing dialogs, shows one entry, and acknowledges only on close', () => {
  const g=createGame(); g.discoveryQueue=['item:lotus','ability:bigFire'];
  const listeners=new Set(), renders=[];
  const ctx={g,ITEMS,POWERS,ABILITY_REWARDS,esc:String,pauseForDlg(){},sfx(){},itemImg:k=>`<img data-item="${k}">`,placeholderSrc:()=>'',
    dlg:{open:false,addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f)},
    itemText:(k,field)=>ITEMS[k][field],itemName:k=>ITEMS[k].name,dlgGen:0,rewardOpen:false,setTimeout:()=>{}, modal(html){renders.push(html);ctx.dlg.open=true;ctx.dlgGen++;}};
  vm.createContext(ctx); vm.runInContext(extract('openDiscovery','// ---------- เหตุการณ์เด้ง'),ctx);
  g.pendingReward={}; ctx.openDiscovery(); assert.equal(renders.length,0);
  g.pendingReward=null; ctx.dlg.open=true; ctx.openDiscovery(); assert.equal(renders.length,0);
  ctx.dlg.open=false; ctx.openDiscovery(); ctx.openDiscovery(); assert.equal(renders.length,1);
  assert.match(renders[0],/ดอกบัวบูชา/); assert.match(renders[0],/วิธีใช้:/);
  assert.match(renders[0],new RegExp(ITEMS.lotus.howTo));
  for(const f of [...listeners]) f(); // stale close event while still open
  assert.equal(g.discoveryQueue.length,2);
  ctx.dlg.open=false; for(const f of [...listeners]) f();
  assert.deepEqual(g.discoveryQueue,['ability:bigFire']);
  ctx.openDiscovery(); assert.equal(renders.length,2);
  assert.match(renders[1],/ลูกไฟใหญ่/);
});

test('all item icons have files or usable error fallback; sword shares the helper and lotus name has no duplicated emoji', () => {
  const ctx={ITEMS,artUrl:()=>null,esc:String,itemName:k=>ITEMS[k].name};vm.createContext(ctx);
  vm.runInContext(ui.slice(ui.indexOf('const placeholderSrc ='),ui.indexOf('function bagUseWhy')),ctx);
  for(const [k,d] of Object.entries(ITEMS)) {
    const html=ctx.itemImg(k);
    assert.ok(fs.existsSync(new URL(`../img/${d.img}.png`,import.meta.url)) || d.fallback || d.glyph || d.placeholder,k);
    assert.match(html,/onerror=/,k);
    assert.ok(d.howTo,k);
  }
  assert.equal(ITEMS.bladeShard.img,'item-demon-sword');
  const sword=ctx.itemImg('bladeShard'); assert.match(sword,/item-demon-sword.png/);
  assert.ok(decodeURIComponent(sword).includes('🗡️'));
  assert.match(ui,/itemImg\(k, 'class="shop-item-img"'\)/);
  assert.match(ui,/itemImg\(it.k\)/);
  assert.ok(!ui.includes("${d.glyph ? esc(d.glyph) + ' ' : ''}${esc(itemName(k))}"));
  for(const p of POWERS) assert.ok(p.howTo,p.k);
  for(const [k,d] of Object.entries(ABILITY_REWARDS)) assert.ok(d.howTo,k);
});

test('outfit cards use the same ownership rule as equipping, show a visible lock reason and enable owned outfits', () => {
  const g=createGame(); g.level=5;
  const ctx={g,ZONES,LEVELS,esc:String};vm.createContext(ctx);
  vm.runInContext(extract('outfitCards','function openBag'),ctx);
  for(const k of ['asia','west','cyberhell']) {
    assert.equal(g.setOutfit(k),false);
    const html=ctx.outfitCards();
    assert.match(html,new RegExp(`data-bag-outfit="${k}" disabled`));
    assert.ok(html.includes(g.outfitWhy(k))); assert.match(html,/🔒/);
    g.outfitsOwned.push(k);
    assert.match(ctx.outfitCards(),new RegExp(`data-bag-outfit="${k}" >สวม`));
    assert.equal(g.setOutfit(k),true);
  }
});

test('ordinary close dispatch preserves reward and level priority before explanations', () => {
  const g=createGame(), calls=[];
  g.discoveryQueue=['item:lotus']; g.syncDiscoveries=()=>{};
  const ctx={g,refresh(){},storyPlaying:false,storyScheduled:false,rewardOpen:false,
    dlg:{open:false},openBattleReward:()=>calls.push('reward'),openDiscovery:()=>calls.push('discovery'),
    openLevelUp:()=>calls.push('level'),drawCoach(){},setTimeout(){}};
  vm.createContext(ctx);
  vm.runInContext(ui.slice(ui.indexOf('g.onChange = () => {'),ui.indexOf("dlg.addEventListener('close', () => setTimeout(drawCoach",ui.indexOf('g.onChange = () => {'))),ctx);
  g.pendingReward={}; g.onChange(); assert.deepEqual(calls,['reward']);
  ctx.dlg.open=true; g.onChange(); assert.deepEqual(calls,['reward']);
  g.pendingReward=null; g.pendingLevel=LEVELS[1]; g.onChange(); assert.deepEqual(calls,['reward']);
  ctx.dlg.open=false; g.onChange(); assert.deepEqual(calls,['reward','level']);
  g.onChange(); assert.deepEqual(calls,['reward','level','discovery']);
});

test('roar handles generated cases and exhausted interrogation attempts without inventing evidence', () => {
  for (let n=0; n<50; n++) {
    const g=createGame(), soul=g.queue[0];
    const target=g.roarTarget(soul);
    if (target) {
      assert.ok(['deny','plea'].includes(target.kind));
      assert.equal(target.used,false);
      const original=Math.random;
      Math.random=()=>{throw Error('roar used RNG');};
      try { assert.ok(g.usePower('roar',soul)); assert.equal(soul.roarHint,target.i); }
      finally { Math.random=original; }
    } else assert.equal(g.usePower('roar',soul),null);
    soul.presses=0; g.powerOf('roar').readyAt=0;
    assert.equal(g.usePower('roar',soul),null);
    assert.equal(g.powerOf('roar').readyAt,0);
    assert.ok(g.roarWhy(soul));
  }
});
