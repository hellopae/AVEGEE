"""Adapt approved plaza SIFT/partial-affine, low-frequency correction and min-cost seam.
Run from repo root. Only this review directory is written; no ImageGen calls.
"""
from pathlib import Path
import json, math
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
O=Path(__file__).resolve().parents[1]
GAME=2.8/(4915/3840)
FONT=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',22)
def write(path,obj):path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def seam_blend(left,right,overlap=256):
 a=left[:,-overlap:].astype(np.float32);b=right[:,:overlap].astype(np.float32)
 cost=cv2.GaussianBlur(np.mean((a-b)**2,axis=2),(5,5),0);h,w=cost.shape
 dp=cost.copy();back=np.zeros((h,w),np.int16)
 for y in range(1,h):
  prev=np.pad(dp[y-1],(1,1),constant_values=np.inf)
  choices=np.stack([prev[:w],prev[1:w+1],prev[2:]])
  choice=np.argmin(choices,axis=0)-1;back[y]=choice;dp[y]+=choices[choice+1,np.arange(w)]
 path=np.zeros(h,np.int32);path[-1]=int(np.argmin(dp[-1]))
 for y in range(h-1,0,-1):path[y-1]=path[y]+back[y,path[y]]
 t=np.clip((np.arange(w)[None,:]-path[:,None]+8)/16,0,1);t=t*t*(3-2*t)
 mix=np.uint8(np.clip(a*(1-t[:,:,None])+b*t[:,:,None],0,255))
 return np.concatenate([left[:,:-overlap],mix,right[:,overlap:]],axis=1),path

def register(d,t):
 name=t['id'];raw=Image.open(d/f'{name}-native.webp').convert('RGB');target=Image.open(d/f'inputs/{name}-v5.webp').convert('RGB');w,h=target.size
 new=np.array(raw.resize((w,h),Image.Resampling.LANCZOS));old=np.array(target)
 sift=cv2.SIFT_create(nfeatures=8000,contrastThreshold=.015)
 k1,d1=sift.detectAndCompute(cv2.cvtColor(new,cv2.COLOR_RGB2GRAY),None)
 k0,d0=sift.detectAndCompute(cv2.cvtColor(old,cv2.COLOR_RGB2GRAY),None)
 if d1 is None or d0 is None:raise RuntimeError(f'No descriptors: {d.name}/{name}')
 good=[a for a,b in cv2.BFMatcher().knnMatch(d1,d0,k=2) if a.distance<.74*b.distance]
 if len(good)<6:raise RuntimeError(f'Insufficient SIFT matches: {d.name}/{name}: {len(good)}')
 src=np.float32([k1[m.queryIdx].pt for m in good]);dst=np.float32([k0[m.trainIdx].pt for m in good])
 matrix,ok=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=10000)
 if matrix is None or not .94<np.linalg.det(matrix[:,:2])<1.06:raise RuntimeError(f'Rejected affine {d.name}/{name}')
 residual=np.linalg.norm(cv2.transform(src[None],matrix)[0]-dst,axis=1)[ok[:,0]>0]
 native_to_context=np.vstack([matrix,[0,0,1]])@np.diag([w/raw.width,h/raw.height,1.])
 warp=(np.diag([2,2,1])@native_to_context)[:2]
 aligned=cv2.warpAffine(np.array(raw),warp,(w*2,h*2),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
 valid=cv2.warpAffine(np.ones((raw.height,raw.width),np.uint8),warp,(w*2,h*2),flags=cv2.INTER_NEAREST,borderMode=cv2.BORDER_CONSTANT)
 # Exclude removed objects/fog from low-frequency reference; avoid recoloring new ground as trees/clouds.
 known=np.ones((h*2,w*2),np.float32)
 for q in t['removalTargets']:
  x,y,bw,bh=q['bboxInputPx'];x0=max(0,(x-12)*2);y0=max(0,(y-12)*2);x1=min(w*2,(x+bw+12)*2);y1=min(h*2,(y+bh+12)*2)
  known[y0:y1,x0:x1]=0
 ref=np.array(target.resize((w*2,h*2),Image.Resampling.LANCZOS),dtype=np.float32)
 denom=cv2.GaussianBlur(known,(0,0),70)
 ref_low=cv2.GaussianBlur(ref*known[:,:,None],(0,0),70)/np.maximum(denom[:,:,None],.001)
 new_low=cv2.GaussianBlur(aligned.astype(np.float32)*known[:,:,None],(0,0),70)/np.maximum(denom[:,:,None],.001)
 delta=.8*(ref_low-new_low)*np.minimum(denom[:,:,None]*4,1)
 aligned=np.uint8(np.clip(aligned.astype(np.float32)+delta,0,255))
 rec=dict(t,nativeSize=list(raw.size),affine=matrix.tolist(),affineCoordinateConvention='resized native in context-map pixels -> reference context-map pixels; coordinates are crop-local',nativeToContextPx1x=native_to_context[:2].tolist(),nativeToMasterPx1x=(np.array([[1,0,t['contextMasterPx1x'][0]],[0,1,t['contextMasterPx1x'][1]],[0,0,1]])@native_to_context)[:2].tolist(),nativePxPerMapPixel=[raw.width/w,raw.height/h],siftMatches=len(good),siftInliers=int(ok.sum()),inlierResidualPx1x=dict(median=float(np.median(residual)),p95=float(np.percentile(residual,95)),max=float(max(residual))),localWarpApplied=False,validWarpFraction=float(valid.mean()),lowFrequencyCorrection='0.8 delta Gaussian sigma35 map px, removal boxes excluded and normalized; no sharpening',semanticStructureVerified=False)
 return aligned,rec

# Fixed exposed structure landmarks chosen on source, before reviewing generated alignment.
LANDMARKS={
 'r1-c2': [('rock-summit',466,44),('rock-east-tip',576,110),('cliff-peak-west',241,211),('lava-fork',96,379),('lava-fall-left',120,465),('lava-fall-base',193,581),('bridge-deck-west',82,805),('bridge-deck-east',316,852),('stair-foot-left',390,869),('stair-foot-right',534,906),('stair-mid-left',529,777),('stair-mid-right',660,817),('stair-top-left',709,626),('stair-top-right',814,663),('plaza-front-edge',884,649),('cliff-east-edge',941,702),('cliff-lower-west',386,948)],
 'r1-c3': [('mountain-west-summit',76,42),('rock-spire',214,170),('mountain-mid-summit',447,109),('mountain-east-summit',910,31),('plaza-front-left',91,650),('plaza-front-right',438,632),('plaza-east-edge',520,587),('stair-top-left',140,674),('stair-top-right',239,673),('stair-foot-left',139,773),('stair-foot-right',239,772),('cliff-face-left',263,704),('cliff-face-mid',373,697),('lower-path-edge',408,862),('lower-stair-left',274,943),('lower-stair-right',373,944),('lower-stair-foot-left',277,1000),('lower-stair-foot-right',376,1000),('path-southeast',894,971)]}
def structure(d,old,new):
 def band(im):
  g=cv2.cvtColor(im,cv2.COLOR_RGB2GRAY).astype(np.float32);return cv2.GaussianBlur(g,(0,0),1.5)-cv2.GaussianBlur(g,(0,0),6)
 a,b=band(old),band(new);records=[];r=24;search=12
 removal=json.loads((d/'removed.json').read_text());origin=(int(d.name[-1])-1)*1024
 boxes=[q['masterPx'] for q in removal['objects']]+[q['masterPx'] for q in removal['whiteLumps']]
 for label,x,y in LANDMARKS[d.name]:
  # Keep fixed centers; clip search at map boundary and record actual search origin.
  if min(x,y)<r or x+r>=1024 or y+r>=1024:continue
  x0=max(0,x-r-search);y0=max(0,y-r-search);x1=min(1024,x+r+search+1);y1=min(1024,y+r+search+1)
  template=a[y-r:y+r+1,x-r:x+r+1];area=b[y0:y1,x0:x1]
  _,conf,_,loc=cv2.minMaxLoc(cv2.matchTemplate(area,template,cv2.TM_CCOEFF_NORMED));dx=loc[0]+x0-(x-r);dy=loc[1]+y0-(y-r);dist=math.hypot(dx,dy)
  excluded=[i for i,(bx,by,bw,bh) in enumerate(boxes) if bx-origin<x+r and bx-origin+bw>x-r and by<y+r and by+bh>y-r]
  records.append(dict(id=label,overlapsRemovalBox=bool(excluded),sourcePx1x=[x,y],displacementPx1x=[dx,dy],distancePx1x=dist,normalizedCorrelation=conf,reliable=conf>=.6 and not excluded,within4px=dist<=4))
 reliable=[p for p in records if p['reliable']]
 report=dict(thresholdPx1x=4,method='Fixed 49x49 DoG sigma1.5/6 templates, normalized correlation +/-12 map px on assembled output; separate from affine inlier residuals; c2 q22 retry received three landmark coordinates as feedback.',limitation='Local patch correspondence does not certify every semantic contour; uncertain probes retained. Removed and formerly occluded structures cannot be proven against source.',totalProbes=len(records),reliableProbes=len(reliable),maxReliableDisplacementPx1x=max((p['distancePx1x'] for p in reliable),default=None),allReliableProbesWithin4px=bool(reliable) and all(p['within4px'] for p in reliable),wholeStructureWithin4pxVerified=False,semanticStructureVerified=False,redrawFeedbackLandmarks=['stair-top-left','stair-top-right','plaza-front-edge'] if d.name=='r1-c2' else [],probes=records)
 write(d/'structure.json',report)
 sheet=Image.new('RGB',(2096,1110),'#161a22');sheet.paste(Image.fromarray(old),(16,64));sheet.paste(Image.fromarray(new),(1056,64));draw=ImageDraw.Draw(sheet)
 draw.text((16,12),'v5 + repairs | fixed structure probes',font=FONT,fill='white');draw.text((1056,12),'new | green <=4px; red >4px; yellow uncertain',font=FONT,fill='white')
 for i,p in enumerate(records):
  x,y=p['sourcePx1x'];dx,dy=p['displacementPx1x'];color='#f0cb35' if not p['reliable'] else '#35efb1' if p['within4px'] else '#ff4566'
  for ox,px,py in [(16,x,y),(1056,x+dx,y+dy)]:
   draw.ellipse((ox+px-4,64+py-4,ox+px+4,64+py+4),outline=color,width=2);draw.text((ox+px+4,64+py-20),str(i+1),font=FONT,fill=color,stroke_width=1,stroke_fill='black')
 sheet.save(d/'structure-check.jpg',quality=88,subsampling=0)
 return report

def sharp(im):
 gray=cv2.cvtColor(np.array(im),cv2.COLOR_RGB2GRAY).astype(np.float64)
 return dict(laplacianVariance=float(cv2.Laplacian(gray,cv2.CV_64F,ksize=1).var()),highPassMeanSquare=float(np.mean((gray-cv2.GaussianBlur(gray,(0,0),1))**2)))

def process(chunk):
 d=O/chunk;tiles=json.loads((d/'inputs/tiles.json').read_text());images={};reg=[]
 for t in tiles:images[t['id']],rec=register(d,t);reg.append(rec)
 write(d/'registration.json',dict(chunk=chunk,outputScale=2,neighborChunkSeamsApplied=False,tiles=reg))
 top,s1=seam_blend(images['q11'],images['q12']);bottom,s2=seam_blend(images['q21'],images['q22'])
 atlas,s3=seam_blend(top.transpose(1,0,2),bottom.transpose(1,0,2));atlas=atlas.transpose(1,0,2)[:2048,128:2176]
 Image.fromarray(atlas).save(d/f'{chunk}-2x.webp',lossless=True,method=6)
 write(d/'seams.json',dict(units='2x output px in assembled chunk',featherHalfWidth=8,verticalTop=[[896+int(v)-128,i] for i,v in enumerate(s1) if i<2048],verticalBottom=[[896+int(v)-128,i+896] for i,v in enumerate(s2) if i+896<2048],horizontal=[[i-128,896+int(v)] for i,v in enumerate(s3) if 128<=i<2176]))
 old=Image.new('RGB',(1024,1024))
 for t in tiles:
  cx,cy,cw,ch=t['coreChunkPx1x'];x,y,_,_=t['contextChunkPx1x'];source=Image.open(d/f"inputs/{t['id']}-v5.webp").convert('RGB')
  old.paste(source.crop((cx-x,cy-y,cx-x+cw,cy-y+ch)),(cx,cy))
 new=Image.fromarray(atlas)
 rois={'full_chunk':[0,0,1024,1024],'upper_panorama':[0,0,1024,448],'lower_terrain':[0,448,1024,1024]};metrics={}
 for name,(x0,y0,x1,y1) in rois.items():
  size=(round((x1-x0)*GAME),round((y1-y0)*GAME));a=sharp(old.crop((x0,y0,x1,y1)).resize(size,Image.Resampling.LANCZOS));b=sharp(new.crop((x0*2,y0*2,x1*2,y1*2)).resize(size,Image.Resampling.LANCZOS))
  metrics[name]=dict(rectPx1x=[x0,y0,x1,y1],deviceSize=list(size),v5=a,new=b,laplacianRatio=b['laplacianVariance']/a['laplacianVariance'])
 write(d/'sharpness.json',dict(devicePxPerWorldUnit=2.8,devicePxPerMapPixel=GAME,threshold=10,primaryRoi='full_chunk',method='Decoded output, Pillow Lanczos at identical engine zoom, grayscale Laplacian variance ksize1. No sharpening. Texture, contrast and removals affect ratio; not a resolution multiplier.',rois=metrics))
 size=(round(1024*GAME),round(1024*GAME));panel=Image.new('RGB',(size[0]*2+24,size[1]+64),'#161a22');draw=ImageDraw.Draw(panel)
 for i,(label,im) in enumerate([('v5 + repairs',old),('ImageGen 2x2',new)]):
  x=i*(size[0]+24);draw.text((x+8,12),f'{chunk} | {label} | 2.8 device px/world unit',font=FONT,fill='white');panel.paste(im.resize(size,Image.Resampling.LANCZOS),(x,64))
 panel.save(d/f'{chunk}-compare.jpg',quality=87,subsampling=0)
 sheet=Image.new('RGB',(2200,1850),'#161a22');draw=ImageDraw.Draw(sheet);draw.text((20,10),f'{chunk}: assembled | cyan = actual minimum-cost seam',font=FONT,fill='white');sheet.paste(new.resize((1024,1024)),(20,55))
 preview=new.resize((1024,1024));pd=ImageDraw.Draw(preview)
 for path,yoff in [(s1,0),(s2,896)]:pd.line([((896+int(path[i])-128)/2,(i+yoff)/2) for i in range(0,len(path),4) if i+yoff<2048],fill='#00e7ff',width=1)
 pd.line([((i-128)/2,(896+int(s3[i]))/2) for i in range(128,2176,4)],fill='#00e7ff',width=1);sheet.paste(preview,(1120,55))
 for title,box,y in [('Vertical boundary: native 2x strip',(896,0,1152,2048),1100),('Horizontal boundary: native 2x strip',(0,896,2048,1152),1455)]:
  strip=new.crop(box)
  if strip.height>strip.width:strip=strip.transpose(Image.Transpose.ROTATE_90)
  draw.text((20,y),title,font=FONT,fill='white');sheet.paste(strip,(20,y+40))
 sheet.save(d/'seam-check.jpg',quality=88,subsampling=0)
 st=structure(d,np.array(old),np.array(new.resize((1024,1024),Image.Resampling.LANCZOS)))
 return dict(chunk=chunk,completeParts=[t['id'] for t in tiles],pendingParts=[],nativeSizes={r['id']:r['nativeSize'] for r in reg},outputSize=list(new.size),structureMaxReliablePx1x=st['maxReliableDisplacementPx1x'],structureReliableProbes=st['reliableProbes'],structureTotalProbes=st['totalProbes'],wholeStructureWithin4pxVerified=False,sharpnessRatioLaplacian=metrics['full_chunk']['laplacianRatio'],sharpnessNumericalThresholdMet=metrics['full_chunk']['laplacianRatio']>=10)
if __name__=='__main__':
 import sys
 chunks=sys.argv[1:] or ['r1-c2','r1-c3'];results=[]
 for c in chunks:
  r=process(c);results.append(r);print(json.dumps(r,indent=2))
 manifest=json.loads((O/'generation-prompts.json').read_text())
 write(O/'run-summary.json',dict(chunks=results,imageGenCalls=len(manifest['generations']),generationLimit=10,tool='built-in image_gen.imagegen',neighborChunkSeamsApplied=False,qaPassedClaimed=False,inGameTestRun=False))
