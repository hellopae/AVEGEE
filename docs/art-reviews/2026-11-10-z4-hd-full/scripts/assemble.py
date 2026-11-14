"""SIFT/affine registration, min-cost seams, and descriptive quality measurements.

No generative pixels here. Native ImageGen images remain lossless and untouched.
Quality metrics are evidence, not an automatic acceptance gate.
"""
import json, hashlib, sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
from prepare import OUT, ROOT, CHUNKS, master, write_json

cv2.setNumThreads(2)

def gray(a):
    return cv2.cvtColor(np.ascontiguousarray(a),cv2.COLOR_RGB2GRAY)

def lapvar(a):
    return float(cv2.Laplacian(gray(a),cv2.CV_32F).var())

def register(native, ref):
    h,w=ref.shape[:2]
    small=cv2.resize(native,(w,h),interpolation=cv2.INTER_AREA)
    sift=cv2.SIFT_create(nfeatures=14000,contrastThreshold=.012)
    k1,d1=sift.detectAndCompute(gray(small),None)
    k2,d2=sift.detectAndCompute(gray(ref),None)
    matches=[] if d1 is None or d2 is None else [m for m,n in cv2.BFMatcher().knnMatch(d1,d2,k=2) if m.distance<.78*n.distance]
    if len(matches)<8:
        raise RuntimeError(f'Insufficient SIFT evidence: {len(matches)}')
    a=np.float32([k1[m.queryIdx].pt for m in matches])
    b=np.float32([k2[m.trainIdx].pt for m in matches])
    M,inliers=cv2.estimateAffine2D(a,b,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=10000,confidence=.999,refineIters=25)
    if M is None or int(inliers.sum())<6:
        raise RuntimeError('Affine fit not supported')
    fitted=cv2.transform(a[None],M)[0]
    residual=np.linalg.norm(fitted-b,axis=1)
    good=inliers.ravel().astype(bool)
    nativeM=M@np.diag([w/native.shape[1],h/native.shape[0],1])
    out=cv2.warpAffine(native,nativeM*2,(w*2,h*2),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT_101)
    valid=cv2.warpAffine(np.full(native.shape[:2],255,np.uint8),nativeM*2,(w*2,h*2),flags=cv2.INTER_NEAREST)
    metrics=dict(matches=len(matches),inliers=int(good.sum()),inlierResidualP50Px1x=float(np.median(residual[good])),
        inlierResidualP95Px1x=float(np.percentile(residual[good],95)),inlierResidualMaxPx1x=float(residual[good].max()),
        validContextFraction=float((valid>0).mean()),
        note='SIFT inlier residuals only; not a bound on semantic geometry. No structure restoration or baseline overlay.')
    points=[dict(sourcePx1x=b[i].tolist(),registeredPx1x=fitted[i].tolist(),residualPx1x=float(residual[i])) for i in np.flatnonzero(good)]
    return out,nativeM,metrics,points

def smooth(x):
    x=np.clip(x,0,1)
    return x*x*(3-2*x)

def seam(left,right,lo,hi):
    """Join equally positioned arrays across a vertical overlap, feather +/-8 2x px."""
    cost=cv2.GaussianBlur(np.mean((left[:,lo:hi].astype(np.float32)-right[:,lo:hi])**2,axis=2),(5,5),0)
    cost[:,:10]=np.inf;cost[:,-10:]=np.inf
    h,w=cost.shape
    dp=cost.copy();back=np.zeros((h,w),np.int8)
    for y in range(1,h):
        p=np.pad(dp[y-1],(1,1),constant_values=np.inf)
        options=np.stack([p[:w],p[1:w+1],p[2:]])
        k=np.argmin(options,axis=0)
        back[y]=k-1;dp[y]+=options[k,np.arange(w)]
    path=np.empty(h,np.int32);path[-1]=np.argmin(dp[-1])
    for y in range(h-1,0,-1):path[y-1]=path[y]+back[y,path[y]]
    path+=lo
    alpha=smooth((np.arange(left.shape[1])[None,:]-path[:,None]+8)/16)
    out=np.uint8(np.clip(np.rint(left*(1-alpha[...,None])+right*alpha[...,None]),0,255))
    return out,dict(overlap2x=[lo,hi],pathPx2x=path.tolist(),meanSquaredRGBCost=float(dp[-1].min()/h),featherHalfWidthPx2x=8)

def assemble(chunk,parts):
    selected=[p for p in parts if p['chunk']==chunk]
    if not all((OUT/chunk/f"{p['part']}-native.webp").exists() for p in selected):return None
    folder=OUT/chunk
    cx0=min(p['contextRectPx1x'][0] for p in selected);cy0=min(p['contextRectPx1x'][1] for p in selected)
    cx1=max(p['contextRectPx1x'][2] for p in selected);cy1=max(p['contextRectPx1x'][3] for p in selected)
    W,H=(cx1-cx0)*2,(cy1-cy0)*2
    layers={};regs={};point_report={}
    for p in selected:
        q=p['part'];native=np.asarray(Image.open(folder/f'{q}-native.webp').convert('RGB'))
        ref=np.asarray(Image.open(folder/'inputs'/f'{q}-reference.png').convert('RGB'))
        registered,M,metric,points=register(native,ref)
        x0,y0,x1,y1=p['contextRectPx1x']
        layer=np.zeros((H,W,3),np.uint8)
        layer[(y0-cy0)*2:(y1-cy0)*2,(x0-cx0)*2:(x1-cx0)*2]=registered
        layers[q]=layer
        regs[q]={**p,'nativeFile':f'{q}-native.webp','nativeSize':list(native.shape[1::-1]),'nativeToContextPx1x':M.tolist(),
            'nativeSHA256':hashlib.sha256((folder/f'{q}-native.webp').read_bytes()).hexdigest(),'registrationEvidence':metric}
        point_report[q]=points
    rows=[];seams={}
    for row in sorted({p['part'][1] for p in selected}):
        a,b=f'q{row}1',f'q{row}2'
        lo=(regs[b]['contextRectPx1x'][0]-cx0)*2;hi=(regs[a]['contextRectPx1x'][2]-cx0)*2
        joined,stat=seam(layers[a],layers[b],lo,hi)
        rows.append(joined);seams[f'row{row}']=stat
    combined=rows[0]
    if len(rows)==2:
        lo=(regs['q21']['contextRectPx1x'][1]-cy0)*2;hi=(regs['q11']['contextRectPx1x'][3]-cy0)*2
        combined,stat=seam(rows[0].transpose(1,0,2),rows[1].transpose(1,0,2),lo,hi)
        combined=combined.transpose(1,0,2);seams['horizontal']=stat
    x0=min(p['coreRectPx1x'][0] for p in selected);y0=min(p['coreRectPx1x'][1] for p in selected)
    x1=max(p['coreRectPx1x'][2] for p in selected);y1=max(p['coreRectPx1x'][3] for p in selected)
    result=combined[(y0-cy0)*2:(y1-cy0)*2,(x0-cx0)*2:(x1-cx0)*2]
    Image.fromarray(result).save(folder/f'{chunk}-2x.webp',lossless=True,method=6)
    write_json(folder/'registration.json',dict(coordinateConvention='all rects [x0,y0,x1,y1], global master 1x pixels; affine maps native to local context 1x',chunk=chunk,parts=regs))
    write_json(folder/'seams.json',seams)
    write_json(folder/'structure-points.json',point_report)
    base=np.asarray(master().crop((x0,y0,x1,y1)))
    base2=np.asarray(Image.fromarray(base).resize((result.shape[1],result.shape[0]),Image.Resampling.LANCZOS))
    sharp=dict(method='grayscale Laplacian variance at identical 2x output resolution, baseline Lanczos 2x; no sharpening filter',baseline2x=lapvar(base2),redraw2x=lapvar(result))
    sharp['ratio']=sharp['redraw2x']/sharp['baseline2x']
    struct=dict(registration={q:r['registrationEvidence'] for q,r in regs.items()},semanticStructureMaxPx1x=None,
        note='Semantic structure max is unproven. SIFT measures only matched texture locations. Inspect structure-overlay.jpg against source and walkmask. No automatic quality gate.',sharpness=sharp)
    write_json(folder/'structure.json',struct)
    Image.fromarray(result).resize((min(1024,result.shape[1]),max(1,round(result.shape[0]*min(1024,result.shape[1])/result.shape[1]))),Image.Resampling.LANCZOS).save(folder/'seam-check.jpg',quality=94)
    # Compare at game scale 2.8 display px per world unit (1x map = 1.28 px/world).
    zoom=2.8/1.28
    # Centre crop permits side-by-side inspection without a multi-megapixel browser image.
    cw,ch=min(base.shape[1],410),min(base.shape[0],410)
    bx,by=(base.shape[1]-cw)//2,(base.shape[0]-ch)//2
    a=Image.fromarray(base).crop((bx,by,bx+cw,by+ch)).resize((round(cw*zoom),round(ch*zoom)),Image.Resampling.LANCZOS)
    b=Image.fromarray(result).crop((bx*2,by*2,(bx+cw)*2,(by+ch)*2)).resize(a.size,Image.Resampling.LANCZOS)
    cmp=Image.new('RGB',(a.width*2,a.height+28));cmp.paste(a,(0,28));cmp.paste(b,(a.width,28))
    d=ImageDraw.Draw(cmp);d.text((8,7),'v3 | centre crop at 2.8 display px/world',fill='white');d.text((a.width+8,7),'ImageGen redraw | same crop and scale',fill='white')
    cmp.save(folder/f'{chunk}-compare.jpg',quality=94)
    edge=cv2.Canny(gray(base),80,160);edge=cv2.dilate(edge,np.ones((2,2),np.uint8))>0
    overlay=result.copy();edge2=cv2.resize(edge.astype(np.uint8), (result.shape[1],result.shape[0]),interpolation=cv2.INTER_NEAREST)>0
    overlay[edge2]=np.uint8(.35*overlay[edge2]+.65*np.array([40,255,80]))
    Image.fromarray(overlay).resize((min(1200,result.shape[1]),round(result.shape[0]*min(1200,result.shape[1])/result.shape[1])),Image.Resampling.LANCZOS).save(folder/'structure-overlay.jpg',quality=92)
    write_json(folder/'removed.json',dict(chunk=chunk,removedIds=[],note='No removable baked object found on walkable floor in this chunk. Boundary architecture and inaccessible crystals retained. See ../objects-inventory.json.'))
    return dict(chunk=chunk,parts=len(selected),nativeSizes={q:r['nativeSize'] for q,r in regs.items()},sharpness=sharp,structureMaxPx1x=None,
        siftInlierResidualMaxPx1x=max(r['registrationEvidence']['inlierResidualMaxPx1x'] for r in regs.values()),qualityDecision='pending reviewer',outputSize=[result.shape[1],result.shape[0]])

if __name__=='__main__':
    parts=json.loads((OUT/'parts.json').read_text())
    for chunk in sys.argv[1:] or CHUNKS:
        result=assemble(chunk,parts)
        print(json.dumps(result,ensure_ascii=False),flush=True)
