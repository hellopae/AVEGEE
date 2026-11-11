"""Register decoded natives and retain all upstream structure probes and FX overlaps."""
import json
import math

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from prepare import BASE, IDS, OUT, ROOT, sha, write

cv2.setNumThreads(2)
cv2.setRNGSeed(0)
FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 16)


def band(im):
    gray = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2GRAY).astype(np.float32)
    return cv2.GaussianBlur(gray, (0, 0), 1.5) - cv2.GaussianBlur(gray, (0, 0), 6)


def register(reference, native, core):
    # Fit the overlap ring only. Core architectural probes remain independent.
    reference3 = reference.resize((reference.width * 3, reference.height * 3), Image.Resampling.LANCZOS)
    mask = np.full((reference3.height, reference3.width), 255, np.uint8)
    x0, y0, x1, y1 = core
    mask[y0*3:y1*3, x0*3:x1*3] = 0
    sift = cv2.SIFT_create(nfeatures=6000, contrastThreshold=.015)
    kp_ref, desc_ref = sift.detectAndCompute(cv2.cvtColor(np.array(reference3), cv2.COLOR_RGB2GRAY), mask)
    kp_native, desc_native = sift.detectAndCompute(cv2.cvtColor(np.array(native), cv2.COLOR_RGB2GRAY), None)
    pairs = cv2.BFMatcher().knnMatch(desc_native, desc_ref, k=2)
    good = [first for first, second in pairs if first.distance < .75 * second.distance]
    assert len(good) >= 6, 'Insufficient overlap matches'
    src = np.float32([kp_native[m.queryIdx].pt for m in good])
    dst = np.float32([kp_ref[m.trainIdx].pt for m in good]) / 3
    matrix, inliers = cv2.estimateAffine2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=1.5,
                                         maxIters=10000, confidence=.999, refineIters=20)
    assert matrix is not None and inliers.sum() >= 6
    residual = np.linalg.norm(src @ matrix[:, :2].T + matrix[:, 2] - dst, axis=1)
    matches = [dict(nativePx=a.tolist(), contextPx1x=b.tolist(), inlier=bool(k), residualPx1x=float(d))
               for a, b, k, d in zip(src, dst, inliers[:, 0], residual)]
    return matrix, matches


def measure(reference, registered, input_data):
    a = band(reference)
    b = band(registered.resize(reference.size, Image.Resampling.LANCZOS))
    x0, y0, x1, y1 = input_data['contextRectPx1x']
    source = json.loads((BASE / 'structure.json').read_text())
    probes = []
    for p in source['probes']:
        gx, gy = p['sourcePx1x']
        if not (x0 <= gx < x1 and y0 <= gy < y1):
            continue
        x, y = gx-x0, gy-y0
        record = dict(id=p['id'], sourcePx1x=[gx, gy], upstreamMeasurement=p)
        if not (36 <= x < reference.width-36 and 36 <= y < reference.height-36):
            record.update(result='unresolved', reason='49px template plus 12px search exceeds context')
        else:
            template = a[y-24:y+25, x-24:x+25]
            area = b[y-36:y+37, x-36:x+37]
            _, score, _, loc = cv2.minMaxLoc(cv2.matchTemplate(area, template, cv2.TM_CCOEFF_NORMED))
            dx, dy = loc[0]-12, loc[1]-12
            distance = math.hypot(dx, dy)
            record.update(displacementPx1x=[dx, dy], distancePx1x=distance, normalizedCorrelation=score,
                          searchBoundaryHit=abs(dx)==12 or abs(dy)==12,
                          result='unresolved' if score < .6 else 'within4px' if distance <= 4 else 'over4px')
        probes.append(record)
    return dict(method=source['method'], thresholdPx1x=4, probes=probes,
                counts={kind:sum(p['result']==kind for p in probes) for kind in ['within4px','over4px','unresolved']},
                semanticContoursVerified=False,
                limitation='NCC measures local image correspondence. Rail, tread and shoreline contours require visual review. All upstream probes retained, including context-edge probes.')


def fx_overlay(folder, image, data):
    layout_path = ROOT / 'img/map-zone1/v5-fx/fx-layout.json'
    layout = json.loads(layout_path.read_text())
    box = data['contextRectPx1x']
    x0,y0,x1,y1 = box
    coverage = np.zeros((image.height, image.width), np.uint8)
    records = []
    for piece in layout['pieces']:
        x,y,w,h = piece['maskRectPx']
        if piece.get('off') or x>=x1 or x+w<=x0 or y>=y1 or y+h<=y0:
            continue
        mask_names = piece['mask'] if isinstance(piece['mask'], list) else [piece['mask']]
        for name in mask_names:
            path = layout_path.parent / f'masks/{name}.webp'
            mask = Image.open(path).getchannel('A')
            assert mask.size == (w,h)
            crop = mask.crop((x0-x,y0-y,x1-x,y1-y)).resize(image.size, Image.Resampling.NEAREST)
            alpha = np.array(crop)
            coverage = np.maximum(coverage, alpha)
            cx0,cy0,cx1,cy1 = data['coreRectPx1x']
            core_alpha = alpha[(cy0-y0)*2:(cy1-y0)*2,(cx0-x0)*2:(cx1-x0)*2]
            records.append(dict(id=piece['id'], group=piece['group'], kind=piece['kind'], mask=str(path.relative_to(ROOT)),
                                maskSha256=sha(path), maskRectPx1x=piece['maskRectPx'],
                                contextCoveredPixels2x=int(np.count_nonzero(alpha)), coreCoveredPixels2x=int(np.count_nonzero(core_alpha))))
    arr = np.array(image).astype(float)
    opacity = coverage[...,None] / 255 * .5
    arr = arr*(1-opacity)+np.array([0,235,255])*opacity
    overlay = Image.fromarray(arr.astype(np.uint8))
    draw = ImageDraw.Draw(overlay)
    cx0,cy0,cx1,cy1 = data['coreRectPx1x']
    draw.rectangle(((cx0-x0)*2,(cy0-y0)*2,(cx1-x0)*2-1,(cy1-y0)*2-1),outline='#ff44aa',width=2)
    overlay.save(folder / 'fx-overlay.jpg', quality=95, subsampling=0)
    Image.fromarray(coverage).save(folder / 'fx-coverage.png')
    write(folder / 'fx-overlap.json', dict(layout=str(layout_path.relative_to(ROOT)),layoutSha256=sha(layout_path),
          sourceCodeSha256=sha(ROOT / 'src/town-fluid-fx.js'),pieces=records,
          activeCloudRectanglesIntersect=False,
          display='cyan = union of active FX coverage masks, magenta = repair core. Coverage diagnostic includes spot masks, actual animated spots occupy subsets.'))


def run(name):
    folder = OUT / name
    data = json.loads((folder / 'input.json').read_text())
    reference = Image.open(folder / 'reference-1x.png').convert('RGB')
    native = Image.open(folder / 'native.webp').convert('RGB')
    x0,y0,x1,y1 = data['contextRectPx1x']
    cx0,cy0,cx1,cy1 = data['coreRectPx1x']
    core = [cx0-x0,cy0-y0,cx1-x0,cy1-y0]
    matrix, matches = register(reference, native, core)
    registered_array = cv2.warpAffine(np.array(native), matrix*2, (reference.width*2, reference.height*2), flags=cv2.INTER_LANCZOS4)
    registered = Image.fromarray(registered_array)
    registered.save(folder / 'registered-2x.webp', lossless=True)
    # Measurements intentionally decode the exact exported WebP again.
    registered = Image.open(folder / 'registered-2x.webp').convert('RGB')
    structure = measure(reference, registered, data)
    write(folder / 'structure.json', structure)
    global_matrix = matrix.copy()
    global_matrix[:,2] += [x0,y0]
    record = dict(data, nativeFile='native.webp',nativeSize=list(native.size), nativeSha256=sha(folder / 'native.webp'),
                  nativeToContextPx1x=matrix.tolist(), nativeToMasterPx1x=global_matrix.tolist(),
                  nativeToFullPx2x=(global_matrix*2).tolist(), fullPx=[9830,6554],chunk=2048,
                  registrationMethod='SIFT ratio .75 on reference overlap ring only, affine RANSAC 1.5 map px, seed 0',
                  matches=matches, inlierCount=sum(m['inlier'] for m in matches),
                  geometryAcceptance='pending semantic contour review',
                  sourceGeneration='generation.json', diagnosticOnly=True)
    write(folder / 'registration.json', record)
    before = Image.open(folder / 'assembled-before.webp').convert('RGB')
    panels = [reference.resize(before.size,Image.Resampling.NEAREST), before, registered]
    sheet = Image.new('RGB',(before.width*3,before.height+42),'#151923')
    for i,(panel,label) in enumerate(zip(panels,['Repaired v5 reference (nearest 2x)','Assembled v7 before repair','Registered generated native (2x)'])):
        sheet.paste(panel,(i*before.width,42))
        ImageDraw.Draw(sheet).text((i*before.width+6,10),label,font=FONT,fill='white')
    sheet.save(folder / 'review.jpg',quality=95,subsampling=0)
    blend = Image.blend(panels[0],registered,.5)
    blend.save(folder / 'alignment-overlay.jpg',quality=95,subsampling=0)
    fx_overlay(folder,registered,data)
    print(name, 'inliers',record['inlierCount'],'/',len(matches),'structure',structure['counts'], flush=True)


if __name__ == '__main__':
    for name in IDS:
        run(name)
