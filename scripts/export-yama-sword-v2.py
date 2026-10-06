"""Technical export only: isolate generated frames, align feet, pack atlas, preserve alpha."""
from pathlib import Path
from PIL import Image
import numpy as np
from scipy.ndimage import label, find_objects, distance_transform_edt
import json
ROOT = Path(__file__).resolve().parents[1]
# Feet midpoint/baseline measured on the generated sheets, not the sword's bounding box.
ANCHORS = {
 'th': [(183,434),(651,434),(1078,434),(1451,434),(161,836),(619,834),(1032,848),(1517,848)],
 'asia': [(177,433),(656,437),(1096,437),(1484,436),(173,837),(646,837),(1071,841),(1536,840)],
 'west': [(193,447),(689,447),(1101,448),(1506,448),(181,842),(638,841),(1063,842),(1513,844)],
 'cyberhell': [(191,444),(659,444),(1103,444),(1490,444),(164,836),(645,835),(1075,837),(1535,837)]
}
metadata={}
for style, anchors in ANCHORS.items():
 im=Image.open(ROOT/f'img/raw/yama-sword-v2/{style}.png').convert('RGBA'); data=np.asarray(im)
 labels,count=label(data[:,:,3]>30)
 groups=[]
 for number, box in enumerate(find_objects(labels),1):
  if box and np.sum(labels[box]==number)>5000: groups.append((number,box))
 groups.sort(key=lambda p:(int(p[1][0].start>im.height/2),p[1][1].start))
 assert len(groups)==8,(style,len(groups))
 selected=np.where(np.isin(labels,[n for n,b in groups]),labels,0)
 distance,nearest=distance_transform_edt(selected==0,return_indices=True)
 owners=selected[tuple(nearest)]
 atlas=Image.new('RGBA',(640*8,640));frames=[]
 for i,((number,box),(fx,fy)) in enumerate(zip(groups,anchors)):
  isolated=data.copy(); isolated[:,:,3]=np.where((owners==number)&(distance<14),data[:,:,3],0)
  sprite=Image.fromarray(isolated).crop(Image.fromarray(isolated).getbbox())
  bounds=Image.fromarray(isolated).getbbox(); x=240+bounds[0]-fx;y=570+bounds[1]-fy
  assert x>=0 and y>=0 and x+sprite.width<=640 and y+sprite.height<=640,(style,i,x,y,sprite.size)
  frame=Image.new('RGBA',(640,640));frame.alpha_composite(sprite,(x,y));frames.append(frame)
  atlas.alpha_composite(frame,(i*640,0))
 out=ROOT/f'img/yama-sword-v2/hero-yama-{style}-sword.webp';atlas.save(out,lossless=True,method=6)
 grid=Image.new('RGBA',(640*4,640*2))
 for i,frame in enumerate(frames):grid.alpha_composite(frame,((i%4)*640,(i//4)*640))
 grid.save(ROOT/f'img/raw/yama-sword-v2/{style}-aligned.png')
 durations=[650,80,60,35,40,80,100,100]
 preview=[f.resize((320,320),Image.Resampling.NEAREST) for f in frames]
 preview[0].save(ROOT/f'output/yama-sword-v2/{style}.webp',save_all=True,append_images=preview[1:],duration=durations,loop=0,lossless=True)
 metadata[style]={'src':str(out.relative_to(ROOT)),'size':640,'frames':8,'anchor':{'x':240,'y':570},'bodyHeight':anchors[0][1]-groups[0][1][0].start}
 print(style,out.stat().st_size,metadata[style])
(ROOT/'src/yama-sword-v2-assets.js').write_text('// Exported frame geometry; every outfit shares a fixed foot anchor.\nexport const SWORD_SHEETS = '+json.dumps(metadata,indent=2)+';\n')
