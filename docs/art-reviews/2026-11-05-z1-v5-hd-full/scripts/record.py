from pathlib import Path
import json,sys,hashlib
import numpy as np
from PIL import Image
O=Path(__file__).resolve().parents[1]; p=O/'generation-prompts.json';m=json.loads(p.read_text());g=m['generations'][int(sys.argv[1])];g['nativeFile']=sys.argv[2]
im=Image.open(sys.argv[2]).convert('RGB'); im.save(O/g['chunk']/f"{g['id']}-native.webp",lossless=True,method=6)
g['nativeRgbSha256']=hashlib.sha256(np.array(im).tobytes()).hexdigest();g['originalPngSha256']=hashlib.sha256(Path(sys.argv[2]).read_bytes()).hexdigest();g['nativeSize']=list(im.size);m['generationCount']=sum(bool(x['nativeFile']) for x in m['generations']);p.write_text(json.dumps(m,ensure_ascii=False,indent=2));print(g['chunk'],g['id'],im.size)
