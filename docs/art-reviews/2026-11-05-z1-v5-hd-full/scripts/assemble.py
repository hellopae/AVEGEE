"""Adapted from approved plaza assemble.py: SIFT partial affine, native warp, min-cost seam.
Offline only. Does not invoke ImageGen or edit runtime/source assets.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image,ImageDraw,ImageFont
O=Path(__file__).resolve().parents[1]

def dump(p,d):p.write_text(json.dumps(d,indent=2,ensure_ascii=False))
def seam_blend(left,right,overlap=256):
 a=left[:,-overlap:].astype(np.float32);b=right[:,:overlap].astype(np.float32)
 cost=cv2.GaussianBlur(np.mean((a-b)**2,axis=2),(5,5),0);h,w=cost.shape
 dp=cost.copy();back=np.zeros((h,w),np.int16)
 for y in range(1,h):
  prev=np.pad(dp[y-1],(1,1),constant_values=np.inf);choices=np.stack([prev[:w],prev[1:w+1],prev[2:]])
  choice=np.argmin(choices,axis=0)-1;back[y]=choice;dp[y]+=choices[choice+1,np.arange(w)]
 path=np.zeros(h,np.int32);path[-1]=int(np.argmin(dp[-1]))
 for y in range(h-1,0,-1):path[y-1]=path[y]+back[y,path[y]]
 t=np.clip((np.arange(w)[None,:]-path[:,None]+8)/16,0,1);t=t*t*(3-2*t)
 mix=np.uint8(np.clip(a*(1-t[:,:,None])+b*t[:,:,None],0,255))
 return np.concatenate([left[:,:-overlap],mix,right[:,overlap:]],axis=1),path

for name in ['r2-c5','r3-c5']:
 d=O/name;tiles=json.loads((d/'inputs/tiles.json').read_text());reg=[];images={}
 for tile in tiles:
  tid=tile['id'];raw=Image.open(d/f'{tid}-native.webp').convert('RGB');ref=Image.open(d/f'inputs/{tid}-v5.png').convert('RGB');w,h=ref.size
  small=np.array(raw.resize(ref.size,Image.Resampling.LANCZOS));sift=cv2.SIFT_create(nfeatures=8000,contrastThreshold=.015)
  k1,d1=sift.detectAndCompute(cv2.cvtColor(small,cv2.COLOR_RGB2GRAY),None);k0,d0=sift.detectAndCompute(cv2.cvtColor(np.array(ref),cv2.COLOR_RGB2GRAY),None)
  good=[a for a,b in cv2.BFMatcher().knnMatch(d1,d0,k=2) if a.distance<.74*b.distance]
  if len(good)<6:raise RuntimeError(f'{name}/{tid}: only {len(good)} matches')
  src=np.float32([k1[m.queryIdx].pt for m in good]);dst=np.float32([k0[m.trainIdx].pt for m in good]);matrix,ok=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=10000)
  if matrix is None or not .90<np.linalg.det(matrix[:,:2])<1.10:raise RuntimeError(f'{name}/{tid}: unreliable affine')
  residual=np.linalg.norm(cv2.transform(src[None],matrix)[0]-dst,axis=1);res=residual[ok[:,0]>0]
  native_to_context=np.vstack([matrix,[0,0,1]])@np.diag([w/raw.width,h/raw.height,1])
  warp=(np.diag([2,2,1])@native_to_context)[:2]
  aligned=cv2.warpAffine(np.array(raw),warp,(w*2,h*2),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
  old=np.array(ref.resize((w*2,h*2),Image.Resampling.LANCZOS),dtype=np.float32)
  # Broad color correction, same sigma35 as prototype. Avoid reintroducing removed-object colors.
  mask=np.ones((h*2,w*2),np.float32)
  for rem in tile['removal']:
   x,y,rw,rh=rem['rectInInputPx'];mask[max(0,(y-64)*2):min(h*2,(y+rh+64)*2),max(0,(x-64)*2):min(w*2,(x+rw+64)*2)]=0
  if name=='r2-c5' and tid in ['q11','q12']:mask[round(h*.5)*2:]=0
  if name=='r3-c5' and tid=='q21':mask[:]=0
  mask=cv2.GaussianBlur(mask,(0,0),20)
  delta=cv2.GaussianBlur(old,(0,0),70)-cv2.GaussianBlur(aligned.astype(np.float32),(0,0),70)
  aligned=np.uint8(np.clip(aligned.astype(np.float32)+.8*delta*mask[:,:,None],0,255));images[tid]=aligned
  ctx=tile['contextMasterPx1x'];glob=native_to_context.copy();glob[:2,2]+=ctx[:2]
  reg.append(dict(id=tid,coreMasterPx1x=tile['coreMasterPx1x'],contextMasterPx1x=ctx,
   overlapPx1x=64,nativeSize=list(raw.size),nativePixelToContextPx1x=native_to_context[:2].tolist(),nativePixelToMasterPx1x=glob[:2].tolist(),
   resizedNativeToContextAffine=matrix.tolist(),siftMatches=len(good),siftInliers=int(ok.sum()),inlierResidualPx1x={'median':float(np.median(res)),'p95':float(np.percentile(res,95)),'max':float(max(res))},localWarpApplied=False,semanticStructureVerified=False))
 top,sv1=seam_blend(images['q11'],images['q12']);bottom,sv2=seam_blend(images['q21'],images['q22']);atlas,sh=seam_blend(top.transpose(1,0,2),bottom.transpose(1,0,2));atlas=atlas.transpose(1,0,2)[128:2176,128:1766]
 assert atlas.shape==(2048,1638,3),atlas.shape
 Image.fromarray(atlas).save(d/f'{name}-2x.webp',lossless=True,method=6)
 dump(d/'registration.json',{'chunk':name,'coordinateFormat':'rectangles [x,y,width,height]; global master top-left origin; affine native pixels to map1x; no external chunk blend','chunkMasterPx1x':[4096,1024 if name=='r2-c5' else 2048,819,1024],'outputSize':[1638,2048],'colorCorrection':{'sigmaMapPx':35,'gain':.8,'excluded':'requested removal boxes +64px, lower half q11/q12 r2-c5, entire q21 r3-c5 (erased rock extends beyond survey box)','noSharpening':True},'tiles':reg})
 dump(d/'seams.json',{'units':'output2x pixels on context-inclusive rows BEFORE cropping x128/y128','verticalOverlapStart':820,'horizontalOverlapStart':1024,'q11_q12':sv1.tolist(),'q21_q22':sv2.tolist(),'top_bottom':sh.tolist(),'featherHalfWidthOutputPx':8})
 old=Image.open(d/'inputs/v5.webp');new=Image.fromarray(atlas);sx=2.8/(4915/3840);sy=2.8/(3277/2560);size=(round(819*sx),round(1024*sy))
 sheet=Image.new('RGB',(size[0]*2+36,size[1]+60),'#171b24');draw=ImageDraw.Draw(sheet)
 for i,(label,im) in enumerate([('v5 + repairs',old),('ImageGen + affine + minimum-cost seams',new)]):sheet.paste(im.resize(size,Image.Resampling.LANCZOS),(12+i*(size[0]+12),60));draw.text((12+i*(size[0]+12),20),label+' | 2.8 device px / world unit',fill='white')
 sheet.save(d/f'{name}-compare.jpg',quality=90,subsampling=0)
 # Full export overview and unscaled seam strips; colored trace in separate pane.
 sheet=Image.new('RGB',(1720,1900),'#171b24');draw=ImageDraw.Draw(sheet);overview=Image.fromarray(atlas).resize((819,1024));sheet.paste(overview,(16,40));marked=overview.copy();pd=ImageDraw.Draw(marked)
 for path,oy in [(sv1,0),(sv2,512)]:pd.line([((820+int(path[i])-128)/2,(i-128)/2+oy) for i in range(128,len(path)-128,4)],fill='cyan',width=1)
 pd.line([((i-128)/2,(1024+int(sh[i])-128)/2) for i in range(128,len(sh),4)],fill='cyan',width=1);sheet.paste(marked,(868,40));draw.text((16,12),'Assembled | cyan = actual cut paths in right pane',fill='white')
 sheet.paste(Image.fromarray(atlas).crop((692,0,948,2048)).transpose(Image.Transpose.ROTATE_90).resize((1638,205)),(16,1110));draw.text((16,1085),'Vertical seam strip (scaled 0.8x)',fill='white')
 sheet.paste(Image.fromarray(atlas).crop((0,896,1638,1152)),(16,1370));draw.text((16,1345),'Horizontal seam strip (native export scale)',fill='white');sheet.save(d/'seam-check.jpg',quality=90,subsampling=0)
 print(name,[(r['id'],r['siftInliers'],r['inlierResidualPx1x']) for r in reg],flush=True)
