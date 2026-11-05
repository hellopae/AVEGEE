"""Archive a built-in ImageGen output losslessly; preserve returned dimensions."""
from pathlib import Path
from PIL import Image
import json,sys,hashlib
O=Path(__file__).resolve().parents[1]
i=int(sys.argv[1]);source=Path(sys.argv[2]);p=O/'generation-prompts.json';m=json.loads(p.read_text());t=m['generations'][i]
im=Image.open(source).convert('RGB');dest=O/t['chunk']/(t['id']+'-native.webp');im.save(dest,lossless=True,method=6)
assert Image.open(dest).tobytes()==im.tobytes()
t.update(status='generated',nativeSource=str(source),nativeFile=str(dest.relative_to(O)),nativeSize=list(im.size),sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),nativeSha256=hashlib.sha256(dest.read_bytes()).hexdigest())
m['generationCount']=sum(t['status']=='generated' for t in m['generations']);p.write_text(json.dumps(m,ensure_ascii=False,indent=2))
print(t['chunk'],t['id'],im.size,dest.stat().st_size)
