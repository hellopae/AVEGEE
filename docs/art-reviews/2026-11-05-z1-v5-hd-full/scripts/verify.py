"""Deliverable integrity and independent local structure diagnostics. No QA sign-off.
Run after assemble.py. Retains low-confidence and failed probes in evidence.
"""
from pathlib import Path
import json,math,hashlib
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
O=Path(__file__).resolve().parents[1]
GEN=json.loads((O/'generation-prompts.json').read_text())
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',18)
# Fixed exposed stair/cliff/bank landmarks selected from v5, before inspecting HD measurements.
LANDMARKS={
'r1-c4': [('upper-stair-left',100,340),('upper-stair-right',218,340),('upper-stair-foot-left',100,382),('upper-stair-foot-right',218,382),('plaza-west-edge',67,659),('plaza-south-edge',291,666),('plaza-east-edge',492,596),('lower-stair-top-left',95,721),('lower-stair-top-right',197,727),('lower-stair-bottom-left',50,825),('lower-stair-bottom-right',141,840),('cliff-west',224,792),('cliff-center',342,750),('cliff-east',451,679),('bridge-west-deck',647,553),('bridge-center-deck',758,525),('bridge-east-deck',873,558),('bridge-west-support',641,644),('bridge-east-support',848,643),('waterfall-lip-left',923,682),('waterfall-lip-right',978,676),('island-rock-tip',764,699),('island-front-bank',836,870),('river-west-bank',451,940),('river-east-bank',632,901),('snow-bank',948,571)],
'r3-c4': [('stair-left-mid',40,105),('stair-right-mid',126,105),('stair-foot',86,147),('north-bank-1',178,151),('north-bank-2',303,159),('north-bank-3',420,180),('north-bank-4',543,180),('north-bank-5',665,190),('north-bank-6',826,219),('north-bank-7',951,214),('north-cliff-tip',507,88),('east-cliff-tip',943,125),('south-bank-1',160,429),('south-bank-2',294,467),('south-bank-3',443,459),('south-bank-4',580,480),('south-bank-5',740,460),('south-bank-6',896,465),('foreground-rock-1',205,688),('foreground-rock-2',170,827),('foreground-rock-3',502,861),('foreground-rock-4',576,848),('foreground-rock-5',692,816),('east-rock-tip',922,683)]}

def band(im):
 g=cv2.cvtColor(im,cv2.COLOR_RGB2GRAY).astype(np.float32)
 return cv2.GaussianBlur(g,(0,0),1.5)-cv2.GaussianBlur(g,(0,0),6)
def lap(im):return float(cv2.Laplacian(cv2.cvtColor(np.array(im),cv2.COLOR_RGB2GRAY).astype(np.float64),cv2.CV_64F,ksize=1).var())
summary=[]
for chunk in ['r1-c4','r3-c4']:
 d=O/chunk;oldim=Image.open(d/'inputs/v5-repaired.webp').convert('RGB');newim=Image.open(d/f'{chunk}-2x.webp').convert('RGB')
 old=np.array(oldim);new=np.array(newim.resize((1024,1024),Image.Resampling.LANCZOS));a,b=band(old),band(new)
 records=[];radius=24;search=12
 for label,x,y in LANDMARKS[chunk]:
  template=a[y-radius:y+radius+1,x-radius:x+radius+1];area=b[y-radius-search:y+radius+search+1,x-radius-search:x+radius+search+1]
  _,confidence,_,loc=cv2.minMaxLoc(cv2.matchTemplate(area,template,cv2.TM_CCOEFF_NORMED));dx,dy=loc[0]-search,loc[1]-search;dist=math.hypot(dx,dy)
  records.append(dict(id=label,sourcePx1x=[x,y],displacementPx1x=[dx,dy],distancePx1x=dist,normalizedCorrelation=confidence,reliable=confidence>=.6,within4px=dist<=4,searchBoundaryHit=abs(dx)==search or abs(dy)==search))
 reliable=[r for r in records if r['reliable']];maximum=max((r['distancePx1x'] for r in reliable),default=None)
 structure=dict(thresholdPx1x=4,method='Prototype independent 49x49 DoG sigma1.5/6 template correspondence, search +/-12 map pixels, correlation>=0.6. Fixed v5 probes, all retained.',totalProbes=len(records),reliableProbes=len(reliable),maxReliableDisplacementPx1x=maximum,allReliableProbesWithin4px=bool(reliable) and all(r['within4px'] for r in reliable),wholeStructureWithin4pxVerified=False,semanticStructureVerified=False,limitation='Patch correspondence is not full contour verification. New rock exposed by removed fog, repeated stair treads and changed vegetation may defeat matching. Search-limited and low-confidence probes remain recorded; none certifies animation-mask alignment.',probes=records)
 (d/'structure.json').write_text(json.dumps(structure,indent=2))
 # Full chunk primary; fixed quadrant/terrain crops show dependence on scene content.
 game=2.8/(4915/3840);rois={'full_chunk':[0,0,1024,1024],'upper_left':[0,0,512,512],'upper_right':[512,0,512,512],'lower_left':[0,512,512,512],'lower_right':[512,512,512,512]};metrics={}
 for name,(x,y,w,h) in rois.items():
  size=(round(w*game),round(h*game));baseline=oldim.crop((x,y,x+w,y+h)).resize(size,Image.Resampling.LANCZOS);hd=newim.crop((x*2,y*2,(x+w)*2,(y+h)*2)).resize(size,Image.Resampling.LANCZOS)
  lo,ln=lap(baseline),lap(hd);metrics[name]=dict(rectPx1x=[x,y,w,h],deviceSize=list(size),v5LaplacianVariance=lo,hdLaplacianVariance=ln,ratio=ln/lo)
 ratio=metrics['full_chunk']['ratio']
 (d/'sharpness.json').write_text(json.dumps(dict(gameDevicePxPerWorldUnit=2.8,devicePxPerMapPixel=game,method='Same Lanczos game zoom; grayscale Laplacian variance ksize=1. No sharpening. Full chunk primary ROI, fixed quadrants supplementary.',threshold=10,primaryRatio=ratio,meetsNumericalThreshold=ratio>=10,limitation='Texture/contrast/object removal affect variance; ratio is not a resolution or beauty multiplier.',rois=metrics),indent=2))
 sheet=Image.new('RGB',(2096,1100),'#161a22');sheet.paste(oldim,(16,64));sheet.paste(Image.fromarray(new),(1056,64));draw=ImageDraw.Draw(sheet)
 draw.text((16,12),'v5 fixed probes | green <=4, red >4, yellow uncertain',font=font,fill='white');draw.text((1056,12),'HD correspondence | no full contour certification',font=font,fill='white')
 for i,q in enumerate(records):
  x,y=q['sourcePx1x'];dx,dy=q['displacementPx1x'];color='#efc835' if not q['reliable'] else '#35efb1' if q['within4px'] else '#ff4566'
  for ox,px,py in [(16,x,y),(1056,x+dx,y+dy)]:
   draw.ellipse((ox+px-4,64+py-4,ox+px+4,64+py+4),outline=color,width=2);draw.text((ox+px+5,64+py-20),str(i+1),font=font,fill=color,stroke_width=1,stroke_fill='black')
 sheet.save(d/'structure-check.jpg',quality=88,subsampling=0)
 generations=[g for g in GEN['generations'] if g['chunk']==chunk];reg=json.loads((d/'registration.json').read_text())
 summary.append(dict(chunk=chunk,status='drawn-and-assembled-review-required',completedParts=[q['id'] for q in reg],pendingParts=[],imageGenCalls=len(generations),returnedSizes=[dict(id=g['id'],purpose=g.get('purpose','redraw'),size=g['nativeSize']) for g in generations],structureMaxReliablePx1x=maximum,reliableStructureProbes=len(reliable),totalStructureProbes=len(records),allReliableProbesWithin4px=structure['allReliableProbesWithin4px'],wholeStructureWithin4pxVerified=False,sharpnessRatioLaplacian=ratio,sharpnessThresholdMet=ratio>=10,externalChunkSeamsBlended=False,outputSize=list(newim.size)))
 print(chunk,'sharpness',ratio,'structure',maximum,'reliable',len(reliable),'/',len(records),flush=True)

images=[]
for p in O.rglob('*'):
 if p.suffix.lower() in ['.webp','.png','.jpg']:
  with Image.open(p) as im:im.load();images.append(dict(path=str(p.relative_to(O)),size=list(im.size)))
pixel_checks=[]
for g in GEN['generations']:
 if g['archivedResult'] is None:continue
 arch=Image.open(O/g['archivedResult']).convert('RGB')
 actual=hashlib.sha256(arch.tobytes()).hexdigest()
 pixel_checks.append(dict(chunk=g['chunk'],id=g['id'],purpose=g.get('purpose','redraw'),pixelsIdentical=actual==g['decodedRGBsha256'],decodedRGBsha256=actual,nativeSize=list(arch.size)))

checks=dict(allImagesDecode=True,imageCount=len(images),generationCount=len(GEN['generations']),generationLimitRespected=len(GEN['generations'])<=10,nativePixelChecks=pixel_checks,allNativePixelsPreserved=all(c['pixelsIdentical'] for c in pixel_checks),bothChunksHaveFourParts=all(len(c['completedParts'])==4 for c in summary),bothExports2048=all(c['outputSize']==[2048,2048] for c in summary),qaPassedClaimed=False)
report=dict(scope=['r1-c4','r3-c4'],tool='built-in ImageGen only',imageGenCalls=len(GEN['generations']),generationLimit=10,chunks=summary,checks=checks,acceptanceStatus='not-fully-verified',pendingReview=['semantic contour and animation-mask alignment <=4px across complete shapes','per-object removal completeness and continuous fill','internal seams at 100% output/game zoom'],forAssembly='All native lossless tiles retain 64px context where inside map; use nativeToMasterPx1x from each registration.json. External chunk joins deliberately untouched.',qaPassedClaimed=False)
report['acceptance']=[dict(id=1,partsComplete=True,sharpnessThresholdMet=all(c['sharpnessThresholdMet'] for c in summary),structureWithin4pxVerified=False,status='incomplete: r1-c4 has measured displacements above 4px; r3-c4 has uncertain probes/full contours'),dict(id=2,status='incomplete: cloud/vegetation joins and per-object removal remain unresolved'),dict(id=3,nativeAndRegistrationComplete=True,status='files complete; downstream assembly must retain quality blockers')]
report['visualReview']=json.loads((O/'visual-review.json').read_text())
for c in report['chunks']:
 c['pendingCorrections']=report['visualReview'][c['chunk']]['findings']
 c['allRequiredObjectsRemovedVerified']=False
 c['internalSeamsVerifiedInvisible']=False
(O/'run-summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
checks['outputBytes']=sum(p.stat().st_size for p in O.rglob('*') if p.is_file());checks['limitBytes']=60_000_000;checks['withinSizeBudget']=checks['outputBytes']<=60_000_000
(O/'verification.json').write_text(json.dumps(checks,indent=2));report['checks']=checks
for _ in range(3):
 (O/'run-summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));checks['outputBytes']=sum(p.stat().st_size for p in O.rglob('*') if p.is_file());checks['withinSizeBudget']=checks['outputBytes']<=60_000_000;(O/'verification.json').write_text(json.dumps(checks,indent=2))
assert checks['generationLimitRespected'] and checks['allNativePixelsPreserved'] and checks['bothChunksHaveFourParts'] and checks['bothExports2048'] and checks['withinSizeBudget'],checks
print(json.dumps(checks,indent=2))
