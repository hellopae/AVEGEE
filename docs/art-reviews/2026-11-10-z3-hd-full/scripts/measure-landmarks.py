"""One-pass local registration measurement at fixed, visually selected landmarks.

Anchors were selected on ORIGINAL tiles before measuring. No threshold-based retry,
point exclusion, or adjustment of output pixels. This samples outlines; it cannot
certify every point on a continuous cliff/bank/stair boundary.
"""
import json
import argparse
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parents[1]
ROOT = Path(__file__).resolve().parents[4]
ANCHORS = {
    'r1-c5': [('upper-waterfall-lip',382,187),('lower-waterfall-lip',366,365),('plaza-back-curb',407,528),('plaza-left-curb',127,578),('plaza-right-curb',641,602),('cliff-gothic-apex',605,342),('stair-centre',399,812),('stair-bottom',386,873),('path-bend',281,976)],
    'r2-c1': [('left-cliff-peak',140,270),('upper-terrace-bank',742,41),('right-terrace-bank',952,252),('front-terrace-edge',521,397),('upper-stair-centre',596,452),('stair-landing',706,536),('lower-stair-centre',744,629),('lower-plaza-left-bank',528,782),('lower-plaza-front',689,932)],
    'r2-c2': [('bridge-arch',142,270),('upper-waterfall-lip',352,570),('diagonal-stair-bottom',550,402),('diagonal-stair-top',742,280),('cliff-peak',491,88),('lower-waterfall-lip',342,650),('lower-bank',708,794),('paving-boundary',845,651)],
    'r2-c3': [('plaza-top-ring',322,70),('plaza-bottom-ring',320,398),('central-stair',319,477),('right-stair',715,441),('top-right-stair',836,45),('path-bend',386,702),('long-bridge-start',428,923),('lower-right-court-edge',826,795),('east-shore',991,484),('east-waterfall',965,550)],
}

parser = argparse.ArgumentParser()
parser.add_argument('--chunks',nargs='*')
args = parser.parse_args()
for ch,points in ANCHORS.items():
    if args.chunks and ch not in args.chunks:
        continue
    f = OUT/ch/f'{ch}-2x.webp'
    if not f.exists():
        continue
    old = np.array(Image.open(ROOT/f'img/map-zone3/v1/{ch}.webp').convert('RGB'))
    new = cv2.resize(np.array(Image.open(f).convert('RGB')),(old.shape[1],old.shape[0]),interpolation=cv2.INTER_AREA)
    a = cv2.GaussianBlur(cv2.cvtColor(old,cv2.COLOR_RGB2GRAY),(0,0),1.3)
    b = cv2.GaussianBlur(cv2.cvtColor(new,cv2.COLOR_RGB2GRAY),(0,0),1.3)
    results = []
    h,w = a.shape
    patch,search = 20,16
    viz = np.concatenate([old,new],axis=1)
    for name,x,y in points:
        template = a[y-patch:y+patch+1,x-patch:x+patch+1]
        lx,ly = max(0,x-patch-search),max(0,y-patch-search)
        rx,ry = min(w,x+patch+search+1),min(h,y+patch+search+1)
        scores = cv2.matchTemplate(b[ly:ry,lx:rx],template,cv2.TM_CCOEFF_NORMED)
        _,score,_,loc = cv2.minMaxLoc(scores)
        dx,dy = loc[0]+lx-(x-patch),loc[1]+ly-(y-patch)
        results.append(dict(id=name,sourceChunkPx1x=[x,y],deltaPx1x=[dx,dy],displacementPx1x=float(np.hypot(dx,dy)),ncc=float(score)))
        cv2.circle(viz,(x,y),6,(255,70,0),1)
        cv2.circle(viz,(x+dx+w,y+dy),6,(255,70,0),1)
        cv2.putText(viz,name,(min(x+8,w-170),y-8),cv2.FONT_HERSHEY_SIMPLEX,.3,(255,70,0),1)
    report = dict(method='fixed 41x41 source templates, Gaussian sigma1.3 at 1x, NCC search +/-16px on registered final downsample; integer-pixel precision; no point exclusion',
        limitation='sampled landmark alignment only; removed rail/post areas avoided; texture changes and repeated stone can bias NCC; full outline acceptance remains manual',
        maxDisplacementPx1x=max(p['displacementPx1x'] for p in results),minNcc=min(p['ncc'] for p in results),points=results)
    (OUT/ch/'landmarks.json').write_text(json.dumps(report,indent=2)+'\n')
    im = Image.fromarray(viz)
    im.thumbnail((1280,720),Image.Resampling.LANCZOS)
    im.save(OUT/ch/'landmarks.jpg',quality=65,optimize=True)
    structure = json.loads((OUT/ch/'structure.json').read_text())
    structure['sampledLandmarks'] = report
    (OUT/ch/'structure.json').write_text(json.dumps(structure,ensure_ascii=False,indent=2)+'\n')
    print(ch,json.dumps({k:v for k,v in report.items() if k not in ('points','method','limitation')}))
