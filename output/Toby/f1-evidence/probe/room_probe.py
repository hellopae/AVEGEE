import sys, json
from playwright.sync_api import sync_playwright
W=int(sys.argv[1]); H=int(sys.argv[2]); dsf=float(sys.argv[3]); headed=sys.argv[4]=='1'
zone=sys.argv[5]; k=sys.argv[6]; tag=sys.argv[7] if len(sys.argv)>7 else 'x'
import os; BASE=os.environ.get('BASE','http://localhost:8791')
JS = """
async ([zone,k]) => {
  const rm = await import('/src/room.js');
  const raa = await import('/src/room-art-assets.js');
  const data = await import('/src/data.js');
  G.zone = zone;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  const def = data.STATIONS.find(d=>d.k===k);
  const room = raa.wideStationRoom(zone,k) || data.ROOMS[k] || data.ROOM_DEFAULT;
  const bg = raa.wideStationRoom(zone,k)?.image;
  const cv = document.createElement('canvas');
  cv.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:99999';
  document.body.appendChild(cv);
  const log=[]; window.__log=log;
  const orig = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function(im, ...a){
    if (im && im.src && /walk-4dir/.test(im.src) && a.length===8) log.push({t:performance.now(), sx:a[0], sy:a[1], dx:a[4], dy:a[5], h:a[7]});
    return orig.call(this, im, ...a);
  };
  const R = rm.makeRoom(cv, G, def, room, bg, 'img/BG-Turn-Base.webp', ()=>true);
  window.__R=R; R.start();
  return [bg, JSON.stringify(R.pos())];
}
"""
with sync_playwright() as p:
    b=p.chromium.launch(headless=not headed)
    import time; T0=time.time()
    ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=dsf, **({'record_video_dir':os.environ['FILM'],'record_video_size':{'width':W,'height':H}} if os.environ.get('FILM') else {}))
    pg=ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(BASE+'/index.html',wait_until='commit',timeout=120000)
    pg.wait_for_function("typeof window.G!=='undefined' && document.querySelector('#t-new')", timeout=120000)
    pg.wait_for_timeout(1500)
    print('room', pg.evaluate(JS,[zone,k]))
    pg.wait_for_timeout(3000)
    pg.keyboard.down('a'); pg.wait_for_timeout(1500); pg.keyboard.up('a'); pg.wait_for_timeout(500)
    pg.evaluate("window.__log.length=0")
    print('WALK_AT', round(time.time()-T0,2)); pg.keyboard.down('d'); pg.wait_for_timeout(2500); pg.keyboard.up('d')
    log=pg.evaluate("window.__log")
    print('frames drawn', len(log), 'pos', pg.evaluate("JSON.stringify(__R.pos())"))
    json.dump(log, open(f"log_room_{tag}.json",'w'))
    if len(log)>2:
        ts=[l['t'] for l in log]; d=[b-a for a,b in zip(ts,ts[1:])]
        print('draw interval mean %.1f max %.1f -> fps %.1f'%(sum(d)/len(d),max(d),1000/(sum(d)/len(d))))
        print('frames seq', [ (l['sx']) for l in log][:60])
    print('errs',errs[:3])
    pg.screenshot(path=f'room_{tag}.png')
    ctx.close(); b.close()
