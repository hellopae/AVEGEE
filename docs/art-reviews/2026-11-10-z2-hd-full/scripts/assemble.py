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
 name=t['id'];raw=Image.open(d/f'{name}-native.webp').convert('RGB');target=Image.open(d/f'inputs/{name}-v2.webp').convert('RGB');w,h=target.size
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

# Fixed exposed structure landmarks chosen on source before registration/output review.
LANDMARKS={
 'r1-c5':[('peak-1',200,105),('peak-2',393,60),('fall-head',432,265),('fall-foot',445,500),('plaza-north',480,573),('plaza-west',80,667),('plaza-east',670,668),('stair-top-left',348,752),('stair-top-right',459,760),('stair-foot-left',334,888),('stair-foot-right',443,893),('cliff-east',742,741)],
 'r2-c1':[('upper-plaza-west',435,60),('upper-plaza-east',925,90),('plaza-south',700,378),('stair-top-left',587,389),('stair-top-right',714,374),('stair-foot-left',626,499),('stair-foot-right',750,484),('lower-stair-top',726,559),('lower-stair-foot',773,659),('lava-fork',413,762),('lower-plaza-edge',552,841),('rock-summit',300,635)],
 'r2-c2':[('bridge-west',70,215),('bridge-east',296,267),('stair-foot-left',461,450),('stair-foot-right',547,477),('stair-top-left',756,286),('stair-top-right',833,318),('lava-fall-top',497,681),('lava-fall-base',523,832),('rock-tip',528,607),('lower-road',933,638),('cliff-center',693,548),('lava-island',480,919)],
 'r2-c3':[('plaza-west',90,241),('plaza-east',677,233),('plaza-south',432,396),('stair-top-left',258,416),('stair-top-right',384,414),('stair-foot-left',257,549),('stair-foot-right',383,548),('east-stair-top',682,396),('east-stair-foot',721,495),('cliff-east',875,442),('lower-stair-left',412,904),('lower-stair-right',528,907),('lower-stair-foot',414,995),('lower-path',390,788)]}

def structure(d,old,new):
 def band(im):
  g=cv2.cvtColor(im,cv2.COLOR_RGB2GRAY).astype(np.float32);return cv2.GaussianBlur(g,(0,0),1.5)-cv2.GaussianBlur(g,(0,0),6)
 a,b=band(old),band(new);records=[];r=24;search=12
 removal=json.loads((d/'removed.json').read_text());origin=(int(d.name[-1])-1)*1024; origin_y=(int(d.name[1])-1)*1024; height,width=old.shape[:2]
 boxes=[q['masterPx'] for q in removal['objects']]+[q['masterPx'] for q in removal['whiteLumps']]
 for label,x,y in LANDMARKS[d.name]:
  # Keep fixed centers; clip search at map boundary and record actual search origin.
  if min(x,y)<r or x+r>=width or y+r>=height:continue
  x0=max(0,x-r-search);y0=max(0,y-r-search);x1=min(width,x+r+search+1);y1=min(height,y+r+search+1)
  template=a[y-r:y+r+1,x-r:x+r+1];area=b[y0:y1,x0:x1]
  _,conf,_,loc=cv2.minMaxLoc(cv2.matchTemplate(area,template,cv2.TM_CCOEFF_NORMED));dx=loc[0]+x0-(x-r);dy=loc[1]+y0-(y-r);dist=math.hypot(dx,dy)
  excluded=[i for i,(bx,by,bw,bh) in enumerate(boxes) if bx-origin<x+r and bx-origin+bw>x-r and by-origin_y<y+r and by-origin_y+bh>y-r]
  records.append(dict(id=label,overlapsRemovalBox=bool(excluded),sourcePx1x=[x,y],displacementPx1x=[dx,dy],distancePx1x=dist,normalizedCorrelation=conf,reliable=conf>=.6 and not excluded,within4px=dist<=4))
 reliable=[p for p in records if p['reliable']]
 report=dict(thresholdPx1x=4,method='Fixed 49x49 DoG sigma1.5/6 templates, normalized correlation +/-12 map px on assembled output; separate from affine inlier residuals; selected source coordinates fixed before generation.',limitation='Local patch correspondence does not certify every semantic contour; uncertain probes retained. Removed and formerly occluded structures cannot be proven against source.',totalProbes=len(records),reliableProbes=len(reliable),maxReliableDisplacementPx1x=max((p['distancePx1x'] for p in reliable),default=None),allReliableProbesWithin4px=bool(reliable) and all(p['within4px'] for p in reliable),wholeStructureWithin4pxVerified=False,semanticStructureVerified=False,redrawFeedbackLandmarks=[],probes=records)
 write(d/'structure.json',report)
 sheet=Image.new('RGB',(2096,1110),'#161a22');sheet.paste(Image.fromarray(old),(16,64));sheet.paste(Image.fromarray(new),(1056,64));draw=ImageDraw.Draw(sheet)
 draw.text((16,12),'Asia v2 | fixed structure probes',font=FONT,fill='white');draw.text((1056,12),'new | green <=4px; red >4px; yellow uncertain',font=FONT,fill='white')
 for i,p in enumerate(records):
  x,y=p['sourcePx1x'];dx,dy=p['displacementPx1x'];color='#f0cb35' if not p['reliable'] else '#35efb1' if p['within4px'] else '#ff4566'
  for ox,px,py in [(16,x,y),(1056,x+dx,y+dy)]:
   draw.ellipse((ox+px-4,64+py-4,ox+px+4,64+py+4),outline=color,width=2);draw.text((ox+px+4,64+py-20),str(i+1),font=FONT,fill=color,stroke_width=1,stroke_fill='black')
 sheet.save(d/'structure-check.jpg',quality=78,subsampling=0)
 return report

def sharp(im):
 gray=cv2.cvtColor(np.array(im),cv2.COLOR_RGB2GRAY).astype(np.float64)
 return dict(laplacianVariance=float(cv2.Laplacian(gray,cv2.CV_64F,ksize=1).var()),highPassMeanSquare=float(np.mean((gray-cv2.GaussianBlur(gray,(0,0),1))**2)))

def process(chunk):
 d=O/chunk;tiles=json.loads((d/'inputs/tiles.json').read_text());images={};reg=[]
 for t in tiles:images[t['id']],rec=register(d,t);reg.append(rec)
 write(d/'registration.json',dict(chunk=chunk,outputScale=2,neighborChunkSeamsApplied=False,tiles=reg))
 top,s1=seam_blend(images['q11'],images['q12']);bottom,s2=seam_blend(images['q21'],images['q22'])
 atlas,s3=seam_blend(top.transpose(1,0,2),bottom.transpose(1,0,2));atlas=atlas.transpose(1,0,2)
 w=max(t['coreChunkPx1x'][0]+t['coreChunkPx1x'][2] for t in tiles);h=max(t['coreChunkPx1x'][1]+t['coreChunkPx1x'][3] for t in tiles)
 xoff=-min(t['contextChunkPx1x'][0] for t in tiles)*2;yoff=-min(t['contextChunkPx1x'][1] for t in tiles)*2
 atlas=atlas[yoff:yoff+h*2,xoff:xoff+w*2]
 Image.fromarray(atlas).save(d/f'{chunk}-2x.webp',lossless=True,quality=100,method=6)
 splitx=tiles[0]['coreChunkPx1x'][2]*2;splity=tiles[0]['coreChunkPx1x'][3]*2
 # Paths in assembled chunk output coordinates, including all overlap extents.
 vx=splitx-128;hy=splity-128
 write(d/'seams.json',dict(units='2x output px in assembled chunk',featherHalfWidth=8,verticalTop=[[vx+int(v),i-yoff] for i,v in enumerate(s1)],verticalBottom=[[vx+int(v),i+hy] for i,v in enumerate(s2)],horizontal=[[i-xoff,hy+int(v)] for i,v in enumerate(s3)]))
 old=Image.new('RGB',(w,h))
 for t in tiles:
  cx,cy,cw,ch=t['coreChunkPx1x'];x,y,_,_=t['contextChunkPx1x'];source=Image.open(d/f"inputs/{t['id']}-v2.webp").convert('RGB')
  old.paste(source.crop((cx-x,cy-y,cx-x+cw,cy-y+ch)),(cx,cy))
 new=Image.fromarray(atlas)
 rois={'full_chunk':[0,0,w,h],'upper_terrain':[0,0,w,h//2],'lower_terrain':[0,h//2,w,h]};metrics={}
 for name,(x0,y0,x1,y1) in rois.items():
  size=(round((x1-x0)*GAME),round((y1-y0)*GAME));a=sharp(old.crop((x0,y0,x1,y1)).resize(size,Image.Resampling.LANCZOS));b=sharp(new.crop((x0*2,y0*2,x1*2,y1*2)).resize(size,Image.Resampling.LANCZOS))
  metrics[name]=dict(rectPx1x=[x0,y0,x1,y1],deviceSize=list(size),v2=a,new=b,laplacianRatio=b['laplacianVariance']/a['laplacianVariance'])
 write(d/'sharpness.json',dict(devicePxPerWorldUnit=2.8,devicePxPerMapPixel=GAME,threshold=10,primaryRoi='full_chunk',method='Decoded output, Pillow Lanczos at identical engine zoom, grayscale Laplacian variance ksize1. No sharpening. Texture, contrast and removals affect ratio; not a resolution multiplier.',rois=metrics))
 size=(round(w*GAME),round(h*GAME));panel=Image.new('RGB',(size[0]*2+24,size[1]+64),'#161a22');draw=ImageDraw.Draw(panel)
 for i,(label,im) in enumerate([('Asia v2',old),('ImageGen 2x2',new)]):
  x=i*(size[0]+24);draw.text((x+8,12),f'{chunk} | {label} | 2.8 device px/world unit',font=FONT,fill='white');panel.paste(im.resize(size,Image.Resampling.LANCZOS),(x,64))
 panel.save(d/f'{chunk}-compare.jpg',quality=78,subsampling=0)
 sheet=Image.new('RGB',(2200,1850),'#161a22');draw=ImageDraw.Draw(sheet);draw.text((20,10),f'{chunk}: assembled | cyan = actual min-cost seam',font=FONT,fill='white')
 sheet.paste(new.resize((w,h)),(20,55));preview=new.resize((w,h));pd=ImageDraw.Draw(preview)
 seams=json.loads((d/'seams.json').read_text())
 for key in ['verticalTop','verticalBottom','horizontal']:
  pd.line([(x/2,y/2) for x,y in seams[key][::4]],fill='#00e7ff',width=1)
 sheet.paste(preview,(1120,55))
 for title,box,y in [('Vertical core boundary: output pixels',(splitx-128,0,splitx+128,h*2),1100),('Horizontal core boundary: output pixels',(0,splity-128,w*2,splity+128),1455)]:
  strip=new.crop(box)
  if strip.height>strip.width:strip=strip.transpose(Image.Transpose.ROTATE_90)
  draw.text((20,y),title,font=FONT,fill='white');sheet.paste(strip,(20,y+40))
 sheet.save(d/'seam-check.jpg',quality=78,subsampling=0)
 st=structure(d,np.array(old),np.array(new.resize((w,h),Image.Resampling.LANCZOS)))
 return dict(chunk=chunk,completeParts=[t['id'] for t in tiles],pendingParts=[],nativeSizes={r['id']:r['nativeSize'] for r in reg},outputSize=list(new.size),structureMaxReliablePx1x=st['maxReliableDisplacementPx1x'],structureReliableProbes=st['reliableProbes'],structureTotalProbes=st['totalProbes'],wholeStructureWithin4pxVerified=False,sharpnessRatioLaplacian=metrics['full_chunk']['laplacianRatio'],sharpnessNumericalThresholdMet=metrics['full_chunk']['laplacianRatio']>=10)
if __name__=='__main__':
 import sys
 chunks=sys.argv[1:] or ['r1-c5','r2-c1','r2-c2','r2-c3'];results=[]
 for c in chunks:
  r=process(c);results.append(r);print(json.dumps(r,indent=2))
 manifest=json.loads((O/'generation-prompts.json').read_text())
 previous=json.loads((O/'run-summary.json').read_text()).get('chunks',[]) if (O/'run-summary.json').exists() else []
 merged={r['chunk']:r for r in previous};merged.update({r['chunk']:r for r in results})
 for c in ['r1-c5','r2-c1','r2-c2','r2-c3']:
  if c not in merged:
   done=[g['id'] for g in manifest['generations'] if g['chunk']==c]
   merged[c]=dict(chunk=c,completeParts=done,pendingParts=[q for q in ['q11','q12','q21','q22'] if q not in done],assemblyPending=True)
 write(O/'run-summary.json',dict(chunks=list(merged.values()),imageGenCalls=len(manifest['generations'])+len(manifest.get('failedGenerations',[])),generationLimit=16,tool='built-in image_gen.imagegen',neighborChunkSeamsApplied=False,qaPassedClaimed=False,inGameTestRun=False))
