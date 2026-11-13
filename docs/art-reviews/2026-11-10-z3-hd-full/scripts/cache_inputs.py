"""Optionally reconstruct the exact ImageGen inputs without generation (adds ~14 MB cache)."""
import json,hashlib
from source import O,region,chunk
r=json.loads((O/'input-recipes.json').read_text())
for t in r['inputs']:
 im=region(t['contextMasterPx1x']);assert hashlib.sha256(im.tobytes()).hexdigest()==t['decodedRGBSha256'];im.save(O/t['file'],lossless=True,method=6)
for name in sorted(set(t['chunk'] for t in r['inputs'])):chunk(name).save(O/name/'inputs/master-1x.webp',lossless=True,method=6)
print('Reconstructed exact source crops; omit cache again before packaging.')
