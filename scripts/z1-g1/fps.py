import sys,json,time
sys.path.insert(0,'.')
from boot import *
kind=sys.argv[1];out=sys.argv[2]
ROUTE=[(1862,1090),(1650,560),(1500,560),(1862,1090),(600,620),(540,900),(1862,1090),(3400,600),(3300,1250),(3380,1450),(2540,480),(1862,1090),(1860,1650)]
RAF="""()=>{const w=window.__w={last:performance.now(),max:0,stalls:0,frames:0,t0:performance.now(),d:[]};const loop=t=>{const d=t-w.last;w.last=t;w.frames++;w.d.push(d);if(d>w.max)w.max=d;if(d>100)w.stalls++;requestAnimationFrame(loop)};requestAnimationFrame(loop)}"""
W,H,DPR,mob=(1194,644,1,False) if kind=='desktop' else (390,844,2,True)
with sync_playwright() as p:
    b,pg,errs=boot(p,W,H,DPR,mob)
    try: pg.click('#town-zoom-less',timeout=1000)
    except Exception: pass
    pg.wait_for_timeout(800)
    look(pg,*ROUTE[0]);pg.evaluate(RAF);pg.wait_for_timeout(500);t0=time.time()
    for a,c in zip(ROUTE,ROUTE[1:]):
        dist=((c[0]-a[0])**2+(c[1]-a[1])**2)**.5;n=max(2,int(dist/210*10))
        for k in range(1,n+1):
            x=a[0]+(c[0]-a[0])*k/n;y=a[1]+(c[1]-a[1])*k/n
            pg.evaluate("([x,y])=>{G.player.x=x;G.player.y=y;G.player.tx=x;G.player.ty=y}",[x,y]);pg.wait_for_timeout(100)
    wv=pg.evaluate("()=>{const w=window.__w;const d=w.d.slice().sort((a,b)=>a-b);return {frames:w.frames,secs:(performance.now()-w.t0)/1000,max:w.max,stalls:w.stalls,p95:d[Math.floor(d.length*.95)],med:d[Math.floor(d.length*.5)]}}")
    res={'kind':kind,'fps':round(wv['frames']/wv['secs'],1),'median_ms':round(wv['med'],1),'p95_ms':round(wv['p95'],1),'worst_ms':round(wv['max']),'stalls_over_100ms':wv['stalls'],'secs':round(wv['secs']),'errors':errs[:4]}
    print(json.dumps(res));open(out,'a').write(json.dumps(res)+'\n');b.close()
