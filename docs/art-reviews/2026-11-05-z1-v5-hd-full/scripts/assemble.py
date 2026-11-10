"""Prototype SIFT/partial affine, broad color matching and minimum-cost seams; no generation."""
from pathlib import Path
import json,math
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
O=Path(__file__).resolve().parents[1]
M=json.loads((O/'generation-prompts.json').read_text())
GAME=2.8/(4915/3840)
FONT=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',20)
def seam_blend(left,right,overlap=256):
 a=left[:,-overlap:].astype(np.float32);b=right[:,:overlap].astype(np.float32)
 cost=cv2.GaussianBlur(np.mean((a-b)**2,axis=2),(5,5),0);h,w=cost.shape;dp=cost.copy();back=np.zeros((h,w),np.int16)
 for y in range(1,h):
  prev=np.pad(dp[y-1],(1,1),constant_values=np.inf);choices=np.stack([prev[:w],prev[1:w+1],prev[2:]]);choice=np.argmin(choices,axis=0)-1
  back[y]=choice;dp[y]+=choices[choice+1,np.arange(w)]
 path=np.zeros(h,np.int32);path[-1]=int(np.argmin(dp[-1]))
 for y in range(h-1,0,-1):path[y-1]=path[y]+back[y,path[y]]
 t=np.clip((np.arange(w)[None,:]-path[:,None]+8)/16,0,1);t=t*t*(3-2*t)
 mix=np.uint8(np.clip(a*(1-t[:,:,None])+b*t[:,:,None],0,255))
 return np.concatenate([left[:,:-overlap],mix,right[:,overlap:]],axis=1),path

def band(im):
 g=cv2.cvtColor(im,cv2.COLOR_RGB2GRAY).astype(np.float32)
 return cv2.GaussianBlur(g,(0,0),1.5)-cv2.GaussianBlur(g,(0,0),6)
# Source landmarks fixed before examining correlation. Map pixels relative to chunk.
PROBES={'r3-c1':[( 'north-bank',90,206),('north-bank',213,207),('north-bank',327,207),('north-bank',460,192),('north-bank',580,207),('north-bank',723,213),('north-bank',866,212),('north-bank',972,209),('south-bank',64,421),('south-bank',211,483),('south-bank',410,444),('south-bank',554,448),('south-bank',710,469),('south-bank',851,470),('cliff-tip',389,353),('cliff-tip',156,129),('cliff-tip',264,106),('cliff-tip',625,153)],
'r1-c5':[('plaza-north',369,507),('plaza-north',464,512),('plaza-west',235,534),('plaza-west',186,572),('plaza-west',162,628),('plaza-east',625,576),('plaza-east',634,626),('plaza-south',222,735),('plaza-south',318,746),('plaza-east',577,750),('stairs-top-left',365,779),('stairs-top-right',447,784),('stairs-mid-left',346,825),('stairs-mid-right',437,830),('stairs-bottom-left',325,879),('stairs-bottom-right',416,883),('cliff-edge',111,720),('cliff-edge',539,825),('waterfall',409,403),('waterfall',377,318)]}
summary=[]
for chunk in ['r3-c1','r1-c5']:
 D=O/chunk;gens=[g for g in M['generations'] if g['chunk']==chunk];reg=[];ims={}
 for g in gens:
  name=g['id'];raw=Image.open(D/f'{name}-native.webp').convert('RGB');ref=Image.open(D/f'inputs/{name}-v5.webp').convert('RGB');w,h=ref.size
  new=np.array(raw.resize((w,h),Image.Resampling.LANCZOS));sift=cv2.SIFT_create(nfeatures=8000,contrastThreshold=.015)
  k1,d1=sift.detectAndCompute(cv2.cvtColor(new,cv2.COLOR_RGB2GRAY),None);k0,d0=sift.detectAndCompute(cv2.cvtColor(np.array(ref),cv2.COLOR_RGB2GRAY),None)
  good=[a for a,b in cv2.BFMatcher().knnMatch(d1,d0,k=2) if a.distance<.74*b.distance]
  if len(good)<6:raise RuntimeError(f'{chunk}/{name}: insufficient SIFT matches {len(good)}')
  src=np.float32([k1[m.queryIdx].pt for m in good]);dst=np.float32([k0[m.trainIdx].pt for m in good])
  matrix,ok=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=10000)
  if matrix is None or not .94<np.linalg.det(matrix[:,:2])<1.06:raise RuntimeError(f'{chunk}/{name}: invalid registration')
  residual=np.linalg.norm(cv2.transform(src[None],matrix)[0]-dst,axis=1)[ok[:,0]>0]
  native=np.vstack([matrix,[0,0,1]])@np.diag([w/raw.width,h/raw.height,1.])
  aligned=cv2.warpAffine(np.array(raw),(np.diag([2,2,1])@native)[:2],(w*2,h*2),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)
  old=np.array(ref.resize((w*2,h*2),Image.Resampling.LANCZOS),np.float32)
  # Exclude deleted object/fog regions from the broad color field so erased red leaves
  # and lavender fog cannot tint the restored floor back into the composite.
  valid=np.ones(old.shape[:2],np.float32);cx,cy,_,_=g['contextMapPx1x']
  removal=json.loads((D/'removed.json').read_text())
  boxes=[o['rectMapPx1x'] for o in removal['objects']]
  if chunk=='r3-c1':boxes += [[37,2032,275,153],[60,2550,310,250]]
  for bx,by,bw,bh in boxes:
   lx=max(0,round((bx-cx-16)*2));ly=max(0,round((by-cy-16)*2));rx=min(w*2,round((bx+bw-cx+16)*2));ry=min(h*2,round((by+bh-cy+16)*2))
   if rx>lx and ry>ly:valid[ly:ry,lx:rx]=0
  weights=cv2.GaussianBlur(valid,(0,0),70)
  delta=cv2.GaussianBlur((old-aligned.astype(np.float32))*valid[:,:,None],(0,0),70)/np.maximum(weights[:,:,None],.01)
  aligned=np.uint8(np.clip(aligned.astype(np.float32)+.8*delta,0,255));ims[name]=aligned
  reg.append(dict(id=name,coreMapPx1x=g['coreMapPx1x'],contextMapPx1x=g['contextMapPx1x'],nativeSize=list(raw.size),affine=matrix.tolist(),affineConvention='resized native (context width,height) to context-local 1x; nativeToContextPx1x is directly usable',nativeToContextPx1x=native[:2].tolist(),siftMatches=len(good),siftInliers=int(ok.sum()),inlierResidualPx1x={'median':float(np.median(residual)),'max':float(max(residual))},localWarpApplied=False,semanticStructureVerified=False))
 top,sv1=seam_blend(ims['q11'],ims['q12']);bottom,sv2=seam_blend(ims['q21'],ims['q22']);atlas,sh=seam_blend(top.transpose(1,0,2),bottom.transpose(1,0,2));atlas=atlas.transpose(1,0,2)
 x,y,cw,ch=gens[0]['chunkRectPx1x'];cx,cy,_,_=gens[0]['contextMapPx1x'];left=(x-cx)*2;upper=(y-cy)*2
 atlas=atlas[upper:upper+ch*2,left:left+cw*2];out=Image.fromarray(atlas);out.save(D/f'{chunk}-2x.webp',lossless=True,method=6)
 (D/'registration.json').write_text(json.dumps({'chunk':chunk,'chunkRectMapPx1x':[x,y,cw,ch],'outputSize':list(out.size),'overlapMapPx1x':128,'featherOutputPx':8,'colorCorrection':'0.8*normalized Gaussian(reference-aligned,sigma70), excluding removed object/fog boxes from color reference, at 2x; no sharpening','tiles':reg},indent=2))
 old=Image.open(D/'inputs/v5.webp').convert('RGB');a=band(np.array(old));b=band(np.array(out.resize(old.size,Image.Resampling.LANCZOS)));probes=[]
 for i,(label,px,py) in enumerate(PROBES[chunk]):
  r=24;s=12;template=a[py-r:py+r+1,px-r:px+r+1];area=b[py-r-s:py+r+s+1,px-r-s:px+r+s+1]
  _,confidence,_,loc=cv2.minMaxLoc(cv2.matchTemplate(area,template,cv2.TM_CCOEFF_NORMED));dx,dy=loc[0]-s,loc[1]-s
  probes.append(dict(id=f'{label}-{i}',sourcePx1x=[px,py],displacementPx1x=[dx,dy],distancePx1x=math.hypot(dx,dy),normalizedCorrelation=confidence,reliable=confidence>=.6,within4px=math.hypot(dx,dy)<=4))
 reliable=[p for p in probes if p['reliable']];mx=max((p['distancePx1x'] for p in reliable),default=None)
 structure={'thresholdPx1x':4,'method':'Prototype independent fixed 49x49 DoG sigma1.5/6 template probes, search +/-12 map px; confidence>=0.6. Not SIFT residual.','probes':probes,'reliableCount':len(reliable),'totalCount':len(probes),'maxReliableDisplacementPx1x':mx,'allReliableProbesWithin4px':bool(reliable) and all(p['within4px'] for p in reliable),'wholeStructureWithin4pxVerified':False,'limitation':'Local translations do not verify all contours, stair counts, liquid masks or newly exposed terrain. Low confidence probes remain recorded.'}
 (D/'structure.json').write_text(json.dumps(structure,indent=2))
 # Full chunk comparisons at identical engine zoom, not resized to fit an arbitrary panel.
 size=(round(cw*GAME),round(ch*GAME));aimg=old.resize(size,Image.Resampling.LANCZOS);bimg=out.resize(size,Image.Resampling.LANCZOS)
 def lap(im):return float(cv2.Laplacian(cv2.cvtColor(np.array(im),cv2.COLOR_RGB2GRAY).astype(np.float64),cv2.CV_64F,ksize=1).var())
 l0,l1=lap(aimg),lap(bimg);ratio=l1/l0
 cmp=Image.new('RGB',(size[0]*2+24,size[1]+64),'#161a22');dr=ImageDraw.Draw(cmp);dr.text((12,12),f'{chunk} v5 + repairs | 2.8 device px / world unit',font=FONT,fill='white');dr.text((size[0]+24,12),f'ImageGen + affine + minimum-cost seams | Laplacian {ratio:.2f}x',font=FONT,fill='white');cmp.paste(aimg,(0,64));cmp.paste(bimg,(size[0]+24,64));cmp.save(D/f'{chunk}-compare.jpg',quality=87,subsampling=0)
 sheet=Image.new('RGB',(cw*2+32,ch+64),'#161a22');sheet.paste(old,(8,56));sheet.paste(out.resize(old.size),(cw+24,56));dr=ImageDraw.Draw(sheet);dr.text((8,8),'v5 | fixed structure probes | green <=4px, red >4px, yellow uncertain',font=FONT,fill='white')
 for i,p in enumerate(probes):
  px,py=p['sourcePx1x'];dx,dy=p['displacementPx1x'];color='#edcd32' if not p['reliable'] else '#38efaa' if p['within4px'] else '#ff4055'
  for ox,xx,yy in [(8,px,py),(cw+24,px+dx,py+dy)]:dr.ellipse((ox+xx-4,56+yy-4,ox+xx+4,56+yy+4),outline=color,width=2);dr.text((ox+xx+4,56+yy-18),str(i),font=FONT,fill=color,stroke_width=1,stroke_fill='black')
 sheet.save(D/'structure-check.jpg',quality=90)
 preview=out.resize(old.size);marked=preview.copy();dr=ImageDraw.Draw(marked)
 # Retain actual cut paths in map-global coordinates for assembly audit.
 paths={'topVertical':{'startMapPx1x':[x+(gens[1]['contextMapPx1x'][0]-x),cy],'pathOutputPx':sv1.tolist()},'bottomVertical':{'startMapPx1x':[gens[3]['contextMapPx1x'][0],gens[2]['contextMapPx1x'][1]],'pathOutputPx':sv2.tolist()},'horizontal':{'startMapPx1x':[cx,gens[2]['contextMapPx1x'][1]],'pathOutputPx':sh.tolist()}}
 for path,basey in [(sv1,gens[0]['contextMapPx1x'][1]),(sv2,gens[2]['contextMapPx1x'][1])]:
  pts=[(gens[1]['contextMapPx1x'][0]-x+int(path[i])/2,basey-y+i/2) for i in range(0,len(path),4)];dr.line(pts,fill='#00e7ff',width=1)
 dr.line([(cx-x+i/2,gens[2]['contextMapPx1x'][1]-y+int(sh[i])/2) for i in range(0,len(sh),4)],fill='#00e7ff',width=1)
 (D/'seams.json').write_text(json.dumps(paths))
 seams=Image.new('RGB',(cw*2+32,ch+448),'#161a22');seams.paste(preview,(8,40));seams.paste(marked,(cw+24,40));dr=ImageDraw.Draw(seams);dr.text((8,8),'Full chunk | cyan actual cut paths',font=FONT,fill='white')
 mid=gens[1]['coreMapPx1x'][0]-x
 vstrip=out.crop((mid*2-96,0,mid*2+96,ch*2)).transpose(Image.Transpose.ROTATE_90);hstrip=out.crop((0,928,cw*2,1120));seams.paste(vstrip,(8,ch+48));seams.paste(hstrip,(8,ch+248));seams.save(D/'seam-check.jpg',quality=87,subsampling=0)
 sharp={'method':'Whole chunk grayscale Laplacian variance ksize1 after Pillow Lanczos to 2.8 device px/world unit; same prototype units; no sharpening.','devicePxPerMapPixel':GAME,'deviceSize':list(size),'v5LaplacianVariance':l0,'newLaplacianVariance':l1,'ratioToV5':ratio,'threshold':10,'meetsNumericalThreshold':ratio>=10,'limitation':'Texture/contrast and object removal affect this metric; not a resolution or visual quality multiplier.'};(D/'sharpness.json').write_text(json.dumps(sharp,indent=2))
 summary.append(dict(chunk=chunk,generationCount=len(gens)+sum(r['chunk']==chunk for r in M.get('retries',[])),completeParts=[g['id'] for g in gens],pendingParts=[],actualNativeSizes=[dict(id=q['id'],size=q['nativeSize']) for q in reg],outputSize=list(out.size),structureMaxReliablePx1x=mx,structureReliableCount=len(reliable),structureTotalCount=len(probes),wholeStructureWithin4pxVerified=False,sharpnessRatioLaplacian=ratio,sharpnessThresholdMet=ratio>=10))
 print(chunk,'sharpness',ratio,'structure max',mx,'reliable',len(reliable),'/',len(probes),'SIFT',[(q['id'],q['siftInliers']) for q in reg],flush=True)
previous=json.loads((O/'run-summary.json').read_text()) if (O/'run-summary.json').exists() else {}
previous.update(chunks=summary,imageGenCount=M['generationCount'],imageGenLimit=10,qaPassedClaimed=False,neighborChunkSeamsAssembled=False)
(O/'run-summary.json').write_text(json.dumps(previous,indent=2))
