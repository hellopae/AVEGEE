"""Deterministic local repairs authorized by the current brief; no image generation.
Read latest inherited atlases only. Preserve drawn arms, props and pose differences.
Run once from the copied input delivery, before regenerating previews/audits.
"""
from pathlib import Path
import hashlib,json
import numpy as np
from scipy import ndimage
from PIL import Image,ImageDraw,ImageOps
EV=Path(__file__).resolve().parent
OUT=EV.parents[1]; REPO=OUT.parents[2]
INPUT=Path('/Users/agapae/agapae-work/.toby-worktrees/.codex-worktrees/20261111T112241Z-92b49ab0/docs/art-reviews/2026-11-10-worker-cook')
report={'input':str(INPUT),'newImageGenCalls':0,'repairs':[],'limitations':['Body registration retains existing drawn motions; it does not certify a smooth loop.','Source down-left is reflected according to drawWorker, not an independently authored left view.']}
def clean(a):
 a=np.array(a).copy();lab,n=ndimage.label(a[:,:,3]>40);counts=np.bincount(lab.ravel());counts[0]=0
 a[~ndimage.binary_dilation(lab==counts.argmax(),iterations=1)]=0
 a[0]=0;a[:,0]=0;a[:,-1]=0
 return Image.fromarray(a)
def sole(f):
 a=np.array(clean(f));yy,xx=np.where(a[:,:,3]>40);y=yy.max();sy,sx=np.where((a[:,:,3]>40)&(np.indices(a.shape[:2])[0]>=y-7))
 return int(y),float((sx.min()+sx.max())/2)
def head_for(e):
 if e['anim']=='cook':h=Image.open(OUT/f"evidence/repair-identity/head-{e['zone']}-source.webp").convert('RGBA')
 else:
  heading='side' if e['dir']=='side-left' else e['dir'];h=Image.open(OUT/f'evidence/repair-identity/head-th-carry-{heading}-source.webp').convert('RGBA')
 return ImageOps.mirror(h) if e['dir'] in ('down-left','side-left') else h
manifest=json.loads((OUT/'worker-cook.json').read_text());atlases={}
for e in manifest['animations']:
 if e['file'] not in atlases:atlases[e['file']]=Image.open(INPUT/e['file']).convert('RGBA')
 atlas=atlases[e['file']];head=head_for(e);support=head.getchannel('A').point(lambda x:255 if x else 0)
 col=0 if e['zone']=='asia' else 1
 if e['anim']=='cook':
  src=Image.open(REPO/f"img/workers/worker-{e['zone']}-sheet-v2.webp").convert('RGBA').crop((col*320,0,(col+1)*320,320))
  if e['dir']=='down-left':src=ImageOps.mirror(src)
  goal_y,goal_x=sole(src)
 for i in range(8):
  f=atlas.crop((i*320,e['row']*320,(i+1)*320,(e['row']+1)*320))
  # Lock exact original head RGBA without recompositing its translucent edge RGB.
  f.paste(head,(0,0),support)
  if e['anim']=='carry' and e['dir'] in ('side','side-left'):
   neck=Image.open(REPO/'img/workers/worker-th-sheet-v2.webp').convert('RGBA').crop((640,320,960,640))
   collar=Image.new('L',(320,320));ImageDraw.Draw(collar).polygon([(178,164),(226,164),(237,177),(228,190),(199,190),(181,180)],fill=255)
   if e['dir']=='side-left':neck=ImageOps.mirror(neck);collar=ImageOps.mirror(collar)
   # Rice can rise into the neckline in the drawn carrying poses. Keep its
   # white surface and its three-pixel outline in front of the static collar.
   pixels=np.array(f);rice=(pixels[:,:,0]>170)&(pixels[:,:,1]>170)&(pixels[:,:,2]>150)&(pixels[:,:,3]>40)
   cm=np.array(collar);cm[ndimage.binary_dilation(rice,iterations=3)]=0;collar=Image.fromarray(cm)
   f.paste(neck,(0,0),collar)
   report['repairs'].append({'row':f"th-carry-{e['dir']}",'frame':i+1,'operation':'Direction-matched original stationary neckline; leave tray, hands and walking legs intact'})
  if e['zone']=='cyberhell' and e['anim']=='cook':
   if i==6:
    donor=Image.open(INPUT/e['file']).convert('RGBA').crop((0,e['row']*320,320,(e['row']+1)*320))
    rect=(145,165,168,194) if e['dir']=='down-left' else (166,166,185,194)
    f.paste(donor.crop(rect),rect[:2])
    report['repairs'].append({'row':f"cyberhell-cook-{e['dir']}",'frame':7,'operation':'Remove old duplicate emblem with stationary sleeve fabric from f1 before applying source emblem','rectangle':rect})
   # Keep the original one-sided sleeve emblem on the stationary upper sleeve.
   # The independently drawn elbow, glove, food and spoon remain outside this patch.
   raw=Image.open(REPO/'img/workers/worker-cyberhell-sheet-v2.webp').convert('RGBA').crop((320,0,640,320))
   badge=Image.new('L',(320,320));ImageDraw.Draw(badge).polygon([(144,173),(156,173),(162,183),(157,200),(137,204),(133,196),(137,185)],fill=255)
   if e['dir']=='down-left':raw=ImageOps.mirror(raw);badge=ImageOps.mirror(badge);offset=(0,-6)
   else:offset=(6,-7)
   f.paste(raw,offset,badge)
   report['repairs'].append({'row':f"cyberhell-cook-{e['dir']}",'frame':i+1,'operation':'Original sleeve emblem/fabric cutout, reflected only for renderer left direction','offset':offset})
  if e['zone']=='th' and e['anim']=='cook' and e['dir']=='down-left' and i==6:
   donor=atlas.crop((5*320,320,6*320,640))
   # Native-size contour follows the outside of the moving hand. Colour-based
   # selection is unsuitable: the leather pouch shares TH's red shadow hues.
   m=Image.new('L',(320,320));ImageDraw.Draw(m).polygon([(182,210),(201,210),(215,240),(215,266),(171,266),(171,245),(175,229),(179,219)],fill=255)
   # Copy opaque interior cloth, keeping the target alpha/hem/leg silhouette.
   # Copying donor background here would cut into f7's differently drawn stance.
   before=np.array(f);replacement=f.copy()
   cloth=donor.crop((175,225,190,250)).resize((44,56),Image.Resampling.BICUBIC)
   replacement.paste(cloth,(171,210));replacement.putalpha(f.getchannel('A'))
   mask=np.array(m);mask[before[:,:,3]==0]=0
   f.paste(replacement,(0,0),Image.fromarray(mask))
   report['repairs'].append({'row':'th-cook-down-left','frame':7,'operation':'Replace pouch RGB with stationary interior cloth cutout from f6, keep moving hand and original alpha/hem/leg silhouette','replacedPixels':int((mask>0).sum()),'alphaPreservedByGarmentPatch':bool(np.array_equal(before[:,:,3],np.array(f)[:,:,3]))})
  if e['anim']=='cook':
   _,x=sole(f);delta=goal_x-x
   top=max(180,head.getchannel('A').getbbox()[3]);band=goal_y-7;h=320-top
   original=f.copy();body=f.crop((0,top,320,320))
   upper=body.transform((320,h),Image.Transform.AFFINE,(1,-delta/(band-top),0,0,1,0),Image.Resampling.BICUBIC)
   lower=body.transform((320,h),Image.Transform.AFFINE,(1,0,-delta,0,1,0),Image.Resampling.BICUBIC)
   upper.paste(lower.crop((0,band-top,320,h)),(0,band-top));f.paste(upper,(0,top))
   f=clean(f);f.paste(head,(0,0),support)
   report['repairs'].append({'row':f"{e['zone']}-cook-{e['dir']}",'frame':i+1,'operation':'Register drawn lower body to source stance, taper from original head to sole band','shearStartY':top,'bottomShiftX':delta,'sourceSole':[goal_x,goal_y],'resultSole':list(reversed(sole(f))),'upperPixelsUnchanged':bool(np.array_equal(np.array(original)[:top],np.array(f)[:top]))})
  f=clean(f)
  atlas.paste(f,(i*320,e['row']*320))
for name,a in atlases.items():
 a.save(OUT/name,lossless=True,method=6)
report['outputs']=[{'file':n,'sha256':hashlib.sha256((OUT/n).read_bytes()).hexdigest()} for n in atlases]
(EV/'repair-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
# Rebuild GIFs directly from delivered cells; no interpolation, translation or fade.
for e in manifest['animations']:
 a=atlases[e['file']];fs=[]
 for i in range(8):
  f=a.crop((i*320,e['row']*320,(i+1)*320,(e['row']+1)*320));bg=Image.new('RGBA',(320,320),(229,230,233,255));bg.alpha_composite(f);fs.append(bg.convert('RGB'))
 fs[0].save(OUT/'preview'/f"worker-{e['zone']}-{e['anim']}-{e['dir']}.gif",save_all=True,append_images=fs[1:],duration=[120,130]*4,loop=0,disposal=2,optimize=False)
print(json.dumps({'edits':len(report['repairs']),'newImageGenCalls':0}))
