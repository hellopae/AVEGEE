from pathlib import Path
import json,math
import numpy as np
from PIL import Image,ImageDraw,ImageOps
O=Path(__file__).resolve().parents[1]
OWNER=Path('/Users/agapae/Documents/Work PAE/Claude/AVEGEE-reference/files/UI New map/New Pic Map Zone1')
D=Path('/Users/agapae/.codex/generated_images/01a1a974-2b85-7b52-9cae-c812e418af8b')
inv=json.loads((O/'objects-inventory.json').read_text());pilot={'r2-c2','r2-c3','r3-c2','r3-c3'}
gen={'lava-lower-back':str(D/'exec-9975d828-8d81-47e1-a147-6cfdd7db546e.png')}
if (O/'inputs/sprite-generation-files.json').exists():gen.update(json.loads((O/'inputs/sprite-generation-files.json').read_text()))
sprites=[];pending=[]
for a in inv:
 if not pilot.intersection(a['chunk']) or a['action']=='keep-baked':continue
 source=None;origin=''
 if a['action'].startswith('replace:'):source=OWNER/a['action'].split(':',1)[1];origin='owner-full-resolution-original'
 elif a['id'] in gen:source=Path(gen[a['id']]);origin='built-in-imagegen'
 else:pending.append(a['id']);continue
 im=Image.open(source).convert('RGBA');alpha=im.getchannel('A');extrema=alpha.getextrema();assert extrema[0]==0 and extrema[1]>0,(source,extrema)
 native=im.size;crop=alpha.getbbox();im=im.crop(crop)
 if a['id'] in ['pier-front','south-stair-east']:im=ImageOps.mirror(im)
 x,y,w,h=a['bboxWorld'];fx,fy=a['footWorld']
 if origin.startswith('owner'):
  # Preserve original source aspect, fit to surveyed old object envelope, anchor to its foot.
  fac=min(w/im.width,h/im.height);w=im.width*fac;h=im.height*fac
 else:
  # Rail panels are registered to their surveyed envelope; only approved endpoint adjustment belongs in game integration.
  pass
 # Alpha contact point: median X on the lowest opaque contact band; never opaque-canvas center.
 arr=np.array(im.getchannel('A'));ys,xs=np.where(arr>=128);bottom=int(ys.max());band=xs[ys>=bottom-2];u=float(np.median(band)) if len(band) else im.width/2;v=bottom
 x=fx-u/im.width*w;y=fy-v/im.height*h
 size=(math.ceil(w*2.56),math.ceil(h*2.56));out=im.resize(size,Image.Resampling.LANCZOS)
 src='sprites/'+a['id']+'.webp';out.save(O/src,quality=95,method=4,exact=True)
 layer='back' if a['id'].endswith('-back') else 'front' if a['id'].endswith('-front') else 'sort'
 sprites.append(dict(id=a['id'],src=src,rectWorld=[round(x,4),round(y,4),round(w,4),round(h,4)],footWorld=[fx,fy],footPx=[round((fx-x)/w*size[0],3),round((fy-y)/h*size[1],3)],layer=layer,size=list(size),nativeSourceSize=list(native),sourceCrop=list(crop),source=str(source),origin=origin,placementVerified=False))
(O/'sprites.json').write_text(json.dumps(sprites,ensure_ascii=False,indent=2));(O/'evidence/sprite-export-report.json').write_text(json.dumps({'exported':len(sprites),'pending':pending,'note':'Foot and alpha checked numerically; exact placement/occlusion not approved'},indent=2))
# One small inspection sheet only; avoid decoding all full-resolution images at once.
sheet=Image.new('RGB',(1200,math.ceil(len(sprites)/6)*170),'#36343d');d=ImageDraw.Draw(sheet)
for i,a in enumerate(sprites):
 im=Image.open(O/a['src']).convert('RGBA');im.thumbnail((190,135));x=i%6*200;y=i//6*170;sheet.paste(im,(x+(200-im.width)//2,y),im);d.text((x+3,y+138),a['id'],fill='white')
sheet.save(O/'evidence/sprite-contact.jpg',quality=92);print('Sprites',len(sprites),'pending',pending)
