#!/usr/bin/env python3
"""Extract navigation DATA from the owner's red-overlay reference, without editing artwork.
Default is analysis only; --write emits src/town-owner-walkmask.js.
"""
import argparse
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, default=Path('/Users/agapae/Desktop/map/Map-Zone1-3.jpg'))
parser.add_argument('--write', action='store_true')
args = parser.parse_args()
cv2.setRNGSeed(0)
cv2.setNumThreads(2)
bg = cv2.imread(str(root/'img/map-zone1/v5/zone1-terrain-v5-preview.webp'))
ref = cv2.imread(str(args.source))
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
cells = cv2.dilate(cells.astype(np.uint8), np.ones((3,3),np.uint8)).astype(bool)
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
    (root/'src/town-owner-walkmask.js').write_text(
        '// Navigation data extracted from owner Map-Zone1-3.jpg; not a rendered image.\n'
        '// Regenerate with python3 scripts/extract-town-owner-mask.py --write\n'
        'export const TOWN_OWNER_MASK_META='+json.dumps(metadata,separators=(',',':'))+';\n'
        'export const TOWN_OWNER_WALK_RUNS='+json.dumps(runs,separators=(',',':'))+';\n')
