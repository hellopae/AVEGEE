#!/usr/bin/env python3
"""KO-CREW evidence: crew fall mid-battle and stay lying; the battle ends; they walk to the tea house.
  BASE=http://127.0.0.1:8951/index.html CH=chromium python3 scripts/ko-crew-evidence.py <outdir>"""
import importlib.util, subprocess, sys, time, json
from pathlib import Path
from playwright.sync_api import sync_playwright
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True); tmp = out / '_clip'; tmp.mkdir(exist_ok=True)
STATE = "()=>({battle:!!G.battle,fallen:G.battle?.fallen||null,actors:G.battleActors?G.battle?G.battleActors().map(a=>a.id):[]:[],crew:G.crew.filter(c=>!c.self).map(c=>({k:c.k,morale:Math.round(c.morale),recoverUntil:c.recoverUntil?Math.round((c.recoverUntil-Date.now())/1000):0,tea:c.teaRest?c.teaRest.phase:null}))})"
with sync_playwright() as p:
    b, c, pg, errs, t0 = ev.boot(p, 390, 844, 1, False, tmp)
    ev.open_scene(pg, ev.SCENES['01-battle-volcano']); start = time.time() - t0; log = []
    pg.wait_for_timeout(2500); log.append(('start', pg.evaluate(STATE)))
    pg.evaluate("()=>{const a=G.crew.find(c=>c.k==='taan');a.morale=0;G.downActor(a);G.onChange()}")
    pg.evaluate("()=>[...document.querySelectorAll('.actor-segment')].find(b=>b.textContent.trim().startsWith('พลัง'))?.click()")
    pg.wait_for_timeout(1800); pg.screenshot(path=str(out / 'fallen-in-scene.png')); log.append(('fell (battle still open)', pg.evaluate(STATE)))
    pg.wait_for_timeout(2500)
    pg.evaluate("()=>{G.battle.over='win'}"); pg.evaluate("()=>G.endBattle()"); pg.wait_for_timeout(500); log.append(('battle ended', pg.evaluate(STATE)))
    pg.evaluate("()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close())}")
    pg.evaluate("()=>{const a=G.crew.find(c=>c.k==='taan');const t=G.stations.find(s=>s.def.k==='tea');G.player.x=(t?.def.sx??t?.def.x)||G.player.x;G.player.y=((t?.def.sy??t?.def.y)||G.player.y)+60;G.player.tx=G.player.x;G.player.ty=G.player.y}")
    pg.wait_for_timeout(5000); pg.screenshot(path=str(out / 'tea-house.png')); log.append(('at the tea house', pg.evaluate(STATE)))
    ctx = c; ctx.close(); b.close()
print(json.dumps(log, ensure_ascii=False, indent=1)); print(errs[:3])
webm = next(tmp.glob('*.webm'))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{start - .2:.2f}', '-i', str(webm), '-t', '16', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '30', '-r', '24', '-movflags', '+faststart', '-an', str(out / 'ko-crew-fall-end-tea.mp4')], check=True)
webm.unlink(); tmp.rmdir()
