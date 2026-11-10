"""Restore selected native WebP files from original built-in ImageGen PNG paths.
Only necessary if native archives are missing; assemble/verify run entirely from this package.
"""
from pathlib import Path
import json
from PIL import Image
O=Path(__file__).resolve().parents[1]
m=json.loads((O/'generation-prompts.json').read_text())
for g in m['generations']:
 if not g.get('selected',True):continue
 dst=O/g['chunk']/f"{g['id']}-native.webp"
 if not dst.exists():Image.open(g['nativeFile']).convert('RGB').save(dst,lossless=True,method=6)
print('Selected native archives available')
