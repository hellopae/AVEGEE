"""Copy the stationary source cutouts with their original RGBA bytes.
Re-encode GIFs from the resulting delivered sheets. Run after pack_final.py.
"""
from pathlib import Path
import json
import numpy as np
from scipy import ndimage
from PIL import Image,ImageOps
EV=Path(__file__).resolve().parent
OUT=EV.parents[1]
manifest=json.loads((OUT/'worker-cook.json').read_text())
atlases={}
for e in manifest['animations']:
 if e['file'] not in atlases:atlases[e['file']]=Image.open(OUT/e['file']).convert('RGBA')
 if e['anim']=='cook':
  head=Image.open(EV/f"head-{e['zone']}-source.webp").convert('RGBA')
  if e['dir']=='down-left':head=ImageOps.mirror(head)
 else:
  heading='side' if e['dir']=='side-left' else e['dir']
  head=Image.open(EV/f'head-th-carry-{heading}-source.webp').convert('RGBA')
  if e['dir']=='side-left':head=ImageOps.mirror(head)
 # A binary support mask copies source alpha and RGB exactly, including its
 # mostly 251-253 alpha interior, instead of blending RGB with the collar.
 mask=head.getchannel('A').point(lambda a:255 if a else 0)
 for i in range(8):
  atlas=atlases[e['file']];atlas.paste(head,(i*320,e['row']*320),mask)
  frame=atlas.crop((i*320,e['row']*320,(i+1)*320,(e['row']+1)*320));a=np.array(frame)
  labels,n=ndimage.label(a[:,:,3]>40);counts=np.bincount(labels.ravel());counts[0]=0
  keep=ndimage.binary_dilation(labels==counts.argmax(),iterations=1);a[~keep]=0
  atlas.paste(Image.fromarray(a),(i*320,e['row']*320))
for name,atlas in atlases.items():atlas.save(OUT/name,lossless=True,method=6)
for e in manifest['animations']:
 atlas=Image.open(OUT/e['file']).convert('RGBA');frames=[]
 for i in range(8):
  f=atlas.crop((i*320,e['row']*320,(i+1)*320,(e['row']+1)*320));bg=Image.new('RGBA',(320,320),(229,230,233,255));bg.alpha_composite(f);frames.append(bg.convert('RGB'))
 frames[0].save(OUT/'preview'/f"worker-{e['zone']}-{e['anim']}-{e['dir']}.gif",save_all=True,append_images=frames[1:],duration=[120,130]*4,loop=0,disposal=2,optimize=False)
