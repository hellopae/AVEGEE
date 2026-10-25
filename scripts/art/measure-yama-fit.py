#!/usr/bin/env python3
"""Measure shipped Yama alpha; never modify artwork. --write refreshes runtime fits."""
from pathlib import Path
from PIL import Image
import argparse,json,hashlib,statistics
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--report');a=p.parse_args()
fits={};sources={};measurements={}
def soles(path,w,h,cols,rows,select=None):
 im=Image.open(ROOT/path).convert('RGBA');out=[]
 for row in range(rows):
  xs=[];ys=[]
  for col in (select if select is not None else range(cols)):
   alpha=im.crop((col*w,row*h,(col+1)*w,(row+1)*h)).getchannel('A').point(lambda x:255 if x>=64 else 0);b=alpha.getbbox();ys.append(b[3])
   band=alpha.crop((0,max(0,b[3]-8),w,b[3]));pixels=list(band.getdata());xx=[i%w+.5 for i,v in enumerate(pixels) if v];xs.append(sum(xx)/len(xx))
  out.append({'x':round(statistics.median(xs),3),'y':statistics.median(ys)})
 return out

for z,folder in [('th',''),('asia','Asia/'),('west','West/'),('cyberhell','CyberHell/')]:
 rows=[]
 def boxes(path,w,h,cols,rows):
  raw=(ROOT/path).read_bytes();sources[path]=hashlib.sha256(raw).hexdigest();im=Image.open(ROOT/path).convert('RGBA')
  result=[]
  for row in range(rows):
   b=[im.crop((col*w,row*h,(col+1)*w,(row+1)*h)).getchannel('A').point(lambda x:255 if x>=64 else 0).getbbox() for col in range(cols)]
   assert all(b),path
   result.append(b)
  measurements[path]={'size':list(im.size),'boxes':result};return result
 idle=boxes(f'img/yama-animation-v1/{z}/book-idle.webp',320,480,4,4)
 walk=boxes(f'img/yama-animation-v1/{z}/book-walk.webp',320,480,8,4)
 idleFeet=soles(f'img/yama-animation-v1/{z}/book-idle.webp',320,480,4,4)
 walkFeet=soles(f'img/yama-animation-v1/{z}/book-walk.webp',320,480,8,4,[0,1,3,4,5,7])
 for row,bs in enumerate(idle):
  top=min(b[1] for b in bs);foot=max(b[3] for b in bs)
  rows.append({'height':foot-top,'footX':idleFeet[row]['x'],'footY':foot,'walkFootX':walkFeet[row]['x'],'walkFootY':walkFeet[row]['y']})
 sword=boxes(f'img/yama-animation-v1/{z}/sword-idle.webp',640,640,6,1)[0]
 top=min(b[1] for b in sword);foot=max(b[3] for b in sword)
 path='img/hero-yama.png' if z=='th' else f'img/{folder}hero-yama-{z}.png'
 stand=boxes(path,512,512,1,1)[0][0]
 path='img/hero-yama-walk.png' if z=='th' else f'img/{folder}hero-yama-{z}-walk.png'
 im=Image.open(ROOT/path);fw=im.width//4;fh=im.height
 legacy=boxes(path,fw,fh,4,1)[0];lt=min(b[1] for b in legacy);lf=max(b[3] for b in legacy)
 fits[z]={'book':rows,'sword':{'height':foot-top,'footX':soles(f'img/yama-animation-v1/{z}/sword-idle.webp',640,640,6,1)[0]['x'],'footY':foot},'standing':{'height':stand[3]-stand[1],'footX':soles('img/hero-yama.png' if z=='th' else f'img/{folder}hero-yama-{z}.png',512,512,1,1)[0]['x'],'footY':stand[3]},'legacyWalk':{'height':lf-lt,'footX':soles(path,fw,fh,4,1)[0]['x'],'footY':lf}}
text='// Generated from shipped alpha >=64 by scripts/art/measure-yama-fit.py; no artwork edits.\nconst FITS = '+json.dumps(fits,ensure_ascii=False,indent=2)+';\nexport const yamaFit = style => FITS[style] || FITS.th;\n'
target=ROOT/'src/yama-fit.js'
if a.write:target.write_text(text)
else:assert target.read_text()==text,'Yama fitting metadata is stale; run --write after reviewing new art'
if a.report:Path(a.report).write_text(json.dumps({'alpha':64,'sources':sources,'fits':fits,'measurements':measurements},indent=2)+'\n')
print(json.dumps({'styles':len(fits),'sources':len(sources),'frames':sum(len(bs) for r in measurements.values() for bs in r['boxes']),'metadata_matches':True}))
