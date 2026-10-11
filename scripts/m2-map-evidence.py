"""Read-only composites and a conservative floor-clearance measurement (not browser screenshots)."""
from pathlib import Path
import gzip,json,math
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from scipy.ndimage import distance_transform_edt,label
ROOT=Path('output/Codex/m2-20261011')
FONT=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',14)
small=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',12)
stages={s:json.loads((ROOT/(s+'.json')).read_text()) if (ROOT/(s+'.json')).exists() else json.loads(gzip.decompress((ROOT/(s+'.json.gz')).read_bytes())) for s in ['before','after']}
widths=json.loads(__import__('subprocess').check_output(['node','--input-type=module','-e',"import {heroWalkSheet} from './src/hero-walk-assets.js'; console.log(JSON.stringify(Object.fromEntries(['th','asia','west','cyberhell'].map(z=>{const s=heroWalkSheet(z);return [z,73.6*s.frameSize.w/s.frameSize.h]}))));"]))
measurements=[]
for stage,zones in stages.items():
 for z in zones:
  canvas=Image.open(z['scene']).convert('RGBA')
  for s in sorted(z['stations'],key=lambda s:s['foot'][1]):
   im=Image.open(s['src']).convert('RGBA'); box=s['box']
   if s['def'].get('flip'):im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
   if box:
    x,y,w,h=box['x'],box['y'],box['w'],box['h']
   else:
    # Recover the unchanged legacy placement from its measured 72px alpha body.
    alpha=np.asarray(im.resize((72,72),Image.Resampling.BILINEAR))[:,:,3];ys,xs=np.where(alpha>40)
    r=s['body']; w=(r[2]-r[0])*72/(xs.max()+1-xs.min());h=(r[3]-r[1])*72/(ys.max()+1-ys.min())
    x=r[0]-xs.min()*w/72;y=r[1]-ys.min()*h/72
   canvas.alpha_composite(im.resize((round(w),round(h)),Image.Resampling.LANCZOS),(round(x),round(y)))
  # Diagnostic routes and geometry use the game data, not a hand-drawn route.
  overlay=Image.new('RGBA',canvas.size);d=ImageDraw.Draw(overlay)
  for s in z['stations']:
   for r in s['blocks']:d.rectangle(r,fill=(255,40,40,35))
   p=s['routes'][0]['path']
   if p:d.line([tuple(s['routes'][0]['start'])]+list(map(tuple,p)),fill=(100,255,190,165),width=2)
   p=s['def'];d.ellipse((p['x']-4,p['y']-4,p['x']+4,p['y']+4),fill='lime')
   d.text((p['bx']-22,p['by']+6),s['key'],font=FONT,fill='white',stroke_width=1,stroke_fill='black')
   b=s['button'];d.ellipse((b['bx']-5,b['by']-5,b['bx']+5,b['by']+5),fill=(255,220,40,255))
  d.text((20,20),f'{z["zone"]} / {stage} | green: game route + door | red: H2 blocks | yellow: enter-label anchor',font=FONT,fill='white',stroke_width=2,stroke_fill='black')
  canvas=Image.alpha_composite(canvas,overlay)
  canvas.convert('RGB').save(ROOT/f'{stage}-{z["zone"]}.png')
  # Same right-lower corridor in both images; preserve every building anchor.
  floor=np.zeros((937,1678),bool);floor.flat[z['clear']]=1
  for s in z['stations']:
   if s['key']=='frontier':continue # Runtime frontier is not in g.stations / H2 syncBlocks.
   for x1,y1,x2,y2 in s['blocks']:
    floor[math.ceil(y1):math.floor(y2)+1,math.ceil(x1):math.floor(x2)+1]=False
  dist=distance_transform_edt(floor)
  roi=np.zeros_like(floor);roi[500:641,1340:1451]=True
  def connected(radius,return_map=False):
   labs,_=label((dist>=radius)&roi);top=set(labs[500,1340:1451])-{0};bottom=set(labs[640,1340:1451])-{0};shared=top&bottom
   return (labs,next(iter(shared),None)) if return_map else bool(shared)
  lo,hi=0,100
  for _ in range(16):
   mid=(lo+hi)/2
   if connected(mid):lo=mid
   else:hi=mid
  diameter=math.floor(2*lo*10)/10
  # Keep the bottleneck visible; use floor-only clearance as an upper bound before NPCs.
  crop=canvas.crop((1150,450,1678,735));cd=ImageDraw.Draw(crop)
  cd.rectangle((190,50,300,190),outline='yellow',width=2)
  cd.ellipse((1390-1150-30,690-450-20,1390-1150+30,690-450+20),outline='orange',width=2)
  cd.ellipse((1420-1150-30,517-450-20,1420-1150+30,517-450+20),outline='cyan',width=2)
  cd.text((8,8),f'{stage}/{z["zone"]}: floor corridor <= {diameter:.1f}px; required {2*widths[z["zone"]]:.1f}px',font=small,fill='white',stroke_width=2,stroke_fill='black')
  crop.resize((1056,570)).convert('RGB').save(ROOT/f'{stage}-corner-{z["zone"]}.png')
  measurements.append(dict(stage=stage,zone=z['zone'],floorCorridorDiameter=diameter,heroWidth=widths[z['zone']],required=2*widths[z['zone']],roi=[1340,500,1450,640],method='largest connected inscribed-disk diameter, 1px floor grid, service holes excluded; no NPCs (upper bound)'))
(ROOT/'corridor.json').write_text(json.dumps(measurements,indent=2))
for s,data in stages.items():
 (ROOT/(s+'.json.gz')).write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode()))
 p=ROOT/(s+'.json')
 if p.exists():p.unlink()
print(json.dumps(measurements,indent=2))
