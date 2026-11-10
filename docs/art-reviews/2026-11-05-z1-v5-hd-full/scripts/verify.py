"""Deliverable checks; diagnostics are not QA approval. Exit 2 if acceptance remains open."""
from pathlib import Path
import hashlib,json,sys
from PIL import Image
O=Path(__file__).resolve().parents[1]
CHUNKS=['r1-c2','r1-c3']
def write(path,obj):path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
images=[];errors=[];open_items=[];checks={}
manifest=json.loads((O/'generation-prompts.json').read_text());generations=manifest['generations']
for chunk in CHUNKS:
 d=O/chunk;required=['q11-native.webp','q12-native.webp','q21-native.webp','q22-native.webp','registration.json',f'{chunk}-2x.webp',f'{chunk}-compare.jpg','structure.json','removed.json','sharpness.json','seam-check.jpg','seams.json']
 missing=[p for p in required if not (d/p).is_file()]
 if missing:errors.append(dict(chunk=chunk,missing=missing));continue
 reg=json.loads((d/'registration.json').read_text());tiles=json.loads((d/'inputs/tiles.json').read_text());st=json.loads((d/'structure.json').read_text());sh=json.loads((d/'sharpness.json').read_text());removed=json.loads((d/'removed.json').read_text())
 assert {p['id'] for p in reg['tiles']}=={'q11','q12','q21','q22'}
 assert not reg['neighborChunkSeamsApplied']
 assert Image.open(d/f'{chunk}-2x.webp').size==(2048,2048)
 for t,r in zip(tiles,reg['tiles']):
  assert t['id']==r['id'];assert list(Image.open(d/f"{t['id']}-native.webp").size)==r['nativeSize'];assert t['coreMasterPx1x']==r['coreMasterPx1x'];assert t['contextMasterPx1x']==r['contextMasterPx1x'];assert len(r['nativeToMasterPx1x'])==2
 ratio=sh['rois']['full_chunk']['laplacianRatio']
 if ratio<10:open_items.append(f'{chunk}: sharpness {ratio:.3f} <10')
 if not st['allReliableProbesWithin4px']:open_items.append(f'{chunk}: reliable structure probes exceed4px or absent')
 if not st['wholeStructureWithin4pxVerified']:open_items.append(f'{chunk}: full semantic contours not verified')
 if not removed['allRemovalsVisuallyVerified']:open_items.append(f"{chunk}: unverified removals: {', '.join(removed.get('unverifiedRemovalIds',[]))}")
 checks[chunk]=dict(requiredFilesPresent=True,nativeCount=4,exportSize=[2048,2048],sharpnessRatio=ratio,sharpnessThresholdMet=ratio>=10,structureReliableProbeMax=st['maxReliableDisplacementPx1x'],structureReliableProbeCount=st['reliableProbes'],structureTotalProbeCount=st['totalProbes'],wholeStructureWithin4pxVerified=st['wholeStructureWithin4pxVerified'],allRemovalsVisuallyVerified=removed['allRemovalsVisuallyVerified'],unverifiedRemovalIds=removed.get('unverifiedRemovalIds',[]))
for p in sorted(O.rglob('*')):
 if p.suffix.lower() in ['.webp','.jpg','.png']:
  with Image.open(p) as im:im.load();images.append(dict(path=str(p.relative_to(O)),size=list(im.size),sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
assert len(generations)<=10
assert len([g for g in generations if g['selectedNative']])==8
for g in generations:
 if g['selectedNative']:
  im=Image.open(O/g['archivedNative']).convert('RGB');assert list(im.size)==g['nativeSize'];assert hashlib.sha256(im.tobytes()).hexdigest()==g['decodedRgbSha256']
# Reconstruct v5 baseline exactly from non-overlapping source cores; no duplicate image needed.
reconstruction=json.loads((O/'baseline-reconstruction-check.json').read_text())
for c in CHUNKS:
 old=Image.new('RGB',(1024,1024))
 for t in json.loads((O/c/'inputs/tiles.json').read_text()):
  cx,cy,cw,ch=t['coreChunkPx1x'];x,y,_,_=t['contextChunkPx1x'];source=Image.open(O/c/f"inputs/{t['id']}-v5.webp").convert('RGB');old.paste(source.crop((cx-x,cy-y,cx-x+cw,cy-y+ch)),(cx,cy))
 assert hashlib.sha256(old.tobytes()).hexdigest()==reconstruction[c]['decodedSha256']

provenance=json.loads((O/'inputs-provenance.json').read_text());root=O.parents[2]
for src in provenance['sources']:assert hashlib.sha256((root/src['path']).read_bytes()).hexdigest()==src['sha256'],src['path']
assert hashlib.sha256((root/provenance['repairSource']).read_bytes()).hexdigest()==provenance['repairSourceSha256']
report=dict(deliverableChecks=checks,imageGenCalls=len(generations),generationLimitRespected=len(generations)<=10,images=images,allImagesDecoded=True,sourceHashesUnchanged=True,limitBytes=60_000_000,errors=errors,openAcceptanceItems=open_items,qaPassedClaimed=False,inGameTestRun=False)
summary=json.loads((O/'run-summary.json').read_text())
for c in summary['chunks']:
 c['pendingRemovalIds']=checks[c['chunk']]['unverifiedRemovalIds'];c['imageGenCalls']=sum(g['chunk']==c['chunk'] for g in generations)
 c['seamVisualReview']='No obvious rectangular tile join in inspected full overview and native 2x strips; offline review, not in-game QA.'
summary['allPartsGenerated']=all(not c['pendingParts'] for c in summary['chunks'])
summary['acceptance']=[dict(id=1,status='partially verified',detail='8/8 parts; sharpness >=10 and reliable local probes <=4px; every semantic contour remains unverified.'),dict(id=2,status='open',detail='No obvious join in inspected seam sheets. Three r1-c3 foliage removals remain unverified after10-call cap.'),dict(id=3,status='deliverables present',detail='8 selected native tiles, lossless pixel hashes, core/context rects and native-to-master affine complete. Neighbor chunk seams deferred.')]
summary.update(limitBytes=60_000_000,openAcceptanceItems=open_items,verificationErrors=errors)
for _ in range(8):
 report['outputBytes']=sum(p.stat().st_size for p in O.rglob('*') if p.is_file());report['withinSizeBudget']=report['outputBytes']<=60_000_000
 summary.update(outputBytes=report['outputBytes'],withinSizeBudget=report['withinSizeBudget']);write(O/'run-summary.json',summary);write(O/'verification.json',report)
assert report['withinSizeBudget']
print(json.dumps({k:v for k,v in report.items() if k!='images'},ensure_ascii=False,indent=2));sys.exit(2 if errors or open_items else 0)
