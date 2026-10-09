import sys, json
from playwright.sync_api import sync_playwright
W=int(sys.argv[1]); H=int(sys.argv[2]); dsf=float(sys.argv[3]); headed=sys.argv[4]=='1'; zone=sys.argv[5]; tag=sys.argv[6]
import os; BASE=os.environ.get('BASE','http://localhost:8791')
JS = """
async ([zone]) => {
  const fr = await import('/src/frontier.js');
  const th = await import('/src/theme-assets.js');
  G.zone = zone;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  const cv = document.createElement('canvas');
  cv.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:99999';
  document.body.appendChild(cv);
  const log=[]; window.__log=log;
  const orig = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function(im, ...a){
    if (im && im.src && /walk-4dir/.test(im.src) && a.length===8) log.push({t:performance.now(), sx:a[0], sy:a[1], dx:a[4], dy:a[5], h:a[7], px:(window.__P||{}).x, py:(window.__P||{}).y});
    return orig.call(this, im, ...a);
  };
  const FW = fr.makeFrontierWalk(cv, G, {bg: th.themeBackground(zone,'frontier'), kinds:[], wave:1, alive:()=>true, fab:null, gate:null, nira:null});
  window.__FW = FW; window.__P = fr.frontierSession(zone).player; window.__cv = cv;
  FW.start();
  return th.themeBackground(zone,'frontier');
}
"""
with sync_playwright() as p:
    b=p.chromium.launch(headless=not headed, args=['--enable-gpu-rasterization'] if headed else [])
    import time; T0=time.time()
    ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=dsf, **({'record_video_dir':os.environ['FILM'],'record_video_size':{'width':W,'height':H}} if os.environ.get('FILM') else {}))
    pg=ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(BASE+'/index.html',wait_until='commit',timeout=120000)
    pg.wait_for_function("typeof window.G!=='undefined' && document.querySelector('#t-new')", timeout=120000)
    pg.wait_for_timeout(1500)
    print('bg', pg.evaluate(JS,[zone]))
    pg.wait_for_timeout(2500)
    # rAF cadence idle
    cad = pg.evaluate("""() => new Promise(r=>{const ts=[];function f(t){ts.push(t); if(ts.length<120) requestAnimationFrame(f); else r(ts)} requestAnimationFrame(f)})""")
    d=[b-a for a,b in zip(cad,cad[1:])]
    print('idle rAF mean ms %.1f max %.1f'%(sum(d)/len(d),max(d)))
    # walk: hold D for 2s via keyboard
    pg.keyboard.down('a'); pg.wait_for_timeout(1500); pg.keyboard.up('a'); pg.wait_for_timeout(500)
    pg.evaluate("window.__log.length=0")
    print('WALK_AT', round(time.time()-T0,2)); pg.keyboard.down('d'); pg.wait_for_timeout(2500); pg.keyboard.up('d')
    log=pg.evaluate("window.__log")
    print('frames drawn', len(log))
    json.dump(log, open(SP_OUT:=f"log_front_{tag}.json",'w'))
    if len(log)>2:
        ts=[l['t'] for l in log]; d=[b-a for a,b in zip(ts,ts[1:])]
        print('draw interval mean %.1f max %.1f -> fps %.1f'%(sum(d)/len(d),max(d),1000/(sum(d)/len(d))))
        print('frames seq', [ (l['sx']) for l in log][:40])
        dist=(log[-1]['dx']-log[0]['dx']); print('dx total', dist, 'speed px/s', dist/((ts[-1]-ts[0])/1000))
    print('errs',errs[:3])
    ctx.close(); b.close()
