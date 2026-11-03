#!/usr/bin/env python3
"""Read image headers and geometry sequentially; never decode an image batch."""
from pathlib import Path
from PIL import Image
import json,subprocess
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/art-reviews/2026-11-03-layered-map';STREAM=OUT/'stream'
index=json.loads((OUT/'stream-index.json').read_text());reports=[];seen=set()
owners={'border12':('frontier-walkmask-th-asia-b12','BORDER12_MASK'),'border23':('frontier-walkmask-asia-west-redraw','BORDER23_REDRAW_MASK'),'border34':('frontier-walkmask-west-cyberhell-redraw','BORDER34_REDRAW_MASK'),'zone1':('town-owner-walkmask','TOWN_OWNER_WALK_RUNS'),'zone2':('town-owner-walkmask-asia','TOWN_OWNER_WALK_RUNS'),'zone3':('town-owner-walkmask-west','TOWN_OWNER_WALK_RUNS'),'zone4':('town-owner-walkmask-cyberhell','TOWN_OWNER_WALK_RUNS')}
def cells(mask):
 a=bytearray(mask['cols']*mask['rows']);at=0;on=0
 for n in mask['runs']:
  if on:a[at:at+n]=b'\1'*n
  at+=n;on^=1
 if at!=len(a):raise ValueError('Invalid run-length mask')
 return a
for key,record in index['maps'].items():
 path=OUT/record['src'];m=json.loads(path.read_text());W,H=m['artSize'];refs={m['hero'],m['far']};refs.update(o['src']for o in m['objects']);refs.update(v['src']for v in m['materials'].values())
 for mode in ['idle','walk']:refs.update(v['src']for v in m['actorAnimation'][mode].values())
 refs.update(t['src']for t in m['tiles']);total=0;peak=0
 for src in refs:
  p=(path.parent/src).resolve()
  if STREAM.resolve() not in p.parents:raise ValueError('Source is outside streamed assets')
  with Image.open(p) as im:w,h=im.size
  if w*h>512*768:raise ValueError(('Oversized streamed image',p,w,h))
  peak=max(peak,w*h*4);total+=p.stat().st_size;seen.add(p)
 for t in m['tiles']:
  x,y,w,h=t['pixels'];cx,cy,cw,ch=t['crop'];ew,eh=t['encodedSize']
  if not(0<=x<x+w<=W and 0<=y<y+h<=H and 0<=cx<cx+cw<=ew and 0<=cy<cy+ch<=eh):raise ValueError('Invalid tile crop')
  with Image.open(path.parent/t['src'])as im:
   if list(im.size)!=t['encodedSize']:raise ValueError('Tile header mismatch')
 module,export=owners[key];raw=json.loads(subprocess.check_output(['node','--input-type=module','-e',f"import{{{export} as m}}from'./src/{module}.js';console.log(JSON.stringify(m));"],cwd=ROOT));owner={'cols':480,'rows':320,'runs':raw}if isinstance(raw,list)else raw
 a,b=cells(owner),cells(m['mask'])
 if len(a)!=len(b)or any(y and not x for x,y in zip(a,b)):raise ValueError('Stream mask expanded the owner floor')
 if len(m['levels'])!=2 or min(m['levels'])<=1:raise ValueError('Invalid camera levels')
 reports.append({'map':key,'tiles':len(m['tiles']),'objects':len(m['objects']),'referencedImages':len(refs),'compressedBytes':total,'largestDecodedBitmapBytes':peak,'ownerCellsAdded':0,'cameraLevels':m['levels']})
report={'maps':reports,'uniqueImages':len(seen),'method':'Sequential image headers and RLE geometry audit; not a full-browser memory or physical-phone performance measurement.'};(OUT/'stream-asset-audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(reports))
