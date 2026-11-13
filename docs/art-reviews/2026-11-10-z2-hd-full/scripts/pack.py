"""Fit review JPEGs to the 80 MB run budget; never alters native/final WebP pixels."""
from pathlib import Path
from PIL import Image
import json
O=Path(__file__).resolve().parents[1]
def size():return sum(p.stat().st_size for p in O.rglob('*') if p.is_file())
before=size();changes=[]
if before>78500000:
 for p in sorted(O.rglob('*.jpg')):
  old=p.stat().st_size
  with Image.open(p) as im:im.convert('RGB').save(p,quality=70,subsampling=2,optimize=True)
  changes.append(dict(path=str(p.relative_to(O)),oldBytes=old,newBytes=p.stat().st_size))
report=dict(beforeBytes=before,afterBytesBeforeReport=size(),targetBytes=78500000,limitBytes=80000000,jpegQuality=70,jpegChromaSubsampling='4:2:0',webpPixelsChanged=False,changes=changes)
(O/'packing.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='changes'},indent=2))
