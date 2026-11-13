from pathlib import Path
import sys,json,hashlib
import numpy as np
from PIL import Image
O=Path(__file__).resolve().parents[1]
g=json.loads(sys.argv[1]);p=Path(g['nativeFile']);im=Image.open(p).convert('RGB');out=O/g['chunk']/f"{g['id']}-native.webp";im.save(out,lossless=True,method=6)
assert np.array_equal(np.array(im),np.array(Image.open(out)))
g.update(nativeSize=list(im.size),nativeSha256=hashlib.sha256(out.read_bytes()).hexdigest(),losslessPixelsEqualOriginal=True,selected=True)
m=json.loads((O/'generation-prompts.json').read_text());assert not any(x['chunk']==g['chunk'] and x['id']==g['id'] for x in m['generations']);m['generations'].append(g);m['generationCount']=len(m['generations']);(O/'generation-prompts.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');print(g['chunk'],g['id'],im.size)
