"""Adapted from approved plaza-detail assemble.py: partial affine, low-field color, min-cost seams.
No generation, sharpening, optical flow, or edits to runtime assets. Run from repo root.
"""
from pathlib import Path
import json,shutil
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
O=Path(__file__).resolve().parents[1]
TILES=json.loads((O/'inputs-manifest.json').read_text())
GEN=json.loads((O/'generation-prompts.json').read_text())
for i,g in enumerate(GEN['generations']):
 d=O/g['chunk'];dest=d/(g['id']+'-native.webp')
 if 'nativeSize' not in g:g['nativeSize']=list(Image.open(g['nativeFile']).size)
 if any(q['chunk']==g['chunk'] and q['id']==g['id'] for q in GEN['generations'][i+1:]):
  g['archivedResult']=None
  g['archiveNote']='Superseded; retained generation provenance and actual size, not part of selected eight deliverables.'
  continue
 if not dest.exists():
  Image.open(g['nativeFile']).convert('RGB').save(dest,lossless=True,method=6)
 g['archivedResult']=str(dest.relative_to(O))
(O/'generation-prompts.json').write_text(json.dumps(GEN,ensure_ascii=False,indent=2))

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

font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',24)
for chunk in ['r1-c4','r3-c4']:
 d=O/chunk;images={};regs=[]
 for tile in [t for t in TILES if t['chunk']==chunk]:
  name=tile['id'];raw=Image.open(d/f'{name}-native.webp').convert('RGB');target=Image.open(d/f'inputs/{name}-v5.png').convert('RGB');w,h=target.size
  new=np.array(raw.resize((w,h),Image.Resampling.LANCZOS));old=np.array(target)
  sift=cv2.SIFT_create(nfeatures=8000,contrastThreshold=.015)
  k1,ds1=sift.detectAndCompute(cv2.cvtColor(new,cv2.COLOR_RGB2GRAY),None);k0,ds0=sift.detectAndCompute(cv2.cvtColor(old,cv2.COLOR_RGB2GRAY),None)
  good=[a for a,b in cv2.BFMatcher().knnMatch(ds1,ds0,k=2) if a.distance<.74*b.distance]
  if len(good)<6:raise RuntimeError(f'Insufficient SIFT correspondences: {chunk}/{name}: {len(good)}')
  src=np.float32([k1[m.queryIdx].pt for m in good]);dst=np.float32([k0[m.trainIdx].pt for m in good])
  matrix,ok=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=10000)
  if matrix is None or not .90<np.linalg.det(matrix[:,:2])<1.10:raise RuntimeError(f'Unreliable registration {chunk}/{name}')
  residual=np.linalg.norm(cv2.transform(src[None],matrix)[0]-dst,axis=1)[ok[:,0]>0]
  # Native -> context 1x -> registered context 1x -> output context 2x.
  A=np.vstack([matrix,[0,0,1]]);S=np.diag([w/raw.width,h/raw.height,1.]);warp=(np.diag([2,2,1])@A@S)[:2]
  aligned=cv2.warpAffine(np.array(raw),warp,(w*2,h*2),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
  # Broad color only; original repair/base reference, same sigma/strength as prototype.
  ref=np.array(target.resize((w*2,h*2),Image.Resampling.LANCZOS),dtype=np.float32)
  delta=cv2.GaussianBlur(ref,(0,0),70)-cv2.GaussianBlur(aligned.astype(np.float32),(0,0),70)
  aligned=np.uint8(np.clip(aligned.astype(np.float32)+.8*delta,0,255));images[name]=aligned
  native_to_context=A@S
  x,y,_,_=tile['contextMasterPx1x'];T=np.array([[1,0,x],[0,1,y],[0,0,1]])
  regs.append(dict(id=name,corePx1x=tile['coreChunkPx1x'],contextPx1x=tile['contextChunkPx1x'],coreMasterPx1x=tile['coreMasterPx1x'],contextMasterPx1x=tile['contextMasterPx1x'],nativeSize=list(raw.size),nativePxPerMapPixel=[raw.width/w,raw.height/h],registrationReference='v5+repairs master crop',affine=matrix.tolist(),affineMeaning='resized native context 1x to reference context 1x',nativeToContextPx1x=native_to_context[:2].tolist(),nativeToMasterPx1x=(T@native_to_context)[:2].tolist(),nativeToOutputContext2x=warp.tolist(),siftMatches=len(good),siftInliers=int(ok.sum()),inlierResidualPx1x=dict(median=float(np.median(residual)),p95=float(np.percentile(residual,95)),max=float(max(residual))),localWarpApplied=False,semanticStructureVerified=False,colorCorrection=dict(gaussianSigmaMapPx=35,strength=.8,reference=f'inputs/{name}-v5.png')))
  print(chunk,name,'matches/inliers',len(good),int(ok.sum()),'p95',np.percentile(residual,95),flush=True)
 top,sv1=seam_blend(images['q11'],images['q12']);bottom,sv2=seam_blend(images['q21'],images['q22'])
 atlas,sh=seam_blend(top.transpose(1,0,2),bottom.transpose(1,0,2));atlas=atlas.transpose(1,0,2)
 yoff=0 if chunk=='r1-c4' else 128
 atlas=atlas[yoff:yoff+2048,128:2176]
 Image.fromarray(atlas).save(d/f'{chunk}-2x.webp',lossless=True,method=6)
 (d/'registration.json').write_text(json.dumps(regs,indent=2))
 (d/'seams.json').write_text(json.dumps(dict(method='minimum squared RGB difference, Gaussian 5x5, dynamic path, smoothstep feather 8 output px per side',verticalTop=sv1.tolist(),verticalBottom=sv2.tolist(),horizontal=sh.tolist(),overlapOutputPx=256,externalChunkSeamsBlended=False,cropOffsetOutputPx=[128,yoff]),indent=2))
 # Full two-panel compare at exact game zoom (device px/world unit).
 game=2.8/(4915/3840);n=round(1024*game)
 v5=Image.open(d/'inputs/v5-repaired.webp').convert('RGB')
 sheet=Image.new('RGB',(n*2+48,n+82),'#161a22');draw=ImageDraw.Draw(sheet)
 for i,(label,im) in enumerate([('v5 + repairs',v5),('ImageGen HD | internal seams only',Image.fromarray(atlas))]):
  draw.text((16+i*(n+16),12),label+' | 2.8 device px/world unit',font=font,fill='white');sheet.paste(im.resize((n,n),Image.Resampling.LANCZOS),(16+i*(n+16),66))
 sheet.save(d/f'{chunk}-compare.jpg',quality=91,subsampling=0)
 overview=Image.fromarray(atlas).resize((1024,1024),Image.Resampling.LANCZOS);marked=overview.copy();pd=ImageDraw.Draw(marked)
 # Actual seam traces in combined canvas coordinates.
 bottom_y=top.shape[0]-256
 for path,base_y in [(sv1,0),(sv2,bottom_y)]:
  pts=[((896+int(path[i])-128)/2,(base_y+i-yoff)/2) for i in range(0,len(path),4)];pd.line(pts,fill='#00e7ff',width=1)
 pts=[((i-128)/2,(top.shape[0]-256+int(sh[i])-yoff)/2) for i in range(0,len(sh),4)];pd.line(pts,fill='#00e7ff',width=1)
 check=Image.new('RGB',(2112,1750),'#161a22');draw=ImageDraw.Draw(check)
 check.paste(overview,(16,64));check.paste(marked,(1072,64));draw.text((16,12),'Assembled terrain | no sprite cover',font=font,fill='white');draw.text((1072,12),'Cyan = actual minimum-cost seam',font=font,fill='white')
 for label,box,yy in [('Vertical center strip',(896,0,1152,2048),1120),('Horizontal center strip',(0,896,2048,1152),1430)]:
  strip=Image.fromarray(atlas).crop(box)
  if strip.height>strip.width:strip=strip.transpose(Image.Transpose.ROTATE_90)
  draw.text((16,yy),label+' | unscaled 2x pixels',font=font,fill='white');check.paste(strip,(16,yy+40))
 check.save(d/'seam-check.jpg',quality=90,subsampling=0)
