"""Local compositing explicitly allowed by WORKER-COOK continuation; zero generation.
Read the latest inherited delivery once. Preserve drawn hands, props, legs and heads.
Write review candidates first; --apply writes atlases/previews after inspection.
"""
from pathlib import Path
import argparse, hashlib, json
import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage
EV=Path(__file__).resolve().parent
OUT=EV.parents[1]; REPO=OUT.parents[2]
INPUT=Path('/Users/agapae/agapae-work/.toby-worktrees/.codex-worktrees/20261111T115315Z-ccb558be/docs/art-reviews/2026-11-10-worker-cook')
APPLY=argparse.ArgumentParser(); APPLY.add_argument('--apply',action='store_true'); args=APPLY.parse_args()
manifest=json.loads((OUT/'worker-cook.json').read_text()); atlases={}; changes=[]; proofs=[]
for e in manifest['animations']:
 name=e['file']
 if name not in atlases: atlases[name]=Image.open(INPUT/name).convert('RGBA')
 a=atlases[name]
 # Match the same source direction/column used for the already locked heads.
 if e['anim']=='cook': sr,sc=0,(0 if e['zone']=='asia' else 1)
 else: sr,sc={'side':(1,2),'side-left':(1,2),'down':(4,0),'up':(5,0)}[e['dir']]
 src=Image.open(REPO/f"img/workers/worker-{e['zone']}-sheet-v2.webp").convert('RGBA').crop((sc*320,sr*320,(sc+1)*320,(sr+1)*320))
 if e['dir'] in ('down-left','side-left'): src=ImageOps.mirror(src)
 s=np.array(src)
 headname=f"head-{e['zone']}-source.webp" if e['anim']=='cook' else f"head-th-carry-{'side' if e['dir']=='side-left' else e['dir']}-source.webp"
 head=Image.open(OUT/'evidence/repair-identity'/headname).convert('RGBA')
 if e['dir'] in ('down-left','side-left'):head=ImageOps.mirror(head)
 head_support=np.array(head)[:,:,3]>0
 for i in range(8):
  f=a.crop((i*320,e['row']*320,(i+1)*320,(e['row']+1)*320));before=np.array(f);p=before.copy()
  # Repair only holes under the original stationary head, with original neck/
  # shoulder pixels. Never replace an opaque moving arm, rice or tray pixel.
  yy,xx=np.indices((320,320));neck_band=(yy>=155)&(yy<190)
  closed=ndimage.binary_closing(p[:,:,3]>=100,structure=np.ones((7,1)))
  holes=neck_band & closed & ~head_support & (p[:,:,3]<100) & (s[:,:,3]>200)
  p[holes]=s[holes]
  if holes.any():changes.append({'row':f"{e['zone']}-{e['anim']}-{e['dir']}",'frame':i+1,'operation':'Original direction-matched neck/shoulder pixels in transparent gaps only','pixels':int(holes.sum())})
  if e['zone']=='th' and e['anim']=='cook' and e['dir']=='down-left' and i==6:
   pre_cloth_alpha=p[:,:,3].copy()
   donor=np.array(Image.open(INPUT/name).convert('RGBA').crop((1600,320,1920,640)))
   m=Image.new('L',(320,320));ImageDraw.Draw(m).polygon([(172,210),(180,210),(180,268),(143,268),(143,251),(160,238),(166,221)],fill=255)
   # Skin + its ink outline belongs to the drawn arm and is kept verbatim.
   skin=(before[:,:,0].astype(int)-before[:,:,1].astype(int)>45)&(before[:,:,0].astype(int)-before[:,:,2].astype(int)>45)&(before[:,:,0]>85)&(before[:,:,3]>40)
   protect=ndimage.binary_dilation(skin,iterations=2)
   patch=(np.array(m)>0)&~protect&(before[:,:,3]>0)&(donor[:,:,3]>200)
   p[patch,:3]=donor[patch,:3]
   changes.append({'row':'th-cook-down-left','frame':7,'operation':'Same-coordinate cloth from f6 instead of enlarged dark sample; keep target alpha and arm/food pixels','pixels':int(patch.sum()),'skinAndInkPixelsProtected':int((np.array(m).astype(bool)&protect).sum())})
   proofs.append({'name':'TH f7 garment repair preserves alpha','satisfied':bool(np.array_equal(p[:,:,3],pre_cloth_alpha))})
  # Preserve original transparent RGB for all untouched pixels; no global resampling.
  touched=np.any(p!=before,axis=2)
  proofs.append({'name':f"{e['zone']}-{e['anim']}-{e['dir']} f{i+1} head RGBA unchanged",'satisfied':bool(np.array_equal(p[head_support],before[head_support]))})
  proofs.append({'name':f"{e['zone']}-{e['anim']}-{e['dir']} f{i+1} drawn lower motion unchanged",'satisfied':bool(np.array_equal(p[270:],before[270:]))})
  a.paste(Image.fromarray(p),(i*320,e['row']*320))
# Plates at native scale (and enlarged details), no generated or interpolated poses.
for e in manifest['animations']:
 a=atlases[e['file']];plate=Image.new('RGB',(1280,688),(229,230,233));d=ImageDraw.Draw(plate)
 for i in range(8):
  f=a.crop((i*320,e['row']*320,(i+1)*320,(e['row']+1)*320));x=i%4*320;y=i//4*344
  bg=Image.new('RGBA',(320,320),(229,230,233,255));bg.alpha_composite(f);plate.paste(bg.convert('RGB'),(x,y+24));d.text((x+4,y+4),f"{e['zone']}-{e['anim']}-{e['dir']} f{i+1}",fill='black')
 plate.save(EV/f"candidate-{e['zone']}-{e['anim']}-{e['dir']}.jpg",quality=86)
report={'input':str(INPUT),'applied':args.apply,'newImageGenCalls':0,'operations':changes,'checks':proofs,'failures':[x for x in proofs if not x['satisfied']]}
if args.apply:
 for n,a in atlases.items():a.save(OUT/n,lossless=True,method=6)
 for e in manifest['animations']:
  a=atlases[e['file']];fs=[]
  for i in range(8):
   f=a.crop((i*320,e['row']*320,(i+1)*320,(e['row']+1)*320));bg=Image.new('RGBA',(320,320),(229,230,233,255));bg.alpha_composite(f);fs.append(bg.convert('RGB'))
  fs[0].save(OUT/'preview'/f"worker-{e['zone']}-{e['anim']}-{e['dir']}.gif",save_all=True,append_images=fs[1:],duration=[120,130]*4,loop=0,disposal=2,optimize=False)
 report['outputHashes']={n:hashlib.sha256((OUT/n).read_bytes()).hexdigest() for n in atlases}
(EV/'repair-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'applied':args.apply,'operations':len(changes),'checks':len(proofs),'failures':report['failures']}))
raise SystemExit(bool(report['failures']))
