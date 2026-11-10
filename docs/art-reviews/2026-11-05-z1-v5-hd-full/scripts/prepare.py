from pathlib import Path
import json,hashlib,math
from PIL import Image
O=Path(__file__).resolve().parents[1]
P=Path('/Users/agapae/agapae-work/.codex-worktrees/20261105T020514Z-5d66c53d/docs/art-reviews/2026-11-05-z1-v5-hd')
L=Path('/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Toby/2026-11-05-v5-white-lumps.json')
master=Image.open(P/'inputs/master-lossless.webp').convert('RGB')
objects=json.loads((P/'objects-inventory.json').read_text());lumps=json.loads(L.read_text())['lumps']
manifest={'tool':'built-in image_gen.imagegen','plannedCount':8,'generationCount':0,'generations':[]}
for row in [2,3]:
 name=f'r{row}-c5';d=O/name;(d/'inputs').mkdir(parents=True,exist_ok=True);x,y=4096,(row-1)*1024
 master.crop((x,y,x+819,y+1024)).save(d/'inputs/v5.webp',lossless=True)
 selected=[]
 for a in objects:
  if name not in a['chunk'] or a['action']=='keep-baked':continue
  a=dict(a);bx,by,bw,bh=a['bboxWorld'];a['masterRectPx1x']=[bx*4915/3840,by*3277/2560,bw*4915/3840,bh*3277/2560];selected.append(a)
 fog=[a for a in lumps if name in a['chunks'] and 'keep' not in a['review']]
 (d/'removed.json').write_text(json.dumps({'requestedObjects':selected,'requestedFogLumps':fog,'keptPalePlazas':[a for a in lumps if name in a['chunks'] and 'keep' in a['review']],'status':'requested; visual verification pending'},indent=2,ensure_ascii=False))
 tiles=[]
 for rr in range(2):
  for cc in range(2):
   tid=f'q{rr+1}{cc+1}';cx=x+cc*410;cy=y+rr*512;cw=410 if cc==0 else 409;ch=512
   rect=[max(0,cx-64),max(0,cy-64),min(4915,cx+cw+64),min(3277,cy+ch+64)]
   im=master.crop(rect);im.save(d/f'inputs/{tid}-v5.png')
   removal=[]
   for a in selected:
    bx,by,bw,bh=a['masterRectPx1x']
    if bx<rect[2] and bx+bw>rect[0] and by<rect[3] and by+bh>rect[1]:removal.append({'id':a['id'],'kind':a['kind'],'rectInInputPx':[round(bx-rect[0]),round(by-rect[1]),round(bw),round(bh)]})
   for a in fog:
    bx,by,bw,bh=a['masterPx']
    if bx<rect[2] and bx+bw>rect[0] and by<rect[3] and by+bh>rect[1]:removal.append({'id':a['id'],'kind':'embedded-fog-lump','rectInInputPx':[bx-rect[0],by-rect[1],bw,bh]})
   tiles.append({'id':tid,'coreMasterPx1x':[cx,cy,cw,ch],'contextMasterPx1x':[rect[0],rect[1],im.width,im.height],'removal':removal})
 (d/'inputs/tiles.json').write_text(json.dumps(tiles,indent=2))
 print(name,[(a['id'],a['contextMasterPx1x'][2:],a['removal']) for a in tiles])
(O/'generation-prompts.json').write_text(json.dumps(manifest,indent=2))
sources=[P/'inputs/master-lossless.webp',P/'objects-inventory.json',L,Path('src/town-terrain-repair.js')]
(O/'source-provenance.json').write_text(json.dumps({'method':'Reference repaired master. No repair intersects these contexts (x >=4032).','sources':[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sources]},indent=2))
