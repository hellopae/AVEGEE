"""Checks deliverables and independent local structure correspondence; never a QA sign-off."""
from pathlib import Path
import hashlib,json,math
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont

O=Path(__file__).resolve().parents[1]
old=np.array(Image.open(O/'inputs/v5-repaired.webp').convert('RGB'))
new=np.array(Image.open(O/'r2-c3-2x2.webp').convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS))
def band(im):
    g=cv2.cvtColor(im,cv2.COLOR_RGB2GRAY).astype(np.float32)
    return cv2.GaussianBlur(g,(0,0),1.5)-cv2.GaussianBlur(g,(0,0),6)
a,b=band(old),band(new)
# Fixed manually selected exposed architecture landmarks; do not use invented ground under removed trees.
landmarks=[('plaza-center',274,220),('plaza-star-top',268,113),('plaza-star-bottom',273,333),('plaza-star-left',104,230),('plaza-star-right',456,221),('plaza-front-1',92,394),('plaza-front-2',166,417),('plaza-front-3',235,425),
 ('plaza-front-4',432,423),('plaza-front-5',488,408),('plaza-east',623,315),
 ('main-stair-top-left',273,430),('main-stair-top-right',389,430),
 ('main-stair-bottom-left',275,539),('main-stair-bottom-right',389,539),
 ('main-stair-mid-left',273,482),('main-stair-mid-right',389,482),
 ('upper-stair-left',277,45),('upper-stair-right',387,45),
 ('east-stair-top-left',682,416),('east-stair-top-right',782,403),
 ('east-stair-bottom-left',682,521),('east-stair-bottom-right',784,514),
 ('south-west-stair-left',40,838),('south-west-stair-right',145,838),
 ('south-central-stair-left',323,918),('south-central-stair-right',493,918),
 ('south-east-stair-left',737,858),('south-east-stair-right',828,858),
 ('bridge-post-left',328,896),('bridge-post-right',494,896)]
records=[];r=24;search=12
for label,x,y in landmarks:
    template=a[y-r:y+r+1,x-r:x+r+1]
    area=b[y-r-search:y+r+search+1,x-r-search:x+r+search+1]
    scores=cv2.matchTemplate(area,template,cv2.TM_CCOEFF_NORMED)
    _,confidence,_,loc=cv2.minMaxLoc(scores)
    dx,dy=loc[0]-search,loc[1]-search;distance=math.hypot(dx,dy)
    records.append(dict(id=label,sourcePx1x=[x,y],displacementPx1x=[dx,dy],distancePx1x=distance,
        normalizedCorrelation=confidence,reliable=confidence>=.6,within4px=distance<=4))
reliable=[q for q in records if q['reliable']]
sample=np.array(Image.open(O/'tile-3x3/t31-core.webp').convert('RGB').resize((342,342),Image.Resampling.LANCZOS))
b3=band(sample); sample_records=[]
for label,x,y in landmarks:
    local_y=y-341
    if not (r+search<=x<342-r-search and r+search<=local_y<342-r-search):continue
    template=a[y-r:y+r+1,x-r:x+r+1]
    area=b3[local_y-r-search:local_y+r+search+1,x-r-search:x+r+search+1]
    _,confidence,_,loc=cv2.minMaxLoc(cv2.matchTemplate(area,template,cv2.TM_CCOEFF_NORMED))
    dx,dy=loc[0]-search,loc[1]-search
    sample_records.append(dict(id=label,sourcePx1x=[x,y],displacementPx1x=[dx,dy],distancePx1x=math.hypot(dx,dy),normalizedCorrelation=confidence,reliable=confidence>=.6,within4px=math.hypot(dx,dy)<=4))
sample_reliable=[q for q in sample_records if q['reliable']]
structure=dict(thresholdPx1x=4,method='Independent fixed 49x49 landmark templates; difference of Gaussian sigma 1.5/6 grayscale, normalized correlation search +/-12 map px on the assembled output, not SIFT inlier residual.',
 limitation='Patch translation is a local correspondence diagnostic. Does not certify every contour, shape, stair count or occluded boundary. Repeated stair treads can produce ambiguous matches; low-correlation probes excluded from aggregate but retained below.',
 reliableProbes=len(reliable),totalProbes=len(records),
 maxReliableDisplacementPx1x=max(q['distancePx1x'] for q in reliable),
 p95ReliableDisplacementPx1x=float(np.percentile([q['distancePx1x'] for q in reliable],95)),
 allReliableProbesWithin4px=all(q['within4px'] for q in reliable),semanticStructureVerified=False,probes=records,
 sample3x3=dict(probes=sample_records,reliableProbes=len(sample_reliable),maxReliableDisplacementPx1x=max((q['distancePx1x'] for q in sample_reliable),default=None),allReliableProbesWithin4px=all(q['within4px'] for q in sample_reliable)))
(O/'structure-metrics.json').write_text(json.dumps(structure,indent=2))
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',18)
sheet=Image.new('RGB',(2096,1110),'#161a22');sheet.paste(Image.fromarray(old),(16,64));sheet.paste(Image.fromarray(new),(1056,64));d=ImageDraw.Draw(sheet)
d.text((16,12),'v5 + repairs | numbered fixed architecture probes',font=font,fill='white')
d.text((1056,12),'2x2 | green <=4px; red >4px; yellow uncertain correlation',font=font,fill='white')
for i,q in enumerate(records):
    x,y=q['sourcePx1x'];dx,dy=q['displacementPx1x'];color='#f0cb35' if not q['reliable'] else '#35efb1' if q['within4px'] else '#ff4566'
    for ox,px,py in [(16,x,y),(1056,x+dx,y+dy)]:
        d.ellipse((ox+px-4,64+py-4,ox+px+4,64+py+4),outline=color,width=2)
        d.text((ox+px+5,64+py-20),str(i+1),font=font,fill=color,stroke_width=1,stroke_fill='black')
sheet.save(O/'structure-check.jpg',quality=88,subsampling=0)

images=[]
for p in O.rglob('*'):
    if p.suffix.lower() in ['.webp','.jpg','.png']:
        with Image.open(p) as im:im.load();images.append(dict(path=str(p.relative_to(O)),size=list(im.size)))
prompts=json.loads((O/'generation-prompts.json').read_text())
reg=json.loads((O/'registration.json').read_text())
sharp=json.loads((O/'sharpness.json').read_text())
total=sum(p.stat().st_size for p in O.rglob('*') if p.is_file())
checks=dict(allImagesDecode=True,imageCount=len(images),generationCount=prompts['generationCount'],generationLimitRespected=prompts['generationCount']<=8,
    nativeDimensionsRecorded=all(q['nativeSize']==[1254,1254] for q in reg),
    exportSize=list(Image.open(O/'r2-c3-2x2.webp').size),outputBytes=total,limitBytes=40_000_000,withinSizeBudget=total<=40_000_000,
    sharpnessNumericalThresholdMet=sharp['meetsNumericalThreshold'],structureDiagnostic=structure,
    acceptance=[dict(id=1,numericalThresholdMet=sharp['meetsNumericalThreshold'],ratio2x2ToV5=sharp['primaryRatio2x2ToV5']),
                dict(id=2,visualReview='Detailed stones and mortar visibly increased; no obvious rectangular join in inspected seam sheet. JPEG is offline composition, not in-game QA. Owner review pending.'),
                dict(id=3,nativeSizesRecorded=True,allReliableStructureProbesWithin4px=structure['allReliableProbesWithin4px'],wholeStructureWithin4pxVerified=False)])
for _ in range(3):
    (O/'verification.json').write_text(json.dumps(checks,indent=2))
    checks['outputBytes']=sum(p.stat().st_size for p in O.rglob('*') if p.is_file())
    checks['withinSizeBudget']=checks['outputBytes']<=checks['limitBytes']
(O/'verification.json').write_text(json.dumps(checks,indent=2))
assert checks['generationLimitRespected']
assert checks['nativeDimensionsRecorded']
assert checks['exportSize']==[2048,2048]
assert checks['withinSizeBudget'],total
assert checks['sharpnessNumericalThresholdMet']
print(json.dumps({k:v for k,v in checks.items() if k not in ['structureDiagnostic']},indent=2))
print('Structure probes:',structure['reliableProbes'],'/',structure['totalProbes'],'reliable, max shift',structure['maxReliableDisplacementPx1x'])
