#!/usr/bin/env python3
"""Offline delivery processing; no generation, game mutation or quality gate.

prepare: reconstruct unchanged v3 master and 64 px context crops.
assemble: SIFT/RANSAC affine, min-cost joins, measurements (one evaluation).
check: ONLY completeness, image decode/dimensions and budget checks.
"""
import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parents[2]
TMP = Path('/tmp/z4-hd-full')
CHUNKS = ['r1-c5', 'r2-c1', 'r2-c2', 'r2-c3']
QS = ['q11', 'q12', 'q21', 'q22']
LANDMARKS = {
    'r1-c5': [('waterfall-bank',4445,480),('stair-top',4537,782),('stair-foot',4537,875),('east-cliff',4810,530),('west-court-edge',4310,719)],
    'r2-c1': [('upper-stair-top',655,1440),('upper-stair-foot',684,1554),('lower-stair-top',795,1600),('lava-bank',620,1810)],
    'r2-c2': [('bridge-junction',1482,1390),('west-bridge-deck',1285,1280),('south-bridge-edge',1600,1490),('lava-fall-lip',1430,1760)],
    'r2-c3': [('central-stair-top',2368,1460),('central-stair-foot',2370,1590),('east-stair',2860,1395),('central-court-rim',2350,1400),('court-gold-ring',2580,1140)],
}
cv2.setNumThreads(2)
cv2.setRNGSeed(234)

def dump(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def master():
    a = Image.new('RGB', (4915,3277))
    for r in range(1,5):
        for c in range(1,6):
            a.paste(Image.open(ROOT/f'img/map-zone4/v3/r{r}-c{c}.webp'), ((c-1)*1024,(r-1)*1024))
    return a

def prepare():
    TMP.mkdir(exist_ok=True)
    a = master(); a.save(TMP/'master.png'); parts = {}
    for name in CHUNKS:
        r,c = int(name[1]), int(name[4]); x,y = (c-1)*1024,(r-1)*1024
        w,h = min(1024,4915-x),1024; xm,ym=x+(w+1)//2,y+512
        (OUT/name).mkdir(exist_ok=True); parts[name]={}
        for qr,(y0,y1) in enumerate([(y,ym),(ym,y+h)],1):
            for qc,(x0,x1) in enumerate([(x,xm),(xm,x+w)],1):
                q=f'q{qr}{qc}'; rect=[max(0,x0-64),max(0,y0-64),min(4915,x1+64),min(3277,y1+64)]
                target=TMP/f'{name}-{q}-input.png'; a.crop(rect).save(target)
                parts[name][q]=dict(coreRectPx1x=[x0,y0,x1,y1],contextRectPx1x=rect,
                                   input=str(target),inputSHA256=sha(target))
    dump(OUT/'parts.json',parts)
    dump(OUT/'source-manifest.json',dict(fullPx1x=[4915,3277],repairs=False,
        evidence=['src/zone-skin.js: cyberhell.terrain v3, repairs:false inherited',
                  'src/cyberhell-terrain.js: CYBERHELL_TERRAIN v3',
                  'src/town-cyberhell-layout.js: patches:false, houses:[], props:[]'],
        files={str(p.relative_to(ROOT)):sha(p) for p in sorted((ROOT/'img/map-zone4/v3').glob('r*-c*.webp'))},
        walkmaskSHA256=sha(ROOT/'src/town-owner-walkmask-cyberhell.js')))

def gray(a):
    return cv2.cvtColor(a,cv2.COLOR_RGB2GRAY)

def register(ref,native):
    sift=cv2.SIFT_create(nfeatures=12000,contrastThreshold=.012,edgeThreshold=14)
    kr,dr=sift.detectAndCompute(gray(ref),None)
    # Native descriptors are measured at both native and reference-like scale;
    # use native coordinates for the recorded transform in both cases.
    candidates=[]
    for scale in [1.0, min(1.0,max(ref.shape[:2])/max(native.shape[:2]))]:
        scaled=cv2.resize(native,None,fx=scale,fy=scale,interpolation=cv2.INTER_AREA)
        kn,dn=sift.detectAndCompute(gray(scaled),None)
        if dn is None or dr is None: continue
        matches=cv2.BFMatcher().knnMatch(dn,dr,k=2)
        good=[m for pair in matches if len(pair)==2 for m,n in [pair] if m.distance<.74*n.distance]
        if len(good)<6: continue
        src=np.float32([np.array(kn[m.queryIdx].pt)/scale for m in good])
        dst=np.float32([kr[m.trainIdx].pt for m in good])
        M,inside=cv2.estimateAffine2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=15000,confidence=.999,refineIters=20)
        if M is None: continue
        keep=inside.ravel().astype(bool); pred=cv2.transform(src[None],M)[0]
        err=np.linalg.norm(pred-dst,axis=1)
        hull=cv2.convexHull(dst[keep]); coverage=cv2.contourArea(hull)/(ref.shape[0]*ref.shape[1])
        candidates.append((int(keep.sum()),coverage,M,dict(matches=len(good),inliers=int(keep.sum()),
            inlierHullFraction=float(coverage),inlierResidualMaxPx1x=float(err[keep].max()),
            inlierResidualMedianPx1x=float(np.median(err[keep])),descriptorScale=scale)))
    if candidates:
        _,_,M,stats=max(candidates,key=lambda t:t[0]*max(.05,t[1]))
        stats['status']='affine-estimated' if stats['inliers']>=8 and stats['inlierHullFraction']>=.12 else 'weak-affine-review-required'
    else:
        M=np.array([[ref.shape[1]/native.shape[1],0,0],[0,ref.shape[0]/native.shape[0],0]],float)
        stats=dict(status='UNREGISTERED-dimension-projection-only',matches=0,inliers=0,inlierHullFraction=0,
                   inlierResidualMaxPx1x=None,inlierResidualMedianPx1x=None)
    return M,stats

def smooth(t):
    t=np.clip(t,0,1);return t*t*(3-2*t)

def seam(a,b,valid_a,valid_b,lo,hi):
    """Top-to-bottom min-cost path; invalid samples cannot win a join."""
    cost=cv2.GaussianBlur(np.mean((a[:,lo:hi].astype(float)-b[:,lo:hi])**2,axis=2),(5,5),0)
    cost+=(~(valid_a[:,lo:hi]&valid_b[:,lo:hi]))*1e7
    cost[:,:8]+=1e6;cost[:,-8:]+=1e6
    h,w=cost.shape;dp=cost.copy();back=np.zeros((h,w),np.int8)
    for y in range(1,h):
        p=np.pad(dp[y-1],(1,1),constant_values=np.inf)
        ch=np.stack([p[:w],p[1:w+1],p[2:]]);k=np.argmin(ch,axis=0)
        dp[y]+=ch[k,np.arange(w)];back[y]=k-1
    path=np.empty(h,np.int32);path[-1]=np.argmin(dp[-1])
    for y in range(h-1,0,-1):path[y-1]=path[y]+back[y,path[y]]
    path+=lo
    alpha=smooth((np.arange(a.shape[1])[None,:]-path[:,None]+8)/16)
    alpha=np.where(~valid_a&valid_b,1,alpha);alpha=np.where(valid_a&~valid_b,0,alpha)
    joined=np.uint8(np.rint(a*(1-alpha[...,None])+b*alpha[...,None]))
    # Measurements only; never assert a perceptual quality threshold.
    yy=np.arange(h);p0=np.clip(path-1,0,a.shape[1]-1);p1=np.clip(path+1,0,a.shape[1]-1)
    jump=np.mean(np.abs(joined[yy,p1].astype(float)-joined[yy,p0]),axis=1)
    return joined, valid_a|valid_b, dict(pathPx2x=path.tolist(),bandPx2x=[lo,hi],
        meanMinCost=float(dp[-1].min()/h),crossPathMeanAbsRGB=float(jump.mean()),crossPathP95AbsRGB=float(np.percentile(jump,95)))

def edge_measure(ref,after):
    # Broad edges at the original 1x scale. This is a proxy, not semantic proof.
    er=cv2.Canny(cv2.GaussianBlur(gray(ref),(0,0),2),25,60)
    en=cv2.Canny(cv2.GaussianBlur(gray(after),(0,0),2),25,60)
    dist=cv2.distanceTransform(255-en,cv2.DIST_L2,cv2.DIST_MASK_PRECISE)
    v=dist[er>0]
    return dict(sourceEdges=int(len(v)),nearestEdgeMaxPx1x=float(v.max()),nearestEdgeP95Px1x=float(np.percentile(v,95)),
                nearestEdgeMedianPx1x=float(np.median(v)),within4pxFraction=float(np.mean(v<=4)))

def landmarks(ref,after,name,x,y):
    # Independent of SIFT inlier statistics: low-frequency local patch search.
    before=cv2.GaussianBlur(gray(ref),(0,0),2);after=cv2.GaussianBlur(gray(after),(0,0),2)
    result=[];rad=22;search=24
    for label,gx,gy in LANDMARKS[name]:
        xx,yy=gx-x,gy-y
        if not(rad+search<=xx<ref.shape[1]-rad-search and rad+search<=yy<ref.shape[0]-rad-search):continue
        patch=before[yy-rad:yy+rad+1,xx-rad:xx+rad+1]
        region=after[yy-rad-search:yy+rad+search+1,xx-rad-search:xx+rad+search+1]
        _,score,_,(dx,dy)=cv2.minMaxLoc(cv2.matchTemplate(region,patch,cv2.TM_CCOEFF_NORMED))
        dx-=search;dy-=search
        result.append(dict(id=label,mapPx1x=[gx,gy],offsetPx1x=[dx,dy],distancePx1x=float(np.hypot(dx,dy)),correlation=score,
                           searchBoundary=abs(dx)==search or abs(dy)==search))
    return result

def assemble():
    parts=json.loads((OUT/'parts.json').read_text());a=master();summary=[]
    for name in CHUNKS:
        r,c=int(name[1]),int(name[4]);x,y=(c-1)*1024,(r-1)*1024
        W,H=min(1024,4915-x)*2,2048;w=W//2
        # Canvas includes outer context for joins; only core is exported.
        context=[max(0,x-64),max(0,y-64),min(4915,x+w+64),min(3277,y+1024+64)]
        ex,ey=context[:2];ew,eh=(context[2]-ex)*2,(context[3]-ey)*2
        reg=dict(chunk=name,coordinateConvention='rects [x0,y0,x1,y1], global master 1x px; affine native -> context-local 1x px',parts={})
        tiles={};valids={}
        for q in QS:
            info=parts[name][q];native=np.array(Image.open(OUT/name/f'{q}-native.webp').convert('RGB'))
            box=info['contextRectPx1x'];ref=np.array(a.crop(box));M,stats=register(ref,native)
            reg['parts'][q]={**info,'nativeFile':f'{q}-native.webp','nativeSize':list(native.shape[1::-1]),
                             'nativeSHA256':sha(OUT/name/f'{q}-native.webp'),'nativeToContextPx1x':M.tolist(),**stats}
            G=M.copy()*2;G[:,2]+=np.array([box[0]-ex,box[1]-ey])*2
            tiles[q]=cv2.warpAffine(native,G,(ew,eh),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
            valids[q]=cv2.warpAffine(np.full(native.shape[:2],255,np.uint8),G,(ew,eh),flags=cv2.INTER_NEAREST)>0
            # Restrict each warp to its source context (avoid using outpainted extras).
            mask=np.zeros((eh,ew),bool);mask[(box[1]-ey)*2:(box[3]-ey)*2,(box[0]-ex)*2:(box[2]-ex)*2]=True
            valids[q]&=mask
        sx=(x+(w+1)//2-ex)*2;sy=(y+512-ey)*2
        joins={}
        top,vt,joins['topVertical']=seam(tiles['q11'],tiles['q12'],valids['q11'],valids['q12'],sx-112,sx+112)
        bottom,vb,joins['bottomVertical']=seam(tiles['q21'],tiles['q22'],valids['q21'],valids['q22'],sx-112,sx+112)
        both,v,joins['horizontal']=seam(top.transpose(1,0,2),bottom.transpose(1,0,2),vt.T,vb.T,sy-112,sy+112)
        both=both.transpose(1,0,2);v=v.T;cx,cy=(x-ex)*2,(y-ey)*2
        candidate=both[cy:cy+H,cx:cx+W];coverage=v[cy:cy+H,cx:cx+W]
        Image.fromarray(candidate).save(OUT/name/f'{name}-2x.webp',lossless=True,method=6)
        ref=np.array(a.crop((x,y,x+w,y+1024)))
        after=np.array(Image.fromarray(candidate).resize((w,1024),Image.Resampling.LANCZOS))
        base2=np.array(Image.fromarray(ref).resize((W,H),Image.Resampling.LANCZOS))
        sharp=lambda ar:float(cv2.Laplacian(gray(ar),cv2.CV_64F).var())
        metrics=dict(laplacianBaselineAt2x=sharp(base2),laplacianCandidateAt2x=sharp(candidate),
                     sharpnessRatio=sharp(candidate)/sharp(base2),measurementScale='both compared at delivered 2x with Lanczos baseline; no sharpening filter',
                     validGeneratedCoverageFraction=float(coverage.mean()),**edge_measure(ref,after))
        lm=landmarks(ref,after,name,x,y)
        structure=dict(**metrics,landmarks=lm,landmarkMaxPx1x=max(p['distancePx1x'] for p in lm),
                       limitation='Local template translations and nearest edges are diagnostics, not proof that every semantic outline is within 4 px. Low correlation/search-boundary values need visual review.')
        dump(OUT/name/'registration.json',reg);dump(OUT/name/'structure.json',structure);dump(OUT/name/'seams.json',joins)
        # Full chunk comparison at 2.8 px / world unit (master/world = 4915/3840).
        size=(round(w*2.8*3840/4915),round(1024*2.8*2560/3277))
        cmp=Image.new('RGB',(size[0]*2,size[1]+28),'#171721');d=ImageDraw.Draw(cmp)
        d.text((8,8),'MASTER v3 | left',fill='white');d.text((size[0]+8,8),'GENERATED CANDIDATE | right',fill='white')
        cmp.paste(Image.fromarray(ref).resize(size,Image.Resampling.LANCZOS),(0,28));cmp.paste(Image.fromarray(candidate).resize(size,Image.Resampling.LANCZOS),(size[0],28))
        cmp.save(OUT/name/f'{name}-compare.jpg',quality=78)
        # Cross-shaped seam preview without annotations over the seams themselves.
        seamimg=Image.fromarray(candidate).copy();seamimg.thumbnail((1024,1024));seamimg.save(OUT/name/'seam-check.jpg',quality=93)
        summary.append(dict(chunk=name,imageGenCalls=4,nativeSizes={q:reg['parts'][q]['nativeSize'] for q in QS},
                            structureMaxPx1x=structure['landmarkMaxPx1x'],sharpnessRatio=metrics['sharpnessRatio'],
                            nearestEdgeMaxPx1x=metrics['nearestEdgeMaxPx1x'],validGeneratedCoverageFraction=metrics['validGeneratedCoverageFraction'],
                            registrationStatuses={q:reg['parts'][q]['status'] for q in QS},
                            status='candidate-review-required',pending=['quality decision by Claude; no automated quality approval']))
        print(name,json.dumps(summary[-1]),flush=True)
    dump(OUT/'run-summary.json',dict(zone=4,set='2/5',requestedChunks=CHUNKS,imageGenCalls=16,generator='built-in image_gen',
        chunks=summary,assemblyPending='Cross-chunk seams intentionally deferred to ASSEMBLE; quality/re-registration may be needed.',
        qualityStatus='NOT APPROVED; measurements reported once, no regeneration to chase thresholds'))

def check():
    results=[]
    for name in CHUNKS:
        reg=json.loads((OUT/name/'registration.json').read_text())
        expected=(1638,2048) if name=='r1-c5' else (2048,2048)
        for q in QS:
            p=OUT/name/f'{q}-native.webp'
            with Image.open(p) as im:
                im.load();assert list(im.size)==reg['parts'][q]['nativeSize'];assert im.format=='WEBP'
                assert p.read_bytes()[12:16]==b'VP8L', 'native must be lossless WebP'
                results.append(dict(file=str(p.relative_to(OUT)),size=list(im.size),opens=True))
        p=OUT/name/f'{name}-2x.webp'
        with Image.open(p) as im:im.load();assert im.size==expected;results.append(dict(file=str(p.relative_to(OUT)),size=list(im.size),opens=True))
        assert p.read_bytes()[12:16]==b'VP8L', '2x must be lossless WebP'
        for f in ['registration.json','structure.json','removed.json','seams.json']:json.loads((OUT/name/f).read_text())
        for f in [f'{name}-compare.jpg','seam-check.jpg']:
            with Image.open(OUT/name/f) as im:im.load()
    for f in ['objects-inventory.json','run-summary.json','generation-prompts.json','source-manifest.json']:json.loads((OUT/f).read_text())
    for f in ['objects-walkmask.jpg','seam-details.jpg','removed-compare.jpg']:
        with Image.open(OUT/f) as im:im.load()
    prompts=json.loads((OUT/'generation-prompts.json').read_text())
    assert prompts['calls']==16 and len(prompts['edits'])==16
    assert {(p['chunk'],p['part']) for p in prompts['edits']}=={(c,q) for c in CHUNKS for q in QS}
    source=json.loads((OUT/'source-manifest.json').read_text())
    for file,digest in source['files'].items():assert sha(ROOT/file)==digest, 'source image was modified'
    report=dict(scope='ONLY completeness, decode, dimensions, encoding/source integrity and <=80 MB; no quality assertions',
                files=results,decodedImages=len(results)+11,losslessWebPImages=20,sourceChunkHashesUnchanged=len(source['files']),
                qualityChecksRun=False,totalBytes=0,limitBytes=80_000_000)
    # Include this report itself in the byte total; this is file accounting only.
    for _ in range(3):
        dump(OUT/'file-check.json',report)
        report['totalBytes']=sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
    size=report['totalBytes'];assert size<=80_000_000,size
    dump(OUT/'file-check.json',report)
    print(json.dumps(dict(decodedImages=len(results)+11,totalBytes=size,scope='file checks only')))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('phase',choices=['prepare','assemble','check']);args=p.parse_args()
    globals()[args.phase]()
