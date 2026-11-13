"""Adapt approved Z1 plaza SIFT partial affine and minimum-cost seam. Offline, no sharpening."""
from pathlib import Path
import json,sys
import cv2,numpy as np
from PIL import Image,ImageDraw
from source import region,chunk
O=Path(__file__).resolve().parents[1]
def dump(p,d):p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
def seam_blend(left,right,overlap=256):
 a=left[:,-overlap:].astype(np.float32);b=right[:,:overlap].astype(np.float32)
 cost=cv2.GaussianBlur(np.mean((a-b)**2,axis=2),(5,5),0);h,w=cost.shape;cost[:,:10]=np.inf;cost[:,-10:]=np.inf
 dp=cost.copy();back=np.zeros((h,w),np.int16)
 for y in range(1,h):
  prev=np.pad(dp[y-1],(1,1),constant_values=np.inf);choices=np.stack([prev[:w],prev[1:w+1],prev[2:]])
  choice=np.argmin(choices,axis=0)-1;back[y]=choice;dp[y]+=choices[choice+1,np.arange(w)]
 path=np.zeros(h,np.int32);path[-1]=int(np.argmin(dp[-1]))
 for y in range(h-1,0,-1):path[y-1]=path[y]+back[y,path[y]]
 t=np.clip((np.arange(w)[None,:]-path[:,None]+8)/16,0,1);t=t*t*(3-2*t)
 mix=np.uint8(np.clip(a*(1-t[:,:,None])+b*t[:,:,None],0,255))
 return np.concatenate([left[:,:-overlap],mix,right[:,overlap:]],axis=1),path

def assemble(name):
 d=O/name;tiles=json.loads((d/'inputs/tiles.json').read_text());reg=[];images={}
 for tile in tiles:
  tid=tile['id'];raw=Image.open(d/f'{tid}-native.webp').convert('RGB');ref=region(tile['contextMasterPx1x']);w,h=ref.size
  small=np.array(raw.resize(ref.size,Image.Resampling.LANCZOS));sift=cv2.SIFT_create(nfeatures=8000,contrastThreshold=.015)
  k1,d1=sift.detectAndCompute(cv2.cvtColor(small,cv2.COLOR_RGB2GRAY),None);k0,d0=sift.detectAndCompute(cv2.cvtColor(np.array(ref),cv2.COLOR_RGB2GRAY),None)
  good=[a for a,b in cv2.BFMatcher().knnMatch(d1,d0,k=2) if a.distance<.74*b.distance]
  if len(good)<6:raise RuntimeError(f'{name}/{tid}: only {len(good)} matches')
  src=np.float32([k1[m.queryIdx].pt for m in good]);dst=np.float32([k0[m.trainIdx].pt for m in good]);matrix,ok=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=10000)
  if matrix is None:raise RuntimeError(f'{name}/{tid}: no affine')
  residual=np.linalg.norm(cv2.transform(src[None],matrix)[0]-dst,axis=1);res=residual[ok[:,0]>0]
  native_to_context=np.vstack([matrix,[0,0,1]])@np.diag([w/raw.width,h/raw.height,1]);warp=(np.diag([2,2,1])@native_to_context)[:2]
  aligned=cv2.warpAffine(np.array(raw),warp,(w*2,h*2),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
  valid=cv2.warpAffine(np.ones((raw.height,raw.width),np.uint8),warp,(w*2,h*2),flags=cv2.INTER_NEAREST,borderMode=cv2.BORDER_CONSTANT)
  old=np.array(ref.resize((w*2,h*2),Image.Resampling.LANCZOS),dtype=np.float32);mask=np.ones((h*2,w*2),np.float32)
  for rem in tile['removal']:
   x,y,rw,rh=rem['rectInInputPx'];mask[max(0,(y-64)*2):min(h*2,(y+rh+64)*2),max(0,(x-64)*2):min(w*2,(x+rw+64)*2)]=0
  mask=cv2.GaussianBlur(mask,(0,0),20);delta=cv2.GaussianBlur(old,(0,0),70)-cv2.GaussianBlur(aligned.astype(np.float32),(0,0),70)
  aligned=np.uint8(np.clip(aligned.astype(np.float32)+.8*delta*mask[:,:,None],0,255));images[tid]=aligned
  ctx=tile['contextMasterPx1x'];glob=native_to_context.copy();glob[:2,2]+=ctx[:2]
  reg.append(dict(id=tid,coreMasterPx1x=tile['coreMasterPx1x'],contextMasterPx1x=ctx,overlapPx1x=64,nativeSize=list(raw.size),nativePixelToContextPx1x=native_to_context[:2].tolist(),nativePixelToMasterPx1x=glob[:2].tolist(),resizedNativeToContextAffine=matrix.tolist(),siftMatches=len(good),siftInliers=int(ok.sum()),determinant=float(np.linalg.det(matrix[:,:2])),inlierResidualPx1x={'median':float(np.median(res)),'p95':float(np.percentile(res,95)),'max':float(max(res))},uncoveredContextOutputPixels=int((valid==0).sum()),borderMode='reflect; uncovered counts disclosed, no source fallback',localWarpApplied=False,semanticStructureVerified=False))
 top,sv1=seam_blend(images['q11'],images['q12']);bottom,sv2=seam_blend(images['q21'],images['q22']);atlas,sh=seam_blend(top.transpose(1,0,2),bottom.transpose(1,0,2));atlas=atlas.transpose(1,0,2)
 x=(int(name[-1])-1)*1024;ox=(x-tiles[0]['contextMasterPx1x'][0])*2;oy=0;atlas=atlas[oy:oy+2048,ox:ox+2048];assert atlas.shape==(2048,2048,3)
 Image.fromarray(atlas).save(d/f'{name}-2x.webp',lossless=True,method=6)
 dump(d/'registration.json',{'chunk':name,'coordinateFormat':'rectangles [x,y,width,height], master top-left origin; affine native pixels to map1x; no external chunk blend','chunkMasterPx1x':[x,0,1024,1024],'outputSize':[2048,2048],'colorCorrection':{'sigmaMapPx':35,'gain':.8,'excluded':'requested removal boxes +64px','noSharpening':True},'tiles':reg})
 vx=images['q11'].shape[1]-256;hy=images['q11'].shape[0]-256
 dump(d/'seams.json',{'units':'context-inclusive output2x pixels BEFORE crop','cropOrigin':[ox,oy],'verticalOverlapStart':vx,'horizontalOverlapStart':hy,'q11_q12':sv1.tolist(),'q21_q22':sv2.tolist(),'top_bottom':sh.tolist(),'featherHalfWidthOutputPx':8})
 old=chunk(name);new=Image.fromarray(atlas);size=(round(1024*2.8/(4915/3840)),round(1024*2.8/(3277/2560)))
 sheet=Image.new('RGB',(size[0]*2+36,size[1]+52),'#171b24');dr=ImageDraw.Draw(sheet)
 for i,(label,im) in enumerate([('west v1 master',old),('ImageGen + affine + minimum-cost seams',new)]):
  sheet.paste(im.resize(size,Image.Resampling.LANCZOS),(12+i*(size[0]+12),52));dr.text((12+i*(size[0]+12),16),label+' | 2.8 device px / world unit',fill='white')
 sheet.save(d/f'{name}-compare.jpg',quality=25,subsampling=2,optimize=True)
 sheet=Image.new('RGB',(2110,1640),'#171b24');dr=ImageDraw.Draw(sheet);overview=new.resize((1024,1024));sheet.paste(overview,(12,35));marked=overview.copy();pd=ImageDraw.Draw(marked)
 for path,offset in [(sv1,0),(sv2,hy)]:pd.line([((vx+int(path[i])-ox)/2,(i+offset-oy)/2) for i in range(0,len(path),4)],fill='cyan',width=1)
 pd.line([((i-ox)/2,(hy+int(sh[i])-oy)/2) for i in range(0,len(sh),4)],fill='cyan',width=1);sheet.paste(marked,(1060,35));dr.text((12,10),'Assembled | right: cyan cut paths; below: unscaled seam strips',fill='white')
 sx=vx+128-ox;sy=hy+128-oy
 sheet.paste(new.crop((max(0,sx-128),0,min(2048,sx+128),2048)).transpose(Image.Transpose.ROTATE_90),(12,1100));sheet.paste(new.crop((0,max(0,sy-128),2048,min(2048,sy+128))),(12,1370));sheet.save(d/'seam-check.jpg',quality=60,subsampling=2)
 print(name,[(r['id'],r['siftInliers'],r['inlierResidualPx1x']) for r in reg],flush=True)
if __name__=='__main__':
 for name in sys.argv[1:] or [f'r1-c{i}' for i in range(1,5)]:assemble(name)
