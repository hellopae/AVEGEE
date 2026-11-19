#!/usr/bin/env python3
"""T6/4 evidence: Lian Gang's talk at the harbor (first words, "let me prepare first", later tap, "I am ready" -> the gift scene -> receipt + NL-3 + NL-4), at 390x844 and 360x800.
  BASE=http://127.0.0.1:8962/index.html CH=chromium python3 scripts/t6-harbor-evidence.py <outdir>"""
import importlib.util, sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
STATE = "()=>({zone:G.zone,coin:G.coin,outfits:G.outfitsOwned,story:G.storyQueue.map(s=>s.key),notices:G.notices,waiting:G.bossGuideWaiting(),follow:!!G.bossGuideFollowing(),unlocked:Object.keys(G.magic.unlocked),dlg:[...document.querySelectorAll('dialog[open]')].map(d=>d.className||d.id).join('|')})"
SETUP = """async()=>{G.hpMax=G.hp=400;G.coin=1000;G.zone='asia';G.giveLamp();G.bossCleared.asia=true;G.notices=[];G.bossGuides=null;
 const bg=await import('./src/boss-guides.js');bg.recordBossGuideWin(G,{over:'win',zone:'asia',kind:'zoneBoss'});G.onChange();return G.bossGuideWaiting()}"""
CLICK = "()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();if(!d)return;const p=d.querySelector('[data-fin],[data-comic-next],[data-story-next],[data-notice-ok],[data-close],button.gold');p&&!p.disabled&&p.click()}"
for (w, h) in [(390, 844), (360, 800)]:
    with sync_playwright() as p:
        b, c, pg, errs, t0 = ev.boot(p, w, h, 1, False, None)
        print(w, 'setup', pg.evaluate(SETUP)); pg.evaluate("()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close())"); pg.wait_for_timeout(500)
        pg.evaluate("()=>window.__bossPier()"); pg.wait_for_timeout(700); pg.screenshot(path=str(out / f'h{w}-1-talk.png'))
        pg.evaluate("()=>document.querySelector('[data-yomathat-wait]').click()"); pg.wait_for_timeout(500); pg.screenshot(path=str(out / f'h{w}-2-wait.png'))
        pg.evaluate("()=>document.querySelector('[data-close]')?.click()"); pg.wait_for_timeout(400)
        pg.evaluate("()=>window.__bossPier()"); pg.wait_for_timeout(700); pg.screenshot(path=str(out / f'h{w}-3-again.png'))
        pg.evaluate("()=>document.querySelector('[data-yomathat-go]').click()"); pg.wait_for_timeout(1200)
        last = None
        for i in range(40):
            pg.wait_for_timeout(500); s = pg.evaluate(STATE); k = json.dumps(s, ensure_ascii=False)
            if k != last: last = k; print(w, i, k[:300]); pg.screenshot(path=str(out / f'h{w}-4-{i:02d}.png'))
            pg.evaluate(CLICK)
            if s['follow'] and not s['story'] and not s['notices'] and not s['dlg']: break
        print(w, 'errors', len(errs), errs[:2]); c.close(); b.close()
