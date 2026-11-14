"""Lossless export of a built-in ImageGen PNG, preserving decoded RGB pixels."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops

OUT = Path(__file__).resolve().parents[1]
chunk, part, source, prompt = sys.argv[1:]
source = Path(source)
target = OUT/chunk/f'{part}-native.webp'
with Image.open(source) as im:
    rgb = im.convert('RGB')
    rgb.save(target, lossless=True, method=6)
    with Image.open(target) as saved:
        assert rgb.size == saved.size
        assert ImageChops.difference(rgb, saved.convert('RGB')).getbbox() is None
    size = list(rgb.size)
path = OUT/'generation-provenance.json'
data = json.loads(path.read_text()) if path.exists() else {'tool':'built-in image_gen.imagegen','completed':[]}
assert not any(i['id'] == f'{chunk}/{part}' for i in data['completed']), 'No silent replacement'
data['completed'].append(dict(id=f'{chunk}/{part}', generatedSourcePath=str(source), nativePath=str(target.relative_to(OUT)), nativeSizePx=size, generatedSHA256=hashlib.sha256(source.read_bytes()).hexdigest(), nativeSHA256=hashlib.sha256(target.read_bytes()).hexdigest(), decodedRGBIdentical=True))
path.write_text(json.dumps(data,indent=2)+'\n')
path = OUT/'generation-prompts.json'
data = json.loads(path.read_text()) if path.exists() else {}
data.setdefault(chunk,{})[part] = prompt
path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(f'{chunk}/{part}: {size}, lossless RGB verified')
