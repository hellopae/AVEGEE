"""Preserve a built-in ImageGen output at its exact native dimensions as lossless WebP."""
from pathlib import Path
import hashlib
import json
import sys
from PIL import Image

out = Path(__file__).resolve().parents[1]
chunk, quadrant, source = sys.argv[1:]
source = Path(source)
image = Image.open(source).convert('RGB')
dest = out/chunk/f'{quadrant}-native.webp'
if dest.exists():
    raise SystemExit(f'Already exists: {dest}')
image.save(dest, lossless=True, quality=100, method=6)
with Image.open(dest) as saved:
    assert saved.size == image.size and saved.convert('RGB').tobytes() == image.tobytes()
log_path = out/'generation-log.json'
log = json.loads(log_path.read_text()) if log_path.exists() else []
log.append({'call':len(log)+1, 'chunk':chunk, 'quadrant':quadrant, 'source':str(source),
            'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'nativeSize':list(image.size), 'nativeFile':str(dest.relative_to(out)),
            'nativeSHA256':hashlib.sha256(dest.read_bytes()).hexdigest(),
            'rgbPreserved':True, 'tool':'built-in image_gen'})
log_path.write_text(json.dumps(log, indent=2)+'\n')
print(f'{chunk}/{quadrant}: {image.size}, {dest.stat().st_size} bytes, RGB preserved')
