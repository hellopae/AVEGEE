"""Prototype SIFT/partial affine, broad color correction, min-cost seam; no generation."""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image,ImageDraw,ImageFont
O=Path(__file__).resolve().parents[1];M=json.loads((O/'generation-prompts.json').read_text());GAME=2.8/(4915/3840)
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',20)
def savejson(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2,default=lambda v:v.item() if isinstance(v,np.generic) else str(v)))
def gray(a):return cv2.cvtColor(a,cv2.COLOR_RGB2GRAY)
def seam_blend(left,right,overlap=256):
 a=left[:,-overlap:].astype(np.float32);b=right[:,:overlap].astype(np.float32)
 cost=cv2.GaussianBlur(np.mean((a-b)**2,axis=2),(5,5),0);h,w=cost.shape;dp=cost.copy();back=np.zeros((h,w),np.int16)
 for y in range(1,h):
  prev=np.pad(dp[y-1],(1,1),constant_values=np.inf);choices=np.stack([prev[:w],prev[1:w+1],prev[2:]]);ch=np.argmin(choices,axis=0)-1;back[y]=ch;dp[y]+=choices[ch+1,np.arange(w)]
 path=np.zeros(h,np.int32);path[-1]=int(np.argmin(dp[-1]))
 for y in range(h-1,0,-1):path[y-1]=path[y]+back[y,path[y]]
 t=np.clip((np.arange(w)[None,:]-path[:,None]+8)/16,0,1);t=t*t*(3-2*t)
 mix=np.uint8(np.clip(a*(1-t[:,:,None])+b*t[:,:,None],0,255))
 return np.concatenate([left[:,:-overlap],mix,right[:,overlap:]],axis=1),path
summary={'generationCount':M['generationCount'],'generationLimit':10,'chunks':[],'inGameTested':False,'qaPassed':False,'pendingParts':[],'knownDefects':['r4-c1/q12: unmarked lower forest was replaced by ground.','Inventory rectangles are rough and partly misaligned; complete object removal is not verified.'],'method':'Prototype SIFT/RANSAC partial affine; direct native warp at 2x; Gaussian sigma35 map-px broad color correction factor0.8; min-cost seam feather8 output px; no sharpening, no dense warp.'}
for c in range(1,6):
 chunk=f'r4-c{c}';d=O/chunk;gs=[g for g in M['generations'] if g['chunk']==chunk];reg=[];aligned=[]
 for g in gs:
  raw=np.array(Image.open(d/f"{g['id']}-native.webp").convert('RGB'));ref=np.array(Image.open(d/f"inputs/{g['id']}-v5.webp").convert('RGB'));h,w=ref.shape[:2];new=cv2.resize(raw,(w,h),interpolation=cv2.INTER_LANCZOS4)
  sift=cv2.SIFT_create(nfeatures=8000,contrastThreshold=.015);k1,d1=sift.detectAndCompute(gray(new),None);k0,d0=sift.detectAndCompute(gray(ref),None)
  good=[] if d0 is None or d1 is None else [a for a,b in cv2.BFMatcher().knnMatch(d1,d0,k=2) if a.distance<.74*b.distance]
  matrix=None;ok=None;res=np.array([])
  if len(good)>=6:
   src=np.float32([k1[m.queryIdx].pt for m in good]);dst=np.float32([k0[m.trainIdx].pt for m in good]);matrix,ok=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=10000)
  reliable=matrix is not None and int(ok.sum())>=6 and .94<np.linalg.det(matrix[:,:2])<1.06
  if reliable:res=np.linalg.norm(cv2.transform(src[None],matrix)[0]-dst,axis=1)[ok[:,0]>0]
  else:matrix=np.array([[1.,0,0],[0,1.,0]]);summary['pendingParts'].append(chunk+'/'+g['id']+' reliable affine registration')
  native_to_context=np.vstack([matrix,[0,0,1]])@np.diag([w/raw.shape[1],h/raw.shape[0],1]);warp=(np.diag([2,2,1])@native_to_context)[:2]
  a=cv2.warpAffine(raw,warp,(w*2,h*2),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
  old=cv2.resize(ref,(w*2,h*2),interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
  # Prototype used a cleared pilot as color reference. Avoid recoloring new ground
  # from foliage in removal survey boxes when no cleared pilot exists here.
  for removal in g['removals']:
   x0,y0,x1,y1=[round(v*2) for v in removal['rectCropPx1x']];old[y0:y1,x0:x1]=a[y0:y1,x0:x1]
  delta=cv2.GaussianBlur(old,(0,0),70)-cv2.GaussianBlur(a.astype(np.float32),(0,0),70);a=np.uint8(np.clip(a.astype(np.float32)+.8*delta,0,255));aligned.append(a)
  mapmat=native_to_context.copy();mapmat[:2,2]+=g['contextMapPx1x'][:2]
  r={'id':g['id'],'coreMapPx1x':g['coreMapPx1x'],'contextMapPx1x':g['contextMapPx1x'],'coreChunkPx1x':g['coreChunkPx1x'],'nativeSize':[raw.shape[1],raw.shape[0]],'coreOffsetInContextPx1x':[g['coreMapPx1x'][0]-g['contextMapPx1x'][0],64],'overlapMarginsPx1x':{'left':g['coreMapPx1x'][0]-g['contextMapPx1x'][0],'top':64,'right':g['contextMapPx1x'][0]+w-g['coreMapPx1x'][0]-g['coreMapPx1x'][2],'bottom':0},'siftMatches':len(good),'siftInliers':int(ok.sum()) if ok is not None else 0,'registrationReliable':reliable,'affineResizedToContext':matrix.tolist(),'affineNativeToContext':native_to_context[:2].tolist(),'affineNativeToMapPx1x':mapmat[:2].tolist(),'inlierResidualPx1x':{'max':float(res.max()),'p95':float(np.percentile(res,95)),'median':float(np.median(res))} if len(res) else None,'localWarpApplied':False,'colorCorrection':'0.8*(Gaussian(reference,sigma70)-Gaussian(aligned,sigma70)) at 2x; removal survey boxes excluded from reference delta','borderMode':'reflect'};reg.append(r)
  print(chunk,g['id'],'matches',len(good),'inliers',r['siftInliers'],'reliable',reliable,flush=True)
 savejson(d/'registration.json',{'coordinateConvention':'rect=[x,y,width,height], absolute master map pixels at 1x; affine maps native pixel centres into context or master, output scale2. Core and context coordinates are half-open.','parts':reg})
 atlas,path=seam_blend(*aligned);context_x=gs[0]['contextMapPx1x'][0];chunk_x=(c-1)*1024;cw=min(1024,4915-chunk_x);offset=(chunk_x-context_x)*2
 atlas=atlas[128:538,offset:offset+cw*2];im=Image.fromarray(atlas);im.save(d/f'{chunk}-2x.webp',lossless=True,method=6)
 savejson(d/'seam.json',{'method':'min-cost squared RGB difference, Gaussian5, path steps -1/0/+1, smoothstep feather +/-8 output pixels','pathContextOutputPx':path.tolist(),'overlapGlobalMapPx1x':[gs[1]['contextMapPx1x'][0],3008,128,269],'betweenChunksBlended':False})
 v5=Image.open(d/'inputs/v5.webp').convert('RGB');device=(round(cw*GAME),round(205*GAME));oldgame=v5.resize(device,Image.Resampling.LANCZOS);newgame=im.resize(device,Image.Resampling.LANCZOS)
 def lap(i):return float(cv2.Laplacian(gray(np.array(i)).astype(np.float64),cv2.CV_64F,ksize=1).var())
 oldlap=lap(oldgame);newlap=lap(newgame);ratio=newlap/oldlap
 compare=Image.new('RGB',(device[0]*2+36,device[1]+60),'#171b22');dr=ImageDraw.Draw(compare);dr.text((12,10),f'{chunk}: v5 | ImageGen, 2.8 device px/world unit',font=font,fill='white');compare.paste(oldgame,(12,48));compare.paste(newgame,(24+device[0],48));compare.save(d/f'{chunk}-compare.jpg',quality=94,subsampling=0)
 # Prototype-independent local DoG correspondence, fixed grid plus stair-edge probes.
 base=np.array(v5);out=np.array(im.resize(v5.size,Image.Resampling.LANCZOS));b=gray(base).astype(np.float32);a=gray(out).astype(np.float32)
 b=cv2.GaussianBlur(b,(0,0),1)-cv2.GaussianBlur(b,(0,0),4);a=cv2.GaussianBlur(a,(0,0),1)-cv2.GaussianBlur(a,(0,0),4)
 pts=[(x,y,'fixed-grid') for y in [40,100,164] for x in range(40,cw-36,80)]
 if c==3:pts += [(x,y,'south-stair/path-edge') for x in [336,346,482,492] for y in [36,80,124,166]]
 records=[]
 for x,y,kind in pts:
  patch=b[y-24:y+25,x-24:x+25];search=a[y-36:y+37,x-36:x+37];scores=cv2.matchTemplate(search,patch,cv2.TM_CCOEFF_NORMED);_,score,_,loc=cv2.minMaxLoc(scores);dx=loc[0]-12;dy=loc[1]-12;records.append({'pointPx1x':[x,y],'kind':kind,'score':score,'offsetPx1x':[dx,dy],'distancePx1x':float(np.hypot(dx,dy)),'confident':score>=.6,'searchBoundary':abs(dx)==12 or abs(dy)==12})
 confident=[r for r in records if r['confident']];mx=max((r['distancePx1x'] for r in confident),default=None)
 st={'method':'Fixed grid + south path edge DoG patch49 search+/-12 map px; confidence NCC>=0.6. Texture correspondence is NOT full semantic contour verification. All low confidence points retained.','points':records,'confidentCount':len(confident),'totalCount':len(records),'maxConfidentDisplacementPx1x':mx,'wholeStructureWithin4pxVerified':False,'semanticStructureVerified':False,'thresholdPx1x':4,'confidentSamplesWithin4px':mx is not None and mx<=4,'knownDefects':summary['knownDefects'] if c==1 else []};savejson(d/'structure.json',st)
 # Actual cut trace on separate image, never baked into export.
 sheet=Image.new('RGB',(im.width,im.height*2+90),'#171b22');draw=ImageDraw.Draw(sheet);draw.text((12,8),f'{chunk}: assembled / cyan = actual min-cost seam',font=font,fill='white');sheet.paste(im,(0,40));marked=im.copy();md=ImageDraw.Draw(marked);overlap_x=(gs[1]['contextMapPx1x'][0]-chunk_x)*2;md.line([(overlap_x+int(path[y+128]),y) for y in range(410)],fill='#00eeff',width=2);sheet.paste(marked,(0,im.height+70));sheet.save(d/'seam-check.jpg',quality=93,subsampling=0)
 summary['chunks'].append({'chunk':chunk,'parts':['q11','q12'],'generationCount':2,'nativeSizes':[r['nativeSize'] for r in reg],'outputSize':list(im.size),'laplacianV5':oldlap,'laplacianNew':newlap,'sharpnessRatio':ratio,'sharpnessAtLeast10':ratio>=10,'structureMaxConfidentPx1x':mx,'structureConfidentPoints':len(confident),'structureTotalPoints':len(records),'wholeStructureWithin4pxVerified':False,'allAffinesReliable':all(r['registrationReliable'] for r in reg),'objectRemovalVerified':False,'seamsVisuallyVerified':False})
 print(chunk,'ratio',ratio,'structureMax',mx,flush=True)
summary['sharpnessMethod']={'devicePxPerWorldUnit':2.8,'devicePxPerMapPixel':GAME,'roi':'entire core per chunk; same decoded Lanczos game scale','metric':'grayscale Laplacian variance ksize1','caveat':'Texture and contrast influence ratio; this is not a multiplier of perceived resolution.'}
reviewpath=O/'manual-review.json'
if reviewpath.exists():
 review=json.loads(reviewpath.read_text());summary['manualReview']=review;summary['pendingCorrections']=review['pendingCorrections']
 for record in summary['chunks']:
  record['seamReview']=review['seamReview'][record['chunk']]
summary['totalBytes']=sum(p.stat().st_size for p in O.rglob('*') if p.is_file());savejson(O/'run-summary.json',summary)
