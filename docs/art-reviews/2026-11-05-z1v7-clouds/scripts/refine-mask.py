"""Register sea-mist support against native v7; mask processing, no art generation."""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image

R = Path(__file__).resolve().parents[1]
W, H = 9830, 6554
cfg = json.loads((R/'regions.json').read_text())
spec = json.loads((R/'scripts/mask-traces.json').read_text())
base = Image.new('RGB', (8192, 3072))
for row, col in [(1, 1), (1, 2), (1, 3), (1, 4), (2, 1)]:
    base.paste(Image.open(R/'input/terrain'/f'r{row}-c{col}.webp'), ((col-1)*2048, (row-1)*2048))
rgb = np.asarray(base)
hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
rr, gg, bb = rgb.astype('float32').transpose(2, 0, 1)
gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype('float32')
std = np.sqrt(np.maximum(0, cv2.blur(gray*gray, (15, 15))-cv2.blur(gray, (15, 15))**2))
mask = np.zeros((H, W), np.uint8)
reports = []
for region in spec['regions']:
    roi = np.zeros(rgb.shape[:2], np.uint8)
    pts = np.rint(np.array(region['polygonProxy1500'])*[W/1500, H/1000]).astype('int32')
    cv2.fillPoly(roi, [pts], 255)
    if region['id'] == 'west-border-mist':
        gate = (rr > 94) & (bb > gg*1.15) & (bb > rr*.45) & (std < 20) & (hsv[:, :, 1] < 195)
    elif region['id'] == 'western-ridge-mist':
        gate = (rr > 115) & (gg > 85) & (bb > rr*.78) & (hsv[:, :, 1] < 120) & (std < 20)
    else:
        gate = (rr > 138) & (gg > 122) & (bb > rr*.70) & (hsv[:, :, 1] < 105) & (std < 31)
    sel = ((roi > 0) & gate).astype('uint8')*255
    # Close texture-sized holes, not gaps occupied by mountain silhouettes.
    sel = cv2.morphologyEx(sel, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8))
    sel[roi == 0] = 0
    n, labels, stats, _ = cv2.connectedComponentsWithStats((sel > 0).astype('uint8'), 8)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < 900:
            sel[labels == i] = 0
    distance = cv2.distanceTransform((sel > 0).astype('uint8'), cv2.DIST_L2, 3)
    t = np.clip(distance/26, 0, 1)
    feather = np.rint(255*t*t*(3-2*t)).astype('uint8')
    mask[:rgb.shape[0], :rgb.shape[1]] = np.maximum(mask[:rgb.shape[0], :rgb.shape[1]], feather)
    reports.append({'id': region['id'], 'selectedPixelsBeforeExclusion': int(np.count_nonzero(feather))})
ex = np.asarray(Image.open(R/'input/exclusion-mask.png'))
protected = np.zeros((H, W), np.uint8)
for region in spec['protectedTerrain']:
    pts = np.rint(np.array(region['polygonProxy1500'])*[W/1500, H/1000]).astype('int32')
    cv2.fillPoly(protected, [pts], 255)
Image.fromarray(protected).save(R/'protected-terrain-mask.png')
blocked = (ex > 0) | (protected > 0)
mask[blocked] = 0
safe = cv2.distanceTransform((~blocked).astype('uint8'), cv2.DIST_L2, 3)
mask = np.rint(mask*np.clip(safe/26, 0, 1)).astype('uint8')
Image.fromarray(mask).save(R/'cloud-layer-mask.png')
cfg['regions'] = spec['regions']
cfg['regionsNotRetained'] = spec['regionsNotRetained']
if not any(q['id'] == 'r1-c1-q3' for q in cfg['quarters']):
    cfg['quarters'].append({'id': 'r1-c1-q3', 'rectPx2x': [0, 1024, 1024, 1024], 'contextBoxPx2x': [0, 992, 1056, 2080]})
for q in cfg['quarters']:
    x, y, w, h = q['rectPx2x']
    q['coveredPixels'] = int(np.count_nonzero(mask[y:y+h, x:x+w]))
    q['retainedSourceForRegistration'] = True
cfg['maskRefinement'] = {'source': 'native input/terrain + scripts/mask-traces.json', 'inwardFeatherPx2x': 26, 'deleteGuardPx2x': 16, 'method': 'Reviewed envelopes, native colour/texture gate, small-hole close, inward smoothstep feather; delete12 applied last.'}
(R/'regions.json').write_text(json.dumps(cfg, indent=2))
old = np.asarray(Image.open(R/'input/inherited-cloud-layer-mask.png'))
report = {'beforeSupportPixels': int(np.count_nonzero(old)), 'afterSupportPixels': int(np.count_nonzero(mask)), 'addedSupportPixels': int(np.count_nonzero((old == 0) & (mask > 0))), 'delete12SupportPixels': int(np.count_nonzero(mask[ex > 0])), 'regions': reports, 'traceSpec': 'scripts/mask-traces.json', 'notQAApproval': True}
(R/'mask-refinement.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
