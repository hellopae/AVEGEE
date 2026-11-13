"""Prepare Asia v2 master crops. Writes only this review directory."""
from pathlib import Path
import json,hashlib,re
from PIL import Image,ImageDraw
import numpy as np
O=Path(__file__).resolve().parents[1];ROOT=O.parents[2]
CHUNKS=['r1-c5','r2-c1','r2-c2','r2-c3']
def write(p,o):p.write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n')
master=Image.new('RGB',(4915,3277));sources=[]
for p in sorted((ROOT/'img/map-zone2/v2').glob('r*-c*.webp')):
 r,c=map(int,re.findall(r'\d+',p.stem));master.paste(Image.open(p),((c-1)*1024,(r-1)*1024));sources.append(dict(path=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
src=(ROOT/'src/town-owner-walkmask-asia.js').read_text();runs=json.loads(re.search(r'TOWN_OWNER_WALK_RUNS=(\[.*?\]);',src).group(1));flat=np.zeros(480*320,np.uint8);i=0
for n,run in enumerate(runs):
 if n%2:flat[i:i+run]=255
 i+=run
mask=Image.fromarray(flat.reshape(320,480)).resize(master.size,Image.Resampling.NEAREST);ma=np.array(mask)
# Explicit painted vegetation crossing exposed paving; remote groves and cloud/liquid bases stay.
BOXES={
'r1-c5':[(25,625,110,70),(140,680,130,80),(610,725,105,70),(262,853,115,86),(405,876,105,75)],
'r2-c1':[(355,95,120,65),(365,215,180,170),(815,320,150,90),(930,200,90,100),(620,500,85,55),(815,615,140,85),(535,850,180,95),(910,905,110,85)],
'r2-c2':[(305,270,115,65),(480,385,100,75),(800,310,110,100),(650,470,120,85),(680,725,140,100),(890,800,125,75)],
'r2-c3':[(645,278,120,80),(80,354,120,85),(400,359,115,80),(520,335,110,100),(180,540,100,60),(345,570,100,100),(280,675,110,110),(460,700,90,80),(625,770,115,90),(160,845,120,65),(890,600,115,120)]}

objects=[];manifest=[]
for chunk in CHUNKS:
 r,c=map(int,re.findall(r'\d+',chunk));ox,oy=(c-1)*1024,(r-1)*1024;w,h=min(1024,4915-ox),min(1024,3277-oy);d=O/chunk;(d/'inputs').mkdir(parents=True,exist_ok=True)
 selected=[]
 for j,(x,y,bw,bh) in enumerate(BOXES[chunk]):
  a,b=ox+x,oy+y;fraction=float((ma[b:b+bh,a:a+bw]>0).mean())
  obj=dict(id=f'asia-{chunk}-paving-foliage-{j:02d}',kind='painted low foliage over/along walkable paving',action='remove-and-inpaint-ground',masterPx=[a,b,bw,bh],chunk=chunk,walkmaskBoxCoverage=fraction,evidence='source-overview.jpg + owner walkmask; bbox may include non-walkable margins, preserve cliff outline',removalVerified=False)
  selected.append(obj);objects.append(obj)
 write(d/'removed.json',dict(objects=selected,whiteLumps=[],allRemovalsVisuallyVerified=False))
 tiles=[];splits=[0,(w+1)//2,w];ys=[0,(h+1)//2,h]
 for row in range(2):
  for col in range(2):
   name=f'q{row+1}{col+1}';cx,cy=splits[col],ys[row];cw,ch=splits[col+1]-cx,ys[row+1]-cy
   x0,y0=max(0,ox+cx-64),max(0,oy+cy-64);x1,y1=min(4915,ox+cx+cw+64),min(3277,oy+cy+ch+64)
   master.crop((x0,y0,x1,y1)).save(d/'inputs'/f'{name}-v2.webp',lossless=True,method=6)
   targets=[]
   for obj in selected:
    a,b,bw,bh=obj['masterPx']
    if a<x1 and a+bw>x0 and b<y1 and b+bh>y0:targets.append(dict(id=obj['id'],kind=obj['kind'],bboxInputPx=[a-x0,b-y0,bw,bh]))
   tiles.append(dict(id=name,coreMasterPx1x=[ox+cx,oy+cy,cw,ch],contextMasterPx1x=[x0,y0,x1-x0,y1-y0],coreChunkPx1x=[cx,cy,cw,ch],contextChunkPx1x=[x0-ox,y0-oy,x1-x0,y1-y0],removalTargets=targets))
 write(d/'inputs/tiles.json',tiles)
 overlay=master.crop((ox,oy,ox+w,oy+h));green=Image.new('RGB',overlay.size,'#28ef98');cropmask=mask.crop((ox,oy,ox+w,oy+h)).point(lambda a:a//4);overlay=Image.composite(green,overlay,cropmask);draw=ImageDraw.Draw(overlay)
 for obj in selected:
  a,b,bw,bh=obj['masterPx'];draw.rectangle((a-ox,b-oy,a-ox+bw,b-oy+bh),outline='yellow',width=2);draw.text((a-ox,b-oy),obj['id'].split('-')[-1],fill='white',stroke_width=2,stroke_fill='black')
 overlay.save(d/'inventory-overlay.jpg',quality=90)
write(O/'objects-inventory.json',dict(zone='asia',scope=CHUNKS,objects=objects,keepBaked=['remote mountain trees and forests','all lava/water/waterfalls','large cloud and mist bases','all paving decks/stairs/cliff and bank contours'],runtimeEvidence='runtime-objects.json',walkmask='src/town-owner-walkmask-asia.js',notes='Painted low vegetation targets are a visual inventory; runtime sprites are separate and are not proof a painted object exists at every runtime foot. Removal verification remains explicit.'))
write(O/'inputs-provenance.json',dict(sources=sources,activeSkin='src/zone-skin.js: asia terrain v2, repairs false',referenceCommits=['bc9dc4dd','d54fac28'],walkmaskSha256=hashlib.sha256(src.encode()).hexdigest()))
if not (O/'generation-prompts.json').exists():write(O/'generation-prompts.json',dict(tool='built-in image_gen.imagegen',plannedCount=16,generationLimit=16,generations=[]))
print('Prepared 16 context crops, inventory and source hashes')
