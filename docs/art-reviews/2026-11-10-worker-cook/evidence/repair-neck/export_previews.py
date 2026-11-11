"""Encode actual final atlas frames; never synthesize/interpolate a pose."""
from pathlib import Path
import json
from PIL import Image
EV=Path(__file__).resolve().parent;OUT=EV.parents[1]
manifest=json.loads((OUT/'worker-cook.json').read_text())
changed={(op['file'],op['row']) for op in json.loads((EV/'repair-report.json').read_text())['operations']}
count=0
for e in manifest['animations']:
 if (e['file'],e['row']) not in changed:continue
 a=Image.open(OUT/e['file']).convert('RGBA');frames=[]
 for i in range(8):
  f=a.crop((i*320,e['row']*320,(i+1)*320,(e['row']+1)*320));bg=Image.new('RGBA',(320,320),(229,230,233,255));bg.alpha_composite(f);frames.append(bg.convert('RGB'))
 frames[0].save(OUT/'preview'/f"worker-{e['zone']}-{e['anim']}-{e['dir']}.gif",save_all=True,append_images=frames[1:],duration=[120,130]*4,loop=0,disposal=2,optimize=False)
 count+=1
print(json.dumps({'updatedGIFs':count,'framesPerGIF':8,'durationsMs':[120,130]*4}))
