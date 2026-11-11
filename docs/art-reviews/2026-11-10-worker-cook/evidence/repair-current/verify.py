"""Verify delivered frames against the latest input, original source and logs.
This checks pixel preservation and registration, without accepting visual continuity.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage

EV=Path(__file__).resolve().parent
OUT=EV.parents[1]
REPO=OUT.parents[2]
INPUT=Path('/Users/agapae/agapae-work/.toby-worktrees/.codex-worktrees/20261111T121621Z-c330d056/docs/art-reviews/2026-11-10-worker-cook')
manifest=json.loads((OUT/'worker-cook.json').read_text())
report={'checks':[],'frames':[],'sourceWalkingFeet':[],'generation':{},'limitations':['Static inspection and pixel tests do not establish smooth playback.','Foot silhouettes are compared in raw 320px cells. Engine fit multipliers are not applied.']}
def check(name,value):report['checks'].append({'name':name,'satisfied':bool(value)})
def foot(frame):
    pixels=np.array(frame);labels,n=ndimage.label(pixels[:,:,3]>40)
    sizes=np.bincount(labels.ravel());sizes[0]=0
    y,x=np.where(labels==sizes.argmax());bottom=int(y.max())
    band=(labels==sizes.argmax()) & (np.indices((320,320))[0]>=bottom-7)
    by,bx=np.where(band)
    return {'bottomY':bottom,'soleBandMidX':float((bx.min()+bx.max())/2),'topY':int(y.min())}
for entry in manifest['animations']:
    key=f"{entry['zone']}-{entry['anim']}-{entry['dir']}"
    current=Image.open(OUT/entry['file']).convert('RGBA')
    inherited=Image.open(INPUT/entry['file']).convert('RGBA')
    if entry['anim']=='cook':sr,sc=0,(0 if entry['zone']=='asia' else 1)
    else:sr,sc={'side':(1,2),'side-left':(1,2),'down':(4,0),'up':(5,0)}[entry['dir']]
    raw=Image.open(REPO/f"img/workers/worker-{entry['zone']}-sheet-v2.webp").convert('RGBA')
    source=raw.crop((sc*320,sr*320,(sc+1)*320,(sr+1)*320))
    head_name=f"head-{entry['zone']}-source.webp" if entry['anim']=='cook' else f"head-th-carry-{'side' if entry['dir']=='side-left' else entry['dir']}-source.webp"
    head=Image.open(OUT/'evidence/repair-identity'/head_name).convert('RGBA')
    if entry['dir'] in ('down-left','side-left'):head,source=[ImageOps.mirror(image) for image in (head,source)]
    head_mask=np.array(head)[:,:,3]>=250
    source_pixels=np.array(source)
    check(key+' head cutout matches original source RGB in opaque mask',np.array_equal(np.array(head)[:,:,:3][head_mask],source_pixels[:,:,:3][head_mask]))
    cells=[]
    for index in range(8):
        box=(index*320,entry['row']*320,(index+1)*320,(entry['row']+1)*320)
        cell=current.crop(box);pixels=np.array(cell);before=np.array(inherited.crop(box));cells.append(cell)
        check(f'{key} f{index+1} moving body/hands/props y192+ unchanged',np.array_equal(before[192:],pixels[192:]))
        check(f'{key} f{index+1} alpha outside neck y145:192 unchanged',np.array_equal(before[:145,:,3],pixels[:145,:,3]) and np.array_equal(before[192:,:,3],pixels[192:,:,3]))
        check(f'{key} f{index+1} original opaque head RGB',np.array_equal(pixels[:,:,:3][head_mask],source_pixels[:,:,:3][head_mask]))
        report['frames'].append({'row':key,'frame':index+1,'foot':foot(cell),'changedPixelsVsLatestInput':int(np.any(before!=pixels,axis=2).sum()),'sha256RGBA':hashlib.sha256(cell.tobytes()).hexdigest()})
    # Foot strips keep native source size and indicate the raw baseline.
    plate=Image.new('RGB',(2880,136),(225,228,232));draw=ImageDraw.Draw(plate)
    for index,cell in enumerate([source]+cells):
        bg=Image.new('RGBA',(320,320),(225,228,232,255));bg.alpha_composite(cell)
        plate.paste(bg.convert('RGB').crop((0,220,320,320)),(index*320,20))
        draw.text((index*320+4,3),'original direction' if index==0 else f'{key} f{index}',fill='black')
        draw.line((index*320+160,20,index*320+160,119),fill=(40,120,180))
    plate.save(EV/f'feet-{key}.jpg',quality=83)
    if entry['anim']=='carry':
        originals=[]
        for column in range(4):
            cell=raw.crop((column*320,sr*320,(column+1)*320,(sr+1)*320))
            if entry['dir']=='side-left':cell=ImageOps.mirror(cell)
            originals.append(foot(cell))
        report['sourceWalkingFeet'].append({'row':key,'sourceSheetRow':sr,'originalFourFrames':originals,'deliveredEightFrames':[foot(cell) for cell in cells]})
logs=[]
for rel in ['evidence/revision/generation-log.json','evidence/repair-th/generation-log.json','evidence/repair-cyberhell-head/generation-log.json','evidence/repair-identity/generation-log.json']:
    path=OUT/rel;data=json.loads(path.read_text());entries=data.get('entries',data.get('calls',[]))
    logs.append({'file':rel,'entries':len(entries),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
check('four distinct inherited generation batch logs',len(set(log['sha256'] for log in logs))==4)
check('16 repair generation calls documented',sum(log['entries'] for log in logs)==16)
report['generation']={'run':'20261111T162400Z-6a49dc9c','newRepairCallsThisRun':0,'repairTotal':sum(log['entries'] for log in logs),'originalCallsDocumentedByInheritedLogs':16,'logs':logs,'shadoUsed':False,'externalAPIUsed':False}
report['failedChecks']=[item for item in report['checks'] if not item['satisfied']]
(EV/'preservation-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(EV/'generation-log.json').write_text(json.dumps(report['generation'],ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':len(report['checks']),'failedChecks':report['failedChecks'],'generationRepairTotal':report['generation']['repairTotal']}))
raise SystemExit(bool(report['failedChecks']))
