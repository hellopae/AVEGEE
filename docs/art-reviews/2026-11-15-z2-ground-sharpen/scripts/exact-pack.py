"""Alternative lossless modified chunks, preserving every unedited decoded pixel."""
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

from check import OUT, read, sha, stitch

index=read('master-patches/index.json')
master=stitch(Path(index['base']))
for entry in index['patches']:
    x,y,ex,ey=[v*2 for v in entry['rectPx1x']]
    master[y:ey,x:ex]=np.array(Image.open(OUT/'master-patches'/entry['file']).convert('RGB'))
target=OUT/'v8-exact'
target.mkdir(exist_ok=True)
manifest=read('v8/manifest.json')
for entry in manifest['files']:
    path=target/entry['file']
    if entry['reencoded']:
        r,c=map(int,entry['file'].replace('r','').replace('.webp','').split('-c'))
        x,y=(c-1)*2048,(r-1)*2048
        Image.fromarray(master[y:y+entry['height'],x:x+entry['width']]).save(path,lossless=True,quality=90,method=4)
        entry['codec']='VP8L lossless'
    else:
        shutil.copyfile(OUT/'v8'/entry['file'],path)
    entry['sha256']=sha(path);entry['bytes']=path.stat().st_size
for name in ['zone2-terrain-v7-preview.webp','zone2-terrain-v8-preview.webp']:
    shutil.copyfile(OUT/'v8'/name,target/name)
manifest['editedChunkCodec']='VP8L lossless'
manifest['quality']='unchanged chunks: source q90; modified chunks: lossless'
manifest['note']='Alternative to q90 pack: exact outside-mask pixels; modified chunks depart from requested lossy q90. Existing installer reencodes at q88, so exactness does not survive that installation step.'
(target/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('wrote exact alternative:',sum(e['bytes'] for e in manifest['files']),'bytes')
