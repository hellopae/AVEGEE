"""Encode GIFs directly from the current delivered atlases; no simulated motion."""
from pathlib import Path
import json
from PIL import Image
EV=Path(__file__).resolve().parent;OUT=EV.parents[1]
for e in json.loads((OUT/'worker-cook.json').read_text())['animations']:
 atlas=Image.open(OUT/e['file']).convert('RGBA');frames=[]
 for i in range(e['frames']):
  f=atlas.crop((i*320,e['row']*320,(i+1)*320,(e['row']+1)*320))
  bg=Image.new('RGBA',(320,320),(229,230,233,255));bg.alpha_composite(f);frames.append(bg.convert('RGB'))
 frames[0].save(OUT/'preview'/f"worker-{e['zone']}-{e['anim']}-{e['dir']}.gif",save_all=True,append_images=frames[1:],duration=[120,130]*4,loop=0,disposal=2,optimize=False)
print('Encoded 12 GIF loops / 96 drawn frames from delivered atlases')
