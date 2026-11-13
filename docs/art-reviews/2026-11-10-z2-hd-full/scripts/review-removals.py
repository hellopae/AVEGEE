"""Before/after contact sheets for every inventory search box. No edits to terrain."""
from pathlib import Path
import json,math,re
from PIL import Image,ImageDraw,ImageFont
O=Path(__file__).resolve().parents[1];ROOT=O.parents[2]
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',16)
for chunk in ['r1-c5','r2-c1','r2-c2','r2-c3']:
 d=O/chunk;p=d/f'{chunk}-2x.webp'
 if not p.exists():continue
 old=Image.open(ROOT/'img/map-zone2/v2'/f'{chunk}.webp').convert('RGB');new=Image.open(p).convert('RGB');objects=json.loads((d/'removed.json').read_text())['objects'];r,c=map(int,re.findall(r'\d+',chunk));ox,oy=(c-1)*1024,(r-1)*1024
 sheet=Image.new('RGB',(1080,math.ceil(len(objects)/2)*230),'#181d24');draw=ImageDraw.Draw(sheet)
 for i,o in enumerate(objects):
  a,b,w,h=o['masterPx'];box=(max(0,a-ox-10),max(0,b-oy-10),min(old.width,a-ox+w+10),min(old.height,b-oy+h+10));sx,sy=(i%2)*540,(i//2)*230
  draw.text((sx+8,sy+6),o['id'].replace('asia-','')+' | v2 / new',font=font,fill='white')
  for j,im in enumerate([old.crop(box),new.crop(tuple(v*2 for v in box))]):
   factor=min(258/(box[2]-box[0]),195/(box[3]-box[1]));size=(round((box[2]-box[0])*factor),round((box[3]-box[1])*factor));im=im.resize(size,Image.Resampling.LANCZOS);sheet.paste(im,(sx+8+j*265,sy+30))
 sheet.save(d/'removal-check.jpg',quality=78,subsampling=0)
print('Rendered inventory search-box comparisons for available assembled chunks')
