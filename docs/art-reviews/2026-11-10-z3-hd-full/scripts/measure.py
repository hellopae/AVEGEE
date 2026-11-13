"""One diagnostic measurement pass. No assertions or retries against quality thresholds."""
from pathlib import Path
import json,math
import cv2,numpy as np
from PIL import Image,ImageDraw
from source import chunk
O=Path(__file__).resolve().parents[1]
def dump(p,d):p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
def band(im):
 g=cv2.cvtColor(np.array(im),cv2.COLOR_RGB2GRAY).astype(np.float32)
 return cv2.GaussianBlur(g,(0,0),1.5)-cv2.GaussianBlur(g,(0,0),6)
def lap(im):return float(cv2.Laplacian(cv2.cvtColor(np.array(im),cv2.COLOR_RGB2GRAY).astype(np.float64),cv2.CV_64F,ksize=1).var())
# Fixed source semantic landmarks selected BEFORE measuring; coordinates chunk-local 1x.
landmarks={
'r1-c1':[('cliff-ridge-west',168,190),('cliff-snow-lip',238,306),('icefall-left-bank',353,260),('icefall-right-bank',469,220),('gothic-arch-tip',270,381),('north-stair-top-left',399,371),('north-stair-top-right',518,352),('north-stair-foot-left',426,468),('north-stair-foot-right',562,447),('plaza-west-rim',241,597),('plaza-east-rim',936,555),('plaza-front-rim',530,760),('lower-stair-top-left',638,800),('lower-stair-top-right',735,791),('lower-stair-bottom-left',609,914),('lower-stair-bottom-right',719,915),('ice-channel-center-rock',252,895),('west-fall-bank',158,726),('east-front-arch',865,866)],
'r1-c2':[('distant-peak',438,120),('icefall-snow-lip',181,444),('icefall-bank',295,538),('bridge-west-post',68,748),('bridge-east-post',301,778),('bridge-deck-west',108,787),('bridge-deck-mid',199,800),('bridge-arch-bottom',212,834),('diagonal-stair-top-left',735,602),('diagonal-stair-top-right',862,622),('diagonal-stair-mid',690,722),('diagonal-stair-foot-left',482,867),('diagonal-stair-foot-right',574,914),('upper-plaza-rim',883,514),('cliff-gothic-tip',793,347),('lower-gothic-tip',900,682),('lower-plaza-rim',892,878),('west-water-rock',159,936)],
'r1-c3':[('ridge-left-snow',240,308),('ridge-toe',291,451),('plaza-upper-rim',191,430),('plaza-right-rim',435,571),('plaza-front-rim',290,672),('upper-stair-top-left',121,668),('upper-stair-top-right',238,661),('upper-stair-foot-left',126,789),('upper-stair-foot-right',236,787),('lower-stair-top-left',261,948),('lower-stair-top-right',375,948),('gothic-tip',399,651),('right-path-upper-rim',863,516),('path-right-rim',924,849),('lower-path-bend',686,968),('ridge-boulder',728,850),('right-cliff-gothic',910,597),('mountain-middle-peak',634,162)],
'r1-c4':[('top-stair-left',112,316),('top-stair-right',207,310),('top-stair-foot-left',114,384),('top-stair-foot-right',207,385),('plaza-west-rim',55,398),('plaza-east-rim',501,553),('plaza-front-rim',431,630),('lower-stair-top-left',106,664),('lower-stair-top-right',202,668),('lower-stair-bottom-left',86,795),('lower-stair-bottom-right',177,797),('bridge-west-end',579,536),('bridge-east-end',902,541),('bridge-deck-apex',752,498),('bridge-arch',741,566),('right-waterfall-bank',956,682),('water-island-cliff',699,867),('left-gothic-tip',369,723),('mountain-middle-peak',609,185)]}
summary=[]
for name,points in landmarks.items():
 d=O/name;old=chunk(name);out=Image.open(d/f'{name}-2x.webp').convert('RGB');new=out.resize(old.size,Image.Resampling.LANCZOS);a,b=band(old),band(new);records=[]
 for label,x,y in points:
  r=24;s=16;template=a[y-r:y+r+1,x-r:x+r+1];area=b[y-r-s:y+r+s+1,x-r-s:x+r+s+1]
  _,conf,_,loc=cv2.minMaxLoc(cv2.matchTemplate(area,template,cv2.TM_CCOEFF_NORMED));dx,dy=loc[0]-s,loc[1]-s;dist=math.hypot(dx,dy)
  records.append({'id':label,'sourcePx1x':[x,y],'displacementPx1x':[dx,dy],'distancePx1x':dist,'correlation':conf,'reliable':conf>=.6,'within4px':dist<=4})
 rel=[r for r in records if r['reliable']];maxd=max((p['distancePx1x'] for p in rel),default=None)
 structure={'thresholdPx1x':4,'method':'Fixed 49x49 DoG sigma1.5/6 landmark templates; normalized correlation search +/-16 map px on assembled output. Independent of SIFT residual. No probes removed after measurement.','totalProbes':len(records),'reliableProbes':len(rel),'maxReliableDisplacementPx1x':maxd,'allReliableWithin4px':bool(rel) and all(p['within4px'] for p in rel),'wholeStructureWithin4pxVerified':False,'limitations':'Patch matching only; repeated steps, changed water texture, occlusion, and new detail can create ambiguous correspondences. This does not verify all contours or stair counts.','probes':records};dump(d/'structure.json',structure)
 sheet=Image.new('RGB',(2084,1068),'#171b24');sheet.paste(old,(12,36));sheet.paste(new,(1048,36));dr=ImageDraw.Draw(sheet);dr.text((12,10),'Master | assembled: green <=4px, red >4px, yellow uncertain',fill='white')
 for i,p in enumerate(records):
  x,y=p['sourcePx1x'];dx,dy=p['displacementPx1x'];c='yellow' if not p['reliable'] else '#33ff99' if p['within4px'] else '#ff3355'
  for ox,px,py in [(12,x,y),(1048,x+dx,y+dy)]:dr.ellipse((ox+px-5,36+py-5,ox+px+5,36+py+5),outline=c,width=2);dr.text((ox+px+6,36+py-12),str(i+1),fill=c,stroke_width=1,stroke_fill='black')
 sheet.resize((1400,718),Image.Resampling.LANCZOS).save(d/'structure-check.jpg',quality=50,subsampling=2,optimize=True)
 rois={'full_chunk':[0,0,1024,1024],'upper_left_core':[0,0,512,512],'upper_right_core':[512,0,512,512],'lower_left_core':[0,512,512,512],'lower_right_core':[512,512,512,512]};sharp={}
 for label,(x,y,w,h) in rois.items():
  size=(round(w*2.8/(4915/3840)),round(h*2.8/(3277/2560)));v=lap(old.crop((x,y,x+w,y+h)).resize(size,Image.Resampling.LANCZOS));n=lap(out.crop((x*2,y*2,(x+w)*2,(y+h)*2)).resize(size,Image.Resampling.LANCZOS));sharp[label]={'rectPx1x':[x,y,w,h],'deviceSize':list(size),'masterLaplacianVariance':v,'newLaplacianVariance':n,'ratio':n/v}
 ratio=sharp['full_chunk']['ratio'];dump(d/'sharpness.json',{'method':'Same 2.8 device px/world unit; independent x,y scales 4915/3840 and 3277/2560; Lanczos resize, grayscale Laplacian ksize1 variance. Primary full chunk fixed before measurement. No sharpening.','threshold':10,'primaryRatio':ratio,'numericalThresholdMet':ratio>=10,'caveat':'Edge/texture energy, not perceptual resolution or structural fidelity. Contrast, water detail and removal affect this number.','rois':sharp})
 reg=json.loads((d/'registration.json').read_text());summary.append({'chunk':name,'selectedParts':4,'outputSize':list(out.size),'imageGenCalls':4,'native':[{'id':t['id'],'size':t['nativeSize']} for t in reg['tiles']],'siftResidualMaxPx1x':max(t['inlierResidualPx1x']['max'] for t in reg['tiles']),'structureMaxReliablePx1x':maxd,'reliableStructureProbes':len(rel),'totalStructureProbes':len(records),'structureDiagnosticsWithin4px':structure['allReliableWithin4px'],'wholeStructureWithin4pxVerified':False,'sharpnessRatioLaplacian':ratio,'sharpnessAtLeast10':ratio>=10,'pendingParts':[]})
 print(name,'sharpness',round(ratio,3),'structure',maxd,'reliable',len(rel),'of',len(records),flush=True)
dump(O/'measurement-summary.json',{'qualityGatesAsserted':False,'measurementPasses':1,'chunks':summary})
