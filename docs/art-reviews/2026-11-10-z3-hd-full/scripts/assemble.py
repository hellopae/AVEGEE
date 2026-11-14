"""Register ImageGen natives, join inside each chunk, and record measurements.

No generation, sharpening, source restoration, or acceptance-threshold retry.
SIFT/partial affine and min-cost seam reproduce the documented Z1 method.
The available Z1 v7r assemble script supplies the seam DP/16-output-px feather.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from functools import lru_cache
import cv2
import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1]
cv2.setNumThreads(2)

@lru_cache(maxsize=1)
def source_atlas():
    root = Path(__file__).resolve().parents[4]
    atlas = Image.new('RGB', (4915, 3277))
    for r in range(1, 5):
        for c in range(1, 6):
            with Image.open(root/f'img/map-zone3/v1/r{r}-c{c}.webp') as im:
                atlas.paste(im, ((c-1)*1024, (r-1)*1024))
    return atlas

def source_crop(path, rect):
    # Reproducible source/input copies are omitted from the <=80MB delivery.
    if path.exists():
        with Image.open(path) as im:
            return np.array(im.convert('RGB'))
    return np.array(source_atlas().crop(rect))

def save_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False)+'\n')

def smooth(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)

def seam(a, b, offset, width):
    """Z1 DP: vertical minimum squared-colour-cost path in an overlap band."""
    aa, bb = a[:,offset:offset+width].astype(np.float32), b[:,offset:offset+width].astype(np.float32)
    cost = cv2.GaussianBlur(np.mean((aa-bb)**2, axis=2), (5,5), 0)
    cost[:,:10] = np.inf
    cost[:,-10:] = np.inf
    h,w = cost.shape
    dp, back = cost.copy(), np.zeros((h,w), np.int8)
    for y in range(1,h):
        p = np.pad(dp[y-1], (1,1), constant_values=np.inf)
        ch = np.stack([p[:w],p[1:w+1],p[2:]])
        k = np.argmin(ch, axis=0)
        back[y] = k-1
        dp[y] += ch[k,np.arange(w)]
    path = np.empty(h,np.int32)
    path[-1] = np.argmin(dp[-1])
    for y in range(h-1,0,-1):
        path[y-1] = path[y]+back[y,path[y]]
    return path+offset, float(np.min(dp[-1])/h)

def register(d, q, spec):
    src = source_crop(d/f'{q}-input.webp', spec['contextRectPx1x'])
    nat = np.array(Image.open(d/f'{q}-native.webp').convert('RGB'))
    h,w = src.shape[:2]
    nh,nw = nat.shape[:2]
    small = cv2.resize(nat,(w,h),interpolation=cv2.INTER_AREA)
    sift = cv2.SIFT_create(nfeatures=10000, contrastThreshold=.012, edgeThreshold=15)
    kn,dn = sift.detectAndCompute(cv2.cvtColor(small,cv2.COLOR_RGB2GRAY),None)
    ks,ds = sift.detectAndCompute(cv2.cvtColor(src,cv2.COLOR_RGB2GRAY),None)
    good = []
    if dn is not None and ds is not None:
        bf = cv2.BFMatcher()
        forward = bf.knnMatch(dn,ds,k=2)
        reverse = bf.match(ds,dn)
        good = [m for m,n in forward if m.distance < .7*n.distance and reverse[m.trainIdx].trainIdx == m.queryIdx]
    a = np.float32([kn[m.queryIdx].pt for m in good]).reshape(-1,2)
    b = np.float32([ks[m.trainIdx].pt for m in good]).reshape(-1,2)
    # Deterministic interleaved holdout. Never fit on the validation half.
    train = np.arange(len(good))%2 == 0
    A = None
    flags = None
    if train.sum() >= 3:
        cv2.setRNGSeed(234)
        A, flags = cv2.estimateAffinePartial2D(a[train],b[train],method=cv2.RANSAC,
            ransacReprojThreshold=3,maxIters=4000,confidence=.999,refineIters=20)
    if A is None:
        A = np.array([[1.,0.,0.],[0.,1.,0.]])
        method = 'nominal-scale-only; SIFT insufficient'
    else:
        method = 'mutual-SIFT ratio .70; interleaved training half; RANSAC partial affine threshold 3px'
    errors = np.linalg.norm(cv2.transform(a[None],A)[0]-b,axis=1) if len(a) else np.array([])
    hold = errors[~train]
    M = A @ np.diag([w/nw,h/nh,1.])
    reg = cv2.warpAffine(nat,M*2,(w*2,h*2),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT_101)
    valid = cv2.warpAffine(np.ones((nh,nw),np.uint8),M*2,(w*2,h*2),flags=cv2.INTER_NEAREST)
    x0,y0,x1,y1 = spec['contextRectPx1x']
    k0,l0,k1,l1 = spec['coreRectPx1x']
    corevalid = valid[(l0-y0)*2:(l1-y0)*2,(k0-x0)*2:(k1-x0)*2]
    Mmap = M.copy()
    Mmap[:,2] += [x0,y0]
    points = [dict(nativeScaledPx1x=p.tolist(),sourceContextPx1x=t.tolist(),residualPx1x=float(e),split='train' if tr else 'holdout')
              for p,t,e,tr in zip(a,b,errors,train)]
    info = dict(**spec,nativeSizePx=[nw,nh],nativeSHA256=hashlib.sha256((d/f'{q}-native.webp').read_bytes()).hexdigest(),
        nativeToContextPx1x=M.tolist(),nativeToMapPx1x=Mmap.tolist(),method=method,
        featuresNative=len(kn),featuresSource=len(ks),mutualMatches=len(good),
        trainInliers=int(flags.sum()) if flags is not None else 0,
        trainInlierResidualMaxPx1x=float(errors[train][flags.ravel().astype(bool)].max()) if flags is not None and flags.any() else None,
        holdoutCount=len(hold),holdoutResidualMaxPx1x=float(hold.max()) if len(hold) else None,
        holdoutResidualMedianPx1x=float(np.median(hold)) if len(hold) else None,
        holdoutResidualP95Px1x=float(np.percentile(hold,95)) if len(hold) else None,
        holdoutWithin4pxFraction=float((hold<=4).mean()) if len(hold) else None,
        coreOutsideNativeFraction=float(1-corevalid.mean()),
        borderMode='REFLECT_101; no original ground substituted',correspondences=points)
    viz = np.concatenate([src,cv2.resize(reg,(w,h),interpolation=cv2.INTER_AREA)],axis=1)
    for p,t,e,tr in zip(a,b,errors,train):
        if tr:
            continue
        color = (20,220,20) if e<=4 else (255,30,30)
        cv2.circle(viz,tuple(np.rint(t).astype(int)),3,color,1)
        pp = cv2.transform(p.reshape(1,1,2),A)[0,0]
        cv2.circle(viz,tuple(np.rint(pp+[w,0]).astype(int)),3,color,1)
    return reg,info,viz

def assemble(ch, spec):
    d = OUT/ch
    if not all((d/f'{q}-native.webp').exists() for q in spec['parts']):
        return dict(chunk=ch,status='incomplete',pending=[q for q in spec['parts'] if not (d/f'{q}-native.webp').exists()])
    cx0,cy0,cx1,cy1 = spec['chunkRectPx1x']
    H,W = (cy1-cy0)*2,(cx1-cx0)*2
    parts,regions,reginfo,viz = {},{},{},[]
    for q,s in spec['parts'].items():
        image,info,v = register(d,q,s)
        reginfo[q] = info
        viz.append(Image.fromarray(v))
        x0,y0,x1,y1 = s['contextRectPx1x']
        local = np.zeros((H,W,3),np.uint8)
        xx0,yy0,xx1,yy1 = max(x0,cx0),max(y0,cy0),min(x1,cx1),min(y1,cy1)
        local[(yy0-cy0)*2:(yy1-cy0)*2,(xx0-cx0)*2:(xx1-cx0)*2] = image[(yy0-y0)*2:(yy1-y0)*2,(xx0-x0)*2:(xx1-x0)*2]
        parts[q] = local
        regions[q] = [(xx0-cx0)*2,(yy0-cy0)*2,(xx1-cx0)*2,(yy1-cy0)*2]
    rows = []
    seam_info = []
    path_views = []
    for ql,qr in [('q11','q12'),('q21','q22')]:
        a,b = parts[ql],parts[qr]
        lo,hi = regions[qr][0],regions[ql][2]
        top,bottom = max(regions[ql][1],regions[qr][1]),min(regions[ql][3],regions[qr][3])
        path,cost = seam(a[top:bottom],b[top:bottom],lo,hi-lo)
        alpha = smooth((np.arange(W)[None,:]-path[:,None]+8)/16)[...,None]
        row = np.zeros_like(a)
        row[top:bottom] = np.rint(a[top:bottom]*(1-alpha)+b[top:bottom]*alpha).astype(np.uint8)
        rows.append(row)
        seam_info.append(dict(parts=[ql,qr],axis='vertical',overlapPx2x=[lo,hi],meanSquaredColorCost=cost,pathPx2x=path.tolist(),rowStartPx2x=top))
        path_views.append((path,top,bottom))
    lo,hi = regions['q21'][1],regions['q11'][3]
    path,cost = seam(rows[0].transpose(1,0,2),rows[1].transpose(1,0,2),lo,hi-lo)
    alpha = smooth((np.arange(H)[None,:]-path[:,None]+8)/16).T[...,None]
    final = np.rint(rows[0]*(1-alpha)+rows[1]*alpha).astype(np.uint8)
    seam_info.append(dict(parts=['top','bottom'],axis='horizontal',overlapPx2x=[lo,hi],meanSquaredColorCost=cost,pathPx2x=path.tolist()))
    Image.fromarray(final).save(d/f'{ch}-2x.webp',lossless=True,method=6)
    matches = {q:i.pop('correspondences') for q,i in reginfo.items()}
    (d/'sift-correspondences.json').write_text(json.dumps(matches,separators=(',',':'))+'\n')
    for i in reginfo.values():
        i['correspondencesFile'] = 'sift-correspondences.json'
    save_json(d/'registration.json',dict(coordinateConvention='rect=[x0,y0,x1,y1], global 1x map pixels, exclusive end; affine maps native pixel centres to context-local 1x pixels; multiply full matrix by 2 for 2x output',chunkRectPx1x=spec['chunkRectPx1x'],parts=reginfo,seams=seam_info))
    source = source_crop(d/'source.webp', spec['chunkRectPx1x'])
    old2x = cv2.resize(source,(W,H),interpolation=cv2.INTER_LANCZOS4)
    def lap(im):
        return float(cv2.Laplacian(cv2.cvtColor(im,cv2.COLOR_RGB2GRAY),cv2.CV_64F).var())
    oldlap,newlap = lap(old2x),lap(final)
    old1,new1 = lap(source),lap(cv2.resize(final,(source.shape[1],source.shape[0]),interpolation=cv2.INTER_AREA))
    maxs = [v['holdoutResidualMaxPx1x'] for v in reginfo.values() if v['holdoutResidualMaxPx1x'] is not None]
    metrics = dict(chunk=ch,sharpness=dict(method='variance of grayscale OpenCV Laplacian ksize=1; both images on identical 2x raster; baseline Lanczos4 upsample; no sharpening',baseline2x=oldlap,redraw2x=newlap,ratio2x=newlap/oldlap,baseline1x=old1,redrawDownsample1x=new1,ratio1x=new1/old1),
        structure=dict(method='independent interleaved mutual-SIFT holdout after training-half affine; max includes ambiguous descriptor matches; proxy only, not proof of all structural outlines',maxPx1x=max(maxs) if maxs else None,perPart={q:{k:v for k,v in i.items() if k.startswith('holdout') or k in ('coreOutsideNativeFraction','trainInliers')} for q,i in reginfo.items()},manualOutlineReview='pending Claude; inspect source, native, compare and structure-matches'),
        seams=dict(method='minimum squared-colour-cost DP in actual 128-map-px internal overlap; smoothstep feather +/-8 output px; no neighboring chunk assembly',visualReview='pending Claude; seam path overlay is supplied',meanSquaredCosts=[s['meanSquaredColorCost'] for s in seam_info]))
    save_json(d/'structure.json',metrics)
    # Full chunk comparison at 2.8 screen px/world unit (source is 4915/3840 px/unit).
    scale = 2.8/(4915/3840)
    cw,chh = round(source.shape[1]*scale),round(source.shape[0]*scale)
    cmp = Image.new('RGB',(cw*2,chh+30),'#182737')
    cmp.paste(Image.fromarray(source).resize((cw,chh),Image.Resampling.LANCZOS),(0,30))
    cmp.paste(Image.fromarray(final).resize((cw,chh),Image.Resampling.LANCZOS),(cw,30))
    draw = ImageDraw.Draw(cmp)
    draw.text((8,8),'WEST v1 | 2.8 screen px / world unit',fill='white')
    draw.text((cw+8,8),'HD redraw | same display scale',fill='white')
    cmp.save(d/f'{ch}-compare.jpg',quality=25,optimize=True)
    overlay = final.copy()
    for pp,top,bottom in path_views:
        for y,x in enumerate(pp):
            overlay[top+y,max(0,x-1):x+2] = (255,0,220)
    for x,y in enumerate(path):
        overlay[max(0,y-1):y+2,x] = (255,0,220)
    sheet = Image.new('RGB',(W*2,H))
    sheet.paste(Image.fromarray(final),(0,0))
    sheet.paste(Image.fromarray(overlay),(W,0))
    sheet.thumbnail((1280,800),Image.Resampling.LANCZOS)
    sheet.save(d/'seam-check.jpg',quality=65,optimize=True)
    vv = Image.new('RGB',(max(v.width for v in viz),sum(v.height for v in viz)))
    yy = 0
    for v in viz:
        vv.paste(v,(0,yy)); yy += v.height
    vv.thumbnail((960,1200),Image.Resampling.LANCZOS)
    vv.save(d/'structure-matches.jpg',quality=65,optimize=True)
    root = Path(__file__).resolve().parents[4]
    maskjs = (root/'src/town-owner-walkmask-west.js').read_text()
    runs = json.loads(re.search(r'TOWN_OWNER_WALK_RUNS=(\[.*?\]);',maskjs).group(1))
    cells = np.zeros(480*320,np.uint8)
    pos,on = 0,0
    for run in runs:
        cells[pos:pos+run] = on
        pos += run
        on ^= 1
    fullmask = Image.fromarray(cells.reshape(320,480)*255).resize((4915,3277),Image.Resampling.NEAREST)
    mask = np.array(fullmask.crop((cx0,cy0,cx1,cy1)).resize((W,H),Image.Resampling.NEAREST))
    edge = cv2.morphologyEx(mask,cv2.MORPH_GRADIENT,np.ones((3,3),np.uint8))>0
    pair = np.concatenate([old2x,final],axis=1)
    pair[np.concatenate([edge,edge],axis=1)] = (255,70,0)
    overlay_pair = Image.fromarray(pair)
    overlay_pair.thumbnail((1280,640),Image.Resampling.LANCZOS)
    overlay_pair.save(d/'owner-walkmask-overlay.jpg',quality=65,optimize=True)
    return dict(chunk=ch,status='assembled-for-review',imageGenCalls=4,actualNativeSizesPx={q:i['nativeSizePx'] for q,i in reginfo.items()},outputSizePx=[W,H],structureMaxPx1x=metrics['structure']['maxPx1x'],sharpnessRatioLaplacian2x=newlap/oldlap,sharpnessRatioLaplacian1x=new1/old1,qualityDecision='pending Claude; measurements are not automatic acceptance')

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--chunks',nargs='*')
    a = ap.parse_args()
    manifest = json.loads((OUT/'source-manifest.json').read_text())
    results = []
    for ch,s in manifest['chunks'].items():
        if a.chunks and ch not in a.chunks:
            continue
        result = assemble(ch,s)
        results.append(result)
        print(json.dumps(result),flush=True)
    report_path = OUT/'measurements.json'
    previous = json.loads(report_path.read_text()) if report_path.exists() else []
    by_chunk = {r['chunk']:r for r in previous}
    by_chunk.update({r['chunk']:r for r in results})
    save_json(report_path,[by_chunk[ch] for ch in manifest['chunks'] if ch in by_chunk])
