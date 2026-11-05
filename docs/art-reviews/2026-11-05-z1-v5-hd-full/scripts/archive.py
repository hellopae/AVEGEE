"""Archive one built-in ImageGen result losslessly at returned native dimensions."""
from pathlib import Path
import sys,json,hashlib
from PIL import Image
O=Path(__file__).resolve().parents[1];p=O/'generation-prompts.json';m=json.loads(p.read_text());g=m['generations'][int(sys.argv[1])]
g['nativeFile']=sys.argv[2];im=Image.open(g['nativeFile']).convert('RGB');dest=O/g['chunk']/f"{g['id']}-native.webp";im.save(dest,lossless=True,method=6)
g.update(nativeSize=list(im.size),archive=str(dest.relative_to(O)),decodedPixelSha256=hashlib.sha256(im.tobytes()).hexdigest())
m['generationCount']=sum(bool(x['nativeFile']) for x in m['generations']);p.write_text(json.dumps(m,indent=2));print(g['chunk'],g['id'],im.size)
