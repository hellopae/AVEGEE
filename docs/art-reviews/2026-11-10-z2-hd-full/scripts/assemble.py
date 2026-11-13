"""Offline r4 registration/assembly; derived from zone1 bc9dc4dd/0c544a3f.

SIFT partial affine, native-to-2x warp, sigma35 colour field, min-cost seam.
Measurements are evidence for review, never automatic quality acceptance gates.
No generation, sharpening, local deformation or edits to runtime assets.
"""
import json
import math
import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from prepare import OUT, baseline, write_json

cv2.setNumThreads(2)
cv2.setRNGSeed(234)

# Fixed source landmarks selected before measuring any assembled output.
# Local chunk coordinates, 1x. Includes paving, rock/foliage silhouettes and stairs.
LANDMARKS = {
    'r4-c2': [(86,65),(173,103),(258,48),(360,96),(455,147),
              (550,49),(625,108),(717,155),(809,58),(955,135)],
    'r4-c3': [(85,62),(210,125),(300,165),(330,40),(330,82),
              (330,124),(490,45),(490,118),(490,164),(400,64),
              (424,93),(400,135),(430,164),(650,75),(810,140),(950,50)],
    'r4-c4': [(76,85),(181,42),(285,129),(350,65),(448,152),
              (549,46),(624,113),(730,150),(825,74),(949,135)],
    'r4-c5': [(52,90),(135,148),(245,48),(335,110),(430,155),
              (520,65),(603,123),(698,51),(765,150)],
}


def seam_blend(left, right, overlap=256):
    """Approved plaza minimum squared-colour seam; feather 8 output px/side."""
    a = left[:, -overlap:].astype(np.float32)
    b = right[:, :overlap].astype(np.float32)
    cost = cv2.GaussianBlur(np.mean((a-b)**2, axis=2), (5,5), 0)
    h, w = cost.shape
    dp, back = cost.copy(), np.zeros((h,w), np.int16)
    for y in range(1,h):
        prev = np.pad(dp[y-1], (1,1), constant_values=np.inf)
        choices = np.stack([prev[:w],prev[1:w+1],prev[2:]])
        choice = np.argmin(choices, axis=0)-1
        back[y] = choice
        dp[y] += choices[choice+1,np.arange(w)]
    path = np.zeros(h,np.int32)
    path[-1] = int(np.argmin(dp[-1]))
    for y in range(h-1,0,-1):
        path[y-1] = path[y]+back[y,path[y]]
    t = np.clip((np.arange(w)[None,:]-path[:,None]+8)/16,0,1)
    t = t*t*(3-2*t)
    mix = np.uint8(np.clip(a*(1-t[:,:,None])+b*t[:,:,None],0,255))
    return np.concatenate([left[:,:-overlap],mix,right[:,overlap:]],axis=1), path


def register(part):
    raw = Image.open(OUT/part['native']).convert('RGB')
    ref = Image.open(OUT/part['input']).convert('RGB')
    w,h = ref.size
    small = np.array(raw.resize(ref.size,Image.Resampling.LANCZOS))
    sift = cv2.SIFT_create(nfeatures=8000,contrastThreshold=.015)
    k1,d1 = sift.detectAndCompute(cv2.cvtColor(small,cv2.COLOR_RGB2GRAY),None)
    k0,d0 = sift.detectAndCompute(cv2.cvtColor(np.array(ref),cv2.COLOR_RGB2GRAY),None)
    good = [a for a,b in cv2.BFMatcher().knnMatch(d1,d0,k=2) if a.distance<.74*b.distance]
    if len(good)<6:
        raise RuntimeError(f"{part['native']}: insufficient SIFT matches ({len(good)})")
    src = np.float32([k1[m.queryIdx].pt for m in good])
    dst = np.float32([k0[m.trainIdx].pt for m in good])
    matrix,ok = cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,
        ransacReprojThreshold=2.5,maxIters=10000)
    if matrix is None or not .9<np.linalg.det(matrix[:,:2])<1.1:
        raise RuntimeError(f"{part['native']}: unreliable affine")
    residual = np.linalg.norm(cv2.transform(src[None],matrix)[0]-dst,axis=1)[ok[:,0]>0]
    native = np.vstack([matrix,[0,0,1]])@np.diag([w/raw.width,h/raw.height,1])
    aligned = cv2.warpAffine(np.array(raw),(np.diag([2,2,1])@native)[:2],
        (w*2,h*2),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
    valid = cv2.warpAffine(np.full((raw.height,raw.width),255,np.uint8),
        (np.diag([2,2,1])@native)[:2],(w*2,h*2),flags=cv2.INTER_NEAREST)
    old = np.array(ref.resize((w*2,h*2),Image.Resampling.LANCZOS),dtype=np.float32)
    delta = cv2.GaussianBlur(old,(0,0),70)-cv2.GaussianBlur(aligned.astype(np.float32),(0,0),70)
    aligned = np.uint8(np.clip(aligned.astype(np.float32)+.8*delta,0,255))
    glob = native.copy()
    glob[:2,2] += part['contextRectPx1x'][:2]
    rec = dict(id=part['part'],nativeFile=part['native'],nativeSize=list(raw.size),
        coreRectPx1x=part['coreRectPx1x'],contextRectPx1x=part['contextRectPx1x'],
        overlapPerSidePx1x=64,nativeToContextPx1x=native[:2].tolist(),
        nativeToMasterPx1x=glob[:2].tolist(),resizedNativeToContextAffine=matrix.tolist(),
        siftMatches=len(good),siftInliers=int(ok.sum()),
        inlierResidualPx1x=dict(median=float(np.median(residual)),
            p95=float(np.percentile(residual,95)),max=float(max(residual))),
        reflectedContextFraction=float(np.mean(valid==0)),
        localWarpApplied=False,semanticStructureVerified=False)
    return aligned,rec


def dog(im):
    g = cv2.cvtColor(np.array(im),cv2.COLOR_RGB2GRAY).astype(np.float32)
    return cv2.GaussianBlur(g,(0,0),1.5)-cv2.GaussianBlur(g,(0,0),6)


def diagnostics(name,old,new):
    d = OUT/name
    w,h = old.size
    small = new.resize(old.size,Image.Resampling.LANCZOS)
    a,b = dog(old),dog(small)
    records = []
    radius,search = 24,12
    for i,(x,y) in enumerate(LANDMARKS[name]):
        scores = cv2.matchTemplate(b[y-radius-search:y+radius+search+1,x-radius-search:x+radius+search+1],
            a[y-radius:y+radius+1,x-radius:x+radius+1],cv2.TM_CCOEFF_NORMED)
        _,score,_,loc = cv2.minMaxLoc(scores)
        dx,dy = loc[0]-search,loc[1]-search
        records.append(dict(id=f'source-landmark-{i+1}',sourcePx1x=[x,y],
            displacementPx1x=[dx,dy],distancePx1x=math.hypot(dx,dy),
            normalizedCorrelation=score,reliable=score>=.6))
    reliable = [r for r in records if r['reliable']]
    structure = dict(method='Fixed source 49x49 DoG sigma1.5/6 patches; search +/-12 map px, confidence >=0.6; independent of SIFT',
        thresholdPx1x=4,totalProbes=len(records),reliableProbes=len(reliable),
        uncertainProbes=len(records)-len(reliable),
        maxReliableDisplacementPx1x=max((r['distancePx1x'] for r in reliable),default=None),
        semanticStructureVerified=False,wholeStructureWithin4pxVerified=False,
        limitation='Sparse local correspondences cannot certify all silhouettes, every joint or stair count. Repeated stair/paving patterns can be ambiguous; uncertain probes retained.',probes=records)
    write_json(d/'structure.json',structure)
    sheet = Image.new('RGB',(w*2+24,h+40),'#171b24')
    sheet.paste(old,(0,40));sheet.paste(small,(w+24,40))
    draw = ImageDraw.Draw(sheet)
    draw.text((8,8),'Master | assembled: green <=4px, red >4px, yellow uncertain',fill='white')
    for i,r in enumerate(records):
        x,y = r['sourcePx1x'];dx,dy = r['displacementPx1x']
        color = 'yellow' if not r['reliable'] else ('lime' if r['distancePx1x']<=4 else 'red')
        for ox,px,py in [(0,x,y),(w+24,x+dx,y+dy)]:
            draw.ellipse((ox+px-4,40+py-4,ox+px+4,40+py+4),outline=color,width=2)
            draw.text((ox+px+5,40+py),str(i+1),fill=color)
    sheet.save(d/'structure-check.jpg',quality=90)
    sx,sy = 2.8/(4915/3840),2.8/(3277/2560)
    metrics = {}
    for label,box in {'full_chunk':[0,0,w,h], 'left_core':[0,0,(w+1)//2,h],
                      'right_core':[(w+1)//2,0,w,h]}.items():
        size = (round((box[2]-box[0])*sx),round((box[3]-box[1])*sy))
        vals = {}
        for label2,im,k in [('master',old,1),('redraw',new,2)]:
            crop = im.crop(tuple(v*k for v in box)).resize(size,Image.Resampling.LANCZOS)
            g = cv2.cvtColor(np.array(crop),cv2.COLOR_RGB2GRAY).astype(np.float64)
            vals[label2] = dict(laplacianVariance=float(cv2.Laplacian(g,cv2.CV_64F,ksize=1).var()),
                highPassMeanSquare=float(np.mean((g-cv2.GaussianBlur(g,(0,0),1))**2)))
        metrics[label] = dict(rectPx1x=box,deviceSize=list(size),versions=vals,
            laplacianRatio=vals['redraw']['laplacianVariance']/vals['master']['laplacianVariance'])
    sharp = dict(method='Same 2.8 device px/world, Pillow Lanczos, grayscale Laplacian variance ksize1; no sharpening',
        threshold=10,primaryRoi='full_chunk',primaryRatio=metrics['full_chunk']['laplacianRatio'],rois=metrics,
        limitation='Texture/edge energy is not perceived detail gain or art acceptance.')
    write_json(d/'sharpness.json',sharp)
    size = (round(w*sx),round(h*sy))
    compare = Image.new('RGB',(size[0]*2+24,size[1]+40),'#171b24')
    draw = ImageDraw.Draw(compare)
    for i,(label,im) in enumerate([('Master',old),('ImageGen + affine + min-cost seam',new)]):
        x = i*(size[0]+24)
        compare.paste(im.resize(size,Image.Resampling.LANCZOS),(x,40))
        draw.text((x+8,10),label+' | 2.8 device px/world',fill='white')
    compare.save(d/f'{name}-compare.jpg',quality=92,subsampling=0)
    return structure,sharp


def assemble(name,parts,base):
    d = OUT/name
    selected = [p for p in parts if p['chunk']==name]
    images,reg = [],[]
    for part in selected:
        aligned,rec = register(part)
        images.append(aligned);reg.append(rec)
    atlas,path = seam_blend(*images)
    x,y = selected[0]['coreRectPx1x'][:2]
    x1,y1 = selected[-1]['coreRectPx1x'][2:]
    ex,ey = selected[0]['contextRectPx1x'][:2]
    w,h = x1-x,y1-y
    ox,oy = (x-ex)*2,(y-ey)*2
    atlas = atlas[oy:oy+h*2,ox:ox+w*2]
    if atlas.shape != (h*2,w*2,3):
        raise RuntimeError(f'{name}: unexpected assembled size {atlas.shape}')
    new = Image.fromarray(atlas)
    new.save(d/f'{name}-2x.webp',lossless=True,method=6)
    write_json(d/'registration.json',dict(chunk=name,
        coordinateFormat='All RectPx1x are [x0,y0,x1,y1] in global master 1x, exclusive end; affine maps native pixels to context-local/global master 1x',
        chunkRectPx1x=[x,y,x1,y1],outputSize=[w*2,h*2],tiles=reg,
        colorCorrection=dict(sigmaMapPx=35,gain=.8,excluded='none: no object removal in these cores',noSharpening=True),
        borderMode='BORDER_REFLECT (fraction recorded per tile)',externalChunkBlend=False))
    start = images[0].shape[1]-256
    write_json(d/'seams.json',dict(units='Context-inclusive output2x before chunk crop',
        verticalOverlapStart=start,cropOffset=[ox,oy],q11_q12=path.tolist(),featherHalfWidthOutputPx=8))
    sheet = Image.new('RGB',(w*2+24,570),'#171b24')
    sheet.paste(new.resize((w,h)),(0,32))
    marked = new.resize((w,h))
    ImageDraw.Draw(marked).line([((start+int(path[i])-ox)/2,(i-oy)/2)
        for i in range(oy,len(path),2)],fill='cyan',width=1)
    sheet.paste(marked,(w+24,32))
    draw = ImageDraw.Draw(sheet)
    draw.text((8,8),'Assembly | actual seam path in cyan (right pane)',fill='white')
    cut = (w+1)//2*2
    strip = new.crop((cut-128,0,cut+128,h*2)).transpose(Image.Transpose.ROTATE_90)
    sheet.paste(strip,(0,290))
    draw.text((8,265),'Central overlap strip at output pixels, rotated 90 degrees',fill='white')
    sheet.save(d/'seam-check.jpg',quality=92,subsampling=0)
    structure,sharp = diagnostics(name,base.crop((x,y,x1,y1)),new)
    write_json(d/'removed.json',dict(chunk=name,removedIds=[],requestedRemovalIds=[],
        reason='Only walk floor in this run is r4-c3 stair; no baked obstruction surveyed inside owner mask. Unwalkable scenery and side rails kept.',
        inventory='../objects-inventory.json',completeSilhouetteAuditVerified=False))
    result = dict(chunk=name,nativeSizes=[r['nativeSize'] for r in reg],
        inliers=[r['siftInliers'] for r in reg],outputSize=[w*2,h*2],
        sharpnessRatio=sharp['primaryRatio'],structureMaxReliablePx1x=structure['maxReliableDisplacementPx1x'],
        reliableProbes=structure['reliableProbes'],totalProbes=structure['totalProbes'])
    print(json.dumps(result),flush=True)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('chunks',nargs='*',default=[])
    args = parser.parse_args()
    parts = json.loads((OUT/'parts.json').read_text())
    base = baseline()
    names = args.chunks or list(dict.fromkeys(p['chunk'] for p in parts))
    path = OUT/'measurements.json'
    results = {r['chunk']:r for r in json.loads(path.read_text())} if path.exists() else {}
    for name in names:
        results[name] = assemble(name,parts,base)
    write_json(path,list(results.values()))
