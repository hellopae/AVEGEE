"""Offline registration/assembly, adapted from approved plaza bc9dc4dd.
No generation, sharpening, local warps, runtime changes or quality acceptance gate.
Rectangles are global master 1x [left, top, right, bottom].
"""
import json, math, sys
import cv2
import numpy as np
from PIL import Image, ImageDraw
from prepare import OUT, ROOT, write_json

cv2.setNumThreads(2)
cv2.setRNGSeed(234)
GAME = 2.8 / (4915 / 3840)
# Fixed before assembly; visible floor/cliff/stair/rock features, not SIFT inliers.
LANDMARKS = {
 'r3-c3': [(306,382),(499,382),(352,477),(483,479),(53,164),(220,169),
           (733,247),(887,247),(746,110),(892,116),(68,650),(206,532),
           (788,579),(880,674),(774,820),(142,853),(405,875),(378,970)],
 'r3-c4': [(40,133),(133,137),(190,145),(274,41),(377,161),(532,130),
           (684,108),(781,145),(847,221),(344,325),(478,422),(272,572),
           (403,548),(556,551),(697,587),(821,688),(506,758),(218,730)],
 'r3-c5': [(88,156),(206,154),(335,168),(458,172),(566,169),(740,197),
           (164,469),(269,489),(390,545),(107,540),(307,673),(455,661),
           (523,628),(138,854),(692,843),(756,928)],
 'r4-c1': [(83,90),(226,92),(323,62),(399,140),(599,110),(706,58),(844,91),(923,148)],
}

def seam_blend(left, right, overlap=256):
    a=left[:,-overlap:].astype(np.float32); b=right[:,:overlap].astype(np.float32)
    cost=cv2.GaussianBlur(np.mean((a-b)**2,axis=2),(5,5),0)
    h,w=cost.shape; dp=cost.copy(); back=np.zeros((h,w),np.int16)
    for y in range(1,h):
        prev=np.pad(dp[y-1],(1,1),constant_values=np.inf)
        choices=np.stack([prev[:w],prev[1:w+1],prev[2:]])
        choice=np.argmin(choices,axis=0)-1; back[y]=choice
        dp[y]+=choices[choice+1,np.arange(w)]
    path=np.zeros(h,np.int32);path[-1]=int(np.argmin(dp[-1]))
    for y in range(h-1,0,-1):path[y-1]=path[y]+back[y,path[y]]
    t=np.clip((np.arange(w)[None,:]-path[:,None]+8)/16,0,1)
    t=t*t*(3-2*t)
    mix=np.uint8(np.clip(a*(1-t[:,:,None])+b*t[:,:,None],0,255))
    return np.concatenate([left[:,:-overlap],mix,right[:,overlap:]],axis=1),path

def register(name, part, removals):
    d=OUT/name; tid=part['id']
    raw=Image.open(d/f'{tid}-native.webp').convert('RGB')
    ref=Image.open(d/f'inputs/{tid}-source.webp').convert('RGB');w,h=ref.size
    small=np.array(raw.resize(ref.size,Image.Resampling.LANCZOS))
    sift=cv2.SIFT_create(nfeatures=8000,contrastThreshold=.015)
    k1,d1=sift.detectAndCompute(cv2.cvtColor(small,cv2.COLOR_RGB2GRAY),None)
    k0,d0=sift.detectAndCompute(cv2.cvtColor(np.array(ref),cv2.COLOR_RGB2GRAY),None)
    if d1 is None or d0 is None:raise RuntimeError(f'{name}/{tid}: no SIFT descriptors')
    good=[a for a,b in cv2.BFMatcher().knnMatch(d1,d0,k=2) if a.distance<.74*b.distance]
    if len(good)<6:raise RuntimeError(f'{name}/{tid}: only {len(good)} matches')
    src=np.float32([k1[m.queryIdx].pt for m in good]);dst=np.float32([k0[m.trainIdx].pt for m in good])
    matrix,ok=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=10000)
    if matrix is None or not .94<np.linalg.det(matrix[:,:2])<1.06:raise RuntimeError(f'{name}/{tid}: unreliable affine')
    residual=np.linalg.norm(cv2.transform(src[None],matrix)[0]-dst,axis=1)[ok[:,0]>0]
    native=np.vstack([matrix,[0,0,1]])@np.diag([w/raw.width,h/raw.height,1.])
    warp=(np.diag([2,2,1])@native)[:2]
    aligned=cv2.warpAffine(np.array(raw),warp,(w*2,h*2),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
    valid=cv2.warpAffine(np.ones((raw.height,raw.width),np.uint8),warp,(w*2,h*2),flags=cv2.INTER_NEAREST,borderMode=cv2.BORDER_CONSTANT)
    known=np.ones((h*2,w*2),np.float32);ox,oy=part['contextRectPx1x'][:2]
    for rem in removals:
        x0,y0,x1,y1=rem['rectPx1x']; x0=max(0,x0-ox-12);y0=max(0,y0-oy-12)
        x1=min(w,x1-ox+12);y1=min(h,y1-oy+12)
        if x1>x0 and y1>y0:known[y0*2:y1*2,x0*2:x1*2]=0
    old=np.array(ref.resize((w*2,h*2),Image.Resampling.LANCZOS),dtype=np.float32)
    denom=cv2.GaussianBlur(known,(0,0),70)
    lowold=cv2.GaussianBlur(old*known[:,:,None],(0,0),70)/np.maximum(denom[:,:,None],.001)
    lownew=cv2.GaussianBlur(aligned.astype(np.float32)*known[:,:,None],(0,0),70)/np.maximum(denom[:,:,None],.001)
    aligned=np.uint8(np.clip(aligned.astype(np.float32)+.8*(lowold-lownew)*np.minimum(denom[:,:,None]*4,1),0,255))
    glob=native.copy();glob[:2,2]+=[ox,oy]
    return aligned, dict(**part,nativeSize=list(raw.size),nativePixelToContextPx1x=native[:2].tolist(),
        nativePixelToMasterPx1x=glob[:2].tolist(),resizedNativeToContextAffine=matrix.tolist(),
        siftMatches=len(good),siftInliers=int(ok.sum()),validWarpFraction=float(valid.mean()),
        inlierResidualPx1x=dict(median=float(np.median(residual)),p95=float(np.percentile(residual,95)),max=float(max(residual))),
        localWarpApplied=False,semanticStructureVerified=False)

def diagnostics(name, old, new, removals):
    d=OUT/name;w,h=old.size;small=new.resize(old.size,Image.Resampling.LANCZOS)
    def band(im):
        g=cv2.cvtColor(np.array(im),cv2.COLOR_RGB2GRAY).astype(np.float32)
        return cv2.GaussianBlur(g,(0,0),1.5)-cv2.GaussianBlur(g,(0,0),6)
    a,b=band(old),band(small);records=[];radius=24;search=12
    r,c=map(int,name.replace('r','').split('-c'));ox,oy=(c-1)*1024,(r-1)*1024
    for i,(x,y) in enumerate(LANDMARKS[name]):
        area=b[y-radius-search:y+radius+search+1,x-radius-search:x+radius+search+1]
        scores=cv2.matchTemplate(area,a[y-radius:y+radius+1,x-radius:x+radius+1],cv2.TM_CCOEFF_NORMED)
        _,score,_,loc=cv2.minMaxLoc(scores);dx,dy=loc[0]-search,loc[1]-search
        excluded=any(x+ox+radius>x0 and x+ox-radius<x1 and y+oy+radius>y0 and y+oy-radius<y1 for x0,y0,x1,y1 in [v['rectPx1x'] for v in removals])
        boundary=abs(dx)==search or abs(dy)==search
        records.append(dict(id=f'fixed-landmark-{i+1}',sourcePx1x=[x,y],displacementPx1x=[dx,dy],distancePx1x=math.hypot(dx,dy),
            normalizedCorrelation=score,overlapsRemovalBox=excluded,searchBoundaryHit=boundary,reliable=score>=.6 and not excluded and not boundary))
    reliable=[r for r in records if r['reliable']]
    structure=dict(method='Fixed source 49x49 DoG sigma1.5/6 templates, search +/-12 1x px; independent of SIFT. Correlation >=.6, removal boxes and boundary hits excluded from reliable subset.',
        thresholdPx1x=4,totalProbes=len(records),reliableProbes=len(reliable),uncertainProbes=len(records)-len(reliable),
        maxReliableDisplacementPx1x=max((r['distancePx1x'] for r in reliable),default=None),
        wholeStructureWithin4pxVerified=False,semanticStructureVerified=False,
        limitation='Sparse probes cannot certify every contour or tread. Uncertain probes retained for review; no retry to reach numeric thresholds.',probes=records)
    write_json(d/'structure.json',structure)
    sheet=Image.new('RGB',(w*2+24,h+40),'#171b24');sheet.paste(old,(0,40));sheet.paste(small,(w+24,40));dr=ImageDraw.Draw(sheet)
    dr.text((8,8),'Master | output: green <=4px, red >4px, yellow uncertain',fill='white')
    for i,p in enumerate(records):
        x,y=p['sourcePx1x'];dx,dy=p['displacementPx1x'];color='yellow' if not p['reliable'] else 'lime' if p['distancePx1x']<=4 else 'red'
        for xx,yy in [(x,y),(w+24+x+dx,y+dy)]:
            dr.ellipse((xx-4,40+yy-4,xx+4,40+yy+4),outline=color,width=2);dr.text((xx+5,40+yy),str(i+1),fill=color)
    sheet.save(d/'structure-check.jpg',quality=80)
    rois={'full_chunk':[0,0,w,h]}
    for label,x0,x1 in [('left',0,(w+1)//2),('right',(w+1)//2,w)]:
        for row,y0,y1 in ([('top',0,512),('bottom',512,h)] if h>512 else [('strip',0,h)]):rois[f'{row}_{label}']=[x0,y0,x1,y1]
    metrics={}
    for label,box in rois.items():
        size=(round((box[2]-box[0])*GAME),round((box[3]-box[1])*2.8/(3277/2560)));vals={}
        for v,im,k in [('master',old,1),('redraw',new,2)]:
            crop=im.crop(tuple(a*k for a in box)).resize(size,Image.Resampling.LANCZOS)
            gray=cv2.cvtColor(np.array(crop),cv2.COLOR_RGB2GRAY).astype(np.float64)
            vals[v]=float(cv2.Laplacian(gray,cv2.CV_64F,ksize=1).var())
        metrics[label]=dict(rectPx1x=box,deviceSize=list(size),laplacianVariance=vals,laplacianRatio=vals['redraw']/vals['master'])
    sharp=dict(method='Identical 2.8 device px/world unit; Pillow Lanczos; grayscale Laplacian variance ksize1; no sharpening.',threshold=10,primaryRoi='full_chunk',primaryRatio=metrics['full_chunk']['laplacianRatio'],rois=metrics,
        limitation='Texture/contrast and removals affect edge energy; this does not certify art quality.')
    write_json(d/'sharpness.json',sharp)
    # Full chunk at game zoom; lossless master comparison is reproducible from sources.
    size=(round(w*GAME),round(h*2.8/(3277/2560)))
    compare=Image.new('RGB',(size[0]*2+24,size[1]+40),'#171b24');dr=ImageDraw.Draw(compare)
    for i,(label,im) in enumerate([('Asia v2 master',old),('ImageGen registered 2x',new)]):
        xx=i*(size[0]+24);dr.text((xx+8,12),label+' | 2.8 device px/world unit',fill='white');compare.paste(im.resize(size,Image.Resampling.LANCZOS),(xx,40))
    compare.save(d/f'{name}-compare.jpg',quality=80,optimize=True)
    return structure,sharp

def assemble(name):
    plan=json.loads((OUT/'crop-plan.json').read_text())[name];d=OUT/name
    removals=[o for o in json.loads((OUT/'objects-inventory.json').read_text())['objects'] if o['action']=='remove-baked']
    images={};reg=[]
    for p in plan['parts']:
        images[p['id']],rec=register(name,p,removals);reg.append(rec)
    atlas,s1=seam_blend(images['q11'],images['q12']);paths=[('vertical-top',s1,0)]
    if 'q21' in images:
        bottom,s2=seam_blend(images['q21'],images['q22']);paths.append(('vertical-bottom',s2,1024))
        atlas,s3=seam_blend(atlas.transpose(1,0,2),bottom.transpose(1,0,2));atlas=atlas.transpose(1,0,2)
    else:s3=None
    x,y,x1,y1=plan['chunkRectPx1x'];w,h=x1-x,y1-y
    ex,ey=plan['parts'][0]['contextRectPx1x'][:2];ox,oy=(x-ex)*2,(y-ey)*2
    atlas=atlas[oy:oy+h*2,ox:ox+w*2];assert atlas.shape==(h*2,w*2,3)
    new=Image.fromarray(atlas);new.save(d/f'{name}-2x.webp',lossless=True,method=6)
    write_json(d/'registration.json',dict(chunk=name,coordinateFormat='global master1x [left,top,right,bottom]; affine native pixels -> context/master1x',
        chunkRectPx1x=plan['chunkRectPx1x'],outputSize=list(new.size),overlapPerCoreSidePx1x=64,neighborChunkSeamsApplied=False,
        colorCorrection=dict(sigmaMapPx=35,gain=.8,excluded='removal boxes +12px; normalized Gaussian',noSharpening=True),parts=reg))
    vx=images['q11'].shape[1]-256-ox
    traces={label:[[vx+int(v),i+offset-oy] for i,v in enumerate(path)] for label,path,offset in paths}
    if s3 is not None:traces['horizontal']=[[i-ox,images['q11'].shape[0]-256+int(v)-oy] for i,v in enumerate(s3)]
    write_json(d/'seams.json',dict(units='output2x chunk-local pixels',method='minimum squared color cost DP; 8px feather either side',visualSeamlessnessVerified=False,paths=traces))
    thumb=new.resize((w,h));marked=thumb.copy();dr=ImageDraw.Draw(marked)
    for trace in traces.values():dr.line([(xx/2,yy/2) for xx,yy in trace[::4]],fill='cyan',width=1)
    strips=[new.crop((max(0,w-128),0,min(w*2,w+128),h*2)).transpose(Image.Transpose.ROTATE_90)]
    if h>512:strips.append(new.crop((0,896,w*2,1152)))
    sheet=Image.new('RGB',(max(w*2+24,max(v.width for v in strips)),h+80+sum(v.height+24 for v in strips)),'#171b24')
    sheet.paste(thumb,(0,32));sheet.paste(marked,(w+24,32));ImageDraw.Draw(sheet).text((8,8),'Assembly | cyan = actual seams | strips below at native 2x',fill='white')
    yy=h+80
    for strip in strips:sheet.paste(strip,(0,yy));yy+=strip.height+24
    sheet.save(d/'seam-check.jpg',quality=85,optimize=True)
    write_json(d/'removed.json',dict(chunk=name,objects=[o for o in removals if o['chunk']==name],
        scope='requested removals; see visual-review.json for observed result',completeRemovalVerified=False))
    old=Image.open(ROOT/f'img/map-zone2/v2/{name}.webp').convert('RGB')
    st,sharp=diagnostics(name,old,new,removals)
    result=dict(chunk=name,completeParts=[p['id'] for p in plan['parts']],pendingParts=[],nativeSizes={p['id']:p['nativeSize'] for p in reg},outputSize=list(new.size),
        structureMaxReliablePx1x=st['maxReliableDisplacementPx1x'],reliableProbes=st['reliableProbes'],totalProbes=st['totalProbes'],sharpnessRatioLaplacian=sharp['primaryRatio'],qualityDecision='pending Claude review')
    write_json(d/'measurements.json',result);print(json.dumps(result),flush=True)

if __name__=='__main__':
    for name in sys.argv[1:] or LANDMARKS:assemble(name)
