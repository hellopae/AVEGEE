from pathlib import Path
import json,hashlib
from PIL import Image,ImageDraw
O=Path(__file__).resolve().parents[1]
P=Path('/Users/agapae/agapae-work/.codex-worktrees/20261105T020514Z-5d66c53d/docs/art-reviews/2026-11-05-z1-v5-hd')
master_path=P/'inputs/master-lossless.webp'
master=Image.open(master_path).convert('RGB')
inventory=json.loads((P/'objects-inventory.json').read_text())
S=[4915/3840,3277/2560]
records=[]
for chunk,x,y in [('r3-c2',1024,2048),('r2-c4',3072,1024)]:
 d=O/chunk;(d/'inputs').mkdir(parents=True,exist_ok=True)
 master.crop((x,y,x+1024,y+1024)).save(d/'inputs/v5-repaired.webp',lossless=True)
 objects=[]
 # Include objects that intersect context, even when inventory chunk labels omit them.
 for a in inventory:
  if a['action']=='keep-baked': continue
  bx,by,bw,bh=a['bboxWorld'];rect=[bx*S[0],by*S[1],bw*S[0],bh*S[1]]
  if rect[0]+rect[2]>x-64 and rect[0]<x+1088 and rect[1]+rect[3]>y-64 and rect[1]<y+1088:
   objects.append(dict(a,rectMapPx1x=rect))
 (d/'removed.json').write_text(json.dumps(dict(requestedObjects=objects,removedIds=[],verification='pending generated output inspection'),ensure_ascii=False,indent=2))
 for row in range(2):
  for col in range(2):
   name=f'q{row+1}{col+1}';cx=x+512*col;cy=y+512*row
   context=[cx-64,cy-64,640,640]
   crop=master.crop((cx-64,cy-64,cx+576,cy+576))
   crop.save(d/f'inputs/{name}-v5.webp',lossless=True)
   annotated=crop.copy();draw=ImageDraw.Draw(annotated)
   ids=[]
   for a in objects:
    bx,by,bw,bh=a['rectMapPx1x']; bx-=cx-64;by-=cy-64
    if bx+bw>0 and bx<640 and by+bh>0 and by<640:
     draw.rectangle((bx,by,bx+bw,by+bh),outline='red',width=2);draw.text((max(0,bx),max(0,by)),a['id'],fill='white',stroke_width=2,stroke_fill='black');ids.append(a['id'])
   annotated.save(d/f'inputs/{name}-removal-guide.jpg',quality=92)
   records.append(dict(chunk=chunk,id=name,corePx1x=[cx,cy,512,512],contextPx1x=context,coreChunkPx1x=[512*col,512*row,512,512],removeIds=ids))
 Image.open(d/'inputs/v5-repaired.webp').resize((768,768)).save(d/'inputs/overview.jpg',quality=90)
(O/'tiles.json').write_text(json.dumps(records,indent=2))
(O/'source-provenance.json').write_text(json.dumps(dict(baseCommit='812152d2',source=str(master_path),sha256=hashlib.sha256(master_path.read_bytes()).hexdigest(),size=list(master.size),composition='Prototype pilot master v5 plus repairs; read only',inventorySource=str(P/'objects-inventory.json'),prototypeScripts='/Users/agapae/agapae-work/.codex-worktrees/20261105T025229Z-00c52f6e/docs/art-reviews/2026-11-05-z1-v5-plaza-detail/scripts'),indent=2))
print('Prepared',len(records),'640x640 crops')
