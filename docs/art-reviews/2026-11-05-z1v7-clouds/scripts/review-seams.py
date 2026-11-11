from pathlib import Path
from PIL import Image,ImageDraw
import json,numpy as np
R=Path(__file__).resolve().parents[1];cfg=json.loads((R/'clouds.json').read_text());W,H=cfg['fullPx'];m=np.array(Image.open(R/cfg['mask']));results=[];strips=[]
for v in ['A','B']:
 for row in range(4):
  for col in range(4):
   y=row*2048;x=(col+1)*2048;h=min(2048,H-y)
   left=np.array(Image.open(R/f'layer-{v}'/f'r{row+1}-c{col+1}.webp').convert('RGBA'));right=np.array(Image.open(R/f'layer-{v}'/f'r{row+1}-c{col+2}.webp').convert('RGBA'));support=(m[y:y+h,x-1]>64)&(m[y:y+h,x]>64)
   if not support.any():continue
   band=np.concatenate((left[:,-96:],right[:,:96]),axis=1).astype(float)/255;band[:,:,:3]*=band[:,:,3:4]
   cross=float(np.abs(band[:,96]-band[:,95])[support].mean());near=float(np.median([np.abs(band[:,k]-band[:,k-1])[support].mean() for k in [88,92,100,104]]));results.append({'variant':v,'edge':'vertical chunk','x':x,'y':y,'supportPixels':int(support.sum()),'premultipliedMAE':cross,'nearMedian':near,'ratio':cross/max(near,1e-9)})
   yy=np.flatnonzero(support);t=max(0,int(yy.min())-20);b=min(h,int(yy.max())+21);im=Image.fromarray(np.rint(np.clip(band[t:b,:96,:3]+(1-band[t:b,:96,3:4])*.18,0,1)*255).astype('uint8'))
   # Full seam, not just left half.
   rgb=band[t:b,:,:3]+(1-band[t:b,:,3:4])*.18;im=Image.fromarray(np.rint(np.clip(rgb,0,1)*255).astype('uint8'));im.thumbnail((192,700));strips.append((f'{v} x{x} y{y+t}',im))
(R/'seams.json').write_text(json.dumps({'method':'decoded RGBA premultiplied numeric sample differences; ratios are diagnostics, not a QA threshold','verticalChunkSeams':results,'horizontalChunkSeams':'All selected core clouds are above y2048 except tiny legacy remnants; verify.py checks no alpha outside mask. Native quarter seams are spatially feathered32px; inspect pilot and clips.','notQAApproval':True},indent=2))
if strips:
 sheet=Image.new('RGB',(max(1,len(strips))*210,740),(35,31,43));d=ImageDraw.Draw(sheet)
 for i,(label,im) in enumerate(strips):sheet.paste(im,(i*210+8,30));d.text((i*210+8,8),label,fill='white')
 sheet.save(R/'previews/seams.jpg',quality=94)
print(json.dumps(results,indent=2))
