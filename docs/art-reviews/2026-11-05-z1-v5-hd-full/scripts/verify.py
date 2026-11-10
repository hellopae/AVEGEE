"""Artifact integrity and numerical checks; no application/in-game QA claim."""
from pathlib import Path
import ast,json,hashlib,subprocess
import cv2,numpy as np
from PIL import Image
O=Path(__file__).resolve().parents[1]
M=json.loads((O/'generation-prompts.json').read_text());checks={};images=[]
for p in O.rglob('*'):
 if p.suffix in ['.webp','.jpg','.png']:
  with Image.open(p) as im:im.load();images.append({'path':str(p.relative_to(O)),'size':list(im.size)})
for p in (O/'scripts').glob('*.py'):ast.parse(p.read_text())
assert M['generationCount']==len(M['generations'])+len(M.get('retries',[]))==10
for chunk,size in [('r3-c1',[2048,2048]),('r1-c5',[1638,2048])]:
 D=O/chunk;reg=json.loads((D/'registration.json').read_text());sharp=json.loads((D/'sharpness.json').read_text());structure=json.loads((D/'structure.json').read_text());native=[]
 assert list(Image.open(D/f'{chunk}-2x.webp').size)==size
 assert len(reg['tiles'])==4
 for q in reg['tiles']:
  g=next(g for g in M['generations'] if g['chunk']==chunk and g['id']==q['id'])
  a=np.array(Image.open(g['nativeFile']).convert('RGB'));b=np.array(Image.open(D/f"{q['id']}-native.webp").convert('RGB'))
  assert np.array_equal(a,b),f'Lossless pixels differ: {chunk}/{q["id"]}'
  assert list(b.shape[1::-1])==q['nativeSize']
  cx,cy,cw,ch=q['coreMapPx1x'];x,y,w,h=q['contextMapPx1x'];assert x<=cx and y<=cy and x+w>=cx+cw and y+h>=cy+ch
  assert x==max(0,cx-64) and y==max(0,cy-64) and x+w==min(4915,cx+cw+64) and y+h==min(3277,cy+ch+64)
  assert q['siftInliers']>=6
  assert np.array(q['nativeToContextPx1x']).shape==(2,3)
  native.append(dict(id=q['id'],pixelExactLossless=True,nativeSize=q['nativeSize'],sha256=hashlib.sha256((D/f"{q['id']}-native.webp").read_bytes()).hexdigest()))
 assert sharp['ratioToV5']>=10
 assert structure['allReliableProbesWithin4px']
 checks[chunk]=dict(outputSize=size,native=native,sharpnessRatio=sharp['ratioToV5'],reliableStructureMaxPx1x=structure['maxReliableDisplacementPx1x'],reliableStructureProbes=structure['reliableCount'],totalStructureProbes=structure['totalCount'],wholeStructureWithin4pxVerified=False)
result=subprocess.run(['git','diff','--exit-code','--','src','tests','img'],capture_output=True,text=True);assert result.returncode==0
status=subprocess.run(['git','status','--porcelain','--untracked-files=all'],capture_output=True,text=True,check=True)
paths=[line[3:] for line in status.stdout.splitlines()]
assert all(p.startswith('docs/art-reviews/2026-11-05-z1-v5-hd-full/') for p in paths),paths
report=dict(imageGenCount=M['generationCount'],allImagesDecode=True,imageCount=len(images),images=images,pythonScriptsParse=True,chunks=checks,protectedSourceDirectoriesUnchanged=True,changedPathsRestrictedToBrief=True,qaPassedClaimed=False)
for _ in range(3):
 (O/'verification.json').write_text(json.dumps(report,indent=2))
 report['outputBytes']=sum(p.stat().st_size for p in O.rglob('*') if p.is_file());report['limitBytes']=60_000_000;report['withinSizeBudget']=report['outputBytes']<=report['limitBytes']
(O/'verification.json').write_text(json.dumps(report,indent=2));assert report['withinSizeBudget'],report['outputBytes']
print(json.dumps({k:v for k,v in report.items() if k not in ['images','chunks']},indent=2))
for c,v in checks.items():print(c,'Laplacian',round(v['sharpnessRatio'],3),'structure max',v['reliableStructureMaxPx1x'])
