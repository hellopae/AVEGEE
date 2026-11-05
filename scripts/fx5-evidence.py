#!/usr/bin/env python3
"""Z1-FX5 evidence (390x844 clips + wide stills). Re-uses the helpers of scene-fx-evidence.py.
  BASE=http://127.0.0.1:8951/index.html CH=chromium python3 scripts/fx5-evidence.py clips|stills <outdir>"""
import importlib.util, os, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
TAB = "()=>[...document.querySelectorAll('.actor-segment')].find(b=>b.textContent.trim().startsWith('พลัง'))?.click()"
KO = "()=>{G.battle.youHp=0}"; REVIVE = "()=>{G.battle.youHp=60}"
def cut(webm, start, out, secs=12.5):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{start - .2:.2f}', '-i', str(webm), '-t', str(secs), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '30', '-r', '24', '-movflags', '+faststart', '-an', str(out)], check=True)
def clip(out, name, setup, act, w=390, h=844):
    tmp = out / ('_' + name); tmp.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser, ctx, pg, errs, t0 = ev.boot(p, w, h, 1, False, tmp)
        pg.add_style_tag(content='#town-map-panel,.fabs,#res{visibility:hidden}')
        setup(pg); start = time.time() - t0; act(pg)
        ctx.close(); browser.close()
    webm = next(tmp.glob('*.webm')); cut(webm, start, out / f'{name}.mp4'); webm.unlink(); tmp.rmdir(); print(name, errs[:2], flush=True)
def clips(out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    clip(out, '01-battle-volcano-shadow-lava', lambda pg: ev.open_scene(pg, ev.SCENES['01-battle-volcano']), lambda pg: pg.wait_for_timeout(12500))
    clip(out, '02-interrogation-zone1', lambda pg: ev.open_scene(pg, ev.SCENES['06-interrogation-zone1']), lambda pg: pg.wait_for_timeout(12500))
    clip(out, '03-battle-border', lambda pg: ev.open_scene(pg, ev.SCENES['04-battle-border']), lambda pg: pg.wait_for_timeout(12500))
    def ko(pg):
        pg.wait_for_timeout(2500); pg.evaluate(KO); pg.evaluate(TAB); pg.wait_for_timeout(4500); pg.evaluate(REVIVE); pg.evaluate(TAB); pg.wait_for_timeout(5000)
    clip(out, '04-ko-fall-and-rise', lambda pg: ev.open_scene(pg, ev.SCENES['01-battle-volcano']), ko)
    def bridge(pg):
        x, y = 700, 990
        for k in range(120):
            pg.evaluate("([x,y])=>{G.player.x=x;G.player.y=y;G.player.tx=x;G.player.ty=y;}", [x + 220 * k / 120, y]); pg.wait_for_timeout(100)
    clip(out, '05-map-lava-bridge-no-rails-no-trees', lambda pg: (pg.evaluate("()=>{G.player.x=700;G.player.y=990;G.player.tx=700;G.player.ty=990}"), pg.wait_for_timeout(2500)), bridge)
def stills(out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        for name, tag in {'01-battle-volcano': 'volcano', '04-battle-border': 'border', '06-interrogation-zone1': 'arena'}.items():
            browser, ctx, pg, errs, _ = ev.boot(p, 960, 540, 1, False)
            ev.open_scene(pg, ev.SCENES[name]); pg.wait_for_timeout(3000)
            pg.add_style_tag(content='.battle-command-dock,.battle-timeline,.battle-team-hud,.battle-boss-hud,.fig,.battle-squad,.ttl,.icon-settings-mini,.battle-pause,.hud-body,.hud-bottom,.hud-scrim{visibility:hidden!important}')
            for k in range(3): pg.wait_for_timeout(2500); pg.screenshot(path=str(out / f'after-{tag}-{k}.png'))
            browser.close(); print(tag, errs[:2], flush=True)
if __name__ == '__main__': {'clips': clips, 'stills': stills}[sys.argv[1]](sys.argv[2])
