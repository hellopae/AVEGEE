"""Deliverable integrity/measurement checks only. Does not certify semantic art QA."""
from pathlib import Path
import json,hashlib,subprocess
from PIL import Image
import numpy as np
import cv2
O=Path(__file__).resolve().parents[1];R=O.parents[2]
M=json.loads((O/'generation-prompts.json').read_text());S=json.loads((O/'run-summary.json').read_text());checks=[]
def check(name,condition,details=None):checks.append(dict(name=name,ok=bool(condition),details=details))
check('ten built-in generations',M['tool']=='built-in image_gen.imagegen' and M['generationCount']==10 and len(M['generations'])==10)
count=0
for p in O.rglob('*'):
 if p.suffix in ['.webp','.jpg','.png']:
  with Image.open(p) as im:im.load();count+=1
check('decode all images',True,{'decoded':count})
for g in M['generations']:
 p=O/g['chunk']/f"{g['id']}-native.webp";raw=Image.open(p).convert('RGB');check(g['chunk']+'/'+g['id']+' native size and lossless',list(raw.size)==g['nativeSize'] and p.read_bytes()[12:16]==b'VP8L')
 check(g['chunk']+'/'+g['id']+' native pixel hash',hashlib.sha256(np.array(raw).tobytes()).hexdigest()==g['nativeRgbSha256'])
 source=Path(g['nativeFile'])
 if source.exists():check(g['chunk']+'/'+g['id']+' equals original ImageGen pixels',np.array_equal(np.array(raw),np.array(Image.open(source).convert('RGB'))))
for c in range(1,6):
 chunk=f'r4-c{c}';d=O/chunk;x=(c-1)*1024;w=min(1024,4915-x);gs=[g for g in M['generations'] if g['chunk']==chunk];r=json.loads((d/'registration.json').read_text());st=json.loads((d/'structure.json').read_text());rec=next(r for r in S['chunks'] if r['chunk']==chunk)
 check(chunk+' core coverage',gs[0]['coreMapPx1x']==[x,3072,(w+1)//2,205] and gs[1]['coreMapPx1x']==[x+(w+1)//2,3072,w//2,205])
 check(chunk+' context clipped64',all(g['contextMapPx1x']==[max(0,g['coreMapPx1x'][0]-64),3008,min(4915,g['coreMapPx1x'][0]+g['coreMapPx1x'][2]+64)-max(0,g['coreMapPx1x'][0]-64),269] for g in gs))
 check(chunk+' overlap128',gs[0]['contextMapPx1x'][0]+gs[0]['contextMapPx1x'][2]-gs[1]['contextMapPx1x'][0]==128)
 check(chunk+' registration finite and supported',all(v['registrationReliable'] and v['siftInliers']>=6 and np.isfinite(v['affineNativeToMapPx1x']).all() for v in r['parts']))
 out=Image.open(d/f'{chunk}-2x.webp').convert('RGB');baseline=Image.open(d/'inputs/v5.webp').convert('RGB');check(chunk+' output dimensions',out.size==(w*2,410))
 check(chunk+' exact v5 baseline',np.array_equal(np.array(baseline),np.array(Image.open(R/f'img/map-zone1/v5/{chunk}.webp').convert('RGB'))))
 device=(round(w*2.8/(4915/3840)),round(205*2.8/(4915/3840)))
 def lap(i):return cv2.Laplacian(cv2.cvtColor(np.array(i.resize(device,Image.Resampling.LANCZOS)),cv2.COLOR_RGB2GRAY).astype(np.float64),cv2.CV_64F,ksize=1).var()
 ratio=lap(out)/lap(baseline);check(chunk+' sharpness recomputed >=10',ratio>=10 and abs(ratio-rec['sharpnessRatio'])<1e-9,ratio)
 check(chunk+' structure sample accounting',st['totalCount']==len(st['points']) and st['confidentCount']==sum(p['confident'] for p in st['points']) and st['wholeStructureWithin4pxVerified'] is False)
 check(chunk+' all required files',all((d/p).exists() for p in ['q11-native.webp','q12-native.webp','registration.json',f'{chunk}-2x.webp',f'{chunk}-compare.jpg','structure.json','removed.json','seam-check.jpg']))
status=subprocess.check_output(['git','status','--porcelain','-z'],cwd=R).decode().split('\0');changed=[r[3:] for r in status if r];check('changes confined to brief folder',all(p.startswith('docs/art-reviews/2026-11-05-z1-v5-hd-full/') for p in changed),changed)
check('semantic verification remains candid',S['qaPassed'] is False and S['inGameTested'] is False and len(S['pendingCorrections'])>=3)
check('delivery <=60 decimal MB',sum(p.stat().st_size for p in O.rglob('*') if p.is_file())<=60_000_000)
report={'integrityChecksSuccessful':all(c['ok'] for c in checks),'qaPassed':False,'checks':checks,'semanticAcceptanceComplete':False,'pendingCorrections':S['pendingCorrections']}
vp=O/'verification.json'
for _ in range(4):
 vp.write_text(json.dumps(report,ensure_ascii=False,indent=2));report['totalBytes']=sum(p.stat().st_size for p in O.rglob('*') if p.is_file());S['totalBytes']=report['totalBytes'];(O/'run-summary.json').write_text(json.dumps(S,ensure_ascii=False,indent=2))
print(json.dumps({'integrityChecksSuccessful':report['integrityChecksSuccessful'],'checkCount':len(checks),'decodedImages':count,'totalBytes':report['totalBytes'],'failed':[x for x in checks if not x['ok']],'qaPassed':False},indent=2))
raise SystemExit(0 if report['integrityChecksSuccessful'] else 1)
