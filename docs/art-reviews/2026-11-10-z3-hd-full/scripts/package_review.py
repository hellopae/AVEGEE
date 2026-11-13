"""Keep lossless deliverables; omit reproducible source crops and compact JPEG review sheets."""
from pathlib import Path
import json,hashlib
from PIL import Image
O=Path(__file__).resolve().parents[1]
recipe=[]
for d in sorted(O.glob('r1-c*')):
 tiles=json.loads((d/'inputs/tiles.json').read_text())
 for t in tiles:
  p=d/f"inputs/{t['id']}-master.webp"
  if p.exists():
   im=Image.open(p).convert('RGB');recipe.append({'chunk':d.name,'id':t['id'],'file':str(p.relative_to(O)),'contextMasterPx1x':t['contextMasterPx1x'],'size':list(im.size),'decodedRGBSha256':hashlib.sha256(im.tobytes()).hexdigest()});p.unlink()
 p=d/'inputs/master-1x.webp'
 if p.exists():p.unlink()
 for p in [d/f'{d.name}-compare.jpg',d/'seam-check.jpg',d/'inputs/walkmask-overlay.jpg']:
  im=Image.open(p).convert('RGB');im.save(p,quality=60,subsampling=2,optimize=True)
if recipe:(O/'input-recipes.json').write_text(json.dumps({'why':'Avoid duplicate master pixels within 80 MB. Exact source crops reconstructible from unchanged repo masters and these rectangles.','rebuild':'python3 docs/art-reviews/2026-11-10-z3-hd-full/scripts/cache_inputs.py','inputs':recipe},indent=2)+'\n')
print('packaged bytes',sum(p.stat().st_size for p in O.rglob('*') if p.is_file()))
