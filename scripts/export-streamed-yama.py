#!/usr/bin/env python3
"""Split existing reviewed Yama sheets into small directional rows, not new artwork."""
from pathlib import Path
from PIL import Image
import json,subprocess
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/art-reviews/2026-11-03-layered-map/stream'
fits=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{yamaFit}from'./src/yama-fit.js';console.log(JSON.stringify(Object.fromEntries(['th','asia','west','cyberhell'].map(z=>[z,yamaFit(z)]))));"],cwd=ROOT))
for style in ['th','asia','west','cyberhell']:
 for mode,native,frames in [('idle','book-idle',4),('walk','book-walk',8)]:
  path=ROOT/f'img/yama-animation-v1/{style}/{native}.webp'
  with Image.open(path) as source:
   if source.size!=(320*frames,1920):raise ValueError((path,source.size))
   for row,direction in enumerate(['down','left','right','up']):
    image=source.crop((0,row*480,frames*320,(row+1)*480)).resize((frames*160,240),Image.Resampling.LANCZOS);dest=OUT/'actors'/style/f'{mode}-{direction}.webp';dest.parent.mkdir(parents=True,exist_ok=True);image.save(dest,format='WEBP',lossless=True,method=4)
for path in OUT.glob('*/manifest.json'):
 m=json.loads(path.read_text());style={'zone1':'th','zone2':'asia','zone3':'west','zone4':'cyberhell','border12':'th','border23':'asia','border34':'west'}[m['id']]
 m['actorAnimation']={'style':style,'frameSize':[160,240],'idleDurations':[1000,320,100,480],'stride':7,'standing':fits[style]['standing'],'idle':{},'walk':{}}
 for row,direction in enumerate(['down','left','right','up']):
  fit=fits[style]['book'][row]
  for mode in ['idle','walk']:
   m['actorAnimation'][mode][direction]={'src':f'../actors/{style}/{mode}-{direction}.webp','frames':4 if mode=='idle' else 8,'height':fit['height']/2,'footX':fit['walkFootX' if mode=='walk' else 'footX']/2,'footY':fit['walkFootY' if mode=='walk' else 'footY']/2}
 path.write_text(json.dumps(m,separators=(',',':'))+'\n')
print('Exported 32 small directional rows; updated all streamed map manifests.')
