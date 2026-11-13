from pathlib import Path
import json,hashlib,re
import numpy as np
from PIL import Image
O=Path(__file__).resolve().parents[1]
def dump(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
master=Image.new('RGB',(4915,3277));sources=[]
for p in sorted(Path('img/map-zone3/v1').glob('r*-c*.webp')):
 r,c=map(int,p.stem[1:].split('-c'));master.paste(Image.open(p),((c-1)*1024,(r-1)*1024));sources.append(p)
# Owner mask, 480x320 cells of 8 world units. Top-left master coordinate frame.
s=Path('src/town-owner-walkmask-west.js').read_text();runs=json.loads(re.search(r'TOWN_OWNER_WALK_RUNS=(\[.*?\]);',s).group(1));mask=np.zeros(480*320,np.uint8);at=0
for i,n in enumerate(runs):mask[at:at+n]=i%2;at+=n
assert at==len(mask)
wm=Image.fromarray(mask.reshape(320,480)*255).resize(master.size,Image.Resampling.NEAREST)
# Visual survey: isolated shrubs on paving, never distant forest or rim vegetation.
boxes={
'r1-c1':[(840,678,106,103),(856,893,102,131)],
'r1-c2':[(453,828,113,102)],
'r1-c3':[(76,828,140,100),(410,842,155,120)],
'r1-c4':[(285,606,98,100)]}
objects=[];manifest={'tool':'built-in image_gen.imagegen','plannedCount':16,'generationCount':0,'generations':[]}
for c in range(1,5):
 name=f'r1-c{c}';d=O/name;(d/'inputs').mkdir(parents=True,exist_ok=True);x=(c-1)*1024
 old=master.crop((x,0,x+1024,1024));old.save(d/'inputs/master-1x.webp',lossless=True)
 overlay=np.array(old).copy();m=np.array(wm.crop((x,0,x+1024,1024)))>0;overlay[m]=(overlay[m]*.5+np.array([40,255,90])*.5).astype('uint8');Image.fromarray(overlay).save(d/'inputs/walkmask-overlay.jpg',quality=90)
 for i,(bx,by,bw,bh) in enumerate(boxes[name]):
  mx,my=x+bx,by;area=np.array(wm.crop((mx,my,mx+bw,my+bh)))>0
  objects.append({'id':f'west-{name}-floor-shrub-{i+1:02d}','chunk':name,'kind':'isolated shrub / small fir on or over paving','action':'remove-and-inpaint-ground','masterRectPx1x':[mx,my,bw,bh],'chunkRectPx1x':[bx,by,bw,bh],'ownerWalkMaskFractionInSurveyBox':float(area.mean()),'evidence':['visual terrain survey','src/town-owner-walkmask-west.js','src/town-layout.js WEST_PROPS','src/town-west-trees.js'],'status':'requested; visual correspondence remains to review'})
 tiles=[]
 for rr in range(2):
  for cc in range(2):
   tid=f'q{rr+1}{cc+1}';cx=x+cc*512;cy=rr*512;rect=[max(0,cx-64),max(0,cy-64),min(4915,cx+576),min(3277,cy+576)]
   im=master.crop(rect);im.save(d/f'inputs/{tid}-master.webp',lossless=True)
   rem=[]
   for a in objects:
    bx,by,bw,bh=a['masterRectPx1x']
    if bx<rect[2] and bx+bw>rect[0] and by<rect[3] and by+bh>rect[1]:rem.append({'id':a['id'],'rectInInputPx':[bx-rect[0],by-rect[1],bw,bh]})
   tiles.append({'id':tid,'coreMasterPx1x':[cx,cy,512,512],'contextMasterPx1x':[rect[0],rect[1],im.width,im.height],'removal':rem})
 dump(d/'inputs/tiles.json',tiles)
 dump(d/'removed.json',{'requestedIds':[a['id'] for a in objects if a['chunk']==name],'visualVerification':False,'note':'Survey rectangles approximate; remove vegetation, preserve terrain and all architecture. Runtime sprite positions are evidence, not exact baked silhouettes.'})
dump(O/'objects-inventory.json',{'zone':'west','scope':'r1-c1..r1-c4 and their 64px contexts','objects':objects,'keepBaked':['distant forest / inaccessible ridge trees','rock/cliff outlines','all stairs and bridge decks','liquids, icefalls and clouds as base layers'],'runtimeRepairs':False})
if not (O/'generation-prompts.json').exists():dump(O/'generation-prompts.json',manifest)
sources += list(map(Path,['src/zone-skin.js','src/town-terrain.js','src/town-layout.js','src/town-west-trees.js','src/town-owner-walkmask-west.js']))
dump(O/'source-provenance.json',{'source':'active west v1 lossless webp master; no repairs','referencesRecoveredReadOnlyFromGit':{'plaza':'bc9dc4dd','full':'0c544a3f'},'sources':[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sources]})
