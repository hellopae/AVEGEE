#!/usr/bin/env python3
"""Register four image_gen detail tiles, blend overlaps, export exact 2x canvas.
No generation or semantic art edits are performed here. Generated detail is
registered to reference geometry, following the zone2 tile assembly approach.
"""
from pathlib import Path
import json,hashlib
import cv2
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/coordination/2026-10-30-map-b12-v3'
BOXES={'nw':(0,0,876,511),'ne':(796,0,1672,511),'sw':(0,431,876,941),'se':(796,431,1672,941)}
def main():
    total=np.zeros((1882,3344,3),np.float32);weight=np.zeros((1882,3344),np.float32);report=[]
    for name,(x0,y0,x1,y1) in BOXES.items():
        path=OUT/'tiles'/f'{name}.png';source=Image.open(path).convert('RGB');size=(2*(x1-x0),2*(y1-y0))
        generated=np.array(source.resize(size,Image.Resampling.LANCZOS))
        ref=np.array(Image.open(OUT/'tiles'/f'{name}-reference.png').convert('RGB').resize(size,Image.Resampling.LANCZOS))
        # Feature registration compensates the slight framing drift of independent edits.
        sift=cv2.SIFT_create(nfeatures=10000)
        ka,da=sift.detectAndCompute(cv2.cvtColor(generated,cv2.COLOR_RGB2GRAY),None)
        kb,db=sift.detectAndCompute(cv2.cvtColor(ref,cv2.COLOR_RGB2GRAY),None)
        matches=cv2.BFMatcher().knnMatch(da,db,k=2)
        good=[a for a,b in matches if a.distance<.72*b.distance]
        assert len(good)>=12,(name,len(good))
        a=np.float32([ka[m.queryIdx].pt for m in good]);b=np.float32([kb[m.trainIdx].pt for m in good])
        matrix,inliers=cv2.estimateAffinePartial2D(a,b,method=cv2.RANSAC,ransacReprojThreshold=5)
        assert matrix is not None,name
        tile=cv2.warpAffine(generated,matrix,size,flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT_101)
        valid=cv2.warpAffine(np.ones(generated.shape[:2],np.float32),matrix,size)
        h,w=valid.shape;wx=np.ones(w);wy=np.ones(h)
        if x0:wx[:160]=np.linspace(0,1,160)
        if x1<1672:wx[-160:]=np.linspace(1,0,160)
        if y0:wy[:160]=np.linspace(0,1,160)
        if y1<941:wy[-160:]=np.linspace(1,0,160)
        weights=valid*wy[:,None]*wx[None,:]
        total[2*y0:2*y1,2*x0:2*x1]+=tile*weights[:,:,None]
        weight[2*y0:2*y1,2*x0:2*x1]+=weights
        report.append({'tile':name,'nativeSize':source.size,'destinationSize':size,'nativeDetailScale':[source.width/(x1-x0),source.height/(y1-y0)],'registration':matrix.tolist(),'matches':len(good),'inliers':int(inliers.sum()),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    # Registration can expose a tiny strip at the external sheet edge only.
    fallback=np.array(Image.open(OUT/'repaint-reference.png').convert('RGB').resize((3344,1882),Image.Resampling.LANCZOS))
    result=np.divide(total,weight[:,:,None],out=fallback.astype(np.float32),where=weight[:,:,None]>0)
    result=np.clip(result,0,255).astype('uint8')
    asset=ROOT/'img/frontier-route/zone1-2-v6.webp';Image.fromarray(result).save(asset,quality=96,method=6)
    check=Image.open(asset);assert check.size==(3344,1882)
    (OUT/'stitch-report.json').write_text(json.dumps({'sheet':check.size,'tiles':report,'fallbackFraction':float(np.mean(weight==0)),'note':'New image_gen tile detail, affine registration and container resampling; not a simple 2x upscale of v5. Native tile scales are recorded explicitly.','assetSHA256':hashlib.sha256(asset.read_bytes()).hexdigest()},indent=2)+'\n')
if __name__=='__main__':main()
