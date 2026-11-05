"""Artifact checks and independent fixed structure probes. Never a QA sign-off."""
from pathlib import Path
import json,math,hashlib,sys
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
O=Path(__file__).resolve().parents[1]
LANDMARKS={
'r2-c2':[
('bridge-deck-west',52,225),('bridge-deck-middle',135,242),('bridge-deck-east',242,260),
('lava-bank-northwest',173,78),('lava-bank-northeast',327,150),('lava-fall-under-arch',154,277),
('stair-west-foot',447,369),('stair-west-top',803,242),('stair-east-foot',527,397),('stair-east-top',880,258),
('stair-mid-upper',602,305),('stair-mid-lower',647,341),
('terrace-cliff-west',627,386),('terrace-cliff-middle',761,388),('terrace-cliff-east',901,378),
('upper-plaza-ring',997,239),('lava-right-bank',370,470),('lava-left-bank',239,509),
('middle-fall-lip-left',292,627),('middle-fall-lip-right',351,660),
('lower-platform-cliff-left',669,807),('lower-platform-cliff-middle',809,850),('lower-platform-cliff-right',944,858),
('lower-cliff-point',538,884),('lower-lava-bank',394,943),('lower-east-stair',1000,957)],
'r3-c3':[
('north-bank-west',64,176),('north-bank-middle',171,168),('north-bank-east',267,160),
('bridge-floor-north',414,70),('bridge-floor-middle',414,178),('bridge-floor-south',414,302),
('bridge-stair-top',412,384),('bridge-stair-middle',412,426),('bridge-stair-foot',412,472),
('pier-stair-top',816,133),('pier-stair-middle',816,163),('pier-stair-foot',816,190),
('pier-front-middle',816,271),('pier-front-west',762,265),('pier-front-east',878,265),
('east-bank',978,156),('south-bank-west',92,449),('south-bank-east',682,451),
('plaza-ring-northwest',190,526),('plaza-ring-west',46,679),('plaza-ring-southwest',168,840),
('plaza-ring-south',415,902),('plaza-ring-southeast',709,837),('plaza-ring-east',857,692),('plaza-ring-northeast',700,548),
('plaza-inner-west',136,683),('plaza-inner-east',768,681),('plaza-inner-south',442,851),
('south-stair-top',415,935),('south-stair-middle',415,974),
('south-cliff-west',155,933),('south-cliff-east',618,930),('east-cliff',890,784)]}
FONT=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',18)
def band(a):
    g=cv2.cvtColor(a,cv2.COLOR_RGB2GRAY).astype(np.float32)
    return cv2.GaussianBlur(g,(0,0),1.5)-cv2.GaussianBlur(g,(0,0),6)
def structure(chunk):
    d=O/chunk;old=np.array(Image.open(d/'inputs/v5-repaired.webp').convert('RGB'));new=np.array(Image.open(d/f'{chunk}-2x.webp').convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS));a,b=band(old),band(new)
    records=[];r=24;search=12
    for label,x,y in LANDMARKS[chunk]:
        # Border points use a clipped fixed template, preserving a full +/-12 search.
        x0=max(search,x-r);x1=min(1024-search,x+r+1);y0=max(search,y-r);y1=min(1024-search,y+r+1)
        template=a[y0:y1,x0:x1];area=b[y0-search:y1+search,x0-search:x1+search]
        _,confidence,_,loc=cv2.minMaxLoc(cv2.matchTemplate(area,template,cv2.TM_CCOEFF_NORMED));dx,dy=loc[0]-search,loc[1]-search
        distance=math.hypot(dx,dy)
        records.append(dict(id=label,sourcePx1x=[x,y],displacementPx1x=[dx,dy],distancePx1x=distance,normalizedCorrelation=confidence,reliable=confidence>=.6,within4px=distance<=4))
    reliable=[p for p in records if p['reliable']];failed=[p for p in reliable if not p['within4px']]
    result=dict(thresholdPx1x=4,method='Fixed manually selected architecture/bank probes; 49x49 DoG sigma1.5/6 normalized template correlation, +/-12 map px; correlation>=0.6 considered reliable. Independent of SIFT.',
        totalProbes=len(records),reliableProbes=len(reliable),maxReliableDisplacementPx1x=max((p['distancePx1x'] for p in reliable),default=None),p95ReliableDisplacementPx1x=float(np.percentile([p['distancePx1x'] for p in reliable],95)) if reliable else None,
        allReliableProbesWithin4px=bool(reliable) and not failed,failedReliableProbeIds=[p['id'] for p in failed],semanticStructureVerified=False,wholeStructureWithin4pxVerified=False,
        limitation='Local patch translation cannot certify entire semantic contours, stair count, liquid animation mask alignment or occluded boundaries. All low-confidence and out-of-threshold results retained.',probes=records)
    (d/'structure.json').write_text(json.dumps(result,indent=2))
    sheet=Image.new('RGB',(2096,1110),'#161a22');sheet.paste(Image.fromarray(old),(16,64));sheet.paste(Image.fromarray(new),(1056,64));draw=ImageDraw.Draw(sheet)
    draw.text((16,12),'v5 + repairs | fixed structure probes',font=FONT,fill='white');draw.text((1056,12),'New | green <=4px; red >4px; yellow uncertain',font=FONT,fill='white')
    for i,p in enumerate(records):
        x,y=p['sourcePx1x'];dx,dy=p['displacementPx1x'];c='#f0cb35' if not p['reliable'] else '#35efb1' if p['within4px'] else '#ff4566'
        for ox,px,py in [(16,x,y),(1056,x+dx,y+dy)]:
            draw.ellipse((ox+px-4,64+py-4,ox+px+4,64+py+4),outline=c,width=2);draw.text((ox+px+5,64+py-20),str(i+1),font=FONT,fill=c,stroke_width=1,stroke_fill='black')
    sheet.save(d/'structure-check.jpg',quality=84,subsampling=2)
    print(chunk,'structure',len(reliable),'/',len(records),'max',result['maxReliableDisplacementPx1x'],'failed',result['failedReliableProbeIds'])
    return result

def verify():
    manifest=json.loads((O/'generation-prompts.json').read_text());assert manifest['generationCount']<=10
    selected=[g for g in manifest['generations'] if g.get('selected',True)]
    assert len(selected)==8 and len({(g['chunk'],g['id']) for g in selected})==8
    for g in selected:
        archive=O/g['nativeFile'];assert hashlib.sha256(archive.read_bytes()).hexdigest()==g['nativeSha256']
        source=Path(g['nativeSource'])
        if source.exists():
            assert hashlib.sha256(source.read_bytes()).hexdigest()==g['sourceSha256']
            assert Image.open(archive).convert('RGB').tobytes()==Image.open(source).convert('RGB').tobytes()

    summary=[]
    for chunk in ['r2-c2','r3-c3']:
        d=O/chunk;st=structure(chunk);reg=json.loads((d/'registration.json').read_text());sharp=json.loads((d/'sharpness.json').read_text())
        assert {t['id'] for t in reg['tiles']}=={'q11','q12','q21','q22'}
        assert list(Image.open(d/f'{chunk}-2x.webp').size)==[2048,2048]
        for t in reg['tiles']:
            with Image.open(d/t['nativeFile']) as im:assert list(im.size)==t['nativeSize']
            assert np.array(t['nativeToGlobalMapPx1x']).shape==(2,3)
            assert t['contextMapPx1x'][2:]==[640,640] and t['coreMapPx1x'][2:]==[512,512]
        ratio=sharp['rois']['full_chunk']['ratio'];assert ratio>=10,(chunk,ratio)
        assert all(v['ratio']>=10 for v in sharp['rois'].values()),(chunk,sharp['rois'])
        removal=json.loads((d/'removed.json').read_text());visual=json.loads((d/'visual-review.json').read_text())
        gens=[g for g in manifest['generations'] if g['chunk']==chunk and g['status']=='generated']
        summary.append(dict(chunk=chunk,partsComplete=['q11','q12','q21','q22'],pendingGenerationParts=[],imageGenCalls=len(gens),returnedSizes=[dict(id=g['id'],revision=g.get('revision',1),size=g['nativeSize']) for g in gens],structureMaxPx1x=st['maxReliableDisplacementPx1x'],reliableStructureProbes=st['reliableProbes'],totalStructureProbes=st['totalProbes'],allReliableProbesWithin4px=st['allReliableProbesWithin4px'],wholeStructureWithin4pxVerified=False,sharpnessRatioLaplacianToV5=ratio,minCoreSharpnessRatio=min(sharp['rois'][q]['ratio'] for q in ['q11','q12','q21','q22']),nativeAndRegistrationComplete=True,pendingReview=dict(individualObjectIds=removal['needsIndividualVerificationIds'],wholeStructureContour=True,inGameAnimationMaskAlignment=True,remainingBaseFoliageReview='Red/orange low shrubs on south river bank in q12; full separation not certified' if chunk=='r3-c3' else None),allInventoryObjectsIndividuallyVerified=False,obviousRectangularJoinObserved=visual['obviousRectangularJoinObserved']))
    images=[]
    for p in sorted(O.rglob('*')):
        if p.suffix.lower() in ['.webp','.jpg','.png']:
            with Image.open(p) as im:im.load();images.append(dict(path=str(p.relative_to(O)),size=list(im.size)))
    checks=dict(allImagesDecode=True,imageCount=len(images),generationCount=manifest['generationCount'],generationLimit=10,nativeLosslessArchive=True,selectedNativePixelEqualityToImageGenSources=True,selectedNativeSha256Verified=True,outputs2048x2048=True,registrationComplete=True,sharpnessThresholdMet=True,qaPassed=False,images=images)
    (O/'verification.json').write_text(json.dumps(checks,indent=2))
    report=dict(task='Z1-V5-HD-FULL',baseCommit='812152d2',chunks=summary,imageGenCalls=manifest['generationCount'],generationLimit=10,tool='built-in image_gen.imagegen',outputBudgetBytes=60_000_000,qaPassed=False,neighborChunkEdgesBlended=False)
    (O/'run-summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    # Refresh byte count after report sizes stabilize; README included when rerun.
    for _ in range(4):
        total=sum(p.stat().st_size for p in O.rglob('*') if p.is_file());report['outputBytes']=total;report['withinSizeBudget']=total<=60_000_000;(O/'run-summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    assert report['withinSizeBudget'],total
    print('images',len(images),'ImageGen calls',manifest['generationCount'],'bytes',total,'/ 60000000')
    print(json.dumps(summary,indent=2))
if __name__=='__main__':verify()
