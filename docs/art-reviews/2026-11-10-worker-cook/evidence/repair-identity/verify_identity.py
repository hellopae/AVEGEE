"""Measure final source head pixels, seams and standing-foot registration.
No artwork mutations. The report distinguishes measurements from visual acceptance.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageOps,ImageDraw
from scipy import ndimage
EV=Path(__file__).resolve().parent
OUT=EV.parents[1]
REPO=OUT.parents[2]
manifest=json.loads((OUT/'worker-cook.json').read_text())

def main_rgba(f):
 a=np.array(f);labels,n=ndimage.label(a[:,:,3]>40);counts=np.bincount(labels.ravel());counts[0]=0
 keep=ndimage.binary_dilation(labels==counts.argmax(),iterations=1);a[~keep]=0;a[0]=0;a[:,0]=0;a[:,-1]=0
 return a

def sole(a):
 yy,xx=np.where(a[:,:,3]>40);bottom=int(yy.max());y,x=np.where((a[:,:,3]>40)&(np.indices((320,320))[0]>=bottom-7))
 return {'bottomY':bottom,'soleBandMidX':float((x.min()+x.max())/2),'silhouetteTop':int(yy.min()),'silhouetteHeight':int(yy.max()-yy.min()+1)}

report={'scope':'Final decoded delivery atlases','heads':[],'cookingFeet':[],'checks':[],'headRGBTolerance':0,'headSourceAlphaMinimum':250,'limitations':['A static contact sheet and numerical seam metrics cannot establish real-time animation continuity.','Sole-band registration measures alpha geometry, without certifying anatomical contact or complete body proportions.']}
for e in manifest['animations']:
 a=Image.open(OUT/e['file']).convert('RGBA');frames=[np.array(a.crop((i*320,e['row']*320,(i+1)*320,(e['row']+1)*320))) for i in range(8)]
 if e['anim']=='cook':
  h=Image.open(EV/f"head-{e['zone']}-source.webp").convert('RGBA')
  if e['dir']=='down-left':h=ImageOps.mirror(h)
 else:
  heading='side' if e['dir']=='side-left' else e['dir'];h=Image.open(EV/f'head-th-carry-{heading}-source.webp').convert('RGBA')
  if e['dir']=='side-left':h=ImageOps.mirror(h)
 expected=np.array(h);mask=expected[:,:,3]>=250
 errors=[int((np.abs(f[:,:,:3][mask].astype(int)-expected[:,:,:3][mask].astype(int)).max(axis=1)>0).sum()) for f in frames]
 stationary=[int((np.abs(frames[i][:,:,:3][mask].astype(int)-frames[(i+1)%8][:,:,:3][mask].astype(int)).max(axis=1)>0).sum()) for i in range(8)]
 key=f"{e['zone']}-{e['anim']}-{e['dir']}"
 report['heads'].append({'row':key,'comparedSourcePixelsAlphaAtLeast250':int(mask.sum()),'sourceRGBMismatchAbove0PixelCountsByFrame':errors,'headRGBChangesAbove0AtEachTransitionIncluding8to1':stationary})
 report['checks'].append({'name':key+' source-head RGB exact RGB and temporal consistency','satisfied':bool(max(errors)==0 and max(stationary)==0 and mask.sum()>1000)})
 if e['anim']=='cook':
  col=0 if e['zone']=='asia' else 1;src=Image.open(REPO/f"img/workers/worker-{e['zone']}-sheet-v2.webp").convert('RGBA').crop((col*320,0,(col+1)*320,320))
  src=ImageOps.mirror(src) if e['dir']=='down-left' else src
  reference=sole(main_rgba(src));metrics=[sole(f) for f in frames]
  delta=[round(m['soleBandMidX']-reference['soleBandMidX'],2) for m in metrics]
  report['cookingFeet'].append({'row':key,'sourceIdleColumn':col,'source':reference,'frames':metrics,'soleBandMidpointErrorsPx':delta})
  report['checks'].append({'name':key+' original alpha baseline','satisfied':all(m['bottomY']==reference['bottomY'] for m in metrics)})
  report['checks'].append({'name':key+' sole-band X within 2px of source','satisfied':all(abs(x)<=2 for x in delta)})
# Explicit native-size adjacent frame comparisons at the requested boundaries.
for e in manifest['animations']:
 a=Image.open(OUT/e['file']).convert('RGBA');plate=Image.new('RGB',(1280,688),(229,230,233));d=ImageDraw.Draw(plate)
 for k,(before,after) in enumerate([(3,4),(7,0)]):
  for j,f in enumerate([before,after]):
   cell=a.crop((f*320,e['row']*320,(f+1)*320,(e['row']+1)*320));x=j*320;y=k*344
   plate.paste(cell,(x,y+24),cell);d.text((x+4,y+4),f"{e['zone']} {e['anim']} {e['dir']} f{f+1}",fill='black')
  # Same pair on dark backing, so alpha discontinuities remain visible.
  for j,f in enumerate([before,after]):
   cell=a.crop((f*320,e['row']*320,(f+1)*320,(e['row']+1)*320));x=(j+2)*320;y=k*344
   plate.paste((24,27,33),(x,y+24,x+320,y+344));plate.paste(cell,(x,y+24),cell)
   d.text((x+4,y+4),f'boundary {before+1} -> {after+1} / f{f+1}',fill='black')
 plate.save(EV/f"seams-{e['zone']}-{e['anim']}-{e['dir']}.jpg",quality=84)
report['failedChecks']=[x for x in report['checks'] if not x['satisfied']]
(EV/'identity-foot-check.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'checks':len(report['checks']),'failedChecks':report['failedChecks'],'headRGBMismatchesAbove0':sum(sum(h['sourceRGBMismatchAbove0PixelCountsByFrame']) for h in report['heads'])},indent=2))
raise SystemExit(bool(report['failedChecks']))
