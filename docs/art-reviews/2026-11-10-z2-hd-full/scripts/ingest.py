"""Copy a built-in ImageGen result to a lossless WebP without resizing."""
import sys, json, hashlib
from PIL import Image
from prepare import OUT, write_json

i=int(sys.argv[1]); source=sys.argv[2]
p=json.loads((OUT/'generation-prompts.json').read_text())[i]
im=Image.open(source).convert('RGB')
dst=OUT/p['chunk']/f'{p["part"]}-native.webp'
im.save(dst,'WEBP',lossless=True,method=6)
record=OUT/'generation-results.json'
rows=json.loads(record.read_text()) if record.exists() else []
assert not any(r['index']==i for r in rows), 'do not overwrite an existing generation record'
rows.append(dict(index=i,chunk=p['chunk'],part=p['part'],tool='built-in image_gen.imagegen',source=source,
    native=str(dst.relative_to(OUT)),nativeSize=list(im.size),sourceSha256=hashlib.sha256(open(source,'rb').read()).hexdigest(),
    nativeSha256=hashlib.sha256(dst.read_bytes()).hexdigest(),losslessRoundTrip=bool(list(Image.open(dst).getdata())==list(im.getdata()))))
write_json(record,rows)
print(p['chunk'],p['part'],im.size,dst.stat().st_size)
