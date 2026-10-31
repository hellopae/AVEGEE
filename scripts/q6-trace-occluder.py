"""Q6: trace the silhouette of a painted structure that stands on the floor of a route map, so it can be
listed as an occlusion piece (polygon + baseline) in src/route-occlusion-data/<map>.js. Read-only on the art.

  python3 -I scripts/q6-trace-occluder.py <image> <x0> <y0> <x1> <y1> <seedx> <seedy> [preview.png]

Segments everything inside the box that is not floor-coloured (beige plaza tile), keeps the blob holding the
seed, fills holes, and prints a simplified polygon in source pixels. The box clips the blob: set its bottom
edge to the baseline and its sides just outside the structure so parapets/cliffs next to it do not leak in."""
import sys, json
import cv2, numpy as np
from scipy import ndimage as nd

img = cv2.imread(sys.argv[1]); x0, y0, x1, y1, sx, sy = map(int, sys.argv[2:8])
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(int)
h, s, v = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
floor = (h > 12) & (h < 48) & (s > .10) & (s < .50) & (v > .62)
box = np.zeros(floor.shape, bool); box[y0:y1, x0:x1] = True
obj = box & ~floor
obj = nd.binary_closing(obj, iterations=2); obj = nd.binary_opening(obj, iterations=1)
lab, _ = nd.label(obj); k = lab[sy, sx]
if not k: sys.exit('seed is on floor-coloured pixel; pick a seed on the structure')
blob = nd.binary_fill_holes(lab == k)
cs, _ = cv2.findContours(blob.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
c = max(cs, key=cv2.contourArea)
poly = cv2.approxPolyDP(c, 1.6, True)[:, 0, :].tolist()
print(json.dumps(poly)); print(len(poly), 'points,', int(blob.sum()), 'px', file=sys.stderr)
if len(sys.argv) > 8:
    out = img.copy(); cv2.polylines(out, [np.array(poly)], True, (255, 0, 255), 1)
    cv2.imwrite(sys.argv[8], cv2.resize(out[y0 - 20:y1 + 20, x0 - 20:x1 + 20], None, fx=6, fy=6, interpolation=cv2.INTER_CUBIC))
