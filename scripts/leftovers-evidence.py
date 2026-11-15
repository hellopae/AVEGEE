#!/usr/bin/env python3
"""LEFTOVERS evidence (15 Nov 2569): opens a spirit fight in the real game at 390x844 (Chromium / Playwright), wins it and saves the profile card
(bottom right) before and after the win, so the scared card can be seen.   Also shows the interrogation room Yama (blink frames).
  python3 scripts/serve-nocache.py 8977 &
  BASE=http://127.0.0.1:8977/index.html CH=chromium python3 scripts/leftovers-evidence.py <outdir> [card|yama]
The save is a fresh in-memory slot; the fight is opened through the game's own battle window (kind switched for one repaint, then put back)."""
import importlib.util, sys, os, json
from pathlib import Path
from playwright.sync_api import sync_playwright
os.environ.setdefault('BASE', 'http://127.0.0.1:8977/index.html')
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
MODE = sys.argv[2] if len(sys.argv) > 2 else 'card'
# zone, case key (decides the archetype), what the card must show
CARDS = [('th', 'pol'), ('th', 'recruit'), ('asia', 'pol'), ('west', 'pol'), ('cyberhell', 'pol')]
SETUP = """async ([zone, key]) => {
  G.zone = zone; G.level = 3; G.hpMax = G.hp = 400; G.mpMax = G.mp = 60;
  G.spawnSoul(); const s = G.queue[0]; s.case = key; s.resist = true; s.back = null; s.pure = false;
  const b = G.startBattle(s); if (!b) return 'nobattle';
  b.kind = 'yama'; G.onChange(); return s.sp + ' / ' + s.id;
}"""
CARD = """()=>{ const i = document.querySelector('dialog[open] .battle-boss-hud img'); return i ? i.getAttribute('src') : null }"""
with sync_playwright() as p:
    for zone, key in (CARDS if MODE == 'card' else []):
        b, c, pg, errs, t0 = ev.boot(p, 390, 844, 1, False)
        try:
            r = pg.evaluate(SETUP, [zone, key]); print(zone, key, r, flush=True); pg.wait_for_timeout(2500)
            pg.evaluate("()=>{ G.battle.kind = 'soul' }")
            for _ in range(3): pg.evaluate("()=>{document.querySelector('dialog[open] .battle-intro, dialog[open] [data-battle-start]')?.click()}"); pg.wait_for_timeout(300)
            before = pg.evaluate(CARD); pg.screenshot(path=str(out / f'{zone}-{key}-1-before.png'))
            ev_ = pg.evaluate("()=>{for(const f of G.battle.foes){f.hp=Math.min(f.hp,1);f.atk=[0,0]}}")
            for _ in range(30):
                if not pg.evaluate("()=>!!G.battle&&!G.battle.over"): break
                pg.evaluate("""()=>{const b=document.querySelector('dialog[open] .actor-segment[data-primary-action]');if(b&&!b.disabled)b.click()}"""); pg.wait_for_timeout(350)
                pg.evaluate("""()=>{const f=[...document.querySelectorAll('dialog[open] [data-foe-id]')].find(e=>e.getAttribute('aria-disabled')!=='true');if(f)f.click()}"""); pg.wait_for_timeout(2500)
                pg.evaluate("()=>{if(G.battle){for(const f of G.battle.foes){f.atk=[0,0]}}}")
            pg.wait_for_timeout(800)
            after = pg.evaluate(CARD); over = pg.evaluate("()=>G.battle?.over"); pg.screenshot(path=str(out / f'{zone}-{key}-2-after.png'))
            print('  before', before, '| after', after, '| over', over, '| errors', errs, flush=True)
        finally:
            c.close(); b.close()

# ---- trial mode: Yama blink steadiness (interrogation room) + a Cyberhell press pose ----------------------------------------------------
if MODE == 'trial':
    import io
    from PIL import Image, ImageChops
    PREP = """async ([zone, key]) => {
      const sp = await import('./src/soul-portraits.js'); G.zone = zone; G.level = 3; G.spawnSoul(); const s = G.queue[0];
      s.case = key; s.back = null; s.presses = 3; sp.applySoulPortrait(s, zone); G.cancelCourtArrival && G.cancelCourtArrival(s.id); G.onChange();
      return [s.sp, G.caseReady(s)]; }"""
    with sync_playwright() as p:
        for zone, key, tag in [z for z in [('th', 'pol', 'th'), ('asia', 'pol', 'asia'), ('west', 'pol', 'west'), ('cyberhell', 'lord', 'cyber')] if z[2] in os.environ.get('ZONES', 'th,asia,west,cyber').split(',')]:
            b, c, pg, errs, t0 = ev.boot(p, 390, 844, 1, False)
            try:
                print(tag, pg.evaluate(PREP, [zone, key]), flush=True); pg.wait_for_timeout(1200)
                pg.evaluate("()=>document.querySelector('#hud-trial').click()"); pg.wait_for_timeout(2500)
                pg.evaluate("()=>{const b=[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent.includes('เข้าใจแล้ว'));b&&b.click()}"); pg.wait_for_timeout(2500)
                for _ in range(5):   # the first-time tips (1/3 ...): next / close until none is left
                    pg.evaluate("()=>{const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&/^(ถัดไป|เสร็จ|ปิด|เข้าใจ)/.test(b.textContent.trim())&&b.closest('[class*=tip],[class*=tour],[class*=coach],[role=dialog],div'));b&&b.click()}"); pg.wait_for_timeout(500)
                print(' figs', pg.evaluate("()=>[...document.querySelectorAll('.trial-hud .hud-stage .fig')].map(f=>f.className+' '+(f.querySelector('img')?.getAttribute('src')||'').slice(0,40)+' '+(f.querySelector('img')?.dataset.yamaIdleFrame))"), flush=True)
                pg.screenshot(path=str(out / f'{tag}-trial-1.png'))
                # Yama: the four frames the game composes for the room (after its own whole-pixel registration): where do they differ from the standing frame?
                res = pg.evaluate("""async()=>{const im=document.querySelector('.trial-hud .hud-stage .fig.you img'); const u=im&&im._yamaIdle; if(!u) return null;
                  const px=[]; for(const url of u){const i=new Image(); i.src=url; await i.decode(); const c=document.createElement('canvas'); c.width=i.naturalWidth; c.height=i.naturalHeight;
                    const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(i,0,0); px.push(x.getImageData(0,0,c.width,c.height).data);}
                  const w=px[0].length/4, W=u.length&&(await (async()=>{const i=new Image(); i.src=u[0]; await i.decode(); return i.naturalWidth})()); const out=[];
                  for(let f=1;f<px.length;f++){let n=0,x0=1e9,y0=1e9,x1=-1,y1=-1; for(let k=0;k<w;k++){let d=0; for(let j=0;j<4;j++) d|=px[0][k*4+j]!==px[f][k*4+j]; if(d){n++;const X=k%W,Y=(k/W)|0; x0=Math.min(x0,X);x1=Math.max(x1,X);y0=Math.min(y0,Y);y1=Math.max(y1,Y);}} out.push({frame:f,diffPixels:n,bbox:n?[x0,y0,x1,y1]:null});}
                  return {size:[W,w/W],timing:'0,2,0,1',frames:out}}""")
                print(' yama frames', json.dumps(res), flush=True)
                # screenshots of the room at pose 0 / 2 / 1 (the game's own blink: wait for the matching frame number)
                for want in ('2', '1'):
                    for _ in range(300):
                        if pg.evaluate("()=>document.querySelector('.trial-hud .hud-stage .fig.you img')?.dataset.yamaIdleFrame") == want: break
                        pg.wait_for_timeout(15)
                    pg.screenshot(path=str(out / f'{tag}-trial-yama-pose{want}.png'))
                # a pressed line on the spirit: the pose file the figure shows
                src = pg.evaluate("""()=>{const l=[...document.querySelectorAll('dialog[open] [data-line]')].find(e=>!e.disabled&&e.className.includes('deny')) || document.querySelector('dialog[open] [data-line]:not(:disabled)'); if(!l) return 'noline'; l.click(); return 'clicked'}""")
                pg.wait_for_timeout(450)
                pg.screenshot(path=str(out / f'{tag}-trial-3-pressed-now.png'))
                print(' press', src, 'foe img', pg.evaluate("()=>document.querySelector('.fig.foe img')?.getAttribute('src')"), flush=True)
                pg.screenshot(path=str(out / f'{tag}-trial-2-press.png')); print(' errors', errs, flush=True)
            finally:
                c.close(); b.close()
