#!/usr/bin/env python3
"""BOSS-SKILLS set A evidence: opens each boss fight in the real game (Chromium / Playwright), lets the team defend until the boss announces a move and uses it,
and saves the warning banner (<name>-warn.png) and the full-screen move card (<name>-card.png).
  python3 scripts/serve-nocache.py 8951 &      (a threaded server is better: see scene-fx-evidence.py)
  BASE=http://127.0.0.1:8951/index.html CH=chromium [W=1792 H=958] python3 scripts/boss-skills-evidence.py <outdir> [name,name,...]
Names: th-arunadet th-tanthasura th-hanuman th-yomathat asia-kuroha asia-akura asia-wukong asia-liangang west-eirlin west-valdric west-severin cyber-lumen cyber-trojan cyber-yama cyber-archon
The save is a fresh in-memory slot; each fight is set up through the game's own API (G.startZoneEvent ...), the battle window is then opened by the game's own open-battle path.
Evidence only: the 1300 ms life of a card is stretched to 7 s inside the test page so a screenshot can catch it - the game itself is not changed."""
import importlib.util, sys, time, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
os.environ.setdefault('BASE','http://127.0.0.1:8951/index.html')
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
W, H = int(os.environ.get('W', 1792)), int(os.environ.get('H', 958))
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
# name: (zone, how, key, extra js run once the battle exists)
CASES = {
 'th-arunadet':   ('th', 'deva', None, ''),
 'th-hanuman':    ('th', 'event', 'sitaHanuman', ''),
 'th-yomathat':   ('th', 'event', 'thBorderBoss', ''),
 'th-tanthasura': ('th', 'breach', None, ''),
 'asia-kuroha':   ('asia', 'event', 'asiaDevaTest', ''),
 'asia-wukong':   ('asia', 'event', 'asiaWukong', ''),
 'asia-akura':    ('asia', 'lastwave', 'asiaRageBreach', ''),
 'asia-liangang': ('asia', 'zoneboss', None, ''),
 'west-eirlin':   ('west', 'event', 'westDevaTest', ''),
 'west-valdric':  ('west', 'lastwave', 'westVampireBreach', ''),
 'west-severin':  ('west', 'zoneboss', None, ''),
 'cyber-lumen':   ('cyberhell', 'event', 'cyberRescue', ''),
 'cyber-trojan':  ('cyberhell', 'lastwave', 'cyberBreach', ''),
 'cyber-yama':    ('cyberhell', 'final', 'ruler:th', ''),
 'cyber-archon':  ('cyberhell', 'final', 'boss', ''),
}
SETUP = """async ([zone, how, key]) => {
  const d = await import('./src/data.js'); const E = d.ZONE_EVENTS;
  G.zone = zone; G.level = 3; G.hpMax = G.hp = 130; G.mpMax = G.mp = 60;
  if (!G.crew.some(c => c.k === 'taan')) G.hire('taan');
  G.zoneEvents[zone] = Object.fromEntries(E[zone].map(e => [e.k, 'cleared']));
  if (how === 'deva') { G.zoneEvents.th = { prisonBreak:'cleared', devaTest:'pending' }; G.devaVisits.th = { phase:'fighting' }; return !!G.startDevaTest(); }
  if (how === 'breach') { G.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'pending' }; G.setFrontierTeam && G.setFrontierTeam('taan'); const b = G.startFrontierBreach(); if (!b) return false;
     b.wave = 4; b.foes = G.frontierBreachFoes(4); b.selectedFoeId = b.foes[0].id; b.who = b.foes[0].who; b.sp = b.foes[0].sp; return true; }
  if (how === 'event' || how === 'lastwave') {
    G.zoneEvents[zone][key] = 'pending';
    if (zone === 'cyberhell' && key === 'cyberBreach') G.zoneEvents.cyberhell.cyberRescue = 'cleared';
    if (zone === 'asia' && key === 'asiaWukong') G.storyCaseDone ||= {};
    const b = G.startZoneEvent(key); if (!b) return false;
    if (how === 'lastwave') { const ev = E[zone].find(e => e.k === key); const w = ev.waves.length; b.wave = w; b.foes = G.zoneEventFoes(ev, w); b.selectedFoeId = b.foes[0].id; b.who = b.foes[0].who; b.sp = b.foes[0].sp; }
    return true; }
  if (how === 'zoneboss') { G.zoneCases[zone] = 15; G.bossGuarding[zone] = true; const b = G.startZoneBoss('alert'); if (!b) return false; G.startBossFight && G.startBossFight(); return true; }
  if (how === 'final') { G.zone = 'cyberhell'; G.finalEvent = { version:1, migrationVersion:2, phase:key === 'boss' ? 'bossReady' : 'staging', minionsCleared:4, rulersCleared:key === 'boss' ? ['th','asia','west','cyberhell'] : [], reinforcementsSeen:true, approachSeen:true, duelSeen:true, rewardLedger:{} };
     G.zoneEvents.cyberhell.signalClose = 'cleared'; const b = G.startFinalEncounter(key); return !!b; }
}"""
OPEN = """()=>{ const b = G.battle; if (!b) return 'nobattle'; if (document.querySelector('dialog[open] .combat-arena')) return 'open'; const k = b.kind; if (k === 'frontierBreach') { G.devaVisits.th = { phase:'fighting' }; b.kind = 'devaTest'; } else b.kind = 'yama'; G.onChange(); return 'forced:' + k; }"""
RESTORE = """(k)=>{ if (G.battle) G.battle.kind = k; }"""
LOOP = """()=>{ const b = G.battle; if (!b) return null; b.youHp = b.youMax; for (const a of G.battleActors()) if (a.id !== 'you') a.morale = 100;
  for (const f of b.foes) if (f.boss && f.hp < f.maxHp * (f.sk?.keep ?? 1) && !(f.maxHp * .5 > f.hp)) {}
  const cut = document.querySelector('dialog[open] .action-cutscene');
  const notice = document.querySelector('dialog[open] .battle-move-name')?.textContent || '';
  const tag = [...document.querySelectorAll('dialog[open] .skill-warn, dialog[open] [class*="warn"]')].map(e => e.textContent.trim()).filter(Boolean).slice(0, 2);
  const def = [...document.querySelectorAll('dialog[open] .actor-segment')].find(e => e.offsetParent && e.textContent.trim().startsWith('ป้องกัน'));
  return { cut: cut ? (cut.querySelector('.cutscene-title')?.textContent || '') : '', cutImg: cut?.querySelector('img')?.src?.split('/').slice(-2).join('/') || '', notice, tag, hasDefend: !!def, over: b.over, turn: b.turn, foeHp: b.foes.map(f => [f.who, f.hp, f.sk ? Object.keys(f.sk.used) : []]) } }"""
CLICK_DEF = """()=>{ const def = [...document.querySelectorAll('dialog[open] .actor-segment')].find(e => e.offsetParent && e.textContent.trim().startsWith('ป้องกัน')); if (def) { def.click(); return true } return false }"""
CLICK_FOE_BOSS = """()=>{ const e = document.querySelector('dialog[open] .cam-world [data-foe-id]'); e?.click(); }"""
with sync_playwright() as p:
    for name, (zone, how, key, extra) in CASES.items():
        if ONLY and name not in ONLY: continue
        b, c, pg, errs, t0 = ev.boot(p, W, H, 1, False)
        try:
            pg.evaluate("()=>{const o=window.setTimeout;window.setTimeout=(f,d,...a)=>o(f,d===1300?7000:d,...a)}")   # keep the card on screen long enough for a screenshot (evidence only)
            ok = pg.evaluate(SETUP, [zone, how, key]); pg.wait_for_timeout(1500)
            print(name, 'setup', ok, flush=True)
            if not ok: c.close(); b.close(); continue
            kind = pg.evaluate("()=>G.battle?.kind")
            pg.evaluate("()=>document.querySelectorAll('dialog[open]').forEach(d=>{if(!d.querySelector('.combat-arena'))d.close()})"); pg.wait_for_timeout(500)
            st = pg.evaluate(OPEN); pg.wait_for_timeout(2500)
            if str(st).startswith('forced'): pg.evaluate(RESTORE, kind)
            for _ in range(3): pg.evaluate("()=>{const d=document.querySelector('dialog[open] .battle-intro, dialog[open] [data-battle-start]');d?.click()}"); pg.wait_for_timeout(300)
            shots = {'warn': False, 'card': False}; log = []
            for i in range(700):
                s = pg.evaluate(LOOP)
                if not s: break
                if s['over']: log.append(('over', s['over'])); break
                if s['cut'] and not shots['card']:
                    info = pg.evaluate("()=>{const c=document.querySelector('dialog[open] .action-cutscene');const i=c?.querySelector('img');return c?[c.dataset.imageState||'', c.className, i?[i.naturalWidth,i.naturalHeight,i.complete,getComputedStyle(i).opacity,i.getBoundingClientRect().width]:null]:'gone'}")
                    pg.wait_for_timeout(900); pg.screenshot(path=str(out / f'{name}-card.png')); shots['card'] = True
                    log.append(('card', s['cut'], info))
                if s['notice'] and '⚠' in s['notice'] and not shots['warn']:
                    pg.screenshot(path=str(out / f'{name}-warn.png')); shots['warn'] = True; log.append(('warn', s['notice']))
                if shots['card'] and shots['warn']: break
                if s['hasDefend']:
                    pg.evaluate(CLICK_DEF)
                pg.wait_for_timeout(120)
            print(name, log, flush=True)
            print('   errors', [e for e in errs if 'favicon' not in e][:4], flush=True)
        except Exception as e:
            print(name, 'EXC', repr(e)[:300], flush=True)
        c.close(); b.close()
