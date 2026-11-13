"""Archive one built-in output losslessly, preserving native dimensions."""
import sys,json,hashlib
from pathlib import Path
from PIL import Image
O=Path(__file__).resolve().parents[1]
index=int(sys.argv[1]); source=Path(sys.argv[2])
m=json.loads((O/'generation-prompts.json').read_text()); j=m['generations'][index]
im=Image.open(source).convert('RGB'); dest=O/j['chunk']/f"{j['id']}-native.webp"
im.save(dest,lossless=True,method=6)
j.update(status='generated',nativeFile=str(source),archivedNative=str(dest.relative_to(O)),nativeSize=list(im.size),sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest())
m['generationCount']=sum(j['status']=='generated' for j in m['generations'])
(O/'generation-prompts.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
print(j['chunk'],j['id'],im.size,dest.stat().st_size)
