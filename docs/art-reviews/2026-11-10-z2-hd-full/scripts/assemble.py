"""Adapt approved plaza SIFT/partial-affine, low-frequency correction and min-cost seam.
Adapted from d54fac28; active Asia v2 inputs. Run from repo root. No ImageGen calls.
"""
from pathlib import Path
import json, math
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
O=Path(__file__).resolve().parents[1]
cv2.setNumThreads(2)
cv2.setRNGSeed(234)
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

LANDMARKS={
 'r1-c1':[('stair-upper-left',413,360),('stair-upper-right',507,352),('stair-upper-foot',449,458),('plaza-west',290,597),('plaza-south',575,771),('stair-south-left',635,791),('stair-south-right',729,801),('stair-south-foot-left',610,903),('stair-south-foot-right',712,914),('lava-fall-top',226,738),('lava-fall-base',229,893),('cliff-spire',849,237)],
 'r1-c2':[('mountain-summit',474,43),('lava-fall-top',152,413),('lava-fall-base',180,586),('bridge-deck-left',48,781),('bridge-deck-right',289,832),('stair-foot-left',407,859),('stair-foot-right',513,904),('stair-top-left',750,573),('stair-top-right',866,611),('plaza-front-edge',952,655),('cliff-spire',679,227)],
 'r1-c3':[('mountain-summit',453,309),('plaza-east',511,595),('plaza-front-left',84,663),('plaza-front-right',323,664),('stair-top-left',132,669),('stair-top-right',242,669),('stair-foot-left',133,773),('stair-foot-right',242,773),('lower-stair-left',267,934),('lower-stair-right',378,934),('lower-cliff',470,954),('rock-tip',810,421)],
 'r1-c4':[('upper-stair-left',99,323),('upper-stair-right',206,323),('upper-stair-foot',150,387),('plaza-left',45,447),('plaza-south',259,672),('lower-stair-left',109,678),('lower-stair-right',212,686),('lower-stair-foot',142,780),('bridge-west',572,576),('bridge-mid-deck',751,532),('bridge-east',897,578),('river-rock',391,942)],
}

def sharp(im):
 gray=cv2.cvtColor(np.asarray(im),cv2.COLOR_RGB2GRAY).astype(np.float64)
 return float(cv2.Laplacian(gray,cv2.CV_64F,ksize=1).var())

def structure(chunk,old,new):
 def band(im):
  g=cv2.cvtColor(im,cv2.COLOR_RGB2GRAY).astype(np.float32)
  return cv2.GaussianBlur(g,(0,0),1.5)-cv2.GaussianBlur(g,(0,0),6)
 a,b=band(old),band(new); records=[];r=24;search=12
 boxes=json.loads((O/chunk/'removed.json').read_text())['objects'];ox=(int(chunk[-1])-1)*1024
 for label,x,y in LANDMARKS[chunk]:
  template=a[y-r:y+r+1,x-r:x+r+1];area=b[y-r-search:y+r+search+1,x-r-search:x+r+search+1]
  _,conf,_,loc=cv2.minMaxLoc(cv2.matchTemplate(area,template,cv2.TM_CCOEFF_NORMED))
  dx,dy=loc[0]-search,loc[1]-search
  excluded=any(bx-ox<x+r and bx-ox+bw>x-r and by<y+r and by+bh>y-r for bx,by,bw,bh in [o['masterPx'] for o in boxes])
  records.append(dict(id=label,sourcePx1x=[x,y],displacementPx1x=[dx,dy],distancePx1x=math.hypot(dx,dy),normalizedCorrelation=conf,overlapsRemovalBox=excluded,reliable=conf>=.6 and not excluded))
 reliable=[p for p in records if p['reliable']]
 report=dict(thresholdPx1x=4,method='Fixed source landmarks; 49x49 DoG sigma1.5/6 template correlation, search +/-12 1x pixels, measured on assembled output downsampled to 1x. Confidence >=0.6; removal boxes excluded. Same method as d54fac28.',maxReliableDisplacementPx1x=max((p['distancePx1x'] for p in reliable),default=None),totalProbes=len(records),reliableProbes=len(reliable),wholeStructureWithin4pxVerified=False,semanticStructureVerified=False,limitation='Affine inliers and local probes do not certify all contours. Low-correlation and search-boundary hits require human review. No retry to meet numeric thresholds.',probes=records)
 write(O/chunk/'structure.json',report)
 sheet=Image.new('RGB',(2096,1096),'#161a22');sheet.paste(Image.fromarray(old),(16,56));sheet.paste(Image.fromarray(new),(1056,56));draw=ImageDraw.Draw(sheet)
 draw.text((16,10),'Asia v2 | fixed source landmarks',font=FONT,fill='white');draw.text((1056,10),'ImageGen | green <=4; red >4; yellow uncertain',font=FONT,fill='white')
 for i,p in enumerate(records):
  x,y=p['sourcePx1x'];dx,dy=p['displacementPx1x'];color='yellow' if not p['reliable'] else '#35efb1' if p['distancePx1x']<=4 else '#ff4566'
  for px,py in [(x+16,y+56),(x+dx+1056,y+dy+56)]:
   draw.ellipse((px-4,py-4,px+4,py+4),outline=color,width=2);draw.text((px+4,py-20),str(i+1),font=FONT,fill=color,stroke_fill='black',stroke_width=1)
 sheet.save(O/chunk/'structure-check.jpg',quality=45,subsampling=2,optimize=True)
 return report

def process(chunk):
 d=O/chunk;tiles=json.loads((d/'inputs/tiles.json').read_text());images={};reg=[]
 for t in tiles:
  images[t['id']],rec=register(d,t);reg.append(rec)
 write(d/'registration.json',dict(chunk=chunk,outputScale=2,neighborChunkSeamsApplied=False,tiles=reg))
 top,s1=seam_blend(images['q11'],images['q12']);bottom,s2=seam_blend(images['q21'],images['q22'])
 atlas,s3=seam_blend(top.transpose(1,0,2),bottom.transpose(1,0,2));atlas=atlas.transpose(1,0,2)
 # Top/left clipping at the outer map edge removes context on only those sides.
 left=0 if chunk=='r1-c1' else 128
 atlas=atlas[:2048,left:left+2048]
 Image.fromarray(atlas).save(d/f'{chunk}-2x.webp',lossless=True,method=6)
 vseam=images['q11'].shape[1]-256-left
 paths=dict(verticalTop=[[vseam+int(v),i] for i,v in enumerate(s1) if i<2048],verticalBottom=[[vseam+int(v),i+896] for i,v in enumerate(s2) if i+896<2048],horizontal=[[i-left,896+int(v)] for i,v in enumerate(s3) if left<=i<left+2048])
 write(d/'seams.json',dict(units='2x output px in assembled chunk',overlap=256,featherHalfWidth=8,method='Gaussian color squared error, dynamic programming minimum-cost path; same as d54fac28',visualSeamlessnessVerified=False,**paths))
 old=Image.open(O.parents[2]/f'img/map-zone2/v2/{chunk}.webp').convert('RGB');new=Image.fromarray(atlas)
 metrics={}
 for name,(x0,y0,x1,y1) in dict(full_chunk=[0,0,1024,1024],upper_panorama=[0,0,1024,448],lower_terrain=[0,448,1024,1024]).items():
  size=(round((x1-x0)*GAME),round((y1-y0)*GAME))
  a=sharp(old.crop((x0,y0,x1,y1)).resize(size,Image.Resampling.LANCZOS));b=sharp(new.crop((x0*2,y0*2,x1*2,y1*2)).resize(size,Image.Resampling.LANCZOS))
  metrics[name]=dict(rectPx1x=[x0,y0,x1,y1],deviceSize=list(size),sourceLaplacianVariance=a,newLaplacianVariance=b,laplacianRatio=b/a)
 write(d/'sharpness.json',dict(devicePxPerWorldUnit=2.8,devicePxPerMapPixel=GAME,threshold=10,method='Decoded RGB, identical engine zoom, Pillow Lanczos, grayscale Laplacian variance ksize1; no sharpening. Texture and contrast affect the metric.',rois=metrics))
 size=(round(1024*GAME),round(1024*GAME));panel=Image.new('RGB',(size[0]*2+24,size[1]+64),'#161a22');draw=ImageDraw.Draw(panel)
 for i,(label,im) in enumerate([('Asia v2',old),('ImageGen 2x2',new)]):
  x=i*(size[0]+24);draw.text((x+8,12),f'{chunk} | {label} | 2.8 device px/world unit',font=FONT,fill='white');panel.paste(im.resize(size,Image.Resampling.LANCZOS),(x,64))
 panel.save(d/f'{chunk}-compare.jpg',quality=30,subsampling=2,optimize=True)
 sheet=Image.new('RGB',(2200,1850),'#161a22');draw=ImageDraw.Draw(sheet);draw.text((20,10),f'{chunk}: assembled | cyan = actual minimum-cost seam',font=FONT,fill='white');sheet.paste(new.resize((1024,1024)),(20,55))
 preview=new.resize((1024,1024));pd=ImageDraw.Draw(preview)
 for path in paths.values():pd.line([(x/2,y/2) for x,y in path[::4]],fill='#00e7ff',width=1)
 sheet.paste(preview,(1120,55))
 for title,box,y in [('Vertical boundary: native 2x strip',(896,0,1152,2048),1100),('Horizontal boundary: native 2x strip',(0,896,2048,1152),1455)]:
  strip=new.crop(box)
  if strip.height>strip.width:strip=strip.transpose(Image.Transpose.ROTATE_90)
  draw.text((20,y),title,font=FONT,fill='white');sheet.paste(strip,(20,y+40))
 sheet.save(d/'seam-check.jpg',quality=45,subsampling=2,optimize=True)
 st=structure(chunk,np.array(old),np.array(new.resize((1024,1024),Image.Resampling.LANCZOS)))
 return dict(chunk=chunk,completeParts=[t['id'] for t in tiles],pendingParts=[],nativeSizes={r['id']:r['nativeSize'] for r in reg},outputSize=list(new.size),structureMaxReliablePx1x=st['maxReliableDisplacementPx1x'],structureReliableProbes=st['reliableProbes'],structureTotalProbes=st['totalProbes'],wholeStructureWithin4pxVerified=False,sharpnessRatioLaplacian=metrics['full_chunk']['laplacianRatio'],qualityDecision='pending Claude review')

if __name__=='__main__':
 import sys
 chunks=sys.argv[1:] or list(LANDMARKS);results=[]
 for chunk in chunks:
  try:
   result=process(chunk)
  except Exception as error:
   result=dict(chunk=chunk,status='assembly-incomplete',error=str(error),pendingParts=['registration/assembly'],qualityDecision='pending Claude review')
  results.append(result);print(json.dumps(result,indent=2),flush=True)
 write(O/'run-summary.json',dict(zone='asia',chunkSet='1/5',chunks=results,imageGenCalls=len(json.loads((O/'generation-prompts.json').read_text())['generations']),generationLimit=16,tool='built-in image_gen.imagegen',neighborChunkSeamsApplied=False,qaPassedClaimed=False,inGameTestRun=False,qualityDecision='pending Claude review'))

