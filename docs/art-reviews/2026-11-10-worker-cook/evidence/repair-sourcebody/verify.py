"""Independent decoded-pixel invariants for the current localized repair.
These tests do not certify artistic identity or smooth playback.
"""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image,ImageOps
from scipy import ndimage
EV=Path(__file__).resolve().parent;OUT=EV.parents[1];REPO=OUT.parents[2]
INPUT=Path('/Users/agapae/agapae-work/.toby-worktrees/.codex-worktrees/20261111T162400Z-6a49dc9c/docs/art-reviews/2026-11-10-worker-cook')
manifest=json.loads((OUT/'worker-cook.json').read_text());repair=json.loads((EV/'repair-report.json').read_text())
checks=[];rows=[]
def check(name,value):checks.append({'name':name,'satisfied':bool(value)})
def sole(a):
 lab,n=ndimage.label(a[:,:,3]>40);counts=np.bincount(lab.ravel());counts[0]=0
 y,x=np.where(lab==counts.argmax());bottom=int(y.max());y,x=np.where((lab==counts.argmax())&(np.indices(a.shape[:2])[0]>=bottom-7))
 return {'bottomY':bottom,'soleBandMidX':float((x.min()+x.max())/2)}
for e in manifest['animations']:
 key=f"{e['zone']}-{e['anim']}-{e['dir']}";a=Image.open(OUT/e['file']).convert('RGBA');old=Image.open(INPUT/e['file']).convert('RGBA')
 heading='side' if e['dir']=='side-left' else e['dir']
 head=Image.open(OUT/'evidence/repair-identity'/(f"head-{e['zone']}-source.webp" if e['anim']=='cook' else f'head-th-carry-{heading}-source.webp')).convert('RGBA')
 if e['dir'] in ('down-left','side-left'):head=ImageOps.mirror(head)
 h=np.array(head);hm=h[:,:,3]>=250
 if e['anim']=='cook':sr,sc=0,(0 if e['zone']=='asia' else 1)
 else:sr,sc={'side':(1,2),'side-left':(1,2),'down':(4,0),'up':(5,0)}[e['dir']]
 raw=Image.open(REPO/f"img/workers/worker-{e['zone']}-sheet-v2.webp").convert('RGBA').crop((sc*320,sr*320,(sc+1)*320,(sr+1)*320))
 if e['dir'] in ('down-left','side-left'):raw=ImageOps.mirror(raw)
 h=np.array(raw) # authoritative original, not just an inherited head cutout

 changed=[];feet=[];mismatches=[]
 for i in range(8):
  rect=(i*320,e['row']*320,(i+1)*320,(e['row']+1)*320);f=np.array(a.crop(rect));b=np.array(old.crop(rect))
  ops=[op for op in repair['operations'] if op['file']==e['file'] and op['row']==e['row'] and op['frame']==i+1]
  allowed=np.zeros((320,320),dtype=bool)
  for op in ops:
   m=Image.open(OUT/op['mask']).convert('L');m=ImageOps.mirror(m) # masks stored in canonical right coordinates
   allowed|=np.array(m)>0
  check(f'{key} f{i+1} alpha exact inherited',np.array_equal(f[:,:,3],b[:,:,3]))
  check(f'{key} f{i+1} outside repair mask RGBA exact',np.array_equal(f[~allowed],b[~allowed]))
  check(f'{key} f{i+1} source opaque head RGB exact',np.array_equal(f[hm,:3],h[hm,:3]))
  check(f'{key} f{i+1} feet below y280 RGBA exact inherited',np.array_equal(f[280:],b[280:]))
  changed.append(int(np.any(f!=b,axis=2).sum()));feet.append(sole(f));mismatches.append(int(np.any(f[hm,:3]!=h[hm,:3],axis=1).sum()))
 if e['anim']=='cook':
  col=0 if e['zone']=='asia' else 1;ref=Image.open(REPO/f"img/workers/worker-{e['zone']}-sheet-v2.webp").convert('RGBA').crop((col*320,0,(col+1)*320,320))
  if e['dir']=='down-left':ref=ImageOps.mirror(ref)
  reference=sole(np.array(ref))
  check(key+' baseline matches source idle',all(f['bottomY']==reference['bottomY'] for f in feet))
  check(key+' sole band midpoint within 2px of source idle',all(abs(f['soleBandMidX']-reference['soleBandMidX'])<=2 for f in feet))
 else:reference=None
 rows.append({'row':key,'changedPixelsByFrame':changed,'headRGBMismatchPixels':mismatches,'sourceSole':reference,'frameSoles':feet})
# Four disjoint repair logs, not four copies of one inherited cumulative count.
logs=[]
for d in ['revision','repair-th','repair-cyberhell-head','repair-identity']:
 p=OUT/'evidence'/d/'generation-log.json';doc=json.loads(p.read_text());calls=doc.get('calls',doc.get('entries',[]))
 logs.append({'file':str(p.relative_to(OUT)),'entries':len(calls),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
repair_total=sum(x['entries'] for x in logs)
check('repair generation logs sum to 16',repair_total==16)
check('current run called ImageGen zero times',repair['newImageGenCalls']==0)
check('nine localized operations have passing mask invariants',len(repair['operations'])==9 and not repair['failures'])
generation={'run':'20261111T165435Z-427eb5ef','newRepairCallsThisRun':0,'repairTotal':repair_total,'repairLimit':16,'remainingSharedRepairAllowance':0,'logs':logs,'originalCallsDocumentedByInheritedLogs':16,'shadoUsed':False,'externalAPIUsed':False}
(EV/'generation-log.json').write_text(json.dumps(generation,ensure_ascii=False,indent=2)+'\n')
report={'scope':'Decoded current output; no realtime playback by this verifier','checks':checks,'checkCount':len(checks),'failedChecks':[c for c in checks if not c['satisfied']],'rows':rows,'generation':generation}
(EV/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':len(checks),'failedChecks':report['failedChecks'],'repairTotal':repair_total}))
raise SystemExit(bool(report['failedChecks']))
