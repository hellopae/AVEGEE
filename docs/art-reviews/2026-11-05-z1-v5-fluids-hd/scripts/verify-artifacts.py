"""Verify deliverable integrity; report artistic acceptance separately."""
from pathlib import Path
import json,hashlib,subprocess,cv2,numpy as np
from PIL import Image
R=Path(__file__).resolve().parents[1]
model=json.loads((R/'fx-layout.json').read_text())
regions={r['id']:r for r in json.loads((R/'regions.json').read_text())['regions']}
checks={};errors=[]
def check(name,condition):
    checks[name]=bool(condition)
    if not condition:errors.append(name)
for p in model['pieces']:
    im=Image.open(R/p['sheet'])
    check(p['id']+' sheet shape',im.size==(p['frameW']*p['frames'],p['frameH']))
    mask=Image.open(R/p['mask'])
    check(p['id']+' mask shape',mask.size==tuple(p['maskRectPx'][2:]))
    check(p['id']+' region',p['regionId'] in regions)
    check(p['id']+' no fluid translation',p.get('scrollSpeed',0)==0)
    if 'driftWorld' in p:
        check(p['id']+' authored cloud clipping',p['clipRegion']=='cloud-sea' and p['regionId']=='cloud-sea' and p['wrapWithinMaskBounds'])
        check(p['id']+' RGBA',im.mode=='RGBA' and im.getextrema()[3][0]==0)
check('exactly four drifting cloud puffs',sum('driftWorld' in p for p in model['pieces'])==4)
cloud=np.array(Image.open(R/'masks/cloud-sea-1x.png'));H,W=cloud.shape
# Independent coarse exclusion of every walking surface near this cloud region.
guards=[[(900,125),(1020,110),(1099,160),(1110,211),(1040,230),(932,216),(899,177)],[(940,218),(987,222),(965,270),(917,298),(894,280)],[(1110,150),(1206,146),(1215,174),(1111,192)]]
protected=np.zeros_like(cloud)
for poly in guards:cv2.fillPoly(protected,[np.round(np.array(poly)*[W/1500,H/1000]).astype('int32')],255)
check('cloud excludes walking plaza stairs bridge guards',not np.any((cloud>0)&(protected>0)))
check('cloud excludes eastern snow',not np.any(cloud[:,round(1195*W/1500):]))
loop=json.loads((R/'loop-review.json').read_text())
for a in loop['assets']:check(a['id']+' eight distinct paintings',a['distinctHashes']==8)
render=json.loads((R/'render-check.json').read_text())
check('cloud zero changes outside mask',all(v['changedOutsideCloudMask']==0 for v in render['containment']))
check('four measured puff motions',len(render.get('puffMotion',[]))==4)
for p in render.get('puffMotion',[]):
    check(p['id']+' actually visible and moving',min(p['visiblePixelsAt0'],p['visiblePixelsAt6'],p['changedPixels0to6'])>0)
for c in render['clips']:
    probe=c['probe'];stream=probe['streams'][0]
    check(c['view']+' 12 seconds',abs(float(probe['format']['duration'])-12)<.05)
    check(c['view']+' 144 frames',int(stream['nb_frames'])==144)
    check(c['view']+' 1280x720',(stream['width'],stream['height'])==(1280,720))
size=sum(p.stat().st_size for p in R.rglob('*') if p.is_file())
check('under 80 decimal MB',size<80_000_000)
prompts=json.loads((R/'generation-prompts.json').read_text())
check('12 built-in generations',len(prompts['records'])==12 and prompts['generationCalls']==12)
for a in prompts['records']:check(a['id']+' prompt present',bool(a.get('prompt')))
sourceHashes={str(p.relative_to(R)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (R/'sources').glob('*.webp')}
sharp=json.loads((R/'sharpness.json').read_text())['samples']
result={'integrityChecks':checks,'integrityErrors':errors,'totalBytesAtCheck':size,'sourceHashes':sourceHashes,'acceptance':{'1_fluidsSharpnessAndLoop':{'allCompositeSharpnessIncreased':all(v['ratio']>1 for v in sharp),'allBoundaryRatiosAtMost1_5':all(a['meetsBoundaryCriterion'] for a in loop['assets'] if a['id']!='cloud-sea'),'native800pxTarget':False},'2_clouds':{'paintedCurlFrames':8,'paintedStaticPuffs':4,'containmentMeasured':checks['cloud zero changes outside mask'],'cloudLoopBoundaryAtMost1_5':next(a['meetsBoundaryCriterion'] for a in loop['assets'] if a['id']=='cloud-sea'),'visualApproval':'pending artist; offline clips only'},'3_documentationAndSize':{'readmeExists':(R/'README.md').exists(),'under80MB':size<80_000_000}},'claim':'Integrity checks and explicit unmet acceptance criteria; not QA approval.'}
(R/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({'integrityErrors':errors,'bytes':size,'acceptance':result['acceptance']},ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
