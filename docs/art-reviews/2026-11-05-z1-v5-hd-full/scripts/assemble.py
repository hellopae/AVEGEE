"""Offline SIFT/affine, low-frequency color correction and min-cost seam.
Adapted from approved plaza-detail/scripts/assemble.py. No generation/sharpening/local warp.
Run from repository root; all writes stay under this review directory.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
O=Path(__file__).resolve().parents[1]
GAME=2.8/(4915/3840)
FONT=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',24)

def seam_blend(left,right,overlap=256):
    a=left[:,-overlap:].astype(np.float32);b=right[:,:overlap].astype(np.float32)
    cost=cv2.GaussianBlur(np.mean((a-b)**2,axis=2),(5,5),0)
    h,w=cost.shape;dp=cost.copy();back=np.zeros((h,w),np.int16)
    for y in range(1,h):
        prev=np.pad(dp[y-1],(1,1),constant_values=np.inf)
        choices=np.stack([prev[:w],prev[1:w+1],prev[2:]])
        choice=np.argmin(choices,axis=0)-1;back[y]=choice
        dp[y]+=choices[choice+1,np.arange(w)]
    path=np.zeros(h,np.int32);path[-1]=int(np.argmin(dp[-1]))
    for y in range(h-1,0,-1):path[y-1]=path[y]+back[y,path[y]]
    t=np.clip((np.arange(w)[None,:]-path[:,None]+8)/16,0,1);t=t*t*(3-2*t)
    mix=np.uint8(np.clip(a*(1-t[:,:,None])+b*t[:,:,None],0,255))
    return np.concatenate([left[:,:-overlap],mix,right[:,overlap:]],axis=1),path

def align(tile,d):
    name=tile['id'];raw=Image.open(d/f'{name}-native.webp').convert('RGB')
    target=Image.open(d/f'inputs/{name}-v5.webp').convert('RGB');n=target.width
    new=np.array(raw.resize(target.size,Image.Resampling.LANCZOS))
    sift=cv2.SIFT_create(nfeatures=8000,contrastThreshold=.015)
    k1,d1=sift.detectAndCompute(cv2.cvtColor(new,cv2.COLOR_RGB2GRAY),None)
    k0,d0=sift.detectAndCompute(cv2.cvtColor(np.array(target),cv2.COLOR_RGB2GRAY),None)
    good=[a for a,b in cv2.BFMatcher().knnMatch(d1,d0,k=2) if a.distance<.74*b.distance]
    if len(good)<6:raise RuntimeError(f'Insufficient matches {d.name}/{name}: {len(good)}')
    src=np.float32([k1[m.queryIdx].pt for m in good]);dst=np.float32([k0[m.trainIdx].pt for m in good])
    matrix,ok=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=10000)
    registration_model='partial-affine'
    full,full_ok=cv2.estimateAffine2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=10000)
    # Full affine corrects measurable anisotropic ImageGen scaling; no local deformation.
    if full is not None and .94<np.linalg.det(full[:,:2])<1.06 and int(full_ok.sum())>int(ok.sum()):
        matrix,ok=full,full_ok;registration_model='full-affine'
    if matrix is None or not .94<np.linalg.det(matrix[:,:2])<1.06:raise RuntimeError(f'Unreliable affine {d.name}/{name}')
    residual=np.linalg.norm(cv2.transform(src[None],matrix)[0]-dst,axis=1)[ok[:,0]>0]
    scale=np.diag([n/raw.width,n/raw.height,1.]);affine=np.vstack([matrix,[0,0,1]])
    native_context=affine@scale;warp=(np.diag([2,2,1])@native_context)[:2]
    aligned=cv2.warpAffine(np.array(raw),warp,(n*2,n*2),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
    # Approved prototype uses the cleared pilot for broad color only, avoiding old tree ghosts.
    old=np.array(Image.open(d/f'inputs/{name}-color-reference.webp').convert('RGB').resize((n*2,n*2),Image.Resampling.LANCZOS),dtype=np.float32)
    delta=cv2.GaussianBlur(old,(0,0),70)-cv2.GaussianBlur(aligned.astype(np.float32),(0,0),70)
    aligned=np.uint8(np.clip(aligned.astype(np.float32)+.8*delta,0,255))
    gx,gy,_,_=tile['contextMapPx1x'];global_aff=np.array([[1,0,gx],[0,1,gy],[0,0,1]])@native_context
    rec={k:tile[k] for k in ['id','coreMapPx1x','contextMapPx1x','coreChunkPx1x','contextChunkPx1x']}
    rec.update(nativeFile=f'{name}-native.webp',nativeSize=list(raw.size),overlapPerSidePx1x=64,
        registrationModel=registration_model,affine=matrix.tolist(),affineConvention='resized-native context 640x640 -> v5 context map pixels',
        nativeToContextPx1x=native_context[:2].tolist(),nativeToGlobalMapPx1x=global_aff[:2].tolist(),
        nativeToContextPx2x=warp.tolist(),registrationReference=f'inputs/{name}-v5.webp',siftMatches=len(good),siftInliers=int(ok.sum()),
        inlierResidualPx1x=dict(median=float(np.median(residual)),p95=float(np.percentile(residual,95)),max=float(max(residual))),
        colorCorrection=dict(method='0.8 * Gaussian broad-color difference to cleared pilot, sigma 35 map pixels, same as approved prototype',reference=f'inputs/{name}-color-reference.webp',sigmaPx1x=35),
        interpolation='OpenCV INTER_LANCZOS4',borderMode='BORDER_REFLECT for affine uncovered fringe only',localWarpApplied=False)
    return aligned,rec

def measure(im):
    g=cv2.cvtColor(np.array(im),cv2.COLOR_RGB2GRAY).astype(np.float64)
    return float(cv2.Laplacian(g,cv2.CV_64F,ksize=1).var())

def assemble(chunk):
    d=O/chunk;tiles=[t for t in json.loads((O/'inputs.json').read_text()) if t['chunk']==chunk]
    images={};reg=[]
    for tile in tiles:
        images[tile['id']],record=align(tile,d);reg.append(record)
    top,s1=seam_blend(images['q11'],images['q12']);bottom,s2=seam_blend(images['q21'],images['q22'])
    atlas,sh=seam_blend(top.transpose(1,0,2),bottom.transpose(1,0,2));atlas=atlas.transpose(1,0,2)[128:2176,128:2176]
    out=Image.fromarray(atlas);out.save(d/f'{chunk}-2x.webp',lossless=True,method=6)
    (d/'registration.json').write_text(json.dumps(dict(schemaVersion=1,chunk=chunk,outputScale=2,chunkRectMapPx1x=[*tiles[0]['coreMapPx1x'][:2],1024,1024],tiles=reg,internalBlend=dict(method='minimum squared RGB color difference dynamic programming, 3-connected path; smoothstep feather +/-8 output px',overlapPx1x=128),neighborChunkEdgesBlended=False),indent=2))
    # Actual cut traces permit downstream inspection; raw native overlap remains intact.
    (d/'seams.json').write_text(json.dumps(dict(topVertical=s1.tolist(),bottomVertical=s2.tolist(),horizontal=sh.tolist(),coordinateSystem='2x context atlas before 128px border crop',featherHalfWidthPx2x=8)))
    baseline=Image.open(d/'inputs/v5-repaired.webp').convert('RGB')
    rois={'full_chunk':[0,0,1024,1024],'q11':[0,0,512,512],'q12':[512,0,1024,512],'q21':[0,512,512,1024],'q22':[512,512,1024,1024]};metrics={}
    for name,(x0,y0,x1,y1) in rois.items():
        size=(round((x1-x0)*GAME),round((y1-y0)*GAME))
        a=baseline.crop((x0,y0,x1,y1)).resize(size,Image.Resampling.LANCZOS)
        b=out.crop((x0*2,y0*2,x1*2,y1*2)).resize(size,Image.Resampling.LANCZOS)
        av,bv=measure(a),measure(b);metrics[name]=dict(rectPx1x=[x0,y0,x1,y1],v5LaplacianVariance=av,newLaplacianVariance=bv,ratio=bv/av)
    (d/'sharpness.json').write_text(json.dumps(dict(method='decoded images at same 2.8 device px per engine world unit; Lanczos resample; grayscale Laplacian variance ksize1; no sharpening',devicePxPerMapPixel=GAME,primaryRoi='full_chunk',threshold=10,rois=metrics,caveat='Texture contrast and object removal affect this metric; it is not a perceptual resolution multiplier.'),indent=2))
    size=round(1024*GAME);compare=Image.new('RGB',(size*2+24,size+64),'#161a22');draw=ImageDraw.Draw(compare)
    for i,(label,im) in enumerate([('v5 + repairs',baseline),('ImageGen 2x2',out)]):
        draw.text((i*(size+24)+8,16),label+' | 2.8 device px / world unit',font=FONT,fill='white');compare.paste(im.resize((size,size),Image.Resampling.LANCZOS),(i*(size+24),64))
    compare.save(d/f'{chunk}-compare.jpg',quality=84,subsampling=2)
    sheet=Image.new('RGB',(2110,1760),'#161a22');draw=ImageDraw.Draw(sheet);sheet.paste(out.resize((1024,1024)),(12,50));preview=out.resize((1024,1024));pd=ImageDraw.Draw(preview)
    for path,offset in [(s1,0),(s2,512)]:pd.line([((896+int(path[i]))/2,(i-128)/2+offset) for i in range(128,1152,4)],fill='#00e7ff',width=1)
    pd.line([((i-128)/2,(896+int(sh[i]))/2) for i in range(128,2176,4)],fill='#00e7ff',width=1)
    sheet.paste(preview,(1060,50));draw.text((12,10),chunk+' assembled; no sprite overlay',font=FONT,fill='white');draw.text((1060,10),'Cyan: actual adaptive cuts',font=FONT,fill='white')
    for y,title,box in [(1120,'Vertical overlap - 2x pixels',(896,0,1152,2048)),(1440,'Horizontal overlap - 2x pixels',(0,896,2048,1152))]:
        strip=out.crop(box)
        if strip.height>strip.width:strip=strip.transpose(Image.Transpose.ROTATE_90)
        draw.text((12,y),title,font=FONT,fill='white');sheet.paste(strip,(12,y+36))
    sheet.save(d/'seam-check.jpg',quality=84,subsampling=2)
    print(chunk, 'Laplacian ratio',metrics['full_chunk']['ratio'],'SIFT inliers',[r['siftInliers'] for r in reg])
if __name__=='__main__':
    import sys
    for c in sys.argv[1:] or ['r2-c2','r3-c3']:assemble(c)
