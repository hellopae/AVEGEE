"""Technical export only: isolate generated frames, align feet, pack atlas, preserve alpha."""
from pathlib import Path
from PIL import Image
import numpy as np
from scipy.ndimage import label, find_objects, distance_transform_edt
import json
ROOT = Path(__file__).resolve().parents[1]
# Feet midpoint/baseline measured on the generated sheets, not the sword's bounding box.
ANCHORS = {
 'th': [(201,406),(665,406),(1071,406),(1473,406),(179,844),(621,844),(1069,844),(1537,846)],
 'asia': [(198,435),(657,435),(1085,435),(1548,435),(195,877),(620,877),(1089,877),(1537,877)],
 'west': [(211,438),(648,436),(1065,438),(1516,438),(207,847),(632,847),(1074,847),(1525,847)],
 'cyberhell': [(182,427),(680,427),(1102,427),(1537,427),(215,855),(645,854),(1082,855),(1516,855)]
}
metadata={}
for style, anchors in ANCHORS.items():
 im=Image.open(ROOT/f'img/raw/yama-sword-v1/{style}.png').convert('RGBA'); data=np.asarray(im)
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
 out=ROOT/f'img/yama-sword-v1/hero-yama-{style}-sword.webp';atlas.save(out,lossless=True,method=6)
 grid=Image.new('RGBA',(640*4,640*2))
 for i,frame in enumerate(frames):grid.alpha_composite(frame,((i%4)*640,(i//4)*640))
 grid.save(ROOT/f'img/raw/yama-sword-v1/{style}-aligned.png')
 durations=[50,60,60,55,75,70,80,530]
 preview=[f.resize((320,320),Image.Resampling.NEAREST) for f in frames]
 preview[0].save(ROOT/f'output/yama-sword/{style}.webp',save_all=True,append_images=preview[1:],duration=durations,loop=0,lossless=True)
 metadata[style]={'src':str(out.relative_to(ROOT)),'size':640,'frames':8,'anchor':{'x':240,'y':570},'bodyHeight':anchors[0][1]-groups[0][1][0].start}
 print(style,out.stat().st_size,metadata[style])
(ROOT/'src/yama-sword-assets.js').write_text('// Exported frame geometry; every outfit shares a fixed foot anchor.\nexport const SWORD_SHEETS = '+json.dumps(metadata,indent=2)+';\n')
