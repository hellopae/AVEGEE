"""Pack the four ImageGen edits and direction-matched source heads.
Run compose.py first. All mutations remain inside the delivery directory.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageOps,ImageDraw,ImageChops
from scipy import ndimage
EV=Path(__file__).resolve().parent
OUT=EV.parents[1]
REPO=OUT.parents[2]
PREV=Path('/Users/agapae/agapae-work/.toby-worktrees/.codex-worktrees/20261111T065049Z-44a264e5/docs/art-reviews/2026-11-10-worker-cook')

def clean(f):
 a=np.array(f);labels,n=ndimage.label(a[:,:,3]>40);counts=np.bincount(labels.ravel());counts[0]=0
 main=labels==counts.argmax();keep=ndimage.binary_dilation(main,iterations=1);a[~keep]=0
 a[0]=0;a[:,0]=0;a[:,-1]=0
 return Image.fromarray(a)

def polygon_layer(f,points):
 m=Image.new('L',f.size);ImageDraw.Draw(m).polygon(points,fill=255)
 f=f.copy();f.putalpha(ImageChops.multiply(f.getchannel('A'),m));return f

def generated_cells(n):
 a=Image.open(EV/f'generated-{n:02}.webp').convert('RGBA');w,h=a.size;cells=[]
 for j in range(4):
  f=clean(a.crop((j%2*w//2,j//2*h//2,(j%2+1)*w//2,(j//2+1)*h//2)))
  cells.append(f.resize((320,320),Image.Resampling.LANCZOS))
 return cells

def register(f,height,bottom,pivot):
 a=np.array(f);yy,xx=np.where(a[:,:,3]>40);top=int(yy.min());end=int(yy.max())
 scale=height/(end-top+1);size=round(320*scale)
 f=f.resize((size,size),Image.Resampling.LANCZOS)
 a=np.array(f);yy,xx=np.where(a[:,:,3]>40);end=int(yy.max())
 sole=(a[:,:,3]>40)&(np.indices(a.shape[:2])[0]>=end-7)
 sy,sx=np.where(sole);middle=(sx.min()+sx.max())/2
 dx=round(pivot-middle);dy=bottom-end
 out=Image.new('RGBA',(320,320));out.alpha_composite(f,(dx,dy));return clean(out)

report={'cyberhell':[],'carry':[],'staticLayers':[]}
# The original head remains stationary in the cooking loop. The drawn
# upper bodies, arms, rice, spoon, rope and legs from the new images remain.
cyber=Image.open(OUT/'worker-cyberhell-cook-v1.webp').convert('RGBA')
head=ImageOps.mirror(Image.open(EV/'head-cyberhell-source.webp').convert('RGBA'))
source=Image.open(REPO/'img/workers/worker-cyberhell-sheet-v2.webp').convert('RGBA')
source=clean(source.crop((320,0,640,320)))
for row in range(2):
 boots=ImageOps.mirror(source) if row else source
 for i in range(8):
  if row==1:
   f=generated_cells(1 if i<4 else 2)[i%4]
   f=register(f,305,314,129)
   f.paste((0,0,0,0),(0,0,320,168));f.alpha_composite(head)
  else:f=cyber.crop((i*320,0,(i+1)*320,320))
  f=clean(f);cyber.paste(f,(i*320,row*320))
  report['cyberhell'].append({'row':row,'frame':i+1,'head':'original idle c1, mirrored for left','stationarySourceBoots':False,'baseline':314})
cyber.save(OUT/'worker-cyberhell-cook-v1.webp',lossless=True,method=6)
# TH left frame 7 retains its drawn body. The hip-pouch patch was rejected
# because it damaged the forearm. Its source head is corrected by compose.py.
report['staticLayers'].append({'zone':'th','dir':'down-left','frame':7,'hipPatchAccepted':False,'remaining':'Near-side pouch needs a new localized garment edit.'})
# Carry, with heads copied from each corresponding original walking direction.
source=Image.open(REPO/'img/workers/worker-th-sheet-v2.webp').convert('RGBA')
old=Image.open(PREV/'worker-th-carry-v1.webp').convert('RGBA')
carry=Image.new('RGBA',old.size)
configs={
 'side':dict(row=0,sourceRow=1,col=2,cut=137,neck=171,dx=30,head=[(0,0),(320,0),(320,154),(285,154),(273,168),(244,176),(205,176),(177,164),(0,164)]),
 'down':dict(row=2,sourceRow=4,col=0,cut=128,neck=166,dx=-30,head=[(0,0),(320,0),(320,143),(218,143),(197,156),(171,166),(123,169),(86,158),(67,145),(0,145)]),
 'up':dict(row=3,sourceRow=5,col=0,cut=125,neck=156,dx=-8,head=[(0,0),(320,0),(320,143),(228,143),(200,156),(166,164),(124,164),(93,155),(69,142),(0,142)])
}
for heading,c in configs.items():
 sr,sc=c['sourceRow'],c['col'];ref=clean(source.crop((sc*320,sr*320,(sc+1)*320,(sr+1)*320)))
 head=polygon_layer(ref,c['head']);head.save(EV/f'head-th-carry-{heading}-source.webp',lossless=True)
 for i in range(8):
  if heading=='side':f=generated_cells(3 if i<4 else 4)[i%4]
  else:f=old.crop((i*320,c['row']*320,(i+1)*320,(c['row']+1)*320))
  f=register(f,306,319,164) if heading=='side' else f
  neck=c['neck']-12 if heading=='side' and i>=4 else c['neck']
  body=f.crop((0,c['cut'],320,320));body=body.resize((320,320-neck),Image.Resampling.LANCZOS)
  final=Image.new('RGBA',(320,320));final.alpha_composite(body,(c['dx'],neck));final.alpha_composite(head);final=clean(final)
  carry.paste(final,(i*320,c['row']*320))
  if heading=='side':carry.paste(ImageOps.mirror(final),(i*320,320))
  report['carry'].append({'dir':heading,'frame':i+1,'sourceHeadRow':sr,'sourceHeadColumn':sc,'bodyCut':c['cut'],'bodyDestinationTop':c['neck'],'dx':c['dx']})
carry.save(OUT/'worker-th-carry-v1.webp',lossless=True,method=6)
(EV/'packing.json').write_text(json.dumps(report,indent=2)+'\n')
# Source sole-band registration for every cook zone using a body-only shear
# to connect the existing animated legs to that source stance.
registration=[]
for zone in ['th','asia','west','cyberhell']:
 atlas=Image.open(OUT/f'worker-{zone}-cook-v1.webp').convert('RGBA')
 col=0 if zone=='asia' else 1
 src=Image.open(REPO/f'img/workers/worker-{zone}-sheet-v2.webp').convert('RGBA')
 ref=clean(src.crop((col*320,0,(col+1)*320,320)))
 for row in range(2):
  source=ImageOps.mirror(ref) if row else ref
  a=np.array(source);yy,xx=np.where(a[:,:,3]>40);bottom=int(yy.max());band_top=bottom-7
  sy,sx=np.where((a[:,:,3]>40)&(np.indices((320,320))[0]>=band_top));goal=(sx.min()+sx.max())/2
  head=Image.open(EV/f'head-{zone}-source.webp').convert('RGBA')
  shear_top=max(180,head.getchannel('A').getbbox()[3])
  shear_height=320-shear_top
  for i in range(8):
   f=atlas.crop((i*320,row*320,(i+1)*320,(row+1)*320));a=np.array(f)
   sy,sx=np.where((a[:,:,3]>40)&(np.indices((320,320))[0]>=band_top));mid=(sx.min()+sx.max())/2
   delta=goal-mid;body=f.crop((0,shear_top,320,320))
   upper=body.transform((320,shear_height),Image.Transform.AFFINE,(1,-delta/(band_top-shear_top),0,0,1,0),Image.Resampling.BICUBIC)
   lower=body.transform((320,shear_height),Image.Transform.AFFINE,(1,0,-delta,0,1,0),Image.Resampling.BICUBIC)
   upper.paste(lower.crop((0,band_top-shear_top,320,shear_height)),(0,band_top-shear_top));body=upper
   f.paste((0,0,0,0),(0,shear_top,320,320));f.alpha_composite(body,(0,shear_top))
   f=clean(f)
   atlas.paste(f,(i*320,row*320));registration.append({'zone':zone,'row':row,'frame':i+1,'soleMidpointSource':float(goal),'bodyShearAtBottom':float(delta),'shearTop':shear_top,'sourceBaselineY':bottom,'soleBandTop':band_top,'stationarySourceSoles':False})
 atlas.save(OUT/f'worker-{zone}-cook-v1.webp',lossless=True,method=6)
(EV/'standing-foot-registration.json').write_text(json.dumps(registration,indent=2)+'\n')
# GIF previews are encoded from final decoded atlases at 8 fps exactly on average.
manifest=json.loads((OUT/'worker-cook.json').read_text())
for e in manifest['animations']:
 a=Image.open(OUT/e['file']).convert('RGBA');frames=[]
 for i in range(8):
  f=a.crop((i*320,e['row']*320,(i+1)*320,(e['row']+1)*320));bg=Image.new('RGBA',(320,320),(229,230,233,255));bg.alpha_composite(f);frames.append(bg.convert('RGB'))
 frames[0].save(OUT/'preview'/f"worker-{e['zone']}-{e['anim']}-{e['dir']}.gif",save_all=True,append_images=frames[1:],duration=[120,130]*4,loop=0,disposal=2,optimize=False)
