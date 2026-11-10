"""Artifact checks and independent structure diagnostics. This is not in-game QA."""
from pathlib import Path
import hashlib
import json
import math
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1]
LANDMARKS = {
    'r1-c1': [
        ('mountain-apex-west',188,38), ('mountain-face-west',225,160),
        ('lava-fall-west-lip',443,256), ('lava-fall-west-foot',452,312),
        ('volcano-lip-west',681,78), ('volcano-lip-east',809,104),
        ('volcano-fall-foot',781,236), ('east-rock-apex',829,243),
        ('upper-stair-top-left',420,378), ('upper-stair-top-right',506,364),
        ('upper-stair-foot-left',455,443), ('upper-stair-foot-right',544,430),
        ('plaza-north-rim',567,452), ('plaza-east-rim',859,526),
        ('plaza-southwest-rim',440,738), ('plaza-south-rim',552,785),
        ('lower-stair-top-left',647,816), ('lower-stair-top-right',720,826),
        ('lower-stair-foot-left',600,902), ('lower-stair-foot-right',682,914),
        ('lower-path-west',574,950), ('lower-path-east',685,956),
        ('bridge-deck-west',958,743), ('bridge-deck-east',987,764),
        ('lava-lower-fall-lip',239,747), ('lava-lower-fall-foot',250,887),
        ('lava-lower-bank',370,897), ('cliff-east-face',843,851),
    ],
    'r2-c1': [
        ('upper-stair-foot-left',598,37), ('upper-stair-foot-right',677,34),
        ('plaza-northwest',393,142), ('plaza-west-rim',393,210),
        ('plaza-east-rim',930,318), ('plaza-southwest',476,360),
        ('plaza-south-rim',537,394), ('middle-stair-top-left',591,421),
        ('middle-stair-top-right',706,409), ('middle-stair-foot-left',627,507),
        ('middle-stair-foot-right',747,495), ('middle-landing',708,544),
        ('lower-stair-top-left',734,578), ('lower-stair-top-right',816,564),
        ('lower-stair-foot-left',755,650), ('lower-stair-foot-right',843,641),
        ('lower-plaza-north-rim',895,663), ('lower-plaza-west-rim',602,783),
        ('bottom-stair-top-left',765,974), ('bottom-stair-top-right',840,980),
        ('bridge-deck-east',988,252), ('lava-west-channel',233,266),
        ('lava-lower-bank',473,765), ('lava-lower-bend',557,850),
        ('rock-spire-west',161,624), ('rock-spire-lower',380,813),
    ],
}
FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 17)


def band(im):
    gray = cv2.cvtColor(im, cv2.COLOR_RGB2GRAY).astype(np.float32)
    return cv2.GaussianBlur(gray, (0, 0), 1.5)-cv2.GaussianBlur(gray, (0, 0), 6)


def laplacian(im):
    gray = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2GRAY).astype(np.float64)
    return float(cv2.Laplacian(gray, cv2.CV_64F, ksize=1).var())


manifest = json.loads((OUT / 'generation-prompts.json').read_text())
generation_results = []
for index, generation in enumerate(manifest['generations']):
    generation_results.append(dict(call=index+1, chunk=generation['chunk'], id=generation['id'], returnedSize=generation['returnedSize']))
for revision in manifest.get('revisions', []):
    generation_results.append(dict(call=revision['call'], chunk=revision['chunk'], id=revision['id'], returnedSize=revision['returnedSize']))
summary = dict(chunks=[], generationCount=manifest['generationCount'], generationLimit=10,
    generationResults=generation_results,
    method='Approved reference SIFT/partial-affine, direct native-to-2x warp, broad lighting correction, min-cost seam. No sharpening.',
    gameDevicePxPerWorldUnit=2.8, mapSizePx1x=[4915,3277], worldSize=[3840,2560], pendingParts=[],
    qaPassed=False, inGameTestRun=False, status='incomplete-acceptance',
    pendingCorrections=[
        dict(chunk='r2-c1', part='q22', reason='Bottom staircase exceeds 4px structure threshold after final ImageGen edit.'),
        dict(chunk='r2-c1', part='q21', reason='Vegetation remains in the approximate west-bed-07 inventory rectangle. Exact removal unresolved.'),
        dict(chunk='r1-c1', part='q21', reason='Generated diagonal stone course on plaza needs review against original geometry.'),
        dict(chunk='both', part='structure', reason='Low-correlation probes and full contour/mask alignment remain unverified.')])
for chunk, landmarks in LANDMARKS.items():
    folder = OUT / chunk
    source = Image.open(folder / 'inputs/v5.webp').convert('RGB')
    result = Image.open(folder / f'{chunk}-2x.webp').convert('RGB')
    a, b = band(np.array(source)), band(np.array(result.resize((1024, 1024), Image.Resampling.LANCZOS)))
    records = []
    r, search = 24, 12
    sheet = Image.new('RGB', (2080, 1090), '#161a22')
    sheet.paste(source, (8, 58)); sheet.paste(result.resize((1024, 1024), Image.Resampling.LANCZOS), (1048, 58))
    draw = ImageDraw.Draw(sheet)
    draw.text((8, 8), chunk+' v5 | fixed structure probes', font=FONT, fill='white')
    draw.text((1048, 8), 'HD | green <=4px, red >4px, yellow uncertain', font=FONT, fill='white')
    for i, (label, x, y) in enumerate(landmarks):
        template = a[y-r:y+r+1, x-r:x+r+1]
        x0, y0 = max(0, x-r-search), max(0, y-r-search)
        area = b[y0:min(1024, y+r+search+1), x0:min(1024, x+r+search+1)]
        _, confidence, _, loc = cv2.minMaxLoc(cv2.matchTemplate(area, template, cv2.TM_CCOEFF_NORMED))
        dx, dy = loc[0]+x0-(x-r), loc[1]+y0-(y-r)
        distance = math.hypot(dx, dy)
        reliable = confidence >= .6
        record = dict(id=label, sourcePx1x=[x,y], displacementPx1x=[dx,dy], distancePx1x=distance,
            normalizedCorrelation=confidence, reliable=reliable, within4px=distance <= 4)
        records.append(record)
        color = '#f0cb35' if not reliable else '#35efb1' if distance <= 4 else '#ff4566'
        for ox, px, py in [(8,x,y),(1048,x+dx,y+dy)]:
            draw.ellipse((ox+px-4,58+py-4,ox+px+4,58+py+4), outline=color, width=2)
            draw.text((ox+px+5,58+py-18), str(i+1), font=FONT, fill=color, stroke_width=1, stroke_fill='black')
    reliable = [q for q in records if q['reliable']]
    maximum = max((q['distancePx1x'] for q in reliable), default=None)
    structure = dict(thresholdPx1x=4, method='Reference independent 49x49 DoG sigma1.5/6 landmark templates, normalized correlation, +/-12 map pixels on final assembled output.',
        limitation='Local patch translation does not establish every contour or tread count. All probes retained. Low correlation remains unverified, never counted as success.',
        totalProbes=len(records), reliableProbes=len(reliable), maxReliableDisplacementPx1x=maximum,
        maxAllProbeDisplacementPx1x=max(q['distancePx1x'] for q in records),
        allReliableProbesWithin4px=bool(reliable) and all(q['within4px'] for q in reliable),
        wholeStructureWithin4pxVerified=False, probes=records)
    (folder / 'structure.json').write_text(json.dumps(structure, indent=2))
    sheet.save(folder / 'structure-check.jpg', quality=80, subsampling=0)
    size = round(1024*2.8*3840/4915)
    old_lap = laplacian(source.resize((size,size), Image.Resampling.LANCZOS))
    new_lap = laplacian(result.resize((size,size), Image.Resampling.LANCZOS))
    reg = json.loads((folder / 'registration.json').read_text())
    native = []
    for tile in reg['tiles']:
        path = folder / tile['nativeFile']
        with Image.open(path) as im:
            im.load()
            assert list(im.size) == tile['nativeSize']
        native.append(dict(id=tile['id'], size=tile['nativeSize'], sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    assert result.size == (2048,2048)
    summary['chunks'].append(dict(chunk=chunk, completedParts=[q['id'] for q in native], pendingParts=[], native=native,
        imageGenCalls=4 if chunk == 'r1-c1' else 6,
        outputSize=list(result.size), structureMaxPx1x=maximum, structureDiagnostic=structure['allReliableProbesWithin4px'],
        structureReliableProbes=len(reliable), structureTotalProbes=len(records), wholeStructureWithin4pxVerified=False,
        sharpness=dict(method='Grayscale Laplacian variance ksize1, full chunk at identical 2.8 device px/world unit, Lanczos, no sharpening.',
            deviceSize=[size,size], v5=old_lap, hd=new_lap, ratioToV5=new_lap/old_lap, threshold=10, thresholdMet=new_lap/old_lap>=10),
        acceptance=dict(allPartsPresent=True, sharpnessAtLeast10=new_lap/old_lap>=10, wholeStructureWithin4pxVerified=False,
            seamlessAndAllRemovalsVerified=False, nativeAndRegistrationComplete=True)))
    print(chunk,'sharpness ratio',new_lap/old_lap,'structure max',maximum,'reliable',len(reliable),'/',len(records))
    print('  >4px',[(q['id'],round(q['distancePx1x'],2),round(q['normalizedCorrelation'],2)) for q in records if q['reliable'] and not q['within4px']])
images = []
for path in OUT.rglob('*'):
    if path.suffix in ['.webp','.jpg','.png']:
        with Image.open(path) as im:
            im.load()
            images.append(dict(path=str(path.relative_to(OUT)), size=list(im.size)))
summary['allImagesDecode'] = True
summary['imageCount'] = len(images)
summary['outputBytes'] = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
summary['sizeLimitBytes'] = 60_000_000
summary['withinSizeBudget'] = summary['outputBytes'] <= 60_000_000
assert summary['generationCount'] <= 10
assert summary['withinSizeBudget'],summary['outputBytes']
(OUT / 'run-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
for _ in range(3):
    summary['outputBytes'] = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
    summary['withinSizeBudget'] = summary['outputBytes'] <= summary['sizeLimitBytes']
    (OUT / 'run-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
assert summary['withinSizeBudget']
print('Decoded',len(images),'images;',summary['outputBytes'],'bytes')
assert all(c['sharpness']['thresholdMet'] for c in summary['chunks'])
if '--strict' in sys.argv and any(not all(chunk['acceptance'].values()) for chunk in summary['chunks']):
    print('Acceptance incomplete. See pendingCorrections and per-chunk acceptance in run-summary.json.')
    raise SystemExit(1)
