#!/usr/bin/env python3
"""T5' evidence: plays a story beat of Rae R2 A in the real game at 390x844 and screenshots each window.
  BASE=http://127.0.0.1:8960/index.html CH=chromium python3 scripts/t5-story-evidence.py <outdir> <wanthong|...>"""
import importlib.util, sys, time, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True); which = sys.argv[2]
SETUP = {
 'wanthong': """async()=>{const d=await import('./src/data.js');
   G.hpMax=G.hp=130;G.level=5;G.coin=5000;for(const k of['sawan','krata'])if(!G.stations.some(s=>s.def.k===k))G.stations.push({def:d.STATIONS.find(x=>x.k===k),crewK:null,intensity:3,fire:0,build:0,slots:[]});
   G.zoneCases.th=12;G.storyCaseDone.sitaledger=true;G.zoneEvents.th={prisonBreak:'cleared',devaTest:'cleared',frontierBreach:'cleared',sitaHanuman:'cleared'};G.giveLamp();G.notices=[];G.storyQueue=[];
   G.ensureStoryCase();G.onChange();return G.queue[0]?.case}""",
}
JUDGE = {'wanthong': """async()=>{const d=await import('./src/data.js');const soul=G.queue.shift();const st={def:d.STATIONS.find(x=>x.k==='krata'),crewK:'taan'};G.applyVerdict(G.judge(st,{soul,intensity:1}),soul);G.reds=0;G.pendingWarn=null;G.pendingVerdictScene=null;G.pendingVerdict=null;G.onChange();return G.storyQueue.map(s=>s.key)}"""}
STATE = "()=>({story:G.storyQueue.map(s=>s.key),notices:G.notices,battle:G.battle&&G.battle.kind,dlg:[...document.querySelectorAll('dialog[open]')].map(d=>d.textContent.trim().replace(/\\s+/g,' ').slice(0,70)).join(' | ')})"
CLICK = """()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();if(!d)return null;
 const pick=d.querySelector('[data-comic-next],[data-next],[data-notice-ok],[data-close],button.gold,.comic-next,button');
 if(pick&&!pick.disabled){const t=pick.textContent.trim().slice(0,24);pick.click();return t}return null}"""
with sync_playwright() as p:
    b, c, pg, errs, t0 = ev.boot(p, 390, 844, 1, False, None)
    print('setup', pg.evaluate(SETUP[which])); pg.wait_for_timeout(800)
    pg.evaluate("()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close())"); pg.wait_for_timeout(500)
    print('verdict', pg.evaluate(JUDGE[which])); shot = 0; last = None
    for i in range(70):
        pg.wait_for_timeout(700); s = pg.evaluate(STATE); k = json.dumps(s, ensure_ascii=False)
        if k != last:
            last = k; print(i, k[:230]); pg.screenshot(path=str(out / f'{which}-{shot:02d}.png')); shot += 1
        if s['battle']: break
        pg.evaluate(CLICK)
    print('errors', errs[:4]); c.close(); b.close()
