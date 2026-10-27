#!/usr/bin/env python3
"""Extract navigation DATA from the owner's red-overlay reference, without editing artwork.
Default is analysis only; --write emits the walk-mask module.

Zone 1 (default, unchanged):   --source <flattened red-overlay picture, registered to the preview with SIFT>  -> src/town-owner-walkmask.js
Zones 2-4 (M2 mask tool):      --zone asia|west|cyberhell  --layer <transparent PNG of the red layer, 1536x1024>
                               -> src/town-owner-walkmask-<zone>.js    (see scripts/make-town-mask-overlay.py, step 1)
                               --source <flattened picture> also works for those zones (registered to the zone's preview)
Options: --out FILE (write somewhere else), --dilate N (extra 8-unit cells of edge tolerance; default 1 for --source, 0 for --layer
because the layer was made from the already-tolerant mask), --threshold A (alpha at/over which a layer pixel counts as red).
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, default=None)
parser.add_argument('--zone', default='th', choices=['th','asia','west','cyberhell'])
parser.add_argument('--layer', type=Path, default=None)
parser.add_argument('--out', type=Path, default=None)
parser.add_argument('--dilate', type=int, default=None)
parser.add_argument('--threshold', type=int, default=64)
parser.add_argument('--write', action='store_true')
parser.add_argument('--largest-component', action='store_true', help='Discard disconnected walkable pockets; never dilate owner markings')
parser.add_argument('--reference-sha256', default=None, help='SHA-256 of the original annotated reference')
args = parser.parse_args()
PREVIEW = {'th':'img/map-zone1/v5/zone1-terrain-v5-preview.webp','asia':'img/map-zone2/v1/zone2-terrain-v1-preview.webp',
           'west':'img/map-zone3/v1/zone3-terrain-v1-preview.webp','cyberhell':'img/map-zone4/v1/zone4-terrain-v1-preview.webp'}
OUT = {'th':'src/town-owner-walkmask.js'}
OUT.update({z:f'src/town-owner-walkmask-{z}.js' for z in ('asia','west','cyberhell')})
if args.zone == 'th' and args.layer: parser.error('--layer is for zones 2-4 (Zone 1 keeps the owner reference picture)')
if args.source is None and args.layer is None:
    args.source = Path('/Users/agapae/Desktop/map/Map-Zone1-3.jpg')
if args.layer is not None:
    # ---- red layer (exact registration: 1536x1024 transparent PNG; opaque red = not walkable) ----
    from PIL import Image
    im = Image.open(args.layer).convert('RGBA')
    if im.size != (1536, 1024): raise ValueError(f'layer must be 1536x1024, got {im.size}')
    alpha = np.asarray(im)[:, :, 3]
    blocked = alpha >= args.threshold
    floor = (~blocked).astype(np.uint8)
    import cv2
    # 1536x1024 px -> 480x320 cells (3.2 px per cell): a cell is walkable when more than 68% of its px are
    cells = cv2.resize(floor.astype(float), (480, 320), interpolation=cv2.INTER_AREA) > .68
    dil = 0 if args.dilate is None else args.dilate
    if dil:
        cells = cv2.dilate(cells.astype(np.uint8), np.ones((2*dil+1, 2*dil+1), np.uint8)).astype(bool)
    # Area downsampling can leave isolated 2-3-cell flecks along a diagonal edge.
    # Discard only sub-8-cell islands, never dilate/open the owner's red barriers.
    count, labels, stats, _ = cv2.connectedComponentsWithStats(cells.astype(np.uint8), connectivity=4)
    tiny = [i for i in range(1, count) if stats[i, cv2.CC_STAT_AREA] < 8]
    removed = int(sum(stats[i, cv2.CC_STAT_AREA] for i in tiny))
    if tiny:
        cells[np.isin(labels, tiny)] = False
    disconnected = 0
    if args.largest_component:
        count2, labels2, stats2, _ = cv2.connectedComponentsWithStats(cells.astype(np.uint8), connectivity=4)
        if count2 > 1:
            largest = 1 + int(np.argmax(stats2[1:, cv2.CC_STAT_AREA]))
            connected = labels2 == largest
            disconnected = int(cells.sum() - connected.sum())
            cells = connected
    metadata = {'removed_island_cells': removed, 'source_sha256': hashlib.sha256(args.layer.read_bytes()).hexdigest(), 'mode': 'layer', 'threshold': args.threshold, 'dilate': dil,
                'walkable_cells': int(cells.sum()), 'total_cells': int(cells.size)}
    if args.largest_component: metadata['removed_disconnected_cells'] = disconnected
    if args.reference_sha256: metadata['reference_sha256'] = args.reference_sha256
    runs, last, count = [], False, 0
    for value in cells.flat:
        if value == last: count += 1
        else: runs.append(count); count, last = 1, bool(value)
    runs.append(count)
    print(json.dumps(metadata, indent=2))
    if args.write:
        dest = args.out or (root/OUT[args.zone])
        dest.write_text('// Navigation data from the owner-painted red layer for zone %s; not a rendered image.\n' % args.zone +
            '// Regenerate with python3 scripts/extract-town-owner-mask.py --zone %s --layer <layer.png>%s --write\n' % (args.zone, ' --largest-component' if args.largest_component else '') +
            'export const TOWN_OWNER_MASK_META='+json.dumps(metadata,separators=(',',':'))+';\n'
            'export const TOWN_OWNER_WALK_RUNS='+json.dumps(runs,separators=(',',':'))+';\n')
        print('wrote', dest)
    raise SystemExit(0)
import cv2
cv2.setRNGSeed(0)
cv2.setNumThreads(2)
bg = cv2.imread(str(root/PREVIEW[args.zone]))
ref = cv2.imread(str(args.source))
if bg is None:
    raise FileNotFoundError(root/PREVIEW[args.zone])
if ref is None:
    raise FileNotFoundError(args.source)
sift = cv2.SIFT_create(nfeatures=18000)
ka, da = sift.detectAndCompute(bg, None)
kb, db = sift.detectAndCompute(ref, None)
matches = [a for a,b in cv2.BFMatcher().knnMatch(da, db, k=2) if a.distance < .72*b.distance]
a = np.float32([ka[m.queryIdx].pt for m in matches])
b = np.float32([kb[m.trainIdx].pt for m in matches])
matrix, inliers = cv2.estimateAffine2D(a, b, method=cv2.RANSAC, ransacReprojThreshold=4)
if matrix is None or int(inliers.sum()) < 100:
    raise ValueError('Reference could not be registered reliably')
h,w = bg.shape[:2]
aligned = cv2.warpAffine(ref, cv2.invertAffineTransform(matrix), (w,h))
valid = cv2.warpAffine(np.full(ref.shape[:2],255,np.uint8), cv2.invertAffineTransform(matrix), (w,h)) > 250
blue,green,red = [aligned[:,:,i].astype(float) for i in range(3)]
# The owner's translucent paint is red even over blue water and grey rocks.
# Unpainted golden paving has a substantially smaller red/green separation.
blocked = ((red-green > 55) & (red-blue > 45) & (red > 135)) | ~valid
floor = (~blocked).astype(np.uint8)
floor = cv2.medianBlur(floor, 9)
# Cell coverage, rather than centre sampling, avoids opening narrow red barriers.
cells = cv2.resize(floor.astype(float), (480,320), interpolation=cv2.INTER_AREA) > .68
# Remove tiny red flecks from flowers and JPEG edges inside otherwise continuous paving.
# Building/tree collision remains separate; wide owner-painted barriers stay closed.
cells = cells | cv2.morphologyEx(cells.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3,3),np.uint8)).astype(bool)
# Eight world units of edge tolerance keep diagonal stair lanes usable with
# the 16-unit pathfinding grid and its three-unit safety margin.
cells = cv2.dilate(cells.astype(np.uint8), np.ones((3,3) if args.dilate is None else (2*args.dilate+1,)*2,np.uint8)).astype(bool)
runs, last, count = [], False, 0
for value in cells.flat:
    if value == last:
        count += 1
    else:
        runs.append(count)
        count, last = 1, bool(value)
runs.append(count)
metadata = {'source_sha256':hashlib.sha256(args.source.read_bytes()).hexdigest(),
            'inliers':int(inliers.sum()), 'preview_to_reference':matrix.tolist(),
            'walkable_cells':int(cells.sum()), 'total_cells':int(cells.size)}
print(json.dumps(metadata, indent=2))
if args.write:
    (args.out or root/OUT[args.zone]).write_text(
        '// Navigation data extracted from owner %s; not a rendered image.\n' % args.source.name +
        '// Regenerate with python3 scripts/extract-town-owner-mask.py%s --write\n' % ('' if args.zone == 'th' else ' --zone '+args.zone)+
        'export const TOWN_OWNER_MASK_META='+json.dumps(metadata,separators=(',',':'))+';\n'
        'export const TOWN_OWNER_WALK_RUNS='+json.dumps(runs,separators=(',',':'))+';\n')
