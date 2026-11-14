"""Losslessly encode a built-in ImageGen result; record actual returned dimensions."""
import hashlib, json, sys, fcntl
from pathlib import Path
from PIL import Image
from prepare import OUT, CHUNKS, write_json

source,chunk,part=sys.argv[1:]
assert chunk in CHUNKS
assert part in {'q11','q12','q21','q22'}
im=Image.open(source).convert('RGB')
target=OUT/chunk/f'{part}-native.webp'
assert not target.exists(), target
im.save(target,lossless=True,method=6)
decoded=Image.open(target).convert('RGB')
assert im.tobytes()==decoded.tobytes()
manifest=OUT/'generations.json'
entry=dict(chunk=chunk,part=part,tool='built-in image_gen',returnedSize=list(im.size),
    nativeFile=f'{chunk}/{part}-native.webp',nativeSHA256=hashlib.sha256(target.read_bytes()).hexdigest(),
    sourcePNGName=Path(source).name,pixelExactLosslessConversion=True)
with manifest.open('a+') as handle:
    fcntl.flock(handle,fcntl.LOCK_EX)
    handle.seek(0);raw=handle.read();data=json.loads(raw) if raw else []
    data.append(entry)
    handle.seek(0);handle.truncate();handle.write(json.dumps(data,indent=2)+'\n');handle.flush()
print(json.dumps(entry))
