"""SIFT RANSAC affine -> dense optical-flow registration; feathered shared atlas.
Not a substitute for an independent semantic contour review. Units in source 1x px.
"""
from pathlib import Path
import json,sys
import numpy as np,cv2
from PIL import Image
O=Path(__file__).resolve().parents[1]
D='/Users/agapae/.codex/generated_images/01a1a974-2b85-7b52-9cae-c812e418af8b/'
RAW={'r2-c2':D+'exec-b4336021-e2a8-4a83-b467-14e31d2ab2ce.png','r2-c3':D+'exec-c34b667d-5c36-4963-8875-8d4be6d93cdd.png'}
if (O/'inputs/generation-files.json').exists():RAW.update(json.loads((O/'inputs/generation-files.json').read_text()))
records=[]
for name,path in RAW.items():
 if not Path(path).exists():continue
 if (O/f'evidence/{name}-registered.webp').exists():continue
 old=np.array(Image.open(O/f'inputs/{name}-context.jpg').convert('RGB'));raw=Image.open(path).convert('RGB');new=np.array(raw.resize((1280,1280),Image.Resampling.LANCZOS))
 raw.save(O/f'evidence/{name}-generated.webp',quality=94,method=4)
 g0=cv2.cvtColor(old,cv2.COLOR_RGB2GRAY);g1=cv2.cvtColor(new,cv2.COLOR_RGB2GRAY)
 sift=cv2.SIFT_create(nfeatures=5000,contrastThreshold=.025);k0,d0=sift.detectAndCompute(g0,None);k1,d1=sift.detectAndCompute(g1,None)
 good=[a for a,b in cv2.BFMatcher().knnMatch(d1,d0,k=2) if a.distance<.72*b.distance]
 M=np.array([[1,0,0],[0,1,0]],np.float32);inliers=0
 if len(good)>=8:
  p1=np.float32([k1[a.queryIdx].pt for a in good]);p0=np.float32([k0[a.trainIdx].pt for a in good]);mat,ok=cv2.estimateAffinePartial2D(p1,p0,method=cv2.RANSAC,ransacReprojThreshold=5,maxIters=5000)
  if mat is not None and .9<np.linalg.det(mat[:,:2])<1.1:M=mat;inliers=int(ok.sum())
 affine=cv2.warpAffine(new,M,(1280,1280),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REFLECT)
 # Estimate on blurred luminance so fine texture does not dominate the geometric warp.
 a=cv2.GaussianBlur(g0,(0,0),2);b=cv2.GaussianBlur(cv2.cvtColor(affine,cv2.COLOR_RGB2GRAY),(0,0),2)
 flow=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM).calc(a,b,None)
 flow=cv2.GaussianBlur(flow,(0,0),3);flow=np.clip(flow,-48,48)
 yy,xx=np.mgrid[0:1280,0:1280].astype(np.float32)
 # Dense flow is diagnostic only: removed trees make correspondence invalid and melt paving.
 # Retain the stable global affine registration rather than warp invented correspondences.
 aligned=affine.copy()
 # Keep local original illumination: broad 35px color-field correction, no rectangular masks.
 delta=cv2.GaussianBlur(old.astype(np.float32),(0,0),35)-cv2.GaussianBlur(aligned.astype(np.float32),(0,0),35)
 aligned=np.uint8(np.clip(aligned.astype(np.float32)+delta*.55,0,255))
 Image.fromarray(aligned).save(O/f'evidence/{name}-registered.webp',quality=95,method=4)
 record={'chunk':name,'nativeSize':list(raw.size),'contextSize':[1280,1280],'requestedSize':[2560,2560],'nativePxPerWorldUnit':raw.width/1280*4915/3840,'affine':M.tolist(),'siftMatches':len(good),'siftInliers':inliers,'denseFlowMagnitudePx':{'median':float(np.median(np.linalg.norm(flow,axis=2))),'p95':float(np.percentile(np.linalg.norm(flow,axis=2),95))},'denseFlowApplied':False,'denseFlowRejectedReason':'object removal invalidates local correspondence; avoid melted stone and cliff edges','semanticStructureVerified':False}
 (O/f'evidence/{name}-registration.json').write_text(json.dumps(record,indent=2));print(name,record,flush=True)
