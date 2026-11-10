"""Inventory crop evidence, same 2x scale on both sides; no image editing."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
O=Path(__file__).resolve().parents[1];font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',18)
for chunk in ['r3-c1','r1-c5']:
 d=O/chunk;reg=json.loads((d/'registration.json').read_text());x,y,w,h=reg['chunkRectMapPx1x'];old=Image.open(d/'inputs/v5.webp').resize((w*2,h*2),Image.Resampling.LANCZOS);new=Image.open(d/f'{chunk}-2x.webp');obs=json.loads((d/'removed.json').read_text())['objects'];sheet=Image.new('RGB',(640,len(obs)*300),'#161a22');dr=ImageDraw.Draw(sheet)
 for i,o in enumerate(obs):
  bx,by,bw,bh=o['rectMapPx1x'];box=[max(0,round(bx-x-12)),max(0,round(by-y-12)),min(w,round(bx-x+bw+12)),min(h,round(by-y+bh+12))]
  dr.text((8,i*300+4),o['id']+' | v5 / new (identical crop/scale)',font=font,fill='white')
  if box[0]>=box[2] or box[1]>=box[3]:dr.text((8,i*300+30),'Outside core; context only',font=font,fill='white');continue
  for j,im in enumerate([old,new]):
   crop=im.crop(tuple(v*2 for v in box));crop.thumbnail((310,260));sheet.paste(crop,(j*320,i*300+30))
 sheet.save(d/'removed-check.jpg',quality=88)
rows=[]
for chunk,box,label in [('r3-c1',[0,0,350,180],'fog lump-13'),('r3-c1',[30,500,360,810],'west-tree-16'),('r1-c5',[170,710,390,820],'r1-c5 q21 remaining stump-like forms')]:
 d=O/chunk;old=Image.open(d/'inputs/v5.webp');new=Image.open(d/f'{chunk}-2x.webp');ims=[old.crop(box).resize(((box[2]-box[0])*2,(box[3]-box[1])*2),Image.Resampling.LANCZOS),new.crop([v*2 for v in box])]
 row=Image.new('RGB',(ims[0].width*2+24,ims[0].height+40),'#161a22');dr=ImageDraw.Draw(row);dr.text((8,5),label+' | v5 / final',font=font,fill='white');row.paste(ims[0],(0,40));row.paste(ims[1],(ims[0].width+24,40));rows.append(row)
sheet=Image.new('RGB',(max(r.width for r in rows),sum(r.height for r in rows)+24),'#161a22');y=0
for row in rows:sheet.paste(row,(0,y));y+=row.height+8
sheet.save(O/'review-closeups.jpg',quality=88,subsampling=0)
