from pathlib import Path
import json,re,subprocess
import numpy as np
from PIL import Image,ImageDraw,ImageFont
O=Path(__file__).resolve().parents[1]; R=O.parents[2]
S=Path('/Users/agapae/Documents/Work PAE/Claude/AVEGEE-reference/files/UI New map/New Pic Map Zone1')
W,H=4915,3277
im=Image.new('RGB',(W,H))
for row in range(1,5):
 for col in range(1,6):
  p=R/f'img/map-zone1/v5/r{row}-c{col}.webp';im.paste(Image.open(p),((col-1)*1024,(row-1)*1024))
repairs=[(2,3,'r2-c3-v1.webp',80,48,[[590,115,975,345],[365,515,1024,870],[110,710,365,940]]),(3,3,'r3-c3-pier-v1.webp',16,16,[[630,40,1000,360]]),(1,3,'r1-c3-v1.webp',16,16,[[290,775,850,1024]])]
# Same separable 42px gradients and border/fade destination-in as repairOverlay().
for row,col,name,border,fade,boxes in repairs:
 mask=np.zeros((1024,1024),np.float32)
 for x0,y0,x1,y1 in boxes:
  x=np.arange(x1-x0)+.5;y=np.arange(y1-y0)+.5
  a=np.minimum(np.minimum(x/42,(x1-x0-x)/42),1)[None,:]*np.minimum(np.minimum(y/42,(y1-y0-y)/42),1)[:,None]
  mask[y0:y1,x0:x1]=1-(1-mask[y0:y1,x0:x1])*(1-a)
 q=np.arange(1024)+.5;edge=np.clip(np.minimum((q-border)/fade,(1024-border-q)/fade),0,1)
 mask*=edge[:,None]*edge[None,:]
 art=Image.open(R/'img/map-zone1/repairs'/name).convert('RGB').resize((1024,1024))
 im.paste(art,((col-1)*1024,(row-1)*1024),Image.fromarray(np.uint8(mask*255)))
im.save(O/'master-1x.jpg',quality=96,subsampling=0);im.save(O/'inputs/master-lossless.webp',lossless=True)
# Brief's RLE plus actual engine owner RLE, shown separately; never silently conflate them.
for file,var,key in [('town-walkmask.js','TOWN_WALK_RUNS','brief'),('town-owner-walkmask.js','TOWN_OWNER_WALK_RUNS','owner')]:
 s=(R/'src'/file).read_text();runs=json.loads(re.search(var+r'\s*=\s*(\[[\d,\s]*\])',s)[1]);a=np.zeros(480*320,np.uint8);i=on=0
 for n in runs:
  a[i:i+n]=on;i+=n;on^=1
 assert i==480*320
 mask=Image.fromarray(a.reshape(320,480)*255).resize((W,H),Image.Resampling.NEAREST);mask.save(O/f'inputs/walkmask-{key}.png')
 if key=='brief':
  overlay=im.convert('RGBA');ink=Image.new('RGBA',(W,H),(20,240,145,0));ink.putalpha(mask.point(lambda p:70 if p else 0));overlay.alpha_composite(ink)
  d=ImageDraw.Draw(overlay)
  for r in range(1,5):
   for c in range(1,6):
    x=(c-1)*1024;y=(r-1)*1024;d.rectangle([x,y,min(x+1023,W-1),min(y+1023,H-1)],outline='white',width=3);d.text((x+14,y+10),f'r{r}-c{c}',fill='white',stroke_width=2,stroke_fill='black')
  overlay.convert('RGB').save(O/'walkmask-overlay-1x.jpg',quality=90)
thumb=im.copy();thumb.thumbnail((1600,1200));thumb.save(O/'inputs/overview.jpg',quality=92)
for row,col in [(2,2),(2,3),(3,2),(3,3)]:
 x=(col-1)*1024;y=(row-1)*1024
 im.crop((x-128,y-128,x+1152,y+1152)).save(O/f'inputs/r{row}-c{col}-context.jpg',quality=97,subsampling=0)
files=sorted(S.glob('*.png'));sheet=Image.new('RGB',(7*200,((len(files)+6)//7)*175),(45,43,52));d=ImageDraw.Draw(sheet)
for i,p in enumerate(files):
 src=Image.open(p).convert('RGBA');src.thumbnail((190,140));x=i%7*200;y=i//7*175;sheet.paste(src,(x+(200-src.width)//2,y),src);d.text((x+5,y+143),f'{i:02} {p.stem[-14:]}',fill='white')
sheet.save(O/'inputs/owner-contact.jpg',quality=90)
(O/'inputs/owner-files.json').write_text(json.dumps([str(p) for p in files],ensure_ascii=False,indent=2))
# Evaluate only declarative layout sections (not module imports or mutable runtime).
s=(R/'src/town-layout.js').read_text();a=s[s.index('const site ='):s.index('// ---- walkable ground')];b=s[s.index('const HOUSE_RATIO'):s.index('const propCollider')]
js=(a+b).replace('export ','')+';console.log(JSON.stringify({stations:TOWN_STATION_SITES,houses:TOWN_HOUSE_SITES,props:TOWN_PROP_SITES,dais:TOWN_DAIS,frontier:TOWN_FRONTIER}));'
layout=json.loads(subprocess.check_output(['node','-e',js]));(O/'inputs/game-layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2))
print('Prepared',im.size,'source images',len(files),'layout props',len(layout['props']))
