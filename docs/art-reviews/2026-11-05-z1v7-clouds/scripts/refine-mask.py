"""Remove visibly stale legacy fog support; never create or paint cloud pixels."""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image

R = Path(__file__).resolve().parents[1]
cfg = json.loads((R/'regions.json').read_text())
old = np.asarray(Image.open(R/'input/inherited-cloud-layer-mask.png'))
H, W = old.shape
roi = np.zeros_like(old)
# The two lower traced regions contain bare rock in the supplied assembled v7.
# Preserve their handoff requests, but do not overlay fabricated mist there.
active = cfg['regions'][:4]
for region in active:
    points = np.rint(np.array(region['polygonProxy1500'])*[W/1500, H/1000]).astype('int32')
    cv2.fillPoly(roi, [points], 255)
new = np.where(roi > 0, old, 0).astype('uint8')
# Isolated colour-selected rock highlights must not become floating clouds.
count, labels, stats, _ = cv2.connectedComponentsWithStats((new > 0).astype('uint8'), 8)
removed = []
for i in range(1, count):
    x, y, w, h, area = map(int, stats[i])
    if area < 1200:
        new[labels == i] = 0
        removed.append({'boxPx2x': [x, y, w, h], 'areaPx2x': area})
# New clipping boundaries need their own inward feather; never leave a hard ROI cut.
distance = cv2.distanceTransform((roi > 0).astype('uint8'), cv2.DIST_L2, 3)
new = np.rint(new*np.clip(distance/48, 0, 1)).astype('uint8')
Image.fromarray(new).save(R/'cloud-layer-mask.png')
cfg['maskRefinement'] = {'source': 'input/inherited-cloud-layer-mask.png',
    'activeTracedRegions': [r['id'] for r in active],
    'inactiveTracedRegions': [r['id'] for r in cfg['regions'][4:]],
    'reason': 'Visual comparison against v7: lower legacy support lands on rocks, ice-zone stone, and purple river edges. Small isolated pale rock highlights removed conservatively. No new cloud pixels painted.',
    'removedComponentsBelowArea': 1200, 'newRoiInwardFeatherPx2x': 48}
for q in cfg['quarters']:
    x, y, w, h = q['rectPx2x']
    q['coveredPixels'] = int(np.count_nonzero(new[y:y+h, x:x+w]))
    q['retainedSourceForRegistration'] = True
(R/'regions.json').write_text(json.dumps(cfg, indent=2))
(R/'mask-refinement.json').write_text(json.dumps({
    'beforeSupportPixels': int(np.count_nonzero(old)),
    'afterSupportPixels': int(np.count_nonzero(new)),
    'addedSupportPixels': int(np.count_nonzero((old == 0) & (new > 0))),
    'smallComponentsRemoved': removed,
    'semanticLimitation': 'Conservative subtraction only; does not certify completeness or trace all mountain silhouettes.'}, indent=2))
print('Mask support', np.count_nonzero(old), '->', np.count_nonzero(new), '; added', np.count_nonzero((old == 0) & (new > 0)))
