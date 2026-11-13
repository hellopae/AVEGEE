"""Archive one built-in ImageGen output losslessly, retaining actual native dimensions."""
from pathlib import Path
from PIL import Image
import json,hashlib,sys
O=Path(__file__).resolve().parents[1]
chunk,part,source,prompt=sys.argv[1:];p=Path(source);dest=O/chunk/f'{part}-native.webp'
if dest.exists():raise FileExistsError(f'Refusing to overwrite existing native: {dest}; choose a versioned archive path')
im=Image.open(p).convert('RGB');im.save(dest,lossless=True,quality=100,method=6)
m=json.loads((O/'generation-prompts.json').read_text());m['generations'].append(dict(chunk=chunk,id=part,prompt=prompt,referenced_image_paths=[f'{chunk}/inputs/{part}-v2.webp'],nativeFile=source,archivedFile=str(dest.relative_to(O)),nativeSize=list(im.size),sourceSha256=hashlib.sha256(p.read_bytes()).hexdigest(),decodedRgbSha256=hashlib.sha256(im.tobytes()).hexdigest(),lossless=True));(O/'generation-prompts.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');print(chunk,part,im.size)
