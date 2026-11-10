"""Decode/coverage/native fidelity checks plus independent local landmark diagnostics.
Does not certify QA or hide uncertain/failed probes. No runtime tests needed for artwork only.
"""
from pathlib import Path
import json,hashlib,math
import numpy as np
import cv2
from PIL import Image,ImageDraw
O=Path(__file__).resolve().parents[1]
def dump(p,d):p.write_text(json.dumps(d,indent=2,ensure_ascii=False))
def band(im):
 g=cv2.cvtColor(np.array(im),cv2.COLOR_RGB2GRAY).astype(np.float32)
 return cv2.GaussianBlur(g,(0,0),1.5)-cv2.GaussianBlur(g,(0,0),6)
def measure(im):
 g=cv2.cvtColor(np.array(im),cv2.COLOR_RGB2GRAY).astype(np.float64)
 return float(cv2.Laplacian(g,cv2.CV_64F,ksize=1).var())
# Fixed source coordinates on exposed semantic borders. Removed-object patches excluded.
landmarks={
'r2-c5': [('plaza-front-west',75,274),('plaza-front-mid',180,249),('plaza-front-east',300,202),('plaza-corner',421,154),('upper-bank',579,166),('snow-bank-east',743,216),('water-bank-east',776,264),('waterfall-base',545,161),('cliff-ridge',307,332),('cliff-ridge-east',408,307),('cliff-west-foot',74,416),('stair-top-left',103,543),('stair-top-right',162,530),('stair-bottom-left',126,650),('stair-bottom-right',194,648),('bridge-deck-east',168,990),('path-cliff-southeast',655,921)],
'r3-c5': [('blue-fall-bank',110,63),('purple-northwest-bank',67,141),('purple-north-bank',250,142),('purple-north-mid-bank',399,137),('purple-north-fall',508,147),('purple-northeast-bank',679,180),('purple-east-bank',770,199),('purple-southwest-bank',74,472),('purple-south-bank',265,482),('purple-south-mid-bank',464,465),('purple-southeast-bank',672,455),('cliff-peak-right',711,657),('cliff-east-ridge',764,828),('cliff-east-toe',758,969)]}
manifest=json.loads((O/'generation-prompts.json').read_text());report={'tool':'built-in ImageGen only','imageGenCalls':manifest['generationCount'],'generationLimit':10,'chunks':[],'qaSignoff':False}
for name in ['r2-c5','r3-c5']:
 d=O/name;old=Image.open(d/'inputs/v5.webp').convert('RGB');out=Image.open(d/f'{name}-2x.webp').convert('RGB');new=out.resize(old.size,Image.Resampling.LANCZOS);a,b=band(old),band(new);records=[]
 for label,x,y in landmarks[name]:
  r=24;s=16
  if not (r+s<=x<819-r-s and r+s<=y<1024-r-s):continue
  template=a[y-r:y+r+1,x-r:x+r+1];area=b[y-r-s:y+r+s+1,x-r-s:x+r+s+1]
  _,confidence,_,loc=cv2.minMaxLoc(cv2.matchTemplate(area,template,cv2.TM_CCOEFF_NORMED));dx,dy=loc[0]-s,loc[1]-s;dist=math.hypot(dx,dy)
  records.append({'id':label,'sourcePx1x':[x,y],'displacementPx1x':[dx,dy],'distancePx1x':dist,'correlation':confidence,'reliable':confidence>=.6,'within4px':dist<=4})
 reliable=[a for a in records if a['reliable']];maxd=max((a['distancePx1x'] for a in reliable),default=None)
 structure={'thresholdPx1x':4,'method':'Independent fixed 49x49 DoG sigma1.5/6 landmark templates, normalized correlation search +/-16 map pixels on assembled output. Not SIFT residual.','totalProbes':len(records),'reliableProbes':len(reliable),'maxReliableDisplacementPx1x':maxd,'allReliableWithin4px':bool(reliable) and all(a['within4px'] for a in reliable),'wholeStructureWithin4pxVerified':False,'limitations':'Local patch translation does not prove complete contours, stair count or hidden edges; all uncertain and failed probes retained.','probes':records}
 dump(d/'structure.json',structure)
 sheet=Image.new('RGB',(1674,1080),'#171b24');sheet.paste(old,(12,40));sheet.paste(new,(843,40));draw=ImageDraw.Draw(sheet);draw.text((12,10),'Source | assembled: green <=4px; red >4px; yellow uncertain',fill='white')
 for i,p in enumerate(records):
  x,y=p['sourcePx1x'];dx,dy=p['displacementPx1x'];c='yellow' if not p['reliable'] else '#33ff99' if p['within4px'] else '#ff3355'
  for ox,px,py in [(12,x,y),(843,x+dx,y+dy)]:draw.ellipse((ox+px-4,40+py-4,ox+px+4,40+py+4),outline=c,width=2);draw.text((ox+px+6,40+py-12),str(i+1),fill=c,stroke_width=1,stroke_fill='black')
 sheet.save(d/'structure-check.jpg',quality=86,subsampling=0)
 rois={'full_chunk':[0,0,819,1024],'upper_left_core':[0,0,410,512],'upper_right_core':[410,0,819,512],'lower_left_core':[0,512,410,1024],'lower_right_core':[410,512,819,1024]};sharp={}
 for label,(x0,y0,x1,y1) in rois.items():
  size=(round((x1-x0)*2.8/(4915/3840)),round((y1-y0)*2.8/(3277/2560)))
  v=measure(old.crop((x0,y0,x1,y1)).resize(size,Image.Resampling.LANCZOS));n=measure(out.crop((x0*2,y0*2,x1*2,y1*2)).resize(size,Image.Resampling.LANCZOS))
  sharp[label]={'rectPx1x':[x0,y0,x1-x0,y1-y0],'deviceSize':list(size),'v5LaplacianVariance':v,'newLaplacianVariance':n,'ratio':n/v}
 ratio=sharp['full_chunk']['ratio'];dump(d/'sharpness.json',{'method':'Identical 2.8 device px/world unit, separate axis scales4915/3840 and3277/2560, Pillow Lanczos, grayscale Laplacian ksize1 variance. No sharpening. Primary full chunk fixed before measurement.','threshold':10,'primaryRatio':ratio,'numericalThresholdMet':ratio>=10,'caveat':'Texture, contrast, liquid ripples and object removal affect energy. This is not perceptual resolution or proof of structure.','rois':sharp})
 reg=json.loads((d/'registration.json').read_text());coverage=np.zeros((1024,819),np.uint8);fidelity=[]
 for t in reg['tiles']:
  x,y,w,h=t['coreMasterPx1x'];x-=4096;y-=reg['chunkMasterPx1x'][1];coverage[y:y+h,x:x+w]+=1
  native=Image.open(d/f"{t['id']}-native.webp");g=next(g for g in reversed(manifest['generations']) if g['chunk']==name and g['id']==t['id'] and g.get('selected',True))
  raw=Image.open(g['nativeFile']).convert('RGB');same=raw.size==native.size and np.array_equal(np.array(raw),np.array(native.convert('RGB')));fidelity.append({'id':t['id'],'size':list(native.size),'losslessPixelsEqualOriginal':same,'sha256':hashlib.sha256((d/f"{t['id']}-native.webp").read_bytes()).hexdigest()});assert same
 assert np.all(coverage==1);assert out.size==(1638,2048);assert len(reg['tiles'])==4
 assert ratio>=10,(name,ratio)
 assert structure['allReliableWithin4px'],(name,maxd)
 removals=json.loads((d/'removed.json').read_text())
 pending_ids=[p['id'] for p in removals['objectReview'] if not p['status'].startswith('visually removed')]
 report['chunks'].append({'chunk':name,'selectedParts':4,'outputSize':list(out.size),'coreCoverageExactlyOnce':True,'imageGenCalls':sum(g['chunk']==name for g in manifest['generations']),'native':fidelity,'structureMaxReliablePx1x':maxd,'reliableStructureProbes':len(reliable),'totalStructureProbes':len(records),'structureDiagnosticsWithin4px':structure['allReliableWithin4px'],'wholeStructureWithin4pxVerified':False,'sharpnessRatioLaplacian':ratio,'sharpnessAtLeast10':ratio>=10,'pendingParts':[],'pendingObjectIds':pending_ids,'pendingReview':['Full semantic contour verification; local probes alone are insufficient.','Survey box/object correspondence before separate sprite placement.','Liquid masks against final assembled terrain; previously fog-covered valley is reconstructed.'],'visualSeamReview':'Inspected final seam sheet and unscaled horizontal strip. No obvious rectangular tile boundary; independently drawn fine cracks/ripples and vegetation can differ near cuts. No in-game review.'})
images=[]
for p in O.rglob('*'):
 if p.suffix.lower() in ['.png','.webp','.jpg']:
  with Image.open(p) as im:im.load();images.append({'path':str(p.relative_to(O)),'size':list(im.size)})
report.update(allImagesDecoded=True,imageCount=len(images),pendingParts=[],completeAcceptanceVerified=False)
assert report['imageGenCalls']<=10
dump(O/'verification.json',{'checks':'decode, full core coverage once, 4 native files/chunk, exact native decoded pixel equality, output dimensions, generation limit, sharpness threshold, reliable local structure threshold and size budget','allMechanicalAssertionsCompleted':True,'images':images,'doesNotCertifyVisualOrSemanticAcceptance':True})
for _ in range(3):
 report['outputBytes']=sum(p.stat().st_size for p in O.rglob('*') if p.is_file());report['sizeBudgetBytes']=60_000_000;report['withinSizeBudget']=report['outputBytes']<=60_000_000;dump(O/'run-summary.json',report)
assert report['withinSizeBudget']
print(json.dumps(report,indent=2))
