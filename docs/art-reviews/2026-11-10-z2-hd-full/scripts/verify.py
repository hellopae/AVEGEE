"""Structural file checks only. Art-quality metrics are evidence, never pass/fail gates."""
from pathlib import Path
from PIL import Image
import json,hashlib,sys
O=Path(__file__).resolve().parents[1];ROOT=O.parents[2];errors=[];images=[]
manifest=json.loads((O/'generation-prompts.json').read_text());gens=manifest['generations'];chunks=['r1-c5','r2-c1','r2-c2','r2-c3']
for c in chunks:
 d=O/c
 for name in ['registration.json','structure.json','removed.json','sharpness.json','seams.json','inputs/tiles.json',f'{c}-2x.webp',f'{c}-compare.jpg','seam-check.jpg']:
  if not (d/name).exists():errors.append(f'missing {c}/{name}')
 for q in ['q11','q12','q21','q22']:
  p=d/f'{q}-native.webp';g=next((g for g in gens if g['chunk']==c and g['id']==q and g.get('selected',True)),None)
  if not p.exists() or g is None:errors.append(f'missing native/manifest {c}/{q}');continue
  with Image.open(p) as im:
   im=im.convert('RGB')
   if list(im.size)!=g['nativeSize']:errors.append(f'native size {c}/{q}')
   if hashlib.sha256(im.tobytes()).hexdigest()!=g['decodedRgbSha256']:errors.append(f'pixel archive mismatch {c}/{q}')
 if (d/f'{c}-2x.webp').exists():
  with Image.open(d/f'{c}-2x.webp') as im:
   expected=(1638,2048) if c=='r1-c5' else (2048,2048)
   if im.size!=expected:errors.append(f'output size {c}: {im.size}')
 if (d/'registration.json').exists():
  reg=json.loads((d/'registration.json').read_text())
  if len(reg['tiles'])!=4:errors.append(f'registration count {c}')
  for t in reg['tiles']:
   if len(t['nativeToMasterPx1x'])!=2 or any(len(row)!=3 for row in t['nativeToMasterPx1x']):errors.append(f'affine shape {c}')
for p in sorted(O.rglob('*')):
 if p.suffix.lower() in ['.jpg','.png','.webp']:
  try:
   with Image.open(p) as im:
    im.load();images.append(dict(path=str(p.relative_to(O)),size=list(im.size),format=im.format))
  except Exception as e:errors.append(f'decode {p}: {e}')
for s in json.loads((O/'inputs-provenance.json').read_text())['sources']:
 if hashlib.sha256((ROOT/s['path']).read_bytes()).hexdigest()!=s['sha256']:errors.append('source changed '+s['path'])
size=sum(p.stat().st_size for p in O.rglob('*') if p.is_file())
if size>80000000:errors.append(f'over 80 MB: {size}')
if len(gens)+len(manifest.get('failedGenerations',[]))>16:errors.append('more than 16 calls')
report=dict(checkScope='files/decode/dimensions/affine shape/hash preservation/count/budget only; no art-quality gates',imageGenCalls=len(gens)+len(manifest.get('failedGenerations',[])),fileBytesBeforeReport=size,limitBytes=80000000,decodedImageCount=len(images),images=images,errors=errors,qaPassedClaimed=False)
(O/'verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='images'},indent=2));sys.exit(bool(errors))
