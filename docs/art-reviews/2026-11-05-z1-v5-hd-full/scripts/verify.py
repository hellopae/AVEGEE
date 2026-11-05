"""Independent fixed structure templates and deliverable checks; no QA sign-off.
Coordinates selected on v5 before reading measured displacements. All probes retained.
"""
from pathlib import Path
import hashlib,json,math
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
O=Path(__file__).resolve().parents[1]
LANDMARKS={
 'r3-c2':[
 ('lava-fall-foot-left',160,125),('lava-fall-foot-right',270,125),
 ('upper-left-bank',60,170),('upper-island-foot',430,120),('upper-central-bank',515,95),
 ('upper-east-bank-left',810,100),('upper-east-bank-right',930,155),
 ('lower-bank-peak-west',165,440),('lower-bank-peak-midwest',325,455),
 ('lower-bank-peak-center',470,390),('lower-bank-peak-east',935,415),
 ('lower-bank-foot-west',60,565),('lower-bank-foot-center',420,590),
 ('plaza-outer-left',980,650),('plaza-outer-lower-left',950,740),('plaza-outer-base',980,805)],
 'r2-c4':[
 ('bridge-deck-west',35,262),('bridge-deck-east',202,270),('bridge-deck-front-west',38,300),('bridge-deck-front-east',208,310),
 ('upper-channel-bank-west',170,160),('upper-channel-bank-east',295,170),
 ('central-cliff-peak',510,60),('central-cliff-foot',510,340),
 ('middle-bank-west',280,400),('middle-bank-mid',445,455),('middle-bank-east',640,520),
 ('stair-top-left',833,277),('stair-top-right',925,277),('stair-bottom-left',833,368),('stair-bottom-right',925,368),
 ('waterfall-upper-left',630,520),('waterfall-upper-right',685,550),
 ('waterfall-middle-left',758,650),('waterfall-middle-right',800,675),
 ('waterfall-low-left',800,765),('waterfall-low-right',850,775),
 ('south-rock-peak',325,635),('south-cliff-face',390,800),
 ('lower-bridge-deck-west',970,950)]}
FONT=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',16)
def band(im):
 g=cv2.cvtColor(im,cv2.COLOR_RGB2GRAY).astype(np.float32)
 return cv2.GaussianBlur(g,(0,0),1.5)-cv2.GaussianBlur(g,(0,0),6)
summary=[]
for chunk in ['r3-c2','r2-c4']:
 d=O/chunk;old=np.array(Image.open(d/'inputs/v5-repaired.webp').convert('RGB'))
 new=np.array(Image.open(d/f'{chunk}-2x.webp').convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS))
 a,b=band(old),band(new);records=[];r=24;search=12
 for label,x,y in LANDMARKS[chunk]:
  template=a[y-r:y+r+1,x-r:x+r+1]
  x0=max(0,x-r-search);y0=max(0,y-r-search)
  area=b[y0:min(1024,y+r+search+1),x0:min(1024,x+r+search+1)]
  _,confidence,_,loc=cv2.minMaxLoc(cv2.matchTemplate(area,template,cv2.TM_CCOEFF_NORMED))
  dx,dy=loc[0]+x0+r-x,loc[1]+y0+r-y;dist=math.hypot(dx,dy)
  records.append(dict(id=label,sourcePx1x=[x,y],displacementPx1x=[dx,dy],distancePx1x=dist,normalizedCorrelation=confidence,reliable=confidence>=.6,within4px=dist<=4))
 reliable=[q for q in records if q['reliable']]
 maxshift=max((q['distancePx1x'] for q in reliable),default=None)
 structure=dict(thresholdPx1x=4,method='Fixed 49x49 v5 structure templates; DoG sigma 1.5/6; normalized correlation search +/-12 map px on assembled 1x output; independent from SIFT.',
  limitation='Local translation diagnostic only. Low correlation and repeated steps are ambiguous. Does not certify all contours or pixel-exact fluid-mask alignment.',
  totalProbes=len(records),reliableProbes=len(reliable),maxReliableDisplacementPx1x=maxshift,
  p95ReliableDisplacementPx1x=float(np.percentile([q['distancePx1x'] for q in reliable],95)) if reliable else None,
  allReliableProbesWithin4px=bool(reliable) and all(q['within4px'] for q in reliable),semanticStructureVerified=False,wholeStructureWithin4pxVerified=False,probes=records)
 (d/'structure.json').write_text(json.dumps(structure,indent=2))
 sheet=Image.new('RGB',(2096,1100),'#161a22');sheet.paste(Image.fromarray(old),(16,64));sheet.paste(Image.fromarray(new),(1056,64));draw=ImageDraw.Draw(sheet)
 draw.text((16,12),'v5 | fixed structure probes',font=FONT,fill='white');draw.text((1056,12),'new | green <=4px; red >4px; yellow uncertain',font=FONT,fill='white')
 for i,q in enumerate(records):
  x,y=q['sourcePx1x'];dx,dy=q['displacementPx1x'];color='#f0cb35' if not q['reliable'] else '#35efb1' if q['within4px'] else '#ff4566'
  for ox,px,py in [(16,x,y),(1056,x+dx,y+dy)]:
   draw.ellipse((ox+px-4,64+py-4,ox+px+4,64+py+4),outline=color,width=2);draw.text((ox+px+4,64+py-17),str(i+1),font=FONT,fill=color,stroke_width=1,stroke_fill='black')
 sheet.save(d/'structure-check.jpg',quality=88,subsampling=0)
 sharp=json.loads((d/'sharpness.json').read_text());reg=json.loads((d/'registration.json').read_text())
 gens=[g for g in json.loads((O/'generation-prompts.json').read_text())['generations'] if g['chunk']==chunk]
 removal=json.loads((d/'removed.json').read_text())
 summary.append(dict(chunk=chunk,imageGenCalls=len(gens),completedParts=[g['id'] for g in gens if g['selected']],pendingParts=[],nativeSizes={t['id']:t['nativeSize'] for t in reg['tiles']},exportSize=list(Image.open(d/f'{chunk}-2x.webp').size),structureMaxReliablePx1x=maxshift,reliableStructureProbes=len(reliable),totalStructureProbes=len(records),allReliableStructureProbesWithin4px=structure['allReliableProbesWithin4px'],wholeStructureWithin4pxVerified=False,sharpnessLaplacianRatioToV5=sharp['laplacianRatioToV5'],sharpnessAtLeast10x=sharp['meetsNumericalThreshold'],removedIds=removal['removedIds'],unresolvedObjectIdentityIds=removal['unresolvedIdentityIds'],remainingReview=['all semantic contours and runtime liquid masks','owner inspection at 100%']+(['ambiguous inventory identities'] if removal['unresolvedIdentityIds'] else [])))
 print(chunk,'structure reliable',len(reliable),'/',len(records),'max',maxshift,'over4',[(q['id'],q['distancePx1x']) for q in reliable if not q['within4px']],flush=True)
images=[]
for p in O.rglob('*'):
 if p.suffix.lower() in ['.webp','.jpg','.png']:
  with Image.open(p) as im:im.load();images.append(dict(path=str(p.relative_to(O)),size=list(im.size)))
manifest=json.loads((O/'generation-prompts.json').read_text())
native_integrity=[]
for g in manifest['generations']:
 if not g['selected']:continue
 p=O/g['chunk']/f"{g['id']}-native.webp"
 actual=Image.open(p).convert('RGB');pixel_hash=hashlib.sha256(actual.tobytes()).hexdigest()
 equal=list(actual.size)==g['nativeSize'] and pixel_hash==g['decodedRgbSha256']
 # Archived RGB hash permits verification even if the tool's original PNG path expires.
 original_check=None
 if Path(g['nativeFile']).exists():
  original=Image.open(g['nativeFile']).convert('RGB');original_check=actual.size==original.size and actual.tobytes()==original.tobytes()
  equal=equal and original_check
 native_integrity.append(dict(chunk=g['chunk'],id=g['id'],matchesImageGenPixelsExactly=equal,originalPngComparison=original_check,decodedRgbSha256=pixel_hash,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
checks=dict(imageGenCalls=manifest['generationCount'],generationLimit=10,allImagesDecode=True,imageCount=len(images),nativeLosslessIntegrity=native_integrity,chunks=summary,outputByteLimit=60_000_000,qaPassedClaimed=False,neighborChunkSeamsPendingAssemblyRun=True)
checks['reviewNotes']=json.loads((O/'review-notes.json').read_text())
for _ in range(4):
 checks['outputBytes']=sum(p.stat().st_size for p in O.rglob('*') if p.is_file());checks['withinSizeBudget']=checks['outputBytes']<=60_000_000
 (O/'run-summary.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
assert checks['imageGenCalls']<=10
assert checks['withinSizeBudget']
assert all(len(c['completedParts'])==4 and c['exportSize']==[2048,2048] for c in summary)
assert all(s==[1254,1254] for c in summary for s in c['nativeSizes'].values())
assert all(c['sharpnessAtLeast10x'] for c in summary)
assert all(c['allReliableStructureProbesWithin4px'] for c in summary)
assert len(native_integrity)==8 and all(n['matchesImageGenPixelsExactly'] for n in native_integrity)
# Acceptance thresholds are reported without treating unverified contours as a pass.
print(json.dumps(checks,indent=2))
