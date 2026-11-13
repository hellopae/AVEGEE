"""Summarize stored measurements and explicit visual observations; no new quality measurements."""
from pathlib import Path
import json,re,hashlib
import numpy as np
from source import O,ROOT,master
from PIL import Image

def dump(p,d):p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
m=json.loads((O/'measurement-summary.json').read_text());g=json.loads((O/'generation-prompts.json').read_text());obs=json.loads((O/'visual-observations.json').read_text());inv=json.loads((O/'objects-inventory.json').read_text())
s=(ROOT/'src/town-owner-walkmask-west.js').read_text();runs=json.loads(re.search(r'TOWN_OWNER_WALK_RUNS=(\[.*?\]);',s).group(1));a=np.zeros(480*320,np.uint8);at=0
for i,n in enumerate(runs):a[at:at+n]=i%2;at+=n
mask=a.reshape(320,480)
trees=json.loads((ROOT/'src/town-west-trees.js').read_text().split('= ',1)[1].rstrip().removesuffix(';'));runtime=[]
for i,p in enumerate(trees):
 x,y=p['x']*4915,p['y']*3277
 if y<1088 and x<4160:
  wx,wy=p['x']*3840,p['y']*2560;runtime.append({'id':f'west-tree-{i}','worldFoot':[wx,wy],'masterFootPx1x':[x,y],'species':p['species'],'spriteKey':p['key'],'ownerMaskWalkableAtFoot':bool(mask[min(319,int(wy//8)),min(479,int(wx//8))]),'bakedObjectCorrespondence':'not assumed; separate sprite feet only'})
inv['runtimeTreeEvidence']=runtime
inv['surveyPolicy']='Removal boxes are hand-inspected silhouettes overlapping paving/owner walkmask; not inferred solely from runtime feet. Runtime sprites remain untouched. Shrubs grounded on inaccessible snow/rock are kept.'
inv['keptSurveyExamples']=[{'id':'west-r1-c3-upper-ridge-tree','masterRectPx1x':[2348,286,98,126],'action':'keep-baked','reason':'ridge/tree base outside owner walkmask; corrected before generation'},{'id':'west-r1-c4-east-ridge-vegetation','masterRectPx1x':[3544,617,113,140],'action':'keep-baked','reason':'inaccessible boulder/ridge vegetation, no removal requested'}]
for obj in inv['objects']:obj['status']=obs['chunks'][obj['chunk']]['objects'][obj['id']]
dump(O/'objects-inventory.json',inv)
for c in m['chunks']:
 name=c['chunk'];v=obs['chunks'][name];objects=[x for x in inv['objects'] if x['chunk']==name]
 dump(O/name/'removed.json',{'requestedIds':[x['id'] for x in objects],'objectReview':[{'id':x['id'],'status':x['status']} for x in objects],'pendingObjectIds':v['pendingObjectIds'],'visualVerification':'offline partial observation only; not a semantic acceptance signoff','inventory':'../objects-inventory.json'})
 c.update(pendingObjectIds=v['pendingObjectIds'],visualSeamReview=v['seamReview'],pendingReview=['Full semantic contours and stair counts; three uncertain landmarks retained across run.','Liquid/cloud animation masks against final ASSEMBLE.','External chunk joins left to ASSEMBLE.'])
for t in g['generations']:
 tile=next(ti for ti in json.loads((O/t['chunk']/'inputs/tiles.json').read_text()) if ti['id']==t['id']);t['inputReconstruction']={'script':'scripts/cache_inputs.py','contextMasterPx1x':tile['contextMasterPx1x'],'decodedInputHashFile':'input-recipes.json','note':'Exact input crop omitted from package to meet 80 MB; stored native unchanged.'}
dump(O/'generation-prompts.json',g)
report={'scope':'Z234-HD-FULL zone3 west set1/5 r1-c1..r1-c4','tool':'built-in image_gen.imagegen only','imageGenCalls':g['generationCount'],'generationLimit':16,'chunks':m['chunks'],'pendingParts':[],'pendingObjectIds':[p for c in m['chunks'] for p in c['pendingObjectIds']],'qualityMeasurementsPasses':1,'automaticQualityAssertions':False,'completeAcceptanceVerified':False,'installedIntoGame':False,'sizeBudgetBytes':80_000_000,'pendingReview':['Claude/owner visual decision; not QA signoff.','All semantic structure contours and liquid-mask alignment.','Remaining shrub at r1-c2 stair foot.','Cross-chunk stitching by ASSEMBLE.']}
report['outputBytesBeforeFinalVerificationReport']=sum(p.stat().st_size for p in O.rglob('*') if p.is_file());dump(O/'run-summary.json',report)
print('runtime tree evidence',len(runtime),'native',g['generationCount'],'bytes',report['outputBytesBeforeFinalVerificationReport'])
