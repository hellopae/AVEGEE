#!/usr/bin/env python3
"""SCENE-FX evidence: drives the real game in Chromium (Playwright) at 390x844.

  clips <outdir>         12.5 s clips of the battle + interrogation scenes (zone 1 four battles + cave + interrogation, zone 3 snow, zone 4 rain + lightning)
  fps <desktop|mobile>   rAF rate of the scenes with the weather layer on / off, idle and while a skill is cast (THROTTLE=4 = CPU 4x slower)
  holes                  the sky canvas is transparent over name plates / hit points and over a damage number
  ab <outdir>            picture pairs: weather switch off / on, desktop width, no figures

  python3 /path/to/threaded-nocache-server 8951 &       (a single-threaded server stalls Chromium)
  BASE=http://127.0.0.1:8951/index.html CH=chromium python3 scripts/scene-fx-evidence.py clips docs/art-reviews/2026-11-05-scene-fx
The save is a fresh in-memory slot. A battle is opened the way the player does it: a raider on the map next to the hero and the "fight" button.
"""
import json, os, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:8951/index.html')
CH = os.environ.get('CH') or None
SETW = "async(on)=>{const m=await import('./src/map-ambient.js?v=mapfx-k1d');m.setWeatherEnabled(on)}"
FPS = """async(ms)=>new Promise(res=>{const ts=[];function f(t){ts.push(t);if(t-ts[0]<ms)requestAnimationFrame(f);else{const d=[];for(let i=1;i<ts.length;i++)d.push(ts[i]-ts[i-1]);d.sort((a,b)=>a-b);res({fps:+((ts.length-1)/((ts[ts.length-1]-ts[0])/1000)).toFixed(1),p95:+d[Math.floor(d.length*.95)].toFixed(1),max:+d[d.length-1].toFixed(1)})}}requestAnimationFrame(f)})"""
CAST = """()=>{G.mp=G.mpMax||99;const find=t=>[...document.querySelectorAll('.actor-segment,.orb-choice')].find(b=>b.offsetParent&&b.textContent.trim().startsWith(t));
 find('พลัง')?.click();setTimeout(()=>{const f=find('ลูกไฟ');f&&f.click()},350);
 setTimeout(()=>{document.querySelector('.cam-world [data-foe-id]')?.click()},900);
 setTimeout(()=>{document.querySelector('.cam-world [data-foe-id]')?.click()},1500)}"""
# name: (hero x, y, sceneBiome, zone, kind)   hero position decides the zone-1 picture (volcano x<1250, ice x>3000 & y<1100, forest x>2650 & y>1450)
SCENES = {
    '01-battle-volcano': (600, 900, '', None, 'battle'),
    '02-battle-ice': (3300, 900, '', None, 'battle'),
    '03-battle-forest': (3000, 1800, '', None, 'battle'),
    '04-battle-border': (600, 900, 'border', None, 'battle'),
    '05-battle-cave': (600, 900, 'cave', None, 'battle'),
    '06-interrogation-zone1': (600, 900, '', None, 'trial'),
    '07-battle-zone3-snow': (600, 900, '', 'west', 'battle'),
    '08-interrogation-zone3-snow': (600, 900, '', 'west', 'trial'),
    '09-battle-zone4-rain-lightning': (600, 900, '', 'cyberhell', 'battle'),
    '10-interrogation-zone4-rain-lightning': (600, 900, '', 'cyberhell', 'trial'),
}


def boot(p, w=390, h=844, dpr=1, mobile=False, video=None):
    browser = p.chromium.launch(channel=CH, args=['--autoplay-policy=no-user-gesture-required'])
    kw = dict(viewport={'width': w, 'height': h}, device_scale_factor=dpr, is_mobile=mobile, has_touch=mobile)
    if video: kw.update(record_video_dir=str(video), record_video_size={'width': w, 'height': h})
    ctx = browser.new_context(**kw); pg = ctx.new_page(); errs = []; t0 = time.time()
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console.error: ' + m.text) if m.type == 'error' else None)
    pg.on('requestfailed', lambda r: errs.append('requestfailed: ' + r.url) if not r.url.startswith('blob:') else None)
    pg.goto(BASE); pg.wait_for_timeout(3000)
    try: pg.click('#enter-gate button', timeout=1500)
    except Exception: pass
    pg.wait_for_timeout(500); pg.click('#splash-skip'); pg.wait_for_timeout(2000)
    pg.click('#t-start'); pg.wait_for_timeout(1500); pg.click('text=SLOT 1'); pg.wait_for_timeout(2500)
    pg.click('#intro-skip'); pg.wait_for_timeout(1500)
    for _ in range(8):
        n = pg.evaluate("()=>{const ds=[...document.querySelectorAll('dialog[open]')];ds.forEach(d=>d.close());return ds.length}")
        pg.wait_for_timeout(300)
        if not n: break
    return browser, ctx, pg, errs, t0


def to_zone(pg, zone):
    if not zone: return
    pg.evaluate("z=>{G.zone=z}", zone); pg.wait_for_timeout(2500)       # the zone story alert pops up on arrival: close it
    for _ in range(3):
        pg.evaluate("()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close())"); pg.wait_for_timeout(600)


def open_battle(pg, x, y, biome='', zone=None):
    to_zone(pg, zone)
    pg.evaluate("([x,y])=>{G.player.x=x;G.player.y=y;G.player.tx=x;G.player.ty=y;}", [x, y]); pg.wait_for_timeout(600)
    pg.evaluate("b=>{if(!G.__wrapped){const o=G.startMobBattle.bind(G);G.startMobBattle=i=>{const r=o(i);if(r&&window.__biome)r.sceneBiome=window.__biome;return r};G.__wrapped=1}window.__biome=b}", biome or '')
    pg.evaluate("([x,y])=>{G.mobs.push({id:777+G.mobs.length,x,y,hp:30,kind:0});G.onChange()}", [x, y]); pg.wait_for_timeout(500)
    pg.evaluate("()=>{const b=document.querySelector('#fab-atk');b.hidden=false;b.click()}"); pg.wait_for_timeout(3500)


def open_trial(pg, zone=None):
    to_zone(pg, zone)
    pg.evaluate("""async()=>{const d=await import('./src/data.js');const def=d.STATIONS.find(s=>s.k==='krata');
      if(!G.stations.some(s=>s.def.k==='krata'))G.stations.push({def,slots:[],crewK:null,intensity:3,build:0,buildWait:false,repair:0,repairWait:false,arrivalElapsed:0,fire:0,speedLv:0,capLv:0,fuelLv:0,mgCd:0});
      for(const k of ['trial-calculation','interrogation-traits'])if(!G.taught.includes(k))G.taught.push(k);
      if(!G.queue.length)G.spawnSoul();G.courtArrivals=[];G.onChange();}""")
    pg.wait_for_timeout(800); pg.evaluate("()=>document.querySelector('#hud-trial').click()"); pg.wait_for_timeout(3000)


def open_scene(pg, spec):
    x, y, biome, zone, kind = spec
    if kind == 'battle': open_battle(pg, x, y, biome, zone)
    else: open_trial(pg, zone)


def clips(out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    for name, spec in SCENES.items():
        if os.environ.get('ONLY') and os.environ['ONLY'] not in name: continue
        tmp = out / ('_' + name); tmp.mkdir(exist_ok=True)
        with sync_playwright() as p:
            browser, ctx, pg, errs, t0 = boot(p, 390, 844, 1, False, tmp)
            open_scene(pg, spec); start = time.time() - t0
            for k in range(125):
                if name == '01-battle-volcano' and k == 30: pg.evaluate(CAST)          # a heavy skill in the middle of the clip
                pg.wait_for_timeout(100)
            st = pg.evaluate("()=>[...document.querySelectorAll('canvas.scene-atmosphere:not(.scene-atmosphere-ground)')].map(c=>({...c.dataset}))")
            ctx.close(); browser.close()
        webm = next(tmp.glob('*.webm'))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{start - 0.2:.2f}', '-i', str(webm), '-t', '12.5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '30', '-r', '24', '-movflags', '+faststart', '-an', str(out / f'{name}.mp4')], check=True)
        webm.unlink(); tmp.rmdir()
        print(name, st, [e for e in errs][:3], flush=True)


def fps(kind):
    w, h, dpr, mobile = (1280, 800, 1, False) if kind == 'desktop' else (390, 844, 3, True)
    res = {}
    with sync_playwright() as p:
        for name in ('01-battle-volcano', '02-battle-ice', '07-battle-zone3-snow', '09-battle-zone4-rain-lightning'):
            browser, ctx, pg, errs, _ = boot(p, w, h, dpr, mobile)
            cdp = ctx.new_cdp_session(pg)
            if os.environ.get('THROTTLE'): cdp.send('Emulation.setCPUThrottlingRate', {'rate': float(os.environ['THROTTLE'])})
            open_scene(pg, SCENES[name]); pg.wait_for_timeout(1500); r = {}
            pg.evaluate(SETW, False); pg.evaluate(CAST); pg.wait_for_timeout(9000)      # warm-up cast (first-time decode of the skill pictures would otherwise count against the first pass)
            for on in (True, False):
                pg.evaluate(SETW, on); pg.wait_for_timeout(700)
                idle = pg.evaluate(FPS, 4000); pg.evaluate(CAST); heavy = pg.evaluate(FPS, 9000)
                r['on' if on else 'off'] = {'idle': idle, 'skill': heavy}; pg.wait_for_timeout(500)
            res[name] = r; print(name, json.dumps(r), errs[:2], flush=True); browser.close()
    return res


def holes():
    """The sky canvas (cloud shadow + rain / snow) must be transparent over a damage number and over the name tags of the interrogation scene."""
    probe = """(sel)=>{const cv=document.querySelector('canvas.scene-atmosphere:not(.scene-atmosphere-ground):not(.scene-fluid)');const cb=cv.getBoundingClientRect();const k=cv.width/cb.width;const g=cv.getContext('2d');const out=[];
      for(const el of document.querySelectorAll(sel)){const r=el.getBoundingClientRect();if(!(r.width>4&&r.height>4))continue;
        const x=Math.round((r.left-cb.left)*k),y=Math.round((r.top-cb.top)*k),w=Math.round(r.width*k),h=Math.round(r.height*k);
        const d=g.getImageData(Math.max(0,x),Math.max(0,y),Math.max(1,w),Math.max(1,h)).data;let a=0;for(let i=3;i<d.length;i+=4)a=Math.max(a,d[i]);
        const e=g.getImageData(Math.max(0,x-14),Math.max(0,y-14),Math.max(1,w+28),Math.max(1,h+28)).data;let n=0;for(let i=3;i<e.length;i+=4)if(e[i]>10)n++;
        out.push({cls:el.className,w,h,maxAlphaInside:a,coveredPixelsAround:n})}
      return out}"""
    res = {}
    with sync_playwright() as p:
        browser, ctx, pg, errs, _ = boot(p, 390, 844, 1, False)
        open_battle(pg, 600, 900, '', 'cyberhell'); pg.wait_for_timeout(2500)
        pg.evaluate("""()=>{const f=document.querySelector('.cam-world .fig.foe');const s=document.createElement('span');s.className='dmg foe';s.textContent='-12';f.append(s)}""")
        pg.wait_for_timeout(900); res['battle_damage_number'] = pg.evaluate(probe, '.cam-world .dmg')
        pg.evaluate("()=>{G.battle=null;document.querySelectorAll('dialog[open]').forEach(d=>d.close())}"); pg.wait_for_timeout(1200)
        open_trial(pg); pg.wait_for_timeout(1500); res['trial_name_tags'] = pg.evaluate(probe, '.cam-world .nm')
        print(json.dumps(res)); browser.close()


def ab(out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    names = {'01-battle-volcano': 'volcano', '02-battle-ice': 'ice', '03-battle-forest': 'forest', '04-battle-border': 'border', '05-battle-cave': 'cave', '06-interrogation-zone1': 'arena'}
    with sync_playwright() as p:
        for name, tag in names.items():
            browser, ctx, pg, errs, _ = boot(p, 1280, 800, 1, False)
            open_scene(pg, SCENES[name]); pg.wait_for_timeout(2500)
            pg.add_style_tag(content='.battle-command-dock,.battle-timeline,.battle-team-hud,.battle-boss-hud,.fig,.battle-squad,.ttl,.icon-settings-mini,.battle-pause,.hud-body,.hud-bottom,.hud-scrim{visibility:hidden!important}')
            pg.wait_for_timeout(500); pg.screenshot(path=str(out / f'ab-{tag}-on.png'))
            pg.evaluate(SETW, False); pg.wait_for_timeout(900); pg.screenshot(path=str(out / f'ab-{tag}-off.png')); pg.evaluate(SETW, True)
            print(tag, errs[:2], flush=True); browser.close()


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'clips': clips(sys.argv[2])
    elif cmd == 'fps': print(json.dumps(fps(sys.argv[2])))
    elif cmd == 'holes': holes()
    elif cmd == 'ab': ab(sys.argv[2])
