import json,sys,statistics
def summarize(path,dsf):

    log=json.load(open(path))
    if len(log)<8: return {'n':len(log)}
    ts=[l['t'] for l in log]
    d=[b-a for a,b in zip(ts,ts[1:])]
    # moving horizontally: dx changes
    n=len(log); mid=log[int(n*.2):int(n*.8)]
    dd=[b['t']-a['t'] for a,b in zip(mid,mid[1:])]
    dxs=(mid[-1]['dx']-mid[0]['dx'])/ ((mid[-1]['t']-mid[0]['t'])/1000)
    hero=statistics.median(l['h'] for l in log)
    fr=[l['sx']+l['sy']*10000 for l in mid]
    ch=[mid[i]['t'] for i in range(1,len(mid)) if fr[i]!=fr[i-1]]
    hold=[b-a for a,b in zip(ch,ch[1:])]
    extra={}
    if log[0].get('px') is not None:
        import math
        # world speed: needs scene scale. image 1678x937 'cover' on viewport -> passed via env
        import os
        W=float(os.environ['VW'])*dsf; H=float(os.environ['VH'])*dsf
        s=max(W/1678,H/937); bw=1678*s; bh=937*s
        m=mid; dt=(m[-1]['t']-m[0]['t'])/1000
        dist=math.hypot((m[-1]['px']-m[0]['px'])*bw,(m[-1]['py']-m[0]['py'])*bh)
        extra={'world_speed_hero_heights_s':round(dist/dt/hero,2),'world_speed_css_px_s':round(dist/dt/dsf)}
    return {**extra,'draws':n,'fps_median':round(1000/statistics.median(dd),1),'interval_p95_ms':round(sorted(dd)[int(len(dd)*.95)],1),'interval_max_ms':round(max(dd),1),
            'speed_css_px_s':round(abs(dxs)/dsf,0),'hero_css_px':round(hero/dsf,0),'speed_hero_heights_s':round(abs(dxs)/hero,2),
            'frame_hold_ms_median':round(statistics.median(hold),0) if hold else None}
if __name__=='__main__':
    print(summarize(sys.argv[1],float(sys.argv[2])))
